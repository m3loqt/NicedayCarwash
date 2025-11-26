import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditProfile() {
  const [firstName, setFirstName] = useState('Mel Angelo');
  const [lastName, setLastName] = useState('Cortes');
  const [password, setPassword] = useState('........');
  const [showPassword, setShowPassword] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleSaveChanges = () => {
    // TODO: Implement save profile logic
    console.log('Save profile:', {
      firstName,
      lastName,
      password
    });
    
    // Navigate back after saving
    router.back();
  };

  const handleChangeProfilePicture = () => {
    // TODO: Implement profile picture change logic
    console.log('Change profile picture');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top']}>
      {/* Header */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between p-4">
          <TouchableOpacity 
            className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center"
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color="#666" />
          </TouchableOpacity>
          
          <Text className="text-xl font-bold text-gray-900">Edit Account</Text>
          
          <View className="w-10" />
        </View>
      </View>

      {/* Main Content */}
      <ScrollView className="flex-1 p-6">
        {/* Profile Picture Section */}
        <View className="items-center mb-8">
          <View className="relative">
            {/* Profile Picture */}
            <View className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-lg overflow-hidden">
              <Image
                source={require('../../../../assets/images/profile_placeholder.png')}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            
            {/* Camera Button */}
            <TouchableOpacity
              className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#F9EF08] rounded-full items-center justify-center shadow-lg"
              onPress={handleChangeProfilePicture}
            >
              <Ionicons name="camera" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Fields */}
        <View className="space-y-6">
          {/* First Name */}
          <View>
            <Text className="text-lg font-semibold text-gray-800 mb-3">
              First Name
            </Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-xl px-4 py-4 text-lg text-gray-800"
              placeholder="Enter first name"
              placeholderTextColor="#999"
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>

          {/* Last Name */}
          <View>
            <Text className="text-lg font-semibold text-gray-800 mb-3">
              Last Name
            </Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-xl px-4 py-4 text-lg text-gray-800"
              placeholder="Enter last name"
              placeholderTextColor="#999"
              value={lastName}
              onChangeText={setLastName}
            />
          </View>

          {/* Password */}
          <View>
            <Text className="text-lg font-semibold text-gray-800 mb-3">
              Password
            </Text>
            <View className="relative">
              <TextInput
                className="bg-white border border-gray-300 rounded-xl px-4 py-4 text-lg text-gray-800 pr-12"
                placeholder="Enter password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                className="absolute right-4 top-1/2 -translate-y-1/2"
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Save Changes Button */}
      <View className="p-6 bg-white border-t border-gray-200">
        <TouchableOpacity
          className="bg-[#F9EF08] rounded-xl py-4 items-center"
          onPress={handleSaveChanges}
        >
          <Text className="text-lg font-bold text-white">
            Save Changes
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}