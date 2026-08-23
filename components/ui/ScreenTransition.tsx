import { useCallback } from 'react';
import { View } from 'react-native';
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

// Wraps a screen. Renders RadialBackground always-visible behind the content,
// then fades + slides the content in on every tab focus.
export function ScreenTransition({ children }: Props) {
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
      {/* Background stays at full opacity — not affected by the fade-in animation */}
      <RadialBackground />
      <Animated.View style={style}>{children}</Animated.View>
    </View>
  );
}
