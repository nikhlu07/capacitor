import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmployeeAIDResponse, MobileDashboard, CredentialListItem } from './api';

// Storage Keys
const STORAGE_KEYS = {
  EMPLOYEE_DATA: 'employee_data',
  CREDENTIALS: 'credentials',
  DASHBOARD_DATA: 'dashboard_data',
  AUTH_TOKEN: 'auth_token',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  CONSENT_SETTINGS: 'consent_settings',
  TRAVEL_PREFERENCES: 'travel_preferences',
  LAST_SYNC: 'last_sync',
} as const;

// Employee Data Interface
export interface StoredEmployeeData {
  employee_id: string;
  aid: string;
  oobi: string;
  full_name: string;
  department: string;
  email: string;
  phone?: string;
  created_at: string;
  last_updated: string;
}

// Consent Settings Interface
export interface ConsentSettings {
  share_with_scania: boolean;
  share_flight_prefs: boolean;
  share_hotel_prefs: boolean;
  share_accessibility_needs: boolean;
  share_emergency_contact: boolean;
  ai_processing_consent: boolean;
  last_updated: string;
}

// Travel Preferences Interface
export interface TravelPreferences {
  preferred_airlines: string[];
  seat_preference: string;
  class_preference: string;
  meal_preference: string;
  preferred_hotel_chains: string[];
  room_type: string;
  smoking_preference: string;
  mobility_assistance: boolean;
  wheelchair_required: boolean;
  visual_impairment: boolean;
  hearing_impairment: boolean;
  emergency_contact: {
    name: string;
    relationship: string;
    phone: string;
    email: string;
  };
}

