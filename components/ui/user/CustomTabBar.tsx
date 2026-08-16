import { TAB_BAR_BOTTOM_MARGIN, TAB_BAR_HEIGHT } from '@/hooks/use-tab-bar-height';
import { useTabBarVisibility } from '@/hooks/use-tab-bar-visibility';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Same outline glyph for both states - only color distinguishes active/inactive.
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: 'home-outline',
  history: 'receipt-outline',
  book: 'calendar-outline',
  vehicles: 'car-sport-outline',
  profile: 'person-outline',
};

export default function CustomTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const { hidden } = useTabBarVisibility();
  if (hidden) return null;

  return (
    <View style={[styles.wrapper, { marginBottom: insets.bottom + TAB_BAR_BOTTOM_MARGIN }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = typeof options.title === 'string' ? options.title : route.name;
          const focused = state.index === index;
          const iconName = ICONS[route.name] ?? ICONS.home;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={focused ? styles.activeSlot : styles.inactiveSlot}
              activeOpacity={0.8}
            >
              <View key={focused ? 'active' : 'inactive'} style={[styles.pill, focused && styles.pillActive]}>
                <Ionicons name={iconName} size={20} color={focused ? '#1A1A1A' : '#B0B0B0'} />
                {focused && (
                  <Text style={styles.label} numberOfLines={1}>
                    {label}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: TAB_BAR_HEIGHT,
    width: '92%',
    paddingHorizontal: 10,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  inactiveSlot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSlot: {
    flex: 1.7,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 10,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  pillActive: {
    backgroundColor: '#F9EF08',
  },
  label: {
    marginLeft: 6,
    color: '#1A1A1A',
    fontWeight: '700',
    fontSize: 12,
  },
});
