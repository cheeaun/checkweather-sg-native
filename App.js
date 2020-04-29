import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  StatusBar,
  useWindowDimensions,
  Alert,
  Linking,
  Animated,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import * as Location from 'expo-location';
import Modal from 'react-native-modal';
import { useAppState } from '@react-native-community/hooks';
import useInterval from 'react-use/lib/useInterval';
import firestore from '@react-native-firebase/firestore';
import { featureCollection, point } from '@turf/helpers';

import RadarMap from './components/RadarMap';
import BlurStatusBar from './components/BlurStatusBar';
import InfoSheet from './components/InfoSheet';
import InfoButton from './components/InfoButton';
import LocationButton from './components/LocationButton';
import Player from './components/Player';

import WindDirectionContext from './contexts/wind-direction';

import meanAngleDeg from './utils/meanAngleDeg';
import debounce from './utils/debounce';
import testRadar from './utils/testRadar';
import {
  convertRadar2Values,
  convertValues2GeoJSON,
  genMidValues,
} from './utils/radarUtils';

import styles from './styles/global';

const TEST_RADAR = false;

const RAINAREA_COUNT = 25;
const weatherDB = firestore()
  .collection('weather')
  .orderBy('id', 'desc')
  .limit(RAINAREA_COUNT);

function pTimeout(t = 1) {
  return new Promise((res, rej) => {
    setTimeout(() => {
      InteractionManager.runAfterInteractions(res);
    }, t);
  });
}

