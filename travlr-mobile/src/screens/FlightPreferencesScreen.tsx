import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AirlineChipProps {
  name: string;
  isSelected: boolean;
  onPress: () => void;
}

const AirlineChip: React.FC<AirlineChipProps> = ({ name, isSelected, onPress }) => (
  <TouchableOpacity
    style={[styles.airlineChip, isSelected && styles.airlineChipSelected]}
    onPress={onPress}
  >
    <Ionicons name="airplane" size={20} color="#1c170d" />
    <Text style={styles.airlineChipText}>{name}</Text>
  </TouchableOpacity>
);

interface ClassOptionProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

const ClassOption: React.FC<ClassOptionProps> = ({ label, isSelected, onPress }) => (
  <TouchableOpacity
    style={[styles.classOption, isSelected && styles.classOptionSelected]}
    onPress={onPress}
  >
    <Text style={styles.classOptionText}>{label}</Text>
  </TouchableOpacity>
);

interface NotificationToggleProps {
  title: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}

const NotificationToggle: React.FC<NotificationToggleProps> = ({ title, value, onToggle }) => (
  <View style={styles.notificationRow}>
    <Text style={styles.notificationTitle}>{title}</Text>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: '#f3f0e7', true: '#f4c653' }}
      thumbColor="#ffffff"
      style={styles.switch}
    />
  </View>
);

