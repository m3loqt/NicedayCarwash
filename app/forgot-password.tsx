import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  const handleBack = () => router.push('/');

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Missing info', 'Please enter your email address.');
      return;
    }
    try {
      await sendPasswordResetEmail(getAuth(), email);
      setShowSuccessScreen(true);
    } catch (error: any) {
      Alert.alert('Failed', error.message || 'Failed to send reset email.');
    }
  };

  // ─── Success State ──────────────────────────────────────────────────────────
  if (showSuccessScreen) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View className="flex-1 px-6 justify-center items-center">

          {/* Icon */}
          <View className="w-16 h-16 rounded-2xl bg-[#FAFAFA] border border-[#EEEEEE] items-center justify-center mb-5">
            <Ionicons name="mail-outline" size={28} color="#1A1A1A" />
          </View>

          {/* Title + message */}
          <Text className="text-[20px] font-bold text-[#1A1A1A] text-center mb-1.5">
            Check your email
          </Text>
          <Text className="text-[13px] text-[#999] text-center mb-8 leading-5 px-4">
            We sent a password reset link to{' '}
            <Text className="font-semibold text-[#1A1A1A]">{email}</Text>
          </Text>

          {/* Open email app */}
          <TouchableOpacity
            className="w-full bg-[#F9EF08] rounded-2xl py-3.5 items-center mb-4"
            activeOpacity={0.85}
            onPress={() => console.log('Open email app')}
          >
            <Text className="text-[14px] font-bold text-[#1A1A00]">Open email app</Text>
          </TouchableOpacity>

          {/* Resend */}
          <View className="flex-row items-center">
            <Text className="text-[12px] text-[#999]">Didn't receive it? </Text>
            <TouchableOpacity onPress={handleResetPassword}>
              <Text className="text-[12px] font-bold text-[#1A1A1A]">Resend</Text>
            </TouchableOpacity>
          </View>

          {/* Back to login */}
          <TouchableOpacity onPress={handleBack} className="mt-6">
            <Text className="text-[12px] text-[#999]">Back to Sign In</Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    );
  }

  // ─── Main State ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6">

          {/* Back */}
          <TouchableOpacity
            onPress={handleBack}
            className="mt-4 mb-8"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
          </TouchableOpacity>

          {/* Icon */}
          <View className="w-16 h-16 rounded-2xl bg-[#FAFAFA] border border-[#EEEEEE] items-center justify-center mb-5">
            <Ionicons name="lock-closed-outline" size={28} color="#1A1A1A" />
          </View>

          {/* Heading */}
          <Text className="text-[22px] font-bold text-[#1A1A1A] mb-1">
            Forgot password?
          </Text>
          <Text className="text-[13px] text-[#999] mb-8 leading-5">
            Enter your email and we'll send you a link to reset your password.
          </Text>

          {/* Email field */}
          <View className="mb-6">
            <Text className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-1.5">
              Email Address
            </Text>
            <TextInput
              className="bg-[#FAFAFA] border border-[#EEEEEE] rounded-2xl px-4 py-3.5 text-[13px] text-[#1A1A1A]"
              placeholder="sample@gmail.com"
              placeholderTextColor="#C4C4C4"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Send button */}
          <TouchableOpacity
            className="w-full bg-[#F9EF08] rounded-2xl py-3.5 items-center mb-5"
            onPress={handleResetPassword}
            activeOpacity={0.85}
          >
            <Text className="text-[14px] font-bold text-[#1A1A00]">Send Reset Link</Text>
          </TouchableOpacity>

          {/* Back to login */}
          <View className="items-center">
            <Text className="text-[12px] text-[#999]">
              Remember your password?{' '}
              <Text className="font-bold text-[#1A1A1A]" onPress={handleBack}>Sign In</Text>
            </Text>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
