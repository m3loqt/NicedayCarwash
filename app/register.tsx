import GoogleAuthButton from '@/components/ui/auth/GoogleAuthButton';
import { useAlert } from '@/hooks/use-alert';
import { getFriendlyAuthErrorMessage } from '@/lib/authErrors';
import { getPasswordPolicyError, PASSWORD_REQUIREMENTS } from '@/lib/passwordPolicy';
import { sanitizeNamePart } from '@/lib/sanitize';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';
import { useState } from 'react';
import {
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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [termsError, setTermsError] = useState('');

  const handleSignUp = async () => {
    const trimmedName = sanitizeNamePart(name);
    const nameParts = trimmedName.split(' ').filter(Boolean);
    const fn = sanitizeNamePart(nameParts[0] || '');
    const ln = sanitizeNamePart(nameParts.slice(1).join(' '));
    const emailNorm = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    let hasError = false;
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setTermsError('');

    if (!fn || !ln) {
      setNameError('Please enter your first and last name');
      hasError = true;
    }
    if (!emailNorm) {
      setEmailError('Please enter your email');
      hasError = true;
    } else if (!emailRegex.test(emailNorm)) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    }
    if (!password) {
      setPasswordError('Please enter a password');
      hasError = true;
    } else {
      const policyError = getPasswordPolicyError(password);
      if (policyError) {
        setPasswordError(policyError);
        hasError = true;
      }
    }
    if (!agreedToTerms) {
      setTermsError('Please agree to the Terms and Conditions');
      hasError = true;
    }
    if (hasError) return;

    setLoading(true);
    const auth = getAuth();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailNorm, password);
      const user = userCredential.user;
      if (user) {
        const userId = user.uid;
        const db = getDatabase();
        const userRef = ref(db, `users/${userId}`);

        const userMap = {
          firstName: fn,
          lastName: ln,
          email: emailNorm,
          role: 'default',
          profileImage: '',
          onboardingCompleted: false,
        };

        await set(userRef, userMap);

        router.replace('/complete-profile');
      }
    } catch (error: any) {
      alert('Couldn\'t create your account', getFriendlyAuthErrorMessage(error, "We couldn't create your account. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push('/');
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
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
          {/* Heading */}
          <View className="mb-9 items-center pt-20">
            <Text className="text-[30px] font-inter-semibold tracking-tight text-[#1A1A1A] mb-1.5 text-center">
              Create an account
            </Text>
            <Text
              className="text-[13px] font-inter-regular tracking-tight text-[#999] text-center"
              style={{ maxWidth: 260 }}
            >
              Fill in your details below or sign up with your social account
            </Text>
          </View>

          {/* Name */}
          <View className="mb-5">
            <Text className="text-[13px] font-inter-medium tracking-tight text-[#374151] mb-1.5">Name</Text>
            <TextInput
              className={`bg-white border rounded-2xl px-4 py-4 text-[14px] font-inter-regular tracking-tight text-[#1A1A1A] min-h-[52px] ${
                nameError ? 'border-[#DC2626]' : 'border-[#EEEEEE]'
              }`}
              placeholder="Ex. Juan dela Cruz"
              placeholderTextColor="#C4C4C4"
              value={name}
              onChangeText={(t) => { setName(t); if (nameError) setNameError(''); }}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {!!nameError && (
              <Text className="text-[12px] font-inter-regular tracking-tight text-[#DC2626] mt-1.5">{nameError}</Text>
            )}
          </View>

          {/* Email */}
          <View className="mb-5">
            <Text className="text-[13px] font-inter-medium tracking-tight text-[#374151] mb-1.5">Email</Text>
            <TextInput
              className={`bg-white border rounded-2xl px-4 py-4 text-[14px] font-inter-regular tracking-tight text-[#1A1A1A] min-h-[52px] ${
                emailError ? 'border-[#DC2626]' : 'border-[#EEEEEE]'
              }`}
              placeholder="your.email@example.com"
              placeholderTextColor="#C4C4C4"
              value={email}
              onChangeText={(t) => { setEmail(t); if (emailError) setEmailError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!!emailError && (
              <Text className="text-[12px] font-inter-regular tracking-tight text-[#DC2626] mt-1.5">{emailError}</Text>
            )}
          </View>

          {/* Password */}
          <View className="mb-6">
            <Text className="text-[13px] font-inter-medium tracking-tight text-[#374151] mb-1.5">Password</Text>
            <View className={`flex-row items-center bg-white border rounded-2xl px-4 min-h-[52px] ${
              passwordError ? 'border-[#DC2626]' : 'border-[#EEEEEE]'
            }`}>
              <TextInput
                className="flex-1 py-4 text-[14px] font-inter-regular tracking-tight text-[#1A1A1A]"
                placeholder="Create a password"
                placeholderTextColor="#C4C4C4"
                value={password}
                onChangeText={(t) => { setPassword(t); if (passwordError) setPasswordError(''); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            {!!passwordError && !password && (
              <Text className="text-[12px] font-inter-regular tracking-tight text-[#DC2626] mt-1.5">{passwordError}</Text>
            )}
            <View className="mt-2 flex-row flex-wrap items-center gap-x-3 gap-y-1">
              {PASSWORD_REQUIREMENTS.map((req) => {
                const met = req.test(password);
                return (
                  <View key={req.key} className="flex-row items-center">
                    <Ionicons
                      name={met ? 'checkmark-circle' : 'ellipse-outline'}
                      size={13}
                      color={met ? '#16A34A' : '#C4C4C4'}
                    />
                    <Text
                      className={`text-[11.5px] tracking-tight ml-1.5 ${
                        met ? 'font-inter-semibold text-[#16A34A]' : 'font-inter-regular text-[#999]'
                      }`}
                    >
                      {req.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Terms checkbox */}
          <View className="mb-7">
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => { setAgreedToTerms(!agreedToTerms); if (termsError) setTermsError(''); }}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className={`w-5 h-5 rounded-md border-2 items-center justify-center mr-2.5 ${
                  agreedToTerms ? 'bg-[#F9EF08] border-[#F9EF08]' : termsError ? 'border-[#DC2626]' : 'border-[#D4D4D4] bg-white'
                }`}
              >
                {agreedToTerms && <Ionicons name="checkmark" size={14} color="#1A1A00" />}
              </TouchableOpacity>
              <Text className="text-[13px] font-inter-regular tracking-tight text-[#666] flex-1">
                I agree to the{' '}
                <Text className="font-inter-bold text-[#1A1A1A] underline" onPress={() => router.push('/terms')}>
                  Terms and Conditions
                </Text>
              </Text>
            </View>
            {!!termsError && (
              <Text className="text-[12px] font-inter-regular tracking-tight text-[#DC2626] mt-1.5 ml-[30px]">{termsError}</Text>
            )}
          </View>

          {/* Sign Up button */}
          <TouchableOpacity
            className={`bg-[#F9EF08] rounded-full py-4 items-center mb-5 min-h-[52px] justify-center ${loading ? 'opacity-60' : ''}`}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text className="text-[15px] font-inter-bold tracking-tight text-[#1A1A00]">
              {loading ? 'Creating account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-px bg-[#F0F0F0]" />
            <Text className="mx-4 text-[12px] font-inter-regular tracking-tight text-[#999]">Or sign up with</Text>
            <View className="flex-1 h-px bg-[#F0F0F0]" />
          </View>

          <View className="mb-8">
            <GoogleAuthButton alert={alert} />
          </View>

          {/* Footer */}
          <View className="items-center pb-8">
            <Text className="text-[13px] font-inter-regular tracking-tight text-[#999] text-center">
              Already have an account?{' '}
              <Text className="text-[#1A1A1A] font-inter-bold underline" onPress={handleSignIn}>
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
