import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
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

  const handleSignUp = () => {
    // Handle sign up logic here
    console.log('Sign up pressed');
    console.log('Form data:', { firstName, lastName, email, password });
    
    // TODO: Add validation and API call
    // For now, redirect to login after successful registration
    router.push('/');
  };

  const handleSignIn = () => {
    // Navigate back to login screen
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
            {/* First Name Input */}
            <View className="mb-4">
              <Text className="text-lg font-medium text-gray-800 mb-2">
                First Name
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-5 py-4 text-lg bg-white text-gray-800"
                placeholder="Mel Angelo"
                placeholderTextColor="#999"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {/* Last Name Input */}
            <View className="mb-4">
              <Text className="text-lg font-medium text-gray-800 mb-2">
                Last Name
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-5 py-4 text-lg bg-white text-gray-800"
                placeholder="Cortes"
                placeholderTextColor="#999"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-lg font-medium text-gray-800 mb-2">
                Email Address
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-5 py-4 text-lg bg-white text-gray-800"
                placeholder="angelomelcortes06@gmail.com"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View className="mb-6">
              <Text className="text-lg font-medium text-gray-800 mb-2">
                Password
              </Text>
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

            {/* Sign Up Button */}
            <TouchableOpacity 
              className="bg-[#F9EF08] rounded-xl py-5 items-center mb-6" 
              onPress={handleSignUp}
            >
              <Text className="text-lg font-bold text-white">
                Sign up
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


