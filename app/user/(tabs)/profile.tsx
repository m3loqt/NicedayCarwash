import { Ionicons } from '@expo/vector-icons';
import { StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UserProfileScreen() {
  const handleEditAccount = () => {
    console.log('Edit Account pressed');
  };

  const handleSignOut = () => {
    console.log('Sign Out pressed');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      {/* Header */}
      <View className="flex flex-row items-center p-4 bg-white border-b border-gray-200">
        <TouchableOpacity className="p-2 rounded-full border border-gray-300">
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-bold text-gray-900">Account</Text>
        <View className="w-8" />
      </View>

      {/* Profile Card */}
      <View className="bg-white rounded-lg shadow-md mx-4 mt-4 p-4">
        <View className="flex flex-row items-center">
          {/* Profile Icon Placeholder */}
          <View className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mr-4">
            <Ionicons name="person" size={50} color="#9CA3AF" />
          </View>
          <View className="flex flex-col">
            <Text className="text-xl font-bold text-gray-900">Mel Angelo Cortes</Text>
            <Text className="text-sm text-gray-500">angelomelcortes06@gmail.com</Text>
          </View>
        </View>
        <TouchableOpacity 
          className="mt-4 px-6 py-4 mx-2 text-center border border-[#F9EF08] rounded-md w-full bg-white self-start"
          onPress={handleEditAccount}
        >
          <Text className="text-[#F9EF08] text-center font-semibold">Edit Account</Text>
        </TouchableOpacity>
      </View>

      {/* Sign Out Section */}
      <TouchableOpacity 
        className="bg-white rounded-lg mx-4 mt-4 p-4 flex flex-row items-center"
        onPress={handleSignOut}
      >
        <Ionicons name="log-out" size={24} color="black" className="mr-3" />
        <Text className="text-lg text-gray-900">Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
