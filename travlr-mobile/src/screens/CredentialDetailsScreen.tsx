import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  QRSharing: {
    credentialId: string;
    credentialData: any;
  };
  DataSharing: {
    credentialSaid?: string;
    credentialData?: any;
  };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface CredentialSectionProps {
  title: string;
  content: string;
  isExpanded: boolean;
  onToggle: () => void;
}

const CredentialSection: React.FC<CredentialSectionProps> = ({
  title,
  content,
  isExpanded,
  onToggle,
}) => (
  <View style={styles.sectionContainer}>
    <TouchableOpacity style={styles.sectionHeader} onPress={onToggle}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Ionicons
        name={isExpanded ? 'chevron-up' : 'chevron-down'}
        size={20}
        color="#1c170d"
      />
    </TouchableOpacity>
    {isExpanded && (
      <View style={styles.sectionContent}>
        <Text style={styles.sectionText}>{content}</Text>
      </View>
    )}
  </View>
);

interface Props {
  route: {
    params: {
      credentialId: string;
      credentialType: string;
    };
  };
}

const CredentialDetailsScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<NavigationProp>();
  const { credentialId } = route.params;
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    personal: true,
    flight: true,
    hotel: true,
  });

  const credentialData = {
    title: 'Travel Preferences Credential',
    issuer: 'Travlr-ID',
    verificationStatus: 'Verified by 5 Witnesses',
    issuedDate: 'July 26, 2023',
    expiryDate: 'July 26, 2025',
    backgroundImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAScoJnopOsanvPCre5cO64ycAdsAk0iD75CQ7Yg87l5OtdpoRpm_5uevGmQj_byJfUPe0t9ggDlENsOCDDc1N7WVqMJzLdXCrwPNJPr3fOE6LcqAaUY8CfZrEapREcQG6bhcGgrn47tteWECfrgSFXaNKJJj9NlKuvudLW_ACiTEN2GwLJXyV1PIiSAM41oSm8pxjsCL8UE_IuZ9CXlv34QkbFqR0q6uU62uIFNDNXI-Jl9gYqp6N6iEfS0cVRjJ_-1ibuMtPy7EhS',
    sections: {
      personal: {
        title: 'Personal Info',
        content: 'Employee ID: 123456\nDepartment: Marketing\nContact: +1-555-123-4567',
      },
      flight: {
        title: 'Flight Preferences',
        content: 'Preferred Airlines: United, Delta\nSeating: Aisle\nMeal: Vegetarian\nFrequent Flyer: 987654321',
      },
      hotel: {
        title: 'Hotel Preferences',
        content: 'Preferred Chains: Hyatt, Marriott\nRoom Type: Suite\nAmenities: Gym, Pool',
      },
    },
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleShareCredential = () => {
    Alert.alert(
      'Share Credential',
      'Generate a QR code to share this credential with others?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Share', 
          onPress: () => {
            navigation.navigate('DataSharing', {
              credentialSaid: credentialId,
              credentialData: credentialData,
            });
          }
        }
      ]
    );
  };

  const handleKERIDataSharing = () => {
    navigation.navigate('DataSharing', {
      credentialSaid: credentialId,
      credentialData: credentialData,
    });
  };

  const handleRevokeCredential = () => {
    Alert.alert(
      'Revoke Credential',
      'This will permanently revoke this credential. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Revoke', 
          style: 'destructive',
          onPress: () => {
            console.log('Revoking credential...');
            // Call revoke API
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
        <Text style={styles.headerTitle}>{credentialData.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Credential Card */}
        <View style={styles.credentialCard}>
          <View style={styles.cardImageContainer}>
            <Image
              source={{ uri: credentialData.backgroundImage }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{credentialData.issuer}</Text>
            <View style={styles.cardDetails}>
              <Text style={styles.cardVerification}>{credentialData.verificationStatus}</Text>
              <Text style={styles.cardDates}>
                Issued: {credentialData.issuedDate} • Expires: {credentialData.expiryDate}
              </Text>
            </View>
          </View>
        </View>

        {/* Credential Sections */}
        <View style={styles.sectionsContainer}>
          {Object.entries(credentialData.sections).map(([key, section]) => (
            <CredentialSection
              key={key}
              title={section.title}
              content={section.content}
              isExpanded={expandedSections[key]}
              onToggle={() => toggleSection(key)}
            />
          ))}
        </View>

        {/* Share Buttons */}
        <View style={styles.shareButtonContainer}>
          <TouchableOpacity style={styles.shareButton} onPress={handleKERIDataSharing}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#ffffff" style={styles.buttonIcon} />
            <Text style={styles.shareButtonText}>Share via KERI</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.qrShareButton} onPress={handleShareCredential}>
            <Ionicons name="qr-code-outline" size={20} color="#1c170d" style={styles.buttonIcon} />
            <Text style={styles.qrShareButtonText}>Share QR Code</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing for revoke button */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Revoke Button */}
      <View style={styles.revokeButtonContainer}>
        <TouchableOpacity style={styles.revokeButton} onPress={handleRevokeCredential}>
          <Text style={styles.revokeButtonText}>Revoke Credential</Text>
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
  credentialCard: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c170d',
    letterSpacing: -0.015,
    marginBottom: 8,
  },
  cardDetails: {
    gap: 4,
  },
  cardVerification: {
    fontSize: 16,
    color: '#9b844b',
  },
  cardDates: {
    fontSize: 16,
    color: '#9b844b',
  },
  sectionsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionContainer: {
    borderWidth: 1,
    borderColor: '#e8e1cf',
    borderRadius: 12,
    backgroundColor: '#fcfbf8',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1c170d',
  },
  sectionContent: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  sectionText: {
    fontSize: 14,
    color: '#9b844b',
    lineHeight: 20,
  },
  shareButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shareButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    height: 50,
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.015,
    marginLeft: 8,
  },
  qrShareButton: {
    backgroundColor: '#f4c653',
    borderRadius: 8,
    height: 50,
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrShareButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1c170d',
    letterSpacing: 0.015,
    marginLeft: 8,
  },
  buttonIcon: {
    // Icon styles handled by marginLeft on text
  },
  bottomSpacing: {
    height: 80, // Space for revoke button
  },
  revokeButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  revokeButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revokeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1c170d',
    letterSpacing: 0.015,
  },
});

export default CredentialDetailsScreen;