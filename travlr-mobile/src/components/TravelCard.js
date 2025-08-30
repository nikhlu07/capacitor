import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../theme/theme';

const TravelCard = ({ 
  title, 
  subtitle, 
  icon, 
  iconColor, 
  status, 
  onPress, 
  children,
  gradient = false,
  style = {}
}) => {
  const CardComponent = gradient ? LinearGradient : View;
  const cardProps = gradient ? {
    colors: [theme.colors.gradientStart, theme.colors.gradientEnd],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 }
  } : {};

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <CardComponent style={[styles.card, gradient && styles.gradientCard]} {...cardProps}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            {icon && (
              <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
                <Icon name={icon} size={24} color={iconColor || theme.colors.primary} />
              </View>
            )}
            <View style={styles.textContainer}>
              <Text style={[styles.title, gradient && styles.whiteText]}>{title}</Text>
              {subtitle && (
                <Text style={[styles.subtitle, gradient && styles.whiteTextSecondary]}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>
          
          {status && (
            <View style={[
              styles.statusBadge, 
              status === 'active' && styles.activeBadge,
              status === 'pending' && styles.pendingBadge,
              status === 'verified' && styles.verifiedBadge,
            ]}>
              <Text style={[
                styles.statusText,
                status === 'active' && styles.activeText,
                status === 'pending' && styles.pendingText,
                status === 'verified' && styles.verifiedText,
              ]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </View>
          )}
        </View>
        
        {children && (
          <View style={styles.content}>
            {children}
          </View>
        )}
      </CardComponent>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  gradientCard: {
    borderWidth: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  whiteText: {
    color: theme.colors.surface,
  },
  whiteTextSecondary: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    marginLeft: theme.spacing.sm,
  },
  activeBadge: {
    backgroundColor: theme.colors.successLight,
  },
  pendingBadge: {
    backgroundColor: theme.colors.warningLight,
  },
  verifiedBadge: {
    backgroundColor: theme.colors.primaryLight,
  },
  statusText: {
    fontSize: theme.fontSizes.xs,
    fontFamily: theme.fonts.medium,
  },
  activeText: {
    color: theme.colors.success,
  },
  pendingText: {
    color: theme.colors.warning,
  },
  verifiedText: {
    color: theme.colors.primary,
  },
  content: {
    marginTop: theme.spacing.md,
  },
});

export default TravelCard;