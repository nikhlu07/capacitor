/**
 * Test Screen for Real KERI Integration
 * Tests: Mobile → SignifyTS → KERIA → Witnesses
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { realKERIService } from '../services/realKeriService';

interface TestResult {
  step: string;
  status: 'pending' | 'success' | 'error';
  details: string;
  timestamp?: string;
}

const RealKERITestScreen: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentIdentity, setCurrentIdentity] = useState<any>(null);

  useEffect(() => {
    loadCurrentIdentity();
  }, []);

  const loadCurrentIdentity = async () => {
    try {
      const identity = await realKERIService.getCurrentIdentity();
      setCurrentIdentity(identity);
    } catch (error) {
      console.log('No current identity found');
    }
  };

  const addResult = (step: string, status: 'success' | 'error', details: string) => {
    setTestResults(prev => [...prev, {
      step,
      status,
      details,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runFullKERITest = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      // Step 1: Initialize SignifyTS
      addResult('Step 1', 'pending', 'Initializing SignifyTS...');
      const initSuccess = await realKERIService.initialize();
      
      if (initSuccess) {
        addResult('Step 1', 'success', 'SignifyTS initialized successfully');
      } else {
        addResult('Step 1', 'error', 'SignifyTS initialization failed');
        setIsRunning(false);
        return;
      }

      // Step 2: Create KERI Identity
      addResult('Step 2', 'pending', 'Creating KERI identity via inception event...');
      try {
        const identity = await realKERIService.createIdentity('TEST001', 'Test Employee');
        addResult('Step 2', 'success', `Real AID created: ${identity.aid.substring(0, 12)}...`);
        setCurrentIdentity(identity);
      } catch (error: any) {
        addResult('Step 2', 'error', `Identity creation failed: ${error.message}`);
        setIsRunning(false);
        return;
      }

      // Step 3: Issue ACDC Credential
      addResult('Step 3', 'pending', 'Issuing ACDC credential...');
      try {
        const credentialData = {
          employeeId: 'TEST001',
          travelPreferences: {
            airline: 'SAS',
            seatPreference: 'window',
            mealPreference: 'vegetarian'
          }
        };

        const credential = await realKERIService.issueCredential(
          currentIdentity?.aid || 'unknown',
          credentialData,
          'travlr-travel-preferences-v1.0'
        );
        
        addResult('Step 3', 'success', `ACDC credential issued: ${credential.said.substring(0, 12)}...`);
      } catch (error: any) {
        addResult('Step 3', 'error', `Credential issuance failed: ${error.message}`);
      }

      // Step 4: Test Service Status
      addResult('Step 4', 'pending', 'Checking service status...');
      const status = realKERIService.getStatus();
      addResult('Step 4', 'success', `Status: Initialized=${status.initialized}, Client=${status.hasClient}`);

    } catch (error: any) {
      addResult('Error', 'error', `Unexpected error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const initializeOnly = async () => {
    setIsRunning(true);
    try {
      const success = await realKERIService.initialize();
      if (success) {
        Alert.alert('Success', 'SignifyTS initialized successfully!');
      } else {
        Alert.alert('Error', 'SignifyTS initialization failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'pending': return '#FF9800';
      default: return '#666';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Real KERI Test</Text>
        <Text style={styles.subtitle}>Mobile → SignifyTS → KERIA → Witnesses</Text>
      </View>

      {currentIdentity && (
        <View style={styles.identityBox}>
          <Text style={styles.identityTitle}>Current Identity</Text>
          <Text style={styles.identityAid}>AID: {currentIdentity.aid.substring(0, 20)}...</Text>
          <Text style={styles.identityName}>Name: {currentIdentity.name}</Text>
          <Text style={styles.identityDate}>Created: {new Date(currentIdentity.created).toLocaleDateString()}</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={runFullKERITest}
          disabled={isRunning}
        >
          {isRunning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Run Full KERI Test</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={initializeOnly}
          disabled={isRunning}
        >
          <Text style={styles.secondaryButtonText}>Initialize Only</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={clearResults}
        >
          <Text style={styles.clearButtonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.resultsContainer}>
        {testResults.map((result, index) => (
          <View key={index} style={[styles.resultItem, { borderLeftColor: getStatusColor(result.status) }]}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultStep}>{result.step}</Text>
              <Text style={styles.resultTime}>{result.timestamp}</Text>
            </View>
            <Text style={[styles.resultStatus, { color: getStatusColor(result.status) }]}>
              {result.status.toUpperCase()}
            </Text>
            <Text style={styles.resultDetails}>{result.details}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  identityBox: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  identityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  identityAid: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#666',
  },
  identityName: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
  },
  identityDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    flexWrap: 'wrap',
  },
  button: {
    flex: 1,
    minWidth: 120,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  clearButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  clearButtonText: {
    color: '#666',
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  resultItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultStep: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  resultTime: {
    fontSize: 12,
    color: '#999',
  },
  resultStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultDetails: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default RealKERITestScreen;