import { router } from 'expo-router';
import { Dimensions, Image, TouchableOpacity, View } from 'react-native';

// Native size of promoad.png (1672x941) - used to size the banner at its real
// aspect ratio instead of forcing a fixed height, which was cropping/zooming the image.
const AD_IMAGE_ASPECT_RATIO = 1672 / 941;
const SCREEN_WIDTH = Dimensions.get('window').width;
const BANNER_WIDTH = SCREEN_WIDTH - 40; // matches the px-5 (20px each side) parent padding
export const BANNER_HEIGHT = BANNER_WIDTH / AD_IMAGE_ASPECT_RATIO;

export default function PromotionalBanner() {
  return (
    <View className="rounded-xl bg-[#FAFAFA]">
      <TouchableOpacity
        className="rounded-xl overflow-hidden"
        activeOpacity={0.9}
        onPress={() => router.push('/user/(tabs)/book' as any)}
      >
        <Image
          source={require('../../../../assets/images/promoad.png')}
          style={{ width: '100%', height: BANNER_HEIGHT }}
          resizeMode="cover"
        />
      </TouchableOpacity>
    </View>
  );
}
