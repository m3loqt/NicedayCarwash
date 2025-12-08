import { auth, db } from "@/firebase/firebase";
import { get, onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import AvailabilityModal from "./AvailabilityModal";

interface Addon {
  id: string;
  name: string;
  price: number;
  isAvailable?: boolean;
}

export default function AddOns() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAddonId, setSelectedAddonId] = useState<string | null>(null);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState<string | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    let unsubscribeAddons: (() => void) | null = null;

    // First, get the branchId
    const getUserBranchId = async () => {
      try {
        const userSnapshot = await get(ref(db, `users/${uid}`));
        if (!userSnapshot.exists()) {
          setLoading(false);
          return;
        }

        const userData = userSnapshot.val();
        const fetchedBranchId = userData.branchId || userData.branch;
        if (!fetchedBranchId) {
          setLoading(false);
          return;
        }

        setBranchId(fetchedBranchId);

        // Set up real-time listener for addons
        const addonsRef = ref(db, `Branches/${fetchedBranchId}/AddOns`);
        
        unsubscribeAddons = onValue(addonsRef, (snapshot) => {
          setLoading(false);
          
          if (snapshot.exists()) {
            const data: Addon[] = [];
            snapshot.forEach((child) => {
              const val = child.val();
              data.push({
                id: child.key!,
                name: val.name,
                price: val.price || 0,
                isAvailable: val.isAvailable !== undefined ? val.isAvailable : true,
              });
            });
            setAddons(data);
          } else {
            setAddons([]);
          }
        }, (error) => {
          console.error("Error listening to addons:", error);
          setLoading(false);
        });
      } catch (error) {
        console.error("Error fetching user branch ID:", error);
        setLoading(false);
      }
    };

    getUserBranchId();

    // Cleanup: unsubscribe when component unmounts
    return () => {
      if (unsubscribeAddons) {
        unsubscribeAddons();
      }
    };
  }, []);

  const handleEditAvailability = (itemId: string) => {
    setSelectedAddonId(itemId);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View className="py-4">
        <Text className="text-center text-gray-400">Loading addons...</Text>
      </View>
    );
  }

  if (addons.length === 0) {
    return (
      <View className="py-4">
        <Text className="text-center text-gray-400">No addons available</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
      >
        {addons.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => handleEditAvailability(item.id)}
            style={{ 
              width: 170, 
              height: 90,
              marginLeft: index === 0 ? 0 : 8,
              opacity: item.isAvailable === false ? 0.5 : 1,
            }}
            className="rounded-2xl bg-white border-2 border-transparent flex-col p-1"
          >
            <View className="flex-1 justify-center px-5">
              <Text className="text-xl font-semibold text-gray-400 text-center">
                {item.name}
              </Text>
            </View>
            <View className="bg-yellow-300 px-4 py-3 rounded-b-2xl items-center justify-center">
              <Text className="text-white font-medium text-center text-xl">
                ₱{item.price}.00
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* MODAL */}
      <AvailabilityModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedAddonId(null);
        }}
        branchId={branchId}
        itemId={selectedAddonId}
        itemName={selectedAddonId ? addons.find(a => a.id === selectedAddonId)?.name || null : null}
        type="addon"
        onFinish={() => {
          setModalVisible(false);
          setSelectedAddonId(null);
        }}
      />
    </>
  );
}
