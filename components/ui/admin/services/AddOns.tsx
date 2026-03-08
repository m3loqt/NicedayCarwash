import { auth, db } from "@/firebase/firebase";
import { useAlert } from "@/hooks/use-alert";
import { Ionicons } from "@expo/vector-icons";
import { get, onValue, ref, remove, set } from "firebase/database";
import { useEffect, useState } from "react";
import { Switch, Text, TouchableOpacity, View } from "react-native";
import AvailabilityConfirmModal from "./AvailabilityConfirmModal";

interface Addon {
  id: string;
  name: string;
  price: number;
  isAvailable?: boolean;
}

export default function AddOns() {
  const { alert, AlertComponent } = useAlert();
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ item: Addon; newValue: boolean } | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    let unsubscribeAddons: (() => void) | null = null;

    const getUserBranchId = async () => {
      try {
        const userSnapshot = await get(ref(db, `users/${uid}`));
        if (!userSnapshot.exists()) { setLoading(false); return; }

        const userData = userSnapshot.val();
        const fetchedBranchId = userData.branchId ?? userData.branch;
        if (!fetchedBranchId) { setLoading(false); return; }

        setBranchId(fetchedBranchId);

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
        }, () => setLoading(false));
      } catch {
        setLoading(false);
      }
    };

    getUserBranchId();
    return () => { if (unsubscribeAddons) unsubscribeAddons(); };
  }, []);

  const handleToggleRequest = (item: Addon, newValue: boolean) => {
    setConfirmModal({ item, newValue });
  };

  const handleConfirmToggle = async () => {
    if (!branchId || !confirmModal) return;
    const { item, newValue } = confirmModal;
    setUpdatingId(item.id);
    try {
      await set(ref(db, `Branches/${branchId}/AddOns/${item.id}/isAvailable`), newValue);
      setConfirmModal(null);
    } catch {
      alert("Error", "Failed to update add-on availability.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = (item: Addon) => {
    alert(
      "Delete Add-on",
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!branchId) return;
            try {
              await remove(ref(db, `Branches/${branchId}/AddOns/${item.id}`));
            } catch {
              alert("Error", "Failed to delete add-on.");
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
          Loading add-ons...
        </Text>
      </View>
    );
  }

  if (addons.length === 0) {
    return (
      <View className="rounded-lg bg-[#FAFAFA] px-4 py-4">
        <Text className="text-center text-gray-500 text-sm" style={{ fontFamily: "Inter_400Regular" }}>
          No add-ons yet
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-lg bg-[#FAFAFA] overflow-hidden">
      {addons.map((item) => (
        <View key={item.id} className="flex-row items-center px-4 py-3 border-b border-[#F5F5F5] last:border-0">
          <View className="flex-1 mr-3">
            <Text className="text-[#1E1E1E] text-base font-semibold" style={{ fontFamily: "Inter_600SemiBold" }}>
              {item.name}
            </Text>
            <Text className="text-gray-500 text-xs mt-0.5" style={{ fontFamily: "Inter_400Regular" }}>
              ₱{item.price}.00
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
        type="addon"
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
