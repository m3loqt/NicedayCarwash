import { auth, db } from "@/firebase/firebase";
import { useAlert } from "@/hooks/use-alert";
import { get, onValue, ref, set } from "firebase/database";
import { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";
import AvailabilityConfirmModal from "./AvailabilityConfirmModal";

interface Addon {
  id: string;
  name: string;
  price: number;
  isAvailable?: boolean;
}

interface AddOnsProps {
  refreshKey?: number;
}

export default function AddOns({ refreshKey }: AddOnsProps = {}) {
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
        unsubscribeAddons = onValue(addonsRef, async (snapshot) => {
          const branchLocal = snapshot.val() ?? {};

          // The shared "addOns" catalog (managed on the web) is the source of truth for which
          // add-ons exist and which branches offer them, via its `branches` array -
          // branch-local entries are either legacy full-object add-ons or per-branch
          // availability overrides for catalog add-ons (see ServicesStep.tsx).
          const catalogSnapshot = await get(ref(db, "addOns"));
          const catalog = catalogSnapshot.val() ?? {};

          const data: Addon[] = [];
          const addedIds = new Set<string>();

          Object.entries(branchLocal).forEach(([id, val]: [string, any]) => {
            if (val && typeof val === "object" && val.name) {
              // Legacy format: full add-on object stored directly under the branch
              data.push({
                id,
                name: val.name,
                price: val.price || 0,
                isAvailable: val.isAvailable !== undefined ? val.isAvailable : true,
              });
              addedIds.add(id);
            }
          });

          Object.entries(catalog).forEach(([id, master]: [string, any]) => {
            if (addedIds.has(id)) return;
            if (!Array.isArray(master?.branches) || !master.branches.includes(fetchedBranchId)) return;

            const override = branchLocal[id];
            const isAvailable =
              typeof override === "boolean" ? override : override?.isAvailable !== undefined ? override.isAvailable : true;

            const price = master.branchPrices?.[fetchedBranchId]?.price ?? master.defaultPrice ?? 0;
            data.push({
              id,
              name: master.name,
              price,
              isAvailable,
            });
            addedIds.add(id);
          });

          setAddons(data);
          setLoading(false);
        }, () => setLoading(false));
      } catch {
        setLoading(false);
      }
    };

    getUserBranchId();
    return () => { if (unsubscribeAddons) unsubscribeAddons(); };
  }, [refreshKey]);

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
      <View className="rounded-lg bg-white px-4 py-4">
        <Text className="text-center text-gray-500 text-sm" style={{ fontFamily: "Inter_400Regular" }}>
          No add-ons yet
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-lg bg-white overflow-hidden">
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
