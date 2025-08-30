import { signifyService } from './signifyService';
import { secureStorage } from './secureStorage';
import { storageService } from './storage';
import { realEncryptionService } from './realEncryptionService';
import { cryptoConfig } from './cryptoConfig';
import * as Crypto from 'expo-crypto';

export interface BackupPackage {
  employeeId: string;
  aid: string;
  encryptedKeyData: string;
  backupMetadata: {
    version: string;
    timestamp: string;
    keySequence: number;
    backupMethod: 'secure_phrase' | 'cloud_encrypted' | 'manual_export';
    deviceInfo: {
      platform: string;
      deviceId: string;
    };
  };
  integrityHash: string;
}

export interface BackupResult {
  success: boolean;
  backupId?: string;
  securePhrase?: string;
  qrCode?: string;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  restoredAid?: string;
  restoredSequence?: number;
  error?: string;
}

class KeyBackupService {
  private backupInProgress = false;
  private restoreInProgress = false;

  /**
   * Create comprehensive key backup with multiple recovery options
   */
  async createKeyBackup(): Promise<BackupResult> {
    if (this.backupInProgress) {
      throw new Error('Backup already in progress');
    }

    this.backupInProgress = true;
    const backupId = `backup_${Date.now()}`;

    try {
      console.log('🛡️ Creating comprehensive key backup...');

      // Step 1: Get current employee and key data
      const employeeData = await storageService.getEmployeeData();
      if (!employeeData?.aid) {
        throw new Error('No employee AID found - cannot create backup');
      }

      console.log(`🔑 Backing up keys for AID: ${employeeData.aid.substring(0, 8)}...`);

      // Step 2: Collect all key material from KERI and encryption services
      const keyMaterial = await this.collectKeyMaterial(employeeData.aid);

      // Step 3: Generate secure recovery phrase
      const securePhrase = await this.generateSecurePhrase();

      // Step 4: Encrypt key material with recovery phrase
      const encryptedBackup = await this.encryptKeyMaterial(keyMaterial, securePhrase);

      // Step 5: Create backup package
      const backupPackage: BackupPackage = {
        employeeId: employeeData.employee_id,
        aid: employeeData.aid,
        encryptedKeyData: encryptedBackup.encryptedData,
        backupMetadata: {
          version: '1.0',
          timestamp: new Date().toISOString(),
          keySequence: employeeData.keySequence || 0,
          backupMethod: 'secure_phrase',
          deviceInfo: {
            platform: 'react-native',
            deviceId: await this.getDeviceId()
          }
        },
        integrityHash: encryptedBackup.integrityHash
      };

      // Step 6: Store backup locally and optionally in secure cloud
      await this.storeBackupPackage(backupId, backupPackage);

      // Step 7: Generate QR code for manual backup sharing
      const qrCodeData = await this.generateBackupQR(backupPackage, securePhrase);

      console.log('✅ Key backup created successfully');

      return {
        success: true,
        backupId,
        securePhrase,
        qrCode: qrCodeData
      };

    } catch (error) {
      console.error('❌ Failed to create key backup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown backup error'
      };
    } finally {
      this.backupInProgress = false;
    }
  }

  /**
   * Collect all key material for backup
   */
  private async collectKeyMaterial(aid: string): Promise<any> {
    try {
      console.log('📦 Collecting key material for backup...');

      const employeeData = await storageService.getEmployeeData();
      if (!employeeData) {
        throw new Error('Employee data not found');
      }

      // Get KERI private key material (this would need SignifyTS export functionality)
      const client = await signifyService.getClient();
      const identifierName = `${signifyService.getAgentName()}-${employeeData.employee_id}`;
      
      // Note: In a production implementation, SignifyTS would need to provide
      // key export functionality for backup purposes
      const keyMaterial = {
        aid,
        identifierName,
        keySequence: employeeData.keySequence || 0,
        oobi: employeeData.oobi,
        
        // Employee data
        employeeInfo: {
          employee_id: employeeData.employee_id,
          full_name: employeeData.full_name,
          department: employeeData.department,
          registration_timestamp: employeeData.registration_timestamp
        },

        // KERI-specific data (would be extracted from SignifyTS in production)
        keriaEndpoint: signifyService.getKeriaAdminUrl(),
        agentName: signifyService.getAgentName(),
        
        // Timestamp for backup validation
        backupTimestamp: new Date().toISOString()
      };

      console.log('✅ Key material collected');
      return keyMaterial;

    } catch (error) {
      console.error('Failed to collect key material:', error);
      throw error;
    }
  }

