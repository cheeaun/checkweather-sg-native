import React from 'react';
import BlurView from './UI/BlurView';

import useSafeArea from '../hooks/useSafeArea';

export default () => {
  const safeArea = useSafeArea();
  return (
    <BlurView
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: safeArea.top,
      }}
      blurType="dark"
      pointerEvents="none"
    />
  );
};
