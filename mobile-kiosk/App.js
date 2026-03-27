import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import axios from 'axios';

const DEFAULT_API_URL = 'https://hr-management-system-cloud.vercel.app';

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [apiUrl] = useState(DEFAULT_API_URL);
  const [scanStatus, setScanStatus] = useState('idle');
  const [resultMessage, setResultMessage] = useState('');
  const [employeeInfo, setEmployeeInfo] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || scanStatus === 'processing') return;
    setScanned(true);
    setScanStatus('processing');
    setResultMessage('Verifying attendance...');
    setEmployeeInfo(null);

    try {
      const response = await axios.post(`${apiUrl}/api/attendance-scan`, {
        employee_id: data.trim(),
        device_id: 'MOBILE-NATIVE-KIOSK'
      });
      const result = response.data;
      if (result.success) {
        setEmployeeInfo(result.employee);
        if (result.status === 'ALREADY COMPLETED') {
          setScanStatus('warning');
          setResultMessage('Attendance already completed for today.');
        } else {
          setScanStatus('success');
          setResultMessage(`Successfully recorded ${result.status}`);
        }
      } else {
        setScanStatus('error');
        setResultMessage(result.error || 'Failed to record attendance');
      }
    } catch (err) {
      setScanStatus('error');
      if (err.response && err.response.data && err.response.data.error) {
        setResultMessage(err.response.data.error);
      } else {
        setResultMessage('Network Error. Check server connection.');
      }
    } finally {
      setTimeout(() => {
        setScanStatus('idle');
        setResultMessage('');
        setEmployeeInfo(null);
        setScanned(false);
      }, 4000);
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text style={{ color: 'white' }}>Requesting camera permission...</Text></View>;
  }
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'white', marginBottom: 20 }}>No access to camera</Text>
        <Button title="Allow Camera" onPress={async () => {
          const { status } = await Camera.requestCameraPermissionsAsync();
          setHasPermission(status === 'granted');
        }} />
      </View>
    );
  }

  const getStatusColors = () => {
    switch (scanStatus) {
      case 'success': return { bg: '#064e3b', box: '#10b981' };
      case 'error': return { bg: '#7f1d1d', box: '#ef4444' };
      case 'warning': return { bg: '#78350f', box: '#f59e0b' };
      case 'processing': return { bg: '#1e293b', box: '#94a3b8' };
      default: return { bg: '#0f172a', box: '#6366f1' };
    }
  };

  const colors = getStatusColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Melann HR Kiosk</Text>
        <Text style={styles.headerSubtitle}>Point your ID at the camera</Text>
      </View>

      <View style={styles.scannerWrapper}>
        <CameraView
          style={styles.camera}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        >
          <View style={[styles.overlayBox, { borderColor: colors.box }]}>
            {scanStatus === 'processing' && (
              <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />
            )}
          </View>
        </CameraView>
      </View>

      <View style={styles.resultContainer}>
        {scanStatus !== 'idle' && (
          <View style={styles.resultCard}>
            <Text style={[styles.resultMessage,
              scanStatus === 'success' && { color: '#34d399' },
              scanStatus === 'error' && { color: '#f87171' },
              scanStatus === 'warning' && { color: '#fbbf24' }
            ]}>
              {resultMessage}
            </Text>
            {employeeInfo && (
              <View style={styles.employeeCard}>
                <Text style={styles.empName}>{employeeInfo.name}</Text>
                <Text style={styles.empRole}>{employeeInfo.position}</Text>
                <Text style={styles.empDept}>{employeeInfo.department}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.resetBtn} onPress={() => {
              setScanned(false); setScanStatus('idle'); setEmployeeInfo(null); setResultMessage('');
            }}>
              <Text style={styles.resetBtnText}>Tap to Scan Next</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');
const scannerSize = width * 0.75;

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { position: 'absolute', top: 60, alignItems: 'center', width: '100%', zIndex: 10 },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  headerSubtitle: { color: '#94a3b8', fontSize: 16, marginTop: 5 },
  scannerWrapper: { width: scannerSize, height: scannerSize, borderRadius: 20, overflow: 'hidden', borderWidth: 4, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#000' },
  camera: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlayBox: { width: '80%', height: '80%', borderWidth: 3, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  loader: { transform: [{ scale: 1.5 }] },
  resultContainer: { position: 'absolute', bottom: 50, width: '90%' },
  resultCard: { backgroundColor: 'rgba(0,0,0,0.6)', padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  resultMessage: { color: 'white', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  employeeCard: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 15, borderRadius: 12, width: '100%', alignItems: 'center', marginBottom: 15 },
  empName: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  empRole: { color: '#fbbf24', fontSize: 16, marginTop: 4 },
  empDept: { color: '#cbd5e1', fontSize: 14, marginTop: 2 },
  resetBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25 },
  resetBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
