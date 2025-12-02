import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { get, getDatabase, ref, update } from 'firebase/database';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditProfile() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const userId = auth.currentUser?.uid;
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
          Alert.alert('Error', 'User data not found');
        }
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  const handleBack = () => router.back();

  const handleSaveChanges = async () => {
    if (!firstName || !lastName) {
      Alert.alert('Validation', 'All fields must be filled');
      return;
    }

    if (!userId) return;

    try {
      await update(ref(db, `users/${userId}`), {
        firstName,
        lastName,
        profileImage: profileImage || '',
      });
      Alert.alert('Success', 'Changes saved successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const handleChangeProfilePicture = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    // Newer versions of expo-image-picker return { canceled: boolean, assets: [{ uri, ... }] }
    // So check `canceled` and read the uri from `assets[0].uri` safely.
    if (!result.canceled && Array.isArray(result.assets) && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-100">
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top']}>
      {/* Header */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between p-4">
          <TouchableOpacity 
            className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center"
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color="#666" />
          </TouchableOpacity>
          
          <Text className="text-xl font-bold text-gray-900">Edit Account</Text>
          <View className="w-10" />
        </View>
      </View>

      {/* Main Content */}
      <ScrollView className="flex-1 p-6">
        {/* Profile Picture */}
        <View className="items-center mb-8">
          <View className="relative">
            <View className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-lg overflow-hidden">
              <Image
                source={profileImage ? { uri: profileImage } : require('../../../../assets/images/profile_placeholder.png')}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            <TouchableOpacity
              className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#F9EF08] rounded-full items-center justify-center shadow-lg"
              onPress={handleChangeProfilePicture}
            >
              <Ionicons name="camera" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Fields */}
        <View className="space-y-6">
          <View>
            <Text className="text-lg font-semibold text-gray-800 mb-3">First Name</Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-xl px-4 py-4 text-lg text-gray-800"
              placeholder="Enter first name"
              placeholderTextColor="#999"
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>

          <View>
            <Text className="text-lg font-semibold text-gray-800 mb-3">Last Name</Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-xl px-4 py-4 text-lg text-gray-800"
              placeholder="Enter last name"
              placeholderTextColor="#999"
              value={lastName}
              onChangeText={setLastName}
            />
            <TouchableOpacity onPress={() => router.push('/forgot-password')}>
              <Text className="text-[#F9EF08] mt-2 font-semibold">Reset Password</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Save Changes Button */}
      <View className="p-6 bg-white border-t border-gray-200">
        <TouchableOpacity
          className="bg-[#F9EF08] rounded-xl py-4 items-center"
          onPress={handleSaveChanges}
        >
          <Text className="text-lg font-bold text-white">Save Changes</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
