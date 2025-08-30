import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import * as Keychain from 'react-native-keychain';
import 'react-native-get-random-values';
import { randomBytes } from 'crypto';

// Secure Storage for KERI private keys and sensitive data
export interface SecureKeyData {
  privateKey: string;
  salt: string;
  encryptedAt: string;
  keyId: string;
}

export interface SecureCredentialData {
  credentialId: string;
  encryptedData: string;
  salt: string;
  encryptedAt: string;
}

class SecureStorageService {
  private static readonly MASTER_KEY_ALIAS = 'travlr_master_encryption_key';
  private static readonly SECURE_KEYS_PREFIX = 'secure_keys_';
  private static readonly SECURE_CREDS_PREFIX = 'secure_creds_';
  
  // Initialize secure storage
  async initialize(): Promise<boolean> {
    try {
      // Check if master key exists, create if not
      const hasKey = await this.hasMasterKey();
      if (!hasKey) {
        await this.generateMasterKey();
      }
      return true;
    } catch (error) {
      console.error('❌ Secure storage initialization failed:', error);
      return false;
    }
  }

  // Generate and store master encryption key in keychain
  private async generateMasterKey(): Promise<void> {
    try {
      // Generate cryptographically strong key
      const masterKey = randomBytes(32).toString('hex');
      
      // Store in secure keychain with biometric protection
      await Keychain.setInternetCredentials(
        SecureStorageService.MASTER_KEY_ALIAS,
        'master',
        masterKey,
        {
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
          authenticatePrompt: 'Authenticate to access your KERI identity',
          service: SecureStorageService.MASTER_KEY_ALIAS,
        }
      );
      
      console.log('✅ Master encryption key generated and stored securely');
    } catch (error) {
      console.error('❌ Failed to generate master key:', error);
      throw new Error('Master key generation failed');
    }
  }

  // Check if master key exists
  private async hasMasterKey(): Promise<boolean> {
    try {
      const credentials = await Keychain.getInternetCredentials(SecureStorageService.MASTER_KEY_ALIAS);
      return credentials !== false;
    } catch (error) {
      console.error('❌ Failed to check master key:', error);
      return false;
    }
  }

  // Get master key from keychain
  private async getMasterKey(): Promise<string> {
    try {
      const credentials = await Keychain.getInternetCredentials(SecureStorageService.MASTER_KEY_ALIAS);
      if (credentials === false) {
        throw new Error('Master key not found');
      }
      return credentials.password;
    } catch (error) {
      console.error('❌ Failed to retrieve master key:', error);
      throw new Error('Master key retrieval failed - biometric authentication required');
    }
  }

  // Encrypt data with AES-256-GCM
  private encryptData(data: string, key: string, salt: string): string {
    try {
      // Use PBKDF2 to derive key from master key and salt
      const derivedKey = CryptoJS.PBKDF2(key, salt, {
        keySize: 256 / 32,
        iterations: 100000, // High iteration count for security
      });
      
      // Encrypt with AES-256-GCM equivalent (AES-CTR + HMAC)
      const encrypted = CryptoJS.AES.encrypt(data, derivedKey, {
        mode: CryptoJS.mode.CTR,
        padding: CryptoJS.pad.NoPadding,
      });
      
      // Add HMAC for authentication
      const hmac = CryptoJS.HmacSHA256(encrypted.toString(), derivedKey);
      
      return encrypted.toString() + '.' + hmac.toString();
    } catch (error) {
      console.error('❌ Encryption failed:', error);
      throw new Error('Data encryption failed');
    }
  }

  // Decrypt data
  private decryptData(encryptedData: string, key: string, salt: string): string {
    try {
      const [encrypted, hmac] = encryptedData.split('.');
      if (!encrypted || !hmac) {
        throw new Error('Invalid encrypted data format');
      }
      
      // Derive key
      const derivedKey = CryptoJS.PBKDF2(key, salt, {
        keySize: 256 / 32,
        iterations: 100000,
      });
      
      // Verify HMAC
      const expectedHmac = CryptoJS.HmacSHA256(encrypted, derivedKey).toString();
      if (hmac !== expectedHmac) {
        throw new Error('Data integrity check failed - possible tampering');
      }
      
      // Decrypt
      const decrypted = CryptoJS.AES.decrypt(encrypted, derivedKey, {
        mode: CryptoJS.mode.CTR,
        padding: CryptoJS.pad.NoPadding,
      });
      
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw new Error('Data decryption failed');
    }
  }

  // Store KERI private key securely
  async storePrivateKey(keyId: string, privateKey: string): Promise<void> {
    try {
      const masterKey = await this.getMasterKey();
      const salt = randomBytes(32).toString('hex');
      
      const encryptedKey = this.encryptData(privateKey, masterKey, salt);
      
      const secureKeyData: SecureKeyData = {
        privateKey: encryptedKey,
        salt,
        encryptedAt: new Date().toISOString(),
        keyId,
      };
      
      const storageKey = SecureStorageService.SECURE_KEYS_PREFIX + keyId;
      await AsyncStorage.setItem(storageKey, JSON.stringify(secureKeyData));
      
      console.log(`✅ Private key ${keyId} stored securely`);
    } catch (error) {
      console.error('❌ Failed to store private key:', error);
      throw new Error('Private key storage failed');
    }
  }

