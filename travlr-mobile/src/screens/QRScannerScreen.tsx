import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Camera, CameraView } from 'expo-camera';

const { width, height } = Dimensions.get('window');

const QRScannerScreen: React.FC = () => {
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    
    try {
      // Try to parse the QR code data
      const credentialData = JSON.parse(data);
      
      Alert.alert(
        'Credential Received',
        `You've received a ${credentialData.type || 'credential'} from ${credentialData.issuer || 'unknown issuer'}`,
        [
          {
            text: 'Accept',
            onPress: () => {
              console.log('Credential accepted:', credentialData);
              navigation.goBack();
            },
          },
          {
            text: 'Decline',
            style: 'cancel',
            onPress: () => {
              setScanned(false);
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Invalid QR Code',
        'This QR code does not contain valid credential data.',
        [
          {
            text: 'OK',
            onPress: () => setScanned(false),
          },
        ]
      );
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const toggleFlash = () => {
    setFlashOn(!flashOn);
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="camera-outline" size={64} color="#e8e1cf" />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            Please enable camera access in your device settings to scan QR codes.
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        flash={flashOn ? 'on' : 'off'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan QR Code</Text>
          <TouchableOpacity onPress={toggleFlash} style={styles.headerButton}>
            <Ionicons 
              name={flashOn ? 'flash' : 'flash-off'} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>

        {/* Scanning Area */}
        <View style={styles.scanningArea}>
          <View style={styles.overlay}>
            <View style={styles.unfocusedContainer}>
              <View style={styles.unfocused} />
            </View>
            
            <View style={styles.middleContainer}>
              <View style={styles.unfocused} />
              <View style={styles.focused}>
                {/* Corner indicators */}
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <View style={styles.unfocused} />
            </View>
            
            <View style={styles.unfocusedContainer}>
              <View style={styles.unfocused} />
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            Position the QR code within the frame to scan
          </Text>
          <Text style={styles.instructionSubtext}>
            Make sure the code is clearly visible and well-lit
          </Text>
        </View>
      </CameraView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1c170d',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#9b844b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  closeButton: {
    backgroundColor: '#f4c653',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1c170d',
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  scanningArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    width: width,
    height: height * 0.6,
  },
  unfocusedContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  middleContainer: {
    flexDirection: 'row',
    height: 250,
  },
  unfocused: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  focused: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#f4c653',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructions: {
    paddingHorizontal: 32,
    paddingBottom: 32,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});

export default QRScannerScreen;