import { Image, View } from 'react-native';

export default function PromotionalBanner() {
  return (
    <View
      className="rounded-2xl overflow-hidden bg-white"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
      }}
    >
      <Image
        source={require('../../../../assets/images/adholderclearr.png')}
        style={{ width: '100%', height: 160 }}
        resizeMode="cover"
      />
    </View>
  );
}
