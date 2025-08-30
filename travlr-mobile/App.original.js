import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator } from 'react-native';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { initializationService } from './src/services/initializationService';

// Import existing screens
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import SecuritySetupScreen from './src/screens/SecuritySetupScreen';
import HomeScreen from './src/screens/HomeScreen';
import CredentialListScreen from './src/screens/CredentialListScreen';
import CredentialDetailsScreen from './src/screens/CredentialDetailsScreen';
import QRSharingScreen from './src/screens/QRSharingScreen';
import QRScannerScreen from './src/screens/QRScannerScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

// Import navigation service
import { navigationRef } from './src/navigation/NavigationService';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Bottom Tab Navigator
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

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
        name="QRScanner" 
        component={QRScannerScreen}
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
};

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Lufga-Light': require('./assets/fonts/Lufga-Light.otf'),
          'Lufga-Regular': require('./assets/fonts/Lufga-Regular.otf'),
          'Lufga-Medium': require('./assets/fonts/Lufga-Medium.otf'),
          'Lufga-SemiBold': require('./assets/fonts/Lufga-SemiBold.otf'),
          'Lufga-Bold': require('./assets/fonts/Lufga-Bold.otf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.log('Error loading fonts:', error);
        setFontsLoaded(true); // Continue without custom fonts
      }
    }

    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return null; // Show loading screen
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="dark" backgroundColor="#fcfbf8" />
      <AppNavigator />
    </NavigationContainer>
  );
}