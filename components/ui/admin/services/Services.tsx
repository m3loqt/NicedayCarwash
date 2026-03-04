import { auth, db } from "@/firebase/firebase";
import { get, onValue, ref, set } from "firebase/database";
import { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";
import AvailabilityConfirmModal from "./AvailabilityConfirmModal";

interface Service {
  id: string;
  name: string;
  sedan: number;
  suv: number;
  pickup: number;
  isAvailable?: boolean;
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ item: Service; newValue: boolean } | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    let unsubscribeServices: (() => void) | null = null;

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
    return () => {
      if (unsubscribeServices) unsubscribeServices();
    };
  }, []);

  const handleToggleRequest = (item: Service, newValue: boolean) => {
    setConfirmModal({ item, newValue });
  };

  const handleConfirmToggle = async () => {
    if (!branchId || !confirmModal) return;
    const { item, newValue } = confirmModal;
    setUpdatingId(item.id);
    try {
      const path = `Branches/${branchId}/Services/${item.id}/isAvailable`;
      await set(ref(db, path), newValue);
      setConfirmModal(null);
    } catch (error) {
      console.error("Error updating service availability:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <View className="py-4">
        <Text className="text-center text-gray-500 text-sm" style={{ fontFamily: "Inter_400Regular" }}>
          Loading services...
        </Text>
      </View>
    );
  }

  if (services.length === 0) {
    return (
      <View className="rounded-lg bg-[#FAFAFA] px-4 py-4">
        <Text className="text-center text-gray-500 text-sm" style={{ fontFamily: "Inter_400Regular" }}>
          No services yet
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-lg bg-[#FAFAFA] overflow-hidden">
      {services.map((item, index) => (
        <View
          key={item.id}
          className="flex-row items-center justify-between px-4 py-3"
        >
          <View className="flex-1 mr-3">
            <Text className="text-[#1E1E1E] text-base font-semibold" style={{ fontFamily: "Inter_600SemiBold" }}>
              {item.name}
            </Text>
            <Text className="text-gray-500 text-xs mt-0.5" style={{ fontFamily: "Inter_400Regular" }}>
              Sedan ₱{item.sedan} · SUV ₱{item.suv} · Pick up ₱{item.pickup}
            </Text>
          </View>
          <Switch
            value={item.isAvailable !== false}
            onValueChange={(value) => handleToggleRequest(item, value)}
            disabled={updatingId === item.id}
            trackColor={{ false: "#E5E7EB", true: "#F9EF08" }}
            thumbColor="#fff"
          />
        </View>
      ))}
      <AvailabilityConfirmModal
        visible={!!confirmModal}
        type="service"
        itemName={confirmModal?.item.name ?? ""}
        enable={confirmModal?.newValue ?? false}
        onClose={() => setConfirmModal(null)}
        onConfirm={handleConfirmToggle}
        loading={updatingId === confirmModal?.item.id}
      />
    </View>
  );
}
