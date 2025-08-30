/**
 * Travlr-ID Mobile App
 * Employee Travel Identity Management with Real KERI
 */

import React, { useState, useEffect } from 'react';
import './src/crypto-polyfill'; // Essential for SignifyTS
import 'react-native-get-random-values';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  SafeAreaView
} from 'react-native';

import { travlrIdentityService } from './src/services/travlrIdentityService';

// Travlr-ID color scheme
const colors = {
  primary: '#1E40AF',      // Travlr blue
  secondary: '#059669',    // Travel green  
  accent: '#DC2626',       // Alert red
  background: '#F8FAFC',   // Light gray
  surface: '#FFFFFF',      // White
  text: '#1F2937',         // Dark gray
  textLight: '#6B7280',    // Medium gray
  success: '#10B981',      // Green
  warning: '#F59E0B'       // Orange
};

export default function TravlrApp() {
  const [currentScreen, setCurrentScreen] = useState('onboarding');
  const [isLoading, setIsLoading] = useState(false);
  const [identity, setIdentity] = useState(null);
  const [serviceInitialized, setServiceInitialized] = useState(false);

  // Employee registration form
  const [employeeForm, setEmployeeForm] = useState({
    employee_id: '',
    full_name: '',
    department: '',
    email: ''
  });

  // Travel preferences
  const [travelPrefs, setTravelPrefs] = useState({
    airlines: '',
    seatPreference: 'window',
    mealPreference: 'regular',
    emergencyContact: '',
    dietaryRequirements: ''
  });

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    setIsLoading(true);
    try {
      console.log('🚀 Starting Travlr-ID App...');
      
      // Initialize SignifyTS identity service (with offline capability)
      const success = await travlrIdentityService.initialize();
      if (success) {
        setServiceInitialized(true);
        
        // Check for existing identity
        const existingIdentity = await travlrIdentityService.getCurrentIdentity();
        if (existingIdentity) {
          setIdentity(existingIdentity);
          setCurrentScreen('dashboard');
        }
      } else {
        Alert.alert('Initialization Error', 'Could not connect to KERI services');
      }
    } catch (error) {
      console.error('App initialization error:', error);
      Alert.alert('Error', 'App initialization failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmployeeRegistration = async () => {
    if (!employeeForm.employee_id || !employeeForm.full_name || !employeeForm.email) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setIsLoading(true);
    try {
      console.log('👤 Creating employee KERI identity...');
      
      // Create real KERI identity with offline capability
      const newIdentity = await travlrIdentityService.createEmployeeIdentity(
        employeeForm.employee_id,
        employeeForm.full_name
      );
      
      setIdentity(newIdentity);
      setCurrentScreen('travel-setup');
      
      Alert.alert(
        'Identity Created!', 
        `KERI identity created successfully!\n\nAID: ${newIdentity.aid.substring(0, 20)}...`,
        [{ text: 'Continue', onPress: () => setCurrentScreen('travel-setup') }]
      );

    } catch (error) {
      console.error('Identity creation error:', error);
      Alert.alert('Error', 'Failed to create KERI identity: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTravelPreferences = async () => {
    if (!identity) {
      Alert.alert('Error', 'No identity found');
      return;
    }

    setIsLoading(true);
    try {
      console.log('📜 Issuing travel preferences ACDC credential...');
      
      // Issue ACDC credential with offline capability  
      const credential = await travlrIdentityService.issueTravelPreferencesCredential(travelPrefs);
      
      Alert.alert(
        'Credential Issued!',
        `Travel preferences ACDC credential created!\n\nSAID: ${credential.said.substring(0, 20)}...`,
        [{ text: 'Go to Dashboard', onPress: () => setCurrentScreen('dashboard') }]
      );

    } catch (error) {
      console.error('Credential issuance error:', error);
      Alert.alert('Error', 'Failed to issue credential: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderOnboarding = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      <View style={styles.header}>
        <Text style={styles.logo}>Travlr-ID</Text>
        <Text style={styles.tagline}>Employee Travel Identity Management</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Secure Travel Identity with KERI</Text>
          <Text style={styles.heroSubtitle}>
            Create your cryptographic identity using KERI technology for secure, 
            verifiable travel credentials
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Employee Registration</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Employee ID (required)"
            value={employeeForm.employee_id}
            onChangeText={(text) => setEmployeeForm({...employeeForm, employee_id: text})}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Full Name (required)"
            value={employeeForm.full_name}
            onChangeText={(text) => setEmployeeForm({...employeeForm, full_name: text})}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Department"
            value={employeeForm.department}
            onChangeText={(text) => setEmployeeForm({...employeeForm, department: text})}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Email (required)"
            value={employeeForm.email}
            onChangeText={(text) => setEmployeeForm({...employeeForm, email: text})}
            keyboardType="email-address"
          />
        </View>

        <TouchableOpacity 
          style={[styles.primaryButton, isLoading && styles.disabledButton]}
          onPress={handleEmployeeRegistration}
          disabled={isLoading || !serviceInitialized}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Create KERI Identity</Text>
          )}
        </TouchableOpacity>

        <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>Service Status</Text>
          <Text style={[styles.statusText, serviceInitialized && styles.statusSuccess]}>
            KERI Service: {serviceInitialized ? 'Ready' : 'Connecting...'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  const renderTravelSetup = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Travlr-ID</Text>
        <Text style={styles.tagline}>Travel Preferences</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {identity && (
          <View style={styles.identityCard}>
            <Text style={styles.identityTitle}>Your KERI Identity</Text>
            <Text style={styles.identityAID}>AID: {identity.aid.substring(0, 30)}...</Text>
            <Text style={styles.identityName}>{identity.displayName}</Text>
          </View>
        )}

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Travel Preferences</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Preferred Airlines (e.g. SAS, Lufthansa)"
            value={travelPrefs.airlines}
            onChangeText={(text) => setTravelPrefs({...travelPrefs, airlines: text})}
          />
          
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Seat Preference:</Text>
            <View style={styles.radioGroup}>
              {['window', 'aisle', 'middle'].map((option) => (
                <TouchableOpacity 
                  key={option}
                  style={styles.radioOption}
                  onPress={() => setTravelPrefs({...travelPrefs, seatPreference: option})}
                >
                  <View style={[
                    styles.radioCircle, 
                    travelPrefs.seatPreference === option && styles.radioSelected
                  ]} />
                  <Text style={styles.radioText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Emergency Contact"
            value={travelPrefs.emergencyContact}
            onChangeText={(text) => setTravelPrefs({...travelPrefs, emergencyContact: text})}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Dietary Requirements"
            value={travelPrefs.dietaryRequirements}
            onChangeText={(text) => setTravelPrefs({...travelPrefs, dietaryRequirements: text})}
          />
        </View>

        <TouchableOpacity 
          style={[styles.primaryButton, isLoading && styles.disabledButton]}
          onPress={handleTravelPreferences}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Issue ACDC Credential</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  const renderDashboard = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Travlr-ID</Text>
        <Text style={styles.tagline}>Dashboard</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {identity && (
          <View style={styles.dashboardCard}>
            <Text style={styles.dashboardTitle}>Welcome, {identity.displayName}</Text>
            <Text style={styles.dashboardSubtitle}>Your travel identity is active</Text>
            
            <View style={styles.identityDetails}>
              <Text style={styles.detailLabel}>KERI AID:</Text>
              <Text style={styles.detailValue}>{identity.aid}</Text>
              <Text style={styles.detailLabel}>Employee ID:</Text>
              <Text style={styles.detailValue}>{identity.employeeId}</Text>
              <Text style={styles.detailLabel}>Created:</Text>
              <Text style={styles.detailValue}>
                {new Date(identity.created).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setCurrentScreen('travel-setup')}
          >
            <Text style={styles.actionButtonText}>Update Travel Preferences</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => {
              setIdentity(null);
              setCurrentScreen('onboarding');
            }}
          >
            <Text style={styles.secondaryButtonText}>Create New Identity</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  if (isLoading && currentScreen === 'onboarding') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Initializing Travlr-ID...</Text>
      </View>
    );
  }

  switch (currentScreen) {
    case 'travel-setup':
      return renderTravelSetup();
    case 'dashboard':
      return renderDashboard();
    default:
      return renderOnboarding();
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    padding: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  formSection: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  identityCard: {
    backgroundColor: colors.success,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  identityTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  identityAID: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  identityName: {
    color: 'white',
    fontSize: 16,
  },
  pickerContainer: {
    marginBottom: 12,
  },
  pickerLabel: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  radioSelected: {
    backgroundColor: colors.primary,
  },
  radioText: {
    fontSize: 16,
    color: colors.text,
  },
  statusSection: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: colors.warning,
  },
  statusSuccess: {
    color: colors.success,
  },
  dashboardCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  dashboardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  dashboardSubtitle: {
    fontSize: 16,
    color: colors.textLight,
    marginBottom: 16,
  },
  identityDetails: {
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textLight,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  actionSection: {
    gap: 12,
  },
  actionButton: {
    backgroundColor: colors.secondary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textLight,
  },
});