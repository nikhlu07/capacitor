import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const SecuritySetupScreen: React.FC = () => {
  const navigation = useNavigation();

  const handleContinue = () => {
    console.log('Continue button pressed');
    console.log('Navigating to MainTabs');
    
    // Direct navigation for web
    try {
      navigation.navigate('MainTabs' as never);
      console.log('Navigation successful');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleSetupLater = () => {
    console.log('Setup Later button pressed');
    console.log('Skipping to MainTabs');
    
    // Direct navigation for web
    try {
      navigation.navigate('MainTabs' as never);
      console.log('Navigation successful');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Secure Your Wallet</Text>
        </View>

        {/* Security Options */}
        <View style={styles.optionsContainer}>
          <View style={styles.securityOption}>
            <View style={styles.iconContainer}>
              <Ionicons name="finger-print" size={24} color="#1c170d" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.optionTitle}>Biometric Authentication</Text>
              <Text style={styles.optionDescription}>Secure access with fingerprint or face recognition</Text>
            </View>
          </View>
          
          <View style={styles.securityOption}>
            <View style={styles.iconContainer}>
              <Ionicons name="keypad-outline" size={24} color="#1c170d" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.optionTitle}>Passcode</Text>
              <Text style={styles.optionDescription}>A numeric passcode for security</Text>
            </View>
          </View>
        </View>

        {/* Explanation */}
        <View style={styles.explanationContainer}>
          <Text style={styles.explanationText}>
            Setting up security is important for protecting your travel identity wallet and credentials.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleSetupLater}>
            <Text style={styles.secondaryButtonText}>Set Up Later</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcfbf8',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c170d',
    letterSpacing: -0.015,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  securityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f3f0e7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c170d',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#9b844b',
    lineHeight: 20,
  },
  explanationContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 32,
  },
  explanationText: {
    fontSize: 16,
    color: '#1c170d',
    lineHeight: 24,
    textAlign: 'center',
  },
  buttonsContainer: {
    gap: 12,
    paddingBottom: 32,
  },
  secondaryButton: {
    backgroundColor: '#f3f0e7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1c170d',
  },
  primaryButton: {
    backgroundColor: '#f4c653',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1c170d',
  },
});

export default SecuritySetupScreen;