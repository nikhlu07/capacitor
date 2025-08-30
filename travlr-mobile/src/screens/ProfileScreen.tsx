import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SettingsItemProps {
  title: string;
  onPress: () => void;
  showChevron?: boolean;
  icon?: string;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ 
  title, 
  onPress, 
  showChevron = true, 
  icon 
}) => (
  <TouchableOpacity style={styles.settingsItem} onPress={onPress}>
    <Text style={styles.settingsItemText}>{title}</Text>
    {showChevron && (
      <View style={styles.settingsItemIcon}>
        <Ionicons 
          name={icon as any || "chevron-forward"} 
          size={24} 
          color="#1c170d" 
        />
      </View>
    )}
  </TouchableOpacity>
);

interface KeriInfoItemProps {
  title: string;
  subtitle?: string;
  icon?: string;
  onPress?: () => void;
}

const KeriInfoItem: React.FC<KeriInfoItemProps> = ({ 
  title, 
  subtitle, 
  icon, 
  onPress 
}) => (
  <TouchableOpacity 
    style={styles.keriInfoItem} 
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={styles.keriInfoContent}>
      <Text style={styles.keriInfoTitle}>{title}</Text>
      {subtitle && <Text style={styles.keriInfoSubtitle}>{subtitle}</Text>}
    </View>
    {icon && (
      <View style={styles.keriInfoIcon}>
        <Ionicons name={icon as any} size={24} color="#1c170d" />
      </View>
    )}
  </TouchableOpacity>
);

const ProfileScreen: React.FC = () => {
  const employeeData = {
    name: 'Ethan Carter',
    employeeId: '123456',
    department: 'Engineering',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBBELhy5Cd3rjUDSZT2VMy6imFO6B7rC58zkZ6sDNP357VFKX1nhFMV_8Lz1f2RhdZLlKslPfv6WdeW7h3JbMe8zBrMquBILpgFjdVMpFtw3SmORERi9K-Pg6mF3T9Qog5tMr9aRyMKqlq5nEDFz-Uq1cJ8cII66LdHbHBOhAHKW0o37CyQOgocR40I_fgt0PRF-ZdSgPaLALTU_dwTq9Xgs2NYZN5-JYmRhCAPXDW1VHHeXkgKTfXQ_sgb2Qd9-RWdp097hhgluRdh',
    aid: 'ECtmB0RMV9GDeaXDvRfrrF6tmUG2WCnbB4LxfVlPR-jA',
  };

  const handleBack = () => {
    console.log('Back pressed');
    // Navigate back to previous screen
  };

  const handleCopyAID = async () => {
    try {
      await Clipboard.setString(employeeData.aid);
      Alert.alert('Copied', 'AID copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy AID');
    }
  };

  const handleAccountSettings = () => {
    console.log('Account Settings pressed');
    // Navigate to account settings
  };

  const handlePrivacySettings = () => {
    console.log('Privacy Settings pressed');
    // Navigate to privacy settings
  };

  const handleSecurity = () => {
    console.log('Security pressed');
    // Navigate to security settings
  };

  const handleKeyRotation = () => {
    console.log('Key Rotation pressed');
    // Navigate to key rotation screen
  };

  const handleDelegations = () => {
    console.log('Company Delegations pressed');
    // Navigate to delegations screen
  };


  const handleHelpSupport = () => {
    console.log('Help & Support pressed');
    // Navigate to help & support
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Your travel data will be exported in a secure format. This may take a few minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Export', 
          onPress: () => {
            console.log('Exporting data...');
            // Call export API
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your travel preferences and credentials will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            console.log('Deleting account...');
            // Call delete account API
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1c170d" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileContent}>
            <Image
              source={{ uri: employeeData.avatar }}
              style={styles.profileAvatar}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{employeeData.name}</Text>
              <Text style={styles.profileDetail}>Employee ID: {employeeData.employeeId}</Text>
              <Text style={styles.profileDetail}>Department: {employeeData.department}</Text>
            </View>
          </View>
        </View>

        {/* KERI Identity Section */}
        <Text style={styles.sectionTitle}>Your KERI Identity</Text>
        
        <KeriInfoItem
          title={`AID: ${employeeData.aid.substring(0, 3)}...${employeeData.aid.substring(employeeData.aid.length - 3)}`}
          subtitle="Copy"
          icon="copy-outline"
          onPress={handleCopyAID}
        />
        
        <KeriInfoItem
          title="5 Witnesses Active"
          icon="checkmark"
        />
        
        <KeriInfoItem
          title="Last Sync: 2 minutes ago"
        />

        {/* Settings Section */}
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <SettingsItem
          title="Account Settings"
          onPress={handleAccountSettings}
        />
        
        <SettingsItem
          title="Privacy Settings"
          onPress={handlePrivacySettings}
        />
        
        <SettingsItem
          title="Security"
          onPress={handleSecurity}
        />

        
        <SettingsItem
          title="Help & Support"
          onPress={handleHelpSupport}
        />

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.exportButton} onPress={handleExportData}>
            <Text style={styles.exportButtonText}>Export Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
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
  profileSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  profileContent: {
    alignItems: 'center',
    gap: 16,
  },
  profileAvatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1c170d',
    letterSpacing: -0.015,
    marginBottom: 4,
  },
  profileDetail: {
    fontSize: 16,
    color: '#9b844b',
    marginBottom: 2,
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
  keriInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 56,
  },
  keriInfoContent: {
    flex: 1,
  },
  keriInfoTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1c170d',
    marginBottom: 2,
  },
  keriInfoSubtitle: {
    fontSize: 14,
    color: '#9b844b',
  },
  keriInfoIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 56,
  },
  settingsItemText: {
    fontSize: 16,
    color: '#1c170d',
    flex: 1,
  },
  settingsItemIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonsContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 12,
    alignItems: 'center',
  },
  exportButton: {
    backgroundColor: '#f3f0e7',
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 480,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1c170d',
    letterSpacing: 0.015,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 480,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1c170d',
    letterSpacing: 0.015,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default ProfileScreen;