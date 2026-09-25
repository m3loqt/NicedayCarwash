import * as Haptics from 'expo-haptics';
import { forwardRef } from 'react';
import { GestureResponderEvent, Pressable, PressableProps, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AppButtonProps extends PressableProps {
  /** Light impact haptic on press-in. Default true - set false for dense/repeated controls (list items, steppers). */
  haptic?: boolean;
  /** How far the button shrinks on press, as a scale factor. */
  scaleTo?: number;
  /** Opacity while pressed, layered on top of the scale for a firmer "registered" feel. */
  pressedOpacity?: number;
}

// Drop-in replacement for TouchableOpacity: press-in shrinks + dims instantly (no spring, so it
// reads as an immediate reaction to touch) and release springs back with a little bounce, plus a
// light haptic tick - the combination is what makes a tap feel physically "pressed" rather than
// just a color change (see the Grab/Foodpanda UX pass this button was built for).
export const AppButton = forwardRef<View, AppButtonProps>(function AppButton(
  { haptic = true, scaleTo = 0.96, pressedOpacity = 0.85, style, onPressIn, onPressOut, ...props },
  ref
) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = (e: GestureResponderEvent) => {
    scale.value = withTiming(scaleTo, { duration: 60 });
    opacity.value = withTiming(pressedOpacity, { duration: 60 });
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    scale.value = withSpring(1, { damping: 14, stiffness: 220 });
    opacity.value = withTiming(1, { duration: 120 });
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      ref={ref}
      style={[animatedStyle, style]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    />
  );
});
