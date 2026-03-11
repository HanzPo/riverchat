import Stripe from 'stripe';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
    const accountId = process.env.STRIPE_ACCOUNT_ID;
    stripeInstance = new Stripe(key, {
      ...(accountId ? { stripeAccount: accountId } : {}),
    });
  }
  return stripeInstance;
}

/** Expose the Stripe instance for use by other modules (e.g. webhook handler). */
export function getStripeInstance(): Stripe {
  return getStripe();
}

const SENTINEL_TIMEOUT_MS = 60_000; // 60 seconds

/**
 * Get or create a Stripe customer for a Firebase user.
 * Uses a Firestore transaction with a sentinel value to prevent
 * concurrent calls from creating duplicate Stripe customers.
 */
export async function getOrCreateCustomer(
  uid: string,
  email: string
): Promise<string> {
  const userRef = db.doc(`users/${uid}`);

  // Phase 1: Transactionally check-and-claim
  const existingOrClaimed = await db.runTransaction(async (tx) => {
    const userDoc = await tx.get(userRef);
    const data = userDoc.data();
    const existingCustomerId = data?.stripeCustomerId;

    if (existingCustomerId && existingCustomerId !== '__creating__') {
      return existingCustomerId;
    }

    if (existingCustomerId === '__creating__') {
      // Check if the sentinel is stale (creator likely crashed)
      const creatingStartedAt = data?.stripeCustomerCreatingAt?.toMillis?.() ?? 0;
      const elapsed = Date.now() - creatingStartedAt;
      if (elapsed < SENTINEL_TIMEOUT_MS) {
        throw new Error('Stripe customer creation already in progress');
      }
      // Sentinel is stale — reclaim it
      console.warn(`Recovering stale __creating__ sentinel for user ${uid} (age: ${elapsed}ms)`);
    }

    // Claim the slot with a sentinel value and timestamp
    tx.update(userRef, {
      stripeCustomerId: '__creating__',
      stripeCustomerCreatingAt: FieldValue.serverTimestamp(),
    });
    return null;
  });

  if (existingOrClaimed) {
    return existingOrClaimed;
  }

  // Phase 2: Create the Stripe customer (outside the transaction)
  // Use uid as idempotency key so retries return the same Stripe customer
  let customer: Stripe.Customer | undefined;
  try {
    const stripe = getStripe();
    customer = await stripe.customers.create(
      {
        email,
        metadata: { firebaseUid: uid },
      },
      { idempotencyKey: `create-customer-${uid}` }
    );

    // Conditionally write the customer ID only if the sentinel is still ours
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(userRef);
      const currentValue = doc.data()?.stripeCustomerId;
      if (currentValue !== '__creating__') {
        // Another caller already wrote a real customer ID — use theirs
        return;
      }
      tx.update(userRef, {
        stripeCustomerId: customer!.id,
        stripeCustomerCreatingAt: FieldValue.delete(),
      });
    });

    // Re-read to return whatever customer ID won
    const finalDoc = await userRef.get();
    return finalDoc.data()?.stripeCustomerId as string;
  } catch (err) {
    // If Stripe creation succeeded but Firestore failed, try to persist the ID
    if (customer) {
      await userRef.update({
        stripeCustomerId: customer.id,
        stripeCustomerCreatingAt: FieldValue.delete(),
      }).catch(() => {});
      return customer.id;
    }
    // Roll back the sentinel on failure
    await userRef.update({
      stripeCustomerId: null,
      stripeCustomerCreatingAt: FieldValue.delete(),
    }).catch(() => {});
    throw err;
  }
}

/**
 * Create a Stripe Checkout session for a subscription (Pro or Max).
 */
export async function createSubscriptionCheckout(
  customerId: string,
  priceId: string,
  uid: string,
  tier: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: uid,
    metadata: { uid, tier },
  });

  return session.url!;
}

/**
 * Create a Stripe Checkout session for a one-time credit top-up.
 */
export async function createTopupCheckout(
  customerId: string,
  amountCents: number,
  uid: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: 'RiverChat Credits',
            description: `$${(amountCents / 100).toFixed(2)} credit top-up`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: uid,
    metadata: { uid, type: 'topup', amountCents: String(amountCents) },
  });

  return session.url!;
}

/**
 * Create a Stripe Customer Portal session.
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Construct and verify a Stripe webhook event.
 */
export function constructWebhookEvent(
  rawBody: Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }

  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}
