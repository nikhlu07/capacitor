import { apiService, PendingConsentRequest, ConsentApproval, ConsentDenial } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ConsentNotification {
  id: string;
  type: 'consent_request';
  request: PendingConsentRequest;
  isRead: boolean;
  receivedAt: string;
}

class ConsentService {
  private pollingInterval: NodeJS.Timeout | null = null;
  private currentEmployeeAid: string | null = null;
  private listeners: Array<(notifications: ConsentNotification[]) => void> = [];
  private notifications: ConsentNotification[] = [];

  // Start polling for consent requests
  startPolling(employeeAid: string, intervalMs: number = 30000) {
    console.log('🔔 Starting consent polling for:', employeeAid.substring(0, 8) + '...');
    
    this.currentEmployeeAid = employeeAid;
    
    // Clear existing interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Initial check
    this.checkPendingRequests();

    // Set up periodic checking
    this.pollingInterval = setInterval(() => {
      this.checkPendingRequests();
    }, intervalMs);
  }

  // Stop polling
  stopPolling() {
    console.log('🔔 Stopping consent polling');
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.currentEmployeeAid = null;
  }

  // Check for pending consent requests
  private async checkPendingRequests() {
    if (!this.currentEmployeeAid) return;

    try {
      const pendingRequests = await apiService.getPendingConsentRequests(this.currentEmployeeAid);
      
      // Convert to notifications
      const newNotifications: ConsentNotification[] = [];
      
      for (const request of pendingRequests) {
        // Check if we already have this notification
        const existingNotification = this.notifications.find(n => n.request.request_id === request.request_id);
        
        if (!existingNotification) {
          // New consent request
          const notification: ConsentNotification = {
            id: request.request_id,
            type: 'consent_request',
            request,
            isRead: false,
            receivedAt: new Date().toISOString()
          };
          newNotifications.push(notification);
          
          console.log('🔔 New consent request:', {
            from: request.company_aid?.substring(0, 8) + '...',
            fields: request.requested_fields,
            purpose: request.purpose
          });
        } else {
          // Keep existing notification
          newNotifications.push(existingNotification);
        }
      }

      // Update notifications list
      this.notifications = newNotifications;
      
      // Notify listeners
      this.notifyListeners();
      
      // Save to storage
      await this.saveNotificationsToStorage();
      
    } catch (error) {
      console.warn('Failed to check pending consent requests:', error);
    }
  }

  // Add listener for notification updates
  addListener(callback: (notifications: ConsentNotification[]) => void) {
    this.listeners.push(callback);
    // Immediately notify with current notifications
    callback(this.notifications);
  }

  // Remove listener
  removeListener(callback: (notifications: ConsentNotification[]) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // Notify all listeners
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.notifications));
  }

  // Approve consent request
  async approveConsent(
    requestId: string, 
    approvedFields: string[], 
    employeeSignature: string = 'mobile_app_signature'
  ) {
    try {
      const approval: ConsentApproval = {
        request_id: requestId,
        approved_fields: approvedFields,
        employee_signature: employeeSignature,
        context_card_said: `EContextCard${Date.now()}` // Generate context card ID
      };

      const result = await apiService.approveConsentRequest(approval);
      
      // Mark notification as read and update status
      this.notifications = this.notifications.map(notification => {
        if (notification.request.request_id === requestId) {
          return { ...notification, isRead: true };
        }
        return notification;
      });

      // Remove from notifications (request is no longer pending)
      this.notifications = this.notifications.filter(n => n.request.request_id !== requestId);
      
      this.notifyListeners();
      await this.saveNotificationsToStorage();
      
      console.log('✅ Consent approved:', result);
      return result;
      
    } catch (error) {
      console.error('Failed to approve consent:', error);
      throw error;
    }
  }

  // Deny consent request
  async denyConsent(requestId: string, reason?: string) {
    try {
      const denial: ConsentDenial = { reason };
      const result = await apiService.denyConsentRequest(requestId, denial);
      
      // Remove from notifications
      this.notifications = this.notifications.filter(n => n.request.request_id !== requestId);
      
      this.notifyListeners();
      await this.saveNotificationsToStorage();
      
      console.log('❌ Consent denied:', result);
      return result;
      
    } catch (error) {
      console.error('Failed to deny consent:', error);
      throw error;
    }
  }

  // Mark notification as read
  markAsRead(requestId: string) {
    this.notifications = this.notifications.map(notification => {
      if (notification.request.request_id === requestId) {
        return { ...notification, isRead: true };
      }
      return notification;
    });
    
    this.notifyListeners();
    this.saveNotificationsToStorage();
  }

  // Mark all notifications as read
  markAllAsRead() {
    this.notifications = this.notifications.map(notification => ({
      ...notification,
      isRead: true
    }));
    
    this.notifyListeners();
    this.saveNotificationsToStorage();
  }

  // Get unread count
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  // Get all notifications
  getNotifications(): ConsentNotification[] {
    return this.notifications;
  }

  // Save notifications to AsyncStorage
  private async saveNotificationsToStorage() {
    try {
      await AsyncStorage.setItem('consent_notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.warn('Failed to save notifications to storage:', error);
    }
  }

  // Load notifications from AsyncStorage
  async loadNotificationsFromStorage() {
    try {
      const stored = await AsyncStorage.getItem('consent_notifications');
      if (stored) {
        this.notifications = JSON.parse(stored);
        this.notifyListeners();
      }
    } catch (error) {
      console.warn('Failed to load notifications from storage:', error);
    }
  }

  // Force refresh
  async forceRefresh() {
    if (this.currentEmployeeAid) {
      await this.checkPendingRequests();
    }
  }
}

// Export singleton instance
export const consentService = new ConsentService();
export default consentService;