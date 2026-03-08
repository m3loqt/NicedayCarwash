import { useAlert } from '@/hooks/use-alert';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const { alert, AlertComponent } = useAlert();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      alert('Error', 'Please fill out all fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      alert('Error', 'Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const auth = getAuth();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      if (user) {
        const userId = user.uid;
        const db = getDatabase();
        const userRef = ref(db, `users/${userId}`);

        const userMap = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          role: 'default',
          profileImage: '',
        };

        await set(userRef, userMap);

        alert('Success', 'Registration successful.', [
          { text: 'OK', onPress: () => router.push('/') },
        ]);
      }
    } catch (error: any) {
      alert('Registration Failed', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push('/');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          className="px-6"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View className="items-center pt-12 mb-8 -mb-2">
            <Image
              source={require('../assets/images/ndcwlogo.png')}
              style={{ width: 200, height: 100 }}
              resizeMode="contain"
            />
          </View>

          {/* Heading */}
          <View className="mb-7 items-center">
            <Text className="text-[22px] font-bold text-[#1A1A1A] mb-1 text-center">
              Create an account
            </Text>
            <Text className="text-[13px] text-[#999] text-center">
              Fill in your details to get started
            </Text>
          </View>

          {/* First Name */}
          <View className="mb-4">
            <Text className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-1.5">First Name</Text>
            <TextInput
              className="bg-[#FAFAFA] border border-[#EEEEEE] rounded-lg px-4 py-4 text-[13px] text-[#1A1A1A] min-h-[52px]"
              placeholder="Juan"
              placeholderTextColor="#C4C4C4"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          {/* Last Name */}
          <View className="mb-4">
            <Text className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-1.5">Last Name</Text>
            <TextInput
              className="bg-[#FAFAFA] border border-[#EEEEEE] rounded-lg px-4 py-4 text-[13px] text-[#1A1A1A] min-h-[52px]"
              placeholder="dela Cruz"
              placeholderTextColor="#C4C4C4"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          {/* Email */}
          <View className="mb-4">
            <Text className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-1.5">Email Address</Text>
            <TextInput
              className="bg-[#FAFAFA] border border-[#EEEEEE] rounded-lg px-4 py-4 text-[13px] text-[#1A1A1A] min-h-[52px]"
              placeholder="your.email@example.com"
              placeholderTextColor="#C4C4C4"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View className="mb-7">
            <Text className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-1.5">Password</Text>
            <View className="flex-row items-center bg-[#FAFAFA] border border-[#EEEEEE] rounded-lg px-4 min-h-[52px]">
              <TextInput
                className="flex-1 py-4 text-[13px] text-[#1A1A1A]"
                placeholder="Create a password"
                placeholderTextColor="#C4C4C4"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up button */}
          <TouchableOpacity
            className={`bg-[#F9EF08] rounded-lg py-4 items-center mb-8 min-h-[52px] justify-center ${loading ? 'opacity-60' : ''}`}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text className="text-[14px] font-bold text-[#1A1A00]">
              {loading ? 'Creating account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          {/* Footer */}
          <View className="items-center pb-8">
            <Text className="text-[12px] text-[#999] text-center">
              Already have an account?{' '}
              <Text className="text-[#1A1A1A] font-bold" onPress={handleSignIn}>
                Sign In
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {AlertComponent}
    </SafeAreaView>
  );
}
