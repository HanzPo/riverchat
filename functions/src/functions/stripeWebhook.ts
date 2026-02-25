import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { constructWebhookEvent, getStripeInstance } from '../services/stripe.js';
import { addCredits } from '../services/credits.js';
import { TIER_CONFIGS, type SubscriptionTier } from '../config/tiers.js';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const stripeWebhook = onRequest(
  {
    region: 'us-central1',
    // Must not use JSON body parser — Stripe needs raw body
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    const sig = req.headers['stripe-signature'] as string;
    if (!sig) {
      res.status(400).send('Missing stripe-signature header');
      return;
    }

    let event: Stripe.Event;
    try {
      event = constructWebhookEvent(req.rawBody, sig);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      res.status(400).send('Invalid signature');
      return;
    }

    // Idempotency check — claim the event before processing
    const eventRef = db.doc(`processed_events/${event.id}`);
    try {
      await eventRef.create({
        type: event.type,
        claimedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 6) {
        // ALREADY_EXISTS — check if fully processed or previously failed
        const existingDoc = await eventRef.get();
        if (existingDoc.data()?.processedAt) {
          res.status(200).json({ received: true, duplicate: true });
          return;
        }
        // Event was claimed but failed — allow retry by continuing
      } else {
        throw err;
      }
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(
            event.data.object as Stripe.Checkout.Session
          );
          break;

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(
            event.data.object as Stripe.Subscription
          );
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription
          );
          break;

        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(
            event.data.object as Stripe.Invoice
          );
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      // Mark event as fully processed
      await eventRef.update({
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error(`Error processing ${event.type}:`, err);
      // Keep the claim but mark as failed — the retry logic above will
      // allow re-processing of events without processedAt
      await eventRef.update({
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        error: String(err),
      }).catch(() => {});
      res.status(500).json({ error: 'Processing failed' });
      return;
    }

    res.status(200).json({ received: true });
  }
);

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const uid = session.client_reference_id;
  if (!uid) {
    console.error('No client_reference_id in checkout session');
    return;
  }

  if (session.mode === 'subscription') {
    // Subscription checkout — tier upgrade
    // The actual credit assignment happens in invoice.payment_succeeded
    // which fires alongside checkout.session.completed for the first payment.
    // Here we just set the tier and Stripe IDs.
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    // Derive tier from the subscription's price ID (not session metadata)
    // to avoid silent mis-assignment if metadata is missing or tampered with
    let tier: SubscriptionTier = 'pro';
    if (subscriptionId) {
      const stripe = getStripeInstance();
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price?.id;
      const derivedTier = getTierFromPriceId(priceId);
      if (derivedTier) {
        tier = derivedTier;
      } else {
        console.error(`handleCheckoutCompleted: unrecognized price ID ${priceId} for subscription ${subscriptionId}, falling back to session metadata`);
        tier = (session.metadata?.tier as SubscriptionTier) || 'pro';
      }
    }

    await db.doc(`users/${uid}`).update({
      subscriptionTier: tier,
      stripeSubscriptionId: subscriptionId || null,
      stripeCustomerId: session.customer as string,
    });
  } else if (session.mode === 'payment') {
    // One-time payment — credit top-up
    const amountCents = parseInt(session.metadata?.amountCents || '0', 10);
    if (amountCents > 0) {
      await addCredits(
        uid,
        amountCents,
        'topup',
        `Credit top-up: $${(amountCents / 100).toFixed(2)}`,
        {
          stripePaymentIntentId: session.payment_intent as string,
          idempotencyKey: session.id,
        }
      );
    }
  }
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

  const uid = await findUidByCustomerId(customerId);
  if (!uid) return;

  // Determine new tier from price metadata
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = getTierFromPriceId(priceId);
  if (!tier) {
    console.error(`Skipping subscription update for user ${uid}: unrecognized price ID ${priceId}`);
    return;
  }

  await db.doc(`users/${uid}`).update({
    subscriptionTier: tier,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: admin.firestore.Timestamp.fromMillis(
      subscription.current_period_end * 1000
    ),
  });

  // Credit resets are handled exclusively by handleInvoicePaymentSucceeded
  // to avoid double-resets when both events fire for the same subscription change.
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

  const uid = await findUidByCustomerId(customerId);
  if (!uid) return;

  // Downgrade to free — keep prepaid credits, don't reset subscription credits.
  // The resetMonthlyCredits scheduled function will handle the next natural
  // credit reset when currentPeriodEnd is reached.
  await db.doc(`users/${uid}`).update({
    subscriptionTier: 'free',
    stripeSubscriptionId: null,
    currentPeriodEnd: admin.firestore.Timestamp.fromMillis(
      subscription.current_period_end * 1000
    ),
  });
}

async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<void> {
  // Only process subscription invoices (not one-time payments)
  if (!invoice.subscription) return;

  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;
  if (!customerId) return;

  const uid = await findUidByCustomerId(customerId);
  if (!uid) return;

  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription.id;

  // Derive tier from the Stripe subscription's price, not from Firestore,
  // to avoid a race with handleSubscriptionUpdated which writes the tier.
  const stripe = (await import('../services/stripe.js')).getStripeInstance();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = getTierFromPriceId(priceId);
  if (!tier) {
    console.error(`Skipping invoice processing for user ${uid}: unrecognized price ID ${priceId}`);
    return;
  }
  const tierConfig = TIER_CONFIGS[tier];

  // Reset subscription credits for new billing period
  await addCredits(
    uid,
    tierConfig.monthlyCredits,
    'subscription_credit',
    `Monthly credits reset (${tier} plan)`,
    { idempotencyKey: invoice.id }
  );

  // Update period end
  // Get period_end from invoice lines
  const periodEnd = invoice.lines?.data?.[0]?.period?.end;
  if (periodEnd) {
    await db.doc(`users/${uid}`).update({
      stripeSubscriptionId: subscriptionId,
      currentPeriodEnd: admin.firestore.Timestamp.fromMillis(
        periodEnd * 1000
      ),
    });
  }
}

/** Find a Firebase UID by Stripe customer ID */
async function findUidByCustomerId(
  customerId: string
): Promise<string | null> {
  const snapshot = await db
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.error(`No user found for Stripe customer: ${customerId}`);
    return null;
  }

  return snapshot.docs[0].id;
}

/** Map a Stripe price ID to a subscription tier. Returns null for unrecognized price IDs. */
function getTierFromPriceId(priceId: string | undefined): SubscriptionTier | null {
  if (!priceId) return null;
  if (priceId === TIER_CONFIGS.pro.stripePriceId) return 'pro';
  if (priceId === TIER_CONFIGS.max.stripePriceId) return 'max';
  console.error(`Unrecognized Stripe price ID: ${priceId}. Check STRIPE_PRO_PRICE_ID and STRIPE_MAX_PRICE_ID env vars.`);
  return null;
}
