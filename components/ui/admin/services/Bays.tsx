import { auth, db } from "@/firebase/firebase";
import { useAlert } from "@/hooks/use-alert";
import { get, onValue, ref, remove, set, update } from "firebase/database";
import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import SetAvailabilityModal from "./SetAvailabilityModal";

interface Bay {
  id: string | number;
  name: string;
  status?: string; // "available" or "unavailable"
  originalKey?: string; // Store original key from database for deletion
}

export default function Bays() {
  const { alert, AlertComponent } = useAlert();
  const [bays, setBays] = useState<Bay[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [baysDataType, setBaysDataType] = useState<'array' | 'object'>('array');
  const [availabilityModalVisible, setAvailabilityModalVisible] = useState(false);
  const [selectedBay, setSelectedBay] = useState<Bay | null>(null);

  // Helper function to parse bays data
  const parseBaysData = (baysData: any): { bays: Bay[], dataType: 'array' | 'object' } => {
    const data: Bay[] = [];
    let dataType: 'array' | 'object' = 'array';
    
    if (Array.isArray(baysData)) {
      dataType = 'array';
      baysData.forEach((bay: any, index: number) => {
        if (bay && bay !== null) {
          // For arrays, the index IS the bay number
          // Array structure: [null, bay1, bay2, bay3] means index 1 = Bay 1
          const bayId = bay.id || index;
          const status = bay.status || "available";
          data.push({ 
            id: bayId, 
            name: `Bay ${bayId}`, 
            status: status,
            originalKey: String(index) 
          });
        }
      });
    } else if (typeof baysData === 'object' && baysData !== null) {
      dataType = 'object';
      Object.keys(baysData).forEach((key) => {
        const bay = baysData[key];
        if (bay !== null && bay !== undefined) {
          // Key IS the bay number (e.g., "1", "2", "3")
          // Parse the key directly as the bay number
          let bayNum: number;
          let status = "available";
          
          // Handle numeric keys - key is the bay number directly
          const keyAsNumber = Number(key);
          if (!isNaN(keyAsNumber)) {
            bayNum = keyAsNumber;
          } else {
            // Handle legacy formats like "Bay 1", "Bay1", etc.
            bayNum = parseInt(key.replace(/[^\d]/g, '')) || 0;
          }
          
          // Get status from bay object (no id field - key is the identifier)
          if (typeof bay === 'object' && bay.status) {
            status = bay.status;
          }
          
          // Include all bays including bay 0 if it exists
          if (!isNaN(bayNum)) {
            data.push({ 
              id: bayNum, 
              name: `Bay ${bayNum}`, 
              status: status,
              originalKey: key 
            });
          }
        }
      });
    }
    
    // Sort by bay number
    data.sort((a, b) => {
      const numA = typeof a.id === 'number' ? a.id : parseInt(String(a.id).replace(/[^\d]/g, '')) || 0;
      const numB = typeof b.id === 'number' ? b.id : parseInt(String(b.id).replace(/[^\d]/g, '')) || 0;
      return numA - numB;
    });
    
    return { bays: data, dataType };
  };

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    let unsubscribeBays: (() => void) | null = null;

    // First, get the branchId
    const getUserBranchId = async () => {
      try {
        const userSnapshot = await get(ref(db, `users/${uid}`));
        if (!userSnapshot.exists()) {
          setLoading(false);
          return;
        }

        const userData = userSnapshot.val();
        const branchIdValue = userData.branchId || userData.branch;
        if (!branchIdValue) {
          setLoading(false);
          return;
        }

        setBranchId(branchIdValue);

        // Set up real-time listener for bays
        const baysRef = ref(db, `Branches/${branchIdValue}/Bays`);
        
        unsubscribeBays = onValue(baysRef, (snapshot) => {
          setLoading(false);
          
          if (snapshot.exists()) {
            const baysData = snapshot.val();
            const { bays, dataType } = parseBaysData(baysData);
            setBays(bays);
            setBaysDataType(dataType);
          } else {
            setBays([]);
          }
        }, (error) => {
          console.error("Error listening to bays:", error);
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
      if (unsubscribeBays) {
        unsubscribeBays();
      }
    };
  }, []);

  const handleSetAvailability = (bay: Bay) => {
    setSelectedBay(bay);
    setAvailabilityModalVisible(true);
  };

  const handleSaveAvailability = async (newStatus: string) => {
    try {
      if (!branchId || !selectedBay || !selectedBay.originalKey) {
        alert("Error", "Missing bay information.");
        return;
      }

      const baysRef = ref(db, `Branches/${branchId}/Bays`);
      
      if (baysDataType === 'array') {
        const index = parseInt(selectedBay.originalKey);
        const updates: any = {};
        updates[`${index}/status`] = newStatus;
        await update(baysRef, updates);
      } else {
        // For object format - update status directly
        const bayRef = ref(db, `Branches/${branchId}/Bays/${selectedBay.originalKey}`);
        // Get current bay data to preserve structure
        const baySnapshot = await get(bayRef);
        if (baySnapshot.exists()) {
          const currentBay = baySnapshot.val();
          if (typeof currentBay === 'object') {
            await update(bayRef, { ...currentBay, status: newStatus });
          } else {
            // If it's just a boolean or primitive, convert to object
            await set(bayRef, { status: newStatus });
          }
        }
      }

      // No need to refresh - real-time listener will update automatically
      setAvailabilityModalVisible(false);
      setSelectedBay(null);
      alert("Success", `${selectedBay.name} availability has been updated.`);
    } catch (error) {
      console.error("Error updating bay status:", error);
      alert("Error", "Failed to update bay status.");
    }
  };

  const handleDelete = (bay: Bay) => {
    alert(
      "Confirm Delete",
      `Are you sure you want to delete ${bay.name}?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const uid = auth.currentUser?.uid;
              if (!uid || !branchId) {
                alert("Error", "User not authenticated.");
                return;
              }

              const baysRef = ref(db, `Branches/${branchId}/Bays`);
              
              if (baysDataType === 'array') {
                // For array format, we need to get the array, remove the item, and set it back
                const baysSnapshot = await get(baysRef);
                if (baysSnapshot.exists()) {
                  const baysArray = baysSnapshot.val();
                  const index = parseInt(bay.originalKey || '0');
                  // Set the item at index to null
                  const updates: any = {};
                  updates[index] = null;
                  await update(baysRef, updates);
                }
              } else {
                // For object format, remove the key
                if (bay.originalKey) {
                  const bayRef = ref(db, `Branches/${branchId}/Bays/${bay.originalKey}`);
                  await remove(bayRef);
                }
              }

              // No need to refresh - real-time listener will update automatically
              alert("Success", `${bay.name} has been deleted successfully.`);
            } catch (error) {
              console.error("Error deleting bay:", error);
              alert("Error", "Failed to delete bay.");
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View className="py-4">
        <Text className="text-center text-gray-400">Loading bays...</Text>
      </View>
    );
  }

  if (bays.length === 0) {
    return (
      <View className="py-4">
        <Text className="text-center text-gray-400">No bays available</Text>
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
      {bays.map((item, index) => (
        <View
          key={item.id}
          style={{
            width: 95,
            height: 65,
            marginLeft: index === 0 ? 0 : 8,
            opacity: item.status === "unavailable" ? 0.5 : 1,
          }}
          className="rounded-2xl bg-white border-2 border-transparent flex-col overflow-hidden"
        >
          {/* Bay Name - Centered at top */}
          <View className="flex-1 justify-center px-4">
            <Text 
              className="text-center text-gray-400 font-bold text-base"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {item.name}
            </Text>
          </View>

          {/* Set and Delete Buttons - Side by side at bottom */}
          <View className="flex-row">
            <TouchableOpacity
              className="bg-yellow-300 flex-1 py-2 rounded-bl-2xl"
              style={{ marginRight: 2 }}
              activeOpacity={0.8}
              onPress={() => handleSetAvailability(item)}
            >
              <Text 
                className="text-center text-white text-sm"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                Set
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-yellow-300 flex-1 py-2 rounded-br-2xl"
              activeOpacity={0.8}
              onPress={() => handleDelete(item)}
            >
              <Text 
                className="text-center text-white text-sm"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
    {AlertComponent}
    <SetAvailabilityModal
      visible={availabilityModalVisible}
      onClose={() => {
        setAvailabilityModalVisible(false);
        setSelectedBay(null);
      }}
      onSave={handleSaveAvailability}
      currentStatus={selectedBay?.status || "available"}
      bayName={selectedBay?.name || ""}
    />
  </>
  );
}
