import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  MainTabs: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description }) => (
  <View style={styles.featureItem}>
    <View style={styles.iconContainer}>
      <Ionicons name={icon as any} size={24} color="#1c170d" />
    </View>
    <View style={styles.featureContent}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const handleGetStarted = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Image Section */}
        <View style={styles.heroContainer}>
          <Image
            source={{
              uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCYR8iT_L4ge4ZMzoKYouGagtg2_nTCcInypUHU6KzlCBJml0334-ZEYKmnl7Ij2Oq1R3xNotM98KQYKp4ACyfu94Kt30jcKtMEzS3FaxouDM2lkFsrHZuBbUJFxGq1xIij6UryUMHRtlvMG5rms-_w6n946BWwFlvK7SdOJBN9rbkb7Y6P8I8ABAm2YrQLC3l2ERJ4g3VC7doDgfZzB4uH66m77ICmYODHe1YARJoBvL8VLGD4KWf5ms9ct1WijybQmUkGJLaeVAyJ'
            }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>Your Secure Travel Identity</Text>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          <FeatureItem
            icon="shield-checkmark"
            title="Secure Credentials"
            description="Your travel documents, securely stored and managed."
          />
          <FeatureItem
            icon="lock-closed"
            title="Privacy Control"
            description="Control who sees your information and when."
          />
          <FeatureItem
            icon="share"
            title="Easy Sharing"
            description="Share your travel details with ease and confidence."
          />
        </View>
      </ScrollView>

      {/* Get Started Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
          <Text style={styles.buttonText}>Get Started</Text>
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
  scrollContent: {
    flexGrow: 1,
  },
  heroContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 218,
  },
  heroImage: {
    width: '100%',
    height: 218,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1c170d',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 20,
    lineHeight: 34,
  },
  featuresContainer: {
    paddingHorizontal: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fcfbf8',
    paddingVertical: 8,
    minHeight: 72,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f3f0e7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1c170d',
    lineHeight: 20,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    color: '#9b844b',
    lineHeight: 18,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  getStartedButton: {
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
  buttonText: {
    color: '#1c170d',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.015,
  },
});

export default OnboardingScreen;