import React, { useState, useEffect, useContext } from 'react';
import {
  Settings,
  View,
  Text,
  Image,
  Switch,
  Linking,
  TouchableOpacity,
  useWindowDimensions,
  ScrollView,
  TouchableHighlight,
} from 'react-native';
import { useAppState } from '@react-native-community/hooks';
import messaging from '@react-native-firebase/messaging';

import { LinearGradient } from 'expo-linear-gradient';
import BlurView from './UI/BlurView';
import Link from './UI/Link';

import styles from '../styles/global';
import WindDirectionContext from '../contexts/wind-direction';

import useSafeArea from '../hooks/useSafeArea';

import intensityColors from '../intensity-colors.json';
import arrowDownImage from '../assets/arrow-down-white.png';

const WindArrow = () => {
  const windDirection = useContext(WindDirectionContext);
  return (
    <Image
      style={{
        width: 10,
        height: 10,
        opacity: 0.7,
        transform: [{ rotate: `${windDirection}deg` }],
      }}
      source={arrowDownImage}
    />
  );
};

const NotificationSwitch = () => {
  const currentAppState = useAppState();

  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationSubscribed, setNotificationSubscribed] = useState(
    !!Settings.get('notificationSubscribed'),
  );
  useEffect(() => {
    if (currentAppState === 'active') {
      (async () => {
        const authorizationStatus = await messaging().hasPermission();
        const authorized =
          authorizationStatus === messaging.AuthorizationStatus.AUTHORIZED;
        setNotificationEnabled(authorized);
      })();
    }
  }, [currentAppState]);

  return (
    <Switch
      value={notificationEnabled && notificationSubscribed}
      onValueChange={async v => {
        const on = !!v;
        setNotificationSubscribed(on);
        Settings.set({ notificationSubscribed: on });
        if (on) {
          const authorizationStatus = await messaging().requestPermission({
            alert: true,
            sound: true,
          });
          if (
            authorizationStatus === messaging.AuthorizationStatus.AUTHORIZED
          ) {
            setNotificationEnabled(true);
            messaging().subscribeToTopic('all');
          } else {
            Linking.openSettings();
          }
        } else {
          messaging().unsubscribeFromTopic('all');
        }
      }}
    />
  );
};

const SheetBlock = ({
  top = false,
  bottom = false,
  small = false,
  onPress,
  children,
  ...props
}) => {
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

  if (onPress) {
    return (
      <TouchableHighlight
        style={styles}
        underlayColor="rgba(255,255,255,.05)"
        onPress={onPress}
        {...props}
      >
        <>{children}</>
      </TouchableHighlight>
    );
  }
  return (
    <View style={styles} {...props}>
      {children}
    </View>
  );
};

export default ({ onClose, ...props }) => {
  const { width: windowWidth } = useWindowDimensions();

  return (
    <BlurView
      {...props}
      style={{
        borderRadius: 15,
        maxWidth: Math.min(480, windowWidth),
        maxHeight: '55%',
      }}
    >
      <TouchableOpacity
        onPress={onClose}
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
      <ScrollView alwaysBounceVertical={false}>
        <SheetBlock>
          <Text style={[styles.text, styles.heading]}>Legend</Text>
          <View style={[styles.row, { flexWrap: 1 }]}>
            <View style={styles.label}>
              <Text style={[styles.labelText, { color: 'yellow' }]}>
                Temperature (°C)
              </Text>
            </View>
            <View style={styles.label}>
              <Text style={[styles.labelText, { color: 'orange' }]}>
                Relative Humidity (%)
              </Text>
            </View>
            <View style={styles.label}>
              <Text style={[styles.labelText, { color: 'aqua' }]}>
                Rainfall (mm)
              </Text>
            </View>
            <View style={styles.label}>
              <Text style={[styles.labelText, styles.text]}>
                <WindArrow /> Wind Direction
              </Text>
            </View>
          </View>
          <View style={styles.lineDivider} />
          <View style={[styles.row, { marginVertical: 2 }]}>
            <Text style={[styles.labelText, styles.text, { marginRight: 10 }]}>
              Rain Intensity
            </Text>
            <LinearGradient
              colors={intensityColors}
              start={[1, 0]}
              end={[0, 0]}
              style={[
                styles.grow,
                {
                  padding: 6,
                  borderRadius: (16 + 6 + 6) / 2,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                },
              ]}
            >
              <View style={styles.gradientBlock}>
                <Text style={styles.labelText}>Heavy</Text>
              </View>
              <View style={styles.gradientBlock}>
                <Text style={styles.labelText}>Moderate</Text>
              </View>
              <View style={styles.gradientBlock}>
                <Text style={styles.labelText}>Light</Text>
              </View>
            </LinearGradient>
          </View>
        </SheetBlock>
        <View style={styles.largeDivider} />
        <SheetBlock small>
          <View style={styles.row}>
            <Text style={[styles.grow, styles.text, styles.textLarge]}>
              Rain alerts
            </Text>
            <NotificationSwitch />
          </View>
        </SheetBlock>
        <View style={styles.largeDivider} />
        <SheetBlock
          onPress={() => Linking.openURL('https://twitter.com/checkweathersg')}
        >
          <View style={styles.row}>
            <Text
              style={[
                styles.grow,
                styles.text,
                styles.textLarge,
                { color: '#1DA1F2' },
              ]}
            >
              Follow @checkweathersg
            </Text>
            <Image
              style={{
                width: 20,
                height: 20,
                marginHorizontal: 2,
              }}
              resizeMode="contain"
              source={{ uri: 'twitter' }}
            />
          </View>
        </SheetBlock>
        <View style={styles.largeDivider} />
        <SheetBlock bottom>
          <Text style={[styles.text, styles.textSmall]}>
            Built by <Link href="https://twitter.com/cheeaun">@cheeaun</Link>.
            Open-sourced on{' '}
            <Link href="https://github.com/cheeaun/checkweather-sg-native">
              GitHub
            </Link>
            .
          </Text>
          <Text style={[styles.text, styles.textSmall]}>
            © <Link href="https://www.mapbox.com/about/maps/">Mapbox</Link> ©{' '}
            <Link href="http://www.openstreetmap.org/about/">
              OpenStreetMap
            </Link>{' '}
            ©{' '}
            <Link href="https://data.gov.sg/privacy-and-website-terms#site-terms">
              Data.gov.sg
            </Link>{' '}
            @{' '}
            <Link href="http://www.weather.gov.sg/terms-of-use">
              Meteorological Service Singapore
            </Link>{' '}
            ©{' '}
            <Link href="http://www.nea.gov.sg/open-data-licence/">
              National Environment Agency
            </Link>
          </Text>
        </SheetBlock>
      </ScrollView>
    </BlurView>
  );
};
