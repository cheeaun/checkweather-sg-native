// https://rosettacode.org/wiki/Averages/Mean_angle#JavaScript
const sum = arr => arr.reduce((a, b) => a + b, 0);
const degToRad = a => (Math.PI / 180) * a;
const meanAngleDeg = arr => {
  const len = arr.length;
  return (
    (180 / Math.PI) *
    Math.atan2(
      sum(arr.map(degToRad).map(Math.sin)) / len,
      sum(arr.map(degToRad).map(Math.cos)) / len,
    )
  );
};

export default meanAngleDeg;
