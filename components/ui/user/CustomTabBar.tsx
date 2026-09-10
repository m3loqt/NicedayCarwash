import { TAB_BAR_BOTTOM_MARGIN, TAB_BAR_HEIGHT } from '@/hooks/use-tab-bar-height';
import { useTabBarVisibility } from '@/hooks/use-tab-bar-visibility';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import {
  LayoutAnimation,
  type LayoutAnimationConfig,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

// Same outline glyph for both states - only color distinguishes active/inactive.
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: 'home-outline',
  history: 'receipt-outline',
  book: 'calendar-outline',
  vehicles: 'car-sport-outline',
  profile: 'person-outline',
};

// Old architecture requires this opt-in on Android for LayoutAnimation to do anything at all -
// harmless no-op on iOS and on the New Architecture, where it's supported without it.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// A spring feel for the pill sliding/resizing between tabs, with the label fading in/out rather
// than popping - this is what actually makes switching tabs read as fluid instead of a hard snap.
const TAB_LAYOUT_ANIMATION: LayoutAnimationConfig = {
  duration: 300,
  create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  update: { type: LayoutAnimation.Types.spring, springDamping: 0.7 },
  delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
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
              LayoutAnimation.configureNext(TAB_LAYOUT_ANIMATION);
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
              <View style={[styles.pill, focused && styles.pillActive]}>
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
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    height: TAB_BAR_HEIGHT,
    width: '92%',
    paddingHorizontal: 6,
  },
  inactiveSlot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSlot: {
    flex: 2,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  pillActive: {
    width: '100%',
    backgroundColor: '#F9EF08',
  },
  label: {
    marginLeft: 6,
    color: '#1A1A1A',
    fontWeight: '700',
    fontSize: 12,
  },
});
