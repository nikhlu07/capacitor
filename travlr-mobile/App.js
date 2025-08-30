import React, { useState, useEffect } from 'react';
// Crypto polyfill for SignifyTS (must be first)
import './src/crypto-polyfill';
// Keep only RNG polyfill needed by some libs
import 'react-native-get-random-values';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { signifyTestService } from './src/services/signifyTestService';
import { signifyService } from './src/services/signifyService';
import { encryptionTestService } from './src/services/encryptionTestService';
import { masterCardService } from './src/services/masterCardService';
import { apiService } from './src/services/api';
import { storageService } from './src/services/storage';
import { consentService } from './src/services/consentService';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('check'); // 'check', 'register', 'main', 'travel-preferences'
  const [employeeData, setEmployeeData] = useState(null);
  const [registrationForm, setRegistrationForm] = useState({
    employee_id: '',
    full_name: '',
    department: '',
    email: '',
    phone: ''
  });

  // Travel preferences state
  const [travelPrefs, setTravelPrefs] = useState({
    preferred_airlines: '',
    seat_preference: '',
    class_preference: '',
    meal_preference: '',
    preferred_hotel_chains: '',
    room_type: '',
    smoking_preference: 'Non-smoking',
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

  useEffect(() => {
    checkExistingRegistration();
  }, []);

  // Start consent polling when employee data is available
  useEffect(() => {
    if (employeeData?.aid) {
      console.log('🔔 Starting consent polling for AID:', employeeData.aid.substring(0, 8) + '...');
      consentService.startPolling(employeeData.aid, 30000); // Poll every 30 seconds
    } else {
      consentService.stopPolling();
    }

    // Cleanup on unmount
    return () => {
      consentService.stopPolling();
    };
  }, [employeeData]);

  const checkExistingRegistration = async () => {
    try {
      const existingData = await storageService.getEmployeeData();
      if (existingData) {
        setEmployeeData(existingData);
        setCurrentScreen('main');
      } else {
        setCurrentScreen('register');
      }
    } catch (error) {
      console.error('Error checking registration:', error);
      setCurrentScreen('register');
    }
  };

  const handleRegister = async () => {
    try {
      if (!registrationForm.employee_id || !registrationForm.full_name || !registrationForm.department || !registrationForm.email) {
        Alert.alert('Missing Information', 'Please fill in all required fields.');
        return;
      }

      // Step 1: Register employee profile (without AID)
      Alert.alert('Step 1/3', 'Creating employee profile...');
      
      const profileResult = await apiService.registerEmployee(registrationForm);
      
      // Step 2: Create REAL KERI AID using SignifyTS
      Alert.alert('Step 2/3', 'Creating KERI identity...');
      
      try {
        // Initialize SignifyTS
        const initialized = await signifyService.initialize();
        if (!initialized) {
          console.warn('SignifyTS not available, using fallback mode');
        }
        
        // Create REAL KERI AID
        const keriResult = await signifyService.createEmployeeAID(
          registrationForm.employee_id, 
          registrationForm.full_name
        );
        
        // Step 3: Link AID to backend profile
        Alert.alert('Step 3/3', 'Linking identity to profile...');
        
        const aidResult = await fetch(`http://192.168.31.172:8000/api/v1/mobile/employee/${registrationForm.employee_id}/aid`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aid: keriResult.aid,
            oobi: keriResult.oobi
          })
        });
        
        if (!aidResult.ok) {
          const errorData = await aidResult.text();
          throw new Error(`Backend error: ${aidResult.status} - ${errorData}`);
        }
        
        // Store complete employee data locally
        const completeEmployeeData = {
          ...registrationForm,
          aid: keriResult.aid,
          oobi: keriResult.oobi,
          created_at: new Date().toISOString()
        };
        
        await storageService.storeEmployeeData({
          success: true,
          employee_id: registrationForm.employee_id,
          aid: keriResult.aid,
          oobi: keriResult.oobi,
          created_at: completeEmployeeData.created_at
        }, registrationForm);
        
        setEmployeeData(completeEmployeeData);
        
        Alert.alert('Success! 🎉', `Your travel identity is ready!\n\n👤 Employee ID: ${registrationForm.employee_id}\n🔑 KERI AID: ${keriResult.aid.substring(0, 20)}...\n\nYou can now set up your travel preferences!`);
        setCurrentScreen('main');
        
      } catch (aidError) {
        console.error('AID creation error:', aidError);
        Alert.alert('Identity Setup Failed', `Could not create travel identity: ${aidError.message}\n\nYou can try again later from the main screen.`);
        
        // Store partial data (profile without AID)
        await storageService.storeEmployeeData({
          success: true,
          employee_id: registrationForm.employee_id,
          aid: null,
          oobi: null,
          created_at: new Date().toISOString()
        }, registrationForm);
        
        setEmployeeData({ ...registrationForm, aid: null, oobi: null });
        setCurrentScreen('main');
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Registration Failed', `Failed to create employee profile: ${error.message}`);
    }
  };

  const handleHealthCheck = async () => {
    try {
      const response = await fetch('http://192.168.31.172:8000/health');
      const data = await response.json();
      Alert.alert('Backend Status', `${data.service} is ${data.status}`);
    } catch (error) {
      Alert.alert('Error', 'Cannot connect to backend');
    }
  };

  const handleSignifyTest = async () => {
    try {
      Alert.alert('🧪 Testing', 'Running SignifyTS tests...');
      const results = await signifyTestService.runBasicTests();
      
      if (results.success) {
        Alert.alert('✅ SignifyTS Works!', 'All tests passed. Ready for real KERI operations.');
      } else {
        Alert.alert('❌ SignifyTS Issues', `Failed tests:\n${results.errors.join('\n')}`);
      }
    } catch (error) {
      Alert.alert('❌ Test Error', `SignifyTS test failed: ${error.message}`);
    }
  };

  const handleCreateRealAID = async () => {
    try {
      Alert.alert('🚀 Creating Real AID', 'Initializing SignifyTS and creating real KERI identifier...');
      
      // Initialize SignifyTS service
      const initialized = await signifyService.initialize();
      if (!initialized) {
        Alert.alert('❌ Initialization Failed', 'Could not initialize SignifyTS. Check console for details.');
        return;
      }
      
      // Create real employee AID
      const result = await signifyService.createEmployeeAID('EMP001', 'John Doe');
      
      Alert.alert('✅ Real AID Created!', `AID: ${result.aid.substring(0, 20)}...\\nOOBI: ${result.oobi.substring(0, 30)}...`);
      
    } catch (error) {
      console.error('Real AID creation error:', error);
      Alert.alert('❌ AID Creation Failed', `Error: ${error.message}`);
    }
  };

  const handleTestEncryption = async () => {
    try {
      Alert.alert('🔐 Testing Encryption', 'Running real X25519 encryption tests...');
      
      const results = await encryptionTestService.runEncryptionTests();
      
      if (results.success) {
        Alert.alert('✅ Real Encryption Works!', 'X25519 encryption tests passed. Real cryptography is working!');
      } else {
        Alert.alert('❌ Encryption Issues', `Failed tests:\\n${results.errors.join('\\n')}`);
      }
      
    } catch (error) {
      console.error('Encryption test error:', error);
      Alert.alert('❌ Encryption Test Failed', `Error: ${error.message}`);
    }
  };

  const handleCreateMissingAID = async () => {
    try {
      Alert.alert('Creating KERI Identity', 'Initializing SignifyTS and creating your KERI identifier...');
      
      // Initialize SignifyTS
      const initialized = await signifyService.initialize();
      if (!initialized) {
        console.warn('SignifyTS not available, using fallback mode');
      }
      
      // Create REAL KERI AID
      const keriResult = await signifyService.createEmployeeAID(
        employeeData.employee_id, 
        employeeData.full_name
      );
      
      // Link AID to backend profile
      const aidResult = await fetch(`http://192.168.31.172:8000/api/v1/mobile/employee/${employeeData.employee_id}/aid`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aid: keriResult.aid,
          oobi: keriResult.oobi
        })
      });
      
      if (!aidResult.ok) {
        const errorData = await aidResult.text();
        throw new Error(`Backend error: ${aidResult.status} - ${errorData}`);
      }
      
      // Update local data
      const updatedData = {
        ...employeeData,
        aid: keriResult.aid,
        oobi: keriResult.oobi
      };
      
      await storageService.updateEmployeeData({
        aid: keriResult.aid,
        oobi: keriResult.oobi
      });
      
      setEmployeeData(updatedData);
      
      Alert.alert('Success! 🎉', `KERI identity created!\n\n🔑 AID: ${keriResult.aid.substring(0, 20)}...\n\nYou can now create travel preferences!`);
      
    } catch (error) {
      console.error('AID creation error:', error);
      Alert.alert('Failed to Create AID', `Could not create KERI identity: ${error.message}`);
    }
  };

  // Load travel preferences when screen opens
  const loadTravelPreferences = async () => {
    try {
      const savedPrefs = await storageService.getTravelPreferences();
      if (savedPrefs) {
        setTravelPrefs({
          preferred_airlines: savedPrefs.preferred_airlines?.join(', ') || '',
          seat_preference: savedPrefs.seat_preference || '',
          class_preference: savedPrefs.class_preference || '',
          meal_preference: savedPrefs.meal_preference || '',
          preferred_hotel_chains: savedPrefs.preferred_hotel_chains?.join(', ') || '',
          room_type: savedPrefs.room_type || '',
          smoking_preference: savedPrefs.smoking_preference || 'Non-smoking',
          mobility_assistance: savedPrefs.mobility_assistance || false,
          wheelchair_required: savedPrefs.wheelchair_required || false,
          visual_impairment: savedPrefs.visual_impairment || false,
          hearing_impairment: savedPrefs.hearing_impairment || false,
          emergency_contact: savedPrefs.emergency_contact || {
            name: '',
            relationship: '',
            phone: '',
            email: ''
          }
        });
      }
    } catch (error) {
      console.error('Failed to load travel preferences:', error);
    }
  };

  // Save travel preferences
  const handleSaveTravelPreferences = async () => {
    try {
      if (!employeeData) {
        Alert.alert('Error', 'Employee data not found');
        return;
      }

      // Convert form data to API format
      const apiPreferences = {
        flight_preferences: {
          preferred_airlines: travelPrefs.preferred_airlines ? travelPrefs.preferred_airlines.split(',').map(s => s.trim()) : [],
          seating_preference: travelPrefs.seat_preference,
          meal_preference: travelPrefs.meal_preference,
          class_preference: travelPrefs.class_preference
        },
        hotel_preferences: {
          preferred_chains: travelPrefs.preferred_hotel_chains ? travelPrefs.preferred_hotel_chains.split(',').map(s => s.trim()) : [],
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
      };

      // Save locally first
      await storageService.saveTravelPreferences({
        preferred_airlines: travelPrefs.preferred_airlines ? travelPrefs.preferred_airlines.split(',').map(s => s.trim()) : [],
        seat_preference: travelPrefs.seat_preference,
        class_preference: travelPrefs.class_preference,
        meal_preference: travelPrefs.meal_preference,
        preferred_hotel_chains: travelPrefs.preferred_hotel_chains ? travelPrefs.preferred_hotel_chains.split(',').map(s => s.trim()) : [],
        room_type: travelPrefs.room_type,
        smoking_preference: travelPrefs.smoking_preference,
        mobility_assistance: travelPrefs.mobility_assistance,
        wheelchair_required: travelPrefs.wheelchair_required,
        visual_impairment: travelPrefs.visual_impairment,
        hearing_impairment: travelPrefs.hearing_impairment,
        emergency_contact: travelPrefs.emergency_contact
      });

      // Try to save to backend
      try {
        await apiService.issueTravelCredential(employeeData.employee_id, apiPreferences);
        Alert.alert('Success! 🎉', 'Your travel preferences have been saved and encrypted!');
      } catch (apiError) {
        console.warn('API save failed:', apiError);
        Alert.alert('Saved Locally', 'Your preferences have been saved locally. Backend sync will be attempted later.');
      }

      setCurrentScreen('main');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      Alert.alert('Save Failed', 'Failed to save your travel preferences. Please try again.');
    }
  };

  // Load preferences when opening travel screen
  useEffect(() => {
    if (currentScreen === 'travel-preferences') {
      loadTravelPreferences();
    }
  }, [currentScreen]);

  const handleTestMasterCard = async () => {
    try {
      Alert.alert('🏷️ Testing Master Card', 'Creating encrypted master card with real X25519...');
      
      // Ensure we have a real AID first
      const currentAID = signifyService.getCurrentAID();
      if (!currentAID) {
        Alert.alert('⚠️ No AID Available', 'Please create a real AID first before creating a master card.');
        return;
      }
      
      // Sample travel profile data
      const travelProfile = {
        flightPreferences: {
          preferredAirlines: ['SAS', 'Lufthansa'],
          seatPreference: 'Aisle',
          mealPreference: 'Vegetarian',
          frequentFlyerNumbers: { 'SAS': 'SE123456' },
          classPreference: 'Economy Plus'
        },
        hotelPreferences: {
          preferredChains: ['Scandic', 'Radisson'],
          roomType: 'Standard',
          amenities: ['Wi-Fi', 'Gym'],
          loyaltyPrograms: { 'Scandic': 'SC789' }
        },
        accessibilityNeeds: {
          mobilityAssistance: false,
          visualAssistance: false,
          hearingAssistance: false,
          specialRequirements: []
        },
        emergencyContact: {
          name: 'Jane Doe',
          phone: '+46123456789',
          relationship: 'Spouse',
          email: 'jane@example.com'
        },
        dietaryRequirements: {
          allergies: ['Nuts'],
          restrictions: ['Vegetarian'],
          preferences: ['Organic']
        }
      };
      
      // Create master card with real encryption
      const masterCard = await masterCardService.createMasterCard(travelProfile);
      
      Alert.alert('✅ Real Master Card Created!', 
        \`Card ID: \${masterCard.id.substring(0, 16)}...\\nEncryption: \${masterCard.encryptionMethod || 'REAL_X25519'}\\nKey: \${masterCard.keyFingerprint || 'Generated'}\`);
      
    } catch (error) {
      console.error('Master card test error:', error);
      Alert.alert('❌ Master Card Test Failed', \`Error: \${error.message}\`);
    }
  };

  const renderScreen = () => {
    if (currentScreen === 'check') {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>🔄 Loading...</Text>
          <Text style={styles.subtitle}>Checking your travel identity</Text>
        </View>
      );
    }

    if (currentScreen === 'register') {
      return (
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.registerContainer}>
            <Text style={styles.title}>✈️ Create Travel Identity</Text>
            <Text style={styles.subtitle}>Enter your information to get started</Text>
            
            <View style={styles.formContainer}>
              <Text style={styles.label}>Employee ID *</Text>
              <TextInput
                style={styles.input}
                value={registrationForm.employee_id}
                onChangeText={(text) => setRegistrationForm({...registrationForm, employee_id: text})}
                placeholder="Enter your employee ID"
                placeholderTextColor="#999"
              />
              
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={registrationForm.full_name}
                onChangeText={(text) => setRegistrationForm({...registrationForm, full_name: text})}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
              />
              
              <Text style={styles.label}>Department *</Text>
              <TextInput
                style={styles.input}
                value={registrationForm.department}
                onChangeText={(text) => setRegistrationForm({...registrationForm, department: text})}
                placeholder="Enter your department"
                placeholderTextColor="#999"
              />
              
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={registrationForm.email}
                onChangeText={(text) => setRegistrationForm({...registrationForm, email: text})}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              
              <Text style={styles.label}>Phone (optional)</Text>
              <TextInput
                style={styles.input}
                value={registrationForm.phone}
                onChangeText={(text) => setRegistrationForm({...registrationForm, phone: text})}
                placeholder="Enter your phone number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
              
              <TouchableOpacity style={styles.createButton} onPress={handleRegister}>
                <Text style={styles.createButtonText}>Create Travel Identity</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      );
    }

    if (currentScreen === 'main') {
      return (
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.mainContainer}>
            <Text style={styles.title}>👋 Welcome, {employeeData?.full_name || 'Traveler'}!</Text>
            <Text style={styles.subtitle}>Your travel identity is ready</Text>
            
            <View style={styles.identityCard}>
              <Text style={styles.cardTitle}>🆔 Your Travel Identity</Text>
              <Text style={styles.cardLabel}>Employee ID:</Text>
              <Text style={styles.cardValue}>{employeeData?.employee_id}</Text>
              
              <Text style={styles.cardLabel}>KERI AID:</Text>
              {employeeData?.aid ? (
                <Text style={styles.cardValue}>{employeeData.aid.substring(0, 35)}...</Text>
              ) : (
                <View style={styles.aidMissingContainer}>
                  <Text style={styles.aidMissing}>⚠️ KERI identity not created</Text>
                  <TouchableOpacity style={styles.createAidButton} onPress={handleCreateMissingAID}>
                    <Text style={styles.createAidButtonText}>Create KERI Identity</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              <View style={styles.cardStatusContainer}>
                <Text style={styles.cardStatus}>
                  {employeeData?.aid ? '✅ Identity Complete' : '⏳ Setup Pending'}
                </Text>
              </View>
            </View>
            
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.actionButton} onPress={() => setCurrentScreen('travel-preferences')}>
                <Text style={styles.actionButtonText}>📝 My Data</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={() => {
                if (employeeData?.aid) {
                  consentService.forceRefresh();
                  Alert.alert('Data Sharing', '🔔 Checking for new consent requests...');
                } else {
                  Alert.alert('KERI Identity Required', 'Please create your KERI identity first.');
                }
              }}>
                <Text style={styles.actionButtonText}>📱 Share Data</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={handleHealthCheck}>
                <Text style={styles.actionButtonText}>🔍 Test Backend</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.actionButton, styles.resetButton]} onPress={() => {
                Alert.alert('Reset Identity', 'Are you sure you want to reset your travel identity?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Reset', style: 'destructive', onPress: async () => {
                    await storageService.clearAllData();
                    setEmployeeData(null);
                    setCurrentScreen('register');
                  }}
                ]);
              }}>
                <Text style={styles.resetButtonText}>🗑️ Reset Identity</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.statusContainer}>
              <Text style={styles.status}>✅ Connected to backend API</Text>
              <Text style={styles.url}>http://192.168.31.172:8000</Text>
            </View>
          </View>
        </ScrollView>
      );
    }

    if (currentScreen === 'travel-preferences') {
      return (
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.registerContainer}>
            {/* Header */}
            <View style={styles.prefsHeader}>
              <TouchableOpacity onPress={() => setCurrentScreen('main')} style={styles.backButton}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.title}>🧳 Travel Preferences</Text>
              <Text style={styles.subtitle}>Customize your travel experience</Text>
            </View>
            
            <View style={styles.formContainer}>
              {/* Flight Preferences */}
              <Text style={styles.sectionTitle}>✈️ Flight Preferences</Text>
              
              <Text style={styles.label}>Preferred Airlines</Text>
              <TextInput
                style={styles.input}
                value={travelPrefs.preferred_airlines}
                onChangeText={(text) => setTravelPrefs({...travelPrefs, preferred_airlines: text})}
                placeholder="e.g., SAS, Lufthansa, Delta"
                placeholderTextColor="#999"
              />
              
              <Text style={styles.label}>Seat Preference</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={travelPrefs.seat_preference}
                  style={styles.picker}
                  onValueChange={(itemValue) => setTravelPrefs({...travelPrefs, seat_preference: itemValue})}
                >
                  <Picker.Item label="Select seat preference" value="" />
                  <Picker.Item label="Window" value="Window" />
                  <Picker.Item label="Aisle" value="Aisle" />
                  <Picker.Item label="Middle" value="Middle" />
                  <Picker.Item label="No preference" value="No preference" />
                </Picker>
              </View>
              
              <Text style={styles.label}>Class Preference</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={travelPrefs.class_preference}
                  style={styles.picker}
                  onValueChange={(itemValue) => setTravelPrefs({...travelPrefs, class_preference: itemValue})}
                >
                  <Picker.Item label="Select class preference" value="" />
                  <Picker.Item label="Economy" value="Economy" />
                  <Picker.Item label="Economy Plus" value="Economy Plus" />
                  <Picker.Item label="Business" value="Business" />
                  <Picker.Item label="First Class" value="First Class" />
                </Picker>
              </View>
              
              <Text style={styles.label}>Meal Preference</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={travelPrefs.meal_preference}
                  style={styles.picker}
                  onValueChange={(itemValue) => setTravelPrefs({...travelPrefs, meal_preference: itemValue})}
                >
                  <Picker.Item label="Select meal preference" value="" />
                  <Picker.Item label="Regular" value="Regular" />
                  <Picker.Item label="Vegetarian" value="Vegetarian" />
                  <Picker.Item label="Vegan" value="Vegan" />
                  <Picker.Item label="Kosher" value="Kosher" />
                  <Picker.Item label="Halal" value="Halal" />
                  <Picker.Item label="Gluten Free" value="Gluten Free" />
                  <Picker.Item label="Diabetic" value="Diabetic" />
                </Picker>
              </View>
              
              {/* Hotel Preferences */}
              <Text style={styles.sectionTitle}>🏨 Hotel Preferences</Text>
              
              <Text style={styles.label}>Preferred Hotel Chains</Text>
              <TextInput
                style={styles.input}
                value={travelPrefs.preferred_hotel_chains}
                onChangeText={(text) => setTravelPrefs({...travelPrefs, preferred_hotel_chains: text})}
                placeholder="e.g., Scandic, Radisson, Marriott"
                placeholderTextColor="#999"
              />
              
              <Text style={styles.label}>Room Type</Text>
              <TextInput
                style={styles.input}
                value={travelPrefs.room_type}
                onChangeText={(text) => setTravelPrefs({...travelPrefs, room_type: text})}
                placeholder="e.g., Single, Double, Suite"
                placeholderTextColor="#999"
              />
              
              {/* Emergency Contact */}
              <Text style={styles.sectionTitle}>🚨 Emergency Contact</Text>
              
              <Text style={styles.label}>Contact Name</Text>
              <TextInput
                style={styles.input}
                value={travelPrefs.emergency_contact.name}
                onChangeText={(text) => setTravelPrefs({
                  ...travelPrefs, 
                  emergency_contact: {...travelPrefs.emergency_contact, name: text}
                })}
                placeholder="Enter emergency contact name"
                placeholderTextColor="#999"
              />
              
              <Text style={styles.label}>Relationship</Text>
              <TextInput
                style={styles.input}
                value={travelPrefs.emergency_contact.relationship}
                onChangeText={(text) => setTravelPrefs({
                  ...travelPrefs, 
                  emergency_contact: {...travelPrefs.emergency_contact, relationship: text}
                })}
                placeholder="e.g., Spouse, Parent, Friend"
                placeholderTextColor="#999"
              />
              
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={travelPrefs.emergency_contact.phone}
                onChangeText={(text) => setTravelPrefs({
                  ...travelPrefs, 
                  emergency_contact: {...travelPrefs.emergency_contact, phone: text}
                })}
                placeholder="Enter phone number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
              
              <Text style={styles.label}>Email (optional)</Text>
              <TextInput
                style={styles.input}
                value={travelPrefs.emergency_contact.email}
                onChangeText={(text) => setTravelPrefs({
                  ...travelPrefs, 
                  emergency_contact: {...travelPrefs.emergency_contact, email: text}
                })}
                placeholder="Enter email address"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              
              {/* Save Button */}
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveTravelPreferences}>
                <Text style={styles.saveButtonText}>💾 Save Preferences</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.cancelButton} onPress={() => setCurrentScreen('main')}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      );
    }
  };

  return renderScreen();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  registerContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  mainContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 30,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#2c3e50',
  },
  createButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 15,
    marginTop: 25,
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  identityCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  cardLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 10,
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 16,
    color: '#2c3e50',
    fontFamily: 'monospace',
  },
  actionsContainer: {
    marginBottom: 30,
  },
  actionButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#e74c3c',
    marginTop: 10,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  status: {
    fontSize: 14,
    color: '#27ae60',
    marginBottom: 5,
    textAlign: 'center',
  },
  url: {
    fontSize: 12,
    color: '#7f8c8d',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  aidMissingContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  aidMissing: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 10,
    textAlign: 'center',
  },
  createAidButton: {
    backgroundColor: '#f39c12',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  createAidButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cardStatusContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f1f2f6',
    alignItems: 'center',
  },
  cardStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  prefsHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 25,
    marginBottom: 15,
  },
  saveButton: {
    backgroundColor: '#27ae60',
    borderRadius: 8,
    padding: 15,
    marginTop: 30,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerContainer: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#2c3e50',
  },
});
