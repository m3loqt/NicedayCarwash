import { auth, db } from '@/firebase/firebase';
import { get, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';

export default function AdminDashboardHeader() {
  const [branchName, setBranchName] = useState<string>('P. Mabolo');

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
    <View className="px-4 pt-4 pb-4 flex-row justify-between items-start">
      <View>
        <Text className="text-gray-900 text-3xl font-bold" style={{ fontFamily: 'Inter_700Bold' }}>
          Hello Branch
        </Text>
        <Text className="text-gray-900 text-lg font-normal mt-1" style={{ fontFamily: 'Inter_400Regular' }}>
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

