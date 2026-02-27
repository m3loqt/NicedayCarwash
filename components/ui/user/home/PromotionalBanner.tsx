import { router } from 'expo-router';
import { Image, TouchableOpacity } from 'react-native';

export default function PromotionalBanner() {
  return (
    <TouchableOpacity
      className="rounded-2xl overflow-hidden bg-[#FAFAFA] border border-[#EEEEEE]"
      activeOpacity={0.9}
      onPress={() => router.push('/user/(tabs)/book' as any)}
    >
      <Image
        source={require('../../../../assets/images/adholderclearr.png')}
        style={{ width: '100%', height: 160 }}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );
}
