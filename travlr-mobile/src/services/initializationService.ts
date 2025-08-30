import { signifyService } from './signifyService';
import { storageService } from './storage';
import { apiService } from './api';
import { Alert } from 'react-native';

// Service to handle app initialization and KERI setup
class InitializationService {
  private initialized: boolean = false;

  // Initialize all services
  async initializeApp(): Promise<{
    success: boolean;
    services: {
      signifyts: boolean;
      api: boolean;
      storage: boolean;
    };
    employee_registered: boolean;
  }> {
    console.log('🚀 Initializing Travlr-ID app...');

    const results = {
      success: false,
      services: {
        signifyts: false,
        api: false,
        storage: false
      },
      employee_registered: false
    };

    try {
      // 1. Initialize storage service
      try {
        const employeeData = await storageService.getEmployeeData();
        results.services.storage = true;
        results.employee_registered = !!employeeData;
        console.log('✅ Storage service initialized');
      } catch (error) {
        console.warn('⚠️ Storage service initialization failed:', error);
      }

      // 2. Test API connectivity
      try {
        await apiService.healthCheck();
        results.services.api = true;
        console.log('✅ API service connected');
      } catch (error) {
        console.warn('⚠️ API service connection failed:', error);
      }

      // 3. Initialize SignifyTS (optional, graceful failure)
      try {
        const signifyInitialized = await signifyService.initialize();
        results.services.signifyts = signifyInitialized;
        
        if (signifyInitialized) {
          console.log('✅ SignifyTS initialized - KERI operations available');
        } else {
          console.log('⚠️ SignifyTS initialization failed - using API fallback');
        }
      } catch (error) {
        console.warn('⚠️ SignifyTS initialization failed:', error);
        results.services.signifyts = false;
      }

      // 4. Set up employee AID if needed
      if (results.employee_registered && !results.services.signifyts) {
        try {
          await this.setupEmployeeAID();
        } catch (error) {
          console.warn('⚠️ Employee AID setup failed:', error);
        }
      }

      results.success = results.services.storage; // Minimum requirement
      this.initialized = results.success;

      console.log('🎯 App initialization completed:', results);
      return results;

    } catch (error) {
      console.error('❌ App initialization failed:', error);
      return results;
    }
  }

  // Set up employee AID using SignifyTS
  private async setupEmployeeAID(): Promise<void> {
    try {
      const employeeData = await storageService.getEmployeeData();
      if (!employeeData || employeeData.aid) {
        return; // No employee data or AID already exists
      }

      if (!signifyService.isInitialized()) {
        console.log('SignifyTS not available for AID creation');
        return;
      }

      console.log('🆔 Setting up KERI AID for employee...');

      // Create KERI AID using SignifyTS
      const aidResult = await signifyService.createEmployeeAID(
        employeeData.employee_id,
        employeeData.full_name
      );

      // Update stored employee data with AID
      await storageService.updateEmployeeData({
        aid: aidResult.aid,
        oobi: aidResult.oobi
      });

      console.log('✅ Employee AID created and stored:', aidResult.aid);

    } catch (error) {
      console.error('❌ Failed to setup employee AID:', error);
      throw error;
    }
  }

