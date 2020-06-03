import React, { useRef, useState, useEffect, useContext } from 'react';
import {
  Settings,
  View,
  Text,
  Switch,
  Linking,
  TouchableHighlight,
  Animated,
} from 'react-native';
import { useAppState } from '@react-native-community/hooks';
import messaging from '@react-native-firebase/messaging';
import Mailer from 'react-native-mail';
import {
  getApplicationName,
  getReadableVersion,
  getSystemName,
  getSystemVersion,
  getModel,
} from 'react-native-device-info';

import { LinearGradient } from 'expo-linear-gradient';
import Link from './UI/Link';
import SheetBlock from './UI/SheetBlock';

import styles from '../styles/global';
import WindDirectionContext from '../contexts/wind-direction';

import useSafeArea from '../hooks/useSafeArea';

import trackEvent from '../utils/trackEvent';

import intensityColors from '../intensity-colors.json';
import arrowDownImage from '../assets/arrow-down-white.png';

const WindArrow = () => {
  const windDirection = useContext(WindDirectionContext);

  const windDir = useRef(new Animated.Value(windDirection - 15)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(windDir, {
          useNativeDriver: true,
          toValue: windDirection + 15,
          duration: 3000,
        }),
        Animated.timing(windDir, {
          useNativeDriver: true,
          toValue: windDirection - 15,
          duration: 3000,
        }),
      ]),
    ).start();

    return () => {
      Animated.timing(windDir).stop();
    };
  }, [windDirection]);

  const rotate = windDir.interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg'],
  });

  return (
    <Animated.Image
      style={{
        width: 10,
        height: 10,
        opacity: 0.7,
        transform: [{ rotate }],
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
        trackEvent('Rain alerts', { action: on ? 'on' : 'off' });
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

const SheetMenu = ({
  onPress,
  isBottom = false,
  isLink = false,
  children,
  ...props
}) => {
  const safeArea = useSafeArea();
  const left = Math.max(20, safeArea.left);
  const s = {
    paddingVertical: 16,
    paddingLeft: left,
    paddingRight: Math.max(20, safeArea.right),
  };
  return (
    <>
      <TouchableHighlight
        style={s}
        underlayColor="rgba(255,255,255,.15)"
        onPress={onPress}
        {...props}
      >
        <Text
          style={[
            styles.text,
            styles.textLarge,
            isLink && { color: '#1684ff' },
          ]}
        >
          {children}
        </Text>
      </TouchableHighlight>
      {!isBottom && (
        <View
          pointerEvents="none"
          style={[styles.menuDivider, { marginLeft: left, marginTop: -1 }]}
        />
      )}
    </>
  );
};

export default () => {
  if (__DEV__) {
    useEffect(() => {
      messaging()
        .getToken()
        .then(token => {
          console.log(token);
        })
        .catch(() => {});
    }, []);
  }

  return (
    <>
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
      <View>
        <SheetMenu
          isLink
          onPress={() => {
            const email = 'cheeaun+checkweathersg@gmail.com';
            const subject = `${getApplicationName()} feedback`;
            const body = `


            Additional Info (don't remove):
            ${getApplicationName()} ${getReadableVersion()}
            ${getModel()} (${getSystemName()} ${getSystemVersion()})`.replace(
              / {2,}/g,
              '',
            );

            Mailer.mail(
              {
                recipients: [email],
                subject,
                body,
              },
              (err, ev) => {
                if (err) {
                  Linking.openURL(
                    `mailto:${email}?subject=${encodeURIComponent(
                      subject,
                    )}&body=${encodeURIComponent(body)}`,
                  );
                }
              },
            );
          }}
        >
          Share Feedback
        </SheetMenu>
        <SheetMenu
          isLink
          isBottom
          onPress={() =>
            Linking.openURL('https://checkweather.sg/privacy-policy/')
          }
        >
          Privacy Policy
        </SheetMenu>
      </View>
      <View style={styles.largeDivider} />
      <SheetBlock bottom>
        <Text style={[styles.text, styles.textSmall]}>
          © <Link href="https://www.mapbox.com/about/maps/">Mapbox</Link> ©{' '}
          <Link href="http://www.openstreetmap.org/about/">OpenStreetMap</Link>{' '}
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
    </>
  );
};
