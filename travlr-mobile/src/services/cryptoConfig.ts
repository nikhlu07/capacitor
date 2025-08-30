import { randomBytes } from 'crypto';
import 'react-native-get-random-values';

// Crypto configuration for KERI operations
export class CryptoConfig {
  private static instance: CryptoConfig;
  private _bran: string | null = null;
  private _initialized: boolean = false;

  private constructor() {}

  public static getInstance(): CryptoConfig {
    if (!CryptoConfig.instance) {
      CryptoConfig.instance = new CryptoConfig();
    }
    return CryptoConfig.instance;
  }

  // Generate cryptographically secure bran/passcode
  public generateSecureBran(): string {
    // Generate 64 bytes (512 bits) of entropy
    const entropy = randomBytes(64);
    
    // Convert to base64 and make it URL-safe
    const base64 = entropy.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    // Create a structured bran with metadata
    const timestamp = Date.now();
    const version = 'v2';
    const purpose = 'keri-signing';
    
    // Combine components - final length ~120+ chars
    const secureBran = `${purpose}-${version}-${timestamp}-${base64}`;
    
    console.log('✅ Generated secure bran (length:', secureBran.length, ')');
    return secureBran;
  }

  // Initialize with secure bran
  public async initialize(customBran?: string): Promise<void> {
    if (this._initialized && this._bran) {
      return;
    }

    try {
      if (customBran) {
        // Validate custom bran
        if (customBran.length < 64) {
          throw new Error('Custom bran must be at least 64 characters for security');
        }
        this._bran = customBran;
      } else {
        // Generate new secure bran
        this._bran = this.generateSecureBran();
      }

      this._initialized = true;
      console.log('✅ Crypto config initialized with secure bran');
    } catch (error) {
      console.error('❌ Failed to initialize crypto config:', error);
      throw new Error('Crypto configuration initialization failed');
    }
  }

  // Get current bran (requires initialization)
  public getBran(): string {
    if (!this._initialized || !this._bran) {
      throw new Error('Crypto config not initialized - call initialize() first');
    }
    return this._bran;
  }

  // Validate bran strength
  public static validateBranStrength(bran: string): { 
    isValid: boolean; 
    score: number; 
    issues: string[] 
  } {
    const issues: string[] = [];
    let score = 0;

    // Length check (minimum 64 characters)
    if (bran.length >= 64) {
      score += 25;
    } else {
      issues.push(`Bran too short: ${bran.length} chars (minimum 64)`);
    }

    // Character variety
    const hasLower = /[a-z]/.test(bran);
    const hasUpper = /[A-Z]/.test(bran);
    const hasNumbers = /[0-9]/.test(bran);
    const hasSpecial = /[^a-zA-Z0-9]/.test(bran);

    let varietyScore = 0;
    if (hasLower) varietyScore += 1;
    if (hasUpper) varietyScore += 1;
    if (hasNumbers) varietyScore += 1;
    if (hasSpecial) varietyScore += 1;

    score += varietyScore * 5; // 20 max

    if (varietyScore < 3) {
      issues.push('Insufficient character variety (need lowercase, uppercase, numbers, specials)');
    }

    // Entropy estimation (simplified)
    const uniqueChars = new Set(bran).size;
    const entropyScore = Math.min(25, uniqueChars * 2);
    score += entropyScore;

    if (uniqueChars < 20) {
      issues.push('Low character entropy');
    }

    // Pattern checks
    if (/(.)\1{3,}/.test(bran)) {
      score -= 10;
      issues.push('Contains repeated character patterns');
    }

    // Dictionary word check (basic)
    const commonWords = ['password', 'admin', 'user', 'test', '1234', 'abcd'];
    const lowerBran = bran.toLowerCase();
    const hasCommonWords = commonWords.some(word => lowerBran.includes(word));
    if (hasCommonWords) {
      score -= 15;
      issues.push('Contains common dictionary words');
    }

    // Final scoring
    const isValid = score >= 70 && issues.length === 0;

    return {
      isValid,
      score: Math.max(0, Math.min(100, score)),
      issues
    };
  }

  // Production witness URLs (replace with actual production endpoints)
  public getProductionWitnessConfig() {
    return {
      // Primary witnesses (replace with actual production URLs)
      witnesses: [
        'https://witness1.travlr-keri.com',
        'https://witness2.travlr-keri.com', 
        'https://witness3.travlr-keri.com'
      ],
      // Backup witnesses
      backupWitnesses: [
        'https://backup1.travlr-keri.com',
        'https://backup2.travlr-keri.com'
      ],
      // Witness threshold (minimum witnesses required)
      threshold: 2,
      // Connection timeout
      connectionTimeout: 10000,
      // Retry configuration
      maxRetries: 3,
      retryDelay: 1000
    };
  }

  // Development witness URLs (all 5 running witnesses)
  public getDevelopmentWitnessConfig() {
    return {
      witnesses: [
        'http://192.168.31.172:5632',
        'http://192.168.31.172:5633',
        'http://192.168.31.172:5634',
        'http://192.168.31.172:5635',
        'http://192.168.31.172:5636'
      ],
      backupWitnesses: [],
      threshold: 3, // Higher threshold with more witnesses
      connectionTimeout: 5000,
      maxRetries: 2,
      retryDelay: 500
    };
  }

  // Get appropriate witness config based on environment
  public getWitnessConfig() {
    return __DEV__ 
      ? this.getDevelopmentWitnessConfig()
      : this.getProductionWitnessConfig();
  }

  // Reset configuration (for testing/debugging)
  public reset(): void {
    this._bran = null;
    this._initialized = false;
    console.log('✅ Crypto config reset');
  }

  // Get configuration summary for debugging
  public getConfigSummary() {
    return {
      initialized: this._initialized,
      branLength: this._bran?.length || 0,
      branStrength: this._bran ? CryptoConfig.validateBranStrength(this._bran) : null,
      witnessConfig: this.getWitnessConfig()
    };
  }
}

// Export singleton instance
export const cryptoConfig = CryptoConfig.getInstance();
export default cryptoConfig;