  // Register new employee with KERI AID
  async registerEmployeeWithKERI(registrationData: {
    employee_id: string;
    full_name: string;
    department: string;
    email: string;
    phone?: string;
  }): Promise<{
    success: boolean;
    aid?: string;
    oobi?: string;
    method: 'signifyts' | 'api';
  }> {
    try {
      console.log('👤 Registering employee with KERI AID...');

      // Try SignifyTS first for local AID creation
      if (signifyService.isInitialized()) {
        try {
          const aidResult = await signifyService.createEmployeeAID(
            registrationData.employee_id,
            registrationData.full_name
          );

          // Store employee data locally
          await storageService.storeEmployeeData(
            {
              success: true,
              employee_id: registrationData.employee_id,
              aid: aidResult.aid,
              oobi: aidResult.oobi,
              qr_code_data: JSON.stringify({
                type: 'travlr_employee_aid',
                aid: aidResult.aid,
                oobi: aidResult.oobi,
                employee_id: registrationData.employee_id
              }),
              created_at: new Date().toISOString()
            },
            registrationData
          );

          console.log('✅ Employee registered with SignifyTS AID:', aidResult.aid);

          return {
            success: true,
            aid: aidResult.aid,
            oobi: aidResult.oobi,
            method: 'signifyts'
          };

        } catch (signifyError) {
          console.warn('SignifyTS registration failed, trying API:', signifyError);
        }
      }

      // Fallback to API registration
      try {
        const apiResult = await apiService.registerEmployee(registrationData);

        await storageService.storeEmployeeData(apiResult, registrationData);

        console.log('✅ Employee registered via API:', apiResult.aid);

        return {
          success: true,
          aid: apiResult.aid,
          oobi: apiResult.oobi,
          method: 'api'
        };

      } catch (apiError) {
        console.error('Both SignifyTS and API registration failed:', apiError);
        throw new Error('Failed to register employee with KERI AID');
      }

    } catch (error: any) {
      console.error('❌ Employee registration failed:', error);
      return {
        success: false,
        method: 'api'
      };
    }
  }

  // Check system health
  async checkSystemHealth(): Promise<{
    overall_status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      signifyts: any;
      api: any;
      storage: any;
    };
    recommendations: string[];
  }> {
    const health = {
      overall_status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      services: {
        signifyts: { status: 'unknown' },
        api: { status: 'unknown' },
        storage: { status: 'unknown' }
      },
      recommendations: [] as string[]
    };

    // Check SignifyTS
    try {
      health.services.signifyts = await signifyService.healthCheck();
    } catch (error) {
      health.services.signifyts = { status: 'unhealthy', error: error.message };
    }

    // Check API
    try {
      const apiHealth = await apiService.healthCheck();
      health.services.api = { status: 'healthy', details: apiHealth };
    } catch (error) {
      health.services.api = { status: 'unhealthy', error: error.message };
    }

    // Check Storage
    try {
      const employeeData = await storageService.getEmployeeData();
      health.services.storage = { 
        status: 'healthy', 
        has_employee_data: !!employeeData 
      };
    } catch (error) {
      health.services.storage = { status: 'unhealthy', error: error.message };
    }

    // Determine overall status
    const healthyServices = Object.values(health.services).filter(
      service => service.status === 'healthy'
    ).length;

    if (healthyServices === 3) {
      health.overall_status = 'healthy';
    } else if (healthyServices >= 1) {
      health.overall_status = 'degraded';
      health.recommendations.push('Some services are unavailable - functionality may be limited');
    } else {
      health.overall_status = 'unhealthy';
      health.recommendations.push('Critical services are down - please check connectivity');
    }

    // Add specific recommendations
    if (health.services.signifyts.status !== 'healthy') {
      health.recommendations.push('KERI operations will use API fallback');
    }
    if (health.services.api.status !== 'healthy') {
      health.recommendations.push('Backend API is unavailable - using cached data');
    }

    return health;
  }

  // Get initialization status
  isInitialized(): boolean {
    return this.initialized;
  }

  // Show initialization status to user
  async showInitializationStatus(): Promise<void> {
    const health = await this.checkSystemHealth();
    
    let message = '';
    let title = '';

    switch (health.overall_status) {
      case 'healthy':
        title = '✅ System Ready';
        message = 'All services are operational. Full KERI functionality available.';
        break;
      case 'degraded':
        title = '⚠️ Limited Functionality';
        message = 'Some services are unavailable. Basic functionality is available with fallbacks.';
        break;
      case 'unhealthy':
        title = '❌ System Issues';
        message = 'Critical services are down. Please check your connection and try again.';
        break;
    }

    if (health.recommendations.length > 0) {
      message += '\n\n' + health.recommendations.join('\n');
    }

    Alert.alert(title, message, [{ text: 'OK' }]);
  }
}

// Export singleton instance
export const initializationService = new InitializationService();
export default initializationService;