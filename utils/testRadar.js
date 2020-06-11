import { width, height } from '../map-config.json';

const gradientRadars = [
  (() => {
    let radar = '';
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const intensity = ~~Math.round((j / width) * 100);
        const c = String.fromCharCode(intensity + 33);
        radar += c;
      }
      radar += '\n';
    }
    return radar;
  })(),
  (() => {
    let radar = '';
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const intensity = ~~Math.round((i / height) * 100);
        const c = String.fromCharCode(intensity + 33);
        radar += c;
      }
      radar += '\n';
    }
    return radar;
  })(),
  (() => {
    let radar = '';
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const intensity = ~~Math.round(((width - j - 1) / width) * 100);
        const c = String.fromCharCode(intensity + 33);
        radar += c;
      }
      radar += '\n';
    }
    return radar;
  })(),
  (() => {
    let radar = '';
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const intensity = ~~Math.round(((height - i - 1) / height) * 100);
        const c = String.fromCharCode(intensity + 33);
        radar += c;
      }
      radar += '\n';
    }
    return radar;
  })(),
];

const randomRadar = () => {
  let radar = '';
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const intensity = Math.round(Math.random() * 100);
      const c = String.fromCharCode(intensity + 33);
      radar += c;
    }
    radar += '\n';
  }
  return radar;
};

const radarIDs = __DEV__
  ? [
      require('../test-snapshots/202006101800.json'),
      require('../test-snapshots/202006101805.json'),
      require('../test-snapshots/202006101810.json'),
      require('../test-snapshots/202006101815.json'),
      require('../test-snapshots/202006101820.json'),
      require('../test-snapshots/202006101825.json'),
      require('../test-snapshots/202006101830.json'),
      require('../test-snapshots/202006101835.json'),
      require('../test-snapshots/202006101840.json'),
      require('../test-snapshots/202006101845.json'),
      require('../test-snapshots/202006101850.json'),
      require('../test-snapshots/202006101855.json'),
      require('../test-snapshots/202006101900.json'),
      require('../test-snapshots/202006101905.json'),
      require('../test-snapshots/202006101910.json'),
      require('../test-snapshots/202006101915.json'),
      require('../test-snapshots/202006101920.json'),
      require('../test-snapshots/202006101925.json'),
      require('../test-snapshots/202006101930.json'),
      require('../test-snapshots/202006101935.json'),
      require('../test-snapshots/202006101940.json'),
      require('../test-snapshots/202006101945.json'),
      require('../test-snapshots/202006101950.json'),
      require('../test-snapshots/202006101955.json'),
      require('../test-snapshots/202006102000.json'),
    ]
  : [];

let prevIndex;
const testRadar = i => {
  return radarIDs[i];
  // let index;
  // do {
  //   index = Math.round(Math.random() * 3);
  // } while (index === prevIndex);
  // prevIndex = index;
  // return gradientRadars[index];
  // if (Math.round(Math.random())) {
  // } else {
  //   return gradient2Radar;
  // }
};

export default testRadar;
