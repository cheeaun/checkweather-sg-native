import React from 'react';
import { View } from 'react-native';
import useSafeArea from '../../hooks/useSafeArea';

export default ({ top = false, bottom = false, small = false, ...props }) => {
  const safeArea = useSafeArea();
  const verticalPadding = small ? 10 : 20;
  const styles = {
    paddingTop: top ? Math.max(verticalPadding, safeArea.top) : verticalPadding,
    paddingBottom: bottom
      ? Math.max(verticalPadding, safeArea.bottom)
      : verticalPadding,
    paddingLeft: Math.max(20, safeArea.left),
    paddingRight: Math.max(20, safeArea.right),
  };
  return <View style={styles} {...props} />;
};
