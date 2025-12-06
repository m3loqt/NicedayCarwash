import { Ionicons } from "@expo/vector-icons";
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
  ];

  const parseTime = (time: string) => {
    const [hourMin, meridiem] = time.split(" ");
    const [h, m] = hourMin.split(":").map(Number);
    let hour = h;
    if (meridiem === "PM" && hour !== 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
    return hour * 60 + m;
  };

  const [startTime, setStartTime] = useState("8:00 AM");
  const [endTime, setEndTime] = useState("9:00 AM");

  const [openStart, setOpenStart] = useState(false);
  const [openEnd, setOpenEnd] = useState(false);

  const filteredEndTimes = useMemo(() => {
    const startMinutes = parseTime(startTime);
    return times.filter((t) => parseTime(t) >= startMinutes + 60);
  }, [startTime]);

  const handleSelectStartTime = (t: string) => {
    setStartTime(t);
    setOpenStart(false);
    const startMinutes = parseTime(t);
    const firstValid = times.find((time) => parseTime(time) >= startMinutes + 60);
    if (firstValid) setEndTime(firstValid);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/50 justify-center items-center px-6"
      >
        <Pressable
          onPress={() => {}}
          className="w-full bg-white rounded-2xl p-6"
        >
          <Text className="text-xl font-bold text-center text-gray-900 mb-6">
            Add Time Slot
          </Text>

          <View className="relative">
            {/* START TIME DROPDOWN */}
            <TouchableOpacity
              onPress={() => {
                setOpenStart(!openStart);
                setOpenEnd(false);
              }}
              className="border border-gray-300 rounded-lg px-4 py-3 flex-row justify-between items-center mb-4"
            >
              <Text className="text-gray-800">{startTime}</Text>
              <Ionicons
                name={openStart ? "chevron-up" : "chevron-down"}
                size={20}
                color="#555"
              />
            </TouchableOpacity>

            {openStart && (
              <View className="absolute left-0 right-0 top-14 bg-white border border-gray-300 rounded-lg shadow-lg z-20 max-h-48">
                <ScrollView>
                  {times.slice(0, times.length - 1).map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => handleSelectStartTime(t)}
                      className="px-4 py-3 border-b border-gray-200 last:border-0"
                    >
                      <Text className="text-gray-700">{t}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* END TIME DROPDOWN */}
            <TouchableOpacity
              onPress={() => {
                setOpenEnd(!openEnd);
                setOpenStart(false);
              }}
              className="border border-gray-300 rounded-lg px-4 py-3 flex-row justify-between items-center"
            >
              <Text className="text-gray-800">{endTime}</Text>
              <Ionicons
                name={openEnd ? "chevron-up" : "chevron-down"}
                size={20}
                color="#555"
              />
            </TouchableOpacity>

            {openEnd && (
              <View className="absolute left-0 right-0 top-36 bg-white border border-gray-300 rounded-lg shadow-lg z-20 max-h-48">
                <ScrollView>
                  {filteredEndTimes.map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => {
                        setEndTime(t);
                        setOpenEnd(false);
                      }}
                      className="px-4 py-3 border-b border-gray-200 last:border-0"
                    >
                      <Text className="text-gray-700">{t}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* BUTTON */}
          <TouchableOpacity
            onPress={() => onAdd(startTime, endTime)}
            className="bg-[#F9EF08] py-3 rounded-full mt-8"
          >
            <Text className="text-center text-white font-bold text-lg">
              Add Time Slot
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
