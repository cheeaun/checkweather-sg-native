import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import BlurView from './UI/BlurView';

export default ({ style, onPress }) => (
  <BlurView style={[{ borderRadius: 10 }, style]}>
    <TouchableOpacity onPress={onPress}>
      <View style={{ padding: 10 }}>
        <View
          style={{
            borderColor: 'rgba(255,255,255,.7)',
            borderWidth: 2,
            width: 24,
            height: 24,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 24,
          }}
        >
          <Text
            adjustsFontSizeToFit={false}
            allowFontScaling={false}
            style={{
              color: 'rgba(255,255,255,.7)',
              fontWeight: 'bold',
              fontSize: 16,
              fontFamily: 'Courier New',
              lineHeight: 22,
              marginLeft: 1, // Shifts 1px to the right
            }}
          >
            i
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  </BlurView>
);
