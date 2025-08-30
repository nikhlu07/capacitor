import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { contextCardService } from '../services/contextCardService';

interface ContextCard {
  id: string;
  employeeAid: string;
  companyAid: string;
  companyName: string;
  sharedFields: string[];
  purpose: string;
  isActive: boolean;
  accessGrantedAt: string;
  expiresAt?: string;
  lastAccessedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const ContextCardManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const [contextCards, setContextCards] = useState<ContextCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get employee AID from storage/authentication
  const [employeeAid, setEmployeeAid] = useState<string | null>(null);
  
  useEffect(() => {
    loadEmployeeAid();
  }, []);
  
  const loadEmployeeAid = async () => {
    try {
      const { storageService } = await import('../services/storage');
      const employeeData = await storageService.getEmployeeData();
      if (employeeData?.aid) {
        setEmployeeAid(employeeData.aid);
      } else {
        Alert.alert('Authentication Required', 'Please register first');
        navigation.navigate('Registration' as never);
      }
    } catch (error) {
      console.error('Failed to load employee AID:', error);
      Alert.alert('Error', 'Failed to load your identity');
    }
  };

  useEffect(() => {
    if (employeeAid) {
      loadContextCards();
    }
  }, [employeeAid]);

  const loadContextCards = async () => {
    if (!employeeAid) return;
    
    try {
      setLoading(true);
      const cards = await contextCardService.getEmployeeContextCards(employeeAid);
      setContextCards(cards);
    } catch (error) {
      console.error('Failed to load context cards:', error);
      Alert.alert('Error', 'Failed to load your context cards');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadContextCards();
    setRefreshing(false);
  };

  const handleRevokeCard = async (cardId: string, companyName: string) => {
    Alert.alert(
      'Revoke Access',
      `Are you sure you want to revoke ${companyName}'s access to your travel data? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await contextCardService.revokeContextCard(cardId);
              Alert.alert('Access Revoked', `${companyName} no longer has access to your data.`);
              await loadContextCards(); // Refresh the list
            } catch (error) {
              console.error('Failed to revoke context card:', error);
              Alert.alert('Error', 'Failed to revoke access. Please try again.');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFieldDisplayName = (field: string) => {
    const fieldNames: Record<string, string> = {
      flightPreferences: 'Flight Preferences',
      hotelPreferences: 'Hotel Preferences',
      accessibilityNeeds: 'Accessibility Needs',
      emergencyContact: 'Emergency Contact',
      dietaryRequirements: 'Dietary Requirements'
    };
    return fieldNames[field] || field;
  };

  const renderContextCard = (card: ContextCard) => {
    const isExpired = card.expiresAt && new Date(card.expiresAt) < new Date();
    
    return (
      <View key={card.id} style={[styles.cardContainer, !card.isActive && styles.inactiveCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{card.companyName}</Text>
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusDot, 
                card.isActive && !isExpired ? styles.activeDot : styles.inactiveDot
              ]} />
              <Text style={[
                styles.statusText,
                card.isActive && !isExpired ? styles.activeText : styles.inactiveText
              ]}>
                {!card.isActive ? 'Revoked' : isExpired ? 'Expired' : 'Active'}
              </Text>
            </View>
          </View>
          
          {card.isActive && !isExpired && (
            <TouchableOpacity
              style={styles.revokeButton}
              onPress={() => handleRevokeCard(card.id, card.companyName)}
            >
              <Ionicons name="close-circle" size={24} color="#e74c3c" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.cardContent}>
          <View style={styles.purposeContainer}>
            <Ionicons name="document-text-outline" size={16} color="#7f8c8d" />
            <Text style={styles.purposeText}>{card.purpose}</Text>
          </View>

          <View style={styles.sharedFieldsContainer}>
            <Text style={styles.sharedFieldsLabel}>Shared Data:</Text>
            <View style={styles.fieldTags}>
              {card.sharedFields.map((field, index) => (
                <View key={index} style={styles.fieldTag}>
                  <Text style={styles.fieldTagText}>{getFieldDisplayName(field)}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.dateInfo}>
              <Text style={styles.dateLabel}>Shared: {formatDate(card.createdAt)}</Text>
              {card.lastAccessedAt && (
                <Text style={styles.dateLabel}>Last accessed: {formatDate(card.lastAccessedAt)}</Text>
              )}
              {card.expiresAt && (
                <Text style={[
                  styles.dateLabel,
                  isExpired && styles.expiredText
                ]}>
                  Expires: {formatDate(card.expiresAt)}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Context Cards</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#3498db" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#3498db" />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Context Card Management</Text>
            <Text style={styles.infoDescription}>
              Manage companies' access to your travel data. You can revoke access anytime to stop data sharing.
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{contextCards.length}</Text>
            <Text style={styles.statLabel}>Total Cards</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {contextCards.filter(card => card.isActive).length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {contextCards.filter(card => !card.isActive).length}
            </Text>
            <Text style={styles.statLabel}>Revoked</Text>
          </View>
        </View>

        {/* Context Cards List */}
        <View style={styles.cardsSection}>
          <Text style={styles.sectionTitle}>Your Shared Data</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading your context cards...</Text>
            </View>
          ) : contextCards.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={48} color="#bdc3c7" />
              <Text style={styles.emptyTitle}>No Context Cards</Text>
              <Text style={styles.emptyDescription}>
                You haven't shared any travel data yet. Use the "Share Data" feature to create context cards.
              </Text>
            </View>
          ) : (
            contextCards.map(renderContextCard)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: '#1565c0',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  cardsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inactiveCard: {
    opacity: 0.7,
    backgroundColor: '#f8f9fa',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  activeDot: {
    backgroundColor: '#27ae60',
  },
  inactiveDot: {
    backgroundColor: '#e74c3c',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeText: {
    color: '#27ae60',
  },
  inactiveText: {
    color: '#e74c3c',
  },
  revokeButton: {
    padding: 4,
  },
  cardContent: {
    gap: 12,
  },
  purposeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  purposeText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  sharedFieldsContainer: {
    gap: 8,
  },
  sharedFieldsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  fieldTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fieldTag: {
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fieldTagText: {
    fontSize: 12,
    color: '#2c3e50',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingTop: 12,
  },
  dateInfo: {
    gap: 2,
  },
  dateLabel: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  expiredText: {
    color: '#e74c3c',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ContextCardManagementScreen;