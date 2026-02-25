import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { MODEL_CATALOG } from '../config/models.js';
import { tierCanAccessCategory, type SubscriptionTier } from '../config/tiers.js';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const getModels = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in');
    }

    const uid = request.auth.uid;
    const userDoc = await db.doc(`users/${uid}`).get();
    const tier: SubscriptionTier =
      (userDoc.data()?.subscriptionTier as SubscriptionTier) ?? 'free';

    return MODEL_CATALOG.map((model) => ({
      id: model.id,
      name: model.displayName,
      contextLength: model.contextLength,
      pricing: model.pricing,
      category: model.category,
      provider: model.provider,
      accessible: tierCanAccessCategory(tier, model.category),
    }));
  }
);
