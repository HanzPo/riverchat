import * as admin from 'firebase-admin';
import type { Request } from 'firebase-functions/v2/https';

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Verify the Firebase Auth ID token from the Authorization header.
 * Returns the decoded token (includes uid, email, etc).
 */
export async function verifyAuth(
  req: Request
): Promise<admin.auth.DecodedIdToken> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid Authorization header');
  }

  const idToken = authHeader.slice(7);
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch {
    throw new AuthError('Invalid or expired token');
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
