import AuthShell from '@/components/auth/AuthShell';
import FieldError, { ERROR_COLOR } from '@/components/ui/common/FieldError';
import ErrorSheet from '@/components/ui/ErrorSheet';
import TextLink from '@/components/ui/common/TextLink';
import { getAuthErrorHandling } from '@/lib/authErrors';
import { getEmailError } from '@/lib/authValidation';
import { getPasswordPolicyError, PASSWORD_REQUIREMENTS } from '@/lib/passwordPolicy';
import { sanitizeNamePart } from '@/lib/sanitize';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';
import { useState } from 'react';
import { AppButton } from '@/components/ui/common/AppButton';
import { AccessibilityInfo, ActivityIndicator, Text, TextInput, View } from 'react-native';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [termsError, setTermsError] = useState('');
  // Shows a "Sign in instead" link under the email field specifically for the
  // already-registered case, without needing its own separate error string.
  const [emailTaken, setEmailTaken] = useState(false);
  // Re-validate as the user edits only after their first submit attempt, not before.
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [errorSheet, setErrorSheet] = useState<{ visible: boolean; isNetwork: boolean }>({
    visible: false,
    isNetwork: false,
  });

  const getNameError = (value: string): string | null => {
    const trimmed = sanitizeNamePart(value);
    const parts = trimmed.split(' ').filter(Boolean);
    const fn = sanitizeNamePart(parts[0] || '');
    const ln = sanitizeNamePart(parts.slice(1).join(' '));
    return fn && ln ? null : 'Enter your name.';
  };

  const handleNameChange = (t: string) => {
    setName(t);
    if (hasAttemptedSubmit) setNameError(getNameError(t) || '');
  };

  const handleEmailChange = (t: string) => {
    setEmail(t);
    if (emailTaken) setEmailTaken(false);
    if (hasAttemptedSubmit) setEmailError(getEmailError(t) || '');
  };

  const handlePasswordChange = (t: string) => {
    setPassword(t);
    if (hasAttemptedSubmit) setPasswordError(getPasswordPolicyError(t) || '');
  };

  const handleToggleTerms = () => {
    const next = !agreedToTerms;
    setAgreedToTerms(next);
    if (next) setTermsError('');
  };

  const handleSignUp = async () => {
    if (loading) return;

    const trimmedName = sanitizeNamePart(name);
    const nameParts = trimmedName.split(' ').filter(Boolean);
    const fn = sanitizeNamePart(nameParts[0] || '');
    const ln = sanitizeNamePart(nameParts.slice(1).join(' '));
    const emailNorm = email.trim().toLowerCase();

    setHasAttemptedSubmit(true);
    setEmailTaken(false);

    const nameErr = getNameError(name);
    const emailErr = getEmailError(email);
    const passwordErr = getPasswordPolicyError(password);
    const termsErr = agreedToTerms ? '' : 'Please agree to the Terms and Conditions to continue.';

    setNameError(nameErr || '');
    setEmailError(emailErr || '');
    setPasswordError(passwordErr || '');
    setTermsError(termsErr);

    const firstError = nameErr || emailErr || passwordErr || termsErr;
    if (firstError) {
      AccessibilityInfo.announceForAccessibility(firstError);
      return;
    }

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
      setLoading(false);
      const handling = getAuthErrorHandling(error, 'signup');
      if (handling.kind === 'field') {
        if (handling.field === 'email') {
          setEmailError(handling.message);
          setEmailTaken(true);
        } else {
          setPasswordError(handling.message);
        }
        AccessibilityInfo.announceForAccessibility(handling.message);
      } else if (handling.kind === 'banner') {
        // Not expected from account creation, but handled for completeness - surfaced the same
        // way Sign In shows it rather than silently falling through.
        AccessibilityInfo.announceForAccessibility(handling.message);
        setErrorSheet({ visible: true, isNetwork: false });
      } else {
        setErrorSheet({ visible: true, isNetwork: handling.isNetwork });
      }
    }
  };

  const handleSignIn = () => {
    router.push('/');
  };

  const handleSignInInstead = () => {
    router.push({ pathname: '/', params: { email: email.trim().toLowerCase() } });
  };

  const nameErrored = !!nameError;
  const emailErrored = !!emailError;

  return (
    <>
      <AuthShell headerHeightRatio={0.3} minHeaderHeight={200}>
        {/* Heading */}
        <View className="mb-8 items-center">
          <Text className="text-[26px] font-inter-semibold tracking-tight text-[#1A1A1A] mb-1.5 text-center">
            Get started
          </Text>
          <Text
            className="text-[13px] font-inter-regular tracking-tight text-[#999] text-center"
            style={{ maxWidth: 280 }}
          >
            Book washes and skip the line
          </Text>
        </View>

        {/* Name */}
        <View className="mb-6">
          <Text className="text-[13px] font-inter-medium tracking-tight text-[#1A1A1A] mb-1.5">Name</Text>
          <TextInput
            className={`bg-white border rounded-2xl px-4 py-4 text-[14px] font-inter-regular tracking-tight text-[#1A1A1A] min-h-[52px] ${
              nameErrored ? 'border-[1.5px]' : 'border'
            } ${nameErrored ? '' : nameFocused ? 'border-[#9CA3AF]' : 'border-[#E0E0E0]'}`}
            style={nameErrored ? { borderColor: ERROR_COLOR } : undefined}
            placeholder="Ex. Juan dela Cruz"
            placeholderTextColor="#C4C4C4"
            value={name}
            onChangeText={handleNameChange}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!loading}
            accessibilityLabel={nameError ? `Name, error: ${nameError}` : 'Name'}
          />
          <FieldError message={nameError} />
        </View>

        {/* Email */}
        <View className="mb-6">
          <Text className="text-[13px] font-inter-medium tracking-tight text-[#1A1A1A] mb-1.5">Email</Text>
          <TextInput
            className={`bg-white border rounded-2xl px-4 py-4 text-[14px] font-inter-regular tracking-tight text-[#1A1A1A] min-h-[52px] ${
              emailErrored ? 'border-[1.5px]' : 'border'
            } ${emailErrored ? '' : emailFocused ? 'border-[#9CA3AF]' : 'border-[#E0E0E0]'}`}
            style={emailErrored ? { borderColor: ERROR_COLOR } : undefined}
            placeholder="name@email.com"
            placeholderTextColor="#C4C4C4"
            value={email}
            onChangeText={handleEmailChange}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            accessibilityLabel={emailError ? `Email, error: ${emailError}` : 'Email'}
          />
          <FieldError message={emailError} />
          {emailTaken && (
            <AppButton onPress={handleSignInInstead} className="mt-1.5" hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
              <TextLink className="text-[13px]">Sign in instead</TextLink>
            </AppButton>
          )}
        </View>

        {/* Password */}
        <View className="mb-7">
          <Text className="text-[13px] font-inter-medium tracking-tight text-[#1A1A1A] mb-1.5">Password</Text>
          <View
            className={`flex-row items-center bg-white border rounded-2xl px-4 min-h-[52px] ${
              passwordError ? 'border-[1.5px]' : 'border'
            } ${passwordError ? '' : passwordFocused ? 'border-[#9CA3AF]' : 'border-[#E0E0E0]'}`}
            style={passwordError ? { borderColor: ERROR_COLOR } : undefined}
          >
            <TextInput
              className="flex-1 py-4 text-[14px] font-inter-regular tracking-tight text-[#1A1A1A]"
              placeholder="Create a password"
              placeholderTextColor="#C4C4C4"
              value={password}
              onChangeText={handlePasswordChange}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              accessibilityLabel={passwordError ? `Password, error: ${passwordError}` : 'Password'}
            />
            <AppButton onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
            </AppButton>
          </View>
          {/* Stacked (not wrapped) so each requirement gets its own line, however narrow the screen.
              Unmet requirements switch to the error color once the user has tried to submit -
              gray beforehand just reads as "not yet met", not as a blocking error. */}
          <View className="mt-2.5" style={{ gap: 4 }}>
            {PASSWORD_REQUIREMENTS.map((req) => {
              const met = req.test(password);
              const showAsError = hasAttemptedSubmit && !met;
              return (
                <View key={req.key} className="flex-row items-center">
                  <Ionicons
                    name={met ? 'checkmark-circle' : showAsError ? 'alert-circle' : 'ellipse-outline'}
                    size={13}
                    color={met ? '#4CAF50' : showAsError ? ERROR_COLOR : '#C4C4C4'}
                  />
                  <Text
                    className={`text-[11.5px] tracking-tight ml-1.5 ${
                      met ? 'font-inter-semibold text-[#1A1A1A]' : 'font-inter-regular'
                    }`}
                    style={!met ? { color: showAsError ? ERROR_COLOR : '#999' } : undefined}
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
            <AppButton
              onPress={handleToggleTerms}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className={`w-5 h-5 rounded-md border-2 items-center justify-center mr-2.5 ${
                agreedToTerms ? 'bg-[#F9EF08] border-[#F9EF08]' : 'bg-white'
              }`}
              style={!agreedToTerms && termsError ? { borderColor: ERROR_COLOR } : !agreedToTerms ? { borderColor: '#D0D0D0' } : undefined}
            >
              {agreedToTerms && <Ionicons name="checkmark" size={14} color="#1A1A00" />}
            </AppButton>
            <Text className="text-[13px] font-inter-regular tracking-tight text-[#666] flex-1">
              I agree to the{' '}
              <TextLink className="text-[13px]" onPress={() => router.push('/terms')}>
                Terms and Conditions
              </TextLink>
            </Text>
          </View>
          {!!termsError && (
            <View className="ml-[30px]">
              <FieldError message={termsError} />
            </View>
          )}
        </View>

        {/* Sign Up button */}
        <AppButton
          className={`bg-[#F9EF08] rounded-full py-4 items-center mb-8 min-h-[52px] justify-center ${loading ? 'opacity-60' : ''}`}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#1A1A00" />
          ) : (
            <Text className="text-[15px] font-inter-bold tracking-tight text-[#1A1A00]">Sign Up</Text>
          )}
        </AppButton>

        {/* Google sign-in is intentionally not offered here - re-add <GoogleAuthButton alert={...} />
            (its own useAlert() - this screen no longer keeps one around) with its "Or sign up
            with" divider once Google auth is actually enabled. */}

        {/* Footer */}
        <View className="items-center pb-8">
          <Text className="text-[13px] font-inter-regular tracking-tight text-[#999] text-center">
            Already have an account?{' '}
            <TextLink className="text-[13px]" onPress={handleSignIn}>
              Sign In
            </TextLink>
          </Text>
        </View>
      </AuthShell>

      <ErrorSheet
        visible={errorSheet.visible}
        title="Something went wrong"
        message={
          errorSheet.isNetwork
            ? "We couldn't connect. Check your internet connection and try again."
            : "We couldn't create your account just now. Please try again."
        }
        onPrimaryPress={handleSignUp}
        onClose={() => setErrorSheet({ visible: false, isNetwork: false })}
      />
    </>
  );
}
