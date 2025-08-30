import QRCode from 'qrcode';
import { signifyService } from './signifyService';
import { storageService } from './storage';
import { realEncryptionService } from './realEncryptionService';

export interface OOBIData {
  aid: string;
  ed25519PublicKey: string;
  x25519PublicKey: string;
  witnessEndpoints: string[];
  keriaEndpoint: string;
  employeeInfo?: {
    name: string;
    department: string;
    company: string;
  };
  metadata: {
    version: string;
    type: 'employee_oobi';
    timestamp: string;
    expires?: string;
  };
}

export interface QRCodeResult {
  qrCodeDataUrl: string;
  oobiData: OOBIData;
  rawOobi: string;
  shareableUrl: string;
}

class QRCodeService {
  
  /**
   * Generate QR code containing employee's OOBI information
   */
  async generateEmployeeOOBIQR(): Promise<QRCodeResult> {
    try {
      console.log('📱 Generating employee OOBI QR code...');
      
      // Get current employee data and KERI info
      const employeeData = await storageService.getEmployeeData();
      if (!employeeData?.aid) {
        throw new Error('No employee AID found - cannot generate OOBI');
      }

      // Get current OOBI from SignifyTS
      const client = await signifyService.getClient();
      const identifierName = `${signifyService.getAgentName()}-${employeeData.employee_id}`;
      
      const oobiResponse = await client.oobis().get(identifierName);
      const rawOobi = oobiResponse.oobis[0] || `${signifyService.getKeriaAdminUrl()}/oobi/${employeeData.aid}`;

      // Get employee's current encryption keys
      const encryptionKeys = await realEncryptionService.generateKeyPair();
      
      // Create comprehensive OOBI data
      const oobiData: OOBIData = {
        aid: employeeData.aid,
        ed25519PublicKey: await this.getEd25519PublicKey(employeeData.aid),
        x25519PublicKey: encryptionKeys.publicKey,
        witnessEndpoints: [
          'http://192.168.31.172:5632',
          'http://192.168.31.172:5633',
          'http://192.168.31.172:5634',
          'http://192.168.31.172:5635',
          'http://192.168.31.172:5636'
        ],
        keriaEndpoint: signifyService.getKeriaAdminUrl(),
        employeeInfo: {
          name: employeeData.full_name || 'Employee',
          department: employeeData.department || 'Unknown',
          company: 'Travlr-ID Employee'
        },
        metadata: {
          version: '1.0',
          type: 'employee_oobi',
          timestamp: new Date().toISOString(),
          expires: this.calculateExpiryDate()
        }
      };

      // Create shareable URL format
      const shareableUrl = this.createShareableOOBIUrl(oobiData);

      // Generate QR code with the shareable URL
      const qrCodeDataUrl = await QRCode.toDataURL(shareableUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });

      console.log('✅ Employee OOBI QR code generated successfully');
      
      return {
        qrCodeDataUrl,
        oobiData,
        rawOobi,
        shareableUrl
      };

    } catch (error) {
      console.error('❌ Failed to generate OOBI QR code:', error);
      throw new Error(`OOBI QR generation failed: ${error.message}`);
    }
  }

  /**
   * Generate QR code for specific context card sharing
   */
  async generateContextCardQR(contextCardId: string, companyAid: string): Promise<QRCodeResult> {
    try {
      console.log(`📋 Generating context card QR for company: ${companyAid.substring(0, 8)}...`);
      
      const employeeData = await storageService.getEmployeeData();
      if (!employeeData?.aid) {
        throw new Error('No employee AID found');
      }

      // Create context-specific OOBI
      const contextOobiData: OOBIData = {
        aid: employeeData.aid,
        ed25519PublicKey: await this.getEd25519PublicKey(employeeData.aid),
        x25519PublicKey: (await realEncryptionService.generateKeyPair()).publicKey,
        witnessEndpoints: [
          'http://192.168.31.172:5632',
          'http://192.168.31.172:5633',
          'http://192.168.31.172:5634'
        ],
        keriaEndpoint: signifyService.getKeriaAdminUrl(),
        employeeInfo: {
          name: employeeData.full_name || 'Employee',
          department: employeeData.department || 'Unknown',
          company: 'Travlr-ID Employee'
        },
        metadata: {
          version: '1.0',
          type: 'employee_oobi',
          timestamp: new Date().toISOString(),
          expires: this.calculateExpiryDate(24) // Context cards expire in 24 hours
        }
      };

      // Add context card reference
      const contextShareUrl = this.createContextCardShareUrl(contextOobiData, contextCardId, companyAid);

      const qrCodeDataUrl = await QRCode.toDataURL(contextShareUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1976d2',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });

      return {
        qrCodeDataUrl,
        oobiData: contextOobiData,
        rawOobi: contextShareUrl,
        shareableUrl: contextShareUrl
      };

    } catch (error) {
      console.error('❌ Failed to generate context card QR:', error);
      throw new Error(`Context card QR generation failed: ${error.message}`);
    }
  }

  /**
   * Parse OOBI from QR code data
   */
  async parseOOBIFromQR(qrData: string): Promise<OOBIData | null> {
    try {
      console.log('🔍 Parsing OOBI from QR code...');
      
      // Handle different OOBI formats
      if (qrData.startsWith('travlr-oobi://')) {
        return this.parseShareableOOBIUrl(qrData);
      } else if (qrData.startsWith('http')) {
        // Direct OOBI URL
        return await this.resolveOOBIFromUrl(qrData);
      } else {
        // Try parsing as JSON
        try {
          const parsed = JSON.parse(qrData);
          if (parsed.aid && parsed.metadata?.type === 'employee_oobi') {
            return parsed as OOBIData;
          }
        } catch (e) {
          // Not JSON, continue to other formats
        }
      }

      console.warn('⚠️ Unrecognized OOBI format in QR code');
      return null;

    } catch (error) {
      console.error('❌ Failed to parse OOBI from QR:', error);
      return null;
    }
  }

  /**
   * Get Ed25519 public key from AID
   */
  private async getEd25519PublicKey(aid: string): Promise<string> {
    try {
      // In a full implementation, this would extract the public key from the AID
      // For now, we'll use a placeholder that represents the concept
      const client = await signifyService.getClient();
      const employeeData = await storageService.getEmployeeData();
      const identifierName = `${signifyService.getAgentName()}-${employeeData?.employee_id}`;
      
      const identifier = await client.identifiers().get(identifierName);
      
      // Extract current public key from identifier state
      const currentKeys = identifier.state.k || [];
      return currentKeys[0] || aid; // Fallback to AID if no keys found
      
    } catch (error) {
      console.warn('Could not extract Ed25519 public key, using AID as fallback');
      return aid;
    }
  }

  /**
   * Create shareable OOBI URL format
   */
  private createShareableOOBIUrl(oobiData: OOBIData): string {
    const encodedData = btoa(JSON.stringify({
      aid: oobiData.aid,
      ed25519: oobiData.ed25519PublicKey,
      x25519: oobiData.x25519PublicKey,
      witnesses: oobiData.witnessEndpoints,
      keria: oobiData.keriaEndpoint,
      info: oobiData.employeeInfo,
      meta: oobiData.metadata
    }));

    return `travlr-oobi://${encodedData}`;
  }

  /**
   * Create context card share URL
   */
  private createContextCardShareUrl(oobiData: OOBIData, contextCardId: string, companyAid: string): string {
    const encodedData = btoa(JSON.stringify({
      ...oobiData,
      contextCard: contextCardId,
      targetCompany: companyAid,
      shareType: 'context_card'
    }));

    return `travlr-context://${encodedData}`;
  }

  /**
   * Parse shareable OOBI URL
   */
  private parseShareableOOBIUrl(url: string): OOBIData | null {
    try {
      const encodedData = url.replace('travlr-oobi://', '');
      const decodedData = JSON.parse(atob(encodedData));
      
      return {
        aid: decodedData.aid,
        ed25519PublicKey: decodedData.ed25519,
        x25519PublicKey: decodedData.x25519,
        witnessEndpoints: decodedData.witnesses,
        keriaEndpoint: decodedData.keria,
        employeeInfo: decodedData.info,
        metadata: decodedData.meta
      };
    } catch (error) {
      console.error('Failed to parse shareable OOBI URL:', error);
      return null;
    }
  }

  /**
   * Resolve OOBI from URL
   */
  private async resolveOOBIFromUrl(url: string): Promise<OOBIData | null> {
    try {
      // This would typically make an HTTP request to resolve the OOBI
      // For now, we'll return null and handle this in a future implementation
      console.log(`Would resolve OOBI from URL: ${url}`);
      return null;
    } catch (error) {
      console.error('Failed to resolve OOBI from URL:', error);
      return null;
    }
  }

  /**
   * Calculate expiry date for OOBI
   */
  private calculateExpiryDate(hours: number = 168): string { // Default 7 days
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + hours);
    return expiry.toISOString();
  }

  /**
   * Validate OOBI data
   */
  validateOOBIData(oobiData: OOBIData): boolean {
    try {
      // Check required fields
      if (!oobiData.aid || !oobiData.ed25519PublicKey || !oobiData.x25519PublicKey) {
        return false;
      }

      // Check AID format (should start with 'E' and be 44 chars)
      if (!oobiData.aid.startsWith('E') || oobiData.aid.length !== 44) {
        return false;
      }

      // Check expiry
      if (oobiData.metadata.expires) {
        const expiry = new Date(oobiData.metadata.expires);
        if (expiry < new Date()) {
          return false; // Expired
        }
      }

      return true;
    } catch (error) {
      console.error('OOBI validation failed:', error);
      return false;
    }
  }

  /**
   * Generate business card style QR with employee info
   */
  async generateBusinessCardQR(): Promise<{
    qrCodeDataUrl: string;
    businessCardData: any;
  }> {
    try {
      const employeeData = await storageService.getEmployeeData();
      if (!employeeData) {
        throw new Error('No employee data found');
      }

      const businessCardData = {
        type: 'travlr_business_card',
        employee: {
          name: employeeData.full_name,
          department: employeeData.department,
          company: 'Travlr-ID Employee',
          aid: employeeData.aid
        },
        contact: {
          oobi: employeeData.oobi,
          keria: signifyService.getKeriaAdminUrl()
        },
        timestamp: new Date().toISOString()
      };

      const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(businessCardData), {
        width: 200,
        margin: 1,
        color: {
          dark: '#2e7d32',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });

      return {
        qrCodeDataUrl,
        businessCardData
      };

    } catch (error) {
      console.error('Failed to generate business card QR:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const qrCodeService = new QRCodeService();
export default qrCodeService;