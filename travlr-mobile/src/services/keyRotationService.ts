import { signifyService } from './signifyService';
import { secureStorage } from './secureStorage';
import { realEncryptionService } from './realEncryptionService';
import { storageService } from './storage';

export interface KeyRotationResult {
  success: boolean;
  newAid?: string;
  newOobi?: string;
  rotationSequence: number;
  timestamp: string;
  error?: string;
}

export interface KeyRotationEvent {
  rotationId: string;
  employeeAid: string;
  oldKeyHash: string;
  newKeyHash: string;
  rotationSequence: number;
  timestamp: string;
  witnessReceipts: string[];
}

class KeyRotationService {
  private rotationInProgress = false;

  /**
   * Perform complete key rotation for employee
   * This follows the 10-step KERI rotation process
   */
  async rotateKeys(reason: string = 'periodic_rotation'): Promise<KeyRotationResult> {
    if (this.rotationInProgress) {
      throw new Error('Key rotation already in progress');
    }

    this.rotationInProgress = true;
    const rotationId = `rotation_${Date.now()}`;
    
    try {
      console.log('🔄 Starting KERI key rotation process...');
      
      // Step 1: Get current employee data and AID
      const employeeData = await storageService.getEmployeeData();
      if (!employeeData?.aid) {
        throw new Error('No employee AID found - cannot rotate keys');
      }

      const currentAid = employeeData.aid;
      console.log(`🔑 Rotating keys for AID: ${currentAid.substring(0, 8)}...`);

      // Step 2: Initialize SignifyTS client
      const client = await signifyService.getClient();
      const identifierName = `${signifyService.getAgentName()}-${employeeData.employee_id}`;
      
      // Step 3: Get current identifier state
      const currentIdentifier = await client.identifiers().get(identifierName);
      const currentSequence = currentIdentifier.state.s;
      
      console.log(`📊 Current key sequence: ${currentSequence}`);

      // Step 4: Create rotation event with SignifyTS
      // This generates new Ed25519 keys and signs with old key
      console.log('🔄 Creating rotation event (signed with OLD key)...');
      
      const rotationResult = await client.identifiers().rotate(identifierName, {
        // SignifyTS will automatically:
        // - Generate new Ed25519 keys
        // - Create rotation event
        // - Sign with current (old) key to prove authorization
        // - Calculate new next key commitments
      });

      // Step 5: Wait for rotation operation to complete
      await rotationResult.op();
      console.log('✅ Rotation event created and sent to witnesses');

      // Step 6: Get updated identifier info
      const updatedIdentifier = await client.identifiers().get(identifierName);
      const newSequence = updatedIdentifier.state.s;
      
      if (newSequence <= currentSequence) {
        throw new Error('Key rotation failed - sequence number did not increment');
      }

      // Step 7: Generate new X25519 encryption keys (separate from KERI Ed25519)
      console.log('🔐 Generating new X25519 encryption keys...');
      const newEncryptionKeys = await realEncryptionService.generateKeyPair();
      
      // Step 8: Store new encryption keys securely
      await secureStorage.storePrivateKey(
        `x25519_${currentAid}_${newSequence}`,
        newEncryptionKeys.privateKey
      );

      // Step 9: Get new OOBI with updated keys
      const newOobi = await client.oobis().get(identifierName);
      const oobi = newOobi.oobis[0] || `${signifyService.getKeriaAdminUrl()}/oobi/${currentAid}`;

      // Step 10: Update local storage with new key information
      await this.updateLocalKeysAfterRotation({
        aid: currentAid,
        newSequence,
        newEncryptionKeys,
        newOobi: oobi,
        rotationId,
        reason
      });

      const result: KeyRotationResult = {
        success: true,
        newAid: currentAid, // AID stays same, keys change
        newOobi: oobi,
        rotationSequence: newSequence,
        timestamp: new Date().toISOString()
      };

      // Step 11: Notify backend of key rotation
      await this.notifyBackendOfRotation(result, rotationId);

      console.log(`✅ Key rotation completed successfully! New sequence: ${newSequence}`);
      return result;

    } catch (error) {
      console.error('❌ Key rotation failed:', error);
      return {
        success: false,
        rotationSequence: -1,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown rotation error'
      };
    } finally {
      this.rotationInProgress = false;
    }
  }

