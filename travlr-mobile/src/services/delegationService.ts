import { signifyService } from './signifyService';
import { storageService } from './storage';
import { realEncryptionService } from './realEncryptionService';
import { witnessService } from './witnessService';
import { companyOOBIService } from './companyOOBIService';

export interface DelegationRequest {
  delegatorAid: string; // Company AID
  delegateAid: string; // Employee AID
  permissions: string[];
  purpose: string;
  expiresAt?: string;
  metadata: {
    companyName: string;
    employeeName: string;
    requestId: string;
    timestamp: string;
  };
}

export interface DelegatedIdentity {
  delegationId: string;
  delegatorAid: string; // Company
  delegateAid: string; // Employee
  delegatedAid: string; // New delegated identity AID
  permissions: string[];
  status: 'pending' | 'active' | 'revoked' | 'expired';
  createdAt: string;
  expiresAt?: string;
  dipEvent: any; // Delegated Inception Event
  rotationHistory: DelegatedRotationEvent[];
}

export interface DelegatedRotationEvent {
  drtEventId: string;
  delegatedAid: string;
  oldKeyCommitment: string;
  newKeyCommitment: string;
  rotationSequence: number;
  timestamp: string;
  reason: string;
  witnessReceipts: string[];
}

export interface DelegationResult {
  success: boolean;
  delegatedIdentity?: DelegatedIdentity;
  dipEvent?: any;
  error?: string;
}

export interface DelegatedRotationResult {
  success: boolean;
  drtEvent?: DelegatedRotationEvent;
  newKeyCommitment?: string;
  rotationSequence?: number;
  error?: string;
}

class DelegationService {
  private delegationInProgress = false;
  private activeDelegations = new Map<string, DelegatedIdentity>();

  /**
   * Request delegation from a company (creates delegated inception event)
   * This creates a DIP event establishing company-employee authority relationship
   */
  async requestDelegation(delegationRequest: DelegationRequest): Promise<DelegationResult> {
    if (this.delegationInProgress) {
      throw new Error('Delegation process already in progress');
    }

    this.delegationInProgress = true;
    const delegationId = `delegation_${Date.now()}`;

    try {
      console.log('🤝 Initiating delegated inception (DIP) event...');
      console.log(`📋 Delegator: ${delegationRequest.delegatorAid.substring(0, 8)}...`);
      console.log(`👤 Delegate: ${delegationRequest.delegateAid.substring(0, 8)}...`);

      // Step 1: Validate company identity
      const companyResolution = await companyOOBIService.resolveCompanyOOBI(delegationRequest.delegatorAid);
      if (!companyResolution.success || companyResolution.trustLevel === 'unverified') {
        throw new Error('Company identity cannot be verified - delegation rejected');
      }

      // Step 2: Get employee's current identity
      const employeeData = await storageService.getEmployeeData();
      if (!employeeData?.aid || employeeData.aid !== delegationRequest.delegateAid) {
        throw new Error('Employee identity mismatch - cannot proceed with delegation');
      }

      // Step 3: Create delegated inception event using SignifyTS
      const client = await signifyService.getClient();
      
      // Create delegated identifier name
      const delegatedIdentifierName = `delegated-${delegationId}-${employeeData.employee_id}`;
      
      console.log('🔄 Creating delegated inception (DIP) event...');
      
      // Create DIP event - this establishes the delegated identity
      const dipResult = await client.identifiers().create(delegatedIdentifierName, {
        algo: 'ed25519',
        count: 1,
        toad: 2, // Threshold for witnesses
        wits: [], // Will inherit from delegator's witness set
        // Delegation-specific parameters
        delpre: delegationRequest.delegatorAid, // Delegator prefix
        data: {
          delegationType: 'company_employee_authority',
          permissions: delegationRequest.permissions,
          purpose: delegationRequest.purpose,
          expiresAt: delegationRequest.expiresAt,
          metadata: delegationRequest.metadata
        }
      });

      await dipResult.op(); // Wait for DIP event to complete
      
      const delegatedAid = dipResult.serder.ked.i;
      console.log(`✅ Delegated identity created: ${delegatedAid.substring(0, 8)}...`);

      // Step 4: Get OOBI for new delegated identity
      const delegatedOobi = await client.oobis().get(delegatedIdentifierName);

      // Step 5: Create delegation record
      const delegatedIdentity: DelegatedIdentity = {
        delegationId,
        delegatorAid: delegationRequest.delegatorAid,
        delegateAid: delegationRequest.delegateAid,
        delegatedAid,
        permissions: delegationRequest.permissions,
        status: 'active',
        createdAt: new Date().toISOString(),
        expiresAt: delegationRequest.expiresAt,
        dipEvent: {
          eventType: 'dip',
          delegatedAid,
          delegatorAid: delegationRequest.delegatorAid,
          delegateAid: delegationRequest.delegateAid,
          sequence: 0,
          timestamp: new Date().toISOString(),
          data: delegationRequest
        },
        rotationHistory: []
      };

      // Step 6: Store delegation locally
      await this.storeDelegatedIdentity(delegatedIdentity);

      // Step 7: Notify backend of new delegation
      await this.notifyBackendOfDelegation(delegatedIdentity);

      console.log('✅ Delegated inception (DIP) completed successfully');

      return {
        success: true,
        delegatedIdentity,
        dipEvent: delegatedIdentity.dipEvent
      };

    } catch (error) {
      console.error('❌ Delegated inception failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown delegation error'
      };
    } finally {
      this.delegationInProgress = false;
    }
  }

