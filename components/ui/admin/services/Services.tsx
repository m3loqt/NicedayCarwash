import { auth, db } from "@/firebase/firebase";
import { useAlert } from "@/hooks/use-alert";
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
  motorcycle: number;
  isAvailable?: boolean;
}

// Only the vehicle classes this service is actually priced for - so a motorcycle-only service
// shows "Motorcycle ₱140" instead of "Sedan ₱0 · SUV ₱0 · Pickup ₱0".
const priceLabel = (s: Service): string => {
  const parts: string[] = [];
  if (s.sedan > 0) parts.push(`Sedan ₱${s.sedan}`);
  if (s.suv > 0) parts.push(`SUV ₱${s.suv}`);
  if (s.pickup > 0) parts.push(`Pickup ₱${s.pickup}`);
  if (s.motorcycle > 0) parts.push(`Motorcycle ₱${s.motorcycle}`);
  return parts.length ? parts.join(' · ') : 'No price set';
};

interface ServicesProps {
  branchId?: string | null;
  refreshKey?: number;
}

export default function Services({ branchId: propBranchId, refreshKey }: ServicesProps = {}) {
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
        unsubscribeServices = onValue(servicesRef, async (snapshot) => {
          const branchLocal = snapshot.val() ?? {};

          // The shared "services" catalog (managed on the web) is the source of truth for which
          // services exist and which branches offer them, via its `branches` array -
          // branch-local entries are either legacy full-object services or per-branch
          // availability overrides for catalog services (see ServicesStep.tsx).
          const catalogSnapshot = await get(ref(db, "services"));
          const catalog = catalogSnapshot.val() ?? {};

          const data: Service[] = [];
          const addedIds = new Set<string>();

          Object.entries(branchLocal).forEach(([id, val]: [string, any]) => {
            if (val && typeof val === "object" && val.name) {
              // Legacy format: full service object stored directly under the branch
              data.push({
                id,
                name: val.name,
                sedan: val.sedanPrice || 0,
                suv: val.suvPrice || 0,
                pickup: val.pickupPrice || 0,
                motorcycle: val.motorcyclePrice || 0,
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

            const prices = master.branchPrices?.[fetchedBranchId] ?? master.defaultPrices ?? {};
            data.push({
              id,
              name: master.name,
              sedan: prices.sedan ?? 0,
              suv: prices.suv ?? 0,
              pickup: prices.pickup ?? 0,
              motorcycle: prices.motorcycle ?? 0,
              isAvailable,
            });
            addedIds.add(id);
          });

          setServices(data);
          setLoading(false);
        }, () => setLoading(false));
      } catch {
        setLoading(false);
      }
    };

    getUserBranchId();
    return () => { if (unsubscribeServices) unsubscribeServices(); };
  }, [refreshKey]);

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
      <View className="rounded-lg bg-white px-4 py-4">
        <Text className="text-center text-gray-500 text-sm" style={{ fontFamily: "Inter_400Regular" }}>
          No services yet
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-lg bg-white overflow-hidden">
      {services.map((item) => (
        <View key={item.id} className="flex-row items-center px-4 py-3 border-b border-[#F5F5F5] last:border-0">
          <View className="flex-1 mr-3">
            <Text className="text-[#1E1E1E] text-base font-semibold" style={{ fontFamily: "Inter_600SemiBold" }}>
              {item.name}
            </Text>
            <Text className="text-gray-500 text-xs mt-0.5" style={{ fontFamily: "Inter_400Regular" }}>
              {priceLabel(item)}
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
      {AlertComponent}
    </View>
  );
}
