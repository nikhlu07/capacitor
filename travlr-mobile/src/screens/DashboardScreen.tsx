import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatCardProps {
  title: string;
  value: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value }) => (
  <View style={styles.statCard}>
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

interface TabBarItemProps {
  icon: string;
  label: string;
  isActive?: boolean;
  onPress: () => void;
}

const TabBarItem: React.FC<TabBarItemProps> = ({ icon, label, isActive = false, onPress }) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress}>
    <View style={styles.tabIconContainer}>
      <Ionicons 
        name={icon as any} 
        size={24} 
        color={isActive ? '#1c170d' : '#9b844b'} 
        style={isActive ? { fontWeight: 'bold' } : {}}
      />
    </View>
    <Text style={[styles.tabLabel, { color: isActive ? '#1c170d' : '#9b844b' }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const DashboardScreen: React.FC = () => {
  const handleSettings = () => {
    console.log('Settings pressed');
  };

  const handleAddPreferences = () => {
    console.log('Add Preferences pressed');
    // Navigate to travel preferences screen
  };

  const handleTabPress = (tab: string) => {
    console.log(`${tab} tab pressed`);
    // Handle navigation to different tabs
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hi, Alex</Text>
        <TouchableOpacity onPress={handleSettings} style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color="#1c170d" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={styles.title}>Your Travel Identity</Text>

        {/* Identity Card */}
        <View style={styles.identityCard}>
          <View style={styles.cardImageContainer}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCShfR13YE5-_qCOR14cH7pKDMs0g3M_NGAI3BIbt_DP2Gf1LiGhGvRVa6hA7BIzYquhG6M6Ucgf0PBEI-ZVGVLPHadZu7zFBst9WPEJr1Cus-tLWm3AY83a-4YvU6c_VRsQ4dC-sCBtRx27ItoxE00XgsxnJnqXDvLJciSZTNEM9rKOiQaZUIXPS7DPWIxaGPoYU0R2uY8SLc-BOl5phuyiqGx7VKE5T0hTZjRznKlB9pSLMw0uFnuDbILycZF2QwK0R1BGHv3PigA'
              }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>Alex</Text>
            <Text style={styles.cardDetail}>Employee ID: 123456</Text>
            <Text style={styles.cardDetail}>5 Witnesses Verified</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.statsContainer}>
          <StatCard title="Active Credentials" value="3" />
          <StatCard title="Data Shared" value="2 Companies" />
          <StatCard title="Last Access" value="2h ago" />
        </View>
      </ScrollView>

      {/* Add Preferences Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPreferences}>
          <Ionicons name="add" size={24} color="#1c170d" />
          <Text style={styles.addButtonText}>Add Preferences</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TabBarItem
          icon="home"
          label="Home"
          isActive={true}
          onPress={() => handleTabPress('Home')}
        />
        <TabBarItem
          icon="settings-outline"
          label="Preferences"
          onPress={() => handleTabPress('Preferences')}
        />
        <TabBarItem
          icon="checkmark-circle-outline"
          label="Consent"
          onPress={() => handleTabPress('Consent')}
        />
        <TabBarItem
          icon="share-outline"
          label="Share"
          onPress={() => handleTabPress('Share')}
        />
        <TabBarItem
          icon="person-outline"
          label="Profile"
          onPress={() => handleTabPress('Profile')}
        />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c170d',
    letterSpacing: -0.015,
    flex: 1,
    textAlign: 'center',
    paddingLeft: 48, // Offset for settings button
  },
  settingsButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1c170d',
    letterSpacing: -0.015,
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 20,
  },
  identityCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardInfo: {
    padding: 16,
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c170d',
    letterSpacing: -0.015,
    marginBottom: 4,
  },
  cardDetail: {
    fontSize: 16,
    color: '#9b844b',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c170d',
    letterSpacing: -0.015,
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 16,
    paddingBottom: 100, // Space for FAB
  },
  statCard: {
    flex: 1,
    minWidth: 158,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e1cf',
    backgroundColor: '#fcfbf8',
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1c170d',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c170d',
    letterSpacing: -0.5,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 80, // Above tab bar
    right: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4c653',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonText: {
    color: '#1c170d',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 0.015,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fcfbf8',
    borderTopWidth: 1,
    borderTopColor: '#f3f0e7',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconContainer: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.015,
  },
});

export default DashboardScreen;