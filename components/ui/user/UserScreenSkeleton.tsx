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

/** Skeleton for the home screen's horizontal "Branches near you" slider */
export function BranchesSliderSkeleton() {
  const pulse = usePulse();
  return (
    <View className="mt-10">
      <View className="flex-row justify-between items-center px-5 mb-2">
        <SkeletonBar width="45%" height={20} animatedValue={pulse} />
      </View>
      <View className="flex-row px-5 gap-4">
        {[1, 2].map((i) => (
          <View key={i} style={{ width: 220 }}>
            <SkeletonBar width="100%" height={115} style={{ borderRadius: 8 }} animatedValue={pulse} />
            <View className="pt-2.5 gap-1.5">
              <SkeletonBar width="70%" height={14} animatedValue={pulse} />
              <SkeletonBar width="90%" height={11} animatedValue={pulse} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Skeleton for the booking flow's vertical "Select plan" cards */
export function ServiceCardsSkeleton() {
  const pulse = usePulse();
  return (
    <View className="px-4" style={{ paddingVertical: 4 }}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          className="mb-3 rounded-2xl bg-white px-4 py-3.5"
          style={{ borderWidth: 2, borderColor: 'transparent' }}
        >
          <View className="flex-row items-start">
            <SkeletonBar width={22} height={22} style={{ borderRadius: 11, marginRight: 12 }} animatedValue={pulse} />
            <View style={{ flex: 1 }}>
              <View className="flex-row justify-between items-center">
                <SkeletonBar width="50%" height={15} animatedValue={pulse} />
                <SkeletonBar width={44} height={15} animatedValue={pulse} />
              </View>
              <SkeletonBar width="92%" height={12} style={{ marginTop: 8 }} animatedValue={pulse} />
              <SkeletonBar width="60%" height={12} style={{ marginTop: 6 }} animatedValue={pulse} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Skeleton for the booking flow's compact "Add ons" rows */
export function AddonCardsSkeleton() {
  const pulse = usePulse();
  return (
    <View className="px-4" style={{ paddingVertical: 4 }}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          className="mb-2.5 rounded-2xl bg-white px-4 py-3 flex-row items-center"
          style={{ borderWidth: 2, borderColor: 'transparent' }}
        >
          <SkeletonBar width={22} height={22} style={{ borderRadius: 8, marginRight: 12 }} animatedValue={pulse} />
          <View style={{ flex: 1 }}>
            <SkeletonBar width="55%" height={15} animatedValue={pulse} />
          </View>
          <SkeletonBar width={56} height={15} animatedValue={pulse} />
        </View>
      ))}
    </View>
  );
}

/** Skeleton for the booking flow's day strip, shown until the branch's slots have loaded */
export function DateStripSkeleton() {
  const pulse = usePulse();
  return (
    <View className="flex-row px-4 mb-5" style={{ paddingTop: 4 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <SkeletonBar key={i} width={64} height={72} style={{ borderRadius: 16, marginRight: 8 }} animatedValue={pulse} />
      ))}
    </View>
  );
}

/** Skeleton for the floating active-booking bar, shown only while its first fetch is in flight */
export function ActiveBookingSkeleton() {
  const pulse = usePulse();
  return (
    <View className="bg-white rounded-2xl px-4 pt-4 pb-3.5 border border-[#F0F0F0]">
      <View className="flex-row items-center">
        <View className="flex-1 mr-3 gap-1.5">
          <SkeletonBar width="55%" height={19} animatedValue={pulse} />
          <SkeletonBar width="40%" height={12} animatedValue={pulse} />
        </View>
        <SkeletonBar width={68} height={68} style={{ borderRadius: 34 }} animatedValue={pulse} />
      </View>
      <View className="flex-row items-center mt-3.5 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBar key={i} width={16} height={16} style={{ borderRadius: 8 }} animatedValue={pulse} />
        ))}
      </View>
    </View>
  );
}

export { ListSkeleton, AccountSkeleton } from '@/components/ui/admin/AdminScreenSkeleton';
