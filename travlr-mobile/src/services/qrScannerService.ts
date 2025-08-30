import { Camera } from 'expo-camera';
import { qrCodeService, OOBIData } from './qrCodeService';
import { storageService } from './storage';

export interface CompanyOOBI {
  companyAid: string;
  companyName: string;
  ed25519PublicKey: string;
  x25519PublicKey: string;
  witnessEndpoints: string[];
  keriaEndpoint: string;
  requestedFields?: string[];
  purpose?: string;
  validUntil?: string;
  metadata: {
    type: 'company_oobi';
    version: string;
    timestamp: string;
  };
}

export interface ScanResult {
  success: boolean;
  type: 'employee_oobi' | 'company_oobi' | 'context_request' | 'unknown';
  data?: OOBIData | CompanyOOBI | any;
  error?: string;
}

class QRScannerService {
  private scannerActive = false;

  /**
   * Initialize camera permissions
   */
  async initializeCamera(): Promise<boolean> {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        console.error('❌ Camera permission not granted');
        return false;
      }

      console.log('✅ Camera permissions granted');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize camera:', error);
      return false;
    }
  }

  /**
   * Scan QR code and parse OOBI data
   */
  async scanQRCode(qrData: string): Promise<ScanResult> {
    if (this.scannerActive) {
      return {
        success: false,
        type: 'unknown',
        error: 'Scanner already active'
      };
    }

    this.scannerActive = true;

    try {
      console.log('🔍 Processing scanned QR code...');
      
      // Determine QR code type and parse accordingly
      const result = await this.parseQRData(qrData);
      
      if (result.success && result.data) {
        // Store successful scan for history
        await this.storeScanHistory(result);
      }

      return result;

    } catch (error) {
      console.error('❌ QR scan processing failed:', error);
      return {
        success: false,
        type: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown scan error'
      };
    } finally {
      this.scannerActive = false;
    }
  }

  /**
   * Parse different types of QR data
   */
  private async parseQRData(qrData: string): Promise<ScanResult> {
    try {
      // Handle Travlr-ID employee OOBI
      if (qrData.startsWith('travlr-oobi://')) {
        return await this.parseEmployeeOOBI(qrData);
      }

      // Handle Travlr-ID context card sharing
      if (qrData.startsWith('travlr-context://')) {
        return await this.parseContextCardRequest(qrData);
      }

      // Handle company OOBI (custom format)
      if (qrData.startsWith('company-oobi://')) {
        return await this.parseCompanyOOBI(qrData);
      }

      // Handle standard KERI OOBI URLs
      if (qrData.startsWith('http') && qrData.includes('/oobi/')) {
        return await this.parseStandardOOBI(qrData);
      }

      // Try parsing as JSON
      try {
        const jsonData = JSON.parse(qrData);
        return await this.parseJSONData(jsonData);
      } catch (e) {
        // Not JSON, continue
      }

      // Unknown format
      console.warn('⚠️ Unknown QR code format:', qrData.substring(0, 50));
      return {
        success: false,
        type: 'unknown',
        error: 'Unrecognized QR code format'
      };

    } catch (error) {
      console.error('❌ Failed to parse QR data:', error);
      return {
        success: false,
        type: 'unknown',
        error: 'Failed to parse QR code data'
      };
    }
  }

  /**
   * Parse employee OOBI from Travlr format
   */
  private async parseEmployeeOOBI(qrData: string): Promise<ScanResult> {
    try {
      const oobiData = await qrCodeService.parseOOBIFromQR(qrData);
      
      if (!oobiData) {
        return {
          success: false,
          type: 'employee_oobi',
          error: 'Invalid employee OOBI data'
        };
      }

      // Validate OOBI
      if (!qrCodeService.validateOOBIData(oobiData)) {
        return {
          success: false,
          type: 'employee_oobi',
          error: 'OOBI validation failed or expired'
        };
      }

      console.log(`✅ Successfully parsed employee OOBI for: ${oobiData.employeeInfo?.name}`);
      
      return {
        success: true,
        type: 'employee_oobi',
        data: oobiData
      };

    } catch (error) {
      return {
        success: false,
        type: 'employee_oobi',
        error: `Failed to parse employee OOBI: ${error.message}`
      };
    }
  }

  /**
   * Parse company OOBI and data request
   */
  private async parseCompanyOOBI(qrData: string): Promise<ScanResult> {
    try {
      const encodedData = qrData.replace('company-oobi://', '');
      const decodedData = JSON.parse(atob(encodedData));
      
      const companyOobi: CompanyOOBI = {
        companyAid: decodedData.aid,
        companyName: decodedData.name || 'Unknown Company',
        ed25519PublicKey: decodedData.ed25519,
        x25519PublicKey: decodedData.x25519,
        witnessEndpoints: decodedData.witnesses || [],
        keriaEndpoint: decodedData.keria,
        requestedFields: decodedData.requestedFields || [],
        purpose: decodedData.purpose || 'Data request',
        validUntil: decodedData.validUntil,
        metadata: {
          type: 'company_oobi',
          version: decodedData.version || '1.0',
          timestamp: decodedData.timestamp || new Date().toISOString()
        }
      };

      // Validate company OOBI
      if (!this.validateCompanyOOBI(companyOobi)) {
        return {
          success: false,
          type: 'company_oobi',
          error: 'Invalid or expired company OOBI'
        };
      }

      console.log(`✅ Successfully parsed company OOBI: ${companyOobi.companyName}`);
      
      return {
        success: true,
        type: 'company_oobi',
        data: companyOobi
      };

    } catch (error) {
      return {
        success: false,
        type: 'company_oobi',
        error: `Failed to parse company OOBI: ${error.message}`
      };
    }
  }

  /**
   * Parse context card request
   */
  private async parseContextCardRequest(qrData: string): Promise<ScanResult> {
    try {
      const encodedData = qrData.replace('travlr-context://', '');
      const decodedData = JSON.parse(atob(encodedData));
      
      console.log(`✅ Context card request from: ${decodedData.targetCompany}`);
      
      return {
        success: true,
        type: 'context_request',
        data: decodedData
      };

    } catch (error) {
      return {
        success: false,
        type: 'context_request',
        error: `Failed to parse context request: ${error.message}`
      };
    }
  }

  /**
   * Parse standard KERI OOBI URL
   */
  private async parseStandardOOBI(url: string): Promise<ScanResult> {
    try {
      // Extract AID from OOBI URL
      const aidMatch = url.match(/\/oobi\/([A-Za-z0-9_-]+)/);
      if (!aidMatch) {
        return {
          success: false,
          type: 'unknown',
          error: 'Could not extract AID from OOBI URL'
        };
      }

      const aid = aidMatch[1];
      
      // This would typically resolve the OOBI by making an HTTP request
      // For now, we'll create a basic OOBI structure
      const basicOobi: OOBIData = {
        aid,
        ed25519PublicKey: '', // Would be resolved from the URL
        x25519PublicKey: '', // Would be resolved from the URL
        witnessEndpoints: [],
        keriaEndpoint: url.split('/oobi/')[0],
        metadata: {
          version: '1.0',
          type: 'employee_oobi',
          timestamp: new Date().toISOString()
        }
      };

      console.log(`✅ Parsed standard OOBI for AID: ${aid.substring(0, 8)}...`);
      
      return {
        success: true,
        type: 'employee_oobi',
        data: basicOobi
      };

    } catch (error) {
      return {
        success: false,
        type: 'unknown',
        error: `Failed to parse standard OOBI: ${error.message}`
      };
    }
  }

  /**
   * Parse JSON QR code data
   */
  private async parseJSONData(jsonData: any): Promise<ScanResult> {
    try {
      // Check for business card format
      if (jsonData.type === 'travlr_business_card') {
        return {
          success: true,
          type: 'employee_oobi',
          data: {
            aid: jsonData.employee.aid,
            ed25519PublicKey: '',
            x25519PublicKey: '',
            witnessEndpoints: [],
            keriaEndpoint: jsonData.contact.keria,
            employeeInfo: {
              name: jsonData.employee.name,
              department: jsonData.employee.department,
              company: jsonData.employee.company
            },
            metadata: {
              version: '1.0',
              type: 'employee_oobi',
              timestamp: jsonData.timestamp
            }
          }
        };
      }

      // Check for direct OOBI data
      if (jsonData.aid && jsonData.metadata?.type) {
        return {
          success: true,
          type: jsonData.metadata.type,
          data: jsonData
        };
      }

      return {
        success: false,
        type: 'unknown',
        error: 'Unrecognized JSON format'
      };

    } catch (error) {
      return {
        success: false,
        type: 'unknown',
        error: `Failed to parse JSON data: ${error.message}`
      };
    }
  }

  /**
   * Validate company OOBI data
   */
  private validateCompanyOOBI(companyOobi: CompanyOOBI): boolean {
    try {
      // Check required fields
      if (!companyOobi.companyAid || !companyOobi.companyName) {
        return false;
      }

      // Check AID format
      if (!companyOobi.companyAid.startsWith('E') || companyOobi.companyAid.length !== 44) {
        return false;
      }

      // Check expiry
      if (companyOobi.validUntil) {
        const expiry = new Date(companyOobi.validUntil);
        if (expiry < new Date()) {
          return false; // Expired
        }
      }

      return true;
    } catch (error) {
      console.error('Company OOBI validation failed:', error);
      return false;
    }
  }

  /**
   * Store scan history for user reference
   */
  private async storeScanHistory(result: ScanResult): Promise<void> {
    try {
      const scanHistory = await storageService.getItem('qrScanHistory') || [];
      
      const historyEntry = {
        id: `scan_${Date.now()}`,
        type: result.type,
        timestamp: new Date().toISOString(),
        data: result.data,
        success: result.success
      };

      scanHistory.unshift(historyEntry); // Add to beginning
      
      // Keep only last 20 scans
      if (scanHistory.length > 20) {
        scanHistory.splice(20);
      }

      await storageService.setItem('qrScanHistory', scanHistory);
      console.log('📝 QR scan stored in history');
      
    } catch (error) {
      console.error('Failed to store scan history:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Get scan history
   */
  async getScanHistory(): Promise<any[]> {
    try {
      return await storageService.getItem('qrScanHistory') || [];
    } catch (error) {
      console.error('Failed to get scan history:', error);
      return [];
    }
  }

  /**
   * Clear scan history
   */
  async clearScanHistory(): Promise<void> {
    try {
      await storageService.setItem('qrScanHistory', []);
      console.log('🗑️ QR scan history cleared');
    } catch (error) {
      console.error('Failed to clear scan history:', error);
      throw error;
    }
  }

  /**
   * Handle company data request from scanned QR
   */
  async handleCompanyDataRequest(companyOobi: CompanyOOBI): Promise<{
    success: boolean;
    message: string;
    contextCardId?: string;
  }> {
    try {
      console.log(`🏢 Processing data request from: ${companyOobi.companyName}`);
      
      // This would trigger the consent flow and context card creation
      // For now, we'll return a placeholder response
      
      return {
        success: true,
        message: `Data request from ${companyOobi.companyName} processed. Review consent options to share your travel preferences.`,
        contextCardId: `context_${Date.now()}`
      };

    } catch (error) {
      console.error('Failed to handle company data request:', error);
      return {
        success: false,
        message: 'Failed to process company data request'
      };
    }
  }

  /**
   * Get camera status
   */
  async getCameraStatus(): Promise<{
    hasPermission: boolean;
    isAvailable: boolean;
  }> {
    try {
      const { status } = await Camera.getCameraPermissionsAsync();
      const hasPermission = status === 'granted';
      const isAvailable = await Camera.isAvailableAsync();

      return {
        hasPermission,
        isAvailable
      };
    } catch (error) {
      console.error('Failed to get camera status:', error);
      return {
        hasPermission: false,
        isAvailable: false
      };
    }
  }
}

// Export singleton instance
export const qrScannerService = new QRScannerService();
export default qrScannerService;