import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';

export default function App() {
  const handleRegister = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/mobile/employee/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: 'TEST001',
          full_name: 'Test User',
          department: 'IT',
          email: 'test@example.com'
        })
      });
      
      const data = await response.json();
      Alert.alert('Success', `Employee registered! AID: ${data.aid}`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Travlr-ID Mobile</Text>
      <Text style={styles.subtitle}>Employee Travel Identity</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register Employee</Text>
      </TouchableOpacity>
      
      <Text style={styles.status}>Connected to your backend API</Text>
      <Text style={styles.url}>http://localhost:8000</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#7f8c8d',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#3498db',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 30,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 16,
    color: '#27ae60',
    marginBottom: 5,
  },
  url: {
    fontSize: 14,
    color: '#7f8c8d',
    fontFamily: 'monospace',
  },
});