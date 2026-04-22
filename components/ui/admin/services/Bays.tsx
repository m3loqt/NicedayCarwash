import { auth, db } from "@/firebase/firebase";
import { useAlert } from "@/hooks/use-alert";
import { logError } from "@/lib/logger";
import { get, onValue, ref, remove, set, update } from "firebase/database";
import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import BayOptionsModal from "./BayOptionsModal";

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
  const [bayModalVisible, setBayModalVisible] = useState(false);
  const [selectedBay, setSelectedBay] = useState<Bay | null>(null);

  // Parsing bays data from database
  const parseBaysData = (baysData: any): { bays: Bay[], dataType: 'array' | 'object' } => {
    const data: Bay[] = [];
    let dataType: 'array' | 'object' = 'array';
    
    if (Array.isArray(baysData)) {
      dataType = 'array';
      baysData.forEach((bay: any, index: number) => {
        if (bay && bay !== null) {
          // For arrays, the index IS the bay number
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
          // Parsing the key directly as the bay number
          let bayNum: number;
          let status = "available";
          
          // Handling numeric keys - key is the bay number directly
          const keyAsNumber = Number(key);
          if (!isNaN(keyAsNumber)) {
            bayNum = keyAsNumber;
          } else {
            // Handling legacy formats like "Bay 1", "Bay1", etc.
            bayNum = parseInt(key.replace(/[^\d]/g, '')) || 0;
          }
          
          // Getting status from bay object (no id field - key is the identifier)
          if (typeof bay === 'object' && bay.status) {
            status = bay.status;
          }
          
          // Including all bays including bay 0 if it exists
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
    
    // Sorting by bay number
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

    // Getting branchId first
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

        // Setting up real-time listener for bays
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
          logError("Bays.listener", error, { context: "Error listening to bays" });
          setLoading(false);
        });
      } catch (error) {
        logError("Bays.getUserBranchId", error, { context: "Error fetching user branch ID" });
        setLoading(false);
      }
    };

    getUserBranchId();

    // Unsubscribing when component unmounts
    return () => {
      if (unsubscribeBays) {
        unsubscribeBays();
      }
    };
  }, []);

  const handleOpenBayOptions = (bay: Bay) => {
    setSelectedBay(bay);
    setBayModalVisible(true);
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
        // Updating status directly for object format
        const bayRef = ref(db, `Branches/${branchId}/Bays/${selectedBay.originalKey}`);
        // Getting current bay data to preserve structure
        const baySnapshot = await get(bayRef);
        if (baySnapshot.exists()) {
          const currentBay = baySnapshot.val();
          if (typeof currentBay === 'object') {
            await update(bayRef, { ...currentBay, status: newStatus });
          } else {
            // Converting to object if it's just a boolean or primitive
            await set(bayRef, { status: newStatus });
          }
        }
      }

      setBayModalVisible(false);
      setSelectedBay(null);
      alert("Success", `${selectedBay.name} availability has been updated.`);
    } catch (error) {
      logError("Bays.handleSaveAvailability", error, { context: "Error updating bay status" });
      alert("Error", "Failed to update bay status.");
    }
  };

  const handleDeletePress = () => {
    if (!selectedBay) return;
    setBayModalVisible(false);
    const bay = selectedBay;
    setSelectedBay(null);
    alert(
      "Confirm Delete",
      `Are you sure you want to delete ${bay.name}?`,
      [
        { text: "Cancel", style: "cancel" },
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
              if (baysDataType === "array") {
                const baysSnapshot = await get(baysRef);
                if (baysSnapshot.exists()) {
                  const index = parseInt(bay.originalKey || "0");
                  const updates: any = {};
                  updates[index] = null;
                  await update(baysRef, updates);
                }
              } else if (bay.originalKey) {
                const bayRef = ref(db, `Branches/${branchId}/Bays/${bay.originalKey}`);
                await remove(bayRef);
              }
              alert("Success", `${bay.name} has been deleted successfully.`);
            } catch (error) {
              logError("Bays.handleDeletePress", error, { context: "Error deleting bay" });
              alert("Error", "Failed to delete bay.");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="py-4">
        <Text className="text-center text-gray-500 text-sm" style={{ fontFamily: 'Inter_400Regular' }}>Loading bays...</Text>
      </View>
    );
  }

  if (bays.length === 0) {
    return (
      <View className="py-4 rounded-lg bg-[#FAFAFA] px-4 py-4">
        <Text className="text-center text-gray-500 text-sm" style={{ fontFamily: 'Inter_400Regular' }}>No bays available</Text>
      </View>
    );
  }

  return (
    <>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingLeft: 20, paddingRight: 24 }}
    >
      {bays.map((item, index) => (
        <TouchableOpacity
          key={item.id}
          activeOpacity={0.8}
          onPress={() => handleOpenBayOptions(item)}
          style={{
            width: 64,
            height: 68,
            marginLeft: index === 0 ? 0 : 8,
            opacity: item.status === "unavailable" ? 0.4 : 1,
          }}
          className="rounded-xl bg-[#FAFAFA] items-center justify-center"
        >
          <Text
            className="text-[10px] text-[#999]"
            style={{ fontFamily: "Inter_400Regular", lineHeight: 13 }}
          >
            Bay
          </Text>
          <Text
            className="text-[26px] font-bold text-[#1E1E1E]"
            style={{ fontFamily: "Inter_700Bold", lineHeight: 30 }}
          >
            {item.id}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
    {AlertComponent}
    <BayOptionsModal
      visible={bayModalVisible}
      bayName={selectedBay?.name ?? ""}
      currentStatus={selectedBay?.status ?? "available"}
      onClose={() => {
        setBayModalVisible(false);
        setSelectedBay(null);
      }}
      onSaveAvailability={handleSaveAvailability}
      onDelete={handleDeletePress}
    />
  </>
  );
}
