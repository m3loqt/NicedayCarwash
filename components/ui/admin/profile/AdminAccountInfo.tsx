import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
    <View className="bg-white rounded-lg shadow-md mx-4 mt-4 p-4">
      <View className="flex flex-row items-center">
        {/* Profile Image or Placeholder */}
        <View className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden mr-4">
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full flex items-center justify-center bg-gray-200">
              <Ionicons name="person" size={50} color="#9CA3AF" />
            </View>
          )}
        </View>
        <View className="flex flex-col">
          <Text className="text-xl font-bold text-[#1E1E1E]">
            {firstName} {lastName}
          </Text>
          <Text className="text-sm text-gray-500">{email}</Text>
        </View>
      </View>
      <TouchableOpacity
        className="mt-4 px-6 py-4 mx-2 text-center border border-[#F9EF08] rounded-md w-full bg-white self-start"
        onPress={onEditAccount}
      >
        <Text className="text-[#F9EF08] text-center font-semibold">Edit Account</Text>
      </TouchableOpacity>
    </View>
  );
}

