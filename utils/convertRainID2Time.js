import nanomemoize from 'nano-memoize';

export default nanomemoize(id => {
  if (!id) return '';
  const time = (id.match(/\d{4}$/) || [''])[0].replace(
    /(\d{2})(\d{2})/,
    (m, m1, m2) => {
      let h = parseInt(m1, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      if (h == 0) h = 12;
      if (h > 12) h -= 12;
      return h + ':' + m2 + ' ' + ampm;
    },
  );
  return time;
});
