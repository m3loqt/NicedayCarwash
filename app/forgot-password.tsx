import { useAlert } from '@/hooks/use-alert';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { useState } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
  const { alert, AlertComponent } = useAlert();
  const [email, setEmail] = useState('');
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  const handleBack = () => {
    router.push('/');
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      alert('Error', 'Please enter your email');
      return;
    }

    const auth = getAuth();
    try {
      await sendPasswordResetEmail(auth, email);
      setShowSuccessScreen(true);
    } catch (error: any) {
      console.error('Reset password error:', error);
      alert(
        'Failed',
        error.message || 'Failed to send password reset email'
      );
    }
  };

  const handleOpenEmailApp = () => {
    // Optional: open email app using Linking
  };

  const handleResend = () => {
    handleResetPassword();
  };

  if (showSuccessScreen) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 px-6">
          <View className="pt-8 pb-4 items-end">
            <TouchableOpacity 
              className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center"
              onPress={handleBack}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 justify-center items-center">
            <View className="w-24 h-24 bg-[#F9EF08] rounded-full items-center justify-center mb-8 shadow-lg">
              <Ionicons name="mail" size={40} color="white" />
            </View>

            <Text className="text-3xl font-bold text-gray-800 mb-4 text-center">
              Email Sent!
            </Text>

            <Text className="text-lg text-gray-600 text-center mb-8 px-4 leading-6">
              We have sent an email to {email} with a link to reset your password.
            </Text>

            <TouchableOpacity 
              className="bg-[#F9EF08] rounded-xl py-5 items-center w-full mb-6" 
              onPress={handleOpenEmailApp}
            >
              <Text className="text-lg font-bold text-white">
                Open email app
              </Text>
            </TouchableOpacity>

            <View className="flex-row items-center">
              <Text className="text-gray-600 text-base">
                Email not received?{' '}
              </Text>
              <TouchableOpacity onPress={handleResend}>
                <Text className="text-[#F9EF08] text-base font-semibold">
                  Resend
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6">
          <View className="pt-8 pb-4">
            <TouchableOpacity 
              className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center"
              onPress={handleBack}
            >
              <Ionicons name="arrow-back" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 justify-center items-center">
            <View className="w-24 h-24 rounded-full items-center justify-center mb-8">
              <Image 
                source={require('../assets/images/forgotpasslogo.png')}
                className="w-24 h-24"
                resizeMode="contain"
              />
            </View>

            <Text className="text-3xl font-bold text-gray-800 mb-4 text-center">
              Forgot Password
            </Text>

            <Text className="text-lg text-gray-600 text-center mb-8 px-4">
              Enter your email to receive a password reset link.
            </Text>

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
      {AlertComponent}
    </SafeAreaView>
  );
}
