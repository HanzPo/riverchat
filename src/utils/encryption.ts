import CryptoJS from 'crypto-js';

/**
 * Encryption utility for securing sensitive data like API keys
 * Uses AES encryption with user-specific key derived from their UID
 */
export class EncryptionUtil {
  /**
   * Encrypt a string using AES encryption
   * @param text The text to encrypt
   * @param uid User ID used as part of the encryption key
   */
  static encrypt(text: string, uid: string): string {
    if (!text) return '';

    // Create a key from the user's UID and a salt
    // In production, you might want to use a more sophisticated key derivation
    const key = CryptoJS.SHA256(uid + 'riverchat-salt-2024').toString();

    const encrypted = CryptoJS.AES.encrypt(text, key).toString();
    return encrypted;
  }

  /**
   * Decrypt an AES encrypted string
   * @param encryptedText The encrypted text to decrypt
   * @param uid User ID used as part of the encryption key
   */
  static decrypt(encryptedText: string, uid: string): string {
    if (!encryptedText) return '';

    try {
      const key = CryptoJS.SHA256(uid + 'riverchat-salt-2024').toString();
      const decrypted = CryptoJS.AES.decrypt(encryptedText, key);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      return '';
    }
  }

  /**
   * Encrypt API keys object
   */
  static encryptAPIKeys(apiKeys: Record<string, string> | any, uid: string): Record<string, string> {
    console.log('[Encryption] Encrypting API keys for uid:', uid);

    const logKeys: Record<string, string> = {};
    for (const [provider, key] of Object.entries(apiKeys)) {
      logKeys[provider] = key ? `${String(key).substring(0, 10)}...` : 'empty';
    }
    console.log('[Encryption] Input keys:', logKeys);

    const encrypted: Record<string, string> = {};

    for (const [provider, key] of Object.entries(apiKeys)) {
      encrypted[provider] = key ? this.encrypt(String(key), uid) : '';
    }

    const logEncrypted: Record<string, string> = {};
    for (const [provider, key] of Object.entries(encrypted)) {
      logEncrypted[provider] = key ? `${key.length} chars` : 'empty';
    }
    console.log('[Encryption] Encrypted keys:', logEncrypted);

    return encrypted;
  }

  /**
   * Decrypt API keys object
   */
  static decryptAPIKeys(encryptedKeys: Record<string, string> | any, uid: string): Record<string, string> {
    console.log('[Encryption] Decrypting API keys for uid:', uid);

    const logEncrypted: Record<string, string> = {};
    for (const [provider, key] of Object.entries(encryptedKeys)) {
      logEncrypted[provider] = key ? `${String(key).length} chars` : 'empty';
    }
    console.log('[Encryption] Encrypted input:', logEncrypted);

    const decrypted: Record<string, string> = {};

    for (const [provider, encryptedKey] of Object.entries(encryptedKeys)) {
      decrypted[provider] = encryptedKey ? this.decrypt(String(encryptedKey), uid) : '';
    }

    const logDecrypted: Record<string, string> = {};
    for (const [provider, key] of Object.entries(decrypted)) {
      logDecrypted[provider] = key ? `${String(key).substring(0, 10)}...` : 'empty';
    }
    console.log('[Encryption] Decrypted keys:', logDecrypted);

    return decrypted;
  }
}
