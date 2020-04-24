import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from '@react-native-community/blur';

export default ({
  style,
  children,
  blurType = 'ultraThinMaterialDark',
  fallbackColor = 'rgba(24, 24, 24, 0.9)',
  ...props
}) => {
  return (
    <View
      {...props}
      style={[{ position: 'relative', overflow: 'hidden' }, style]}
    >
      <BlurView
        blurType={blurType}
        style={StyleSheet.absoluteFill}
        reducedTransparencyFallbackColor={fallbackColor}
        pointerEvents="none"
      />
      {children}
    </View>
  );
};
