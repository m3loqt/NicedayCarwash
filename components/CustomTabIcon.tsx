import { Image, ImageSourcePropType } from 'react-native';

interface CustomTabIconProps {
  source: ImageSourcePropType;
  focused: boolean;
  size?: number;
}

export function CustomTabIcon({ source, focused, size = 24 }: CustomTabIconProps) {
  return (
    <Image
      source={source}
      style={{
        width: size,
        height: size,
        tintColor: focused ? '#F9EF08' : '#9CA3AF', // Yellow when focused, gray when not
        opacity: focused ? 1 : 0.6,
      }}
      resizeMode="contain"
    />
  );
}
