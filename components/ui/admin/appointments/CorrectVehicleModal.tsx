import { auth, db } from '@/firebase/firebase';
import { useAlert } from '@/hooks/use-alert';
import { logError } from '@/lib/logger';
import { Ionicons } from '@expo/vector-icons';
import { get, ref, update } from 'firebase/database';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PriceKey = 'sedan' | 'suv' | 'pickup' | 'motorcycle';

// Same 5 classes ServicesStep/ConfirmationStep use at booking time - motorcycle S/L share one
// price tier (see pricing-per-vehicle-class memory: there's no separate small/large price field,
// only a display distinction), so both map to the same priceKey.
const VEHICLE_CLASSES: { label: string; priceKey: PriceKey }[] = [
  { label: 'Sedan', priceKey: 'sedan' },
  { label: 'SUV', priceKey: 'suv' },
  { label: 'Pickup', priceKey: 'pickup' },
  { label: 'Motorcycle (S)', priceKey: 'motorcycle' },
  { label: 'Motorcycle (L)', priceKey: 'motorcycle' },
];

interface LineItem {
  name: string;
  price: number;
  estimatedTime?: string | number;
  removed?: boolean;
}

interface CorrectVehicleModalBooking {
  key: string;
  dateKey: string;
  userId?: string;
  appointmentId: string;
  vehicleDetails: { vehicleName: string; plateNumber: string; classification: string };
  services?: { name?: string; price?: number | string; estimatedTime?: string | number }[];
  addOns?: { name?: string; price?: number | string; estimatedTime?: string | number }[];
  amountDue: number;
}

interface CorrectVehicleModalProps {
  visible: boolean;
  branchId: string | null;
  booking: CorrectVehicleModalBooking | null;
  onClose: () => void;
  onSaved?: () => void;
}

interface CatalogEntry {
  sedan: number;
  suv: number;
  pickup: number;
  motorcycle: number;
  estimatedTime?: number;
}

// Mirrors Services.tsx's branch-local + shared-catalog merge, trimmed to just what this modal
// needs (a name -> per-class price lookup) and done as a one-shot read rather than a live
// subscription, since this is a short editing session, not a screen that stays mounted.
async function fetchServiceCatalog(branchId: string): Promise<Map<string, CatalogEntry>> {
  const [branchSnap, catalogSnap] = await Promise.all([
    get(ref(db, `Branches/${branchId}/Services`)),
    get(ref(db, 'services')),
  ]);
  const branchLocal = branchSnap.val() ?? {};
  const catalog = catalogSnap.val() ?? {};
  const map = new Map<string, CatalogEntry>();

  Object.values(branchLocal as Record<string, any>).forEach((val: any) => {
    if (val && typeof val === 'object' && val.name) {
      map.set(val.name, {
        sedan: val.sedanPrice || 0,
        suv: val.suvPrice || 0,
        pickup: val.pickupPrice || 0,
        motorcycle: val.motorcyclePrice || 0,
        estimatedTime: val.estimatedTime,
      });
    }
  });

  Object.values(catalog as Record<string, any>).forEach((master: any) => {
    if (!master?.name || map.has(master.name)) return;
    if (!Array.isArray(master?.branches) || !master.branches.includes(branchId)) return;
    const prices = master.branchPrices?.[branchId] ?? master.defaultPrices ?? {};
    map.set(master.name, {
      sedan: prices.sedan ?? 0,
      suv: prices.suv ?? 0,
      pickup: prices.pickup ?? 0,
      motorcycle: prices.motorcycle ?? 0,
      estimatedTime: master.estimatedTime,
    });
  });

  return map;
}

const toNumber = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const fmtPeso = (n: number) => `₱${n.toFixed(2)}`;

