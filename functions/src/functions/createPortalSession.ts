import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { createPortalSession as createPortal } from '../services/stripe.js';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const createPortalSession = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in');
    }

    const userDoc = await db.doc(`users/${request.auth.uid}`).get();
    const customerId = userDoc.data()?.stripeCustomerId;

    if (!customerId || customerId === '__creating__') {
      throw new HttpsError(
        'failed-precondition',
        'No billing account found. Please subscribe first.'
      );
    }

    const ALLOWED_ORIGINS = ['https://riverchat.app', 'http://localhost:5173'];
    const requestOrigin = request.rawRequest.headers.origin;
    const origin = (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin))
      ? requestOrigin
      : 'https://riverchat.app';
    const url = await createPortal(customerId, origin);

    return { url };
  }
);
