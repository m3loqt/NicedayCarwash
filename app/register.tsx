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
    <SafeAreaView className="flex-1 bg-gray-100">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6">
          {/* Logo Section */}
          <View className="items-center pt-16">
            <Image 
              source={require('../assets/images/ndcwlogo.png')}
              className="w-40 h-24 mb-4"
              resizeMode="contain"
            />
          </View>

          {/* Title Section */}
          <View className="items-center mb-12">
            <Text className="text-3xl font-bold text-gray-800 mb-3 text-center">
              Create your Account
            </Text>
            <Text className="text-lg text-gray-600 text-center">
              Fill out the form to create an account
            </Text>
          </View>

          {/* Form Section */}
          <View className="mb-5">
            <View className="mb-4">
              <Text className="text-lg font-medium text-gray-800 mb-2">First Name</Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-5 py-4 text-lg bg-white text-gray-800"
                placeholder="Firstname"
                placeholderTextColor="#999"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View className="mb-4">
              <Text className="text-lg font-medium text-gray-800 mb-2">Last Name</Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-5 py-4 text-lg bg-white text-gray-800"
                placeholder="Lastname"
                placeholderTextColor="#999"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View className="mb-4">
              <Text className="text-lg font-medium text-gray-800 mb-2">Email Address</Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-5 py-4 text-lg bg-white text-gray-800"
                placeholder="your.email@example.com"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View className="mb-6">
              <Text className="text-lg font-medium text-gray-800 mb-2">Password</Text>
              <View className="flex-row items-center border border-gray-300 rounded-xl bg-white">
                <TextInput
                  className="flex-1 px-5 py-4 text-lg text-gray-800"
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  className="px-5 py-4"
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              className="bg-[#F9EF08] rounded-xl py-5 items-center mb-6"
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text className="text-lg font-bold text-white">
                {loading ? 'Signing Up...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View className="items-center pb-8">
            <Text className="text-lg text-gray-600 text-center">
              Already have an account?{' '}
              <Text className="text-[#F9EF08] font-semibold" onPress={handleSignIn}>
                Sign In
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
