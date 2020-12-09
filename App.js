import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  Alert,
  Linking,
  Animated,
  ActivityIndicator,
  InteractionManager,
  Settings,
} from 'react-native';
import * as Location from 'expo-location';
import { useAppState } from '@react-native-community/hooks';
import useInterval from 'react-use/lib/useInterval';
import useUnmount from 'react-use/lib/useUnmount';
import firestore from '@react-native-firebase/firestore';
import { featureCollection, point } from '@turf/helpers';
import { useNetInfo } from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';

import SheetModal from './components/UI/SheetModal';
import RadarMap from './components/RadarMap';
import BlurStatusBar from './components/BlurStatusBar';
import InfoSheet from './components/InfoSheet';
import InfoButton from './components/InfoButton';
import LocationButton from './components/LocationButton';
import Player from './components/Player';
import ShotSheet from './components/ShotSheet';
import WelcomeSheet from './components/WelcomeSheet';

import WindDirectionContext from './contexts/wind-direction';

import meanAngleDeg from './utils/meanAngleDeg';
import {
  convertRadar2Values,
  convertValues2GeoJSON,
  genMidValues,
} from './utils/radarUtils';
import trackEvent from './utils/trackEvent';

import styles from './styles/global';

const TESTING_MODE = __DEV__ && false;
const testSnapshot = __DEV__ ? require('./utils/testSnapshot').default : null;

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
  const setObservations = (shape) => {
    if (shape && observationsSourceRef.current) {
      observationsSourceRef.current.setNativeProps({ shape });
      setShotDataRef('observationsShape', shape);
    }
  };

  const [windDirections, setWindDirections] = useState([]);
  const handleObservations = (obs) => {
    const windDirs = [];
    const points = obs.map((d) => {
      const { id, lng, lat, ...props } = d;
      if (props.wind_direction) {
        windDirs.push(props.wind_direction);
      }
      return point([lng, lat], props, { id });
    });
    setWindDirections(windDirs);
    const pointsCollection = featureCollection(points);
    setObservations(pointsCollection);
  };
  const showObservations = useCallback(() => {
    if (TESTING_MODE) {
      const obs = require('./test-snapshots/observations.json');
      setTimeout(() => {
        handleObservations(obs);
      }, 300);
    } else {
      fetch('https://api.checkweather.sg/v2/observations')
        .then((res) => res.json())
        .then(handleObservations)
        .catch((e) => {});
    }
  }, []);
  useEffect(showObservations, []);
  useInterval(
    showObservations,
    currentAppState === 'active' ? 2 * 60 * 1000 : null,
  );

  const [snapshots, setSnapshots] = useState([]);
  const snapshotsCount = snapshots.length;

  const shotDataRef = useRef({});
  const setShotDataRef = (k, v) => {
    if (shotDataRef.current) {
      shotDataRef.current[k] = v;
    }
  };

  const rainRadarLayerRef = useRef(null);
  const mapRef = useRef(null);
  const cameraRef = useRef(null);

  const setRainRadarFilterID = (id, index) => {
    if (id && rainRadarLayerRef.current) {
      rainRadarLayerRef.current.setNativeProps({
        filter: ['==', 'id', id],
      });
      setShotDataRef('id', id);
    }
    if (index && mapRef.current) {
      const obsVisibility = index >= snapshotsCount - 1;
      mapRef.current.setSourceVisibility(obsVisibility, 'observations');
    }
  };

  const rainRadarSourceRef = useRef(null);
  const setRainRadarGeoJSON = (shape) => {
    if (shape && rainRadarSourceRef.current) {
      rainRadarSourceRef.current.setNativeProps({ shape });
      setShotDataRef('rainRadarShape', shape);
    }
  };

  const [loading, setLoading] = useState(false);
  const first = useRef(true);
  const snapshotCount = useRef(0);

  const processSnapshots = async (snapshotID, s) => {
    const shots = [];
    const geoJSONList = [];
    let timeDiff;

    const docs = s.docs;

    // FOR DEBUGGING
    // const allDocs = docs
    //   .slice()
    //   .reverse()
    //   .map(d => d.data());
    // console.log(allDocs);

    let startTime = Date.now();
    for (let i = docs.length - 1; i >= 0; i--) {
      if (snapshotID !== snapshotCount.current) return;

      const doc = docs[i];
      const rainarea = doc.data();
      const values = convertRadar2Values(rainarea.id, rainarea.radar);
      const geojsons = convertValues2GeoJSON(rainarea.id, values);
      geoJSONList.push(...geojsons);
      shots.push(rainarea);

      timeDiff = Date.now() - startTime;
      if (timeDiff > 200) {
        console.log(`SNAPSHOT SECTION ${snapshotID}: ${timeDiff}ms`);
        await pTimeout();
        startTime = Date.now();
      }

      const nextDoc = docs[i - 1];
      if (nextDoc) {
        const nextRainArea = nextDoc.data();
        const nextValues = convertRadar2Values(
          nextRainArea.id,
          nextRainArea.radar,
        );
        const midID = `${(Number(rainarea.id) + Number(nextRainArea.id)) / 2}`;
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
      setShotDataRef('snapshots', shots);
      const collection = featureCollection(geoJSONList);
      setRainRadarGeoJSON(collection);
      setLoading(false);
      first.current = false;
      console.log(
        `RENDER GEOJSON: ${Date.now() - startTime}ms - ${
          shots[shots.length - 1].id
        }`,
      );
    });
  };

  let snapshotTimeout = useRef(null);
  const onSnapshot = (s) => {
    if (TESTING_MODE) s = testSnapshot();
    if (s.empty) return;
    const snapshotID = ++snapshotCount.current;
    const { fromCache } = s.metadata;
    console.log('SNAPSHOT', snapshotID, first.current, fromCache);
    setLoading(true);
    clearTimeout(snapshotTimeout.current);

    if (fromCache) {
      snapshotTimeout.current = setTimeout(() => {
        processSnapshots(snapshotID, s);
      }, 1500);
    } else {
      if (first.current) {
        const firstDoc = s.docs[0];
        const radar = firstDoc.data().radar;
        const values = convertRadar2Values(firstDoc.id, radar);
        const geojsons = convertValues2GeoJSON(firstDoc.id, values);
        const collection = featureCollection(geojsons);
        setRainRadarGeoJSON(collection);
      }
      InteractionManager.runAfterInteractions(() => {
        processSnapshots(snapshotID, s);
      });
    }
  };

  useEffect(() => {
    let unsub = () => {};
    if (currentAppState === 'active') {
      unsub = weatherDB.onSnapshot(onSnapshot);
    }
    return () => {
      unsub();
      first.current = true;
    };
  }, [currentAppState === 'active']);

  const infoModalRef = useRef(null);
  const shotModalRef = useRef(null);
  const shotSheetRef = useRef(null);
  useUnmount(() => {
    infoModalRef.current?.close();
    shotModalRef.current?.close();
  });

  const mapCornersAnim = useRef(new Animated.Value(1)).current;
  const setMapCornersVisible = (visible) => {
    Animated.timing(mapCornersAnim, {
      useNativeDriver: true,
      toValue: visible ? 1 : 0,
      duration: 300,
    }).start();
  };

  const welcomeModalRef = useRef(null);
  const welcomeOpened = !!Settings.get('welcomeOpened');
  useEffect(() => {
    if (!welcomeOpened) welcomeModalRef.current?.open();
  }, []);

  const { isInternetReachable } = useNetInfo();

  return (
    <>
      <RadarMap
        mapRef={mapRef}
        cameraRef={cameraRef}
        rainRadarSourceRef={rainRadarSourceRef}
        rainRadarLayerRef={rainRadarLayerRef}
        observationsSourceRef={observationsSourceRef}
        locationGranted={locationGranted}
        onLongPress={() => {
          if (snapshotsCount) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            shotModalRef.current?.open();
          }
        }}
      />
      <BlurStatusBar>
        {!isInternetReachable && (
          <View style={{ padding: 5 }}>
            <Text
              style={{
                textAlign: 'center',
                color: 'rgba(255,255,255,.8)',
              }}
            >
              No internet connection
            </Text>
          </View>
        )}
      </BlurStatusBar>
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
            <InfoButton onPress={() => infoModalRef.current?.open()} />
            {!locationGranted && (
              <LocationButton
                style={{ marginTop: 10 }}
                onPress={async () => {
                  trackEvent('User location button click');
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
      <SheetModal
        ref={infoModalRef}
        showCloseButton
        onOpen={() => {
          setMapCornersVisible(false);
          trackEvent('Info sheet', {
            action: 'open',
          });
        }}
        onClose={() => {
          setMapCornersVisible(true);
          trackEvent('Info sheet', {
            action: 'close',
          });
        }}
      >
        <WindDirectionContext.Provider value={meanAngleDeg(windDirections)}>
          <InfoSheet />
        </WindDirectionContext.Provider>
      </SheetModal>
      <SheetModal
        ref={shotModalRef}
        overlayStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
        onOpened={() => {
          shotSheetRef.current &&
            shotSheetRef.current.setData(shotDataRef.current);
        }}
        onOpen={() => {
          setMapCornersVisible(false);
          trackEvent('Shot sheet', {
            action: 'open',
          });
        }}
        onClose={() => {
          setMapCornersVisible(true);
          trackEvent('Shot sheet', {
            action: 'close',
          });
        }}
      >
        <ShotSheet
          ref={shotSheetRef}
          locationGranted={locationGranted}
          onClose={() => {
            shotModalRef.current?.close();
          }}
        />
      </SheetModal>
      {!welcomeOpened && (
        <SheetModal
          ref={welcomeModalRef}
          adjustToContentHeight={false}
          panGestureEnabled={false}
          closeOnOverlayTap={false}
          withHandle={false}
          customRenderer={
            <WelcomeSheet
              onClose={() => {
                welcomeModalRef.current?.close();
              }}
            />
          }
          childrenStyle={{
            flexDirection: 'row',
          }}
          onOpen={() => {
            trackEvent('Welcome sheet', {
              action: 'open',
            });
          }}
          onClose={() => {
            Settings.set({ welcomeOpened: true });
            trackEvent('Welcome sheet', {
              action: 'close',
            });
          }}
        />
      )}
    </>
  );
};

export default App;
