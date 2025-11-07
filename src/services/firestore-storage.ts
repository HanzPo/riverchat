import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuthService } from './auth';
import { EncryptionUtil } from '../utils/encryption';
import { CacheService } from './cache';
import type { River, Settings, APIKeys, RiverChatData } from '../types';

const STORAGE_KEY = 'riverchat_data';

const DEFAULT_SETTINGS: Settings = {
  apiKeys: {
    openrouter: '',
  },
  lastUsedModel: null,
  enabledModels: {},
  lastChatSelectedModels: [],
  availableModels: [],
  lastModelRefresh: undefined,
};

/**
 * Firestore-based storage service that syncs data across devices
 * Falls back to localStorage for unauthenticated users
 */
export class FirestoreStorageService {
  /**
   * Get all rivers for the current user (with caching)
   */
  static async getRivers(useCache: boolean = true): Promise<River[]> {
    const user = await AuthService.getCurrentUserAsync();

    if (!user) {
      // Fallback to localStorage for unauthenticated users
      return this.getLocalRivers();
    }

    // Try cache first
    if (useCache) {
      const cached = CacheService.getCachedRiversMetadata();
      if (cached) {
        return cached;
      }
    }

    try {
      const riversRef = collection(db, 'users', user.uid, 'rivers');
      const snapshot = await getDocs(riversRef);

      const rivers: River[] = [];
      snapshot.forEach((doc) => {
        rivers.push(doc.data() as River);
      });

      const sortedRivers = rivers.sort((a, b) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      );

      // Cache river metadata for faster subsequent loads
      CacheService.cacheRiversMetadata(sortedRivers);

      return sortedRivers;
    } catch (error) {
      console.error('Error fetching rivers from Firestore:', error);
      return this.getLocalRivers();
    }
  }

  /**
   * Get a specific river by ID
   */
  static async getRiver(id: string): Promise<River | null> {
    const user = await AuthService.getCurrentUserAsync();

    if (!user) {
      return this.getLocalRiver(id);
    }

    try {
      const riverRef = doc(db, 'users', user.uid, 'rivers', id);
      const riverSnap = await getDoc(riverRef);

      if (riverSnap.exists()) {
        return riverSnap.data() as River;
      }
      return null;
    } catch (error) {
      console.error('Error fetching river from Firestore:', error);
      return this.getLocalRiver(id);
    }
  }

  /**
   * Save or update a river
   */
  static async saveRiver(river: River): Promise<void> {
    const user = await AuthService.getCurrentUserAsync();

    river.lastModified = new Date().toISOString();

    if (!user) {
      this.saveLocalRiver(river);
      return;
    }

    try {
      const riverRef = doc(db, 'users', user.uid, 'rivers', river.id);
      await setDoc(riverRef, {
        ...river,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error saving river to Firestore:', error);
      this.saveLocalRiver(river);
    }
  }

  /**
   * Delete a river
   */
  static async deleteRiver(id: string): Promise<void> {
    const user = await AuthService.getCurrentUserAsync();

    if (!user) {
      this.deleteLocalRiver(id);
      return;
    }

    try {
      const riverRef = doc(db, 'users', user.uid, 'rivers', id);
      await deleteDoc(riverRef);
    } catch (error) {
      console.error('Error deleting river from Firestore:', error);
      this.deleteLocalRiver(id);
    }
  }

  /**
   * Get user settings (with caching)
   */
  static async getSettings(useCache: boolean = true): Promise<Settings> {
    const user = await AuthService.getCurrentUserAsync();

    console.log('[FirestoreStorage] getSettings called:', { hasUser: !!user, uid: user?.uid });

    if (!user) {
      console.log('[FirestoreStorage] No user, loading from localStorage');
      return this.getLocalSettings();
    }

    // Try cache first
    if (useCache) {
      const cached = CacheService.getCachedSettings();
      if (cached) {
        console.log('[FirestoreStorage] Using cached settings');
        return cached;
      }
    }

    try {
      // Try to get settings from user profile first
      const userProfile = await AuthService.getUserProfile(user.uid, useCache);
      console.log('[FirestoreStorage] User profile loaded:', {
        hasProfile: !!userProfile,
        hasEncryptedKeys: !!(userProfile?.encryptedAPIKeys)
      });

      if (userProfile && userProfile.encryptedAPIKeys) {
        // Decrypt API keys from user profile
        const decryptedApiKeys = EncryptionUtil.decryptAPIKeys(
          userProfile.encryptedAPIKeys,
          user.uid
        );

        console.log('[FirestoreStorage] Decrypted API keys:', {
          hasOpenRouter: !!decryptedApiKeys.openrouter,
          // Support legacy keys for migration
          hasOpenAI: !!(decryptedApiKeys as any).openai,
          hasAnthropic: !!(decryptedApiKeys as any).anthropic,
          hasGoogle: !!(decryptedApiKeys as any).google
        });

        // Also check for settings in settings subcollection
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
        const settingsSnap = await getDoc(settingsRef);
        const lastUsedModel = settingsSnap.exists() ? settingsSnap.data().lastUsedModel : null;
        const availableModels = settingsSnap.exists() ? (settingsSnap.data().availableModels || []) : [];

        // Get enabledModels record
        let enabledModels: Record<string, boolean> = {};
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          if (data.enabledModels && typeof data.enabledModels === 'object') {
            enabledModels = data.enabledModels;
          }
        }

        const settings = {
          apiKeys: {
            openrouter: decryptedApiKeys.openrouter || '',
          },
          lastUsedModel: lastUsedModel || null,
          enabledModels,
          lastChatSelectedModels: settingsSnap.exists() ? (settingsSnap.data().lastChatSelectedModels || []) : [],
          availableModels,
        };
        
        // Cache the settings
        CacheService.cacheSettings(settings);
        
        return settings;
      }

      console.log('[FirestoreStorage] No encrypted keys in profile, checking settings subcollection');

      // Fallback to old location (settings subcollection) for backward compatibility
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        const data = settingsSnap.data();

        // Decrypt API keys
        const decryptedApiKeys = data.apiKeys
          ? EncryptionUtil.decryptAPIKeys(data.apiKeys, user.uid)
          : DEFAULT_SETTINGS.apiKeys;

        // Get enabledModels and availableModels
        let enabledModels: Record<string, boolean> = {};
        if (data.enabledModels && typeof data.enabledModels === 'object') {
          enabledModels = data.enabledModels;
        }

        const settings = {
          apiKeys: {
            openrouter: decryptedApiKeys.openrouter || '',
          },
          lastUsedModel: data.lastUsedModel || null,
          enabledModels,
          lastChatSelectedModels: data.lastChatSelectedModels || [],
          availableModels: data.availableModels || [],
        };
        
        // Cache the settings
        CacheService.cacheSettings(settings);
        
        return settings;
      }

      // No settings found - return defaults
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error fetching settings from Firestore:', error);
      return this.getLocalSettings();
    }
  }

