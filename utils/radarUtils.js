import contours from 'd3-contour/src/contours';
import nanomemoize from 'nano-memoize';
import { round } from '@turf/helpers';
import chaikin from './chaikin';

import {
  width,
  height,
  lowerLat,
  upperLat,
  lowerLong,
  upperLong,
} from '../map-config.json';
const distanceLong = Math.abs(upperLong - lowerLong);
const distanceLat = Math.abs(upperLat - lowerLat);

const convertX2Lng = nanomemoize(x =>
  round(lowerLong + (x / width) * distanceLong, 4),
);
const convertY2Lat = nanomemoize(y =>
  round(upperLat - (y / height) * distanceLat, 4),
);

const zerosArray = new Array(width * height).fill(0);

const convertRadar2Values = nanomemoize(
  (id, radar) => {
    const rows = radar.trimEnd().split(/\n/g);
    const values = zerosArray.slice();
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
  .thresholds([4, 10, 20, 30, 40, 50, 60, 70, 80, 85, 90, 95, 97.5])
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
              c1.map(c2 => {
                c2.pop(); // Remove last coord
                return chaikin(c2).map(([x, y]) => [
                  convertX2Lng(x),
                  convertY2Lat(y),
                ]);
              }),
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

export { convertRadar2Values, convertValues2GeoJSON, genMidValues };
