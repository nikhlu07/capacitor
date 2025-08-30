import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface ContextCardProps {
  title: string;
  description: string;
  company: string;
  issuedDate: string;
  expiresIn?: string;
  status: 'active' | 'expired' | 'pending' | 'verified';
  type?: 'travel_preferences' | 'flight_preferences' | 'hotel_preferences' | 'emergency_contact' | string;
  onPress?: () => void;
  style?: any;
}

const ContextCard: React.FC<ContextCardProps> = ({
  title,
  description,
  company,
  issuedDate,
  expiresIn,
  status,
  type = 'travel_preferences',
  onPress,
  style,
}) => {
  const getGradientColors = (cardType: string): readonly [string, string] => {
    switch (cardType.toLowerCase()) {
      case 'travel_preferences':
      case 'master_card':
        return ['#667eea', '#764ba2'] as const;
      case 'flight_preferences':
        return ['#f093fb', '#f5576c'] as const;
      case 'hotel_preferences':
        return ['#4facfe', '#00f2fe'] as const;
      case 'emergency_contact':
        return ['#43e97b', '#38f9d7'] as const;
      default:
        return ['#667eea', '#764ba2'] as const;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return '#43e97b'; // Green from emergency_contact
      case 'verified':
        return '#4facfe'; // Blue from hotel_preferences
      case 'pending':
        return '#f093fb'; // Purple from flight_preferences
      case 'expired':
        return '#f5576c'; // Red from flight_preferences gradient
      default:
        return '#667eea'; // Default blue from travel_preferences
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const gradientColors = getGradientColors(type);
  const statusColor = getStatusColor();

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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandIcon}>
            <Ionicons name="business-outline" size={20} color="white" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.company} numberOfLines={1}>{company}</Text>
            <Text style={styles.date}>Issued: {formatDate(issuedDate)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
            <View style={[styles.statusDot, { backgroundColor: 'white' }]} />
            <Text style={[styles.statusText, { color: 'white' }]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {expiresIn && (
            <View style={styles.footerItem}>
              <Ionicons name="time-outline" size={14} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.footerText}>Expires in {expiresIn}</Text>
            </View>
          )}
          <View style={styles.footerItem}>
            <Ionicons name="document-text-outline" size={14} color="white" />
            <Text style={[styles.footerText, { marginLeft: 4 }]}>View details</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width - 40,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    padding: 16,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  company: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  date: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',    
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});

export default ContextCard;
