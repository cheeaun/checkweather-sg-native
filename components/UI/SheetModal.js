import React, { forwardRef, useState } from 'react';
import { useWindowDimensions, TouchableOpacity, Text } from 'react-native';
import { Modalize } from 'react-native-modalize';
import BlurView from './BlurView';

export default forwardRef(({ children, ...props }, ref) => {
  const [modalHeight, setModalHeight] = useState(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const largeWindow = windowWidth > 500 && windowHeight > 500;

  return (
    <Modalize
      adjustToContentHeight
      {...props}
      ref={ref}
      handlePosition="inside"
      withHandle={!largeWindow}
      overlayStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      handleStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
      modalStyle={{
        backgroundColor: 'transparent',
        maxWidth: Math.min(480, windowWidth),
        marginLeft: (windowWidth - Math.min(480, windowWidth)) / 2,
        marginBottom: largeWindow ? (windowHeight - modalHeight) / 2 : 0,
      }}
      onLayout={e => {
        if (e && e.layout) setModalHeight(e.layout.height);
      }}
    >
      <BlurView
        style={{
          borderRadius: 15,
        }}
      >
        <TouchableOpacity
          onPress={() => ref.current && ref.current.close()}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            margin: 18,
            backgroundColor: 'rgba(255,255,255,.1)',
            width: 30,
            height: 30,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 30,
            zIndex: 2,
          }}
        >
          <Text
            style={{
              color: 'rgba(255,255,255,.8)',
              fontSize: 24,
              lineHeight: 26,
            }}
          >
            ×
          </Text>
        </TouchableOpacity>
        {children}
      </BlurView>
    </Modalize>
  );
});
