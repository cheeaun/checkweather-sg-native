import React from 'react';
import { TouchableHighlight, Text, ActivityIndicator } from 'react-native';

import styles from '../../styles/global';

export default ({ loading = false, style, children, ...props }) => {
  return (
    <TouchableHighlight
      underlayColor="#147aff"
      style={[
        {
          backgroundColor: loading ? 'rgba(255,255,255,.1)' : '#1684ff',
          borderRadius: 10,
          padding: 16,
          marginVertical: 10,
        },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text
          style={[
            styles.text,
            styles.textLarge,
            { fontWeight: 'bold', textAlign: 'center' },
          ]}
        >
          {children}
        </Text>
      )}
    </TouchableHighlight>
  );
};
