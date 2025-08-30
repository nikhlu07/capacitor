import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface CredentialCardProps {
  credential: {
    said: string;
    type: string;
    issuer: string;
    issuedAt: string;
    expiresAt?: string;
    status: 'active' | 'expired' | 'pending' | 'verified';
    data?: any;
  };
  onPress?: () => void;
  style?: any;
}

const CredentialCard: React.FC<CredentialCardProps> = ({ credential, onPress, style }) => {
  const getGradientColors = (type: string) => {
    switch (type.toLowerCase()) {
      case 'travel_preferences':
      case 'master_card':
        return ['#667eea', '#764ba2'];
      case 'flight_preferences':
        return ['#f093fb', '#f5576c'];
      case 'hotel_preferences':
        return ['#4facfe', '#00f2fe'];
      case 'emergency_contact':
        return ['#43e97b', '#38f9d7'];
      default:
        return ['#667eea', '#764ba2'];
    }
  };

  const getCredentialIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'travel_preferences':
      case 'master_card':
        return 'card-outline';
      case 'flight_preferences':
        return 'airplane-outline';
      case 'hotel_preferences':
        return 'bed-outline';
      case 'emergency_contact':
        return 'call-outline';
      default:
        return 'document-outline';
    }
  };

  const formatCredentialType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#00C851';
      case 'verified':
        return '#007bff';
      case 'pending':
        return '#ffbb33';
      case 'expired':
        return '#ff4444';
      default:
        return '#6c757d';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const gradientColors = getGradientColors(credential.type);
  const iconName = getCredentialIcon(credential.type);
  const displayType = formatCredentialType(credential.type);

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Header with Type and Status */}
        <View style={styles.header}>
          <View style={styles.typeContainer}>
            <Ionicons name={iconName as any} size={24} color="rgba(255,255,255,0.9)" />
            <Text style={styles.typeText}>{displayType}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(credential.status) }]}>
            <Text style={styles.statusText}>{credential.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <Text style={styles.issuerText}>Issued by {credential.issuer}</Text>
          <Text style={styles.issuedDate}>
            Issued: {formatDate(credential.issuedAt)}
          </Text>
          {credential.expiresAt && (
            <Text style={styles.expiresDate}>
              Expires: {formatDate(credential.expiresAt)}
            </Text>
          )}
        </View>

        {/* SAID Footer */}
        <View style={styles.footer}>
          <Text style={styles.saidLabel}>SAID</Text>
          <Text style={styles.saidText} numberOfLines={1} ellipsizeMode="middle">
            {credential.said}
          </Text>
        </View>

        {/* KERI Verification Indicator */}
        <View style={styles.keriIndicator}>
          <Ionicons name="shield-checkmark" size={16} color="rgba(255,255,255,0.9)" />
          <Text style={styles.keriText}>KERI Verified</Text>
        </View>

        {/* Decorative Elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    width: width - 32,
    minHeight: 200,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  issuerText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: 8,
  },
  issuedDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  expiresDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  footer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  saidLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  saidText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: 'rgba(255,255,255,0.9)',
  },
  keriIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  keriText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
    fontWeight: '500',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});

export default CredentialCard;