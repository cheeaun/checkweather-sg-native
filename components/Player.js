import React, { useRef, useState, useEffect } from 'react';
import { TouchableOpacity, View, Text, Animated, Easing } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import nanomemoize from 'nano-memoize';

import useInterval from 'react-use/lib/useInterval';
import { useAppState } from '@react-native-community/hooks';

import BlurView from './UI/BlurView';

import styles from '../styles/global';

const convertRainID2Time = nanomemoize(id => {
  if (!id) return '';
  const time = (id.match(/\d{4}$/) || [''])[0].replace(
    /(\d{2})(\d{2})/,
    (m, m1, m2) => {
      let h = parseInt(m1, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      if (h == 0) h = 12;
      if (h > 12) h -= 12;
      return h + ':' + m2 + ' ' + ampm;
    },
  );
  return time;
});

export default ({
  snapshots = [],
  initialValue = 0,
  onRainIDChange = () => {},
}) => {
  const snapshotsCount = snapshots.length;
  if (!snapshotsCount) return null;

  const playerOpacity = useRef(new Animated.Value(0)).current;
  const playerTop = useRef(new Animated.Value(40)).current;
  useEffect(() => {
    if (snapshotsCount) {
      Animated.parallel([
        Animated.timing(playerOpacity, {
          useNativeDriver: true,
          toValue: 1,
        }),
        Animated.spring(playerTop, {
          useNativeDriver: true,
          toValue: 0,
          tension: 60,
          friction: 5,
          easing: Easing.out(Easing.quad),
        }),
      ]).start();
    }
  }, [!!snapshotsCount]);

  const sgCoveragePercentages = snapshots.map(s => s.coverage_percentage.sg);
  const maxSGCoveragePercentage = Math.max(...sgCoveragePercentages);

  const currentAppState = useAppState();
  const [playing, setPlaying] = useState(false);
  const [fwd, setFwd] = useState(false);
  const [index, setIndex] = useState(initialValue);

  const { id } = snapshots[Math.round(index) - 1];

  const sliderRef = useRef(null);
  const setSliderValue = value => {
    if (sliderRef.current) {
      sliderRef.current.setNativeProps({ value });
    }
  };

  useEffect(() => {
    setSliderValue(initialValue);
  }, []);

  useEffect(() => {
    if (index && index < snapshotsCount && !playing) {
      setFwd(true);
    }
  }, [snapshots]);

  useInterval(
    () => {
      const endOfSnapshots = index >= snapshotsCount;
      if (endOfSnapshots && maxSGCoveragePercentage < 5) {
        setPlaying(false);
      } else {
        const newIndex = endOfSnapshots ? 1 : index + 0.5;
        setIndex(newIndex);
        setSliderValue(newIndex);
      }
    },
    playing ? (index === snapshotsCount ? 2000 : 100) : null,
  );
  useEffect(() => {
    if (currentAppState !== 'active') {
      setPlaying(false);
    }
  }, [currentAppState]);

  useEffect(() => {
    if (!index || !snapshotsCount) return;
    const roundIndex = Math.round(index);
    const floatIndex = Math.round(index / 0.5) * 0.5;

    const shot = snapshots[roundIndex - 1];
    let id = shot.id;

    if (floatIndex !== roundIndex) {
      const floorSnapshot = snapshots[Math.floor(floatIndex) - 1];
      const ceilSnapshot = snapshots[Math.ceil(floatIndex) - 1];
      if (floorSnapshot && ceilSnapshot) {
        const midID = `${(floorSnapshot.dt + ceilSnapshot.dt) / 2}`;
        id = midID;
      }
    }

    onRainIDChange(id, floatIndex);
  }, [Math.round(index / 0.5) * 0.5, snapshots]);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.row,
        { opacity: playerOpacity, transform: [{ translateY: playerTop }] },
      ]}
    >
      <BlurView
        style={[styles.player, styles.row, styles.relative]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => {
            if (fwd) {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              setIndex(snapshotsCount);
              setSliderValue(snapshotsCount);
              setFwd(false);
              return;
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (index === snapshotsCount && !playing) {
              setIndex(1);
            }
            setPlaying(!playing);
          }}
        >
          {fwd ? (
            <View style={styles.forwardIcon} />
          ) : (
            <>
              {!playing && <View style={styles.playIcon} />}
              {playing && <View style={styles.pauseIcon} />}
            </>
          )}
        </TouchableOpacity>
        <View style={styles.grow}>
          <Text
            style={[
              styles.text,
              {
                fontVariant: ['tabular-nums'],
                textAlign: 'center',
                fontWeight: 'bold',
                textShadowColor: '#fff',
                textShadowRadius: index === snapshotsCount ? 3 : 0,
                opacity: index === snapshotsCount ? 1 : 0.7,
              },
            ]}
          >
            {convertRainID2Time(id)}
          </Text>
          <Slider
            ref={sliderRef}
            onValueChange={setIndex}
            onSlidingStart={() => {
              setPlaying(false);
              setFwd(false);
            }}
            onSlidingComplete={v => {
              const roundIndex = Math.round(v);
              setIndex(roundIndex);
              setSliderValue(roundIndex);
              Haptics.selectionAsync();
            }}
            minimumValue={1}
            maximumValue={snapshotsCount}
          />
          <View
            style={[
              styles.row,
              {
                justifyContent: 'space-between',
                opacity: 0.2,
              },
            ]}
          >
            <Text style={[styles.text, styles.textSmall]}>
              {convertRainID2Time(snapshots[0].id)}
            </Text>
            <Text style={[styles.text, styles.textSmall]}>
              {convertRainID2Time(snapshots[snapshotsCount - 1].id)}
            </Text>
          </View>
        </View>
      </BlurView>
    </Animated.View>
  );
};
