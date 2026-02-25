import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { TIER_CONFIGS, type SubscriptionTier } from '../config/tiers.js';
import {
  getOrCreateCustomer,
  createSubscriptionCheckout,
} from '../services/stripe.js';

export const createCheckout = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in');
    }

    const { tier } = request.data as { tier: string };
    if (tier !== 'pro' && tier !== 'max') {
      throw new HttpsError(
        'invalid-argument',
        'Tier must be "pro" or "max"'
      );
    }

    const tierConfig = TIER_CONFIGS[tier as SubscriptionTier];
    if (!tierConfig.stripePriceId) {
      throw new HttpsError(
        'failed-precondition',
        'Stripe price not configured for this tier'
      );
    }

    const customerId = await getOrCreateCustomer(
      request.auth.uid,
      request.auth.token.email || ''
    );

    const ALLOWED_ORIGINS = ['https://riverchat.app', 'http://localhost:5173'];
    const requestOrigin = request.rawRequest.headers.origin;
    const origin = (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin))
      ? requestOrigin
      : 'https://riverchat.app';
    const url = await createSubscriptionCheckout(
      customerId,
      tierConfig.stripePriceId,
      request.auth.uid,
      tier,
      `${origin}/?checkout=success`,
      `${origin}/?checkout=cancel`
    );

    return { url };
  }
);
