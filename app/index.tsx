import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as Google from "expo-auth-session/providers/google";
// import * as Facebook from "expo-facebook";

import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword
} from "firebase/auth";
import { auth, db } from "../firebase/firebase";

import { get, ref, set } from "firebase/database";

import OnboardingScreen from '../components/OnboardingScreen';
import SplashScreen from '../components/SplashScreen';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // ---------------- GOOGLE SIGN IN ----------------
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    expoClientId: "YOUR_EXPO_GOOGLE_ID",
    iosClientId: "YOUR_IOS_ID",
    androidClientId: "YOUR_ANDROID_ID",
    webClientId: "YOUR_WEB_CLIENT_ID",
  });

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.authentication.idToken;
      const credential = GoogleAuthProvider.credential(idToken);
      signInWithCredential(auth, credential)
        .then(async (res) => {
          const uid = res.user.uid;

          await set(ref(db, "users/" + uid), {
            email: res.user.email,
            firstName: res.user.displayName?.split(' ')[0] || "",
            lastName: res.user.displayName?.split(' ')[1] || "",
            role: "default"
          });

          await AsyncStorage.setItem("role", "default");
          await AsyncStorage.setItem("uid", uid);

          router.replace("/user/(tabs)/home");
        })
        .catch((err) => Alert.alert("Google Login Error", err.message));
    }
  }, [googleResponse]);

  // ---------------- ONBOARDING + SPLASH ----------------
  useEffect(() => {
    const checkOnboarding = async () => {
      const seen = await AsyncStorage.getItem("hasSeenOnboarding");
      setTimeout(() => {
        setShowSplash(false);
        if (seen !== "true") setShowOnboarding(true);
      }, 2000);
    };
    checkOnboarding();
  }, []);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem("hasSeenOnboarding", "true");
    setShowOnboarding(false);
  };

  if (showSplash) return <SplashScreen />;
  if (showOnboarding) return <OnboardingScreen onComplete={handleOnboardingComplete} />;

  // ---------------- NORMAL EMAIL LOGIN ----------------
  const handleSignIn = async () => {
    if (!email || !password) {
      return Alert.alert("Missing Info", "Please enter email and password");
    }

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const uid = result.user.uid;

      const snapshot = await get(ref(db, "users/" + uid));
      if (!snapshot.exists()) {
        return Alert.alert("Error", "User data not found.");
      }

      const role = snapshot.val().role || "default";

      await AsyncStorage.setItem("uid", uid);
      await AsyncStorage.setItem("role", role);

      if (role === "admin") {
        router.replace("/admin/(tabs)/dashboard");
      } else {
        router.replace("/user/(tabs)/home");
      }

    } catch (e) {
      Alert.alert("Login Failed", e.message);
    }
  };

  // ---------------- FACEBOOK SIGN IN ----------------
  // const handleFacebookSignIn = async () => {
  //   try {
  //     await Facebook.initializeAsync({ appId: "YOUR_FACEBOOK_APPID" });

  //     const result = await Facebook.logInWithReadPermissionsAsync({
  //       permissions: ["public_profile", "email"],
  //     });

  //     if (result.type === "success") {
  //       const credential = FacebookAuthProvider.credential(result.token);

  //       const res = await signInWithCredential(auth, credential);
  //       const uid = res.user.uid;

  //       await set(ref(db, "users/" + uid), {
  //         email: res.user.email,
  //         firstName: res.user.displayName?.split(" ")[0] || "",
  //         lastName: res.user.displayName?.split(" ")[1] || "",
  //         role: "default",
  //       });

  //       await AsyncStorage.setItem("uid", uid);
  //       await AsyncStorage.setItem("role", "default");

  //       router.replace("/user/(tabs)/home");
  //     }
  //   } catch (e) {
  //     Alert.alert("Facebook Login Failed", e.message);
  //   }
  // };

  // ------------------------------- UI (UNCHANGED) -------------------------------

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6">

          <View className="items-center pt-16">
            <Image source={require('../assets/images/ndcwlogo.png')}
              className="w-40 h-24 mb-4" resizeMode="contain" />
          </View>

          <View className="items-center mb-12">
            <Text className="text-3xl font-bold text-gray-800 mb-3 text-center">
              Login to your Account
            </Text>
            <Text className="text-lg text-gray-600 text-center">
              Enter your email address and password
            </Text>
          </View>

          <View className="mb-5">

            <View className="mb-4">
              <Text className="text-lg font-medium text-gray-800">Email Address</Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-5 py-4 text-lg bg-white text-gray-800"
                placeholder="sample@gmail.com"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
            </View>

            <View className="mb-2">
              <Text className="text-lg font-medium text-gray-800">Password</Text>
              <View className="flex-row items-center border border-gray-300 rounded-xl bg-white">
                <TextInput
                  className="flex-1 px-5 py-4 text-lg text-gray-800"
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity className="px-5 py-4"
                  onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              <View className="flex-row justify-end mb-3 mt-2">
                <TouchableOpacity onPress={() => router.push("/forgot-password")}>
                  <Text className="text-base text-gray-600">Forgot password?</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              className="bg-[#F9EF08] rounded-xl py-5 items-center mt-4 mb-1"
              onPress={handleSignIn}
            >
              <Text className="text-lg font-bold text-white">Sign in</Text>
            </TouchableOpacity>

            <View className="flex-row items-center my-4">
              <View className="flex-1 h-px bg-gray-300" />
              <Text className="mx-6 text-base text-gray-600">OR</Text>
              <View className="flex-1 h-px bg-gray-300" />
            </View>

            <TouchableOpacity
              className="flex-row items-center justify-center border border-gray-300 rounded-xl py-4 px-5 mb-4 bg-white"
              onPress={() => googlePromptAsync()}
            >
              <Image source={require('../assets/images/googlelogo.png')}
                className="w-6 h-6 mr-3" resizeMode="contain" />
              <Text className="text-lg text-gray-800">Sign up using Google</Text>
            </TouchableOpacity>

            {/* Facebook */}
            {/* <TouchableOpacity
              className="flex-row items-center justify-center border border-gray-300 rounded-xl py-4 px-5 mb-6 bg-white"
              onPress={handleFacebookSignIn}
            >
              <Image source={require('../assets/images/facebooklogo.png')}
                className="w-6 h-6 mr-3" resizeMode="contain" />
              <Text className="text-lg text-gray-800">Sign up using Facebook</Text>
            </TouchableOpacity> */}
          </View>

          <View className="items-center pb-8">
            <Text className="text-lg text-gray-600 text-center">
              Don't have an account yet?{' '}
              <Text className="text-[#F9EF08] font-semibold" onPress={() => router.push("/register")}>
                Sign Up
              </Text>
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
