import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { credentialService } from '../services/credentialService';
import { signifyService } from '../services/signifyService';
import { contextCardService } from '../services/contextCardService';

interface RouteParams {
  credentialSaid?: string;
  credentialData?: any;
}

interface SelectedData {
  flightPreferences: boolean;
  hotelPreferences: boolean;
  accessibilityNeeds: boolean;
  emergencyContact: boolean;
  dietaryRequirements: boolean;
}

const DataSharingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { credentialSaid, credentialData } = route.params as RouteParams || {};

  const [selectedData, setSelectedData] = useState<SelectedData>({
    flightPreferences: false,
    hotelPreferences: false,
    accessibilityNeeds: false,
    emergencyContact: false,
    dietaryRequirements: false,
  });

  const [recipientAID, setRecipientAID] = useState('');
  const [companyName, setCompanyName] = useState('Scania');
  const [purpose, setPurpose] = useState('Travel booking assistance');
  const [isSharing, setIsSharing] = useState(false);

  // Pre-fill Scania's AID for demo
  useEffect(() => {
    setRecipientAID('EScania_HR_System_AID_12345678901234567890');
  }, []);

  const handleDataToggle = (field: keyof SelectedData) => {
    setSelectedData(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleShareData = async () => {
    if (!recipientAID.trim()) {
      Alert.alert('Error', 'Please enter the recipient AID');
      return;
    }

    const selectedFields = Object.entries(selectedData)
      .filter(([_, isSelected]) => isSelected)
      .map(([field, _]) => field);

    if (selectedFields.length === 0) {
      Alert.alert('Error', 'Please select at least one field to share');
      return;
    }

    setIsSharing(true);

    try {
      console.log('🔄 Creating encrypted context card with real X25519 encryption');
      
      // Get employee AID from SignifyTS
      const client = await signifyService.getClient();
      if (!client) {
        throw new Error('SignifyTS client not available');
      }
      
      // Get employee AID from storage
      const { storageService } = await import('../services/storage');
      const employeeData = await storageService.getEmployeeData();
      if (!employeeData?.aid) {
        Alert.alert('Authentication Required', 'Please register first');
        return;
      }
      const employeeAid = employeeData.aid;
      
      // Prepare selected travel data based on toggles
      const selectedTravelData: any = {};
      
      if (selectedData.flightPreferences) {
        selectedTravelData.flightPreferences = {
          preferredAirlines: ['SAS', 'Lufthansa'],
          seatPreference: 'Aisle',
          mealPreference: 'Vegetarian',
          frequentFlyerNumbers: { 'SAS': '12345', 'Lufthansa': '67890' }
        };
      }
      
      if (selectedData.hotelPreferences) {
        selectedTravelData.hotelPreferences = {
          preferredChains: ['Hilton', 'Marriott'],
          roomType: 'Standard',
          amenities: ['WiFi', 'Gym'],
          loyaltyPrograms: { 'Hilton': 'Gold', 'Marriott': 'Silver' }
        };
      }
      
      if (selectedData.accessibilityNeeds) {
        selectedTravelData.accessibilityNeeds = {
          mobilityAssistance: false,
          visualAssistance: false,
          hearingAssistance: false,
          specialRequirements: []
        };
      }
      
      if (selectedData.emergencyContact) {
        selectedTravelData.emergencyContact = {
          name: 'John Smith',
          phone: '+46-123-456-789',
          relationship: 'Spouse',
          email: 'john.smith@email.com'
        };
      }
      
      if (selectedData.dietaryRequirements) {
        selectedTravelData.dietaryRequirements = {
          allergies: ['Nuts'],
          restrictions: ['Vegetarian'],
          preferences: ['Organic']
        };
      }

      // Create encrypted context card
      const contextCard = await contextCardService.createContextCard({
        employeeAid,
        companyAid: recipientAID,
        companyName,
        selectedData: selectedTravelData,
        selectedFields,
        purpose,
        credentialSaid: credentialSaid || 'travel-credential-said'
      });

      console.log('✅ Context card created with real X25519 encryption:', contextCard.id);

      Alert.alert(
        'Data Shared Successfully! 🎉',
        `Your selected travel data has been securely encrypted and shared with ${companyName}.\n\nContext Card ID: ${contextCard.id}\n\nThey can access your approved data through our secure API. You maintain full control and can revoke access anytime.`,
        [
          {
            text: 'View Details',
            onPress: () => {
              // Navigate to context card management
              navigation.goBack();
            }
          },
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
          }
        ]
      );

    } catch (error) {
      console.error('❌ Failed to create context card:', error);
      Alert.alert(
        'Sharing Failed',
        `Failed to create encrypted context card: ${error.message}`
      );
    } finally {
      setIsSharing(false);
    }
  };

  const getSelectedCount = () => {
    return Object.values(selectedData).filter(Boolean).length;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share Data via Context Card</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Context Card Explanation */}
        <View style={styles.explanationCard}>
          <Ionicons name="information-circle" size={24} color="#3498db" />
          <View style={styles.explanationText}>
            <Text style={styles.explanationTitle}>Context Card Sharing</Text>
            <Text style={styles.explanationDescription}>
              Your data will be encrypted with X25519 and stored as a context card in our database. 
              You maintain full control and can revoke access anytime.
            </Text>
          </View>
        </View>

        {/* Recipient Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recipient Details</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Company Name</Text>
            <TextInput
              style={styles.input}
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="Enter company name"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Recipient AID</Text>
            <TextInput
              style={[styles.input, styles.aidInput]}
              value={recipientAID}
              onChangeText={setRecipientAID}
              placeholder="Enter recipient's KERI AID"
              multiline
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Purpose</Text>
            <TextInput
              style={styles.input}
              value={purpose}
              onChangeText={setPurpose}
              placeholder="Purpose of data sharing"
            />
          </View>
        </View>

        {/* Selected Count */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            {getSelectedCount()} of 5 data fields selected for encrypted sharing
          </Text>
        </View>

        {/* Data Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Data to Share</Text>
          
          <View style={styles.dataItem}>
            <View style={styles.dataInfo}>
              <Ionicons name="airplane-outline" size={20} color="#3498db" />
              <View style={styles.dataDetails}>
                <Text style={styles.dataTitle}>Flight Preferences</Text>
                <Text style={styles.dataDescription}>Airlines, seating, meals, FF numbers</Text>
              </View>
            </View>
            <Switch
              value={selectedData.flightPreferences}
              onValueChange={() => handleDataToggle('flightPreferences')}
              trackColor={{ false: '#bdc3c7', true: '#3498db' }}
              thumbColor={selectedData.flightPreferences ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.dataItem}>
            <View style={styles.dataInfo}>
              <Ionicons name="bed-outline" size={20} color="#e67e22" />
              <View style={styles.dataDetails}>
                <Text style={styles.dataTitle}>Hotel Preferences</Text>
                <Text style={styles.dataDescription}>Room type, amenities, loyalty programs</Text>
              </View>
            </View>
            <Switch
              value={selectedData.hotelPreferences}
              onValueChange={() => handleDataToggle('hotelPreferences')}
              trackColor={{ false: '#bdc3c7', true: '#e67e22' }}
              thumbColor={selectedData.hotelPreferences ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.dataItem}>
            <View style={styles.dataInfo}>
              <Ionicons name="accessibility-outline" size={20} color="#9b59b6" />
              <View style={styles.dataDetails}>
                <Text style={styles.dataTitle}>Accessibility Needs</Text>
                <Text style={styles.dataDescription}>Mobility assistance, special requirements</Text>
              </View>
            </View>
            <Switch
              value={selectedData.accessibilityNeeds}
              onValueChange={() => handleDataToggle('accessibilityNeeds')}
              trackColor={{ false: '#bdc3c7', true: '#9b59b6' }}
              thumbColor={selectedData.accessibilityNeeds ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.dataItem}>
            <View style={styles.dataInfo}>
              <Ionicons name="call-outline" size={20} color="#e74c3c" />
              <View style={styles.dataDetails}>
                <Text style={styles.dataTitle}>Emergency Contact</Text>
                <Text style={styles.dataDescription}>Name, phone, relationship</Text>
              </View>
            </View>
            <Switch
              value={selectedData.emergencyContact}
              onValueChange={() => handleDataToggle('emergencyContact')}
              trackColor={{ false: '#bdc3c7', true: '#e74c3c' }}
              thumbColor={selectedData.emergencyContact ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.dataItem}>
            <View style={styles.dataInfo}>
              <Ionicons name="restaurant-outline" size={20} color="#27ae60" />
              <View style={styles.dataDetails}>
                <Text style={styles.dataTitle}>Dietary Requirements</Text>
                <Text style={styles.dataDescription}>Allergies, restrictions, preferences</Text>
              </View>
            </View>
            <Switch
              value={selectedData.dietaryRequirements}
              onValueChange={() => handleDataToggle('dietaryRequirements')}
              trackColor={{ false: '#bdc3c7', true: '#27ae60' }}
              thumbColor={selectedData.dietaryRequirements ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* KERI Security Info */}
        <View style={styles.securitySection}>
          <Text style={styles.sectionTitle}>Security & Privacy</Text>
          
          <View style={styles.securityItem}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#27ae60" />
            <Text style={styles.securityText}>KERI protocol encryption (X25519 + libsodium)</Text>
          </View>
          
          <View style={styles.securityItem}>
            <Ionicons name="key-outline" size={20} color="#3498db" />
            <Text style={styles.securityText}>Employee-controlled context card with selective disclosure</Text>
          </View>
          
          <View style={styles.securityItem}>
            <Ionicons name="people-outline" size={20} color="#9b59b6" />
            <Text style={styles.securityText}>Validated by witness network consensus</Text>
          </View>

          <View style={styles.securityItem}>
            <Ionicons name="eye-off-outline" size={20} color="#e67e22" />
            <Text style={styles.securityText}>Encrypted storage with employee access control</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.shareButton, isSharing && styles.shareButtonDisabled]}
          onPress={handleShareData}
          disabled={isSharing}
        >
          <Text style={styles.shareButtonText}>
            {isSharing ? 'Creating Context Card...' : 'Create Encrypted Context Card'}
          </Text>
        </TouchableOpacity>
      </View>
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
  explanationCard: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
  },
  explanationText: {
    flex: 1,
    marginLeft: 12,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  explanationDescription: {
    fontSize: 14,
    color: '#1565c0',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  aidInput: {
    height: 60,
    textAlignVertical: 'top',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  summaryContainer: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    fontWeight: '500',
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dataInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dataDetails: {
    marginLeft: 12,
    flex: 1,
  },
  dataTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  dataDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  securitySection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  securityText: {
    fontSize: 14,
    color: '#2c3e50',
    marginLeft: 12,
    flex: 1,
  },
  bottomContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  shareButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  shareButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DataSharingScreen;