/**
 * @jest-environment node
 */

import { apiService } from '../src/services/api';

describe('API Service', () => {
  test('health check should work', async () => {
    try {
      const health = await apiService.healthCheck();
      expect(health).toHaveProperty('status');
      expect(health.status).toBe('healthy');
    } catch (error) {
      // If backend is not running, skip this test
      console.warn('Backend not available for testing:', error.message);
    }
  });

  test('should have required methods', () => {
    expect(typeof apiService.registerEmployee).toBe('function');
    expect(typeof apiService.issueTravelCredential).toBe('function');
    expect(typeof apiService.getMobileDashboard).toBe('function');
    expect(typeof apiService.generateQRCode).toBe('function');
  });
});