  /**
   * Save user settings
   */
  static async saveSettings(settings: Settings): Promise<void> {
    // Wait for auth to be ready before checking user
    const user = await AuthService.getCurrentUserAsync();

    console.log('[FirestoreStorage] saveSettings called:', {
      hasUser: !!user,
      uid: user?.uid,
      hasAPIKeys: !!settings.apiKeys.openrouter
    });

    if (!user) {
      console.log('[FirestoreStorage] No user logged in, saving to localStorage');
      this.saveLocalSettings(settings);
      return;
    }

    try {
      // Encrypt API keys before storing
      const encryptedApiKeys = EncryptionUtil.encryptAPIKeys(settings.apiKeys, user.uid);
      console.log('[FirestoreStorage] Encrypted API keys, saving to Firestore...');

      // Save encrypted API keys to user profile document
      await AuthService.updateEncryptedAPIKeys(user.uid, encryptedApiKeys as any);
      console.log('[FirestoreStorage] API keys saved to user profile');

      // Also save lastUsedModel, enabledModels, lastChatSelectedModels, and availableModels to settings subcollection
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
      await setDoc(settingsRef, {
        lastUsedModel: settings.lastUsedModel,
        enabledModels: settings.enabledModels || {},
        lastChatSelectedModels: settings.lastChatSelectedModels || [],
        availableModels: settings.availableModels || [],
        updatedAt: serverTimestamp(),
      });
      console.log('[FirestoreStorage] Settings preferences saved');
      
      // Update cache after successful save
      CacheService.cacheSettings(settings);
    } catch (error) {
      console.error('Error saving settings to Firestore:', error);
      this.saveLocalSettings(settings);
    }
  }

  /**
   * Get API keys
   */
  static async getAPIKeys(): Promise<APIKeys> {
    const settings = await this.getSettings();
    return settings.apiKeys;
  }

  /**
   * Save API keys
   */
  static async saveAPIKeys(apiKeys: APIKeys): Promise<void> {
    const settings = await this.getSettings();
    settings.apiKeys = apiKeys;
    await this.saveSettings(settings);
  }

  /**
   * Check if user has any API keys configured
   */
  static async hasAPIKeys(): Promise<boolean> {
    const apiKeys = await this.getAPIKeys();
    return !!apiKeys.openrouter;
  }

