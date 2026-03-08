import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Modal,
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
    "5:00 AM", "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM",
    "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM",
    "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM",
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
    const startMinutes = parseTime(t);
    const validEnds = times.filter((time) => parseTime(time) >= startMinutes + 60);
    if (validEnds.length > 0 && !validEnds.includes(endTime)) {
      setEndTime(validEnds[0]);
    }
  };

  const handleAdd = () => {
    onAdd(startTime, endTime);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/40 justify-end">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />
        <View className="bg-white rounded-t-xl px-5 pt-4 pb-8">
          <View className="items-center pb-2">
            <View className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
          </View>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[17px] font-bold text-[#1A1A1A]" style={{ fontFamily: "Inter_700Bold" }}>
              Add time slot
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#999" />
            </TouchableOpacity>
          </View>

          <Text className="text-[#666] text-sm mb-2" style={{ fontFamily: "Inter_400Regular" }}>
            Start time
          </Text>
          <View className="mb-4 relative">
            <TouchableOpacity
              onPress={() => { setOpenStart(!openStart); setOpenEnd(false); }}
              className="bg-[#FAFAFA] rounded-lg px-4 py-3 flex-row justify-between items-center"
            >
              <Text className="text-[#1E1E1E] text-base" style={{ fontFamily: "Inter_500Medium" }}>{startTime}</Text>
              <Ionicons name={openStart ? "chevron-up" : "chevron-down"} size={20} color="#666" />
            </TouchableOpacity>
            {openStart && (
              <View className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg z-20 max-h-48">
                <ScrollView>
                  {times.slice(0, times.length - 1).map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => handleSelectStartTime(t)}
                      className="px-4 py-3 border-b border-[#EEEEEE]/50 last:border-0"
                    >
                      <Text className="text-[#1E1E1E] text-sm" style={{ fontFamily: "Inter_400Regular" }}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <Text className="text-[#666] text-sm mb-2" style={{ fontFamily: "Inter_400Regular" }}>
            End time
          </Text>
          <View className="mb-6 relative">
            <TouchableOpacity
              onPress={() => { setOpenEnd(!openEnd); setOpenStart(false); }}
              className="bg-[#FAFAFA] rounded-lg px-4 py-3 flex-row justify-between items-center"
            >
              <Text className="text-[#1E1E1E] text-base" style={{ fontFamily: "Inter_500Medium" }}>{endTime}</Text>
              <Ionicons name={openEnd ? "chevron-up" : "chevron-down"} size={20} color="#666" />
            </TouchableOpacity>
            {openEnd && (
              <View className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg z-20 max-h-48">
                <ScrollView>
                  {filteredEndTimes.map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => { setEndTime(t); setOpenEnd(false); }}
                      className="px-4 py-3 border-b border-[#EEEEEE]/50 last:border-0"
                    >
                      <Text className="text-[#1E1E1E] text-sm" style={{ fontFamily: "Inter_400Regular" }}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={handleAdd}
            className="bg-[#F9EF08] rounded-lg py-3 items-center"
          >
            <Text className="text-[#1A1A1A] font-bold" style={{ fontFamily: "Inter_700Bold" }}>
              Add time slot
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
