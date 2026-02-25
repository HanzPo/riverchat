import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { TIER_CONFIGS } from '../config/tiers.js';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Daily scheduled function to reset subscription credits for free-tier users.
 * Pro/Max resets are handled by the Stripe invoice.payment_succeeded webhook.
 */
export const resetMonthlyCredits = onSchedule(
  {
    schedule: 'every 24 hours',
    region: 'us-central1',
    timeoutSeconds: 300,
  },
  async () => {
    const now = admin.firestore.Timestamp.now();

    // Find free-tier users whose billing period has ended
    const snapshot = await db
      .collection('users')
      .where('subscriptionTier', '==', 'free')
      .where('currentPeriodEnd', '<=', now)
      .get();

    if (snapshot.empty) {
      console.log('No free-tier users need credit reset');
      return;
    }

    console.log(
      `Resetting credits for ${snapshot.size} free-tier users`
    );

    const promises: Promise<void>[] = [];

    for (const doc of snapshot.docs) {
      const uid = doc.id;
      const userRef = db.doc(`users/${uid}`);

      // Reset credits and update period in a single transaction
      promises.push(
        db.runTransaction(async (tx) => {
          const userDoc = await tx.get(userRef);
          if (!userDoc.exists) return;

          const data = userDoc.data()!;
          // Re-validate tier inside the transaction to avoid racing with upgrades
          if (data.subscriptionTier !== 'free') return;

          const newPeriodEnd = new Date();
          newPeriodEnd.setDate(newPeriodEnd.getDate() + 30);

          const currentEpoch: number = userDoc.data()!.creditEpoch ?? 0;
          tx.update(userRef, {
            subscriptionCredits: TIER_CONFIGS.free.monthlyCredits,
            creditEpoch: currentEpoch + 1,
            currentPeriodEnd:
              admin.firestore.Timestamp.fromDate(newPeriodEnd),
          });

          // Write credit transaction record
          const txRef = db.collection(`users/${uid}/creditTransactions`).doc();
          tx.set(txRef, {
            id: txRef.id,
            userId: uid,
            amount: TIER_CONFIGS.free.monthlyCredits,
            type: 'subscription_credit',
            description: 'Monthly free credits reset',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            balanceAfter: {
              subscription: TIER_CONFIGS.free.monthlyCredits,
              prepaid: userDoc.data()!.prepaidCredits ?? 0,
              total: TIER_CONFIGS.free.monthlyCredits + (userDoc.data()!.prepaidCredits ?? 0),
            },
          });
        })
      );
    }

    await Promise.all(promises);
    console.log('Free-tier credit reset complete');
  }
);
