import {
  TAB_BAR_BOTTOM_MARGIN,
  TAB_BAR_HEIGHT,
} from "@/hooks/use-tab-bar-height";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Same outline glyph for both states - only color distinguishes active/inactive.
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  bookings: "calendar-outline",
  calendar: "calendar-number-outline",
  services: "construct-outline",
  settings: "stats-chart-outline",
};

export default function AdminCustomTabBar({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  return (
    <View
      style={[
        styles.wrapper,
        { marginBottom: insets.bottom + TAB_BAR_BOTTOM_MARGIN },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.title === "string" ? options.title : route.name;
          const focused = state.index === index;
          const iconName = ICONS[route.name] ?? ICONS.bookings;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
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
              <View
                key={focused ? "active" : "inactive"}
                style={[styles.pill, focused && styles.pillActive]}
              >
                <Ionicons
                  name={iconName}
                  size={20}
                  color={focused ? "#1A1A1A" : "#B0B0B0"}
                />
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
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },
  // This mirrors components/ui/user/CustomTabBar.tsx (the customer tab bar) exactly - same
  // bar/pill structure, same width: '100%' technique so the active pill always fills its slot
  // edge-to-edge instead of being centered/anchored within extra space (which is what caused
  // the uneven-looking padding and clipping earlier). The only real difference from customer is
  // activeSlot's flex share, tuned for 4 tabs here instead of customer's 5.
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    height: TAB_BAR_HEIGHT,
    width: "92%",
    paddingHorizontal: 6,
  },
  inactiveSlot: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  activeSlot: {
    flex: 2,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  pillActive: {
    width: "100%",
    backgroundColor: "#F9EF08",
  },
  label: {
    marginLeft: 6,
    color: "#1A1A1A",
    fontWeight: "700",
    fontSize: 12,
  },
});
