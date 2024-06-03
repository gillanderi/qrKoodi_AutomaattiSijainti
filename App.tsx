import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Button, } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { BottomNavigation, IconButton, Text } from 'react-native-paper';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import ottoData from './automaatit.json';

const App: React.FC = () => {

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [type, setType] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [nearestOtto, setNearestOtto] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Paikannus lupaa ei ole myönnetty');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    console.log('Scanned barcode type:', type);
    setScanned(true);
    setType(type);
    setUrl(data);
    setIndex(1);
  };

  const startCamera = () => {
    setIsCameraOpen(true);
    setScanned(false);
  };

  const closeCamera = () => {
    setIsCameraOpen(false);
    setScanned(false);
  };

  const findNearestOtto = () => {
    if (!location) return;

    let nearest: any | null = null;
    let minDistance = Number.MAX_VALUE;

    ottoData.forEach(otto => {
      const distance = calculateDistance(location.coords.latitude, location.coords.longitude, otto.koordinaatti_LAT, otto.koordinaatti_LON);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = otto;
      }
    });

    if (nearest) {
      nearest.distance = minDistance;
      setNearestOtto(nearest);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; 
    return distance;
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  const renderQRScanner = () => {
    if (scanned && url && (url.startsWith('http://') || url.startsWith('https://'))) {
      return (
        <View>
          <View style={styles.checkAgainButton}>
            <Button title="Tarkista uudelleen" onPress={() => setScanned(false)} />
          </View>
          <View style={styles.openWebPageButton}>
            {url && <WebView source={{ uri: url }} style={{ flex: 1 }} />}
          </View>
        </View>
      );
    } else {
      return (
        <View style={{ flex: 1 }}>
          <View style={styles.cameraContainer}>
            {isCameraOpen && (
              <View style={styles.closeIcon}>
                <IconButton icon="close" size={30} onPress={closeCamera} />
              </View>
            )}
            {!isCameraOpen && (
              <View style={styles.openScannerButton}>
                <Button title="Avaa skanneri" onPress={startCamera} />
              </View>
            )}
            {isCameraOpen && <Camera onBarCodeScanned={scanned ? undefined : handleBarCodeScanned} style={{ flex: 1 }} />}
            {scanned && (
              <View>
                <View style={styles.checkAgainButton}>
                  <Button title="Tarkista uudelleen" onPress={() => setScanned(false)} />
                </View>
              </View>
            )}
          </View>
        </View>
      );
    }
  };

  const renderNearestOtto = () => {
    if (!nearestOtto) {
      return (
        <View style={styles.nearestOttoContainer}>
          <Button title="Etsi lähin Otto-automaatti" onPress={findNearestOtto} />
        </View>
      );
    } else {
      return (
        <View style={styles.nearestOttoContainer}>
          <Text>Lähin automaatti:</Text>
          <Text>{nearestOtto.katuosoite}</Text>
          <Text>{nearestOtto.postinumero} {nearestOtto.postitoimipaikka}</Text>
          <Text>Etäisyys: {nearestOtto.distance.toFixed(2)} km</Text>
        </View>
      );
    }
  };

  const renderWebView = () => {
    return (
      <View style={{ flex: 1 }}>
        <WebView source={{ uri: url || '' }} />
      </View>
    );
  };

  const renderScene = BottomNavigation.SceneMap({
    scanner: renderQRScanner,
    webpage: renderWebView,
    nearestOtto: renderNearestOtto,
  });

  const [routes] = useState([
    { key: 'scanner', title: 'Skanneri', icon: 'camera' },
    { key: 'webpage', title: 'Verkkosivu', icon: 'web' },
    { key: 'nearestOtto', title: 'Lähin automaatti', icon: 'atm' },
  ]);

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <BottomNavigation navigationState={{ index, routes }} onIndexChange={setIndex} renderScene={renderScene} />
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  closeIcon: {
    position: 'absolute',
    top: 10,
    right: 0,
    zIndex: 1,
  },
  openScannerButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    zIndex: 1,
    transform: [{ translateX: -75 }, { translateY: -15 }],
  },
  checkAgainButton: {
    position: 'absolute',
    bottom: 60,
    left: '50%',
    zIndex: 1,
    transform: [{ translateX: -75 }],
  },
  openWebPageButton: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    zIndex: 1,
    transform: [{ translateX: -75 }],
  },
  nearestOttoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;