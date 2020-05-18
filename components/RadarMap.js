import React, { useRef, useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
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
import { featureCollection, polygon } from '@turf/helpers';

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

export default props => {
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
  );
};
