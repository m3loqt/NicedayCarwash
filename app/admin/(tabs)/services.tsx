import { auth, db } from "@/firebase/firebase";
import { useAlert } from "@/hooks/use-alert";
import { get, push, ref, set, update } from "firebase/database";
import { useState } from "react";
import { ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AddAddonModal, { AddonFormData } from "../../../components/ui/admin/services/AddAddonModal";
import AddBayModal from "../../../components/ui/admin/services/AddBayModal";
import AddOns from "../../../components/ui/admin/services/AddOns";
import AddServiceModal, { ServiceFormData } from "../../../components/ui/admin/services/AddServiceModal";
import AddTimeSlotModal from "../../../components/ui/admin/services/AddTimeSlotModal";
import Bays from "../../../components/ui/admin/services/Bays";
import Services from "../../../components/ui/admin/services/Services";
import TimeSlots from "../../../components/ui/admin/services/TimeSlot";

export default function AdminServicesScreen() {
  const { alert, AlertComponent } = useAlert();
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [bayModalVisible, setBayModalVisible] = useState(false);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [addonModalVisible, setAddonModalVisible] = useState(false);

  const getAdminBranchId = async (): Promise<string | null> => {
    const uid = auth.currentUser?.uid;
    if (!uid) return null;
    const snap = await get(ref(db, `users/${uid}`));
    if (!snap.exists()) return null;
    const data = snap.val();
    return data.branchId ?? data.branch ?? null;
  };

  const handleAddService = async (data: ServiceFormData) => {
    const branchId = await getAdminBranchId();
    if (!branchId) throw new Error("Branch not found");
    const servicesRef = ref(db, `Branches/${branchId}/Services`);
    await push(servicesRef, {
      name: data.name,
      sedanPrice: data.sedanPrice,
      suvPrice: data.suvPrice,
      pickupPrice: data.pickupPrice,
      estimatedTime: data.estimatedTime,
      description: data.description,
      isAvailable: true,
    });
    setServiceModalVisible(false);
    alert("Success", "Service added successfully.");
  };

  const handleAddAddon = async (data: AddonFormData) => {
    const branchId = await getAdminBranchId();
    if (!branchId) throw new Error("Branch not found");
    const addonsRef = ref(db, `Branches/${branchId}/AddOns`);
    await push(addonsRef, {
      name: data.name,
      price: data.price,
      estimatedTime: data.estimatedTime,
      description: data.description,
      isAvailable: true,
    });
    setAddonModalVisible(false);
    alert("Success", "Add-on added successfully.");
  };

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Header */}
        <View className="px-5 pt-4 pb-4">
          <Text className="text-3xl font-bold text-[#1A1A1A]">Services & Prices</Text>
        </View>

        {/* Body */}
        <ScrollView
          className="flex-1 bg-white"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        >
          {/* Services */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-semibold text-gray-500" style={{ fontFamily: 'Inter_600SemiBold' }}>
              Services
            </Text>
            <TouchableOpacity onPress={() => setServiceModalVisible(true)}>
              <Text className="text-sm font-bold text-[#1E1E1E]" style={{ fontFamily: 'Inter_700Bold' }}>
                Add service
              </Text>
            </TouchableOpacity>
          </View>
          <Services />

          {/* Add-ons */}
          <View className="flex-row items-center justify-between mt-6 mb-2">
            <Text className="text-sm font-semibold text-gray-500" style={{ fontFamily: 'Inter_600SemiBold' }}>
              Add-ons
            </Text>
            <TouchableOpacity onPress={() => setAddonModalVisible(true)}>
              <Text className="text-sm font-bold text-[#1E1E1E]" style={{ fontFamily: 'Inter_700Bold' }}>
                Add add-on
              </Text>
            </TouchableOpacity>
          </View>
          <AddOns />

          {/* Time Slots */}
          <View className="mt-6" style={{ marginHorizontal: -20 }}>
            <View className="flex-row items-center justify-between mb-2 px-5">
              <Text className="text-sm font-semibold text-gray-500" style={{ fontFamily: 'Inter_600SemiBold' }}>
                Time slots
              </Text>
              <TouchableOpacity onPress={() => setTimeModalVisible(true)}>
                <Text className="text-sm font-bold text-[#1E1E1E]" style={{ fontFamily: 'Inter_700Bold' }}>
                  Add time slot
                </Text>
              </TouchableOpacity>
            </View>
            <TimeSlots />
          </View>

          {/* Bays */}
          <View className="mt-6" style={{ marginHorizontal: -20 }}>
            <View className="flex-row items-center justify-between mb-2 px-5">
              <Text className="text-sm font-semibold text-gray-500" style={{ fontFamily: 'Inter_600SemiBold' }}>
                Bays
              </Text>
              <TouchableOpacity onPress={() => setBayModalVisible(true)}>
                <Text className="text-sm font-bold text-[#1E1E1E]" style={{ fontFamily: 'Inter_700Bold' }}>
                  Add bay
                </Text>
              </TouchableOpacity>
            </View>
            <Bays />
          </View>
        </ScrollView>

        {/* MODALS */}
        <AddServiceModal
          visible={serviceModalVisible}
          onClose={() => setServiceModalVisible(false)}
          onAdd={handleAddService}
        />

        <AddAddonModal
          visible={addonModalVisible}
          onClose={() => setAddonModalVisible(false)}
          onAdd={handleAddAddon}
        />

        <AddTimeSlotModal
          visible={timeModalVisible}
          onClose={() => setTimeModalVisible(false)}
          onAdd={async (start, end) => {
            try {
              const uid = auth.currentUser?.uid;
              if (!uid) { alert("Error", "User not authenticated."); return; }

              const userSnapshot = await get(ref(db, `users/${uid}`));
              if (!userSnapshot.exists()) { alert("Error", "User data not found."); return; }

              const userData = userSnapshot.val();
              const branchId = userData.branchId ?? userData.branch;
              if (!branchId) { alert("Error", "Branch ID not found."); return; }

              const parseTime = (time: string) => {
                const [hourMin, meridiem] = time.split(" ");
                const [h, m] = hourMin.split(":").map(Number);
                let hour = h;
                if (meridiem === "PM" && hour !== 12) hour += 12;
                if (meridiem === "AM" && hour === 12) hour = 0;
                return hour * 60 + m;
              };

              const formatTimeTo12Hour = (minutes: number) => {
                const hour = Math.floor(minutes / 60);
                const hour12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
                const period = hour >= 12 ? "PM" : "AM";
                return `${hour12}:00 ${period}`;
              };

              const startMinutes = parseTime(start);
              const endMinutes = parseTime(end);

              const newSlots: any[] = [];
              for (let minutes = startMinutes; minutes < endMinutes; minutes += 60) {
                const hour = Math.floor(minutes / 60);
                const hour12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
                const period = hour >= 12 ? "PM" : "AM";
                newSlots.push({ time: `${hour12}:00 ${period}`, status: "available" });
              }

              const timeSlotsRef = ref(db, `Branches/${branchId}/TimeSlots`);
              const existingSnapshot = await get(timeSlotsRef);

              let existingSlots: any[] = [];
              let existingSlotTimes: Set<string> = new Set();
              let minExistingTime: number | null = null;
              let maxExistingTime: number | null = null;

              if (existingSnapshot.exists()) {
                const existingData = existingSnapshot.val();
                if (Array.isArray(existingData)) {
                  existingSlots = existingData.filter((s: any) => s && s.time);
                } else if (typeof existingData === 'object') {
                  existingSlots = Object.values(existingData).filter((s: any) => s && s.time) as any[];
                }

                existingSlots.forEach((slot: any) => {
                  if (slot.time) {
                    existingSlotTimes.add(slot.time);
                    const slotMinutes = parseTime(slot.time);
                    if (minExistingTime === null || slotMinutes < minExistingTime) minExistingTime = slotMinutes;
                    if (maxExistingTime === null || slotMinutes > maxExistingTime) maxExistingTime = slotMinutes;
                  }
                });
              }

              const duplicateSlots = newSlots.filter(slot => existingSlotTimes.has(slot.time));
              if (duplicateSlots.length > 0) {
                alert("Error", `Time slot(s) already exist: ${duplicateSlots.map(s => s.time).join(", ")}`);
                return;
              }

              let overallStart = startMinutes;
              let overallEnd = endMinutes;
              if (minExistingTime !== null && maxExistingTime !== null) {
                if (startMinutes < minExistingTime) overallStart = startMinutes;
                else overallStart = minExistingTime;
                if (endMinutes > maxExistingTime) overallEnd = endMinutes;
                else overallEnd = maxExistingTime;
              }

              const updates: any = {};
              let slotIndex = existingSlots.length;
              newSlots.forEach((slot) => {
                updates[String(slotIndex)] = { time: slot.time, status: slot.status || "available" };
                slotIndex++;
              });

              await update(timeSlotsRef, updates);

              const scheduleRef = ref(db, `Branches/${branchId}/profile/schedule`);
              const scheduleSnapshot = await get(scheduleRef);
              let scheduleString = scheduleSnapshot.exists() ? scheduleSnapshot.val() : "";
              const scheduleMatch = String(scheduleString).match(/(.*?):\s*\d{1,2}:\d{2}\s*(?:AM|PM)/i);
              const schedulePrefix = scheduleMatch ? scheduleMatch[1].trim() : "Mon-Sat";
              const newScheduleString = `${schedulePrefix}: ${formatTimeTo12Hour(overallStart)} - ${formatTimeTo12Hour(overallEnd)}`;
              await set(scheduleRef, newScheduleString);

              setTimeModalVisible(false);
              alert("Success", "Time slots added successfully.");
            } catch {
              alert("Error", "Failed to add time slots.");
            }
          }}
        />

        <AddBayModal
          visible={bayModalVisible}
          onClose={() => setBayModalVisible(false)}
          onAdd={async (bayId: number) => {
            try {
              const uid = auth.currentUser?.uid;
              if (!uid) { alert("Error", "User not authenticated."); return; }

              const userSnapshot = await get(ref(db, `users/${uid}`));
              if (!userSnapshot.exists()) { alert("Error", "User data not found."); return; }

              const userData = userSnapshot.val();
              const branchIdValue = userData.branchId ?? userData.branch;
              if (!branchIdValue) { alert("Error", "Branch ID not found."); return; }

              const baysRef = ref(db, `Branches/${branchIdValue}/Bays`);
              const baysSnapshot = await get(baysRef);

              if (baysSnapshot.exists()) {
                const baysData = baysSnapshot.val();
                const bayKeyString = String(bayId);

                if (Array.isArray(baysData)) {
                  if (bayId < baysData.length && baysData[bayId] !== null && baysData[bayId] !== undefined) {
                    alert("Error", `Bay ${bayId} already exists.`);
                    return;
                  }
                  while (baysData.length <= bayId) baysData.push(null);
                  baysData[bayId] = { status: "available" };
                  await set(baysRef, baysData);
                } else if (typeof baysData === 'object') {
                  const bayExists = Object.keys(baysData).some(
                    (key) => key === bayKeyString || key === `Bay ${bayId}` || key === `Bay${bayId}` || Number(key) === bayId
                  );
                  if (bayExists) {
                    alert("Error", `Bay ${bayId} already exists.`);
                    return;
                  }
                  await set(ref(db, `Branches/${branchIdValue}/Bays/${bayKeyString}`), { status: "available" });
                }
              } else {
                await set(ref(db, `Branches/${branchIdValue}/Bays/${String(bayId)}`), { status: "available" });
              }

              setBayModalVisible(false);
              alert("Success", `Bay ${bayId} added successfully.`);
            } catch {
              alert("Error", "Failed to add bay.");
            }
          }}
        />

        {AlertComponent}
      </SafeAreaView>
    </View>
  );
}
