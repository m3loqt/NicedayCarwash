import { Image, type ImageContentFit } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, type ImageSourcePropType, type ViewStyle } from 'react-native';

interface RemoteImageProps {
  /** Remote URL. When absent, `fallback` shows immediately with no skeleton. */
  uri?: string | null;
  fallback: ImageSourcePropType;
  style?: ViewStyle | ViewStyle[];
  contentFit?: ImageContentFit;
}

// A remote image that pulses a grey skeleton until the photo is decoded, then cross-fades it in -
// so a slow branch photo never pops in abruptly or leaves an empty box while loading.
export default function RemoteImage({ uri, fallback, style, contentFit = 'cover' }: RemoteImageProps) {
  const [loaded, setLoaded] = useState(!uri);
  const overlay = useRef(new Animated.Value(uri ? 1 : 0)).current;

  useEffect(() => {
    if (loaded) {
      Animated.timing(overlay, { toValue: 0, duration: 260, useNativeDriver: true }).start();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(overlay, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(overlay, { toValue: 0.5, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [loaded, overlay]);

  return (
    <Animated.View style={[{ backgroundColor: '#ECECEC', overflow: 'hidden' }, style]}>
      <Image
        source={uri ? { uri } : fallback}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        transition={240}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#E0E0E0', opacity: overlay }]}
      />
    </Animated.View>
  );
}
