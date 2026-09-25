import { StatusBar } from 'expo-status-bar';
import { ReactNode, useEffect } from 'react';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const KEYBOARD_ANIM_MS = 220;
const CARD_OVERLAP = 32; // how far the white card rides up over the yellow header
const BACK_CARD_PEEK = 10; // how far the stacked back-card layer peeks above the main card
const BACK_CARD_INSET = 16; // how much narrower the back-card layer is, per side
const CARD_RADIUS = 28;
const LOGO_ASPECT_RATIO = 1552 / 3776; // ndcwlogo.png is 3776x1552
const COLLAPSED_HEADER_HEIGHT = 120;
// Single switch for the decorative "soap bubble" circles behind the header logo.
const SHOW_HEADER_BUBBLES = true;

function HeaderBubbles() {
  if (!SHOW_HEADER_BUBBLES) return null;
  const bubble = (size: number, style: object) => (
    <View
      style={[
        { position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(255,255,255,0.12)' },
        style,
      ]}
    />
  );
  return (
    <>
      {bubble(180, { top: -70, left: -50 })}
      {bubble(130, { top: 10, right: -40 })}
    </>
  );
}

interface AuthShellProps {
  /** The card's own content - headline, fields, buttons, links. Rendered inside the shell's
   * ScrollView, so it should not bring its own ScrollView/KeyboardAvoidingView. */
  children: ReactNode;
  /** Expanded header height as a fraction of window height. Default matches Sign In (0.30). */
  headerHeightRatio?: number;
  /** Floor under headerHeightRatio, for short screens. Default matches Sign In (200). */
  minHeaderHeight?: number;
  /** Logo width in the expanded header; height follows from its own aspect ratio. */
  logoWidth?: number;
}

// Shared "yellow header + white card sheet" shell for Sign In and Sign Up: header (logo +
// decorative bubbles) that bleeds behind the status bar, a stacked-card white sheet below it,
// and a header-shrink animation while the keyboard is open so the card rides up and stays
// reachable. Screens only ever differ in header size/logo size and their own card content -
// every other visual (bubble positions, card radius, overlap, keyboard behavior) is fixed here
// so the two screens can't visually drift apart.
export default function AuthShell({
  children,
  headerHeightRatio = 0.3,
  minHeaderHeight = 200,
  logoWidth = 170,
}: AuthShellProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  // Header shrinks (height + logo size) while the keyboard is open so the card rides up and
  // the fields/submit button stay visible, instead of relying on the ScrollView alone.
  // 1 = fully expanded, 0 = fully collapsed.
  const expandedHeaderHeight = Math.max(windowHeight * headerHeightRatio, minHeaderHeight);
  const headerProgress = useSharedValue(1);
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    height: interpolate(headerProgress.value, [0, 1], [COLLAPSED_HEADER_HEIGHT, expandedHeaderHeight]),
  }));
  // Animates actual width/height rather than transform:scale - a transform doesn't shrink the
  // layout box it's centered in, which would clip against the collapsed header's overflow:hidden
  // edge even though it visually looked smaller.
  const logoAnimatedStyle = useAnimatedStyle(() => {
    const width = interpolate(headerProgress.value, [0, 1], [logoWidth * 0.6, logoWidth]);
    return { width, height: width * LOGO_ASPECT_RATIO };
  });

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      headerProgress.value = withTiming(0, { duration: KEYBOARD_ANIM_MS });
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      headerProgress.value = withTiming(1, { duration: KEYBOARD_ANIM_MS });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [headerProgress]);

  return (
    <View style={{ flex: 1, backgroundColor: '#F9EF08' }}>
      <StatusBar style="dark" />

      {/* Yellow header - no top safe-area padding on the outer View so the color reaches
          behind the status bar; the logo itself is padded down to sit below it. */}
      <Animated.View style={[{ backgroundColor: '#F9EF08', overflow: 'hidden' }, headerAnimatedStyle]}>
        <HeaderBubbles />
        <View
          style={{
            flex: 1,
            // Centers within the header's actually-visible band only - the bottom CARD_OVERLAP
            // is covered by the white card riding up over the header, so it's excluded from the
            // centering box (otherwise the logo centers into space the card then hides), plus a
            // manual +10 nudge down for optical balance against the status bar above it.
            paddingTop: insets.top + 10,
            paddingBottom: CARD_OVERLAP,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Animated.Image
            source={require('../../assets/images/ndcwlogo.png')}
            style={logoAnimatedStyle}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* Card group - marginTop rides the whole group up over the header by CARD_OVERLAP, so
          it tracks the header's animated height automatically instead of needing its own
          keyboard logic. Sits in a flex:1 slot, so it always reaches the screen's bottom edge. */}
      <View style={{ flex: 1, marginTop: -CARD_OVERLAP, elevation: 0 }}>
        {/* Stacked back-card layer */}
        <View
          style={{
            position: 'absolute',
            top: -BACK_CARD_PEEK,
            left: BACK_CARD_INSET,
            right: BACK_CARD_INSET,
            bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.7)',
            borderTopLeftRadius: CARD_RADIUS,
            borderTopRightRadius: CARD_RADIUS,
            elevation: 0,
          }}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: CARD_RADIUS,
            borderTopRightRadius: CARD_RADIUS,
            overflow: 'hidden',
            elevation: 0,
            shadowColor: 'transparent',
          }}
        >
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: insets.bottom + 24 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}
