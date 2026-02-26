import { Image, View } from 'react-native';

export default function PromotionalBanner() {
  return (
    <View
      className="rounded-2xl overflow-hidden bg-[#FAFAFA] border border-[#EEEEEE]"
    >
      <Image
        source={require('../../../../assets/images/adholderclearr.png')}
        style={{ width: '100%', height: 160 }}
        resizeMode="cover"
      />
    </View>
  );
}
