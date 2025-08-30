import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { delegationService, DelegatedIdentity, DelegationRequest } from '../services/delegationService';
import { storageService } from '../services/storage';

const DelegationScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeDelegations, setActiveDelegations] = useState<DelegatedIdentity[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [newDelegationRequest, setNewDelegationRequest] = useState<Partial<DelegationRequest>>({
    permissions: [],
    purpose: ''
  });

  // Common permissions for company delegations
  const availablePermissions = [
    'travel_preferences',
    'emergency_contact',
    'accessibility_needs',
    'dietary_requirements',
    'flight_bookings',
    'hotel_reservations',
    'expense_reporting',
    'itinerary_sharing'
  ];

  useEffect(() => {
    loadDelegations();
    // Setup periodic cleanup of expired delegations
    const cleanupInterval = setInterval(() => {
      delegationService.cleanupExpiredDelegations();
    }, 60000); // Check every minute

    return () => clearInterval(cleanupInterval);
  }, []);

  const loadDelegations = async () => {
    try {
      const delegations = await delegationService.getActiveDelegations();
      setActiveDelegations(delegations);
    } catch (error) {
      console.error('Failed to load delegations:', error);
      Alert.alert('Error', 'Failed to load delegations');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDelegations();
    setRefreshing(false);
  };

  const handleRequestDelegation = async () => {
    if (!newDelegationRequest.delegatorAid || !newDelegationRequest.purpose || 
        !newDelegationRequest.permissions?.length) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const employeeData = await storageService.getEmployeeData();
      if (!employeeData?.aid) {
        throw new Error('Employee identity not found');
      }

      const delegationRequest: DelegationRequest = {
        delegatorAid: newDelegationRequest.delegatorAid!,
        delegateAid: employeeData.aid,
        permissions: newDelegationRequest.permissions!,
        purpose: newDelegationRequest.purpose!,
        expiresAt: newDelegationRequest.expiresAt,
        metadata: {
          companyName: newDelegationRequest.delegatorAid!.substring(0, 8) + '...',
          employeeName: employeeData.full_name || 'Employee',
          requestId: `req_${Date.now()}`,
          timestamp: new Date().toISOString()
        }
      };

      const result = await delegationService.requestDelegation(delegationRequest);

      if (result.success) {
        Alert.alert(
          'Delegation Requested',
          'Company delegation has been established successfully. You now have delegated authority for the selected permissions.',
          [{ text: 'OK', onPress: () => {
            setShowRequestModal(false);
            setNewDelegationRequest({ permissions: [], purpose: '' });
            loadDelegations();
          }}]
        );
      } else {
        Alert.alert('Delegation Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Delegation request error:', error);
      Alert.alert('Error', 'Failed to request delegation');
    } finally {
      setLoading(false);
    }
  };

  const handleRotateDelegatedKeys = (delegationId: string) => {
    Alert.alert(
      'Rotate Delegated Keys',
      'This will create new cryptographic keys for your delegated identity while maintaining the delegation relationship. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Rotate Keys', 
          onPress: () => performDelegatedRotation(delegationId)
        }
      ]
    );
  };

  const performDelegatedRotation = async (delegationId: string) => {
    setLoading(true);
    try {
      const result = await delegationService.rotateDelegatedKeys(delegationId, 'user_requested');

      if (result.success) {
        Alert.alert(
          'Delegated Keys Rotated',
          `Your delegated identity keys have been rotated successfully.\n\nNew sequence: ${result.rotationSequence}`,
          [{ text: 'OK', onPress: () => loadDelegations() }]
        );
      } else {
        Alert.alert('Rotation Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Delegated rotation error:', error);
      Alert.alert('Error', 'Failed to rotate delegated keys');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeDelegation = (delegation: DelegatedIdentity) => {
    Alert.alert(
      'Revoke Delegation',
      `This will permanently revoke your delegation with ${delegation.delegatorAid.substring(0, 8)}... and end the authority relationship. This cannot be undone. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Revoke', 
          style: 'destructive',
          onPress: () => performRevocation(delegation.delegationId)
        }
      ]
    );
  };

  const performRevocation = async (delegationId: string) => {
    setLoading(true);
    try {
      const result = await delegationService.revokeDelegation(delegationId, 'user_requested');

      if (result.success) {
        Alert.alert(
          'Delegation Revoked',
          'The delegation has been revoked successfully. The company no longer has delegated authority.',
          [{ text: 'OK', onPress: () => loadDelegations() }]
        );
      } else {
        Alert.alert('Revocation Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Revocation error:', error);
      Alert.alert('Error', 'Failed to revoke delegation');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permission: string) => {
    const currentPermissions = newDelegationRequest.permissions || [];
    const updatedPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission];
    
    setNewDelegationRequest(prev => ({
      ...prev,
      permissions: updatedPermissions
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#51cf66';
      case 'pending': return '#ffd43b';
      case 'revoked': return '#ff6b6b';
      case 'expired': return '#868e96';
      default: return '#868e96';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return 'checkmark-circle';
      case 'pending': return 'time';
      case 'revoked': return 'close-circle';
      case 'expired': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="business" size={32} color="#007AFF" />
        <Text style={styles.headerTitle}>Company Delegations</Text>
        <Text style={styles.headerSubtitle}>Manage delegated authority relationships</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setShowRequestModal(true)}
          disabled={loading}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Request Company Delegation</Text>
        </TouchableOpacity>
      </View>

      {/* Active Delegations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Delegations ({activeDelegations.length})</Text>
        
        {activeDelegations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={48} color="#6c757d" />
            <Text style={styles.emptyStateText}>No active delegations</Text>
            <Text style={styles.emptyStateSubtext}>
              Request delegation from a company to establish authority relationships
            </Text>
          </View>
        ) : (
          activeDelegations.map((delegation) => (
            <View key={delegation.delegationId} style={styles.delegationCard}>
              <View style={styles.delegationHeader}>
                <View style={styles.delegationTitleRow}>
                  <Ionicons 
                    name={getStatusIcon(delegation.status)}
                    size={24} 
                    color={getStatusColor(delegation.status)}
                  />
                  <View style={styles.delegationTitleInfo}>
                    <Text style={styles.delegationTitle}>
                      Company: {delegation.delegatorAid.substring(0, 12)}...
                    </Text>
                    <Text style={styles.delegationStatus}>
                      Status: {delegation.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleRevokeDelegation(delegation)}
                >
                  <Ionicons name="trash" size={16} color="#ff6b6b" />
                </TouchableOpacity>
              </View>

              <View style={styles.delegationInfo}>
                <Text style={styles.delegationInfoLabel}>Delegated Identity:</Text>
                <Text style={styles.delegationInfoValue}>
                  {delegation.delegatedAid.substring(0, 12)}...
                </Text>
              </View>

              <View style={styles.delegationInfo}>
                <Text style={styles.delegationInfoLabel}>Created:</Text>
                <Text style={styles.delegationInfoValue}>
                  {formatDate(delegation.createdAt)}
                </Text>
              </View>

              {delegation.expiresAt && (
                <View style={styles.delegationInfo}>
                  <Text style={styles.delegationInfoLabel}>Expires:</Text>
                  <Text style={styles.delegationInfoValue}>
                    {formatDate(delegation.expiresAt)}
                  </Text>
                </View>
              )}

              <View style={styles.permissionsSection}>
                <Text style={styles.permissionsTitle}>Delegated Permissions:</Text>
                <View style={styles.permissionsList}>
                  {delegation.permissions.map((permission, index) => (
                    <View key={index} style={styles.permissionTag}>
                      <Text style={styles.permissionText}>{permission}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.rotationInfo}>
                <Text style={styles.rotationTitle}>
                  Key Rotations: {delegation.rotationHistory.length}
                </Text>
                {delegation.rotationHistory.length > 0 && (
                  <Text style={styles.rotationDate}>
                    Last: {formatDate(delegation.rotationHistory[delegation.rotationHistory.length - 1].timestamp)}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.rotateButton}
                onPress={() => handleRotateDelegatedKeys(delegation.delegationId)}
                disabled={delegation.status !== 'active'}
              >
                <Ionicons name="refresh" size={16} color="#007AFF" />
                <Text style={styles.rotateButtonText}>Rotate Delegated Keys</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Request Delegation Modal */}
      <Modal
        visible={showRequestModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Company Delegation</Text>
              <TouchableOpacity
                onPress={() => setShowRequestModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Company AID *</Text>
              <TextInput
                style={styles.textInput}
                value={newDelegationRequest.delegatorAid || ''}
                onChangeText={(text) => setNewDelegationRequest(prev => ({...prev, delegatorAid: text}))}
                placeholder="Enter company AID (starts with E)"
                placeholderTextColor="#999"
              />

              <Text style={styles.inputLabel}>Purpose *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={newDelegationRequest.purpose || ''}
                onChangeText={(text) => setNewDelegationRequest(prev => ({...prev, purpose: text}))}
                placeholder="Describe the purpose of this delegation"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Permissions *</Text>
              <View style={styles.permissionsGrid}>
                {availablePermissions.map((permission) => (
                  <TouchableOpacity
                    key={permission}
                    style={[
                      styles.permissionCheckbox,
                      newDelegationRequest.permissions?.includes(permission) && styles.permissionChecked
                    ]}
                    onPress={() => togglePermission(permission)}
                  >
                    <Text style={[
                      styles.permissionCheckboxText,
                      newDelegationRequest.permissions?.includes(permission) && styles.permissionCheckedText
                    ]}>
                      {permission.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Expiry Date (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={newDelegationRequest.expiresAt || ''}
                onChangeText={(text) => setNewDelegationRequest(prev => ({...prev, expiresAt: text}))}
                placeholder="YYYY-MM-DD (leave empty for no expiry)"
                placeholderTextColor="#999"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowRequestModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalSubmitButton}
                onPress={handleRequestDelegation}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Request Delegation</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Processing delegation...</Text>
          </View>
        </View>
      )}

      {/* Information Footer */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>About Delegations</Text>
        <Text style={styles.infoText}>
          • Delegations create formal authority relationships with companies
        </Text>
        <Text style={styles.infoText}>
          • Companies can access only the permissions you delegate
        </Text>
        <Text style={styles.infoText}>
          • Delegated keys can be rotated independently of your main identity
        </Text>
        <Text style={styles.infoText}>
          • Revocation immediately terminates all company access
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  section: {
    marginTop: 16,
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 8,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
    textAlign: 'center',
  },
  delegationCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  delegationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  delegationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  delegationTitleInfo: {
    marginLeft: 12,
    flex: 1,
  },
  delegationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  delegationStatus: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  actionButton: {
    padding: 8,
  },
  delegationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  delegationInfoLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  delegationInfoValue: {
    fontSize: 14,
    color: '#212529',
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  permissionsSection: {
    marginTop: 12,
  },
  permissionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  permissionTag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  permissionText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  rotationInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  rotationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  rotationDate: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  rotateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginTop: 12,
  },
  rotateButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#212529',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  permissionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  permissionCheckbox: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  permissionChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  permissionCheckboxText: {
    fontSize: 12,
    color: '#6c757d',
    textTransform: 'capitalize',
  },
  permissionCheckedText: {
    color: '#fff',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  modalCancelText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSubmitButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  modalSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#212529',
    marginTop: 12,
  },
  infoSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#e8f4fd',
    borderRadius: 12,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    marginVertical: 2,
  },
});

export default DelegationScreen;