const FlightPreferencesScreen: React.FC = () => {
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>(['SAS', 'Lufthansa', 'KLM']);
  const [selectedClass, setSelectedClass] = useState<string>('Economy');
  const [mealPreference, setMealPreference] = useState<string>('No Preference');
  const [frequentFlyerNumbers, setFrequentFlyerNumbers] = useState<{[key: string]: string}>({
    'SAS': '',
    'Lufthansa': '',
    'KLM': '',
    'British Airways': '',
    'Air France': '',
  });
  const [notifications, setNotifications] = useState({
    airlineUpdates: false,
    seatUpgrades: false,
  });

  const airlines = ['SAS', 'Lufthansa', 'KLM', 'British Airways', 'Air France'];
  const classOptions = ['Economy', 'Business', 'First'];
  const mealOptions = ['No Preference', 'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-Free'];

  const handleAirlineToggle = (airline: string) => {
    setSelectedAirlines(prev => 
      prev.includes(airline) 
        ? prev.filter(a => a !== airline)
        : [...prev, airline]
    );
  };

  const handleFrequentFlyerChange = (airline: string, number: string) => {
    setFrequentFlyerNumbers(prev => ({
      ...prev,
      [airline]: number,
    }));
  };

  const handleAddMoreAirlines = () => {
    Alert.alert('Add Airlines', 'Feature to add more airlines coming soon!');
  };

  const handleUpdatePreferences = () => {
    const preferences = {
      selectedAirlines,
      selectedClass,
      mealPreference,
      frequentFlyerNumbers,
      notifications,
    };
    
    console.log('Flight preferences:', preferences);
    Alert.alert('Success', 'Flight preferences updated successfully!');
    // Call API to update preferences
  };

  const handleBack = () => {
    console.log('Back pressed');
    // Navigate back to travel preferences
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1c170d" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Flight Preferences</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Preferred Airlines */}
        <Text style={styles.sectionTitle}>Preferred Airlines</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.airlinesContainer}
          contentContainerStyle={styles.airlinesContent}
        >
          {airlines.map((airline) => (
            <AirlineChip
              key={airline}
              name={airline}
              isSelected={selectedAirlines.includes(airline)}
              onPress={() => handleAirlineToggle(airline)}
            />
          ))}
        </ScrollView>

        {/* Seat Preferences */}
        <Text style={styles.sectionTitle}>Seat Preferences</Text>
        <View style={styles.seatImageContainer}>
          <Image
            source={{
              uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDygCgqfQ9LHgqP8oAsTOeGeuS468HNKwssP1bhYPKEBiNgg9t8MyhSS6mWLcgHD9JdcKDiyX_HxZzUjl7qfUyCI6Yq2yklNHtlgtNc5pXQ2jrQovKkL0PgtPXAZrd5MXFGweABE_nAq_ws2lZFNIosI-HVSUMEy9JUKb48IsK3maoEhES8KsdSyVdx3JtbAytYGowPIlhqKhdwBkWXnnpS-PKHB6nK2GF63jhu8xwIml05xGwxx80wm7IrfBafuiKnbfArM7amAPqq'
            }}
            style={styles.seatImage}
            resizeMode="cover"
          />
        </View>

        {/* Class Preferences */}
        <Text style={styles.sectionTitle}>Class Preferences</Text>
        <View style={styles.classOptionsContainer}>
          {classOptions.map((classOption) => (
            <ClassOption
              key={classOption}
              label={classOption}
              isSelected={selectedClass === classOption}
              onPress={() => setSelectedClass(classOption)}
            />
          ))}
        </View>

        {/* Meal Preferences */}
        <Text style={styles.sectionTitle}>Meal Preferences</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.currentMeal}>{mealPreference}</Text>
          <Text style={styles.mealNote}>Tap to change meal preference</Text>
        </View>

        {/* Frequent Flyer Programs */}
        <Text style={styles.sectionTitle}>Frequent Flyer Programs</Text>
        {airlines.map((airline) => (
          <View key={airline} style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={airline}
              placeholderTextColor="#9b844b"
              value={frequentFlyerNumbers[airline]}
              onChangeText={(text) => handleFrequentFlyerChange(airline, text)}
            />
          </View>
        ))}

        <TouchableOpacity style={styles.addMoreButton} onPress={handleAddMoreAirlines}>
          <Text style={styles.addMoreText}>Add More Airlines</Text>
        </TouchableOpacity>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <NotificationToggle
          title="Preferred Airline Updates"
          value={notifications.airlineUpdates}
          onToggle={(value) => setNotifications(prev => ({ ...prev, airlineUpdates: value }))}
        />
        <NotificationToggle
          title="Seat Upgrade Availability"
          value={notifications.seatUpgrades}
          onToggle={(value) => setNotifications(prev => ({ ...prev, seatUpgrades: value }))}
        />

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Update Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.updateButton} onPress={handleUpdatePreferences}>
          <Text style={styles.updateButtonText}>Update Preferences</Text>
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
  scrollView: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1c170d',
    letterSpacing: -0.015,
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 20,
  },
  airlinesContainer: {
    paddingLeft: 12,
  },
  airlinesContent: {
    paddingHorizontal: 4,
    gap: 12,
  },
  airlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f0e7',
    borderRadius: 8,
    paddingLeft: 8,
    paddingRight: 16,
    height: 32,
    gap: 8,
  },
  airlineChipSelected: {
    backgroundColor: '#f4c653',
  },
  airlineChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1c170d',
  },
  seatImageContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  seatImage: {
    width: '100%',
    aspectRatio: 3 / 2,
    borderRadius: 12,
  },
  classOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  classOption: {
    borderWidth: 1,
    borderColor: '#e8e1cf',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classOptionSelected: {
    borderWidth: 3,
    borderColor: '#f4c653',
    paddingHorizontal: 14, // Adjust for thicker border
  },
  classOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1c170d',
  },
  inputContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: '#e8e1cf',
    borderRadius: 8,
    backgroundColor: '#fcfbf8',
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#1c170d',
  },
  currentMeal: {
    fontSize: 16,
    color: '#1c170d',
    fontWeight: '500',
    marginBottom: 4,
  },
  mealNote: {
    fontSize: 14,
    color: '#9b844b',
  },
  addMoreButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#f3f0e7',
    borderRadius: 8,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
  },
  addMoreText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1c170d',
    letterSpacing: 0.015,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 56,
  },
  notificationTitle: {
    fontSize: 16,
    color: '#1c170d',
    flex: 1,
  },
  switch: {
    transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
  },
  bottomSpacing: {
    height: 100,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  updateButton: {
    backgroundColor: '#f4c653',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  updateButtonText: {
    color: '#1c170d',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.015,
  },
});

export default FlightPreferencesScreen;