  /**
   * Update local storage after successful rotation
   */
  private async updateLocalKeysAfterRotation(data: {
    aid: string;
    newSequence: number;
    newEncryptionKeys: any;
    newOobi: string;
    rotationId: string;
    reason: string;
  }): Promise<void> {
    try {
      // Update employee data with new sequence and OOBI
      const employeeData = await storageService.getEmployeeData();
      if (employeeData) {
        await storageService.saveEmployeeData({
          ...employeeData,
          oobi: data.newOobi,
          keySequence: data.newSequence,
          lastKeyRotation: new Date().toISOString(),
          rotationReason: data.reason
        });
      }

      // Store rotation history
      const rotationEvent: KeyRotationEvent = {
        rotationId: data.rotationId,
        employeeAid: data.aid,
        oldKeyHash: `seq_${data.newSequence - 1}`,
        newKeyHash: `seq_${data.newSequence}`,
        rotationSequence: data.newSequence,
        timestamp: new Date().toISOString(),
        witnessReceipts: [] // Would be populated from witness responses
      };

      await this.storeRotationEvent(rotationEvent);
      
      console.log('📝 Local storage updated after key rotation');
    } catch (error) {
      console.error('⚠️ Failed to update local storage after rotation:', error);
      // Don't throw - rotation was successful, just logging failed
    }
  }

  /**
   * Store rotation event for history tracking
   */
  private async storeRotationEvent(event: KeyRotationEvent): Promise<void> {
    try {
      const rotationHistory = await storageService.getItem('keyRotationHistory') || [];
      rotationHistory.push(event);
      
      // Keep only last 10 rotations
      if (rotationHistory.length > 10) {
        rotationHistory.splice(0, rotationHistory.length - 10);
      }
      
      await storageService.setItem('keyRotationHistory', rotationHistory);
    } catch (error) {
      console.error('Failed to store rotation event:', error);
    }
  }

  /**
   * Notify backend that keys have been rotated
   * Companies need to get updated OOBIs
   */
  private async notifyBackendOfRotation(result: KeyRotationResult, rotationId: string): Promise<void> {
    try {
      const employeeData = await storageService.getEmployeeData();
      if (!employeeData?.aid) return;

      const response = await fetch('http://192.168.31.172:8000/api/v1/mobile/key-rotation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Employee-AID': employeeData.aid
        },
        body: JSON.stringify({
          rotationId,
          employeeAid: employeeData.aid,
          newOobi: result.newOobi,
          rotationSequence: result.rotationSequence,
          timestamp: result.timestamp,
          reason: 'key_rotation_completed'
        })
      });

      if (response.ok) {
        console.log('✅ Backend notified of key rotation');
      } else {
        console.warn('⚠️ Failed to notify backend of key rotation');
      }
    } catch (error) {
      console.warn('⚠️ Backend notification failed (continuing anyway):', error);
    }
  }

  /**
   * Get key rotation history
   */
  async getRotationHistory(): Promise<KeyRotationEvent[]> {
    try {
      return await storageService.getItem('keyRotationHistory') || [];
    } catch (error) {
      console.error('Failed to get rotation history:', error);
      return [];
    }
  }

  /**
   * Check if key rotation is recommended
   */
  async shouldRotateKeys(): Promise<{
    shouldRotate: boolean;
    reason: string;
    daysSinceLastRotation?: number;
  }> {
    try {
      const employeeData = await storageService.getEmployeeData();
      if (!employeeData?.lastKeyRotation) {
        return {
          shouldRotate: true,
          reason: 'No previous key rotation found'
        };
      }

      const lastRotation = new Date(employeeData.lastKeyRotation);
      const daysSince = Math.floor((Date.now() - lastRotation.getTime()) / (1000 * 60 * 60 * 24));

      // Recommend rotation after 90 days
      if (daysSince > 90) {
        return {
          shouldRotate: true,
          reason: 'Periodic rotation recommended',
          daysSinceLastRotation: daysSince
        };
      }

      return {
        shouldRotate: false,
        reason: 'Keys are current',
        daysSinceLastRotation: daysSince
      };
    } catch (error) {
      console.error('Failed to check rotation status:', error);
      return {
        shouldRotate: false,
        reason: 'Unable to determine rotation status'
      };
    }
  }

  /**
   * Emergency key rotation (if keys are compromised)
   */
  async emergencyRotateKeys(): Promise<KeyRotationResult> {
    console.log('🚨 Emergency key rotation initiated');
    return this.rotateKeys('emergency_rotation');
  }

  /**
   * Get current key information
   */
  async getCurrentKeyInfo(): Promise<{
    aid: string;
    sequence: number;
    lastRotation?: string;
    oobi: string;
  } | null> {
    try {
      const employeeData = await storageService.getEmployeeData();
      if (!employeeData?.aid) return null;

      return {
        aid: employeeData.aid,
        sequence: employeeData.keySequence || 0,
        lastRotation: employeeData.lastKeyRotation,
        oobi: employeeData.oobi || ''
      };
    } catch (error) {
      console.error('Failed to get current key info:', error);
      return null;
    }
  }
}

// Export singleton instance
export const keyRotationService = new KeyRotationService();
export default keyRotationService;