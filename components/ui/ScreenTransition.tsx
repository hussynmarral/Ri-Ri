import { useCallback } from 'react';
import { Platform, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';

import { RadialBackground } from './RadialBackground';

interface Props {
  children: React.ReactNode;
}

export function ScreenTransition({ children }: Props) {
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1 }}>
        <RadialBackground />
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    );
  }
  return <AnimatedScreenTransition>{children}</AnimatedScreenTransition>;
}

function AnimatedScreenTransition({ children }: Props) {
  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(16);

  useFocusEffect(
    useCallback(() => {
      opacity.value    = 0;
      translateY.value = 16;
      opacity.value    = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
      translateY.value = withSpring(0, { damping: 22, stiffness: 220, mass: 0.8 });
    }, []),
  );

  const style = useAnimatedStyle(() => ({
    flex: 1,
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={{ flex: 1 }}>
      <RadialBackground />
      <Animated.View style={style}>{children}</Animated.View>
    </View>
  );
}
