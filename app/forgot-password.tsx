import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');

  const handleBack = () => {
    // Navigate back to login screen
    router.push('/');
  };

  const handleResetPassword = () => {
    // Handle password reset logic here
    console.log('Reset password pressed');
    console.log('Email:', email);
    
    // TODO: Add validation and API call
    // For now, show success message or redirect
    alert('Password reset link sent to your email!');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6">
          {/* Header */}
          <View className="pt-8 pb-4">
            <TouchableOpacity 
              className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center"
              onPress={handleBack}
            >
              <Ionicons name="arrow-back" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          <View className="flex-1 justify-center items-center">
            {/* Lock Icon */}
            <View className="w-24 h-24 bg-[#F9EF08] rounded-full items-center justify-center mb-8">
              <View className="w-16 h-16 bg-[#F9EF08] rounded-full items-center justify-center border-4 border-white">
                <Ionicons name="lock-closed" size={32} color="white" />
              </View>
              <View className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full items-center justify-center">
                <Text className="text-[#F9EF08] text-xl font-bold">?</Text>
              </View>
            </View>

            {/* Title */}
            <Text className="text-3xl font-bold text-gray-800 mb-4 text-center">
              Forgot Password
            </Text>

            {/* Description */}
            <Text className="text-lg text-gray-600 text-center mb-8 px-4">
              Enter your email to receive a password reset link.
            </Text>

            {/* Email Input */}
            <View className="w-full mb-8">
              <TextInput
                className="border border-gray-300 rounded-xl px-5 py-4 text-lg bg-white text-gray-800 w-full"
                placeholder="Email Address"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Reset Password Button */}
            <TouchableOpacity 
              className="bg-[#F9EF08] rounded-xl py-5 items-center w-full" 
              onPress={handleResetPassword}
            >
              <Text className="text-lg font-bold text-white">
                Reset Password
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