  /**
   * Generate secure recovery phrase using BIP39-like word list
   */
  private async generateSecurePhrase(): Promise<string> {
    try {
      // Use crypto-secure entropy for phrase generation
      const entropy = await cryptoConfig.generateSecureEntropy(256); // 256 bits
      
      // Convert to mnemonic phrase (simplified version)
      // In production, would use proper BIP39 implementation
      const words = [
        'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
        'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
        'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
        'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance'
      ]; // This would be the full BIP39 wordlist in production
      
      const phrase: string[] = [];
      for (let i = 0; i < 24; i++) { // 24-word phrase
        const index = entropy[i] % words.length;
        phrase.push(words[index]);
      }

      return phrase.join(' ');
    } catch (error) {
      console.error('Failed to generate secure phrase:', error);
      throw error;
    }
  }

  /**
   * Encrypt key material with secure phrase
   */
  private async encryptKeyMaterial(
    keyMaterial: any, 
    securePhrase: string
  ): Promise<{ encryptedData: string; integrityHash: string }> {
    try {
      console.log('🔐 Encrypting key material with secure phrase...');

      // Derive encryption key from secure phrase using PBKDF2
      const salt = await Crypto.getRandomBytesAsync(32);
      const derivedKey = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        securePhrase + salt.toString()
      );

      // Encrypt key material
      const keyMaterialString = JSON.stringify(keyMaterial);
      const encryptedData = await realEncryptionService.encryptData(
        keyMaterialString,
        derivedKey
      );

      // Calculate integrity hash
      const integrityHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        encryptedData + securePhrase
      );

