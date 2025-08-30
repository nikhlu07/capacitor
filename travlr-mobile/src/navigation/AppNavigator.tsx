import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import all screens
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import SecuritySetupScreen from '../screens/SecuritySetupScreen';
import HomeScreen from '../screens/HomeScreen.js';
import CredentialListScreen from '../screens/CredentialListScreen';
import CredentialDetailsScreen from '../screens/CredentialDetailsScreen';
import QRSharingScreen from '../screens/QRSharingScreen';
import DataSharingScreen from '../screens/DataSharingScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import TravelPreferencesScreen from '../screens/TravelPreferencesScreen.tsx';
import DelegationScreen from '../screens/DelegationScreen';
import KeyRotationScreen from '../screens/KeyRotationScreen';

// Navigation types
export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  SecuritySetup: undefined;
  MainTabs: undefined;
  TravelPreferences: undefined;
  Delegations: undefined;
  KeyRotation: undefined;
  CredentialDetails: {
    credentialId: string;
    credentialType: string;
  };
  QRSharing: {
    credentialId: string;
    credentialData: any;
  };
  DataSharing: {
    credentialSaid?: string;
    credentialData?: any;
  };
  QRScanner: undefined;
};

export type TabParamList = {
  Home: undefined;
  Credentials: undefined;
  Notifications: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Bottom Tab Navigator
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Credentials') {
            iconName = focused ? 'card' : 'card-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#f4c653',
        tabBarInactiveTintColor: '#9b844b',
        tabBarStyle: {
          backgroundColor: '#fcfbf8',
          borderTopColor: '#e8e1cf',
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="Credentials" 
        component={CredentialListScreen}
        options={{ tabBarLabel: 'Credentials' }}
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ tabBarLabel: 'Notifications' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

// Main App Navigator
const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
        {/* Onboarding Flow */}
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen}
          options={{
            gestureEnabled: false,
          }}
        />
        
        {/* Authentication */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{
            gestureEnabled: false,
          }}
        />
        
        {/* Security Setup */}
        <Stack.Screen 
          name="SecuritySetup" 
          component={SecuritySetupScreen}
          options={{
            gestureEnabled: false,
          }}
        />
        
        {/* Main App */}
        <Stack.Screen 
          name="MainTabs" 
          component={TabNavigator}
          options={{
            gestureEnabled: false,
          }}
        />
        
        {/* Modal Screens */}
        <Stack.Screen 
          name="CredentialDetails" 
          component={CredentialDetailsScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        
        <Stack.Screen 
          name="QRSharing" 
          component={QRSharingScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        
        <Stack.Screen 
          name="DataSharing" 
          component={DataSharingScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        
        <Stack.Screen 
          name="QRScanner" 
          component={QRScannerScreen}
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
        
        <Stack.Screen 
          name="TravelPreferences" 
          component={TravelPreferencesScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        
      </Stack.Navigator>
  );
};

export default AppNavigator;