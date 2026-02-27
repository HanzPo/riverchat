import * as admin from 'firebase-admin';
import type { SubscriptionTier } from '../config/tiers.js';
import { TIER_CONFIGS } from '../config/tiers.js';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export interface UserBalance {
  subscriptionCredits: number; // cents
  prepaidCredits: number; // cents
  total: number; // cents
  tier: SubscriptionTier;
  currentPeriodEnd: admin.firestore.Timestamp | null;
}

export interface DeductionResult {
  subscriptionCredits: number;
  prepaidCredits: number;
  total: number;
}

/**
 * Check if a user document needs free-tier credit initialization.
 * A user is uninitialized if they have no currentPeriodEnd set
 * (meaning neither the reset job nor Stripe has ever provisioned them).
 */
function isUninitializedFreeUser(
  data: FirebaseFirestore.DocumentData
): boolean {
  return (
    !data.currentPeriodEnd &&
    (data.subscriptionTier ?? 'free') === 'free'
  );
}

/**
 * Check if a free-tier user's billing period has expired and credits
 * need to be reset. This catches the gap between period expiry and
 * the daily scheduled reset job.
 */
function isExpiredFreeUser(
  data: FirebaseFirestore.DocumentData
): boolean {
  if ((data.subscriptionTier ?? 'free') !== 'free') return false;
  const periodEnd = data.currentPeriodEnd;
  if (!periodEnd) return false;
  const periodEndMs =
    typeof periodEnd.toMillis === 'function'
      ? periodEnd.toMillis()
      : periodEnd;
  return Date.now() > periodEndMs;
}

/**
 * Get a user's current balance from their profile.
 * If the user is an uninitialized free-tier user, provisions their
 * initial credits and period before returning.
 */
export async function getBalance(uid: string): Promise<UserBalance> {
  const userRef = db.doc(`users/${uid}`);
  const doc = await userRef.get();
  if (!doc.exists) {
    throw new Error(`User ${uid} not found`);
  }
  const data = doc.data()!;

  // Provision or reset free-tier credits inline so users never have to
  // wait for the daily scheduled job.
  if (isUninitializedFreeUser(data) || isExpiredFreeUser(data)) {
    const now = admin.firestore.Timestamp.now();
    const periodEnd = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 30 * 24 * 60 * 60 * 1000
    );
    const credits = TIER_CONFIGS.free.monthlyCredits;
    await userRef.update({
      subscriptionCredits: credits,
      subscriptionTier: 'free',
      currentPeriodEnd: periodEnd,
      creditEpoch: (data.creditEpoch ?? 0) + 1,
    });
    return {
      subscriptionCredits: credits,
      prepaidCredits: data.prepaidCredits ?? 0,
      total: credits + (data.prepaidCredits ?? 0),
      tier: 'free',
      currentPeriodEnd: periodEnd,
    };
  }

  const subCredits = data.subscriptionCredits ?? 0;
  const prepaidCredits = data.prepaidCredits ?? 0;
  return {
    subscriptionCredits: subCredits,
    prepaidCredits: prepaidCredits,
    total: subCredits + prepaidCredits,
    tier: data.subscriptionTier ?? 'free',
    currentPeriodEnd: data.currentPeriodEnd ?? null,
  };
}

/**
 * Check if user has at least `requiredCents` balance.
 */
export async function hasEnoughBalance(
  uid: string,
  requiredCents: number
): Promise<boolean> {
  const balance = await getBalance(uid);
  return balance.total >= requiredCents;
}

/**
 * Deduct credits from user's balance using a Firestore transaction.
 * Deducts from subscription credits first, then prepaid.
 * Returns the updated balances.
 */
