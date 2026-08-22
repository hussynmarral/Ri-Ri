import { Platform, StyleSheet, View } from 'react-native';
import type { PropsWithChildren } from 'react';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

// On web, constrains the app to a mobile-width column centred on the viewport.
// On native, renders children directly.
export function WebWrapper({ children }: PropsWithChildren) {
  const scheme = useColorScheme();

  if (Platform.OS !== 'web') return <>{children}</>;

  const bg = Colors[scheme ?? 'dark'].background;
  return (
    <View style={[s.outer, { backgroundColor: bg }]}>
      <View style={s.inner}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
  },
});
