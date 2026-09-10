import { useAlert } from '@/hooks/use-alert';
import { sanitizeNamePart } from '@/lib/sanitize';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { get, getDatabase, ref, update } from 'firebase/database';
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

export default function CompleteProfileScreen() {
  const { alert, AlertComponent } = useAlert();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  const db = getDatabase();

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const snapshot = await get(ref(db, `users/${userId}`));
      if (snapshot.exists()) {
        const data = snapshot.val();
        setName(`${data.firstName || ''} ${data.lastName || ''}`.trim());
      }
      setLoading(false);
    })();
  }, [userId]);

  const handleCompleteProfile = async () => {
    const trimmedName = sanitizeNamePart(name);
    const nameParts = trimmedName.split(' ').filter(Boolean);
    const fn = sanitizeNamePart(nameParts[0] || '');
    const ln = sanitizeNamePart(nameParts.slice(1).join(' '));
    const trimmedPhone = phone.trim();

    setNameError('');
    setPhoneError('');
    let hasError = false;
    if (!fn || !ln) {
      setNameError('Please enter your first and last name');
      hasError = true;
    }
    if (!trimmedPhone) {
      setPhoneError('Please enter your phone number');
      hasError = true;
    }
    if (hasError) return;
    if (!userId) return;

    setSaving(true);
    try {
      await update(ref(db, `users/${userId}`), {
        firstName: fn,
        lastName: ln,
        phone: trimmedPhone,
        countryCode: '+63',
      });
      router.replace('/enable-location');
    } catch {
      alert('Error', 'Failed to save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="small" color="#1A1A1A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          className="px-6"
          showsVerticalScrollIndicator={false}
        >
          {/* Heading */}
          <View className="mb-9 items-center pt-16">
            <Text className="text-[26px] font-inter-semibold tracking-tight text-[#1A1A1A] mb-1.5 text-center">
              Complete Your Profile
            </Text>
            <Text
              className="text-[13px] font-inter-regular tracking-tight text-[#999] text-center"
              style={{ maxWidth: 280 }}
            >
              Don&apos;t worry, only you can see your personal data. No one else will be able to see it.
            </Text>
          </View>

          {/* Avatar — decorative only; customers don't set a profile picture */}
          <View className="items-center mb-8">
            <View className="w-24 h-24 rounded-full bg-[#FAFAFA] overflow-hidden border border-[#EEEEEE]">
              <Image
                source={require('../assets/images/profile_placeholder.png')}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
          </View>

          {/* Name */}
          <View className="mb-5">
            <Text className="text-[13px] font-inter-medium tracking-tight text-[#374151] mb-1.5">Name</Text>
            <TextInput
              className={`bg-[#FAFAFA] border rounded-2xl px-4 py-4 text-[14px] font-inter-regular tracking-tight text-[#1A1A1A] min-h-[52px] ${
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

          {/* Phone Number */}
          <View className="mb-8">
            <Text className="text-[13px] font-inter-medium tracking-tight text-[#374151] mb-1.5">Phone Number</Text>
            <View className={`flex-row items-center bg-[#FAFAFA] border rounded-2xl min-h-[52px] overflow-hidden ${
              phoneError ? 'border-[#DC2626]' : 'border-[#EEEEEE]'
            }`}>
              <View className="flex-row items-center px-4 h-full border-r border-[#EEEEEE]">
                <Text className="text-[14px] font-inter-medium tracking-tight text-[#1A1A1A]">+63</Text>
              </View>
              <TextInput
                className="flex-1 px-4 py-4 text-[14px] font-inter-regular tracking-tight text-[#1A1A1A]"
                placeholder="Enter Phone Number"
                placeholderTextColor="#C4C4C4"
                value={phone}
                onChangeText={(t) => { setPhone(t.replace(/[^0-9]/g, '')); if (phoneError) setPhoneError(''); }}
                keyboardType="phone-pad"
              />
            </View>
            {!!phoneError && (
              <Text className="text-[12px] font-inter-regular tracking-tight text-[#DC2626] mt-1.5">{phoneError}</Text>
            )}
          </View>

          {/* Complete Profile button */}
          <TouchableOpacity
            className={`bg-[#F9EF08] rounded-full py-4 items-center mb-5 min-h-[52px] justify-center ${saving ? 'opacity-60' : ''}`}
            onPress={handleCompleteProfile}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text className="text-[15px] font-inter-bold tracking-tight text-[#1A1A00]">
              {saving ? 'Saving...' : 'Complete Profile'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      {AlertComponent}
    </SafeAreaView>
  );
}
