import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Record usage for a completed chat request.
 * Updates the monthly usage document with spend and token counts.
 */
export async function recordUsage(
  uid: string,
  modelId: string,
  promptTokens: number,
  completionTokens: number,
  costCents: number
): Promise<void> {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const dayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const usageRef = db.doc(`users/${uid}/usage/${monthKey}`);

  // Use set with merge to create doc if it doesn't exist.
  // Note: set() with merge treats object keys as literal field names (no dot splitting),
  // so we build a properly nested object instead of using dot-notation string keys.
  await usageRef.set(
    {
      totalSpent: admin.firestore.FieldValue.increment(costCents),
      requestCount: admin.firestore.FieldValue.increment(1),
      dailySpend: {
        [dayKey]: admin.firestore.FieldValue.increment(costCents),
      },
      modelBreakdown: {
        [modelId]: {
          spent: admin.firestore.FieldValue.increment(costCents),
          promptTokens: admin.firestore.FieldValue.increment(promptTokens),
          completionTokens: admin.firestore.FieldValue.increment(completionTokens),
          requests: admin.firestore.FieldValue.increment(1),
        },
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