export async function deductCredits(
  uid: string,
  amountCents: number,
  metadata: {
    modelId: string;
    promptTokens: number;
    completionTokens: number;
    description?: string;
  }
): Promise<DeductionResult> {
  const userRef = db.doc(`users/${uid}`);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(userRef);
    if (!doc.exists) {
      throw new Error(`User ${uid} not found`);
    }

    const data = doc.data()!;
    let subCredits: number = data.subscriptionCredits ?? 0;
    let prepaidCredits: number = data.prepaidCredits ?? 0;
    let remaining = amountCents;

    // Deduct from subscription credits first
    const subDeduction = Math.min(subCredits, remaining);
    subCredits -= subDeduction;
    remaining -= subDeduction;

    // Then from prepaid credits
    const prepaidDeduction = Math.min(prepaidCredits, remaining);
    prepaidCredits -= prepaidDeduction;
    remaining -= prepaidDeduction;

    // If remaining > 0, user went over budget (allow it but log)
    if (remaining > 0) {
      // Allow the overage — don't fail the deduction for a completed response.
      // The balance will go slightly negative on prepaid, which is fine.
      prepaidCredits -= remaining;
    }

    tx.update(userRef, {
      subscriptionCredits: subCredits,
      prepaidCredits: prepaidCredits,
    });

    // Write credit transaction record
    const txRef = db.collection(`users/${uid}/creditTransactions`).doc();
    tx.set(txRef, {
      id: txRef.id,
      userId: uid,
      amount: -amountCents,
      type: 'usage',
      description:
        metadata.description ??
        `Chat completion: ${metadata.modelId}`,
      modelUsed: metadata.modelId,
      promptTokens: metadata.promptTokens,
      completionTokens: metadata.completionTokens,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      balanceAfter: {
        subscription: subCredits,
        prepaid: prepaidCredits,
        total: subCredits + prepaidCredits,
      },
    });

    return {
      subscriptionCredits: subCredits,
      prepaidCredits: prepaidCredits,
      total: subCredits + prepaidCredits,
    };
  });
}

export interface CreditReservation {
  uid: string;
  reservedCents: number;
  reservedFromSubscription: number;
  reservedFromPrepaid: number;
  creditEpoch: number;
  balanceAfter: DeductionResult;
}

/**
 * Atomically reserve credits before streaming begins.
 * Deducts the estimated amount inside a Firestore transaction so concurrent
 * requests cannot all pass the balance check before any deduction occurs.
 * Use reconcileReservation() after the stream completes to adjust.
 */
export async function reserveCredits(
  uid: string,
  estimatedCents: number
): Promise<CreditReservation> {
  const userRef = db.doc(`users/${uid}`);

  const result = await db.runTransaction(async (tx) => {
    const doc = await tx.get(userRef);
    if (!doc.exists) {
      throw new Error(`User ${uid} not found`);
    }

    const data = doc.data()!;
    let subCredits: number = data.subscriptionCredits ?? 0;
    let prepaidCredits: number = data.prepaidCredits ?? 0;
    let creditEpoch: number = data.creditEpoch ?? 0;
    const extraFields: Record<string, unknown> = {};

    // Initialize or reset free-tier users within the transaction
    if (isUninitializedFreeUser(data) || isExpiredFreeUser(data)) {
      subCredits = TIER_CONFIGS.free.monthlyCredits;
      creditEpoch += 1;
      extraFields.subscriptionTier = 'free';
      extraFields.currentPeriodEnd = admin.firestore.Timestamp.fromMillis(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      );
      extraFields.creditEpoch = creditEpoch;
    }

    const total = subCredits + prepaidCredits;

    if (total < Math.max(estimatedCents, 1)) {
      throw new InsufficientBalanceError(total, estimatedCents);
    }

    let remaining = estimatedCents;

    // Deduct from subscription credits first
    const subDeduction = Math.min(subCredits, remaining);
    subCredits -= subDeduction;
    remaining -= subDeduction;

    // Then from prepaid credits
    const prepaidDeduction = Math.min(prepaidCredits, remaining);
    prepaidCredits -= prepaidDeduction;
    remaining -= prepaidDeduction;

    tx.update(userRef, {
      subscriptionCredits: subCredits,
      prepaidCredits: prepaidCredits,
      ...extraFields,
    });

    return {
      subDeduction,
      prepaidDeduction,
      creditEpoch,
      balanceAfter: {
        subscriptionCredits: subCredits,
        prepaidCredits: prepaidCredits,
        total: subCredits + prepaidCredits,
      },
    };
  });

  return {
    uid,
    reservedCents: estimatedCents,
    reservedFromSubscription: result.subDeduction,
    reservedFromPrepaid: result.prepaidDeduction,
    creditEpoch: result.creditEpoch,
    balanceAfter: result.balanceAfter,
  };
}