class StorageService {
  // Generic storage methods
  private async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Error storing ${key}:`, error);
      throw error;
    }
  }

  private async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`Error retrieving ${key}:`, error);
      return null;
    }
  }

  private async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      throw error;
    }
  }

  // Employee Data Management
  async storeEmployeeData(aidResponse: EmployeeAIDResponse, additionalData?: {
    full_name: string;
    department: string;
    email: string;
    phone?: string;
  }): Promise<void> {
    const employeeData: StoredEmployeeData = {
      employee_id: aidResponse.employee_id,
      aid: aidResponse.aid,
      oobi: aidResponse.oobi,
      full_name: additionalData?.full_name || '',
      department: additionalData?.department || '',
      email: additionalData?.email || '',
      phone: additionalData?.phone,
      created_at: aidResponse.created_at,
      last_updated: new Date().toISOString(),
    };

    await this.setItem(STORAGE_KEYS.EMPLOYEE_DATA, employeeData);
  }

  async getEmployeeData(): Promise<StoredEmployeeData | null> {
    const storedData = await this.getItem<StoredEmployeeData>(STORAGE_KEYS.EMPLOYEE_DATA);
    return storedData;
  }

  async updateEmployeeData(updates: Partial<StoredEmployeeData>): Promise<void> {
    const currentData = await this.getEmployeeData();
    if (currentData) {
      const updatedData = {
        ...currentData,
        ...updates,
        last_updated: new Date().toISOString(),
      };
      await this.setItem(STORAGE_KEYS.EMPLOYEE_DATA, updatedData);
    }
  }

  // Credentials Management
  async storeCredentials(credentials: CredentialListItem[]): Promise<void> {
    await this.setItem(STORAGE_KEYS.CREDENTIALS, {
      credentials,
      last_updated: new Date().toISOString(),
    });
  }

  async getCredentials(): Promise<CredentialListItem[]> {
    const data = await this.getItem<{
      credentials: CredentialListItem[];
      last_updated: string;
    }>(STORAGE_KEYS.CREDENTIALS);
    
    const existingCredentials = data?.credentials || [];
    return existingCredentials;
  }

  async addCredential(credential: CredentialListItem): Promise<void> {
    const currentCredentials = await this.getCredentials();
    const updatedCredentials = [...currentCredentials, credential];
    await this.storeCredentials(updatedCredentials);
  }

  async updateCredentialStatus(credentialId: string, status: string): Promise<void> {
    const currentCredentials = await this.getCredentials();
    const updatedCredentials = currentCredentials.map(cred =>
      cred.credential_id === credentialId ? { ...cred, status } : cred
    );
    await this.storeCredentials(updatedCredentials);
  }

  // Dashboard Data Management
  async storeDashboardData(dashboard: MobileDashboard): Promise<void> {
    await this.setItem(STORAGE_KEYS.DASHBOARD_DATA, {
      ...dashboard,
      cached_at: new Date().toISOString(),
    });
  }

  async getDashboardData(): Promise<MobileDashboard | null> {
    const data = await this.getItem<MobileDashboard & { cached_at: string }>(
      STORAGE_KEYS.DASHBOARD_DATA
    );
    return data;
  }

  // Authentication Management
  async storeAuthToken(token: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  }

  async getAuthToken(): Promise<string | null> {
    return await this.getItem<string>(STORAGE_KEYS.AUTH_TOKEN);
  }

  async removeAuthToken(): Promise<void> {
    await this.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  // Biometric Settings
  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await this.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, enabled);
  }

  async isBiometricEnabled(): Promise<boolean> {
    const enabled = await this.getItem<boolean>(STORAGE_KEYS.BIOMETRIC_ENABLED);
    return enabled || false;
  }

  // Onboarding Status
  async setOnboardingCompleted(completed: boolean): Promise<void> {
    await this.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, completed);
  }

  async isOnboardingCompleted(): Promise<boolean> {
    const completed = await this.getItem<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETED);
    return completed || false;
  }

  // Consent Settings
  async storeConsentSettings(settings: ConsentSettings): Promise<void> {
    await this.setItem(STORAGE_KEYS.CONSENT_SETTINGS, {
      ...settings,
      last_updated: new Date().toISOString(),
    });
  }

  async getConsentSettings(): Promise<ConsentSettings | null> {
    return await this.getItem<ConsentSettings>(STORAGE_KEYS.CONSENT_SETTINGS);
  }

  // Travel Preferences Management
  async saveTravelPreferences(preferences: TravelPreferences): Promise<void> {
    await this.setItem(STORAGE_KEYS.TRAVEL_PREFERENCES, {
      ...preferences,
      last_updated: new Date().toISOString(),
    });
  }

  async getTravelPreferences(): Promise<TravelPreferences | null> {
    const data = await this.getItem<TravelPreferences & { last_updated: string }>(
      STORAGE_KEYS.TRAVEL_PREFERENCES
    );
    return data;
  }

  // Sync Management
  async setLastSyncTime(timestamp: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.LAST_SYNC, timestamp);
  }

  async getLastSyncTime(): Promise<string | null> {
    return await this.getItem<string>(STORAGE_KEYS.LAST_SYNC);
  }

  // Data Validation
  async isDataStale(maxAgeMinutes: number = 30): Promise<boolean> {
    const lastSync = await this.getLastSyncTime();
    if (!lastSync) return true;

    const lastSyncTime = new Date(lastSync);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60);

    return diffMinutes > maxAgeMinutes;
  }

  // Clear All Data (for logout)
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.EMPLOYEE_DATA,
        STORAGE_KEYS.CREDENTIALS,
        STORAGE_KEYS.DASHBOARD_DATA,
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.CONSENT_SETTINGS,
        STORAGE_KEYS.LAST_SYNC,
      ]);
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }

  // Export/Import for backup (optional)
  async exportData(): Promise<string> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      const data: Record<string, any> = {};

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          data[key] = JSON.parse(value);
        }
      }

      return JSON.stringify({
        exported_at: new Date().toISOString(),
        version: '1.0',
        data,
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  async importData(exportedData: string): Promise<void> {
    try {
      const parsed = JSON.parse(exportedData);
      const { data } = parsed;

      for (const [key, value] of Object.entries(data)) {
        await AsyncStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }

  // Debug: Get all stored data
  async getAllStoredData(): Promise<Record<string, any>> {
    const data: Record<string, any> = {};
    
    for (const key of Object.values(STORAGE_KEYS)) {
      const value = await this.getItem(key);
      if (value) {
        data[key] = value;
      }
    }

    return data;
  }
}

// Export singleton instance
export const storageService = new StorageService();
export default storageService;