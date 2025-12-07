import { AdminAccountInfo, TransactionSummaryCard } from '@/components/ui/admin/profile';
import { auth, db } from '@/firebase/firebase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { get, onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Alert, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AdminData = {
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string;
};

export default function AdminSettingsScreen() {
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);
  const [branchId, setBranchId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      try {
        const snapshot = await get(ref(db, `users/${uid}`));
        if (snapshot.exists()) {
          const data = snapshot.val();
          setAdmin({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || '',
            profileImage: data.profileImage,
          });
          const adminBranchId = data.branchId || data.branch;
          if (adminBranchId) {
            setBranchId(adminBranchId);
          }
        }
      } catch (error) {
        console.log('Error fetching admin data:', error);
      }
    };

    fetchAdminData();
  }, []);

  useEffect(() => {
    if (!branchId) return;

    const bookingsRef = ref(db, `Reservations/ReservationsByBranch/${branchId}`);

    const unsubscribe = onValue(bookingsRef, (snapshot) => {
      let total = 0;
      snapshot.forEach((dateSnap) => {
        dateSnap.forEach(() => {
          total++;
        });
      });
      setTotalTransactions(total);
    });

    return () => unsubscribe();
  }, [branchId]);

  const handleEditAccount = () => {
    router.push('/admin/edit-profile');
  };

  const handleSignOut = async () => {
    try {
      Alert.alert('Logout', 'Are you sure you want to sign out?', [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await auth.signOut();
            await AsyncStorage.clear();
            router.replace('/');
          },
        },
      ]);
    } catch (error) {
      console.log('Error signing out:', error);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: 'white' }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: 'white' }} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />

        {/* Header */}
        <View className="flex flex-row items-center p-4 bg-white border-b border-gray-200">
          <TouchableOpacity className="p-2 rounded-full border border-gray-300">
            <Ionicons name="arrow-back" size={24} color="#1E1E1E" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-xl font-bold text-[#1E1E1E]">Account</Text>
          <View className="w-8" />
        </View>

        {/* Transaction Summary Card */}
        <TransactionSummaryCard totalTransactions={totalTransactions} />

        {/* Admin Account Info */}
        {admin && (
          <AdminAccountInfo
            firstName={admin.firstName}
            lastName={admin.lastName}
            email={admin.email}
            profileImage={admin.profileImage}
            onEditAccount={handleEditAccount}
          />
        )}

        {/* Sign Out Section */}
        <TouchableOpacity
          className="bg-white rounded-lg mx-4 mt-4 p-4 flex flex-row items-center"
          onPress={handleSignOut}
        >
          <Ionicons name="log-out" size={24} color="#1E1E1E" className="mr-3" />
          <Text className="text-lg text-[#1E1E1E]">Sign Out</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}
