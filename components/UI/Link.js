import React from 'react';
import { Text, Linking } from 'react-native';

export default ({ children, href, style, ...props }) => {
  return (
    <Text
      {...props}
      style={[{ textDecorationLine: 'underline' }, style]}
      onPress={async () => {
        const supported = await Linking.canOpenURL(href);
        if (supported) {
          await Linking.openURL(href);
        } else {
          Alert.alert(`Unable to open this URL: ${href}`);
        }
      }}
    >
      {children}
    </Text>
  );
};
