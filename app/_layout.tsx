import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import { useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { WebWrapper } from '@/components/web/WebWrapper';
import { useAppInit } from '@/hooks/useAppInit';
import { useNotificationScheduler } from '@/hooks/useNotificationScheduler';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import {
  configureNotificationHandler,
  addNotificationResponseListener,
} from '@/lib/notifications';
import { useAuthStore } from '@/stores/authStore';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = { initialRouteName: '(tabs)' };

SplashScreen.preventAutoHideAsync();
configureNotificationHandler();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const isReady = useAppInit();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const segments = useSegments();

  useNotificationScheduler();
  useRealtimeSync();

  useEffect(() => {
    // Navigate to Today tab when a block reminder is tapped
    const remove = addNotificationResponseListener((data) => {
      if (data.type === 'block_reminder' || data.type === 'water_reminder') {
        router.replace('/(tabs)');
      }
    });
    return remove;
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const inAuth = segments[0] === 'auth';
    if (!user && !inAuth) {
      router.replace('/auth');
    } else if (user && inAuth) {
      router.replace('/(tabs)');
    }
  }, [isReady, user, segments]);

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colorScheme === 'dark' ? '#0F0F10' : '#F9FAFB',
        }}
      >
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <WebWrapper>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </WebWrapper>
  );
}
