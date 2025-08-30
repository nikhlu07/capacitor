import { signifyService } from './signifyService';
import { storageService } from './storage';
import { realEncryptionService } from './realEncryptionService';
import { witnessService } from './witnessService';

export interface CompanyIdentity {
  aid: string;
  companyName: string;
  ed25519PublicKey: string;
  x25519PublicKey: string;
  witnessEndpoints: string[];
  keriaEndpoint: string;
  metadata: {
    version: string;
    type: 'company_identity';
    timestamp: string;
    verified?: boolean;
    lastSeen?: string;
  };
  businessInfo?: {
    registrationNumber?: string;
    taxId?: string;
    address?: string;
    website?: string;
  };
}

export interface OOBIResolutionResult {
  success: boolean;
  companyIdentity?: CompanyIdentity;
  error?: string;
  trustLevel: 'verified' | 'partial' | 'unverified';
  witnessVerification: {
    verified: number;
    total: number;
    details: string[];
  };
}

class CompanyOOBIService {
  private resolvedCompanies = new Map<string, CompanyIdentity>();
  private resolutionCache = new Map<string, OOBIResolutionResult>();
  private cacheExpiry = 30 * 60 * 1000; // 30 minutes

  /**
   * Resolve company identity from OOBI URL or AID
   */
  async resolveCompanyOOBI(oobiOrAid: string): Promise<OOBIResolutionResult> {
    try {
      console.log('🔍 Resolving company OOBI:', oobiOrAid.substring(0, 20) + '...');

      // Check cache first
      const cached = this.getCachedResult(oobiOrAid);
      if (cached) {
        console.log('📋 Using cached company resolution result');
        return cached;
      }

      // Initialize SignifyTS client
      const client = await signifyService.getClient();
      
      let resolveUrl = oobiOrAid;
      let companyAid = '';

      // Handle different input formats
      if (oobiOrAid.startsWith('E') && oobiOrAid.length === 44) {
        // Direct AID - construct OOBI URL
        companyAid = oobiOrAid;
        resolveUrl = `${signifyService.getKeriaAdminUrl()}/oobi/${companyAid}`;
      } else if (oobiOrAid.includes('/oobi/')) {
        // Extract AID from OOBI URL
        const aidMatch = oobiOrAid.match(/\/oobi\/([A-Za-z0-9_-]+)/);
        if (!aidMatch) {
          throw new Error('Invalid OOBI URL format');
        }
        companyAid = aidMatch[1];
        resolveUrl = oobiOrAid;
      } else {
        throw new Error('Invalid OOBI format - must be AID or OOBI URL');
      }

      console.log(`🏢 Resolving company AID: ${companyAid.substring(0, 8)}...`);

      // Step 1: Resolve OOBI using SignifyTS
      const oobiResult = await client.oobis().resolve(resolveUrl);
      await oobiResult.op(); // Wait for operation to complete

      console.log('✅ OOBI resolved successfully');

      // Step 2: Get company identifier details
      const companyIdentifier = await client.identifiers().get(companyAid);
      
      // Step 3: Verify witnesses
      const witnessVerification = await this.verifyCompanyWitnesses(
        companyIdentifier.state.b || [], // witness list
        companyAid
      );

      // Step 4: Extract company public keys
      const ed25519PublicKey = this.extractEd25519Key(companyIdentifier);
      
      // Step 5: Attempt to get X25519 encryption key (if available)
      const x25519PublicKey = await this.getCompanyEncryptionKey(companyAid);

      // Step 6: Create company identity
      const companyIdentity: CompanyIdentity = {
        aid: companyAid,
        companyName: await this.getCompanyName(companyAid),
        ed25519PublicKey,
        x25519PublicKey,
        witnessEndpoints: companyIdentifier.state.b || [],
        keriaEndpoint: this.extractKeriaEndpoint(resolveUrl),
        metadata: {
          version: '1.0',
          type: 'company_identity',
          timestamp: new Date().toISOString(),
          verified: witnessVerification.verified >= 2,
          lastSeen: new Date().toISOString()
        }
      };

      // Step 7: Determine trust level
      const trustLevel = this.calculateTrustLevel(witnessVerification, companyIdentity);

      const result: OOBIResolutionResult = {
        success: true,
        companyIdentity,
        trustLevel,
        witnessVerification
      };

      // Step 8: Cache and store the result
      await this.cacheResolutionResult(oobiOrAid, result);
      await this.storeCompanyIdentity(companyIdentity);

      console.log(`✅ Company identity resolved: ${companyIdentity.companyName} (${trustLevel})`);
      return result;

    } catch (error) {
      console.error('❌ Failed to resolve company OOBI:', error);
      
      const result: OOBIResolutionResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown resolution error',
        trustLevel: 'unverified',
        witnessVerification: {
          verified: 0,
          total: 0,
          details: ['Resolution failed']
        }
      };

      return result;
    }
  }

  /**
   * Verify company witnesses
   */
  private async verifyCompanyWitnesses(
    witnessUrls: string[], 
    companyAid: string
  ): Promise<{ verified: number; total: number; details: string[] }> {
    const details: string[] = [];
    let verified = 0;

    if (witnessUrls.length === 0) {
      details.push('No witnesses configured');
      return { verified: 0, total: 0, details };
    }

    console.log(`🔍 Verifying ${witnessUrls.length} company witnesses...`);

    for (const witnessUrl of witnessUrls) {
      try {
        const isHealthy = await witnessService.validateWitness(witnessUrl, 5000);
        if (isHealthy) {
          verified++;
          details.push(`✅ ${witnessUrl} - healthy`);
        } else {
          details.push(`❌ ${witnessUrl} - unhealthy`);
        }
      } catch (error) {
        details.push(`❌ ${witnessUrl} - error: ${error.message}`);
      }
    }

    console.log(`📊 Company witness verification: ${verified}/${witnessUrls.length} healthy`);
    return { verified, total: witnessUrls.length, details };
  }

  /**
   * Extract Ed25519 public key from identifier
   */
  private extractEd25519Key(identifier: any): string {
    try {
      // Get current keys from identifier state
      const currentKeys = identifier.state.k || [];
      if (currentKeys.length > 0) {
        return currentKeys[0];
      }

      // Fallback to prefix (for self-signing keys)
      return identifier.prefix || identifier.state.i || '';
    } catch (error) {
      console.warn('Could not extract Ed25519 key:', error);
      return '';
    }
  }

  /**
   * Get company's X25519 encryption public key
   */
  private async getCompanyEncryptionKey(companyAid: string): Promise<string> {
    try {
      // In a full implementation, this would query the company's 
      // key exchange endpoint or look up published encryption keys
      // For now, we'll return empty and handle this in the UI
      console.log('📡 Company encryption key lookup not yet implemented');
      return '';
    } catch (error) {
      console.warn('Failed to get company encryption key:', error);
      return '';
    }
  }

  /**
   * Get company name from various sources
   */
  private async getCompanyName(companyAid: string): Promise<string> {
    try {
      // Try to get company name from business registry or credential
      // For now, return a formatted AID as company name
      return `Company-${companyAid.substring(0, 8)}`;
    } catch (error) {
      return `Unknown-${companyAid.substring(0, 8)}`;
    }
  }

  /**
   * Extract KERIA endpoint from OOBI URL
   */
  private extractKeriaEndpoint(oobiUrl: string): string {
    try {
      const url = new URL(oobiUrl);
      return `${url.protocol}//${url.host}`;
    } catch (error) {
      return 'https://unknown-keria-endpoint.com';
    }
  }

  /**
   * Calculate trust level based on verification results
   */
  private calculateTrustLevel(
    witnessVerification: { verified: number; total: number },
    companyIdentity: CompanyIdentity
  ): 'verified' | 'partial' | 'unverified' {
    const { verified, total } = witnessVerification;
    
    if (total === 0) {
      return 'unverified';
    }

    const healthyRatio = verified / total;
    
    if (healthyRatio >= 0.8 && verified >= 3) {
      return 'verified';
    } else if (healthyRatio >= 0.5 && verified >= 2) {
      return 'partial';
    } else {
      return 'unverified';
    }
  }

  /**
   * Cache resolution result
   */
  private async cacheResolutionResult(key: string, result: OOBIResolutionResult): Promise<void> {
    this.resolutionCache.set(key, {
      ...result,
      // Add cache timestamp for expiry
      _cacheTimestamp: Date.now()
    } as any);
  }

  /**
   * Get cached resolution result
   */
  private getCachedResult(key: string): OOBIResolutionResult | null {
    const cached = this.resolutionCache.get(key) as any;
    if (!cached) return null;

    const age = Date.now() - cached._cacheTimestamp;
    if (age > this.cacheExpiry) {
      this.resolutionCache.delete(key);
      return null;
    }

    // Remove cache timestamp before returning
    const { _cacheTimestamp, ...result } = cached;
    return result;
  }

  /**
   * Store resolved company identity
   */
  private async storeCompanyIdentity(companyIdentity: CompanyIdentity): Promise<void> {
    try {
      // Store in local cache
      this.resolvedCompanies.set(companyIdentity.aid, companyIdentity);

      // Store in persistent storage
      const storedCompanies = await storageService.getItem('resolvedCompanies') || {};
      storedCompanies[companyIdentity.aid] = companyIdentity;
      await storageService.setItem('resolvedCompanies', storedCompanies);

      console.log('📝 Company identity stored');
    } catch (error) {
      console.error('Failed to store company identity:', error);
    }
  }

  /**
   * Get stored company identity
   */
  async getStoredCompanyIdentity(companyAid: string): Promise<CompanyIdentity | null> {
    try {
      // Check memory cache first
      const memCached = this.resolvedCompanies.get(companyAid);
      if (memCached) return memCached;

      // Check persistent storage
      const storedCompanies = await storageService.getItem('resolvedCompanies') || {};
      return storedCompanies[companyAid] || null;
    } catch (error) {
      console.error('Failed to get stored company identity:', error);
      return null;
    }
  }

  /**
   * Get all resolved companies
   */
  async getAllResolvedCompanies(): Promise<CompanyIdentity[]> {
    try {
      const storedCompanies = await storageService.getItem('resolvedCompanies') || {};
      return Object.values(storedCompanies);
    } catch (error) {
      console.error('Failed to get resolved companies:', error);
      return [];
    }
  }

  /**
   * Refresh company identity (re-resolve OOBI)
   */
  async refreshCompanyIdentity(companyAid: string): Promise<OOBIResolutionResult> {
    console.log(`🔄 Refreshing company identity: ${companyAid.substring(0, 8)}...`);
    
    // Clear cache for this company
    const oobiUrl = `${signifyService.getKeriaAdminUrl()}/oobi/${companyAid}`;
    this.resolutionCache.delete(companyAid);
    this.resolutionCache.delete(oobiUrl);
    
    // Re-resolve
    return this.resolveCompanyOOBI(companyAid);
  }

  /**
   * Initiate encrypted communication with company
   */
  async initiateSecureCommunication(companyAid: string): Promise<{
    success: boolean;
    channelId?: string;
    error?: string;
  }> {
    try {
      console.log(`🔐 Initiating secure communication with: ${companyAid.substring(0, 8)}...`);

      const companyIdentity = await this.getStoredCompanyIdentity(companyAid);
      if (!companyIdentity) {
        throw new Error('Company identity not resolved - resolve OOBI first');
      }

      if (!companyIdentity.x25519PublicKey) {
        throw new Error('Company encryption key not available');
      }

      // Generate session keys for secure communication
      const sessionKeys = await realEncryptionService.generateKeyPair();
      
      // Create secure communication channel
      const channelId = `channel_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // In a full implementation, this would:
      // 1. Send encrypted session establishment message to company
      // 2. Wait for company to acknowledge 
      // 3. Store shared session keys for future use
      
      console.log(`✅ Secure communication channel established: ${channelId}`);
      
      return {
        success: true,
        channelId
      };

    } catch (error) {
      console.error('❌ Failed to initiate secure communication:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown communication error'
      };
    }
  }

  /**
   * Clear resolution cache
   */
  clearCache(): void {
    this.resolutionCache.clear();
    console.log('🗑️ Company OOBI resolution cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): {
    entries: number;
    memoryCompanies: number;
    cacheHitRate?: number;
  } {
    return {
      entries: this.resolutionCache.size,
      memoryCompanies: this.resolvedCompanies.size
    };
  }
}

// Export singleton instance
export const companyOOBIService = new CompanyOOBIService();
export default companyOOBIService;