  // Retrieve KERI private key securely
  async getPrivateKey(keyId: string): Promise<string | null> {
    try {
      const storageKey = SecureStorageService.SECURE_KEYS_PREFIX + keyId;
      const encryptedDataStr = await AsyncStorage.getItem(storageKey);
      
      if (!encryptedDataStr) {
        return null;
      }
      
      const secureKeyData: SecureKeyData = JSON.parse(encryptedDataStr);
      const masterKey = await this.getMasterKey();
      
      const decryptedKey = this.decryptData(
        secureKeyData.privateKey,
        masterKey,
        secureKeyData.salt
      );
      
      return decryptedKey;
    } catch (error) {
      console.error('❌ Failed to retrieve private key:', error);
      throw new Error('Private key retrieval failed - authentication required');
    }
  }

  // Store credential data securely
  async storeCredentialData(credentialId: string, credentialData: any): Promise<void> {
    try {
      const masterKey = await this.getMasterKey();
      const salt = randomBytes(32).toString('hex');
      
      const dataStr = JSON.stringify(credentialData);
      const encryptedData = this.encryptData(dataStr, masterKey, salt);
      
      const secureCredData: SecureCredentialData = {
        credentialId,
        encryptedData,
        salt,
        encryptedAt: new Date().toISOString(),
      };
      
      const storageKey = SecureStorageService.SECURE_CREDS_PREFIX + credentialId;
      await AsyncStorage.setItem(storageKey, JSON.stringify(secureCredData));
      
      console.log(`✅ Credential ${credentialId} stored securely`);
    } catch (error) {
      console.error('❌ Failed to store credential:', error);
      throw new Error('Credential storage failed');
    }
  }

  // Retrieve credential data securely
  async getCredentialData(credentialId: string): Promise<any | null> {
    try {
      const storageKey = SecureStorageService.SECURE_CREDS_PREFIX + credentialId;
      const encryptedDataStr = await AsyncStorage.getItem(storageKey);
      
      if (!encryptedDataStr) {
        return null;
      }
      
      const secureCredData: SecureCredentialData = JSON.parse(encryptedDataStr);
      const masterKey = await this.getMasterKey();
      
      const decryptedData = this.decryptData(
        secureCredData.encryptedData,
        masterKey,
        secureCredData.salt
      );
      
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('❌ Failed to retrieve credential:', error);
      throw new Error('Credential retrieval failed - authentication required');
    }
  }

  // Remove private key
  async removePrivateKey(keyId: string): Promise<void> {
    try {
      const storageKey = SecureStorageService.SECURE_KEYS_PREFIX + keyId;
      await AsyncStorage.removeItem(storageKey);
      console.log(`✅ Private key ${keyId} removed securely`);
    } catch (error) {
      console.error('❌ Failed to remove private key:', error);
      throw error;
    }
  }

  // Remove credential
  async removeCredential(credentialId: string): Promise<void> {
    try {
      const storageKey = SecureStorageService.SECURE_CREDS_PREFIX + credentialId;
      await AsyncStorage.removeItem(storageKey);
      console.log(`✅ Credential ${credentialId} removed securely`);
    } catch (error) {
      console.error('❌ Failed to remove credential:', error);
      throw error;
    }
  }

  // Clear all secure data (for logout/reset)
  async clearAllSecureData(): Promise<void> {
    try {
      // Get all AsyncStorage keys
      const allKeys = await AsyncStorage.getAllKeys();
      
      // Filter secure keys
      const secureKeys = allKeys.filter(key => 
        key.startsWith(SecureStorageService.SECURE_KEYS_PREFIX) ||
        key.startsWith(SecureStorageService.SECURE_CREDS_PREFIX)
      );
      
      // Remove all secure keys
      await AsyncStorage.multiRemove(secureKeys);
      
      // Remove master key from keychain
      await Keychain.resetInternetCredentials(SecureStorageService.MASTER_KEY_ALIAS);
      
      console.log('✅ All secure data cleared');
    } catch (error) {
      console.error('❌ Failed to clear secure data:', error);
      throw error;
    }
  }

  // Validate data integrity
  async validateIntegrity(): Promise<boolean> {
    try {
      // Check if master key is accessible
      const masterKey = await this.getMasterKey();
      return !!masterKey;
    } catch (error) {
      console.error('❌ Integrity validation failed:', error);
      return false;
    }
  }

  // Get all stored private key IDs
  async getStoredKeyIds(): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const keyIds = allKeys
        .filter(key => key.startsWith(SecureStorageService.SECURE_KEYS_PREFIX))
        .map(key => key.replace(SecureStorageService.SECURE_KEYS_PREFIX, ''));
      
      return keyIds;
    } catch (error) {
      console.error('❌ Failed to get stored key IDs:', error);
      return [];
    }
  }

  // Check if biometric authentication is available
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      return biometryType !== null;
    } catch (error) {
      console.error('❌ Failed to check biometric availability:', error);
      return false;
    }
  }
}

// Export singleton instance
export const secureStorage = new SecureStorageService();
export default secureStorage;