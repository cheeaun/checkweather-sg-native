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
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import Modal from 'react-native-modal';

import { useAppState } from '@react-native-community/hooks';
import useInterval from 'react-use/lib/useInterval';
import contours from 'd3-contour/src/contours';
import nanomemoize from 'nano-memoize';
import { featureCollection, point, polygon, round } from '@turf/helpers';
import { chaikin } from 'chaikin';

import BlurStatusBar from './components/BlurStatusBar';
import InfoSheet from './components/InfoSheet';
import InfoButton from './components/InfoButton';
import LocationButton from './components/LocationButton';
import Player from './components/Player';

import useSafeArea from './hooks/useSafeArea';
import WindDirectionContext from './contexts/wind-direction';
import meanAngleDeg from './utils/meanAngleDeg';

import config from './config.json';
import styles from './styles/global';

import MapboxGL, {
  MapView,
  UserLocation,
  Camera,
  Images,
  ShapeSource,
  FillLayer,
  SymbolLayer,
} from '@react-native-mapbox-gl/maps';
MapboxGL.setAccessToken(config.mapboxAccessToken);

import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';

import arrowDownImage from './assets/arrow-down-white.png';

const width = 217,
  height = 120;
const center = [103.8475, 1.3011];
const lowerLat = 1.156,
  upperLat = 1.475,
  lowerLong = 103.565,
  upperLong = 104.13;
const distanceLong = Math.abs(upperLong - lowerLong);
const distanceLat = Math.abs(upperLat - lowerLat);
const bounds = {
  ne: [upperLong, upperLat],
  sw: [lowerLong, lowerLat],
};

const bboxGeoJSON = polygon([
  [[-180, 90], [180, 90], [180, -90], [-180, -90], [-180, 90]],
  [
    [lowerLong, upperLat],
    [upperLong, upperLat],
    [upperLong, lowerLat],
    [lowerLong, lowerLat],
    [lowerLong, upperLat],
  ],
]);

const convertX2Lng = nanomemoize(x =>
  round(lowerLong + (x / width) * distanceLong, 4),
);
const convertY2Lat = nanomemoize(y =>
  round(upperLat - (y / height) * distanceLat, 4),
);

const convertRadar2Values = nanomemoize(
  (id, radar) => {
    const rows = radar.trimEnd().split(/\n/g);
    const values = new Array(width * height).fill(0);
    for (let y = 0, l = rows.length; y < l; y++) {
      const chars = rows[y];
      for (let x = chars.search(/[^\s]/), rl = chars.length; x < rl; x++) {
        const char = chars[x];
        if (char && char !== ' ') {
          const intensity = char.charCodeAt() - 33;
          values[y * width + x] = intensity;
        }
      }
    }
    return values;
  },
  {
    maxArgs: 1,
  },
);

const contour = contours()
  .size([width, height])
  .thresholds([5, 20, 30, 40, 50, 60, 70, 80, 85, 90, 95, 97.5])
  .smooth(false);
const convertValues2GeoJSON = nanomemoize(
  (id, values) => {
    const results = [];
    const conValues = contour(values);
    for (let i = 0, l = conValues.length; i < l; i++) {
      const { type, value, coordinates } = conValues[i];
      if (coordinates.length) {
        results.push({
          type: 'Feature',
          properties: { intensity: value, id },
          geometry: {
            type,
            coordinates: coordinates.map(c1 =>
              c1.map(c2 =>
                chaikin(c2.map(([x, y]) => [convertX2Lng(x), convertY2Lat(y)])),
              ),
            ),
          },
        });
      }
    }
    return results;
  },
  {
    maxArgs: 1,
  },
);

const genMidValues = nanomemoize(
  (id, values1, values2) => {
    const midValues = [];
    for (let i = 0, l = values1.length; i < l; i++) {
      midValues[i] = (values1[i] + values2[i]) / 2;
    }
    return midValues;
  },
  {
    maxArgs: 1,
  },
);

const RAINAREA_COUNT = 25;
const weatherDB = firestore()
  .collection('weather')
  .orderBy('id', 'desc')
  .limit(RAINAREA_COUNT);

