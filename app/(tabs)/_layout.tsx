import { Platform, Text } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { type ColorValue } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type SymbolName = React.ComponentProps<typeof SymbolView>['name'];

// Web emoji fallbacks keyed by android symbol name
const WEB_ICONS: Record<string, string> = {
  calendar_today: '📅',
  water_drop: '💧',
  check_circle: '✓',
  more_horiz: '⋯',
};

function TabIcon({
  ios, android, color, size,
}: { ios: string; android: string; color: ColorValue; size: number }) {
  if (Platform.OS === 'web') {
    return (
      <Text style={{ color: color as string, fontSize: size * 0.9, lineHeight: size }}>
        {WEB_ICONS[android] ?? '●'}
      </Text>
    );
  }
  return (
    <SymbolView
      name={{ ios, android: android as never, web: android } as SymbolName}
      tintColor={color as string}
      size={size}
    />
  );
}

export default function TabLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.card,
        },
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text as string,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => (
            <TabIcon ios="calendar" android="calendar_today" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="water"
        options={{
          title: 'Water',
          tabBarIcon: ({ color, size }) => (
            <TabIcon ios="drop.fill" android="water_drop" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: 'Habits',
          tabBarIcon: ({ color, size }) => (
            <TabIcon ios="checkmark.circle.fill" android="check_circle" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <TabIcon ios="ellipsis.circle" android="more_horiz" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
