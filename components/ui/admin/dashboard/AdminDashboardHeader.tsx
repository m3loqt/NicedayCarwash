import { auth, db } from '@/firebase/firebase';
import { get, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminDashboardHeader() {
  const [branchName, setBranchName] = useState<string>('P. Mabolo');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchAdminBranch = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      try {
        const userSnapshot = await get(ref(db, `users/${uid}`));
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          const adminBranchId = userData.branchId || userData.branch;

          if (adminBranchId) {
            const branchSnapshot = await get(ref(db, `Branches/${adminBranchId}/profile`));
            if (branchSnapshot.exists()) {
              const branchData = branchSnapshot.val();
              setBranchName(branchData.name || 'P. Mabolo');
            }
          }
        }
      } catch (error) {
        console.error('Error fetching admin branch:', error);
      }
    };

    fetchAdminBranch();
  }, []);

  return (
    <View className="bg-white px-6 pb-4 mb-4 flex-row justify-between items-start" style={{ marginTop: -insets.top, paddingTop: insets.top + 24 }}>
      <View>
        <Text className="text-gray-900 text-2xl font-semibold" style={{ fontFamily: 'Inter_700Bold' }}>
          Hello Branch
        </Text>
        <Text className="text-gray-900 text-lg font-semibold mt-1" style={{ fontFamily: 'Inter_600SemiBold' }}>
          {branchName}
        </Text>
      </View>
      <Image
        source={require('../../../../assets/images/ndcwlogo.png')}
        className="w-28 h-14"
        resizeMode="contain"
      />
    </View>
  );
}

