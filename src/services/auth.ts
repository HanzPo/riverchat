import {
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { CacheService } from './cache';

export interface EncryptedAPIKeys {
  openrouter: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  createdAt: any;
  lastLoginAt: any;
  subscriptionTier: 'free' | 'basic' | 'pro' | 'enterprise';
  creditBalance: number;
  monthlyCreditsRefreshDate: string | null;
  encryptedAPIKeys?: EncryptedAPIKeys; // Encrypted API keys stored securely
}

export class AuthService {
  /**
   * Sign in with Google OAuth
   */
  static async signInWithGoogle(): Promise<UserCredential> {
    try {
      const provider = new GoogleAuthProvider();
      // Add prompt to always show account selection
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const userCredential = await signInWithPopup(auth, provider);

      // Check if this is a new user (first time signing in with Google)
      const existingProfile = await this.getUserProfile(userCredential.user.uid);

      if (!existingProfile) {
        // Create profile for new Google user
        try {
          await this.createUserProfile(userCredential.user);
        } catch (profileError: any) {
          console.error('Error creating profile for Google user:', profileError);
          // Don't throw - user is authenticated, profile can be created later
        }
      } else {
        // Update last login for existing user
        await this.updateLastLogin(userCredential.user.uid);
      }

      // Cache auth state for faster app startup
      CacheService.cacheAuthState(userCredential.user);

      return userCredential;
    } catch (error: any) {
      console.error('Google sign-in error:', error);

      // Special handling for popup-related errors
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in cancelled. You closed the popup window.');
      }
      if (error.code === 'auth/popup-blocked') {
        throw new Error('Pop-up was blocked by your browser. Please enable pop-ups for this site and try again.');
      }
      if (error.code === 'auth/cancelled-popup-request') {
        // User opened multiple popups, only throw for the last one
        throw new Error('Sign-in cancelled. Please try again.');
      }

      throw new Error(this.getAuthErrorMessage(error.code));
    }
  }

  /**
   * Sign out the current user
   */
  static async logout(): Promise<void> {
    try {
      // Clear all caches on logout
      CacheService.clearAll();
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Failed to sign out. Please try again.');
    }
  }

  /**
   * Get the current authenticated user (synchronous)
   * Note: This may return null if auth hasn't initialized yet
   */
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Wait for auth to initialize and return the current user
   * Use this when you need to ensure auth state is ready
   */
  static async getCurrentUserAsync(): Promise<User | null> {
    // Wait for Firebase Auth to finish initializing
    await auth.authStateReady();
    return auth.currentUser;
  }

  /**
   * Listen to authentication state changes
   */
  static onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        // Cache auth state for faster startup next time
        CacheService.cacheAuthState(user);
      } else {
        // Clear auth cache on sign out
        CacheService.clearAuthState();
      }
      callback(user);
    });
  }

  /**
   * Get cached auth state for optimistic rendering
   */
  static getCachedAuthState() {
    return CacheService.getCachedAuthState();
  }

  /**
   * Get user profile from Firestore (with caching)
   */
  static async getUserProfile(uid: string, useCache: boolean = true): Promise<UserProfile | null> {
    try {
      // Try cache first if enabled
      if (useCache) {
        const cached = CacheService.getCachedUserProfile();
        if (cached && cached.uid === uid) {
          console.log('[AuthService] Using cached user profile');
          return cached;
        }
      }

      console.log('[AuthService] Fetching user profile from Firestore for:', uid);
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        console.log('[AuthService] Profile loaded from Firestore:', {
          hasEmail: !!profile.email,
          hasEncryptedKeys: !!profile.encryptedAPIKeys,
          keysDetail: profile.encryptedAPIKeys ? {
            hasOpenRouter: !!profile.encryptedAPIKeys.openrouter,
            openrouterLength: profile.encryptedAPIKeys.openrouter?.length
          } : null
        });
        
        // Cache the profile
        CacheService.cacheUserProfile(profile);
        
        return profile;
      }
      console.log('[AuthService] No profile document found for user');
      return null;
    } catch (error) {
      console.error('[AuthService] Error fetching user profile:', error);
      // Try to return cached data on error
      if (useCache) {
        const cached = CacheService.getCachedUserProfile();
        if (cached && cached.uid === uid) {
          console.log('[AuthService] Returning cached profile due to error');
          return cached;
        }
      }
      return null;
    }
  }

  /**
   * Update encrypted API keys in Firestore
   */
  static async updateEncryptedAPIKeys(uid: string, encryptedKeys: EncryptedAPIKeys): Promise<void> {
    try {
      console.log('[AuthService] Updating encrypted API keys for user:', uid);
      console.log('[AuthService] Encrypted keys object:', {
        hasOpenRouter: !!encryptedKeys.openrouter,
        openrouterLength: encryptedKeys.openrouter?.length
      });
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, { encryptedAPIKeys: encryptedKeys }, { merge: true });
      console.log('[AuthService] Successfully updated encrypted API keys');
      
      // Clear cached profile so it gets refreshed
      CacheService.clearUserProfile();

      // Optional verification read (disabled to reduce database reads)
      // Uncomment for debugging if needed
      /*
      const verification = await getDoc(userRef);
      if (verification.exists()) {
        const savedKeys = verification.data()?.encryptedAPIKeys;
        console.log('[AuthService] Verification - keys saved to Firestore:', {
          hasOpenAI: !!savedKeys?.openai,
          hasAnthropic: !!savedKeys?.anthropic,
          hasGoogle: !!savedKeys?.google
        });
      }
      */
    } catch (error) {
      console.error('[AuthService] Error updating encrypted API keys:', error);
      throw error;
    }
  }

  /**
   * Create a new user profile in Firestore
   */
  private static async createUserProfile(user: User): Promise<void> {
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      subscriptionTier: 'free',
      creditBalance: 0,
      monthlyCreditsRefreshDate: null,
    };

    try {
      await setDoc(doc(db, 'users', user.uid), userProfile);
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  /**
   * Update the last login timestamp for a user
   */
  private static async updateLastLogin(uid: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  /**
   * Convert Firebase auth error codes to user-friendly messages
   */
  private static getAuthErrorMessage(errorCode: string): string {
    switch (errorCode) {
      // User errors
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support for assistance.';

      // Rate limiting
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again in a few minutes.';

      // Network errors
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection and try again.';
      case 'auth/timeout':
        return 'Request timed out. Please check your connection and try again.';

      // OAuth/Popup errors
      case 'auth/popup-closed-by-user':
        return 'Sign-in cancelled. You closed the popup window.';
      case 'auth/popup-blocked':
        return 'Pop-up was blocked by your browser. Please enable pop-ups for this site and try again.';
      case 'auth/cancelled-popup-request':
        return 'Sign-in cancelled. Please try again.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized for OAuth operations. Please contact support.';

      // Account linking errors
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with this email. Please sign in with Google.';
      case 'auth/credential-already-in-use':
        return 'This credential is already associated with a different account.';

      // Token/Session errors
      case 'auth/requires-recent-login':
        return 'This operation requires recent authentication. Please sign out and sign in again.';
      case 'auth/user-token-expired':
        return 'Your session has expired. Please sign in again.';
      case 'auth/invalid-user-token':
        return 'Your authentication token is invalid. Please sign in again.';

      // Misc errors
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
