import React, { forwardRef } from 'react';
import { Animated, View, Text } from 'react-native';

import BlurView from './UI/BlurView';
import Button from './UI/Button';

import styles from '../styles/global';

export default forwardRef(
  ({ onLayout = () => {}, onClose = () => {} }, ref) => {
    return (
      <Animated.View
        ref={ref}
        onLayout={onLayout}
        style={{
          alignItems: 'stretch',
          flexDirection: 'row',
        }}
      >
        <BlurView
          blurType="dark"
          style={{
            borderRadius: 15,
            width: '100%',
            padding: 40,
          }}
        >
          <View
            style={{
              flexGrow: 1,
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 32,
            }}
          >
            <View style={{ width: '100%' }}>
              <Text style={[styles.text, { fontSize: 50, fontWeight: '800' }]}>
                Welcome
              </Text>
              {[
                [
                  '🌧',
                  '2-hour weather map',
                  'Observe how the rain clouds move over time.',
                ],
                [
                  '🔔',
                  'Periodic rain alerts',
                  'Tap on ⓘ to enable rain alert notifications.',
                ],
                [
                  '📡',
                  'Weather map in Today View',
                  'Up-to-the-minute weather viewable on the Today widget.',
                ],
              ].map(([icon, heading, desc]) => (
                <View
                  key={icon}
                  style={{
                    flexDirection: 'row',
                    marginTop: 32,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 40, textAlign: 'center' }}>
                    {icon}
                  </Text>
                  <View
                    style={{
                      paddingLeft: 24,
                      flex: 1,
                      flexGrow: 1,
                    }}
                  >
                    <Text
                      style={[
                        styles.text,
                        styles.textLarge,
                        { fontWeight: 'bold' },
                      ]}
                    >
                      {heading}
                    </Text>
                    <Text style={[styles.text, styles.textLarge]}>{desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
          <Button onPress={onClose}>Continue</Button>
        </BlurView>
      </Animated.View>
    );
  },
);