/**
 * Reconcile a reservation after the actual cost is known.
 * - If actual < reserved: refund the difference to the original buckets.
 * - If actual > reserved: deduct the extra (allows overage).
 * - If actual == reserved: just write the audit record.
 */
export async function reconcileReservation(
  reservation: CreditReservation,
  actualCents: number,
  metadata: {
    modelId: string;
    promptTokens: number;
    completionTokens: number;
  }
): Promise<DeductionResult> {
  const { uid, reservedCents } = reservation;
  const diff = actualCents - reservedCents;
  const userRef = db.doc(`users/${uid}`);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(userRef);
    if (!doc.exists) {
      throw new Error(`User ${uid} not found`);
    }

    const data = doc.data()!;
    let subCredits: number = data.subscriptionCredits ?? 0;
    let prepaidCredits: number = data.prepaidCredits ?? 0;
    const currentEpoch: number = data.creditEpoch ?? 0;
    const epochChanged = currentEpoch !== reservation.creditEpoch;

    let droppedSubscriptionRefund = 0;
    if (diff < 0) {
      // Actual cost was less than reserved — refund the difference to the
      // original buckets (reverse of the deduction order: prepaid first, then subscription)
      let refundRemaining = Math.abs(diff);
      const prepaidRefund = Math.min(refundRemaining, reservation.reservedFromPrepaid);
      prepaidCredits += prepaidRefund;
      refundRemaining -= prepaidRefund;
      if (!epochChanged) {
        // Only refund to subscription credits if the subscription balance
        // hasn't been replaced since the reservation was made.
        subCredits += refundRemaining;
      } else {
        // Track the subscription refund that was intentionally dropped
        // because the subscription balance was reset since reservation.
        droppedSubscriptionRefund = refundRemaining;
      }
    } else if (diff > 0) {
      // Actual cost exceeded the reservation — deduct the extra
      let remaining = diff;
      if (!epochChanged) {
        // Only deduct from subscription credits if the balance hasn't been
        // replaced since the reservation was made.
        const subDeduction = Math.min(subCredits, remaining);
        subCredits -= subDeduction;
        remaining -= subDeduction;
      }
      // Allow overage on prepaid (same as original deductCredits behavior)
      prepaidCredits -= remaining;
    }

    tx.update(userRef, {
      subscriptionCredits: subCredits,
      prepaidCredits: prepaidCredits,
    });

    // Write the final usage audit record.
    // The effective charge is actualCents plus any subscription refund that
    // was dropped due to an epoch change (subscription balance reset mid-stream).
    const effectiveCharge = actualCents + droppedSubscriptionRefund;
    const txRef = db.collection(`users/${uid}/creditTransactions`).doc();
    tx.set(txRef, {
      id: txRef.id,
      userId: uid,
      amount: -effectiveCharge,
      type: 'usage',
      description: `Chat completion: ${metadata.modelId}`,
      modelUsed: metadata.modelId,
      promptTokens: metadata.promptTokens,
      completionTokens: metadata.completionTokens,
      reservedCents,
      ...(droppedSubscriptionRefund > 0 && { droppedSubscriptionRefund }),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      balanceAfter: {
        subscription: subCredits,
        prepaid: prepaidCredits,
        total: subCredits + prepaidCredits,
      },
    });

    return {
      subscriptionCredits: subCredits,
      prepaidCredits: prepaidCredits,
      total: subCredits + prepaidCredits,
    };
  });
}

/**
 * Refund a full reservation (e.g., when the stream fails before any tokens are produced).
 */
