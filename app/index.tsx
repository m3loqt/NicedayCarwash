import { useAlert } from '@/hooks/use-alert';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

import * as Google from "expo-auth-session/providers/google";
// import * as Facebook from "expo-facebook";

import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword
} from "firebase/auth";
import { auth, db } from "../firebase/firebase";

import { get, ref, set, update } from "firebase/database";

import OnboardingScreen from '../components/OnboardingScreen';
import SplashScreen from '../components/SplashScreen';

export default function LoginScreen() {
  const { alert, AlertComponent } = useAlert();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // ---------------- GOOGLE SIGN IN ----------------
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    expoClientId: "YOUR_EXPO_GOOGLE_ID",
    iosClientId: "YOUR_IOS_ID",
    androidClientId: "YOUR_ANDROID_ID",
    webClientId: "YOUR_WEB_CLIENT_ID",
  });

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.authentication?.idToken;
      if (!idToken) return;
      const credential = GoogleAuthProvider.credential(idToken);
      signInWithCredential(auth, credential)
        .then(async (res) => {
          const uid = res.user.uid;
          const userRef = ref(db, "users/" + uid);
          const snapshot = await get(userRef);

          let role = "default";
          if (snapshot.exists()) {
            // Existing user: only update non-role fields to preserve their role
            role = snapshot.val().role || "default";
            await update(userRef, {
              email: res.user.email,
              firstName: res.user.displayName?.split(' ')[0] || "",
              lastName: res.user.displayName?.split(' ')[1] || "",
            });
          } else {
            // New user: create with default role
            await set(userRef, {
              email: res.user.email,
              firstName: res.user.displayName?.split(' ')[0] || "",
              lastName: res.user.displayName?.split(' ')[1] || "",
              role: "default",
            });
          }

          await AsyncStorage.setItem("role", role);
          await AsyncStorage.setItem("uid", uid);

          if (role === "admin") {
            router.replace("/admin/(tabs)/dashboard");
          } else {
            router.replace("/user/(tabs)/home");
          }
        })
        .catch((err) => alert("Google Login Error", err.message));
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
    if (isSigningIn) return;

    if (!email || !password) {
      return alert("Missing Info", "Please enter email and password");
    }

    setIsSigningIn(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = result.user.uid;

      const snapshot = await get(ref(db, "users/" + uid));
      if (!snapshot.exists()) {
        alert("Error", "User data not found.");
        setIsSigningIn(false);
        return;
      }

      const role = snapshot.val().role || "default";

      await AsyncStorage.setItem("uid", uid);
      await AsyncStorage.setItem("role", role);

      if (role === "admin") {
        router.replace("/admin/(tabs)/dashboard");
      } else {
        router.replace("/user/(tabs)/home");
      }

    } catch (e: any) {
      alert("Login Failed", e.message);
    } finally {
      setIsSigningIn(false);
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
          <View className="items-center pt-12 -mb-2">
            <Image
              source={require('../assets/images/ndcwlogo.png')}
              style={{ width: 200, height: 100 }}
              resizeMode="contain"
            />
          </View>

          {/* Heading */}
          <View className="mb-7 items-center">
            <Text className="text-[22px] font-bold text-[#1A1A1A] mb-1 text-center">
              Welcome back
            </Text>
            <Text className="text-[13px] text-[#999] text-center">
              Sign in to continue
            </Text>
          </View>

          {/* Fields */}
          <View className="mb-4">
            <Text className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-1.5">
              Email Address
            </Text>
            <TextInput
              className="bg-[#FAFAFA] border border-[#EEEEEE] rounded-lg px-4 py-4 text-[13px] text-[#1A1A1A] min-h-[52px]"
              placeholder="sample@gmail.com"
              placeholderTextColor="#C4C4C4"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View className="mb-2">
            <Text className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-1.5">
              Password
            </Text>
            <View className="flex-row items-center bg-[#FAFAFA] border border-[#EEEEEE] rounded-lg px-4 min-h-[52px]">
              <TextInput
                className="flex-1 py-4 text-[13px] text-[#1A1A1A]"
                placeholder="Enter your password"
                placeholderTextColor="#C4C4C4"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row justify-end mb-6">
            <TouchableOpacity onPress={() => router.push("/forgot-password")}>
              <Text className="text-[12px] text-[#999]">Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Sign in button */}
          <TouchableOpacity
            className={`bg-[#F9EF08] rounded-lg py-4 items-center mb-4 min-h-[52px] justify-center ${isSigningIn ? 'opacity-60' : ''}`}
            onPress={handleSignIn}
            disabled={isSigningIn}
            activeOpacity={0.85}
          >
            {isSigningIn ? (
              <ActivityIndicator size="small" color="#1A1A00" />
            ) : (
              <Text className="text-[14px] font-bold text-[#1A1A00]">Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center my-4">
            <View className="flex-1 h-px bg-[#F0F0F0]" />
            <Text className="mx-4 text-[11px] text-[#C4C4C4] uppercase tracking-widest">or</Text>
            <View className="flex-1 h-px bg-[#F0F0F0]" />
          </View>

          {/* Google */}
          <TouchableOpacity
            className="flex-row items-center justify-center bg-[#FAFAFA] border border-[#EEEEEE] rounded-lg py-4 px-4 mb-8 min-h-[52px]"
            onPress={() => googlePromptAsync()}
            activeOpacity={0.85}
          >
            <Image source={require('../assets/images/googlelogo.png')} style={{ width: 18, height: 18, marginRight: 10 }} resizeMode="contain" />
            <Text className="text-[13px] text-[#1A1A1A] font-medium">Continue with Google</Text>
          </TouchableOpacity>


          {/* Footer */}
          <View className="items-center pb-8">
            <Text className="text-[12px] text-[#999] text-center">
              Don't have an account?{' '}
              <Text className="text-[#1A1A1A] font-bold" onPress={() => router.push("/register")}>
                Sign Up
              </Text>
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
      {AlertComponent}
    </SafeAreaView>
  );
}
