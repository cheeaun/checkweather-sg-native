import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';

import BlurView from './UI/BlurView';

export default ({ style, onPress }) => {
  return (
    <BlurView style={[{ borderRadius: 10 }, style]}>
      <TouchableOpacity onPress={onPress}>
        <View
          style={{
            width: 44,
            height: 44,
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: 'rgba(255,255,255,.7)',
              fontSize: 28,
              transform: [
                { rotate: '-30deg' },
                { translateX: 2 },
                { translateY: 2 },
              ],
              lineHeight: 28,
              textAlign: 'center',
            }}
          >
            ➤
          </Text>
        </View>
      </TouchableOpacity>
    </BlurView>
  );
};
