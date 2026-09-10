import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  ScrollViewProps,
  View,
} from "react-native";

// react-native-web's RefreshControl is a no-op stub (no pull gesture exists on desktop), so on
// web we detect the same intent ourselves: scrolling up (wheel) or dragging down (touch) while
// already at the top of the content, past a distance threshold.
const WEB_PULL_THRESHOLD = 70;
const MIN_REFRESH_VISIBLE_MS = 600;

interface PullToRefreshProps extends ScrollViewProps {
  onRefresh: () => void | Promise<void>;
  children: React.ReactNode;
  tintColor?: string;
}

export default function PullToRefresh({
  onRefresh,
  children,
  tintColor = "#F9EF08",
  ...scrollViewProps
}: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const scrollYRef = useRef(0);
  const wrapperRef = useRef<View>(null);

  const runRefresh = useCallback(() => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    const startedAt = Date.now();

    Promise.resolve()
      .then(() => onRefresh())
      .catch(() => {})
      .finally(() => {
        const wait = Math.max(0, MIN_REFRESH_VISIBLE_MS - (Date.now() - startedAt));
        setTimeout(() => {
          refreshingRef.current = false;
          setRefreshing(false);
        }, wait);
      });
  }, [onRefresh]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const node = wrapperRef.current as unknown as HTMLElement | null;
    if (!node) return;

    let pullDistance = 0;
    let touchStartY: number | null = null;
    const resetPull = () => { pullDistance = 0; };

    const handleWheel = (e: WheelEvent) => {
      if (refreshingRef.current || scrollYRef.current > 0) { resetPull(); return; }
      if (e.deltaY < 0) {
        pullDistance += -e.deltaY;
        if (pullDistance > WEB_PULL_THRESHOLD) {
          resetPull();
          runRefresh();
        }
      } else {
        resetPull();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (refreshingRef.current || touchStartY === null || scrollYRef.current > 0) return;
      const currentY = e.touches[0]?.clientY;
      if (currentY === undefined) return;
      if (currentY - touchStartY > WEB_PULL_THRESHOLD) {
        touchStartY = null;
        runRefresh();
      }
    };

    const handleTouchEnd = () => { touchStartY = null; };

    node.addEventListener("wheel", handleWheel, { passive: true });
    node.addEventListener("touchstart", handleTouchStart, { passive: true });
    node.addEventListener("touchmove", handleTouchMove, { passive: true });
    node.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      node.removeEventListener("wheel", handleWheel);
      node.removeEventListener("touchstart", handleTouchStart);
      node.removeEventListener("touchmove", handleTouchMove);
      node.removeEventListener("touchend", handleTouchEnd);
    };
  }, [runRefresh]);

  const handleScroll: NonNullable<ScrollViewProps["onScroll"]> = (e) => {
    scrollYRef.current = e.nativeEvent.contentOffset.y;
    scrollViewProps.onScroll?.(e);
  };

  return (
    <View ref={wrapperRef} style={{ flex: 1 }}>
      {Platform.OS === "web" && refreshing && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", top: 10, left: 0, right: 0, alignItems: "center", zIndex: 10 }}
        >
          <ActivityIndicator size="small" color={tintColor} />
        </View>
      )}
      <ScrollView
        {...scrollViewProps}
        onScroll={handleScroll}
        scrollEventThrottle={scrollViewProps.scrollEventThrottle ?? 16}
        refreshControl={
          Platform.OS !== "web" ? (
            <RefreshControl refreshing={refreshing} onRefresh={runRefresh} tintColor={tintColor} colors={[tintColor]} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </View>
  );
}