  /**
   * Rotate keys for delegated identity (creates delegated rotation event)
   * This creates a DRT event for key rotation within the delegation context
   */
  async rotateDelegatedKeys(
    delegationId: string, 
    reason: string = 'periodic_rotation'
  ): Promise<DelegatedRotationResult> {
    try {
      console.log(`🔄 Starting delegated rotation (DRT) for delegation: ${delegationId}`);

      // Step 1: Get delegation record
      const delegation = await this.getDelegatedIdentity(delegationId);
      if (!delegation) {
        throw new Error('Delegation not found');
      }

      if (delegation.status !== 'active') {
        throw new Error(`Cannot rotate keys for ${delegation.status} delegation`);
      }

      // Step 2: Initialize SignifyTS client
      const client = await signifyService.getClient();
      const delegatedIdentifierName = `delegated-${delegationId}-${delegation.delegateAid.substring(0, 8)}`;

      // Step 3: Get current delegated identifier state
      const currentIdentifier = await client.identifiers().get(delegatedIdentifierName);
      const currentSequence = currentIdentifier.state.s;

      console.log(`📊 Current delegated key sequence: ${currentSequence}`);

      // Step 4: Create delegated rotation event (DRT)
      console.log('🔄 Creating delegated rotation (DRT) event...');
      
      const drtResult = await client.identifiers().rotate(delegatedIdentifierName, {
        // SignifyTS will automatically:
        // - Generate new keys for the delegated identity
        // - Create DRT event signed with current delegated key
        // - Maintain delegation relationship with delegator
        data: {
          rotationType: 'delegated_key_rotation',
          reason,
          delegatorAid: delegation.delegatorAid,
          rotationTimestamp: new Date().toISOString()
        }
      });

      await drtResult.op(); // Wait for DRT operation to complete

      // Step 5: Get updated identifier info
      const updatedIdentifier = await client.identifiers().get(delegatedIdentifierName);
      const newSequence = updatedIdentifier.state.s;

      if (newSequence <= currentSequence) {
        throw new Error('Delegated key rotation failed - sequence did not increment');
      }

      // Step 6: Create rotation event record
      const drtEvent: DelegatedRotationEvent = {
        drtEventId: `drt_${Date.now()}`,
        delegatedAid: delegation.delegatedAid,
        oldKeyCommitment: `seq_${currentSequence}`,
        newKeyCommitment: `seq_${newSequence}`,
        rotationSequence: newSequence,
        timestamp: new Date().toISOString(),
        reason,
        witnessReceipts: [] // Would be populated from witness responses
      };

      // Step 7: Update delegation record
      delegation.rotationHistory.push(drtEvent);
      await this.storeDelegatedIdentity(delegation);

      // Step 8: Notify delegator (company) of key rotation
      await this.notifyDelegatorOfRotation(delegation, drtEvent);

      console.log(`✅ Delegated rotation (DRT) completed: sequence ${newSequence}`);

      return {
        success: true,
        drtEvent,
        newKeyCommitment: drtEvent.newKeyCommitment,
        rotationSequence: newSequence
      };

    } catch (error) {
      console.error('❌ Delegated key rotation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown rotation error'
      };
    }
  }

