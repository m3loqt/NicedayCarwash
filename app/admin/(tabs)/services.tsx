import { auth, db } from "@/firebase/firebase";
import { useAlert } from "@/hooks/use-alert";
import { get, ref, set, update } from "firebase/database";
import { useState } from "react";
import { ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AddBayModal from "../../../components/ui/admin/services/AddBayModal";
import AddOns from "../../../components/ui/admin/services/AddOns";
import AddTimeSlotModal from "../../../components/ui/admin/services/AddTimeSlotModal";
import Bays from "../../../components/ui/admin/services/Bays";
import Services from "../../../components/ui/admin/services/Services";
import TimeSlots from "../../../components/ui/admin/services/TimeSlot";

export default function AdminServicesScreen() {
  const { alert, AlertComponent } = useAlert();
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [bayModalVisible, setBayModalVisible] = useState(false);

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
          <Text className="text-sm font-semibold text-gray-500 mb-2" style={{ fontFamily: 'Inter_600SemiBold' }}>
            Services
          </Text>
          <Services />

          {/* Add-ons */}
          <Text className="text-sm font-semibold text-gray-500 mt-6 mb-2" style={{ fontFamily: 'Inter_600SemiBold' }}>
            Add-ons
          </Text>
          <AddOns />

          {/* Time Slots – full-width row so horizontal list isn’t cut on the right */}
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

          {/* Bays – full-width row so list isn’t cut on the right */}
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

        {/* MODAL */}
      <AddTimeSlotModal
        visible={timeModalVisible}
        onClose={() => setTimeModalVisible(false)}
        onAdd={async (start, end) => {
          try {
            const uid = auth.currentUser?.uid;
            if (!uid) {
              alert("Error", "User not authenticated.");
              return;
            }

            // Getting admin's branchId
            const userSnapshot = await get(ref(db, `users/${uid}`));
            if (!userSnapshot.exists()) {
              alert("Error", "User data not found.");
              return;
            }

            const userData = userSnapshot.val();
            const branchId = userData.branchId || userData.branch;
            if (!branchId) {
              alert("Error", "Branch ID not found.");
              return;
            }

            // Parsing times and generating hourly slots
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
            
            // Generating hourly slots
            const newSlots: any[] = [];
            for (let minutes = startMinutes; minutes < endMinutes; minutes += 60) {
              const hour = Math.floor(minutes / 60);
              const hour12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
              const period = hour >= 12 ? "PM" : "AM";
              newSlots.push({
                time: `${hour12}:00 ${period}`,
                status: "available",
              });
            }

            // Checking if TimeSlots already exists
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

              // Collecting existing time strings and finding min/max
              existingSlots.forEach((slot: any) => {
                if (slot.time) {
                  existingSlotTimes.add(slot.time);
                  const slotMinutes = parseTime(slot.time);
                  if (minExistingTime === null || slotMinutes < minExistingTime) {
                    minExistingTime = slotMinutes;
                  }
                  if (maxExistingTime === null || slotMinutes > maxExistingTime) {
                    maxExistingTime = slotMinutes;
                  }
                }
              });
            }

            // Checking if any new slot already exists
            const duplicateSlots = newSlots.filter(slot => existingSlotTimes.has(slot.time));
            if (duplicateSlots.length > 0) {
              alert("Error", `Time slot(s) already exist: ${duplicateSlots.map(s => s.time).join(", ")}`);
              return;
            }

            // Determining the overall time range
            let overallStart = startMinutes;
            let overallEnd = endMinutes;
            
            if (minExistingTime !== null && maxExistingTime !== null) {
              // Adjusting start if new slots extend before existing range
              if (startMinutes < minExistingTime) {
                overallStart = startMinutes;
              } else {
                overallStart = minExistingTime;
              }
              
              // Adjusting end if new slots extend after existing range
              if (endMinutes > maxExistingTime) {
                overallEnd = endMinutes;
              } else {
                overallEnd = maxExistingTime;
              }
            }

            // Creating individual time slot nodes under TimeSlots
            const updates: any = {};
            let slotIndex = existingSlots.length;
            
            newSlots.forEach((slot) => {
              const slotKey = String(slotIndex);
              updates[slotKey] = {
                time: slot.time,
                status: slot.status || "available",
              };
              slotIndex++;
            });

            // Updating TimeSlots with new individual slots
            await update(timeSlotsRef, updates);

            // Updating schedule node if needed
            const scheduleRef = ref(db, `Branches/${branchId}/profile/schedule`);
            const scheduleSnapshot = await get(scheduleRef);
            
            let scheduleString = scheduleSnapshot.exists() ? scheduleSnapshot.val() : "";
            
            // Extracting existing schedule format (e.g., "Mon-Sat: 10:00 AM - 6:00 PM")
            const scheduleMatch = String(scheduleString).match(/(.*?):\s*(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/i);
            
            let schedulePrefix = "Mon-Sat";
            if (scheduleMatch) {
              schedulePrefix = scheduleMatch[1].trim() || "Mon-Sat";
            }

            // Formatting new schedule with updated times
            const newStartTime = formatTimeTo12Hour(overallStart);
            const newEndTime = formatTimeTo12Hour(overallEnd);
            const newScheduleString = `${schedulePrefix}: ${newStartTime} - ${newEndTime}`;
            
            await set(scheduleRef, newScheduleString);
            
            setTimeModalVisible(false);
            alert("Success", "Time slots added successfully.");
          } catch (error) {
            console.error("Error adding time slots:", error);
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
            if (!uid) {
              alert("Error", "User not authenticated.");
              return;
            }

            // Getting admin's branchId
            const userSnapshot = await get(ref(db, `users/${uid}`));
            if (!userSnapshot.exists()) {
              alert("Error", "User data not found.");
              return;
            }

            const userData = userSnapshot.val();
            const branchIdValue = userData.branchId || userData.branch;
            if (!branchIdValue) {
              alert("Error", "Branch ID not found.");
              return;
            }

            // Fetching existing bays
            const baysRef = ref(db, `Branches/${branchIdValue}/Bays`);
            const baysSnapshot = await get(baysRef);
            
            if (baysSnapshot.exists()) {
              const baysData = baysSnapshot.val();
              
              if (Array.isArray(baysData)) {
                // For arrays, the index IS the bay number
                // Checking if the index already exists and is not null
                if (bayId < baysData.length && baysData[bayId] !== null && baysData[bayId] !== undefined) {
                  alert("Error", `Bay ${bayId} already exists.`);
                  return;
                }
                
                // Ensuring array is large enough (array indices start at the bay number)
                while (baysData.length <= bayId) {
                  baysData.push(null);
                }
                
                // Adding new bay with status: "available" at the index matching bayId
                baysData[bayId] = { status: "available" };
                await set(baysRef, baysData);
              } else if (typeof baysData === 'object') {
                // Checking if bay number already exists as a key
                const bayKeyString = String(bayId);
                const allKeys = Object.keys(baysData);
                
                // Checking all keys for a match
                let bayExists = false;
                for (const key of allKeys) {
                  // Converting key to number and comparing with bayId
                  const keyAsNumber = Number(key);
                  if (!isNaN(keyAsNumber) && keyAsNumber === bayId) {
                    bayExists = true;
                    break;
                  }
                  // Direct string comparison
                  if (key === bayKeyString) {
                    bayExists = true;
                    break;
                  }
                  // Legacy format checks (Bay 1, Bay1, etc.)
                  if (key === `Bay ${bayId}` || key === `Bay${bayId}`) {
                    bayExists = true;
                    break;
                  }
                }
                
                if (bayExists) {
                  alert("Error", `Bay ${bayId} already exists.`);
                  return;
                }
                
                // Adding new bay with status: "available" using numeric key (as string)
                const newBay = { status: "available" };
                const bayRef = ref(db, `Branches/${branchIdValue}/Bays/${bayKeyString}`);
                await set(bayRef, newBay);
              } else {
                // Creating object format by default (matching database structure)
                const newBay = { status: "available" };
                const bayKeyString = String(bayId);
                const bayRef = ref(db, `Branches/${branchIdValue}/Bays/${bayKeyString}`);
                await set(bayRef, newBay);
              }
            } else {
              // Creating object format by default (matching database structure)
              const newBay = { status: "available" };
              const bayKeyString = String(bayId);
              const bayRef = ref(db, `Branches/${branchIdValue}/Bays/${bayKeyString}`);
              await set(bayRef, newBay);
            }
            
            setBayModalVisible(false);
            alert("Success", `Bay ${bayId} added successfully.`);
          } catch (error) {
            console.error("Error adding bay:", error);
            alert("Error", "Failed to add bay.");
          }
        }}
      />
      {AlertComponent}
      </SafeAreaView>
    </View>
  );
}