import intensityColors from './intensity-colors.json';
const intensityColorsCount = intensityColors.length;
const radarColors = intensityColors.reduce((acc, color, i) => {
  const intensity = ((i + 1) / intensityColorsCount) * 100;
  acc.push(intensity, color);
  return acc;
}, []);
const radarFillColor = [
  'interpolate',
  ['linear'],
  ['number', ['get', 'intensity'], 0],
  0,
  'transparent',
  ...radarColors,
];

const testRadar = () => {
  let test = '';
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const intensity = ~~Math.round((j / width) * 100);
      const c = String.fromCharCode(intensity + 33);
      test += c;
    }
    test += '\n';
  }
  return test;
};

function debounce(fn, wait = 1) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.call(this, ...args), wait);
  };
}

const App = () => {
  const currentAppState = useAppState();

  useEffect(() => {
    MapboxGL.setTelemetryEnabled(false);
    // messaging().registerDeviceForRemoteMessages();
  }, []);

  if (__DEV__) {
    useEffect(() => {
      messaging()
        .getToken()
        .then(token => {
          console.log(token);
        })
        .catch(() => {});
    }, []);
  }

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

  const [observations, setObservations] = useState(featureCollection([]));
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
  let first = useRef(true);
  const processSnapshots = s => {
    const startTime = new Date();
    const shots = [];
    const geoJSONList = [];

    const docs = s.docs.reverse();
    for (let i = 0, l = docs.length; i < l; i++) {
      const doc = docs[i];
      const rainarea = doc.data();
      const values = convertRadar2Values(doc.id, rainarea.radar);
      const geojsons = convertValues2GeoJSON(doc.id, values);
      geoJSONList.push(...geojsons);

      const nextDoc = docs[i + 1];
      if (nextDoc) {
        const nextRainArea = nextDoc.data();
        const nextValues = convertRadar2Values(nextDoc.id, nextRainArea.radar);
        const midID = `${(Number(doc.id) + Number(nextDoc.id)) / 2}`;
        const midValues = genMidValues(midID, values, nextValues);
        const nextGeojsons = convertValues2GeoJSON(midID, midValues);
        geoJSONList.push(...nextGeojsons);
      }

      shots.push(rainarea);
      // await nextFrame();
    }

    const collection = featureCollection(geoJSONList);
    InteractionManager.runAfterInteractions(() => {
      setRainRadarGeoJSON(collection);
    });
    setSnapshots(shots);
    setLoading(false);
    console.log(`PROCESS SNAPSHOTS ${(new Date() - startTime) / 1000}s`);
  };

  const debouncedOnSnapshot = debounce(s => {
    console.log('SNAPSHOT TIME', first.current, new Date());
    setLoading(true);
    if (first.current) {
      const firstDoc = s.docs[0];
      const radar = firstDoc.data().radar;
      // const radar = testRadar();
      const values = convertRadar2Values(firstDoc.id, radar);
      const geojsons = convertValues2GeoJSON(firstDoc.id, values);
      setRainRadarGeoJSON(featureCollection(geojsons));
    }
    InteractionManager.runAfterInteractions(() => {
      processSnapshots(s);
    });
    first.current = false;
  }, 300);

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
    if (showInfoSheet) {
      Animated.timing(mapCornersAnim, {
        useNativeDriver: true,
        toValue: 0,
        duration: 300,
      }).start();
    } else {
      Animated.timing(mapCornersAnim, {
        useNativeDriver: true,
        toValue: 1,
        duration: 300,
      }).start();
    }
  }, [showInfoSheet]);

  const safeArea = useSafeArea();
  const cameraRef = useRef(null);
  const currentMapZoom = useRef(0);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const onRegionDidChange = async e => {
    const mapZoom = await mapRef.current.getZoom();
    const diffZoom = mapZoom !== currentMapZoom.current;
    const zoomState = mapZoom > currentMapZoom.current ? 'in' : 'out';
    currentMapZoom.current = mapZoom;

    const { isUserInteraction } = e.properties;
    if (
      isUserInteraction &&
      mapRef.current &&
      cameraRef.current &&
      diffZoom &&
      zoomState === 'out'
    ) {
      const [x2, y1] = await mapRef.current.getPointInView(bounds.ne);
      const [x1, y2] = await mapRef.current.getPointInView(bounds.sw);
      if ((x1 >= 0 || x2 <= windowWidth) && (y1 >= 0 || y2 <= windowHeight)) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        cameraRef.current.fitBounds(bounds.ne, bounds.sw, 0, 100);
      }
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" />
      <MapView
        ref={mapRef}
        style={styles.flex}
        styleURL={config.mapboxStyleURL + (__DEV__ ? '/draft' : '')}
        rotateEnabled={false}
        pitchEnabled={false}
        attributionEnabled={false}
        regionDidChangeDebounceTime={0}
        onRegionDidChange={onRegionDidChange}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: center,
            bounds,
          }}
          minZoomLevel={8}
          maxZoomLevel={14}
        />
        <Images
          images={{
            arrow: arrowDownImage,
          }}
        />
        <ShapeSource
          ref={rainRadarSourceRef}
          id="rainradar"
          shape={featureCollection([])}
        >
          <FillLayer
            ref={rainRadarLayerRef}
            id="rainradar"
            // filter={['==', 'id', rainRadarID]}
            style={{
              fillAntialias: false,
              fillColor: radarFillColor,
              fillOpacity: [
                'interpolate',
                ['linear'],
                ['zoom'],
                8,
                [
                  'case',
                  ['>', ['number', ['get', 'intensity'], 0], 90],
                  1,
                  0.4,
                ],
                12,
                0.05,
              ],
            }}
            belowLayerID="water-overlay"
          />
        </ShapeSource>
        <ShapeSource
          id="observations"
          shape={observations}
          tolerance={5}
          buffer={0}
        >
          <SymbolLayer
            id="windirections"
            filter={['has', 'wind_direction']}
            style={{
              iconImage: 'arrow',
              iconRotate: ['get', 'wind_direction'],
              iconAllowOverlap: true,
              iconIgnorePlacement: true,
              iconSize: ['interpolate', ['linear'], ['zoom'], 8, 0.05, 14, 0.6],
              iconOpacity: 0.3,
            }}
          />
          <SymbolLayer
            id="tempreadings"
            minZoomLevel={8.5}
            filter={['>', 'temp_celcius', 0]}
            style={{
              textField: '{temp_celcius}°',
              textAllowOverlap: true,
              textIgnorePlacement: true,
              textSize: ['interpolate', ['linear'], ['zoom'], 8, 10, 14, 28],
              textPadding: 1,
              textColor: 'yellow',
              textHaloColor: '#000',
              textHaloWidth: 1.5,
            }}
          />
          <SymbolLayer
            id="humidreadings"
            filter={['>', 'relative_humidity', 0]}
            minZoomLevel={10}
            style={{
              textField: '{relative_humidity}%',
              textIgnorePlacement: true,
              textSize: [
                'interpolate',
                ['linear'],
                ['zoom'],
                8,
                ['zoom'],
                14,
                14 * 1.1,
              ],
              textOffset: [0, -1.2],
              textPadding: 0,
              textColor: 'orange',
              textHaloColor: '#000',
              textHaloWidth: 1.5,
            }}
          />
          <SymbolLayer
            id="rainreadings"
            filter={['>', 'rain_mm', 0]}
            minZoomLevel={11}
            style={{
              textField: '{rain_mm}mm',
              textIgnorePlacement: true,
              textSize: [
                'interpolate',
                ['linear'],
                ['zoom'],
                8,
                ['zoom'],
                14,
                14 * 1.1,
              ],
              textOffset: [0, 1.2],
              textPadding: 0,
              textColor: 'aqua',
              textHaloColor: '#000',
              textHaloWidth: 1.5,
            }}
          />
        </ShapeSource>
        <ShapeSource id="box" tolerance={10} buffer={0} shape={bboxGeoJSON}>
          <FillLayer
            id="bbox"
            style={{
              fillColor: 'rgba(0,0,0,.5)',
              fillAntialias: false,
            }}
          />
        </ShapeSource>
        {locationGranted && (
          <UserLocation showsUserHeadingIndicator renderMode="native" />
        )}
      </MapView>
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