  /**
   * Migrate data from localStorage to Firestore
   * Called after user logs in
   * IMPORTANT: Only migrates if cloud is empty - cloud data takes precedence
   */
  static async migrateLocalDataToFirestore(): Promise<void> {
    const user = await AuthService.getCurrentUserAsync();
    if (!user) {
      console.error('Cannot migrate: No authenticated user');
      return;
    }

    try {
      const localData = this.getLocalData();

      // Check if there's any local data to migrate
      if (!localData.rivers.length && !this.hasLocalAPIKeys()) {
        console.log('[Migration] No local data to migrate');
        return;
      }

      // IMPORTANT: Check if user already has cloud data
      // Cloud data takes precedence - don't overwrite it with local data
      const userProfile = await AuthService.getUserProfile(user.uid);
      const hasCloudAPIKeys = !!(userProfile?.encryptedAPIKeys?.openrouter);

      if (hasCloudAPIKeys) {
        console.log('[Migration] User already has API keys in cloud - skipping migration to preserve cloud data');
        // Don't migrate API keys, but still migrate rivers if needed
      }

      const batch = writeBatch(db);
      let hasBatchOperations = false;

      // Migrate rivers (only if they don't already exist in cloud)
      for (const river of localData.rivers) {
        const riverRef = doc(db, 'users', user.uid, 'rivers', river.id);
        const existingRiver = await getDoc(riverRef);

        if (!existingRiver.exists()) {
          batch.set(riverRef, {
            ...river,
            migratedAt: serverTimestamp(),
          });
          hasBatchOperations = true;
        }
      }

      // Migrate settings ONLY if cloud doesn't have API keys
      if (localData.settings && !hasCloudAPIKeys && this.hasLocalAPIKeys()) {
        console.log('[Migration] Migrating local API keys to cloud');
        const encryptedApiKeys = EncryptionUtil.encryptAPIKeys(
          localData.settings.apiKeys,
          user.uid
        );

        // Save to user profile (new location)
        await AuthService.updateEncryptedAPIKeys(user.uid, encryptedApiKeys as any);

        // Also save other settings
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');

        // Migrate selectedModels to enabledModels if needed
        let enabledModels = localData.settings.enabledModels || {};
        if (Object.keys(enabledModels).length === 0 && (localData.settings as any).selectedModels) {
          // Migrate from old format
          (localData.settings as any).selectedModels.forEach((model: any) => {
            enabledModels[model.name] = true;
          });
        }

        batch.set(settingsRef, {
          lastUsedModel: localData.settings.lastUsedModel,
          enabledModels: enabledModels || {},
          migratedAt: serverTimestamp(),
        }, { merge: true });
        hasBatchOperations = true;
      }

      if (hasBatchOperations) {
        await batch.commit();
        console.log('[Migration] Successfully migrated local data to Firestore');
      } else {
        console.log('[Migration] No data needed to be migrated');
      }

      // Optional: Clear local data after successful migration
      // this.clearLocalData();
    } catch (error) {
      console.error('Error migrating data to Firestore:', error);
      throw error;
    }
  }

  // ============ LocalStorage Fallback Methods ============

  private static getLocalData(): RiverChatData {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        return {
          rivers: [],
          settings: DEFAULT_SETTINGS,
          activeRiverId: null,
        };
      }
      return JSON.parse(data) as RiverChatData;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return {
        rivers: [],
        settings: DEFAULT_SETTINGS,
        activeRiverId: null,
      };
    }
  }

  private static saveLocalData(data: RiverChatData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }

  private static getLocalRivers(): River[] {
    const data = this.getLocalData();
    return data.rivers;
  }

  private static getLocalRiver(id: string): River | null {
    const data = this.getLocalData();
    return data.rivers.find((river) => river.id === id) || null;
  }

  private static saveLocalRiver(river: River): void {
    const data = this.getLocalData();
    const index = data.rivers.findIndex((r) => r.id === river.id);

    if (index >= 0) {
      data.rivers[index] = river;
    } else {
      data.rivers.push(river);
    }

    this.saveLocalData(data);
  }

  private static deleteLocalRiver(id: string): void {
    const data = this.getLocalData();
    data.rivers = data.rivers.filter((river) => river.id !== id);

    if (data.activeRiverId === id) {
      data.activeRiverId = null;
    }

    this.saveLocalData(data);
  }

  private static getLocalSettings(): Settings {
    const data = this.getLocalData();
    let settings = data.settings || DEFAULT_SETTINGS;

    // Ensure settings has required fields
    if (!settings.enabledModels) {
      settings.enabledModels = {};
    }
    if (!settings.availableModels) {
      settings.availableModels = [];
    }
    if (!settings.lastChatSelectedModels) {
      settings.lastChatSelectedModels = [];
    }

    // Migrate old API key structure if needed
    if ((settings.apiKeys as any).openai || (settings.apiKeys as any).anthropic || (settings.apiKeys as any).google) {
      // User has old API keys, but we can't automatically migrate them to OpenRouter
      // They'll need to set up a new OpenRouter key
      settings.apiKeys = { openrouter: '' };
    }

    return settings;
  }

  private static saveLocalSettings(settings: Settings): void {
    const data = this.getLocalData();
    data.settings = settings;
    this.saveLocalData(data);
  }

  private static hasLocalAPIKeys(): boolean {
    const settings = this.getLocalSettings();
    return !!settings.apiKeys.openrouter;
  }

  // Utility method to clear local data (can be used for debugging)
  static clearLocalData(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