// A supervisor correcting a mismatched vehicle class/service after seeing the actual vehicle at
// arrival - e.g. booked "Motorcycle (S)" but it's a 500cc bike. The ₱25 Maya booking fee is a
// flat fee unrelated to the service price (see PaymentPage.tsx), so this never touches payment -
// it only fixes what's logged as the service/vehicle/amountDue for accurate records, plus an
// audit trail of what it used to say.
export default function CorrectVehicleModal({ visible, branchId, booking, onClose, onSaved }: CorrectVehicleModalProps) {
  const insets = useSafeAreaInsets();
  const { alert, AlertComponent } = useAlert();

  const [catalog, setCatalog] = useState<Map<string, CatalogEntry> | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [services, setServices] = useState<LineItem[]>([]);
  const [addOns, setAddOns] = useState<LineItem[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !booking || !branchId) return;

    setSelectedLabel(
      VEHICLE_CLASSES.some((c) => c.label === booking.vehicleDetails.classification)
        ? booking.vehicleDetails.classification
        : null
    );
    setServices((booking.services ?? []).map((s) => ({ name: s.name || 'Service', price: toNumber(s.price), estimatedTime: s.estimatedTime })));
    setAddOns((booking.addOns ?? []).map((a) => ({ name: a.name || 'Add-on', price: toNumber(a.price), estimatedTime: a.estimatedTime })));
    setNote('');

    setLoadingCatalog(true);
    fetchServiceCatalog(branchId)
      .then(setCatalog)
      .catch((error) => {
        logError('CorrectVehicleModal.fetchServiceCatalog', error, { branchId });
        setCatalog(new Map());
      })
      .finally(() => setLoadingCatalog(false));
  }, [visible, booking, branchId]);

  const priceKey = useMemo(
    () => VEHICLE_CLASSES.find((c) => c.label === selectedLabel)?.priceKey ?? null,
    [selectedLabel]
  );

  // Re-prices every still-selected service against the newly chosen class the moment it changes -
  // this is the whole point of the correction. A service the catalog doesn't recognize by name
  // (renamed/removed since booking) keeps its original price rather than silently zeroing it out.
  const handleSelectClass = (label: string) => {
    setSelectedLabel(label);
    const key = VEHICLE_CLASSES.find((c) => c.label === label)?.priceKey;
    if (!key || !catalog) return;
    setServices((prev) =>
      prev.map((item) => {
        const entry = catalog.get(item.name);
        if (!entry) return item;
        return { ...item, price: entry[key] };
      })
    );
  };

  const toggleRemoveService = (index: number) => {
    setServices((prev) => prev.map((item, i) => (i === index ? { ...item, removed: !item.removed } : item)));
  };
  const toggleRemoveAddon = (index: number) => {
    setAddOns((prev) => prev.map((item, i) => (i === index ? { ...item, removed: !item.removed } : item)));
  };

  const keptServices = services.filter((s) => !s.removed);
  const keptAddOns = addOns.filter((a) => !a.removed);
  const newAmountDue = keptServices.reduce((sum, s) => sum + s.price, 0) + keptAddOns.reduce((sum, a) => sum + a.price, 0);

  const handleSave = async () => {
    if (!booking || !branchId || !selectedLabel) return;
    if (keptServices.length === 0) {
      alert('Nothing selected', 'At least one service must stay on the booking.');
      return;
    }

    setSaving(true);
    try {
      const correctedAt = new Date().toISOString();
      const branchPath = `Reservations/ReservationsByBranch/${branchId}/${booking.dateKey}/${booking.key}`;
      const servicesPayload = keptServices.map((s) => ({ name: s.name, price: s.price, estimatedTime: s.estimatedTime ?? 0 }));
      const addOnsPayload = keptAddOns.map((a) => ({ name: a.name, price: a.price, estimatedTime: a.estimatedTime ?? 0 }));
      const correction = {
        correctedBy: auth.currentUser?.uid ?? 'unknown',
        correctedAt,
        note: note.trim().slice(0, 240),
        previousClassification: booking.vehicleDetails.classification,
        previousAmountDue: booking.amountDue,
      };

      const updates: Record<string, any> = {
        [`${branchPath}/vehicleDetails/classification`]: selectedLabel,
        [`${branchPath}/services`]: servicesPayload,
        [`${branchPath}/addOns`]: addOnsPayload,
        [`${branchPath}/amountDue`]: newAmountDue,
        [`${branchPath}/correction`]: correction,
      };

      if (booking.userId) {
        const userPath = `Reservations/ReservationsByUser/${booking.userId}/${booking.dateKey}/${booking.key}`;
        updates[`${userPath}/vehicleDetails/classification`] = selectedLabel;
        updates[`${userPath}/services`] = servicesPayload;
        updates[`${userPath}/addOns`] = addOnsPayload;
        updates[`${userPath}/amountDue`] = newAmountDue;
        updates[`${userPath}/correction`] = correction;
      }

      await update(ref(db), updates);
      onSaved?.();
      onClose();
    } catch (error) {
      logError('CorrectVehicleModal.handleSave', error, { context: 'Failed to save vehicle/service correction' });
      alert('Error', 'Failed to save the correction. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-black/50 justify-end">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-t-2xl px-5 pt-5" style={{ maxHeight: '86%' }}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-[#1A1A1A]">Correct Vehicle / Service</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {!booking ? null : loadingCatalog ? (
            <View className="py-10 items-center">
              <ActivityIndicator color="#1A1A1A" />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text className="text-xs text-[#999] mb-2">
                For {booking.vehicleDetails.vehicleName} ({booking.vehicleDetails.plateNumber}). Booked as{' '}
                <Text className="font-semibold text-[#1A1A1A]">{booking.vehicleDetails.classification}</Text>.
              </Text>

              <Text className="text-xs font-semibold text-gray-500 uppercase mb-2 mt-2">Actual vehicle class</Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {VEHICLE_CLASSES.map((c) => (
                  <TouchableOpacity
                    key={c.label}
                    onPress={() => handleSelectClass(c.label)}
                    className={`px-3 py-2 rounded-full border ${
                      selectedLabel === c.label ? 'bg-[#F9EF08] border-[#F9EF08]' : 'bg-white border-[#E5E5E5]'
                    }`}
                  >
                    <Text className={`text-xs font-semibold ${selectedLabel === c.label ? 'text-[#1A1A00]' : 'text-[#1A1A1A]'}`}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-xs font-semibold text-gray-500 uppercase mb-2 mt-5">
                Services {priceKey ? '(price updated for corrected class)' : ''}
              </Text>
              {services.map((item, idx) => (
                <View
                  key={`${item.name}-${idx}`}
                  className={`flex-row items-center justify-between py-2.5 border-b border-[#F5F5F5] ${item.removed ? 'opacity-40' : ''}`}
                >
                  <Text className="flex-1 text-sm text-[#1A1A1A]" numberOfLines={1}>{item.name}</Text>
                  <Text className="text-sm text-[#1A1A1A] mr-3">{fmtPeso(item.price)}</Text>
                  <TouchableOpacity onPress={() => toggleRemoveService(idx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name={item.removed ? 'add-circle-outline' : 'close-circle-outline'} size={20} color={item.removed ? '#22C55E' : '#EF4444'} />
                  </TouchableOpacity>
                </View>
              ))}

              {addOns.length > 0 && (
                <>
                  <Text className="text-xs font-semibold text-gray-500 uppercase mb-2 mt-5">Add-ons</Text>
                  {addOns.map((item, idx) => (
                    <View
                      key={`${item.name}-${idx}`}
                      className={`flex-row items-center justify-between py-2.5 border-b border-[#F5F5F5] ${item.removed ? 'opacity-40' : ''}`}
                    >
                      <Text className="flex-1 text-sm text-[#1A1A1A]" numberOfLines={1}>{item.name}</Text>
                      <Text className="text-sm text-[#1A1A1A] mr-3">{fmtPeso(item.price)}</Text>
                      <TouchableOpacity onPress={() => toggleRemoveAddon(idx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name={item.removed ? 'add-circle-outline' : 'close-circle-outline'} size={20} color={item.removed ? '#22C55E' : '#EF4444'} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}

              <View className="flex-row items-center justify-between py-3 mt-1">
                <Text className="text-sm font-bold text-[#1A1A1A]">Corrected amount due</Text>
                <Text className="text-base font-bold text-[#1A1A1A]">{fmtPeso(newAmountDue)}</Text>
              </View>
              {newAmountDue !== booking.amountDue && (
                <Text className="text-xs text-[#999] -mt-2 mb-2">
                  Was {fmtPeso(booking.amountDue)}. The ₱25 booking fee already paid via Maya is unaffected - this only
                  updates the on-site amount due.
                </Text>
              )}

              <Text className="text-xs font-semibold text-gray-500 uppercase mb-2 mt-3">Note (optional)</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="e.g. Customer's bike is 500cc, not small"
                placeholderTextColor="#C4C4C4"
                multiline
                numberOfLines={2}
                className="bg-[#FAFAFA] border border-[#EEEEEE] rounded-xl px-3 py-2.5 text-sm text-[#1A1A1A]"
                style={{ minHeight: 56, textAlignVertical: 'top' }}
              />

              <TouchableOpacity
                className={`rounded-2xl py-4 items-center mt-5 ${selectedLabel && !saving ? 'bg-[#F9EF08]' : 'bg-[#F0F0F0]'}`}
                onPress={handleSave}
                disabled={!selectedLabel || saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#1A1A00" />
                ) : (
                  <Text className={`text-sm font-bold ${selectedLabel ? 'text-[#1A1A00]' : 'text-[#BDBDBD]'}`}>
                    Save Correction
                  </Text>
                )}
              </TouchableOpacity>

              <View style={{ height: insets.bottom + 16 }} />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
      {AlertComponent}
    </Modal>
  );
}
