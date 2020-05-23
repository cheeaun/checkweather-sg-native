import React, {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useWindowDimensions, PixelRatio, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import MapboxGL, {
  MapView,
  UserLocation,
  Camera,
  Images,
  ShapeSource,
  FillLayer,
  SymbolLayer,
} from '@react-native-mapbox-gl/maps';
import { featureCollection, polygon, point } from '@turf/helpers';
import Share from 'react-native-share';
import * as ImageManipulator from 'expo-image-manipulator';

import trackEvent from '../utils/trackEvent';

import config from '../config.json';
import styles from '../styles/global';
import arrowDownImage from '../assets/arrow-down-white.png';

MapboxGL.setAccessToken(config.mapboxAccessToken);

import {
  center,
  lowerLat,
  upperLat,
  lowerLong,
  upperLong,
} from '../map-config.json';
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

import intensityColors from '../intensity-colors.json';
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

function pTimeout(t = 1) {
  return new Promise((res, rej) => {
    setTimeout(res, t);
  });
}

export default forwardRef((props, ref) => {
  const {
    mapRef,
    cameraRef,
    rainRadarSourceRef,
    rainRadarLayerRef,
    observationsSourceRef,
    locationGranted,
  } = props;

  useEffect(() => {
    MapboxGL.setTelemetryEnabled(false);
  }, []);

  const currentMapZoom = useRef(0);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const onRegionDidChange = async e => {
    if (!mapRef.current) return;
    const mapZoom = await mapRef.current.getZoom();
    const diffZoom = mapZoom !== currentMapZoom.current;
    const zoomState = mapZoom > currentMapZoom.current ? 'in' : 'out';
    currentMapZoom.current = mapZoom;

    const { isUserInteraction } = e.properties;
    if (
      isUserInteraction &&
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
    if (isUserInteraction) {
      trackEvent('Map regiondidchange', {
        zoom: mapZoom,
        zoomState,
      });
    }
  };

  const [userLocationVisible, setUserLocationVisible] = useState(true);
  const [rainTime, setRainTime] = useState('');
  const [rainTimeVisible, setRainTimeVisible] = useState(false);
  useImperativeHandle(ref, () => ({
    setRainTime,
  }));

  return (
    <MapView
      ref={mapRef}
      style={styles.flex}
      styleURL={config.mapboxStyleURL + (__DEV__ ? '/draft' : '')}
      rotateEnabled={false}
      pitchEnabled={false}
      attributionEnabled={false}
      regionDidChangeDebounceTime={0}
      onRegionDidChange={onRegionDidChange}
      onLongPress={async () => {
        if (mapRef.current) {
          // Prepration
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          cameraRef.current.fitBounds(bounds.ne, bounds.sw, 0, 0);
          setUserLocationVisible(false);
          setRainTimeVisible(true);
          await pTimeout(150);

          // Shot time
          const snap = await mapRef.current.takeSnap(true);
          console.log({ snap });
          const snapURL = `file://${snap}`;

          // Post-prep
          setUserLocationVisible(true);
          setRainTimeVisible(false);

          // Shot manipulation
          const [ne, sw] = await Promise.all([
            mapRef.current.getPointInView(bounds.ne),
            mapRef.current.getPointInView(bounds.sw),
          ]);
          console.log(ne, sw);
          const pr = PixelRatio.get();
          const image = await ImageManipulator.manipulateAsync(
            snapURL,
            [
              {
                crop: {
                  originX: Math.round(sw[0] * pr),
                  originY: Math.round(ne[1] * pr),
                  width: Math.round((ne[0] - sw[0]) * pr),
                  height: Math.round((sw[1] - ne[1]) * pr),
                },
              },
            ],
            {
              compress: 0.8,
              format: ImageManipulator.SaveFormat.JPEG,
              base64: true,
            },
          );
          console.log(image);
          const url = image.uri;
          const shareOptions = Platform.select({
            ios: {
              activityItemSources: [
                {
                  placeholderItem: { type: 'url', content: url },
                  item: {
                    default: { type: 'url', content: url },
                  },
                },
              ],
            },
            default: {
              url,
              message: '',
              type: 'image/jpeg',
              failOnCancel: false,
            },
          });
          Share.open(shareOptions).catch(e => {});
        }
      }}
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
              ['case', ['>', ['number', ['get', 'intensity'], 0], 90], 1, 0.4],
              12,
              0.05,
            ],
          }}
          belowLayerID="water-overlay"
        />
      </ShapeSource>
      <ShapeSource
        ref={observationsSourceRef}
        id="observations"
        shape={featureCollection([])}
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
            textOpacity: rainTimeVisible ? 1 : 0,
            textField: '{text}',
            textIgnorePlacement: true,
            textSize: 16,
            textColor: '#fff',
            textHaloColor: 'rgba(255,255,255,.5)',
            textHaloWidth: 1,
            textHaloBlur: 1,
            textAnchor: 'bottom-right',
            textTranslate: [-16, -16],
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
        <UserLocation
          visible={userLocationVisible}
          showsUserHeadingIndicator
          renderMode="native"
        />
      )}
    </MapView>
  );
});
