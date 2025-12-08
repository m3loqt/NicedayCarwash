import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function AddTimeSlotModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (start: string, end: string) => void;
}) {
  const times = [
    "5:00 AM",
    "6:00 AM",
    "7:00 AM",
    "8:00 AM",
    "9:00 AM",
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "1:00 PM",
    "2:00 PM",
    "3:00 PM",
    "4:00 PM",
    "5:00 PM",
    "6:00 PM",
    "7:00 PM",
    "8:00 PM",
    "9:00 PM",
    "10:00 PM",
  ];

  const parseTime = (time: string) => {
    const [hourMin, meridiem] = time.split(" ");
    const [h, m] = hourMin.split(":").map(Number);
    let hour = h;
    if (meridiem === "PM" && hour !== 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
    return hour * 60 + m;
  };

  const [startTime, setStartTime] = useState("5:00 AM");
  const [endTime, setEndTime] = useState("6:00 AM");

  const [openStart, setOpenStart] = useState(false);
  const [openEnd, setOpenEnd] = useState(false);

  const filteredEndTimes = useMemo(() => {
    const startMinutes = parseTime(startTime);
    return times.filter((t) => parseTime(t) >= startMinutes + 60);
  }, [startTime]);

  const handleSelectStartTime = (t: string) => {
    setStartTime(t);
    setOpenStart(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={80} tint="light" className="flex-1 justify-center items-center">
        {/* Backdrop: tapping this closes the modal */}
        <Pressable 
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} 
          onPress={onClose} 
        />

        {/* Modal Content */}
        <View 
          className="bg-gray-50 rounded-3xl px-6 py-6 mx-6 w-[80%] max-w-sm relative z-10 border border-gray-100"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          {/* Close Button - Top Right */}
          <TouchableOpacity
            className="absolute top-4 right-4 z-10"
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>

          {/* Title - Centered and Bigger */}
          <View className="items-center mb-6 mt-2">
            <Text className="text-3xl font-bold text-[#1E1E1E]">
              Add Time Slot
            </Text>
          </View>

          <View className="relative mb-6">
            {/* START TIME ROW */}
            <View className="flex-row items-center mb-4">
              <Text className="text-gray-700 text-sm font-medium mr-3" style={{ width: 70 }}>Start Time</Text>
              <View className="flex-1 relative">
                <TouchableOpacity
                  onPress={() => {
                    setOpenStart(!openStart);
                    setOpenEnd(false);
                  }}
                  className="border border-gray-100 rounded-lg px-4 py-2 flex-row justify-between items-center bg-white"
                  style={{ minHeight: 20 }}
                >
                  <Text className="text-gray-800 text-sm">{startTime}</Text>
                  <Ionicons
                    name={openStart ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#555"
                  />
                </TouchableOpacity>

                {openStart && (
                  <View className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg z-20 max-h-48">
                    <ScrollView>
                      {times.slice(0, times.length - 1).map((t) => (
                        <TouchableOpacity
                          key={t}
                          onPress={() => handleSelectStartTime(t)}
                          className="px-4 py-3 border-b border-gray-100 last:border-0"
                        >
                          <Text className="text-gray-700">{t}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>

            {/* END TIME ROW */}
            <View className="flex-row items-center">
              <Text className="text-gray-700 text-sm font-medium mr-3" style={{ width: 70 }}>End Time</Text>
              <View className="flex-1 relative">
                <TouchableOpacity
                  onPress={() => {
                    setOpenEnd(!openEnd);
                    setOpenStart(false);
                  }}
                  className="border border-gray-100 rounded-lg px-4 py-2 flex-row justify-between items-center bg-white"
                  style={{ minHeight: 20 }}
                >
                  <Text className="text-gray-800 text-sm">{endTime}</Text>
                  <Ionicons
                    name={openEnd ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#555"
                  />
                </TouchableOpacity>

                {openEnd && (
                  <View className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg z-20 max-h-48">
                    <ScrollView>
                      {filteredEndTimes.map((t) => (
                        <TouchableOpacity
                          key={t}
                          onPress={() => {
                            setEndTime(t);
                            setOpenEnd(false);
                          }}
                          className="px-4 py-3 border-b border-gray-100 last:border-0"
                        >
                          <Text className="text-gray-700">{t}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Button */}
          <TouchableOpacity
            onPress={() => onAdd(startTime, endTime)}
            className="bg-[#F9EF08] rounded-xl py-4 items-center"
          >
            <Text className="text-base font-semibold text-white" numberOfLines={1}>
              Add Time Slot
            </Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
}
