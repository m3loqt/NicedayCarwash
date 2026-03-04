import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

interface LazyIconProps {
  type: 'ionicons' | 'material';
  name: string;
  size: number;
  color: string;
  style?: any;
}

export function LazyIcon({ type, name, size, color, style }: LazyIconProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    // Using requestAnimationFrame to ensure icon renders after initial paint
    // This helps with font loading while maintaining layout
    const frameId = requestAnimationFrame(() => {
      // Adding small delay to ensure icon fonts are loaded
      timer = setTimeout(() => {
        setIsVisible(true);
      }, 200);
    });

    return () => {
      cancelAnimationFrame(frameId);
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  // Rendering icon immediately to preserve layout, wrapped in a container with fixed dimensions
  const iconElement = type === 'ionicons' 
    ? <Ionicons name={name as any} size={size} color={color} style={[{ opacity: isVisible ? 1 : 0 }]} />
    : <MaterialIcons name={name as any} size={size} color={color} style={[{ opacity: isVisible ? 1 : 0 }]} />;

  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      {iconElement}
    </View>
  );
}

