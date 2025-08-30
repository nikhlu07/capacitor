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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { keyRotationService, KeyRotationEvent } from '../services/keyRotationService';

const KeyRotationScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentKeyInfo, setCurrentKeyInfo] = useState<any>(null);
  const [rotationHistory, setRotationHistory] = useState<KeyRotationEvent[]>([]);
  const [rotationRecommendation, setRotationRecommendation] = useState<any>(null);

  useEffect(() => {
    loadKeyInformation();
  }, []);

  const loadKeyInformation = async () => {
    try {
      const [keyInfo, history, recommendation] = await Promise.all([
        keyRotationService.getCurrentKeyInfo(),
        keyRotationService.getRotationHistory(),
        keyRotationService.shouldRotateKeys()
      ]);

      setCurrentKeyInfo(keyInfo);
      setRotationHistory(history);
      setRotationRecommendation(recommendation);
    } catch (error) {
      console.error('Failed to load key information:', error);
      Alert.alert('Error', 'Failed to load key information');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadKeyInformation();
    setRefreshing(false);
  };

  const handleRotateKeys = (isEmergency = false) => {
    const title = isEmergency ? 'Emergency Key Rotation' : 'Rotate Keys';
    const message = isEmergency 
      ? 'This will immediately rotate your keys. Use only if your keys may be compromised. Continue?'
      : 'This will create new cryptographic keys while maintaining your identity. Your AID will remain the same. Continue?';

    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Rotate Keys', 
          style: isEmergency ? 'destructive' : 'default',
          onPress: () => performKeyRotation(isEmergency)
        }
      ]
    );
  };

  const performKeyRotation = async (isEmergency = false) => {
    setLoading(true);
    try {
      const result = isEmergency 
        ? await keyRotationService.emergencyRotateKeys()
        : await keyRotationService.rotateKeys('user_requested');

      if (result.success) {
        Alert.alert(
          'Key Rotation Successful',
          `Your keys have been rotated successfully.\n\nNew sequence: ${result.rotationSequence}\nTimestamp: ${new Date(result.timestamp).toLocaleString()}`,
          [{ text: 'OK', onPress: () => loadKeyInformation() }]
        );
      } else {
        Alert.alert('Key Rotation Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Key rotation error:', error);
      Alert.alert('Error', 'Failed to rotate keys. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (shouldRotate: boolean) => {
    return shouldRotate ? '#ff6b6b' : '#51cf66';
  };

  const getStatusIcon = (shouldRotate: boolean) => {
    return shouldRotate ? 'warning' : 'checkmark-circle';
  };

  if (!currentKeyInfo) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading key information...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="key" size={32} color="#007AFF" />
        <Text style={styles.headerTitle}>Key Management</Text>
        <Text style={styles.headerSubtitle}>Manage your KERI cryptographic keys</Text>
      </View>

      {/* Current Key Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Key Status</Text>
        
        <View style={styles.keyInfoCard}>
          <View style={styles.keyInfoRow}>
            <Text style={styles.keyInfoLabel}>Identity (AID):</Text>
            <Text style={styles.keyInfoValue}>
              {currentKeyInfo.aid.substring(0, 12)}...
            </Text>
          </View>
          
          <View style={styles.keyInfoRow}>
            <Text style={styles.keyInfoLabel}>Key Sequence:</Text>
            <Text style={styles.keyInfoValue}>{currentKeyInfo.sequence}</Text>
          </View>
          
          {currentKeyInfo.lastRotation && (
            <View style={styles.keyInfoRow}>
              <Text style={styles.keyInfoLabel}>Last Rotation:</Text>
              <Text style={styles.keyInfoValue}>
                {formatDate(currentKeyInfo.lastRotation)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Rotation Recommendation */}
      {rotationRecommendation && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rotation Status</Text>
          
          <View style={[
            styles.recommendationCard,
            { borderColor: getStatusColor(rotationRecommendation.shouldRotate) }
          ]}>
            <View style={styles.recommendationHeader}>
              <Ionicons 
                name={getStatusIcon(rotationRecommendation.shouldRotate)}
                size={24} 
                color={getStatusColor(rotationRecommendation.shouldRotate)}
              />
              <Text style={[
                styles.recommendationText,
                { color: getStatusColor(rotationRecommendation.shouldRotate) }
              ]}>
                {rotationRecommendation.reason}
              </Text>
            </View>
            
            {rotationRecommendation.daysSinceLastRotation && (
              <Text style={styles.recommendationDetail}>
                Last rotation: {rotationRecommendation.daysSinceLastRotation} days ago
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: rotationRecommendation?.shouldRotate ? '#007AFF' : '#f8f9fa' }
          ]}
          onPress={() => handleRotateKeys(false)}
          disabled={loading}
        >
          <Ionicons name="refresh" size={20} color={rotationRecommendation?.shouldRotate ? "#fff" : "#6c757d"} />
          <Text style={[
            styles.actionButtonText,
            { color: rotationRecommendation?.shouldRotate ? "#fff" : "#6c757d" }
          ]}>
            Rotate Keys
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.emergencyButton]}
          onPress={() => handleRotateKeys(true)}
          disabled={loading}
        >
          <Ionicons name="warning" size={20} color="#ff6b6b" />
          <Text style={[styles.actionButtonText, { color: '#ff6b6b' }]}>
            Emergency Rotation
          </Text>
        </TouchableOpacity>
      </View>

      {/* Rotation History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rotation History</Text>
        
        {rotationHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time" size={48} color="#6c757d" />
            <Text style={styles.emptyStateText}>No rotation history</Text>
          </View>
        ) : (
          rotationHistory.map((event, index) => (
            <View key={event.rotationId} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historySequence}>
                  Sequence {event.rotationSequence}
                </Text>
                <Text style={styles.historyDate}>
                  {formatDate(event.timestamp)}
                </Text>
              </View>
              
              <Text style={styles.historyId}>
                Rotation ID: {event.rotationId}
              </Text>
              
              <View style={styles.historyKeyInfo}>
                <Text style={styles.historyKeyLabel}>Old Key:</Text>
                <Text style={styles.historyKeyValue}>{event.oldKeyHash}</Text>
              </View>
              
              <View style={styles.historyKeyInfo}>
                <Text style={styles.historyKeyLabel}>New Key:</Text>
                <Text style={styles.historyKeyValue}>{event.newKeyHash}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingOverlayText}>Rotating Keys...</Text>
            <Text style={styles.loadingOverlaySubtext}>
              This may take a few moments while we coordinate with witnesses
            </Text>
          </View>
        </View>
      )}

      {/* Information Footer */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>About Key Rotation</Text>
        <Text style={styles.infoText}>
          • Key rotation creates new cryptographic keys while preserving your identity
        </Text>
        <Text style={styles.infoText}>
          • Your AID (identity) remains the same, only the keys change
        </Text>
        <Text style={styles.infoText}>
          • Companies will automatically receive your updated public keys
        </Text>
        <Text style={styles.infoText}>
          • Rotation is cryptographically proven using your previous key
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
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
  keyInfoCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
  },
  keyInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  keyInfoLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  keyInfoValue: {
    fontSize: 14,
    color: '#212529',
    fontFamily: 'monospace',
  },
  recommendationCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  recommendationDetail: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  emergencyButton: {
    backgroundColor: '#fff5f5',
    borderColor: '#ff6b6b',
  },
  actionButtonText: {
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
  },
  historyCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historySequence: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  historyDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  historyId: {
    fontSize: 12,
    color: '#6c757d',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  historyKeyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  historyKeyLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  historyKeyValue: {
    fontSize: 12,
    color: '#212529',
    fontFamily: 'monospace',
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
    marginHorizontal: 32,
  },
  loadingOverlayText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginTop: 16,
  },
  loadingOverlaySubtext: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 8,
    textAlign: 'center',
  },
  infoSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#e3f2fd',
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

export default KeyRotationScreen;