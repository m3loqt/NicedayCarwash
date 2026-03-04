import { auth, db } from "@/firebase/firebase";
import { get, onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import AvailabilityModal from "./AvailabilityModal";

interface Service {
  id: string;
  name: string;
  sedan: number;
  suv: number;
  pickup: number;
  isAvailable?: boolean;
}

export default function Services() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState<string | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    let unsubscribeServices: (() => void) | null = null;

    // Getting branchId first
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

        // Setting up real-time listener for services
        const servicesRef = ref(db, `Branches/${fetchedBranchId}/Services`);
        
        unsubscribeServices = onValue(servicesRef, (snapshot) => {
          setLoading(false);
          
          if (snapshot.exists()) {
            const data: Service[] = [];
            snapshot.forEach((child) => {
              const val = child.val();
              data.push({
                id: child.key!,
                name: val.name,
                sedan: val.sedanPrice || 0,
                suv: val.suvPrice || 0,
                pickup: val.pickupPrice || 0,
                isAvailable: val.isAvailable !== undefined ? val.isAvailable : true,
              });
            });
            setServices(data);
          } else {
            setServices([]);
          }
        }, (error) => {
          console.error("Error listening to services:", error);
          setLoading(false);
        });
      } catch (error) {
        console.error("Error fetching user branch ID:", error);
        setLoading(false);
      }
    };

    getUserBranchId();

    // Unsubscribing when component unmounts
    return () => {
      if (unsubscribeServices) {
        unsubscribeServices();
      }
    };
  }, []);

  const handleEditAvailability = (itemId: string) => {
    setSelectedServiceId(itemId);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View className="py-4">
        <Text className="text-center text-gray-400">Loading services...</Text>
      </View>
    );
  }

  if (services.length === 0) {
    return (
      <View className="py-4">
        <Text className="text-center text-gray-400">No services available</Text>
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
        {services.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => handleEditAvailability(item.id)}
            style={{ 
              width: 220, 
              height: 140,
              marginLeft: index === 0 ? 0 : 8,
              opacity: item.isAvailable === false ? 0.5 : 1,
            }}
            className="rounded-2xl bg-white border-2 border-transparent flex-col p-1"
          >
            <View className="flex-1 justify-center px-5">
              <Text className="text-2xl font-semibold text-gray-400 text-center">
                {item.name}
              </Text>
            </View>

            <View className="bg-yellow-300 px-4 py-2 rounded-b-2xl">
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-white font-medium text-lg">Sedan</Text>
                <Text className="text-white font-medium text-lg">
                  ₱{item.sedan}.00
                </Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-white font-medium text-lg">SUV</Text>
                <Text className="text-white font-medium text-lg">₱{item.suv}.00</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-white font-medium text-lg">Pick Up</Text>
                <Text className="text-white font-medium text-lg">
                  ₱{item.pickup}.00
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* AVAILABILITY MODAL */}
      <AvailabilityModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedServiceId(null);
        }}
        branchId={branchId}
        itemId={selectedServiceId}
        itemName={selectedServiceId ? services.find(s => s.id === selectedServiceId)?.name || null : null}
        type="service"
        onFinish={() => {
          setModalVisible(false);
          setSelectedServiceId(null);
        }}
      />
    </>
  );
}
