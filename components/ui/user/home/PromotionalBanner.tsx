import { Image, View } from 'react-native';

export default function PromotionalBanner() {
  return (
    <View className="rounded-xl shadow-xl overflow-hidden">
      <Image
        source={require('../../../../assets/images/adholder.png')}
        className="w-full h-52"
        resizeMode="contain"
      />
    </View>
  );
}
