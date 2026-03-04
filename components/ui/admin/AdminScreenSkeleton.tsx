import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

const SKELETON_BG = '#F0F0F0';

function SkeletonBar({
  width,
  height,
  style,
  animatedValue,
}: {
  width: string | number;
  height: number;
  style?: object;
  animatedValue: Animated.Value;
}) {
  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });
  return (
    <Animated.View
      style={[
        {
          width: typeof width === 'string' ? width : width,
          height,
          backgroundColor: SKELETON_BG,
          borderRadius: 6,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function useSkeletonPulse() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return anim;
}

/** Skeleton for dashboard: header, cards row, next row, list */
export function DashboardSkeleton() {
  const pulse = useSkeletonPulse();
  return (
    <View className="flex-1 bg-white px-6">
      <View className="pt-12 mb-6">
        <SkeletonBar width="60%" height={28} style={{ marginBottom: 8 }} animatedValue={pulse} />
        <SkeletonBar width="40%" height={16} animatedValue={pulse} />
      </View>
      <View className="flex-row gap-2 mb-4" style={{ alignItems: 'stretch' }}>
        <View style={{ flex: 1 }}>
          <SkeletonBar width="100%" height={100} style={{ borderRadius: 8 }} animatedValue={pulse} />
        </View>
        <View style={{ flex: 1 }} className="gap-2">
          <SkeletonBar width="100%" height={44} style={{ borderRadius: 8 }} animatedValue={pulse} />
          <SkeletonBar width="100%" height={44} style={{ borderRadius: 8 }} animatedValue={pulse} />
        </View>
      </View>
      <SkeletonBar width="100%" height={72} style={{ borderRadius: 8, marginBottom: 16 }} animatedValue={pulse} />
      <SkeletonBar width="50%" height={20} style={{ marginBottom: 12 }} animatedValue={pulse} />
      <View className="gap-2">
        {[1, 2, 3].map((i) => (
          <SkeletonBar key={i} width="100%" height={64} style={{ borderRadius: 8 }} animatedValue={pulse} />
        ))}
      </View>
    </View>
  );
}

/** Skeleton for list-based screens (e.g. bookings) */
export function ListSkeleton({ rowCount = 5 }: { rowCount?: number }) {
  const pulse = useSkeletonPulse();
  return (
    <View className="flex-1 px-6 pt-4">
      <SkeletonBar width="40%" height={24} style={{ marginBottom: 16 }} animatedValue={pulse} />
      <View className="flex-row gap-2 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBar key={i} width="22%" height={36} style={{ borderRadius: 6 }} animatedValue={pulse} />
        ))}
      </View>
      <View className="gap-3">
        {Array.from({ length: rowCount }).map((_, i) => (
          <SkeletonBar key={i} width="100%" height={72} style={{ borderRadius: 8 }} animatedValue={pulse} />
        ))}
      </View>
    </View>
  );
}

/** Skeleton for account/settings: header, profile block, list rows */
export function AccountSkeleton() {
  const pulse = useSkeletonPulse();
  return (
    <View className="flex-1 bg-white px-6">
      <View className="pt-4 pb-4">
        <SkeletonBar width="45%" height={32} animatedValue={pulse} />
      </View>
      <View className="items-center py-6">
        <SkeletonBar width={80} height={80} style={{ borderRadius: 40, marginBottom: 12 }} animatedValue={pulse} />
        <SkeletonBar width="50%" height={22} style={{ marginBottom: 6 }} animatedValue={pulse} />
        <SkeletonBar width="70%" height={16} animatedValue={pulse} />
      </View>
      <View className="gap-2 mt-2">
        {[1, 2, 3].map((i) => (
          <SkeletonBar key={i} width="100%" height={56} style={{ borderRadius: 16 }} animatedValue={pulse} />
        ))}
      </View>
    </View>
  );
}

/** Skeleton for services: header + section blocks */
export function ServicesSkeleton() {
  const pulse = useSkeletonPulse();
  return (
    <View className="flex-1 bg-white px-6">
      <View className="pt-4 pb-4">
        <SkeletonBar width="70%" height={32} animatedValue={pulse} />
      </View>
      <View className="gap-6">
        <View>
          <SkeletonBar width="25%" height={14} style={{ marginBottom: 8 }} animatedValue={pulse} />
          <SkeletonBar width="100%" height={80} style={{ borderRadius: 8 }} animatedValue={pulse} />
        </View>
        <View>
          <SkeletonBar width="25%" height={14} style={{ marginBottom: 8 }} animatedValue={pulse} />
          <SkeletonBar width="100%" height={80} style={{ borderRadius: 8 }} animatedValue={pulse} />
        </View>
        <View>
          <SkeletonBar width="35%" height={14} style={{ marginBottom: 8 }} animatedValue={pulse} />
          <SkeletonBar width="100%" height={60} style={{ borderRadius: 8 }} animatedValue={pulse} />
        </View>
      </View>
    </View>
  );
}
