import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { credentialService } from '../services/credentialService';
import CredentialCard from '../components/CredentialCard';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  CredentialDetails: {
    credentialId: string;
    credentialType: string;
  };
  QRScanner: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;


const CredentialListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [credentials, setCredentials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async (forceRefresh: boolean = false) => {
    try {
      setError(null);
      const credentialsList = await credentialService.getCredentials(forceRefresh);
      
      // Transform to display format for new CredentialCard component
      const displayCredentials = credentialsList.map(cred => ({
        said: cred.credential_id,
        type: cred.credential_type,
        issuer: 'Travlr-ID',
        issuedAt: cred.issued_at,
        expiresAt: cred.expires_at,
        status: cred.status as 'active' | 'expired' | 'pending' | 'verified',
        data: cred,
      }));
      
      setCredentials(displayCredentials);
    } catch (error: any) {
      console.error('Failed to load credentials:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCredentials(true);
  };

  const handleCredentialPress = (credential: any) => {
    navigation.navigate('CredentialDetails', {
      credentialId: credential.said,
      credentialType: credential.type,
    });
  };

  const handleScanQR = () => {
    // QR scanning removed - KERI uses OOBI discovery instead
    Alert.alert('Feature Updated', 'Data sharing now uses KERI OOBI discovery instead of QR codes.');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Credentials</Text>
        <TouchableOpacity onPress={handleScanQR} style={styles.scanButton}>
          <Ionicons name="qr-code-outline" size={24} color="#1c170d" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading && credentials.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading credentials...</Text>
          </View>
        ) : error && credentials.length === 0 ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#e74c3c" />
            <Text style={styles.errorTitle}>Failed to Load</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadCredentials(true)}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Credentials List */}
            <View style={styles.credentialsContainer}>
              {credentials.map((credential) => (
                <CredentialCard
                  key={credential.said}
                  credential={credential}
                  onPress={() => handleCredentialPress(credential)}
                  style={styles.credentialCardStyle}
                />
              ))}
            </View>

            {/* Empty State */}
            {credentials.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="card-outline" size={64} color="#e8e1cf" />
                <Text style={styles.emptyStateTitle}>No Credentials Yet</Text>
                <Text style={styles.emptyStateText}>
                  Your verified credentials will appear here once you receive them.
                </Text>
              </View>
            )}
          </>
        )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c170d',
    letterSpacing: -0.02,
  },
  scanButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
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
  scrollView: {
    flex: 1,
  },
  credentialsContainer: {
    paddingHorizontal: 16,
  },
  credentialCardStyle: {
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1c170d',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9b844b',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    fontSize: 16,
    color: '#9b844b',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1c170d',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#9b844b',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#f4c653',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1c170d',
  },
});

export default CredentialListScreen;