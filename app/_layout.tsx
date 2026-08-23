import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import {
  useFonts,
  Marcellus_400Regular,
} from '@expo-google-fonts/marcellus';
import {
  LibreBaskerville_400Regular,
  LibreBaskerville_700Bold,
} from '@expo-google-fonts/libre-baskerville';

import { useColorScheme } from '@/components/useColorScheme';
import { useAppInit } from '@/hooks/useAppInit';
import { useNotificationScheduler } from '@/hooks/useNotificationScheduler';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import {
  configureNotificationHandler,
  addNotificationResponseListener,
} from '@/lib/notifications';
import { useAuthStore } from '@/stores/authStore';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = { initialRouteName: '(main)' };

SplashScreen.preventAutoHideAsync();
configureNotificationHandler();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Marcellus_400Regular,
    LibreBaskerville_400Regular,
    LibreBaskerville_700Bold,
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;
  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const isReady     = useAppInit();
  const user        = useAuthStore((s) => s.user);
  const router      = useRouter();
  const segments    = useSegments();

  useNotificationScheduler();
  useRealtimeSync();

  useEffect(() => {
    const remove = addNotificationResponseListener((data) => {
      if (data.type === 'block_reminder' || data.type === 'water_reminder') {
        router.replace('/(main)' as any);
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
      router.replace('/(main)' as any);
    }
  }, [isReady, user, segments]);

  if (!isReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#080A0E' }}>
          <ActivityIndicator size="large" color="#91A4C7" />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'light' ? DefaultTheme : DarkTheme}>
        <Stack>
          <Stack.Screen name="(main)" options={{ headerShown: false }} />
          <Stack.Screen name="auth"   options={{ headerShown: false }} />
          <Stack.Screen name="modal"  options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
