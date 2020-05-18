import React from 'react';
import BlurView from './UI/BlurView';

import useSafeArea from '../hooks/useSafeArea';

export default props => {
  const safeArea = useSafeArea();
  return (
    <BlurView
      {...props}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        paddingTop: safeArea.top,
      }}
      blurType="dark"
      pointerEvents="none"
    />
  );
};