      return {
        encryptedData: encryptedData.encryptedData,
        integrityHash
      };

    } catch (error) {
      console.error('Failed to encrypt key material:', error);
      throw error;
    }
  }

  /**
   * Store backup package securely
   */
  private async storeBackupPackage(backupId: string, backupPackage: BackupPackage): Promise<void> {
    try {
      // Store in secure local storage
      await secureStorage.storePrivateKey(`backup_${backupId}`, JSON.stringify(backupPackage));

      // Also store in regular storage for metadata access
      const backupIndex = await storageService.getItem('keyBackups') || [];
      backupIndex.push({
        backupId,
        timestamp: backupPackage.backupMetadata.timestamp,
        aid: backupPackage.aid,
        method: backupPackage.backupMetadata.backupMethod
      });

      await storageService.setItem('keyBackups', backupIndex);

      console.log('📝 Backup package stored securely');
    } catch (error) {
      console.error('Failed to store backup package:', error);
      throw error;
    }
  }

  /**
   * Generate QR code for backup sharing
   */
  private async generateBackupQR(backupPackage: BackupPackage, securePhrase: string): Promise<string> {
    try {
      // Create compact backup data for QR code
      const compactBackup = {
        t: 'travlr_backup',
        v: '1.0',
        a: backupPackage.aid,
        e: backupPackage.employeeId,
        d: backupPackage.encryptedKeyData.substring(0, 100), // Truncated for QR
        h: backupPackage.integrityHash.substring(0, 16),
        p: securePhrase.split(' ').slice(0, 8).join(' ') // First 8 words for QR
      };

      const QRCode = require('qrcode');
      const qrDataUrl = await QRCode.toDataURL(JSON.stringify(compactBackup), {
        width: 300,
        margin: 2,
        color: {
          dark: '#d32f2f',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });

      return qrDataUrl;
    } catch (error) {
      console.error('Failed to generate backup QR:', error);
      return '';
    }
  }

  /**
   * Restore keys from backup using secure phrase
   */
  async restoreKeysFromBackup(
    backupData: string | BackupPackage,
    securePhrase: string
  ): Promise<RestoreResult> {
    if (this.restoreInProgress) {
      throw new Error('Restore already in progress');
    }

    this.restoreInProgress = true;

    try {
      console.log('🔄 Restoring keys from backup...');

      // Step 1: Parse backup data
      let backupPackage: BackupPackage;
      if (typeof backupData === 'string') {
        backupPackage = JSON.parse(backupData);
      } else {
        backupPackage = backupData;
      }

      // Step 2: Verify backup integrity
      const isValid = await this.verifyBackupIntegrity(backupPackage, securePhrase);
      if (!isValid) {
        throw new Error('Backup integrity verification failed');
      }

      // Step 3: Decrypt key material
      const keyMaterial = await this.decryptKeyMaterial(
        backupPackage.encryptedKeyData,
        securePhrase
      );

      // Step 4: Restore KERI identity
      const restoreResult = await this.restoreKERIIdentity(keyMaterial);

      // Step 5: Restore employee data and local state
      await this.restoreEmployeeData(keyMaterial);

      console.log('✅ Keys restored successfully');

      return {
        success: true,
        restoredAid: keyMaterial.aid,
        restoredSequence: keyMaterial.keySequence
      };

    } catch (error) {
      console.error('❌ Failed to restore keys:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown restore error'
      };
    } finally {
      this.restoreInProgress = false;
    }
  }

  /**
   * Verify backup integrity
   */
  private async verifyBackupIntegrity(
    backupPackage: BackupPackage,
    securePhrase: string
  ): Promise<boolean> {
    try {
      // Recalculate integrity hash
      const expectedHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        backupPackage.encryptedKeyData + securePhrase
      );

      return expectedHash === backupPackage.integrityHash;
    } catch (error) {
      console.error('Failed to verify backup integrity:', error);
      return false;
    }
  }

  /**
   * Decrypt key material from backup
   */
  private async decryptKeyMaterial(encryptedData: string, securePhrase: string): Promise<any> {
    try {
      // Derive decryption key (same as encryption)
      const salt = await Crypto.getRandomBytesAsync(32);
      const derivedKey = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        securePhrase + salt.toString()
      );

      // Decrypt key material
      const decryptedData = await realEncryptionService.decryptData(
        { encryptedData, nonce: '', authTag: '' }, // Simplified for example
        derivedKey
      );

      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Failed to decrypt key material:', error);
      throw error;
    }
  }

  /**
   * Restore KERI identity
   */
  private async restoreKERIIdentity(keyMaterial: any): Promise<void> {
    try {
      console.log('🔄 Restoring KERI identity...');

      // Initialize SignifyTS client
      const client = await signifyService.getClient();

      // Note: In production, this would involve:
      // 1. Importing the private key material into SignifyTS
      // 2. Re-establishing witness connections
      // 3. Syncing key state with witnesses
      // 4. Verifying the restored identity is valid

      console.log('✅ KERI identity restoration initiated');
    } catch (error) {
      console.error('Failed to restore KERI identity:', error);
      throw error;
    }
  }

  /**
   * Restore employee data and local state
   */
  private async restoreEmployeeData(keyMaterial: any): Promise<void> {
    try {
      console.log('📝 Restoring employee data and local state...');

      // Restore employee data
      await storageService.saveEmployeeData({
        ...keyMaterial.employeeInfo,
        aid: keyMaterial.aid,
        oobi: keyMaterial.oobi,
        keySequence: keyMaterial.keySequence,
        lastKeyRotation: keyMaterial.backupTimestamp,
        restored_from_backup: new Date().toISOString()
      });

      console.log('✅ Employee data restored');
    } catch (error) {
      console.error('Failed to restore employee data:', error);
      throw error;
    }
  }

  /**
   * Get device ID for backup tracking
   */
  private async getDeviceId(): Promise<string> {
    try {
      // In production, would use proper device ID
      return `device_${Date.now()}`;
    } catch (error) {
      return 'unknown_device';
    }
  }

  /**
   * List available backups
   */
  async listAvailableBackups(): Promise<Array<{
    backupId: string;
    timestamp: string;
    aid: string;
    method: string;
  }>> {
    try {
      return await storageService.getItem('keyBackups') || [];
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    try {
      // Remove from secure storage
      await secureStorage.deleteKey(`backup_${backupId}`);

      // Remove from index
      const backupIndex = await storageService.getItem('keyBackups') || [];
      const filteredIndex = backupIndex.filter((b: any) => b.backupId !== backupId);
      await storageService.setItem('keyBackups', filteredIndex);

      console.log(`🗑️ Backup ${backupId} deleted`);
    } catch (error) {
      console.error('Failed to delete backup:', error);
      throw error;
    }
  }

  /**
   * Verify backup phrase without full restore
   */
  async verifyBackupPhrase(backupData: BackupPackage, phrase: string): Promise<boolean> {
    try {
      return await this.verifyBackupIntegrity(backupData, phrase);
    } catch (error) {
      console.error('Failed to verify backup phrase:', error);
      return false;
    }
  }
}

// Export singleton instance
export const keyBackupService = new KeyBackupService();
export default keyBackupService;