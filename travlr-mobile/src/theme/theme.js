// Travlr-ID Theme with Lufga font
export const theme = {
  colors: {
    // Primary brand colors
    primary: '#2196F3',
    primaryDark: '#1976D2',
    primaryLight: '#BBDEFB',
    
    // Secondary colors
    secondary: '#FF6B35',
    secondaryLight: '#FFE0D6',
    
    // Neutral colors
    surface: '#FFFFFF',
    background: '#F8FAFC',
    backgroundSecondary: '#F1F5F9',
    
    // Text colors
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    
    // Status colors
    success: '#10B981',
    successLight: '#D1FAE5',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    
    // Card colors
    cardBackground: '#FFFFFF',
    cardBorder: '#E2E8F0',
    cardShadow: 'rgba(0, 0, 0, 0.1)',
    
    // Gradient colors
    gradientStart: '#667eea',
    gradientEnd: '#764ba2',
    
    // Travel-specific colors
    flight: '#3B82F6',
    hotel: '#8B5CF6',
    emergency: '#EF4444',
    accessibility: '#10B981',
  },
  
  fonts: {
    light: 'Lufga-Light',
    regular: 'Lufga-Regular',
    medium: 'Lufga-Medium',
    semiBold: 'Lufga-SemiBold',
    bold: 'Lufga-Bold',
  },
  
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};