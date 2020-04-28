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

let prevIndex;
const testRadar = () => {
  let index;
  do {
    index = Math.round(Math.random() * 3);
  } while (index === prevIndex);
  prevIndex = index;
  return gradientRadars[index];
  // if (Math.round(Math.random())) {
  // } else {
  //   return gradient2Radar;
  // }
};

export default testRadar;
