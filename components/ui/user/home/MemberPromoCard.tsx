import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

export default function MemberPromoCard() {
  const handleClaimOffer = () => {
    console.log('Claim offer pressed');
  };

  return (
    <View className="mx-5 mt-6">
      <View
        className="bg-[#1E1E1E] rounded-2xl p-6 overflow-hidden"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        {/* Decorative water drops */}
        <View className="absolute right-4 bottom-2 opacity-15">
          <Ionicons name="water" size={100} color="#FFFFFF" />
        </View>
        <View className="absolute right-16 bottom-8 opacity-10">
          <Ionicons name="water" size={52} color="#FFFFFF" />
        </View>

        {/* Content */}
        <Text className="text-[#F9EF08] text-xs font-bold tracking-widest mb-2">
          MEMBER EXCLUSIVE
        </Text>
        <Text className="text-white text-2xl font-bold mb-1">
          Get 20% OFF
        </Text>
        <Text className="text-[#9CA3AF] text-sm mb-5">
          On your first interior detail
        </Text>
        <TouchableOpacity
          className="self-start border border-[#F9EF08] rounded-xl px-6 py-2.5"
          onPress={handleClaimOffer}
          activeOpacity={0.8}
        >
          <Text className="text-[#F9EF08] text-sm font-semibold">Claim Offer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
