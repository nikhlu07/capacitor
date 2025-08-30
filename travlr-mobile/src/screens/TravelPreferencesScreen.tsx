import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { signifyService } from '../services/signifyService';

interface PreferenceSectionProps {
  title: string;
  description: string;
  isExpanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

const PreferenceSection: React.FC<PreferenceSectionProps> = ({
  title,
  description,
  isExpanded,
  onToggle,
  children,
}) => (
  <View style={styles.sectionContainer}>
    <TouchableOpacity style={styles.sectionHeader} onPress={onToggle}>
      <View style={styles.sectionHeaderContent}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#1c170d"
        />
      </View>
    </TouchableOpacity>
    
    {!isExpanded && (
      <Text style={styles.sectionDescription}>{description}</Text>
    )}
    
    {isExpanded && children && (
      <View style={styles.sectionContent}>
        {children}
      </View>
    )}
  </View>
);

const TravelPreferencesScreen: React.FC = () => {
  const navigation = useNavigation();
  
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    flight: true, // Flight preferences expanded by default
    hotel: false,
    accessibility: false,
    emergency: false,
  });

  // Dynamic travel preferences state
  const [travelPrefs, setTravelPrefs] = useState({
    preferred_airlines: [],
    seat_preference: '',
    class_preference: '',
    meal_preference: '',
    preferred_hotel_chains: [],
    room_type: '',
    smoking_preference: '',
    mobility_assistance: false,
    wheelchair_required: false,
    visual_impairment: false,
    hearing_impairment: false,
    emergency_contact: {
      name: '',
      relationship: '',
      phone: '',
      email: ''
    }
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleEdit = () => {
    console.log('Edit preferences pressed');
    setIsEditing(!isEditing);
  };

  const loadTravelPreferences = async () => {
    try {
      setIsLoading(true);
      const { storageService } = await import('../services/storage');
      const savedPrefs = await storageService.getTravelPreferences();
      
      if (savedPrefs) {
        setTravelPrefs(savedPrefs);
      } else {
        // Set empty defaults for new users
        setTravelPrefs({
          preferred_airlines: [],
          seat_preference: '',
          class_preference: '',
          meal_preference: '',
          preferred_hotel_chains: [],
          room_type: '',
          smoking_preference: '',
          mobility_assistance: false,
          wheelchair_required: false,
          visual_impairment: false,
          hearing_impairment: false,
          emergency_contact: {
            name: '',
            relationship: '',
            phone: '',
            email: ''
          }
        });
      }
    } catch (error) {
      console.error('Failed to load travel preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadTravelPreferences();
  }, []);

  const handleSaveChanges = async () => {
    try {
      console.log('🔐 Saving encrypted travel preferences...');
      
      // Get real employee data from storage
      const { storageService } = await import('../services/storage');
      const employeeData = await storageService.getEmployeeData();
      if (!employeeData) {
        Alert.alert('Registration Required', 'Please complete registration first.');
        return;
      }

      // Use current travel preferences data
      const travelPreferencesData = {
        employee_id: employeeData.employee_id,
        full_name: employeeData.full_name,
        ...travelPrefs
      };

      // Save to local storage first
      await storageService.saveTravelPreferences(travelPrefs);

      // Try to create ACDC credential via SignifyTS first
      try {
        const schemaSaid = 'EBdXt3gIXOf2BBWNHdSXCJnkcqRLlySbM-xPS7quPiM';
        const credentialPayload = {
          employee_info: {
            employee_id: employeeData.employee_id,
            full_name: employeeData.full_name,
            department: employeeData.department,
            email: employeeData.email,
            phone: employeeData.phone
          },
          travel_preferences: {
            flight_preferences: {
              preferred_airlines: travelPrefs.preferred_airlines,
              seating_preference: travelPrefs.seat_preference,
              meal_preference: travelPrefs.meal_preference,
              class_preference: travelPrefs.class_preference
            },
            hotel_preferences: {
              preferred_chains: travelPrefs.preferred_hotel_chains,
              room_type: travelPrefs.room_type,
              smoking_preference: travelPrefs.smoking_preference
            },
            accessibility_needs: {
              mobility_assistance: travelPrefs.mobility_assistance,
              wheelchair_required: travelPrefs.wheelchair_required,
              visual_assistance: travelPrefs.visual_impairment,
              hearing_assistance: travelPrefs.hearing_impairment
            },
            emergency_contact: travelPrefs.emergency_contact
          },
          metadata: {
            issued_via: 'signify_mobile',
            credential_type: 'ScaniaEmployeeTravelPreferencesCredential',
            version: '1.0.0',
            issued_at: new Date().toISOString()
          }
        };

        const result = await signifyService.issueCredential(
          employeeData.aid,
          credentialPayload,
          { said: schemaSaid, title: 'Scania Employee Travel Preferences Credential' }
        );

        console.log('✅ Travel credential created via SignifyTS:', result.said);
      } catch (sigError) {
        console.warn('⚠️ SignifyTS issuance failed. Skipping backend issuance per Veridian pattern:', sigError);
      }

      setIsEditing(false);
      Alert.alert(
        'Preferences Saved',
        'Your travel preferences have been saved successfully!',
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('❌ Failed to save encrypted preferences:', error);
      Alert.alert(
        'Save Failed',
        'Failed to save your travel preferences. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleBack = () => {
    console.log('Back pressed');
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fallback navigation to main screen
      navigation.navigate('Main' as never);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1c170d" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Travel Preferences</Text>
        <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
          <Ionicons name={isEditing ? "checkmark-outline" : "pencil-outline"} size={24} color="#1c170d" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Flight Preferences */}
        <PreferenceSection
          title="Flight Preferences"
          description="Select your preferred airlines, seat types, and meal options."
          isExpanded={expandedSections.flight}
          onToggle={() => toggleSection('flight')}
        >
          <View style={styles.preferenceContent}>
            <Text style={styles.preferenceLabel}>Preferred Airlines</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={travelPrefs.preferred_airlines.join(', ')}
                onChangeText={(text) => setTravelPrefs(prev => ({
                  ...prev,
                  preferred_airlines: text.split(',').map(airline => airline.trim()).filter(airline => airline)
                }))}
                placeholder="Enter airlines separated by commas"
                placeholderTextColor="#9b844b"
              />
            ) : (
              <Text style={styles.preferenceValue}>
                {travelPrefs.preferred_airlines.length > 0 
                  ? travelPrefs.preferred_airlines.join(', ') 
                  : 'Not specified'}
              </Text>
            )}
            
            <Text style={styles.preferenceLabel}>Seat Preference</Text>
            {isEditing ? (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={travelPrefs.seat_preference}
                  style={styles.picker}
                  onValueChange={(itemValue) => setTravelPrefs(prev => ({
                    ...prev,
                    seat_preference: itemValue
                  }))}
                >
                  <Picker.Item label="Select seat preference" value="" />
                  <Picker.Item label="Window" value="window" />
                  <Picker.Item label="Aisle" value="aisle" />
                  <Picker.Item label="Middle" value="middle" />
                  <Picker.Item label="No preference" value="no_preference" />
                </Picker>
              </View>
            ) : (
              <Text style={styles.preferenceValue}>
                {travelPrefs.seat_preference || 'Not specified'}
              </Text>
            )}
            
            <Text style={styles.preferenceLabel}>Class Preference</Text>
            {isEditing ? (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={travelPrefs.class_preference}
                  style={styles.picker}
                  onValueChange={(itemValue) => setTravelPrefs(prev => ({
                    ...prev,
                    class_preference: itemValue
                  }))}
                >
                  <Picker.Item label="Select class preference" value="" />
                  <Picker.Item label="Economy" value="economy" />
                  <Picker.Item label="Premium Economy" value="premium_economy" />
                  <Picker.Item label="Business" value="business" />
                  <Picker.Item label="First" value="first" />
                </Picker>
              </View>
            ) : (
              <Text style={styles.preferenceValue}>
                {travelPrefs.class_preference || 'Not specified'}
              </Text>
            )}
            
            <Text style={styles.preferenceLabel}>Meal Preference</Text>
            {isEditing ? (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={travelPrefs.meal_preference}
                  style={styles.picker}
                  onValueChange={(itemValue) => setTravelPrefs(prev => ({
                    ...prev,
                    meal_preference: itemValue
                  }))}
                >
                  <Picker.Item label="Select meal preference" value="" />
                  <Picker.Item label="Regular" value="regular" />
                  <Picker.Item label="Vegetarian" value="vegetarian" />
                  <Picker.Item label="Vegan" value="vegan" />
                  <Picker.Item label="Kosher" value="kosher" />
                  <Picker.Item label="Halal" value="halal" />
                  <Picker.Item label="Gluten Free" value="gluten_free" />
                  <Picker.Item label="Low Sodium" value="low_sodium" />
                </Picker>
              </View>
            ) : (
              <Text style={styles.preferenceValue}>
                {travelPrefs.meal_preference || 'Not specified'}
              </Text>
            )}
          </View>
        </PreferenceSection>

        {/* Hotel Preferences */}
        <PreferenceSection
          title="Hotel Preferences"
          description="Choose your preferred hotel chains, room types, and amenities."
          isExpanded={expandedSections.hotel}
          onToggle={() => toggleSection('hotel')}
        >
          <View style={styles.preferenceContent}>
            <Text style={styles.preferenceLabel}>Preferred Chains</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={travelPrefs.preferred_hotel_chains.join(', ')}
                onChangeText={(text) => setTravelPrefs(prev => ({
                  ...prev,
                  preferred_hotel_chains: text.split(',').map(chain => chain.trim()).filter(chain => chain)
                }))}
                placeholder="Enter hotel chains separated by commas"
                placeholderTextColor="#9b844b"
              />
            ) : (
              <Text style={styles.preferenceValue}>
                {travelPrefs.preferred_hotel_chains.length > 0 
                  ? travelPrefs.preferred_hotel_chains.join(', ') 
                  : 'Not specified'}
              </Text>
            )}
            
            <Text style={styles.preferenceLabel}>Room Type</Text>
            {isEditing ? (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={travelPrefs.room_type}
                  style={styles.picker}
                  onValueChange={(itemValue) => setTravelPrefs(prev => ({
                    ...prev,
                    room_type: itemValue
                  }))}
                >
                  <Picker.Item label="Select room type" value="" />
                  <Picker.Item label="Single" value="single" />
                  <Picker.Item label="Double" value="double" />
                  <Picker.Item label="Suite" value="suite" />
                  <Picker.Item label="Executive" value="executive" />
                </Picker>
              </View>
            ) : (
              <Text style={styles.preferenceValue}>
                {travelPrefs.room_type || 'Not specified'}
              </Text>
            )}
            
            <Text style={styles.preferenceLabel}>Smoking Preference</Text>
            {isEditing ? (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={travelPrefs.smoking_preference}
                  style={styles.picker}
                  onValueChange={(itemValue) => setTravelPrefs(prev => ({
                    ...prev,
                    smoking_preference: itemValue
                  }))}
                >
                  <Picker.Item label="Select smoking preference" value="" />
                  <Picker.Item label="Non-smoking" value="non_smoking" />
                  <Picker.Item label="Smoking" value="smoking" />
                  <Picker.Item label="No preference" value="no_preference" />
                </Picker>
              </View>
            ) : (
              <Text style={styles.preferenceValue}>
                {travelPrefs.smoking_preference || 'Not specified'}
              </Text>
            )}
          </View>
        </PreferenceSection>

        {/* Accessibility Needs */}
        <PreferenceSection
          title="Accessibility Needs"
          description="Specify any accessibility requirements for your travel."
          isExpanded={expandedSections.accessibility}
          onToggle={() => toggleSection('accessibility')}
        >
          <View style={styles.preferenceContent}>
            <View style={styles.switchRow}>
              <Text style={styles.preferenceLabel}>Mobility Assistance</Text>
              {isEditing ? (
                <Switch
                  value={travelPrefs.mobility_assistance}
                  onValueChange={(value) => setTravelPrefs(prev => ({
                    ...prev,
                    mobility_assistance: value
                  }))}
                  trackColor={{ false: '#e8e1cf', true: '#f4c653' }}
                  thumbColor={travelPrefs.mobility_assistance ? '#1c170d' : '#9b844b'}
                />
              ) : (
                <Text style={styles.preferenceValue}>
                  {travelPrefs.mobility_assistance ? 'Required' : 'Not required'}
                </Text>
              )}
            </View>
            
            <View style={styles.switchRow}>
              <Text style={styles.preferenceLabel}>Wheelchair Required</Text>
              {isEditing ? (
                <Switch
                  value={travelPrefs.wheelchair_required}
                  onValueChange={(value) => setTravelPrefs(prev => ({
                    ...prev,
                    wheelchair_required: value
                  }))}
                  trackColor={{ false: '#e8e1cf', true: '#f4c653' }}
                  thumbColor={travelPrefs.wheelchair_required ? '#1c170d' : '#9b844b'}
                />
              ) : (
                <Text style={styles.preferenceValue}>
                  {travelPrefs.wheelchair_required ? 'Yes' : 'No'}
                </Text>
              )}
            </View>
            
            <View style={styles.switchRow}>
              <Text style={styles.preferenceLabel}>Visual Impairment</Text>
              {isEditing ? (
                <Switch
                  value={travelPrefs.visual_impairment}
                  onValueChange={(value) => setTravelPrefs(prev => ({
                    ...prev,
                    visual_impairment: value
                  }))}
                  trackColor={{ false: '#e8e1cf', true: '#f4c653' }}
                  thumbColor={travelPrefs.visual_impairment ? '#1c170d' : '#9b844b'}
                />
              ) : (
                <Text style={styles.preferenceValue}>
                  {travelPrefs.visual_impairment ? 'Yes' : 'No'}
                </Text>
              )}
            </View>
            
            <View style={styles.switchRow}>
              <Text style={styles.preferenceLabel}>Hearing Impairment</Text>
              {isEditing ? (
                <Switch
                  value={travelPrefs.hearing_impairment}
                  onValueChange={(value) => setTravelPrefs(prev => ({
                    ...prev,
                    hearing_impairment: value
                  }))}
                  trackColor={{ false: '#e8e1cf', true: '#f4c653' }}
                  thumbColor={travelPrefs.hearing_impairment ? '#1c170d' : '#9b844b'}
                />
              ) : (
                <Text style={styles.preferenceValue}>
                  {travelPrefs.hearing_impairment ? 'Yes' : 'No'}
                </Text>
              )}
            </View>
          </View>
        </PreferenceSection>

        {/* Emergency Contact */}
        <PreferenceSection
          title="Emergency Contact"
          description="Provide emergency contact information for your travels."
          isExpanded={expandedSections.emergency}
          onToggle={() => toggleSection('emergency')}
        >
          <View style={styles.preferenceContent}>
            <Text style={styles.preferenceLabel}>Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={travelPrefs.emergency_contact.name}
                onChangeText={(text) => setTravelPrefs(prev => ({
                  ...prev,
                  emergency_contact: { ...prev.emergency_contact, name: text }
                }))}
                placeholder="Emergency contact name"
                placeholderTextColor="#9b844b"
              />
            ) : (
              <Text style={styles.preferenceValue}>
                {travelPrefs.emergency_contact.name || 'Not specified'}
              </Text>
            )}
            
            <Text style={styles.preferenceLabel}>Relationship</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={travelPrefs.emergency_contact.relationship}
                onChangeText={(text) => setTravelPrefs(prev => ({
                  ...prev,
                  emergency_contact: { ...prev.emergency_contact, relationship: text }
                }))}
                placeholder="Relationship (e.g., Spouse, Parent)"
                placeholderTextColor="#9b844b"
              />
            ) : (
              <Text style={styles.preferenceValue}>
                {travelPrefs.emergency_contact.relationship || 'Not specified'}
              </Text>
            )}
            
            <Text style={styles.preferenceLabel}>Phone</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={travelPrefs.emergency_contact.phone}
                onChangeText={(text) => setTravelPrefs(prev => ({
                  ...prev,
                  emergency_contact: { ...prev.emergency_contact, phone: text }
                }))}
                placeholder="Phone number"
                placeholderTextColor="#9b844b"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.preferenceValue}>
                {travelPrefs.emergency_contact.phone || 'Not specified'}
              </Text>
            )}
            
            <Text style={styles.preferenceLabel}>Email</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={travelPrefs.emergency_contact.email}
                onChangeText={(text) => setTravelPrefs(prev => ({
                  ...prev,
                  emergency_contact: { ...prev.emergency_contact, email: text }
                }))}
                placeholder="Email address"
                placeholderTextColor="#9b844b"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : (
              <Text style={styles.preferenceValue}>
                {travelPrefs.emergency_contact.email || 'Not specified'}
              </Text>
            )}
          </View>
        </PreferenceSection>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Save Changes Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
          <Ionicons name="save-outline" size={24} color="#1c170d" />
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcfbf8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c170d',
    textAlign: 'center',
    letterSpacing: -0.015,
  },
  editButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionContainer: {
    borderWidth: 1,
    borderColor: '#e8e1cf',
    borderRadius: 12,
    backgroundColor: '#fcfbf8',
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    paddingHorizontal: 15,
    paddingVertical: 7,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1c170d',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#9b844b',
    paddingHorizontal: 15,
    paddingBottom: 8,
  },
  sectionContent: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  preferenceContent: {
    paddingTop: 8,
  },
  preferenceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1c170d',
    marginTop: 12,
    marginBottom: 4,
  },
  preferenceValue: {
    fontSize: 14,
    color: '#9b844b',
  },
  bottomSpacing: {
    height: 100, // Space for save button
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4c653',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 20,
    alignSelf: 'flex-end',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: '#1c170d',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 0.015,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e8e1cf',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1c170d',
    backgroundColor: '#fcfbf8',
    marginTop: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e8e1cf',
    borderRadius: 8,
    backgroundColor: '#fcfbf8',
    marginTop: 4,
  },
  picker: {
    height: 40,
    color: '#1c170d',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
});

export default TravelPreferencesScreen;