import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import SplashScreen from '../components/SplashScreen';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000); // Show splash screen for 2 seconds

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  const handleSignIn = () => {
    // Handle sign in logic here
    // For now, redirect to user section - you can add logic to determine admin vs user
    console.log('Sign in pressed');
    
    // TODO: Add logic to determine if user is admin or regular user
    // For now, redirecting to user section
    router.push('/user/(tabs)/home');
  };

  const handleGoogleSignIn = () => {
    // Handle Google sign in logic here
    console.log('Google sign in pressed');
  };

  const handleFacebookSignIn = () => {
    // Handle Facebook sign in logic here
    console.log('Facebook sign in pressed');
  };

  const handleSignUp = () => {
    // Navigate to sign up screen
    console.log('Sign up pressed');
    router.push('/register');
  };

  const handleForgotPassword = () => {
    // Navigate to forgot password screen
    console.log('Forgot password pressed');
    router.push('/forgot-password');
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
              Login to your Account
            </Text>
            <Text className="text-lg text-gray-600 text-center">
              Enter your email address and password
            </Text>
          </View>

          {/* Form Section */}
          <View className="mb-5">
            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-lg font-medium text-gray-800 ">
                Email Address
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-5 py-4 text-lg bg-white text-gray-800"
                placeholder="sample@gmail.com"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View className="mb-2">
            <Text className="text-lg font-medium text-gray-800">
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
               <View className="flex-row justify-end mb-3 mt-2">
                 <TouchableOpacity onPress={handleForgotPassword}>
                   <Text className="text-base text-gray-600">
                     Forgot password?
                   </Text>
                 </TouchableOpacity>
               </View>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity 
              className="bg-[#F9EF08] rounded-xl py-5 items-center mt-4 mb-1" 
              onPress={handleSignIn}
            >
              <Text className="text-lg font-bold text-white">
                Sign in
              </Text>
            </TouchableOpacity>

            {/* OR Divider */}
            <View className="flex-row items-center my-4">
              <View className="flex-1 h-px bg-gray-300" />
              <Text className="mx-6 text-base text-gray-600">
                OR
              </Text>
              <View className="flex-1 h-px bg-gray-300" />
            </View>

            {/* Social Login Buttons */}
            <TouchableOpacity 
              className="flex-row items-center justify-center border border-gray-300 rounded-xl py-4 px-5 mb-4 bg-white" 
              onPress={handleGoogleSignIn}
            >
              <Image 
                source={require('../assets/images/googlelogo.png')}
                className="w-6 h-6 mr-3"
                resizeMode="contain"
              />
              <Text className="text-lg text-gray-800">
                Sign up using Google
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              className="flex-row items-center justify-center border border-gray-300 rounded-xl py-4 px-5 mb-6 bg-white" 
              onPress={handleFacebookSignIn}
            >
              <Image 
                source={require('../assets/images/facebooklogo.png')}
                className="w-6 h-6 mr-3"
                resizeMode="contain"
              />
              <Text className="text-lg text-gray-800">
                Sign up using Facebook
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View className="items-center pb-8">
            <Text className="text-lg text-gray-600 text-center">
              Don't have an account yet?{' '}
              <Text className="text-[#F9EF08] font-semibold" onPress={handleSignUp}>
                Sign Up
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}