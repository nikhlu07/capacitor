import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

interface FormData {
  fullName: string;
  employeeId: string;
  department: string;
  email: string;
  phone: string;
}

const RegistrationScreen: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    employeeId: '',
    department: '',
    email: '',
    phone: '',
  });

  const departments = [
    { label: 'Select your department', value: '' },
    { label: 'Fleet Operations', value: 'fleet-operations' },
    { label: 'Sales', value: 'sales' },
    { label: 'Engineering', value: 'engineering' },
    { label: 'Human Resources', value: 'hr' },
    { label: 'Finance', value: 'finance' },
    { label: 'Marketing', value: 'marketing' },
  ];

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBack = () => {
    // Navigate back to onboarding
    console.log('Back pressed');
  };

  const handleContinue = () => {
    // Validate form
    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }
    if (!formData.employeeId.trim()) {
      Alert.alert('Error', 'Please enter your employee ID');
      return;
    }
    if (!formData.department) {
      Alert.alert('Error', 'Please select your department');
      return;
    }
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    // Call API to register employee
    console.log('Registration data:', formData);
    // Navigate to next step
  };

  const isFormValid = () => {
    return (
      formData.fullName.trim() &&
      formData.employeeId.trim() &&
      formData.department &&
      formData.email.trim() &&
      formData.phone.trim()
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1c170d" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Your Travel Identity</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>Step 1 of 3</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '33%' }]} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Full Name */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor="#9b844b"
            value={formData.fullName}
            onChangeText={(value) => handleInputChange('fullName', value)}
            autoCapitalize="words"
          />
        </View>

        {/* Employee ID */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Employee ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your employee ID"
            placeholderTextColor="#9b844b"
            value={formData.employeeId}
            onChangeText={(value) => handleInputChange('employeeId', value)}
            autoCapitalize="characters"
          />
        </View>

        {/* Department */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Department</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.department}
              onValueChange={(value) => handleInputChange('department', value)}
              style={styles.picker}
            >
              {departments.map((dept) => (
                <Picker.Item
                  key={dept.value}
                  label={dept.label}
                  value={dept.value}
                  color={dept.value ? '#1c170d' : '#9b844b'}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Email */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#9b844b"
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Phone */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your phone number"
            placeholderTextColor="#9b844b"
            value={formData.phone}
            onChangeText={(value) => handleInputChange('phone', value)}
            keyboardType="phone-pad"
          />
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            { opacity: isFormValid() ? 1 : 0.5 }
          ]}
          onPress={handleContinue}
          disabled={!isFormValid()}
        >
          <Text style={styles.buttonText}>Continue</Text>
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
  headerSpacer: {
    width: 48,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1c170d',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e8e1cf',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f4c653',
    borderRadius: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  inputContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1c170d',
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: '#e8e1cf',
    borderRadius: 12,
    backgroundColor: '#fcfbf8',
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#1c170d',
  },
  pickerContainer: {
    height: 56,
    borderWidth: 1,
    borderColor: '#e8e1cf',
    borderRadius: 12,
    backgroundColor: '#fcfbf8',
    justifyContent: 'center',
  },
  picker: {
    height: 56,
    color: '#1c170d',
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  continueButton: {
    backgroundColor: '#f4c653',
    borderRadius: 12,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    minWidth: 84,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#1c170d',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.015,
  },
});

export default RegistrationScreen;