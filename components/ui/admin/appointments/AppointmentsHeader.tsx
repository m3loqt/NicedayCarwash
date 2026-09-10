import { usePendingBranchBookings } from '@/hooks/use-pending-branch-bookings';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Text, TouchableOpacity, View } from 'react-native';

export default function AppointmentsHeader() {
  const { count } = usePendingBranchBookings();

  return (
    <View className="px-5 pt-4 pb-4 flex-row items-center justify-between">
      <Text className="text-3xl font-bold text-[#1A1A1A]">Bookings</Text>
      <View className="flex-row items-center">
        <TouchableOpacity
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => router.push('/admin/notifications')}
          className="w-9 h-9 rounded-full bg-[#FAFAFA] items-center justify-center"
        >
          <Ionicons name="notifications-outline" size={18} color="#1A1A1A" />
          {count > 0 && (
            <View className="absolute -top-0.5 -right-0.5 min-w-[10px] h-[10px] rounded-full bg-red-500 border-2 border-white items-center justify-center px-[1px]">
              {count > 9 ? (
                <Text style={{ fontSize: 6, color: '#fff', fontWeight: '700', lineHeight: 8 }}>9+</Text>
              ) : null}
            </View>
          )}
        </TouchableOpacity>
        <Image
          source={require('../../../../assets/images/ndcwlogo.png')}
          className="w-16 h-11 ml-2.5"
          resizeMode="contain"
        />
      </View>
    </View>
  );
}