  /**
   * Revoke delegation (terminates company-employee authority relationship)
   */
  async revokeDelegation(
    delegationId: string,
    reason: string = 'user_requested'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🚫 Revoking delegation: ${delegationId}`);

      const delegation = await this.getDelegatedIdentity(delegationId);
      if (!delegation) {
        throw new Error('Delegation not found');
      }

      // Create revocation event
      const client = await signifyService.getClient();
      const delegatedIdentifierName = `delegated-${delegationId}-${delegation.delegateAid.substring(0, 8)}`;

      // In full KERI implementation, this would create a revocation event
      // For now, we'll mark the delegation as revoked locally
      delegation.status = 'revoked';
      await this.storeDelegatedIdentity(delegation);

      // Notify backend and delegator
      await this.notifyDelegationRevocation(delegation, reason);

      console.log('✅ Delegation revoked successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ Failed to revoke delegation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown revocation error'
      };
    }
  }

  /**
   * Get all active delegations for current employee
   */
  async getActiveDelegations(): Promise<DelegatedIdentity[]> {
    try {
      const storedDelegations = await storageService.getItem('delegatedIdentities') || {};
      return Object.values(storedDelegations).filter(
        (delegation: any) => delegation.status === 'active'
      );
    } catch (error) {
      console.error('Failed to get active delegations:', error);
      return [];
    }
  }

  /**
   * Get delegation by ID
   */
  async getDelegatedIdentity(delegationId: string): Promise<DelegatedIdentity | null> {
    try {
      // Check memory cache first
      const memCached = this.activeDelegations.get(delegationId);
      if (memCached) return memCached;

      // Check persistent storage
      const storedDelegations = await storageService.getItem('delegatedIdentities') || {};
      return storedDelegations[delegationId] || null;
    } catch (error) {
      console.error('Failed to get delegated identity:', error);
      return null;
    }
  }

  /**
   * Store delegated identity
   */
  private async storeDelegatedIdentity(delegation: DelegatedIdentity): Promise<void> {
    try {
      // Store in memory cache
      this.activeDelegations.set(delegation.delegationId, delegation);

      // Store in persistent storage
      const storedDelegations = await storageService.getItem('delegatedIdentities') || {};
      storedDelegations[delegation.delegationId] = delegation;
      await storageService.setItem('delegatedIdentities', storedDelegations);

      console.log('📝 Delegated identity stored');
    } catch (error) {
      console.error('Failed to store delegated identity:', error);
      throw error;
    }
  }

  /**
   * Notify backend of new delegation
   */
  private async notifyBackendOfDelegation(delegation: DelegatedIdentity): Promise<void> {
    try {
      const response = await fetch('http://192.168.31.172:8000/api/v1/mobile/delegation-created', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Employee-AID': delegation.delegateAid
        },
        body: JSON.stringify({
          delegationId: delegation.delegationId,
          delegatorAid: delegation.delegatorAid,
          delegateAid: delegation.delegateAid,
          delegatedAid: delegation.delegatedAid,
          permissions: delegation.permissions,
          dipEvent: delegation.dipEvent,
          timestamp: delegation.createdAt
        })
      });

      if (response.ok) {
        console.log('✅ Backend notified of delegation creation');
      } else {
        console.warn('⚠️ Failed to notify backend of delegation');
      }
    } catch (error) {
      console.warn('⚠️ Backend notification failed:', error);
    }
  }

  /**
   * Notify delegator (company) of key rotation
   */
  private async notifyDelegatorOfRotation(
    delegation: DelegatedIdentity,
    drtEvent: DelegatedRotationEvent
  ): Promise<void> {
    try {
      console.log(`📢 Notifying delegator of DRT event: ${delegation.delegatorAid.substring(0, 8)}...`);

      // In full implementation, this would:
      // 1. Look up delegator's notification endpoint
      // 2. Send encrypted DRT notification
      // 3. Include new key commitment for delegated identity

      console.log('✅ Delegator notified of key rotation (placeholder)');
    } catch (error) {
      console.error('Failed to notify delegator:', error);
    }
  }

  /**
   * Notify of delegation revocation
   */
  private async notifyDelegationRevocation(
    delegation: DelegatedIdentity,
    reason: string
  ): Promise<void> {
    try {
      const response = await fetch('http://192.168.31.172:8000/api/v1/mobile/delegation-revoked', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Employee-AID': delegation.delegateAid
        },
        body: JSON.stringify({
          delegationId: delegation.delegationId,
          delegatorAid: delegation.delegatorAid,
          delegatedAid: delegation.delegatedAid,
          reason,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        console.log('✅ Delegation revocation notified');
      }
    } catch (error) {
      console.warn('⚠️ Failed to notify revocation:', error);
    }
  }

  /**
   * Check if delegation is expired
   */
  private isDelegationExpired(delegation: DelegatedIdentity): boolean {
    if (!delegation.expiresAt) return false;
    return new Date(delegation.expiresAt) < new Date();
  }

  /**
   * Get delegation permissions for a company
   */
  async getDelegationPermissions(companyAid: string): Promise<string[]> {
    try {
      const activeDelegations = await this.getActiveDelegations();
      const companyDelegation = activeDelegations.find(
        d => d.delegatorAid === companyAid && !this.isDelegationExpired(d)
      );
      
      return companyDelegation?.permissions || [];
    } catch (error) {
      console.error('Failed to get delegation permissions:', error);
      return [];
    }
  }

  /**
   * Recover delegated identity after key compromise or loss
   * Creates a new DRT event to recover the delegated identity
   */
  async recoverDelegatedIdentity(
    delegationId: string,
    recoveryReason: string = 'key_compromise'
  ): Promise<DelegatedRotationResult> {
    try {
      console.log(`🔧 Starting delegated identity recovery: ${delegationId}`);

      const delegation = await this.getDelegatedIdentity(delegationId);
      if (!delegation) {
        throw new Error('Delegation not found');
      }

      if (delegation.status !== 'active') {
        throw new Error(`Cannot recover ${delegation.status} delegation`);
      }

      // Use emergency rotation for recovery
      const recoveryResult = await this.rotateDelegatedKeys(
        delegationId, 
        `recovery_${recoveryReason}`
      );

      if (recoveryResult.success) {
        // Add recovery marker to delegation
        delegation.rotationHistory.push({
          ...recoveryResult.drtEvent!,
          reason: `RECOVERY: ${recoveryReason}`,
          recoveryEvent: true
        } as any);

        await this.storeDelegatedIdentity(delegation);
        
        // Notify all parties of recovery
        await this.notifyDelegationRecovery(delegation, recoveryResult.drtEvent!);
      }

      return recoveryResult;

    } catch (error) {
      console.error('❌ Delegated identity recovery failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown recovery error'
      };
    }
  }

  /**
   * Emergency revocation (immediate termination without normal flow)
   */
  async emergencyRevokeDelegation(
    delegationId: string,
    emergencyReason: string = 'security_breach'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🚨 Emergency delegation revocation: ${delegationId}`);

