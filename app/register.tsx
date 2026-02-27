import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!firstName || !lastName || !email || !password) {
      Alert.alert('Error', 'Please fill out all fields.');
      return;
    }

    setLoading(true);
    const auth = getAuth();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      if (user) {
        const userId = user.uid;
        const db = getDatabase();
        const userRef = ref(db, `users/${userId}`);

        const userMap = {
          firstName,
          lastName,
          email,
          role: 'default',
          profileImage: '',
        };

        await set(userRef, userMap);

        Alert.alert('Success', 'Registration successful.', [
          { text: 'OK', onPress: () => router.push('/') },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Something went wrong.');
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
          {/* Back + Logo */}
          <View className="pt-4 mb-6">
            <TouchableOpacity onPress={handleSignIn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mb-6">
              <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
            </TouchableOpacity>
            <Image
              source={require('../assets/images/ndcwlogo.png')}
              style={{ width: 100, height: 50 }}
              resizeMode="contain"
            />
          </View>

          {/* Heading */}
          <View className="mb-7">
            <Text className="text-[22px] font-bold text-[#1A1A1A] mb-1">
              Create an account
            </Text>
            <Text className="text-[13px] text-[#999]">
              Fill in your details to get started
            </Text>
          </View>

          {/* First Name */}
          <View className="mb-4">
            <Text className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-1.5">First Name</Text>
            <TextInput
              className="bg-[#FAFAFA] border border-[#EEEEEE] rounded-2xl px-4 py-3.5 text-[13px] text-[#1A1A1A]"
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
              className="bg-[#FAFAFA] border border-[#EEEEEE] rounded-2xl px-4 py-3.5 text-[13px] text-[#1A1A1A]"
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
              className="bg-[#FAFAFA] border border-[#EEEEEE] rounded-2xl px-4 py-3.5 text-[13px] text-[#1A1A1A]"
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
            <View className="flex-row items-center bg-[#FAFAFA] border border-[#EEEEEE] rounded-2xl px-4">
              <TextInput
                className="flex-1 py-3.5 text-[13px] text-[#1A1A1A]"
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
            className={`bg-[#F9EF08] rounded-2xl py-3.5 items-center mb-8 ${loading ? 'opacity-60' : ''}`}
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
    </SafeAreaView>
  );
}
