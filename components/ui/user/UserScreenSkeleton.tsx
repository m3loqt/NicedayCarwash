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

function usePulse() {
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

/** Skeleton for user home: header area, slider, promo card */
export function HomeSkeleton() {
  const pulse = usePulse();
  return (
    <View className="flex-1 px-5" style={{ paddingTop: 8 }}>
      <View className="mb-6">
        <SkeletonBar width="70%" height={28} style={{ marginBottom: 6 }} animatedValue={pulse} />
        <SkeletonBar width="50%" height={16} animatedValue={pulse} />
      </View>
      <SkeletonBar width="100%" height={120} style={{ borderRadius: 12, marginBottom: 20 }} animatedValue={pulse} />
      <SkeletonBar width="100%" height={140} style={{ borderRadius: 16 }} animatedValue={pulse} />
    </View>
  );
}

/** Skeleton for branch selection list: section title + card rows */
export function BranchListSkeleton() {
  const pulse = usePulse();
  return (
    <View className="flex-1 pt-4">
      <View className="px-5 mb-2">
        <SkeletonBar width="55%" height={18} animatedValue={pulse} />
      </View>
      <View className="px-5 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <View key={i} className="flex-row items-center">
            <SkeletonBar width={60} height={60} style={{ borderRadius: 12, marginRight: 16 }} animatedValue={pulse} />
            <View className="flex-1 gap-1.5">
              <SkeletonBar width="70%" height={16} animatedValue={pulse} />
              <SkeletonBar width="90%" height={12} animatedValue={pulse} />
              <SkeletonBar width="30%" height={12} animatedValue={pulse} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export { ListSkeleton, AccountSkeleton } from '@/components/ui/admin/AdminScreenSkeleton';
