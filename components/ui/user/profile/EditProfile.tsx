import { useAlert } from '@/hooks/use-alert';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { get, getDatabase, ref, update } from 'firebase/database';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import SuccessModal from './SuccessModal';

export default function EditProfile() {
  const insets = useSafeAreaInsets();
  const { alert, AlertComponent } = useAlert();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  const authInstance = getAuth();
  const userId = authInstance.currentUser?.uid;
  const db = getDatabase();

  useEffect(() => {
    if (!userId) return;

    const fetchUserData = async () => {
      try {
        const snapshot = await get(ref(db, `users/${userId}`));
        if (snapshot.exists()) {
          const data = snapshot.val();
          setFirstName(data.firstName || '');
          setLastName(data.lastName || '');
          setProfileImage(data.profileImage || null);
        } else {
          alert('Error', 'User data not found');
        }
      } catch (err) {
        console.error(err);
        alert('Error', 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  const handleSaveChanges = async () => {
    if (!firstName || !lastName) {
      alert('Validation', 'All fields must be filled');
      return;
    }

    if (!userId) return;

    try {
      await update(ref(db, `users/${userId}`), {
        firstName,
        lastName,
        profileImage: profileImage || '',
      });
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Error', 'Failed to save changes');
    }
  };

  const handleChangeProfilePicture = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled && Array.isArray(result.assets) && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
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
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-6">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="mr-3"
        >
          <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-[#1A1A1A]">Edit Account</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        className="flex-1"
      >
        {/* Profile picture */}
        <View className="items-center mb-8">
          <View className="relative">
            <View className="w-24 h-24 rounded-full bg-[#FAFAFA] overflow-hidden border border-[#EEEEEE]">
              <Image
                source={profileImage ? { uri: profileImage } : require('../../../../assets/images/profile_placeholder.png')}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            <TouchableOpacity
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#F9EF08] rounded-full items-center justify-center border-2 border-white"
              onPress={handleChangeProfilePicture}
            >
              <Ionicons name="camera" size={14} color="#1A1A00" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Form */}
        <View className="px-5">
          <View className="mb-4">
            <Text className="text-[13px] text-[#999] mb-1.5">First Name</Text>
            <TextInput
              className="bg-[#FAFAFA] border border-[#EEEEEE] rounded-2xl px-4 py-4 text-[15px] text-[#1A1A1A]"
              placeholder="Enter first name"
              placeholderTextColor="#BDBDBD"
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>

          <View className="mb-4">
            <Text className="text-[13px] text-[#999] mb-1.5">Last Name</Text>
            <TextInput
              className="bg-[#FAFAFA] border border-[#EEEEEE] rounded-2xl px-4 py-4 text-[15px] text-[#1A1A1A]"
              placeholder="Enter last name"
              placeholderTextColor="#BDBDBD"
              value={lastName}
              onChangeText={setLastName}
            />
          </View>

          <TouchableOpacity
            onPress={() => router.push('/forgot-password' as any)}
            className="mt-1"
          >
            <Text className="text-[13px] font-semibold text-[#999]">Reset Password</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Save button */}
      <View className="px-5 pb-8 pt-3 bg-white">
        <TouchableOpacity
          className="bg-[#F9EF08] rounded-2xl py-4 items-center"
          onPress={handleSaveChanges}
          activeOpacity={0.85}
        >
          <Text className="text-[#1A1A00] text-[15px] font-bold">Save Changes</Text>
        </TouchableOpacity>
      </View>

      <SuccessModal
        visible={showSuccess}
        message="Account saved"
        onDismiss={() => {
          setShowSuccess(false);
          router.back();
        }}
      />
    </SafeAreaView>
  );
}
