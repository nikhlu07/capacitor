import 'react-native-get-random-values';
import { cryptoConfig } from './cryptoConfig';

// Witness validation and management service
export interface WitnessConfig {
  url: string;
  id: string;
  publicKey?: string;
  isActive: boolean;
  lastChecked?: string;
  responseTime?: number;
  errorCount: number;
}

export interface WitnessValidationResult {
  isValid: boolean;
  isReachable: boolean;
  responseTime: number;
  error?: string;
  witnessInfo?: any;
}

class WitnessService {
  private validatedWitnesses: Map<string, WitnessConfig> = new Map();
  private validationCache: Map<string, { result: WitnessValidationResult; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Production witness endpoints (to be replaced with actual production URLs)
  private readonly PRODUCTION_WITNESSES = [
    {
      id: 'witness-prod-1',
      url: 'https://witness1.travlr-keri.com',
      publicKey: null, // Will be fetched during validation
    },
    {
      id: 'witness-prod-2', 
      url: 'https://witness2.travlr-keri.com',
      publicKey: null,
    },
    {
      id: 'witness-prod-3',
      url: 'https://witness3.travlr-keri.com', 
      publicKey: null,
    },
    {
      id: 'witness-backup-1',
      url: 'https://backup1.travlr-keri.com',
      publicKey: null,
    },
    {
      id: 'witness-backup-2',
      url: 'https://backup2.travlr-keri.com',
      publicKey: null,
    }
  ];

  // Development witness endpoints (matching Docker setup)
  private readonly DEVELOPMENT_WITNESSES = [
    {
      id: 'witness-dev-1',
      url: 'http://192.168.31.172:5632',
      publicKey: null,
    },
    {
      id: 'witness-dev-2',
      url: 'http://192.168.31.172:5633', 
      publicKey: null,
    },
    {
      id: 'witness-dev-3',
      url: 'http://192.168.31.172:5634',
      publicKey: null,
    },
    {
      id: 'witness-dev-4',
      url: 'http://192.168.31.172:5635',
      publicKey: null,
    },
    {
      id: 'witness-dev-5',
      url: 'http://192.168.31.172:5636',
      publicKey: null,
    }
  ];

  // Get witness configurations based on environment
  private getWitnessConfigs(): Array<{ id: string; url: string; publicKey: string | null }> {
    return __DEV__ ? this.DEVELOPMENT_WITNESSES : this.PRODUCTION_WITNESSES;
  }

  // Validate a single witness endpoint
  async validateWitness(witnessUrl: string, timeout: number = 10000): Promise<WitnessValidationResult> {
    const cacheKey = witnessUrl;
    const cached = this.validationCache.get(cacheKey);
    
    // Check cache
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      console.log(`📋 Using cached validation for ${witnessUrl}`);
      return cached.result;
    }

    const startTime = Date.now();
    
    try {
      console.log(`🔍 Validating witness: ${witnessUrl}`);
      
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout);
      });

      // Make HTTP request to witness endpoint
      const fetchPromise = fetch(witnessUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Try to parse witness info
      let witnessInfo = null;
      try {
        witnessInfo = await response.json();
      } catch (parseError) {
        // Witness might not return JSON, that's okay
        console.log(`ℹ️ Witness ${witnessUrl} doesn't return JSON info`);
      }

      const result: WitnessValidationResult = {
        isValid: true,
        isReachable: true,
        responseTime,
        witnessInfo
      };

      // Cache result
      this.validationCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      console.log(`✅ Witness ${witnessUrl} validated (${responseTime}ms)`);
      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      const result: WitnessValidationResult = {
        isValid: false,
        isReachable: false,
        responseTime,
        error: errorMessage
      };

      // Cache failed result for shorter time
      this.validationCache.set(cacheKey, {
        result,
        timestamp: Date.now() - (this.CACHE_TTL * 0.8) // Cache for 20% of normal TTL
      });

      console.warn(`❌ Witness ${witnessUrl} validation failed: ${errorMessage} (${responseTime}ms)`);
      return result;
    }
  }

  // Validate all witnesses and return healthy ones
  async validateAllWitnesses(): Promise<WitnessConfig[]> {
    console.log('🔍 Validating all witness endpoints...');
    
    const witnessConfigs = this.getWitnessConfigs();
    const validationPromises = witnessConfigs.map(async (config) => {
      const validation = await this.validateWitness(config.url);
      
      const witnessConfig: WitnessConfig = {
        url: config.url,
        id: config.id,
        publicKey: config.publicKey || undefined,
        isActive: validation.isValid && validation.isReachable,
        lastChecked: new Date().toISOString(),
        responseTime: validation.responseTime,
        errorCount: validation.isValid ? 0 : 1
      };

      if (witnessConfig.isActive) {
        this.validatedWitnesses.set(config.id, witnessConfig);
      }

      return witnessConfig;
    });

    const results = await Promise.all(validationPromises);
    const healthyWitnesses = results.filter(w => w.isActive);
    
    console.log(`✅ Validated ${healthyWitnesses.length}/${results.length} witnesses`);
    
    if (healthyWitnesses.length === 0) {
      throw new Error('No healthy witnesses found - KERI operations may fail');
    }

    return healthyWitnesses;
  }

  // Get minimum required healthy witnesses for KERI operations  
  async getHealthyWitnesses(minRequired: number = 2): Promise<WitnessConfig[]> {
    const healthyWitnesses = await this.validateAllWitnesses();
    
    if (healthyWitnesses.length < minRequired) {
      const message = `Insufficient healthy witnesses: ${healthyWitnesses.length}/${minRequired} required`;
      console.error(`❌ ${message}`);
      throw new Error(message);
    }

    // Sort by response time (fastest first)
    const sortedWitnesses = healthyWitnesses.sort((a, b) => 
      (a.responseTime || Infinity) - (b.responseTime || Infinity)
    );

    console.log(`✅ Found ${sortedWitnesses.length} healthy witnesses (required: ${minRequired})`);
    return sortedWitnesses;
  }

  // Get witness URLs for KERI operations
  async getWitnessUrls(minRequired: number = 2): Promise<string[]> {
    const healthyWitnesses = await this.getHealthyWitnesses(minRequired);
    return healthyWitnesses.map(w => w.url);
  }

  // Get witness configuration for KERI client
  async getWitnessConfigForKERI(): Promise<{
    witnesses: string[];
    threshold: number;
    timeout: number;
  }> {
    const config = cryptoConfig.getWitnessConfig();
    const healthyWitnesses = await this.getWitnessUrls(config.threshold);
    
    return {
      witnesses: healthyWitnesses.slice(0, 5), // Limit to 5 witnesses max
      threshold: Math.min(config.threshold, healthyWitnesses.length),
      timeout: config.connectionTimeout
    };
  }

  // Monitor witness health (background task)
  async monitorWitnessHealth(): Promise<void> {
    try {
      console.log('🔄 Starting witness health monitoring...');
      await this.validateAllWitnesses();
    } catch (error) {
      console.error('❌ Witness health monitoring failed:', error);
    }
  }

  // Get witness statistics
  getWitnessStats(): {
    total: number;
    healthy: number;
    unhealthy: number;
    averageResponseTime: number;
  } {
    const witnesses = Array.from(this.validatedWitnesses.values());
    const healthy = witnesses.filter(w => w.isActive);
    const unhealthy = witnesses.filter(w => !w.isActive);
    
    const avgResponseTime = healthy.length > 0 
      ? healthy.reduce((sum, w) => sum + (w.responseTime || 0), 0) / healthy.length
      : 0;

    return {
      total: witnesses.length,
      healthy: healthy.length,
      unhealthy: unhealthy.length,
      averageResponseTime: Math.round(avgResponseTime)
    };
  }

  // Clear validation cache
  clearCache(): void {
    this.validationCache.clear();
    console.log('✅ Witness validation cache cleared');
  }

  // Get detailed witness status
  getDetailedStatus(): Array<WitnessConfig & { status: string }> {
    return Array.from(this.validatedWitnesses.values()).map(witness => ({
      ...witness,
      status: witness.isActive ? 'healthy' : 'unhealthy'
    }));
  }

  // Test connectivity with enhanced diagnostics
  async testConnectivity(): Promise<{
    success: boolean;
    results: Array<{
      url: string;
      status: 'success' | 'failed';
      responseTime: number;
      error?: string;
    }>;
  }> {
    console.log('🧪 Running witness connectivity test...');
    
    const configs = this.getWitnessConfigs();
    const results = [];
    
    for (const config of configs) {
      const validation = await this.validateWitness(config.url, 5000); // Shorter timeout for testing
      
      results.push({
        url: config.url,
        status: validation.isReachable ? 'success' : 'failed',
        responseTime: validation.responseTime,
        error: validation.error
      });
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const success = successCount >= 2; // Need at least 2 working witnesses
    
    console.log(`🧪 Connectivity test: ${successCount}/${results.length} witnesses reachable`);
    
    return {
      success,
      results
    };
  }
}

// Export singleton instance
export const witnessService = new WitnessService();
export default witnessService;