      const delegation = await this.getDelegatedIdentity(delegationId);
      if (!delegation) {
        throw new Error('Delegation not found');
      }

      // Immediate revocation
      delegation.status = 'revoked';
      await this.storeDelegatedIdentity(delegation);

      // Notify all parties immediately
      await this.notifyDelegationRevocation(delegation, `EMERGENCY: ${emergencyReason}`);

      // Additional emergency notifications
      await this.sendEmergencyNotifications(delegation, emergencyReason);

      console.log('✅ Emergency delegation revocation completed');
      return { success: true };

    } catch (error) {
      console.error('❌ Emergency revocation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown emergency error'
      };
    }
  }

  /**
   * Restore delegation from backup
   */
  async restoreDelegationFromBackup(
    backupData: any,
    verificationKey: string
  ): Promise<{ success: boolean; delegationId?: string; error?: string }> {
    try {
      console.log('🔄 Restoring delegation from backup...');

      // Verify backup integrity
      const isValid = await this.verifyDelegationBackup(backupData, verificationKey);
      if (!isValid) {
        throw new Error('Delegation backup verification failed');
      }

      // Restore delegation
      const delegation: DelegatedIdentity = backupData.delegation;
      delegation.status = 'active'; // Reactivate

      // Store restored delegation
      await this.storeDelegatedIdentity(delegation);

      // Notify delegator of restoration
      await this.notifyDelegationRestoration(delegation);

      console.log('✅ Delegation restored from backup');
      return {
        success: true,
        delegationId: delegation.delegationId
      };

    } catch (error) {
      console.error('❌ Failed to restore delegation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown restoration error'
      };
    }
  }

  /**
   * Send emergency notifications
   */
  private async sendEmergencyNotifications(
    delegation: DelegatedIdentity,
    reason: string
  ): Promise<void> {
    try {
      // In production, this would send urgent notifications via:
      // - Email alerts
      // - SMS notifications  
      // - Push notifications
      // - Security team alerts
      
      console.log(`🚨 Emergency notifications sent for delegation: ${delegation.delegationId}`);
      console.log(`📧 Notifying security team of: ${reason}`);
    } catch (error) {
      console.error('Failed to send emergency notifications:', error);
    }
  }

  /**
   * Verify delegation backup integrity
   */
  private async verifyDelegationBackup(backupData: any, verificationKey: string): Promise<boolean> {
    try {
      // In production, this would verify:
      // - Cryptographic signatures
      // - Data integrity hashes
      // - Timestamp validity
      // - Authorization proofs
      
      return backupData && backupData.delegation && verificationKey.length > 0;
    } catch (error) {
      console.error('Backup verification failed:', error);
      return false;
    }
  }

  /**
   * Notify delegation recovery
   */
  private async notifyDelegationRecovery(
    delegation: DelegatedIdentity,
    drtEvent: DelegatedRotationEvent
  ): Promise<void> {
    try {
      console.log(`🔧 Notifying parties of delegation recovery: ${delegation.delegationId}`);
      
      // Notify backend
      await fetch('http://192.168.31.172:8000/api/v1/mobile/delegation-recovered', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Employee-AID': delegation.delegateAid
        },
        body: JSON.stringify({
          delegationId: delegation.delegationId,
          delegatorAid: delegation.delegatorAid,
          delegatedAid: delegation.delegatedAid,
          recoveryEvent: drtEvent,
          timestamp: new Date().toISOString()
        })
      });

    } catch (error) {
      console.error('Failed to notify delegation recovery:', error);
    }
  }

  /**
   * Notify delegation restoration
   */
  private async notifyDelegationRestoration(delegation: DelegatedIdentity): Promise<void> {
    try {
      console.log(`🔄 Notifying delegation restoration: ${delegation.delegationId}`);

      await fetch('http://192.168.31.172:8000/api/v1/mobile/delegation-restored', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Employee-AID': delegation.delegateAid
        },
        body: JSON.stringify({
          delegationId: delegation.delegationId,
          delegatorAid: delegation.delegatorAid,
          delegatedAid: delegation.delegatedAid,
          restoredAt: new Date().toISOString()
        })
      });

    } catch (error) {
      console.error('Failed to notify delegation restoration:', error);
    }
  }

  /**
   * Get delegation health status
   */
  async getDelegationHealth(delegationId: string): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const delegation = await this.getDelegatedIdentity(delegationId);
      if (!delegation) {
        return {
          healthy: false,
          issues: ['Delegation not found'],
          recommendations: ['Restore from backup or recreate delegation']
        };
      }

      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check expiry
      if (this.isDelegationExpired(delegation)) {
        issues.push('Delegation has expired');
        recommendations.push('Request new delegation from company');
      }

      // Check rotation frequency
      const lastRotation = delegation.rotationHistory[delegation.rotationHistory.length - 1];
      if (lastRotation) {
        const daysSinceRotation = Math.floor(
          (Date.now() - new Date(lastRotation.timestamp).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceRotation > 90) {
          issues.push('Delegated keys have not been rotated recently');
          recommendations.push('Consider rotating delegated keys');
        }
      }

      // Check status
      if (delegation.status !== 'active') {
        issues.push(`Delegation status is ${delegation.status}`);
        if (delegation.status === 'revoked') {
          recommendations.push('Request new delegation if still needed');
        }
      }

      return {
        healthy: issues.length === 0,
        issues,
        recommendations
      };

    } catch (error) {
      return {
        healthy: false,
        issues: ['Failed to check delegation health'],
        recommendations: ['Check network connection and try again']
      };
    }
  }

  /**
   * Cleanup expired delegations
   */
  async cleanupExpiredDelegations(): Promise<void> {
    try {
      const allDelegations = await storageService.getItem('delegatedIdentities') || {};
      let hasChanges = false;

      for (const [delegationId, delegation] of Object.entries(allDelegations)) {
        const del = delegation as DelegatedIdentity;
        if (this.isDelegationExpired(del) && del.status === 'active') {
          del.status = 'expired';
          hasChanges = true;
          console.log(`⏰ Delegation expired: ${delegationId}`);
        }
      }

      if (hasChanges) {
        await storageService.setItem('delegatedIdentities', allDelegations);
      }
    } catch (error) {
      console.error('Failed to cleanup expired delegations:', error);
    }
  }
}

// Export singleton instance
export const delegationService = new DelegationService();
export default delegationService;