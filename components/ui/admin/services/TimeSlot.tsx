import { auth, db } from "@/firebase/firebase";
import { useAlert } from "@/hooks/use-alert";
import { get, onValue, ref, set, update } from "firebase/database";
import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import SetAvailabilityModal from "./SetAvailabilityModal";

interface TimeSlot {
  id: number | string;
  time: string;
  status?: string; // "available" or "unavailable"
  originalKey?: string; // For database operations
}

export default function TimeSlots() {
  const { alert, AlertComponent } = useAlert();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [availabilityModalVisible, setAvailabilityModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Parsing time slots data from database
  const parseTimeSlotsData = (timeSlotsData: any): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    
    if (Array.isArray(timeSlotsData)) {
      timeSlotsData.forEach((slot: any, index: number) => {
        if (slot && slot.time) {
          slots.push({
            id: slot.id || index,
            time: slot.time,
            status: slot.status || "available",
            originalKey: String(index),
          });
        }
      });
    } else if (typeof timeSlotsData === 'object' && timeSlotsData !== null) {
      Object.keys(timeSlotsData).forEach((key) => {
        const slot = timeSlotsData[key];
        if (slot && slot.time) {
          slots.push({
            id: slot.id || key,
            time: slot.time,
            status: slot.status || "available",
            originalKey: key,
          });
        }
      });
    }
    
    // Sorting by time
    slots.sort((a, b) => {
      const parseTime = (timeStr: string): number => {
        const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/i);
        if (!match) return 0;
        
        let hour = parseInt(match[1], 10);
        const period = match[3].toUpperCase();
        
        if (period === "PM" && hour !== 12) hour += 12;
        if (period === "AM" && hour === 12) hour = 0;
        
        return hour * 60 + parseInt(match[2], 10);
      };
      
      return parseTime(a.time) - parseTime(b.time);
    });
    
    return slots;
  };

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    let unsubscribeTimeSlots: (() => void) | null = null;

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

        // Setting up real-time listener for time slots
        const timeSlotsRef = ref(db, `Branches/${branchIdValue}/TimeSlots`);
        
        unsubscribeTimeSlots = onValue(timeSlotsRef, (snapshot) => {
          setLoading(false);
          
          if (snapshot.exists()) {
            const timeSlotsData = snapshot.val();
            const slots = parseTimeSlotsData(timeSlotsData);
            setTimeSlots(slots);
          } else {
            setTimeSlots([]);
          }
        }, (error) => {
          console.error("Error listening to time slots:", error);
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
      if (unsubscribeTimeSlots) {
        unsubscribeTimeSlots();
      }
    };
  }, []);

  const handleSetAvailability = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setAvailabilityModalVisible(true);
  };

  const handleSaveAvailability = async (newStatus: string) => {
    try {
      if (!branchId || !selectedSlot || !selectedSlot.originalKey) {
        alert("Error", "Missing timeslot information.");
        return;
      }

      const timeSlotsRef = ref(db, `Branches/${branchId}/TimeSlots`);
      const timeSlotsSnapshot = await get(timeSlotsRef);
      
      if (timeSlotsSnapshot.exists()) {
        const timeSlotsData = timeSlotsSnapshot.val();
        
        if (Array.isArray(timeSlotsData)) {
          const index = parseInt(selectedSlot.originalKey);
          const updates: any = {};
          updates[`${index}/status`] = newStatus;
          await update(timeSlotsRef, updates);
        } else if (typeof timeSlotsData === 'object') {
          // Updating status directly for object format
          const slotRef = ref(db, `Branches/${branchId}/TimeSlots/${selectedSlot.originalKey}`);
          // Getting current slot data to preserve structure
          const slotSnapshot = await get(slotRef);
          if (slotSnapshot.exists()) {
            const currentSlot = slotSnapshot.val();
            if (typeof currentSlot === 'object') {
              await update(slotRef, { ...currentSlot, status: newStatus });
            } else {
              // Converting to object if it's just a string or primitive
              await set(slotRef, { time: selectedSlot.time, status: newStatus });
            }
          }
        }
      }

      // Real-time listener will update automatically
      setAvailabilityModalVisible(false);
      setSelectedSlot(null);
      alert("Success", `Timeslot ${selectedSlot.time} availability has been updated.`);
    } catch (error) {
      console.error("Error updating timeslot status:", error);
      alert("Error", "Failed to update timeslot status.");
    }
  };

  if (loading) {
    return (
      <View className="py-4">
        <Text className="text-center text-gray-500 text-sm" style={{ fontFamily: 'Inter_400Regular' }}>Loading time slots...</Text>
      </View>
    );
  }

  // Parses "8:00 AM" -> { period: "AM", numbers: "8:00" }
  const parseTimeDisplay = (timeStr: string): { period: string; numbers: string } => {
    const match = timeStr.match(/^(\d{1,2}:\d{2})\s*(AM|PM|am|pm)?$/i);
    if (match) {
      return {
        numbers: match[1] ?? timeStr,
        period: (match[2] ?? "").toUpperCase(),
      };
    }
    return { numbers: timeStr, period: "" };
  };

  if (timeSlots.length === 0) {
    return (
      <View className="py-4 rounded-lg bg-[#FAFAFA] px-4 py-4">
        <Text className="text-center text-gray-500 text-sm" style={{ fontFamily: 'Inter_400Regular' }}>No time slots available</Text>
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
      {timeSlots.map((item, index) => {
        const { period, numbers } = parseTimeDisplay(item.time);
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.8}
            onPress={() => handleSetAvailability(item)}
            style={{
              width: 56,
              height: 68,
              marginLeft: index === 0 ? 0 : 8,
              opacity: item.status === "unavailable" ? 0.5 : 1,
            }}
            className="rounded-lg bg-[#FAFAFA] flex-col overflow-hidden"
          >
            <View className="flex-1 justify-center items-center pt-1.5 pb-1.5">
              {period ? (
                <Text
                  className="text-[#1E1E1E] font-bold text-base uppercase"
                  style={{ fontFamily: 'Inter_700Bold' }}
                >
                  {period}
                </Text>
              ) : null}
              <Text
                className="text-[#1E1E1E] font-bold text-sm mt-0.5"
                style={{ fontFamily: 'Inter_700Bold' }}
              >
                {numbers}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
    {AlertComponent}
    <SetAvailabilityModal
      visible={availabilityModalVisible}
      onClose={() => {
        setAvailabilityModalVisible(false);
        setSelectedSlot(null);
      }}
      onSave={handleSaveAvailability}
      currentStatus={selectedSlot?.status || "available"}
      bayName={selectedSlot?.time || ""}
    />
  </>
  );
}
