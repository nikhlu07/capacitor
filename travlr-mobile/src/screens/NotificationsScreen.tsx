import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { consentService, ConsentNotification } from '../services/consentService';
import { PendingConsentRequest } from '../services/api';

interface ConsentApprovalModalProps {
  visible: boolean;
  request: PendingConsentRequest | null;
  onClose: () => void;
  onApprove: (approvedFields: string[]) => void;
  onDeny: (reason?: string) => void;
}

const ConsentApprovalModal: React.FC<ConsentApprovalModalProps> = ({
  visible,
  request,
  onClose,
  onApprove,
  onDeny,
}) => {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  useEffect(() => {
    if (request) {
      setSelectedFields(request.requested_fields);
    }
  }, [request]);

  const toggleField = (field: string) => {
    setSelectedFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const getFieldDisplayName = (field: string) => {
    const fieldMap: Record<string, string> = {
      'dietary': '🍽️ Dietary Requirements',
      'emergency_contact': '🚨 Emergency Contact',
      'flight_preferences': '✈️ Flight Preferences',
      'hotel_preferences': '🏨 Hotel Preferences',
      'accessibility_needs': '♿ Accessibility Needs',
    };
    return fieldMap[field] || `📋 ${field}`;
  };

  const getCompanyDisplayName = (companyAid: string) => {
    if (companyAid.includes('Demo') || companyAid.includes('Scania')) {
      return 'Scania AB';
    }
    return 'Company';
  };

  if (!request) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#1c170d" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Data Access Request</Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.requestCard}>
            <View style={styles.companyInfo}>
              <View style={styles.companyIcon}>
                <Ionicons name="business" size={32} color="#9b844b" />
              </View>
              <View style={styles.companyDetails}>
                <Text style={styles.companyName}>{getCompanyDisplayName(request.company_aid)}</Text>
                <Text style={styles.companyId}>ID: {request.company_aid.substring(0, 16)}...</Text>
              </View>
            </View>

            <View style={styles.requestDetails}>
              <Text style={styles.purposeLabel}>Purpose:</Text>
              <Text style={styles.purposeText}>{request.purpose}</Text>
              
              <Text style={styles.expiresLabel}>Expires:</Text>
              <Text style={styles.expiresText}>
                {new Date(request.expires_at).toLocaleDateString()} at{' '}
                {new Date(request.expires_at).toLocaleTimeString()}
              </Text>
            </View>
          </View>

          <View style={styles.fieldsSection}>
            <Text style={styles.fieldsTitle}>Requested Data Fields</Text>
            <Text style={styles.fieldsSubtitle}>
              Select which data you want to share
            </Text>

            {request.requested_fields.map((field) => (
              <TouchableOpacity
                key={field}
                style={[
                  styles.fieldItem,
                  selectedFields.includes(field) && styles.fieldItemSelected
                ]}
                onPress={() => toggleField(field)}
              >
                <View style={styles.fieldContent}>
                  <Text style={[
                    styles.fieldName,
                    selectedFields.includes(field) && styles.fieldNameSelected
                  ]}>
                    {getFieldDisplayName(field)}
                  </Text>
                  <View style={[
                    styles.checkbox,
                    selectedFields.includes(field) && styles.checkboxSelected
                  ]}>
                    {selectedFields.includes(field) && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.privacyNote}>
            <Ionicons name="shield-checkmark" size={20} color="#9b844b" />
            <Text style={styles.privacyText}>
              Your data will be encrypted and only accessible to the requesting company. 
              You can revoke access at any time.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={styles.denyButton}
            onPress={() => {
              Alert.alert(
                'Deny Request',
                'Are you sure you want to deny this data access request?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Deny', 
                    style: 'destructive',
                    onPress: () => onDeny('User denied request')
                  }
                ]
              );
            }}
          >
            <Text style={styles.denyButtonText}>❌ Deny Request</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.approveButton,
              selectedFields.length === 0 && styles.approveButtonDisabled
            ]}
            onPress={() => {
              if (selectedFields.length === 0) {
                Alert.alert('No Fields Selected', 'Please select at least one field to share.');
                return;
              }
              onApprove(selectedFields);
            }}
            disabled={selectedFields.length === 0}
          >
            <Text style={styles.approveButtonText}>
              ✅ Approve ({selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''})
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<ConsentNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PendingConsentRequest | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Load employee data and start polling
  const initializeNotifications = useCallback(async () => {
    try {
      const employeeDataStr = await AsyncStorage.getItem('employee_data');
      if (employeeDataStr) {
        const employeeData = JSON.parse(employeeDataStr);
        if (employeeData.aid) {
          // Load stored notifications
          await consentService.loadNotificationsFromStorage();
          
          // Start polling for new requests
          consentService.startPolling(employeeData.aid, 30000); // Poll every 30 seconds
          
          console.log('🔔 Notifications initialized for AID:', employeeData.aid.substring(0, 8) + '...');
        }
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen for notification updates
  useEffect(() => {
    const handleNotificationUpdate = (updatedNotifications: ConsentNotification[]) => {
      setNotifications(updatedNotifications);
    };

    consentService.addListener(handleNotificationUpdate);

    return () => {
      consentService.removeListener(handleNotificationUpdate);
    };
  }, []);

  // Initialize when screen focuses
  useFocusEffect(
    useCallback(() => {
      initializeNotifications();
      
      return () => {
        // Don't stop polling when screen unfocuses - keep running in background
      };
    }, [initializeNotifications])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await consentService.forceRefresh();
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkAllRead = () => {
    consentService.markAllAsRead();
  };

  const handleNotificationPress = (notification: ConsentNotification) => {
    setSelectedRequest(notification.request);
    setModalVisible(true);
    consentService.markAsRead(notification.request.request_id);
  };

  const handleApprove = async (approvedFields: string[]) => {
    if (!selectedRequest) return;

    try {
      setModalVisible(false);
      
      const result = await consentService.approveConsent(
        selectedRequest.request_id,
        approvedFields
      );

      Alert.alert(
        'Request Approved! ✅',
        `You have shared ${approvedFields.length} data field${approvedFields.length !== 1 ? 's' : ''} with the company.\n\nShared: ${approvedFields.join(', ')}`,
        [{ text: 'OK' }]
      );

      setSelectedRequest(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to approve request. Please try again.');
      console.error('Failed to approve consent:', error);
    }
  };

  const handleDeny = async (reason?: string) => {
    if (!selectedRequest) return;

    try {
      setModalVisible(false);
      
      await consentService.denyConsent(selectedRequest.request_id, reason);

      Alert.alert(
        'Request Denied ❌',
        'The data access request has been denied.',
        [{ text: 'OK' }]
      );

      setSelectedRequest(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to deny request. Please try again.');
      console.error('Failed to deny consent:', error);
    }
  };

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="notifications" size={48} color="#e8e1cf" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllReadText}>Mark All Read</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Unread Count */}
        {consentService.getUnreadCount() > 0 && (
          <View style={styles.unreadBanner}>
            <Ionicons name="notifications" size={20} color="#9b844b" />
            <Text style={styles.unreadText}>
              {consentService.getUnreadCount()} new notification{consentService.getUnreadCount() !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Notifications List */}
        <View style={styles.notificationsContainer}>
          {notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationItem,
                notification.isRead && styles.notificationItemRead
              ]}
              onPress={() => handleNotificationPress(notification)}
            >
              <View style={styles.notificationContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="business" size={24} color="#9b844b" />
                  {!notification.isRead && <View style={styles.unreadDot} />}
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.notificationTitle}>
                    🏢 Data Access Request
                  </Text>
                  <Text style={styles.notificationDescription}>
                    Company requested access to your {notification.request.requested_fields.join(', ')}
                  </Text>
                  <Text style={styles.notificationPurpose}>
                    Purpose: {notification.request.purpose}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {getTimeSince(notification.receivedAt)}
                  </Text>
                </View>
              </View>
              <View style={styles.chevron}>
                <Ionicons name="chevron-forward" size={20} color="#e8e1cf" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Empty State */}
        {notifications.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={64} color="#e8e1cf" />
            <Text style={styles.emptyStateTitle}>No Notifications</Text>
            <Text style={styles.emptyStateText}>
              You're all caught up! Data access requests will appear here.
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
              <Text style={styles.refreshButtonText}>🔄 Check for Updates</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Consent Approval Modal */}
      <ConsentApprovalModal
        visible={modalVisible}
        request={selectedRequest}
        onClose={() => {
          setModalVisible(false);
          setSelectedRequest(null);
        }}
        onApprove={handleApprove}
        onDeny={handleDeny}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcfbf8',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#9b844b',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c170d',
    letterSpacing: -0.015,
    flex: 1,
    textAlign: 'center',
  },
  markAllReadText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9b844b',
    letterSpacing: 0.015,
  },
  scrollView: {
    flex: 1,
  },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f0e7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  unreadText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9b844b',
    marginLeft: 8,
  },
  notificationsContainer: {
    paddingHorizontal: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  notificationItemRead: {
    backgroundColor: '#f9f8f5',
    opacity: 0.8,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f3f0e7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e74c3c',
  },
  textContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c170d',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 14,
    color: '#9b844b',
    lineHeight: 20,
    marginBottom: 2,
  },
  notificationPurpose: {
    fontSize: 13,
    color: '#c7b377',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#c7b377',
  },
  chevron: {
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1c170d',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9b844b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#f3f0e7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9b844b',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fcfbf8',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e1cf',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c170d',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  companyIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f3f0e7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  companyDetails: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c170d',
    marginBottom: 4,
  },
  companyId: {
    fontSize: 12,
    color: '#9b844b',
    fontFamily: 'monospace',
  },
  requestDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f1f0ed',
    paddingTop: 16,
  },
  purposeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9b844b',
    marginBottom: 4,
  },
  purposeText: {
    fontSize: 16,
    color: '#1c170d',
    lineHeight: 22,
    marginBottom: 12,
  },
  expiresLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9b844b',
    marginBottom: 4,
  },
  expiresText: {
    fontSize: 14,
    color: '#1c170d',
  },
  fieldsSection: {
    marginBottom: 24,
  },
  fieldsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c170d',
    marginBottom: 8,
  },
  fieldsSubtitle: {
    fontSize: 14,
    color: '#9b844b',
    marginBottom: 16,
  },
  fieldItem: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e8e1cf',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  fieldItemSelected: {
    borderColor: '#9b844b',
    backgroundColor: '#f9f8f5',
  },
  fieldContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1c170d',
    flex: 1,
  },
  fieldNameSelected: {
    color: '#9b844b',
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#e8e1cf',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#9b844b',
    borderColor: '#9b844b',
  },
  privacyNote: {
    flexDirection: 'row',
    backgroundColor: '#f3f0e7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  privacyText: {
    fontSize: 14,
    color: '#9b844b',
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
    gap: 12,
  },
  denyButton: {
    flex: 1,
    backgroundColor: '#e8e1cf',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  denyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c170d',
  },
  approveButton: {
    flex: 2,
    backgroundColor: '#9b844b',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  approveButtonDisabled: {
    backgroundColor: '#e8e1cf',
    opacity: 0.5,
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default NotificationsScreen;