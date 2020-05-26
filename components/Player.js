import React, { useRef, useState, useEffect, useCallback } from 'react';
import { TouchableOpacity, View, Text, Animated, Easing } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';

import useInterval from 'react-use/lib/useInterval';
import { useAppState, useLayout } from '@react-native-community/hooks';

import BlurView from './UI/BlurView';

import trackEvent from '../utils/trackEvent';
import convertRainID2Time from '../utils/convertRainID2Time';

import styles from '../styles/global';

const SliderText = ({ index, total, children }) => {
  const { onLayout: onTextParentLayout, ...textParentLayout } = useLayout();
  const { onLayout: onTextChildLayout, ...textChildLayout } = useLayout();
  const timeOffsetRatio = index / total;
  const timeX = useRef(new Animated.Value(0)).current;

  timeX.setValue(
    timeOffsetRatio * textParentLayout.width -
      timeOffsetRatio * textChildLayout.width,
  );

  return (
    <Animated.View
      onLayout={onTextParentLayout}
      style={{
        transform: [{ translateX: timeX }],
        flexDirection: 'row',
      }}
    >
      <Text
        onLayout={onTextChildLayout}
        style={[
          styles.text,
          {
            fontVariant: ['tabular-nums'],
            textShadowColor: '#fff',
            textShadowRadius: index === total ? 3 : 0,
            opacity: index === total ? 1 : 0.7,
          },
        ]}
      >
        {children}
      </Text>
    </Animated.View>
  );
};

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

  useEffect(
    useCallback(() => {
      if (index && !playing) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (index < snapshotsCount) {
          setFwd(true);
        }
      }
    }, [index, playing]),
    [snapshots.map(s => s.id).join()],
  );

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

  const sliderHapticValue = useRef(0);

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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setIndex(snapshotsCount);
              setSliderValue(snapshotsCount);
              setFwd(false);
              trackEvent('Player button click', {
                action: 'forward',
              });
              return;
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (index === snapshotsCount && !playing) {
              setIndex(1);
            }
            setPlaying(!playing);
            trackEvent('Player button click', {
              action: playing ? 'pause' : 'play',
            });
          }}
          onLongPress={() => {
            if (fwd || playing || index === snapshotsCount) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setIndex(snapshotsCount);
            setSliderValue(snapshotsCount);
            trackEvent('Player button click', { action: 'forward' });
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
          <SliderText index={index} total={snapshotsCount}>
            {convertRainID2Time(id)}
          </SliderText>
          <Slider
            ref={sliderRef}
            onValueChange={v => {
              const roundIndex = Math.round(v);
              const floatIndex = Math.round(v / 0.5) * 0.5;
              if (
                floatIndex === roundIndex &&
                roundIndex !== sliderHapticValue.current
              ) {
                sliderHapticValue.current = roundIndex;
                Haptics.selectionAsync();
              }
              setIndex(v);
            }}
            onSlidingStart={v => {
              setPlaying(false);
              setFwd(false);
              trackEvent('Slider', { action: 'start', value: v });
            }}
            onSlidingComplete={v => {
              const roundIndex = Math.round(v);
              setIndex(roundIndex);
              setSliderValue(roundIndex);
              setFwd(false);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              trackEvent('Slider', { action: 'complete', value: v });
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
              {convertRainID2Time(
                snapshots[Math.round(snapshotsCount / 2) - 1].id,
              )}
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