export async function refundReservation(
  reservation: CreditReservation
): Promise<void> {
  const { uid, reservedCents } = reservation;
  if (reservedCents <= 0) return;
  // reservation.reservedFromSubscription and reservation.reservedFromPrepaid
  // track which buckets the credits were originally deducted from
  const userRef = db.doc(`users/${uid}`);

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(userRef);
    if (!doc.exists) return;

    const data = doc.data()!;
    const subCredits: number = data.subscriptionCredits ?? 0;
    const prepaidCredits: number = data.prepaidCredits ?? 0;
    const currentEpoch: number = data.creditEpoch ?? 0;
    const epochChanged = currentEpoch !== reservation.creditEpoch;

    tx.update(userRef, {
      // Only refund subscription credits if the balance hasn't been
      // replaced since the reservation was made.
      subscriptionCredits: subCredits + (epochChanged ? 0 : reservation.reservedFromSubscription),
      prepaidCredits: prepaidCredits + reservation.reservedFromPrepaid,
    });
  });
}

export class InsufficientBalanceError extends Error {
  balance: number;
  required: number;
  constructor(balance: number, required: number) {
    super('Insufficient credits');
    this.balance = balance;
    this.required = required;
  }
}

/**
 * Add credits to a user's balance (for top-ups or subscription renewals).
 */
export async function addCredits(
  uid: string,
  amountCents: number,
  type: 'subscription_credit' | 'topup' | 'refund' | 'adjustment',
  description: string,
  extra?: { stripePaymentIntentId?: string; idempotencyKey?: string }
): Promise<DeductionResult> {
  const userRef = db.doc(`users/${uid}`);

  return db.runTransaction(async (tx) => {
    // If an idempotency key is provided, check atomically inside the
    // transaction using a dedicated document at a deterministic path.
    // tx.get() on a specific doc ref is tracked by the transaction, so
    // concurrent calls will be serialized correctly.
    if (extra?.idempotencyKey) {
      const idemRef = db.doc(`users/${uid}/creditIdempotency/${extra.idempotencyKey}`);
      const idemDoc = await tx.get(idemRef);
      if (idemDoc.exists) {
        const doc = await tx.get(userRef);
        const data = doc.data()!;
        const subCredits: number = data.subscriptionCredits ?? 0;
        const prepaidCredits: number = data.prepaidCredits ?? 0;
        return {
          subscriptionCredits: subCredits,
          prepaidCredits: prepaidCredits,
          total: subCredits + prepaidCredits,
        };
      }
    }

    const doc = await tx.get(userRef);
    if (!doc.exists) {
      throw new Error(`User ${uid} not found`);
    }

    const data = doc.data()!;
    let subCredits: number = data.subscriptionCredits ?? 0;
    let prepaidCredits: number = data.prepaidCredits ?? 0;
    const updateFields: Record<string, unknown> = {};

    if (type === 'subscription_credit') {
      // Subscription credits replace (not add to) the existing subscription balance.
      // Bump the epoch so in-flight reservations don't refund stale credits.
      subCredits = amountCents;
      const currentEpoch: number = data.creditEpoch ?? 0;
      updateFields.creditEpoch = currentEpoch + 1;
    } else {
      // Top-ups, refunds, adjustments go to prepaid
      prepaidCredits += amountCents;
    }

    tx.update(userRef, {
      subscriptionCredits: subCredits,
      prepaidCredits: prepaidCredits,
      ...updateFields,
    });

    const txRef = db.collection(`users/${uid}/creditTransactions`).doc();
    tx.set(txRef, {
      id: txRef.id,
      userId: uid,
      amount: amountCents,
      type,
      description,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      balanceAfter: {
        subscription: subCredits,
        prepaid: prepaidCredits,
        total: subCredits + prepaidCredits,
      },
      ...(extra?.stripePaymentIntentId && {
        stripePaymentIntentId: extra.stripePaymentIntentId,
      }),
      ...(extra?.idempotencyKey && {
        idempotencyKey: extra.idempotencyKey,
      }),
    });

    // Write idempotency marker inside the transaction so concurrent
    // calls are detected on retry via optimistic concurrency control.
    if (extra?.idempotencyKey) {
      const idemRef = db.doc(`users/${uid}/creditIdempotency/${extra.idempotencyKey}`);
      tx.set(idemRef, {
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        transactionId: txRef.id,
      });
    }

    return {
      subscriptionCredits: subCredits,
      prepaidCredits: prepaidCredits,
      total: subCredits + prepaidCredits,
    };
  });
}
