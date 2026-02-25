import {
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  linkWithPopup,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { CacheService } from './cache';
import { usePostHog } from '../composables/usePostHog';
import type { SubscriptionTier } from '../types';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: any;
  lastLoginAt: any;
  subscriptionTier: SubscriptionTier;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionCredits: number; // cents
  prepaidCredits: number; // cents
  creditEpoch: number;
  currentPeriodStart: any;
  currentPeriodEnd: any;
}

export class AuthService {
  static async signInWithGoogle(): Promise<UserCredential> {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const currentUser = auth.currentUser;
      let userCredential: UserCredential;
      let wasAnonymous = false;

      if (currentUser && currentUser.isAnonymous) {
        // Link anonymous account to Google — preserves UID and all data
        try {
          userCredential = await linkWithPopup(currentUser, provider);
          wasAnonymous = true;
        } catch (linkError: any) {
          if (linkError.code === 'auth/credential-already-in-use') {
            // Google account already exists as a separate user — sign in directly
            userCredential = await signInWithPopup(auth, provider);
          } else {
            throw linkError;
          }
        }
      } else {
        userCredential = await signInWithPopup(auth, provider);
      }

      const existingProfile = await this.getUserProfile(userCredential.user.uid);

      if (!existingProfile) {
        try {
          await this.createUserProfile(userCredential.user);
        } catch (profileError: any) {
          console.error('Error creating profile for Google user:', profileError);
        }
      } else if (wasAnonymous) {
        // Update profile with Google display info after linking
        await this.updateProfileWithGoogleInfo(userCredential.user);
      } else {
        await this.updateLastLogin(userCredential.user.uid);
      }

      CacheService.cacheAuthState(userCredential.user);

      const analytics = usePostHog();
      const profile = existingProfile || await this.getUserProfile(userCredential.user.uid);
      if (profile) {
        analytics.identify(userCredential.user.uid, profile);
        analytics.capture('user_signed_in', {
          method: 'google',
          is_new_user: !existingProfile,
          was_anonymous: wasAnonymous,
        });
      }

      return userCredential;
    } catch (error: any) {
      console.error('Google sign-in error:', error);

      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in cancelled. You closed the popup window.');
      }
      if (error.code === 'auth/popup-blocked') {
        throw new Error('Pop-up was blocked by your browser. Please enable pop-ups for this site and try again.');
      }
      if (error.code === 'auth/cancelled-popup-request') {
        throw new Error('Sign-in cancelled. Please try again.');
      }

      throw new Error(this.getAuthErrorMessage(error.code));
    }
  }

  static async signInAnonymouslyIfNeeded(): Promise<User | null> {
    if (auth.currentUser) return auth.currentUser;

    try {
      const credential = await signInAnonymously(auth);
      const user = credential.user;

      // Create profile with $2.00 free credits
      const existingProfile = await this.getUserProfile(user.uid);
      if (!existingProfile) {
        await this.createUserProfile(user);
      }

      CacheService.cacheAuthState(user);

      const analytics = usePostHog();
      analytics.identify(user.uid, { isAnonymous: true });
      analytics.capture('anonymous_user_created');

      return user;
    } catch (error) {
      console.error('Anonymous sign-in error:', error);
      return null;
    }
  }

  static isAnonymous(): boolean {
    return auth.currentUser?.isAnonymous ?? false;
  }

  static async logout(): Promise<void> {
    try {
      const analytics = usePostHog();
      analytics.capture('user_signed_out');
      analytics.reset();
      CacheService.clearAll();
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Failed to sign out. Please try again.');
    }
  }

  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  static async getCurrentUserAsync(): Promise<User | null> {
    await auth.authStateReady();
    return auth.currentUser;
  }

  static onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        CacheService.cacheAuthState(user);
        const analytics = usePostHog();
        const profile = await this.getUserProfile(user.uid);
        if (profile) {
          analytics.identify(user.uid, profile);
        }
      } else {
        CacheService.clearAuthState();
      }
      callback(user);
    });
  }

  static getCachedAuthState() {
    return CacheService.getCachedAuthState();
  }

  static async getUserProfile(uid: string, useCache: boolean = true): Promise<UserProfile | null> {
    try {
      if (useCache) {
        const cached = CacheService.getCachedUserProfile();
        if (cached && cached.uid === uid) {
          return cached;
        }
      }

      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        CacheService.cacheUserProfile(profile);
        return profile;
      }
      return null;
    } catch (error) {
      console.error('[AuthService] Error fetching user profile:', error);
      if (useCache) {
        const cached = CacheService.getCachedUserProfile();
        if (cached && cached.uid === uid) {
          return cached;
        }
      }
      return null;
    }
  }

  private static async createUserProfile(user: User): Promise<void> {
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      subscriptionTier: 'free',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionCredits: 200, // $2.00 free tier
      prepaidCredits: 0,
      creditEpoch: 0,
      currentPeriodStart: serverTimestamp(),
      currentPeriodEnd: Timestamp.fromDate(periodEnd),
    };

    try {
      await setDoc(doc(db, 'users', user.uid), userProfile);
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  private static async updateProfileWithGoogleInfo(user: User): Promise<void> {
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        email: user.email || '',
        displayName: user.displayName || '',
        lastLoginAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error('Error updating profile with Google info:', error);
    }
  }

  private static async updateLastLogin(uid: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  private static getAuthErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support for assistance.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again in a few minutes.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection and try again.';
      case 'auth/timeout':
        return 'Request timed out. Please check your connection and try again.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in cancelled. You closed the popup window.';
      case 'auth/popup-blocked':
        return 'Pop-up was blocked by your browser. Please enable pop-ups for this site and try again.';
      case 'auth/cancelled-popup-request':
        return 'Sign-in cancelled. Please try again.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized for OAuth operations. Please contact support.';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with this email. Please sign in with Google.';
      case 'auth/credential-already-in-use':
        return 'This credential is already associated with a different account.';
      case 'auth/requires-recent-login':
        return 'This operation requires recent authentication. Please sign out and sign in again.';
      case 'auth/user-token-expired':
        return 'Your session has expired. Please sign in again.';
      case 'auth/invalid-user-token':
        return 'Your authentication token is invalid. Please sign in again.';
      case 'auth/internal-error':
        return 'An internal error occurred. Please try again later.';
      case 'auth/invalid-api-key':
        return 'Invalid API key. Please contact support.';
      case 'auth/app-deleted':
        return 'This app instance has been deleted. Please refresh the page.';
      default:
        return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
    }
  }
}
