import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';

interface ToastProps {
  message: string | null;
  onHide: () => void;
  /** How long it stays before sliding away, in ms */
  duration: number;
}

// A short, self-dismissing confirmation for routine successes. It never blocks the screen and
// needs no tap: it slides in at the top, stays a few seconds, and slides out. Tapping it dismisses
// it early. One sentence only; anything the person must act on belongs in an alert instead.
//
// It is styled from the app's own pieces rather than as a separate widget: a white card on the
// same 16px gutters as every other card, only a faint lift underneath, and the yellow
// circle with a dark tick that already means "selected" through the booking flow.
export default function Toast({ message, onHide, duration }: ToastProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(progress, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onHide();
      });
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onHide, progress]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 12,
        left: 16,
        right: 16,
        zIndex: 100,
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
      }}
    >
      <Pressable onPress={onHide} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <View
          className="flex-row items-center rounded-2xl bg-white px-4 py-3.5"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}
        >
          <View
            className="items-center justify-center bg-[#F9EF08]"
            style={{ width: 22, height: 22, borderRadius: 11 }}
          >
            <Ionicons name="checkmark" size={14} color="#1A1A1A" />
          </View>
          <Text className="flex-1 text-[14px] font-medium text-[#1A1A1A] ml-3" numberOfLines={2}>
            {message}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
