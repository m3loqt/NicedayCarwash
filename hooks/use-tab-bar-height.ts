import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Single source of truth for CustomTabBar's own layout - it's an absolutely
// positioned floating overlay (not a docked bar that reserves its own space),
// so every scrollable tab screen needs to pad by this much to avoid rendering
// content behind it.
export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_BOTTOM_MARGIN = 16;

export function useTabBarClearance(extra = 16): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + TAB_BAR_BOTTOM_MARGIN + TAB_BAR_HEIGHT + extra;
}
