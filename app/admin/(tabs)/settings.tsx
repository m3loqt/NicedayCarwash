import { AdminAccountInfo, TransactionSummaryCard } from '@/components/ui/admin/profile';
import { auth, db } from '@/firebase/firebase';
import { useAlert } from '@/hooks/use-alert';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { get, onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type AdminData = {
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string;
};

export default function AdminSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { alert, AlertComponent } = useAlert();
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
        console.error('Error fetching admin data:', error);
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
      alert('Logout', 'Are you sure you want to sign out?', [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            // Preserve onboarding status before clearing storage
            const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
            await auth.signOut();
            await AsyncStorage.clear();
            // Restore onboarding status after clearing
            if (hasSeenOnboarding === 'true') {
              await AsyncStorage.setItem('hasSeenOnboarding', 'true');
            }
            router.replace('/');
          },
        },
      ]);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: '#F5F5F5' }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: '#F5F5F5' }} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />

        {/* Header */}
        <View className="flex flex-row items-center p-4 bg-white border-b border-gray-200" style={{ marginTop: -insets.top, paddingTop: insets.top + 16 }}>
          <View className="w-8" />
          <Text className="flex-1 text-center text-2xl font-semibold text-[#1E1E1E]">Account</Text>
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
        <View className="mx-6 mt-4">
          <TouchableOpacity
            className="bg-white rounded-lg p-4 flex flex-row items-center shadow-md"
            onPress={handleSignOut}
          >
            <Ionicons name="log-out" size={24} color="#1E1E1E" style={{ marginRight: 12 }} />
            <Text className="text-lg text-[#1E1E1E]">Sign Out</Text>
          </TouchableOpacity>
        </View>
        {AlertComponent}
      </SafeAreaView>
    </View>
  );
}
