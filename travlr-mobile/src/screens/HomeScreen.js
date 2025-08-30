import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { apiService } from '../services/api';
import { storageService } from '../services/storage';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employeeData, setEmployeeData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setError(null);
      
      // Get employee data from storage
      const storedEmployee = await storageService.getEmployeeData();
      if (!storedEmployee) {
        // If no employee data, redirect to registration
        Alert.alert(
          'Registration Required',
          'Please complete your registration first.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
        return;
      }

      setEmployeeData(storedEmployee);

      // Load real dashboard data from API
      try {
        const dashboardData = await apiService.getMobileDashboard(storedEmployee.employee_id);
        setDashboardData(dashboardData);
      } catch (dashboardError) {
        console.warn('Failed to load dashboard data:', dashboardError);
        // Set empty dashboard on API error
        setDashboardData(null);
      }

    } catch (error) {
      console.error('Failed to load dashboard:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadDashboardData().finally(() => setRefreshing(false));
  }, []);

  const handleViewCredentials = () => {
    navigation.navigate('Credentials');
  };

  const handleTravelPreferences = () => {
    navigation.navigate('TravelPreferences');
  };

  const handleQRShare = () => {
    navigation.navigate('DataSharing', { 
      credentialSaid: employeeData?.aid || null,
      credentialData: employeeData 
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color="#e74c3c" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDashboardData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={['#f4c653', '#f39c12']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>Welcome back!</Text>
            <Text style={styles.employeeName}>
              {employeeData?.full_name || 'Employee'}
            </Text>
            <Text style={styles.employeeId}>
              {employeeData?.employee_id || 'Please Register'}
            </Text>
          </View>
        </LinearGradient>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="card-outline" size={24} color="#3498db" />
            <Text style={styles.statNumber}>{dashboardData?.credentials_count || 0}</Text>
            <Text style={styles.statLabel}>Credentials</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="people-outline" size={24} color="#9b59b6" />
            <Text style={styles.statNumber}>7</Text>
            <Text style={styles.statLabel}>Witnesses</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#27ae60" />
            <Text style={styles.statNumber}>Active</Text>
            <Text style={styles.statLabel}>Consent</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.actionCard} onPress={handleViewCredentials}>
            <Ionicons name="list-outline" size={24} color="#3498db" />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View Credentials</Text>
              <Text style={styles.actionSubtitle}>Manage your travel credentials</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#bdc3c7" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleTravelPreferences}>
            <Ionicons name="airplane-outline" size={24} color="#e67e22" />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Travel Preferences</Text>
              <Text style={styles.actionSubtitle}>Update your travel preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#bdc3c7" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleQRShare}>
            <Ionicons name="qr-code-outline" size={24} color="#8e44ad" />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Share Data</Text>
              <Text style={styles.actionSubtitle}>Generate QR code for data sharing</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#bdc3c7" />
          </TouchableOpacity>
        </View>

        {/* Data Sharing Status */}
        {dashboardData?.active_sharing && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Sharing Status</Text>
            <View style={styles.sharingGrid}>
              <View style={styles.sharingItem}>
                <Ionicons 
                  name={dashboardData.active_sharing.scania ? "checkmark-circle" : "close-circle"} 
                  size={20} 
                  color={dashboardData.active_sharing.scania ? "#27ae60" : "#95a5a6"} 
                />
                <Text style={styles.sharingLabel}>Scania Access</Text>
              </View>
              
              <View style={styles.sharingItem}>
                <Ionicons 
                  name={dashboardData.active_sharing.flight_prefs ? "checkmark-circle" : "close-circle"} 
                  size={20} 
                  color={dashboardData.active_sharing.flight_prefs ? "#27ae60" : "#95a5a6"} 
                />
                <Text style={styles.sharingLabel}>Flight Preferences</Text>
              </View>
              
              <View style={styles.sharingItem}>
                <Ionicons 
                  name={dashboardData.active_sharing.hotel_prefs ? "checkmark-circle" : "close-circle"} 
                  size={20} 
                  color={dashboardData.active_sharing.hotel_prefs ? "#27ae60" : "#95a5a6"} 
                />
                <Text style={styles.sharingLabel}>Hotel Preferences</Text>
              </View>
            </View>
          </View>
        )}

        {/* Recent Activity */}
        {dashboardData?.recent_access && dashboardData.recent_access.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Data Access</Text>
            {dashboardData.recent_access.map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <Ionicons 
                    name={activity.access_granted ? "checkmark-circle" : "close-circle"} 
                    size={20} 
                    color={activity.access_granted ? "#27ae60" : "#e74c3c"} 
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{activity.requester}</Text>
                  <Text style={styles.activityDescription}>{activity.purpose}</Text>
                  <Text style={styles.activityTime}>
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginVertical: 20,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  headerContent: {
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 5,
  },
  employeeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  employeeId: {
    fontSize: 14,
    color: '#34495e',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  statCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  actionCard: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionContent: {
    flex: 1,
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  sharingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sharingItem: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    width: '48%',
  },
  sharingLabel: {
    fontSize: 14,
    color: '#2c3e50',
    marginLeft: 8,
  },
  activityItem: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  activityIcon: {
    marginRight: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  activityDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 4,
  },
});

export default HomeScreen;