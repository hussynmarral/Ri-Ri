import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Sidebar } from '@/components/nav/Sidebar';
import { AutoAdvancePrompt } from '@/components/ui/AutoAdvancePrompt';
import { RadialBackground } from '@/components/ui/RadialBackground';
import { useAutoAdvance } from '@/hooks/useAutoAdvance';

export default function MainLayout() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  const { promptVisible, blockTitle, onDone, onMissed, onAuto } = useAutoAdvance();

  return (
    <View style={[dl.root, { backgroundColor: colors.background }]}>
      {scheme === 'dark' && <RadialBackground />}
      <View style={dl.content}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        >
          <Tabs.Screen name="index"    options={{ title: 'Dashboard' }} />
          <Tabs.Screen name="schedule" options={{ title: 'Schedule' }} />
          <Tabs.Screen name="ai"       options={{ title: 'AI' }} />
          <Tabs.Screen name="water"    options={{ title: 'Water' }} />
          <Tabs.Screen name="habits"   options={{ title: 'Habits' }} />
          <Tabs.Screen name="markets"  options={{ title: 'Markets' }} />
          <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
          <Tabs.Screen name="more"     options={{ title: 'More' }} />
        </Tabs>
      </View>
      <Sidebar />
      <AutoAdvancePrompt
        blockTitle={blockTitle}
        visible={promptVisible}
        onDone={onDone}
        onMissed={onMissed}
        onAuto={onAuto}
      />
    </View>
  );
}

const dl = StyleSheet.create({
  root:    { flex: 1, flexDirection: 'row' },
  content: { flex: 1 },
});
