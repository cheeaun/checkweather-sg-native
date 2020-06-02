import React, {
  forwardRef,
  useRef,
  useImperativeHandle,
  useState,
} from 'react';
import {
  View,
  Text,
  Switch,
  TouchableHighlight,
  Platform,
  ActivityIndicator,
  StyleSheet,
  LayoutAnimation,
} from 'react-native';
import {
  ShapeSource,
  SymbolLayer,
  UserLocation,
} from '@react-native-mapbox-gl/maps';
import { point } from '@turf/helpers';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import Share from 'react-native-share';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

import SheetBlock from './UI/SheetBlock';
import Button from './UI/Button';

import convertRainID2Time from '../utils/convertRainID2Time';

import styles from '../styles/global';

import { lowerLat, upperLong } from '../map-config.json';

import RadarMap from './RadarMap';
const aspectRatio = 225 / 127;

export default forwardRef(
  ({ onClose = () => {}, locationGranted = false }, ref) => {
    const mapRef = useRef(null);
    const rainRadarSourceRef = useRef(null);
    const rainRadarLayerRef = useRef(null);
    const observationsSourceRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [index, setIndex] = useState(1);
    const [snapshots, setSnapshots] = useState([]);
    const [showUserLocation, setShowUserLocation] = useState(false);
    const [rainTime, setRainTime] = useState('');
    const [exporting, setExporting] = useState(false);

    const snapshotsCount = snapshots.length;

    useImperativeHandle(ref, () => ({
      setData: ({ id, snapshots, rainRadarShape, observationsShape }) => {
        if (snapshots.length) {
          setSnapshots(snapshots);
        }
        if (rainRadarShape && rainRadarSourceRef.current) {
          rainRadarSourceRef.current.setNativeProps({ shape: rainRadarShape });
        }
        if (observationsShape && observationsSourceRef.current) {
          observationsSourceRef.current.setNativeProps({
            shape: observationsShape,
          });
        }
        if (id) {
          if (rainRadarLayerRef.current) {
            rainRadarLayerRef.current.setNativeProps({
              filter: ['==', 'id', id],
            });
          }
          setRainTime(convertRainID2Time(id));
          const index = snapshots.findIndex(s => s.id === id) + 1;
          setIndex(index);
          if (index && mapRef.current) {
            const obsVisibility = index >= snapshots.length - 1;
            mapRef.current.setSourceVisibility(obsVisibility, 'observations');
          }
        }

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setLoading(false);
      },
    }));

    return (
      <>
        <SheetBlock>
          <Text style={[styles.text, styles.heading]}>Preview and Share</Text>
          <View
            style={{
              borderRadius: 7,
              position: 'relative',
              marginVertical: 5,
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 5,
              },
              shadowOpacity: 0.5,
              shadowRadius: 10,
            }}
          >
            <RadarMap
              mapRef={mapRef}
              rainRadarSourceRef={rainRadarSourceRef}
              rainRadarLayerRef={rainRadarLayerRef}
              observationsSourceRef={observationsSourceRef}
              locationGranted={locationGranted}
              userLocationVisible={false}
              logoEnabled={false}
              zoomEnabled={false}
              scrollEnabled={false}
              hideBoundingBox
              style={{
                aspectRatio,
                pointerEvents: 'none',
                borderRadius: 7,
                overflow: 'hidden',
              }}
            >
              <SymbolLayer
                id="settlement-minor-label"
                style={{ visibility: 'none' }}
              />
              <ShapeSource
                id="time"
                tolerance={10}
                buffer={0}
                shape={point([upperLong, lowerLat], {
                  text: rainTime,
                })}
              >
                <SymbolLayer
                  id="time-text"
                  style={{
                    textField: '{text}',
                    textIgnorePlacement: true,
                    textSize: 16,
                    textColor: '#fff',
                    textHaloColor: 'rgba(255,255,255,.25)',
                    textHaloWidth: 1.5,
                    textAnchor: 'bottom-right',
                    textTranslate: [-16, -12],
                    textFont: ['Open Sans Bold'],
                  }}
                />
              </ShapeSource>
              {locationGranted && (
                <UserLocation visible={showUserLocation} renderMode="normal" />
              )}
            </RadarMap>
            {loading && (
              <ActivityIndicator
                animating={loading}
                style={StyleSheet.absoluteFill}
              />
            )}
          </View>
          {!loading && (
            <View
              style={{
                borderRadius: 7,
                padding: 10,
              }}
            >
              <View style={styles.row}>
                <Text style={[styles.text, styles.textLarge, { opacity: 0.5 }]}>
                  {convertRainID2Time(snapshots[0]?.id)}
                </Text>
                <Slider
                  style={[styles.grow, { marginHorizontal: 10 }]}
                  step={1}
                  value={index}
                  minimumValue={snapshotsCount ? 1 : 0}
                  maximumValue={snapshotsCount || 1}
                  disabled={loading}
                  onValueChange={v => {
                    const newIndex = Math.round(v);
                    setIndex(newIndex);
                    if (mapRef.current) {
                      const obsVisibility = newIndex >= snapshotsCount - 1;
                      mapRef.current.setSourceVisibility(
                        obsVisibility,
                        'observations',
                      );
                    }
                    const { id } = snapshots[newIndex - 1];
                    if (id) {
                      if (rainRadarLayerRef.current) {
                        rainRadarLayerRef.current.setNativeProps({
                          filter: ['==', 'id', id],
                        });
                      }
                      setRainTime(convertRainID2Time(id));
                    }
                    Haptics.selectionAsync();
                  }}
                />
                <Text style={[styles.text, styles.textLarge, { opacity: 0.5 }]}>
                  {convertRainID2Time(snapshots[snapshotsCount - 1]?.id)}
                </Text>
              </View>
              {locationGranted && (
                <>
                  <View style={styles.lineDivider} />
                  <View style={[styles.row, { paddingTop: 10 }]}>
                    <Text style={[styles.grow, styles.text, styles.textLarge]}>
                      Show current location
                    </Text>
                    <Switch
                      value={showUserLocation}
                      disabled={loading}
                      onValueChange={v => {
                        setShowUserLocation(v);
                      }}
                    />
                  </View>
                </>
              )}
            </View>
          )}
          <Button
            loading={loading || exporting}
            disabled={loading || exporting}
            onPress={async () => {
              setExporting(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

              try {
                // 1. Take screenshot of map
                const snap = await mapRef.current.takeSnap(true);
                const snapURL = `file://${snap}`;
                console.log({ snapURL });

                // 2. Compress the image
                const image = await ImageManipulator.manipulateAsync(
                  snapURL,
                  [],
                  {
                    compress: 0.8,
                    format: ImageManipulator.SaveFormat.JPEG,
                    base64: true,
                  },
                );
                const url = image.uri;
                console.log({ url });

                // 3. Rename the image file
                const finalURL = url.replace(
                  /[^/\\]+\.([^/\\.]+)$/i,
                  `checkweathersg-${snapshots[index - 1].id}.$1`,
                );
                await FileSystem.moveAsync({
                  from: url,
                  to: finalURL,
                });
                console.log({ finalURL });

                const shareOptions = Platform.select({
                  ios: {
                    activityItemSources: [
                      {
                        placeholderItem: { type: 'url', content: finalURL },
                        item: {
                          default: { type: 'url', content: finalURL },
                        },
                      },
                    ],
                  },
                  default: {
                    url: finalURL,
                    message: '',
                    type: 'image/jpeg',
                    failOnCancel: false,
                  },
                });
                Share.open(shareOptions)
                  .then(() => {
                    onClose();
                    trackEvent('Share shot');
                  })
                  .catch(e => {})
                  .finally(() => {
                    // Clean up files
                    setImmediate(() => {
                      FileSystem.deleteAsync(snapURL, { idempotent: true });
                      FileSystem.deleteAsync(finalURL, { idempotent: true });
                    });
                  });
              } catch (e) {
                console.error(e);
              }
              setExporting(false);
            }}
          >
            Share
          </Button>
        </SheetBlock>
      </>
    );
  },
);