const App = () => {
  const currentAppState = useAppState();

  const [locationGranted, setLocationGranted] = useState(false);
  const [locationAskAgain, setLocationAskAgain] = useState(false);
  useEffect(() => {
    if (currentAppState !== 'active') return;
    (async () => {
      const { granted, canAskAgain } = await Location.getPermissionsAsync();
      setLocationGranted(granted);
      setLocationAskAgain(canAskAgain);
    })();
  }, [currentAppState === 'active']);

  const observationsSourceRef = useRef(null);
  const setObservations = shape => {
    if (observationsSourceRef.current) {
      observationsSourceRef.current.setNativeProps({ shape });
    }
  };

  const [windDirections, setWindDirections] = useState([]);
  const showObservations = useCallback(() => {
    fetch('https://api.checkweather.sg/v2/observations')
      .then(res => res.json())
      .then(data => {
        const windDirs = [];
        const points = data.map(d => {
          const { id, lng, lat, ...props } = d;
          // Special case for S121 overlapping with S23
          if (id === 'S121') {
            delete props.temp_celcius;
            delete props.relative_humidity;
          }
          if (props.wind_direction) {
            windDirs.push(props.wind_direction);
          }
          return point([lng, lat], props, { id });
        });
        setWindDirections(windDirs);
        const pointsCollection = featureCollection(points);
        setObservations(pointsCollection);
      });
  }, []);
  useEffect(showObservations, []);
  useInterval(showObservations, 2 * 60 * 1000);

  const [snapshots, setSnapshots] = useState([]);
  const snapshotsCount = snapshots.length;

  const rainRadarLayerRef = useRef(null);
  const mapRef = useRef(null);
  const cameraRef = useRef(null);

  const setRainRadarFilterID = (id, index) => {
    if (id && rainRadarLayerRef.current) {
      rainRadarLayerRef.current.setNativeProps({
        filter: ['==', 'id', id],
      });
    }
    if (index && mapRef.current) {
      const obsVisibility = index >= snapshotsCount - 1;
      mapRef.current.setSourceVisibility(obsVisibility, 'observations');
    }
  };

  const rainRadarSourceRef = useRef(null);
  const setRainRadarGeoJSON = shape => {
    if (shape && rainRadarSourceRef.current) {
      rainRadarSourceRef.current.setNativeProps({ shape });
    }
  };

  const [loading, setLoading] = useState(false);
  const first = useRef(true);
  const snapshotCount = useRef(0);

  const processSnapshots = async (snapshotID, s) => {
    const shots = [];
    const geoJSONList = [];
    let timeDiff;

    const docs = s.docs.reverse();
    let startTime = Date.now();
    for (let i = 0, l = docs.length; i < l; i++) {
      if (snapshotID !== snapshotCount.current) return;

      const doc = docs[i];
      const rainarea = doc.data();
      const values = convertRadar2Values(
        doc.id,
        TEST_RADAR ? testRadar() : rainarea.radar,
      );
      const geojsons = convertValues2GeoJSON(doc.id, values);
      geoJSONList.push(...geojsons);
      shots.push(rainarea);

      timeDiff = Date.now() - startTime;
      if (timeDiff > 200) {
        console.log(`SNAPSHOT SECTION ${snapshotID}: ${timeDiff}ms`);
        await pTimeout();
        startTime = Date.now();
      }

      const nextDoc = docs[i + 1];
      if (nextDoc) {
        const nextRainArea = nextDoc.data();
        const nextValues = convertRadar2Values(
          nextDoc.id,
          TEST_RADAR ? testRadar() : nextRainArea.radar,
        );
        const midID = `${(Number(doc.id) + Number(nextDoc.id)) / 2}`;
        const midValues = genMidValues(midID, values, nextValues);
        const midGeojsons = convertValues2GeoJSON(midID, midValues);
        geoJSONList.push(...midGeojsons);

        timeDiff = Date.now() - startTime;
        if (timeDiff > 200) {
          console.log(`SNAPSHOT SECTION ${snapshotID}: ${timeDiff}ms`);
          await pTimeout();
          startTime = Date.now();
        }
      }
    }

    timeDiff = Date.now() - startTime;
    console.log(`SNAPSHOT SECTION ${snapshotID}: ${timeDiff}ms`);

    InteractionManager.runAfterInteractions(() => {
      if (snapshotID !== snapshotCount.current) return;
      const startTime = Date.now();
      setSnapshots(shots);
      const collection = featureCollection(geoJSONList);
      setRainRadarGeoJSON(collection);
      setLoading(false);
      console.log(`RENDER GEOJSON: ${Date.now() - startTime}ms`);
    });
  };

  const onSnapshot = s => {
    const snapshotID = ++snapshotCount.current;
    console.log('SNAPSHOT', snapshotID, first.current);
    setLoading(true);
    if (first.current) {
      const firstDoc = s.docs[0];
      const radar = firstDoc.data().radar;
      const values = convertRadar2Values(
        firstDoc.id,
        TEST_RADAR ? testRadar() : radar,
      );
      const geojsons = convertValues2GeoJSON(firstDoc.id, values);
      const collection = featureCollection(geojsons);
      setRainRadarGeoJSON(collection);
    }
    InteractionManager.runAfterInteractions(() => {
      processSnapshots(snapshotID, s);
    });
    first.current = false;
  };
  const debouncedOnSnapshot = debounce(onSnapshot, 300);

  useEffect(() => {
    let unsub = () => {};
    if (currentAppState === 'active') {
      unsub = weatherDB.onSnapshot(debouncedOnSnapshot);
    }
    return () => {
      unsub();
      first.current = false;
    };
  }, [currentAppState === 'active']);

  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const mapCornersAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(mapCornersAnim, {
      useNativeDriver: true,
      toValue: showInfoSheet ? 0 : 300,
      duration: 300,
    }).start();
  }, [showInfoSheet]);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  return (
    <>
      <StatusBar barStyle="light-content" />
      <RadarMap
        mapRef={mapRef}
        cameraRef={cameraRef}
        rainRadarSourceRef={rainRadarSourceRef}
        rainRadarLayerRef={rainRadarLayerRef}
        observationsSourceRef={observationsSourceRef}
        locationGranted={locationGranted}
      />
      <BlurStatusBar />
      <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View
          style={[styles.flex, styles.relative, { opacity: mapCornersAnim }]}
          pointerEvents="box-none"
        >
          <View
            style={[styles.mapCorner, styles.mapCornerBottomRight]}
            pointerEvents="none"
          >
            <ActivityIndicator
              color="rgba(255,255,255,.5)"
              animating={loading}
            />
          </View>
          <View
            style={[styles.mapCorner, styles.mapCornerTopRight]}
            pointerEvents="box-none"
          >
            <InfoButton onPress={() => setShowInfoSheet(true)} />
            {!locationGranted && (
              <LocationButton
                style={{ marginTop: 10 }}
                onPress={async () => {
                  if (locationAskAgain) {
                    const {
                      granted,
                    } = await Location.requestPermissionsAsync();
                    setLocationGranted(granted);
                  } else {
                    Alert.alert(
                      'Location disabled',
                      'Please turn on your location settings to show your current location on the map.',
                      [
                        {
                          text: 'No, thanks',
                        },
                        {
                          text: 'Go to Settings',
                          style: 'cancel',
                          onPress: () => Linking.openSettings(),
                        },
                      ],
                    );
                  }
                }}
              />
            )}
          </View>
          <View
            style={[
              styles.mapCorner,
              styles.mapCornerBottom,
              {
                alignItems: 'center',
              },
            ]}
            pointerEvents="box-none"
          >
            <Player
              snapshots={snapshots}
              initialValue={snapshotsCount}
              onRainIDChange={setRainRadarFilterID}
            />
          </View>
        </Animated.View>
      </SafeAreaView>
      <Modal
        useNativeDriver
        backdropOpacity={0.5}
        isVisible={showInfoSheet}
        hideModalContentWhileAnimating
        onBackdropPress={() => {
          setShowInfoSheet(false);
        }}
        style={{
          justifyContent:
            windowWidth > 500 && windowHeight > 500 ? 'center' : 'flex-end',
          alignItems: 'center',
          margin: 0,
        }}
      >
        <WindDirectionContext.Provider value={meanAngleDeg(windDirections)}>
          <InfoSheet onClose={() => setShowInfoSheet(false)} />
        </WindDirectionContext.Provider>
      </Modal>
    </>
  );
};

export default App;
