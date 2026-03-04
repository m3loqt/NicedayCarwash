import { Ionicons } from '@expo/vector-icons';
import { Image, Text, TouchableOpacity, View } from 'react-native';

interface AdminAccountInfoProps {
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string;
  onEditAccount: () => void;
}

export default function AdminAccountInfo({
  firstName,
  lastName,
  email,
  profileImage,
  onEditAccount,
}: AdminAccountInfoProps) {
  return (
    <View className="mx-5 mt-4 bg-[#FAFAFA] border border-[#EEEEEE] rounded-2xl px-4 py-4">
      <View className="flex-row items-center">
        {/* Profile Image or Placeholder */}
        <View className="w-16 h-16 rounded-full bg-[#FAFAFA] border border-[#EEEEEE] overflow-hidden mr-4">
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full items-center justify-center">
              <Ionicons name="person-outline" size={32} color="#BDBDBD" />
            </View>
          )}
        </View>
        <View className="flex-1">
          <Text className="text-[16px] font-bold text-[#1A1A1A]">
            {firstName} {lastName}
          </Text>
          <Text className="text-[13px] text-[#999] mt-0.5">{email}</Text>
        </View>
      </View>
      <TouchableOpacity
        className="mt-4 bg-[#F9EF08] rounded-2xl py-3.5 items-center"
        onPress={onEditAccount}
      >
        <Text className="text-[14px] font-bold text-[#1A1A00]">Edit Account</Text>
      </TouchableOpacity>
    </View>
  );
}

