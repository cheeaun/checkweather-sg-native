import { useState, useEffect } from 'react';
import StaticSafeAreaInsets from 'react-native-static-safe-area-insets';

export default function() {
  const [insets, setInsets] = useState({
    top: StaticSafeAreaInsets.safeAreaInsetsTop,
    bottom: StaticSafeAreaInsets.safeAreaInsetsBottom,
    left: StaticSafeAreaInsets.safeAreaInsetsLeft,
    right: StaticSafeAreaInsets.safeAreaInsetsRight,
  });
  useEffect(() => {
    StaticSafeAreaInsets.getSafeAreaInsets(values => {
      setInsets({
        top: values.safeAreaInsetsTop,
        bottom: values.safeAreaInsetsBottom,
        left: values.safeAreaInsetsLeft,
        right: values.safeAreaInsetsRight,
      });
    });
  }, []);

  return insets;
}
