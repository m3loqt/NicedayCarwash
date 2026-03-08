import { auth, db } from "@/firebase/firebase";
import { useAlert } from "@/hooks/use-alert";
import { Ionicons } from "@expo/vector-icons";
import { get, onValue, ref, remove, set } from "firebase/database";
import { useEffect, useState } from "react";
import { Switch, Text, TouchableOpacity, View } from "react-native";
import AvailabilityConfirmModal from "./AvailabilityConfirmModal";

interface Service {
  id: string;
  name: string;
  sedan: number;
  suv: number;
  pickup: number;
  isAvailable?: boolean;
}

interface ServicesProps {
  branchId?: string | null;
}

export default function Services({ branchId: propBranchId }: ServicesProps = {}) {
  const { alert, AlertComponent } = useAlert();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState<string | null>(propBranchId ?? null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ item: Service; newValue: boolean } | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    let unsubscribeServices: (() => void) | null = null;

    const getUserBranchId = async () => {
      try {
        const userSnapshot = await get(ref(db, `users/${uid}`));
        if (!userSnapshot.exists()) { setLoading(false); return; }

        const userData = userSnapshot.val();
        const fetchedBranchId = propBranchId ?? userData.branchId ?? userData.branch;
        if (!fetchedBranchId) { setLoading(false); return; }

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
        }, () => setLoading(false));
      } catch {
        setLoading(false);
      }
    };

    getUserBranchId();
    return () => { if (unsubscribeServices) unsubscribeServices(); };
  }, []);

  const handleToggleRequest = (item: Service, newValue: boolean) => {
    setConfirmModal({ item, newValue });
  };

  const handleConfirmToggle = async () => {
    if (!branchId || !confirmModal) return;
    const { item, newValue } = confirmModal;
    setUpdatingId(item.id);
    try {
      await set(ref(db, `Branches/${branchId}/Services/${item.id}/isAvailable`), newValue);
      setConfirmModal(null);
    } catch {
      alert("Error", "Failed to update service availability.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = (item: Service) => {
    alert(
      "Delete Service",
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!branchId) return;
            try {
              await remove(ref(db, `Branches/${branchId}/Services/${item.id}`));
            } catch {
              alert("Error", "Failed to delete service.");
            }
          },
        },
      ]
    );
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
      {services.map((item) => (
        <View key={item.id} className="flex-row items-center px-4 py-3 border-b border-[#F5F5F5] last:border-0">
          <View className="flex-1 mr-3">
            <Text className="text-[#1E1E1E] text-base font-semibold" style={{ fontFamily: "Inter_600SemiBold" }}>
              {item.name}
            </Text>
            <Text className="text-gray-500 text-xs mt-0.5" style={{ fontFamily: "Inter_400Regular" }}>
              Sedan ₱{item.sedan} · SUV ₱{item.suv} · Pickup ₱{item.pickup}
            </Text>
          </View>
          <Switch
            value={item.isAvailable !== false}
            onValueChange={(value) => handleToggleRequest(item, value)}
            disabled={updatingId === item.id}
            trackColor={{ false: "#E5E7EB", true: "#F9EF08" }}
            thumbColor="#fff"
          />
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="ml-3"
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
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
      {AlertComponent}
    </View>
  );
}
