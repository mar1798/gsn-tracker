import { Tabs } from 'expo-router/js-tabs';

import { Icon, type IconName } from '@/components/icon';
import { colors, typography } from '@/theme';

const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Тренировки', icon: 'dumbbell.fill' },
  { name: 'progress', title: 'Прогресс', icon: 'chart.bar.fill' },
  { name: 'exercises', title: 'Упражнения', icon: 'list.bullet.rectangle.fill' },
  { name: 'profile', title: 'Профиль', icon: 'person.crop.circle.fill' },
];

// JS tabs instead of NativeTabs: the design calls for a custom dark bar with a lime accent.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: typography.caption,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 88,
          paddingTop: 8,
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused }) => (
              <Icon name={tab.icon} size={22} color={focused ? 'accent' : 'textTertiary'} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
