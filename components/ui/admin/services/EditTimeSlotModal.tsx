import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface EditTimeSlotModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (time: string) => void;
  initialTime: string;
}

export default function EditTimeSlotModal({
  visible,
  onClose,
  onSave,
  initialTime,
}: EditTimeSlotModalProps) {
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
    "8:00 PM",
  ];

  const [selectedTime, setSelectedTime] = useState(initialTime || "8:00 AM");
  const [openDropdown, setOpenDropdown] = useState(false);

  // Update selected time when initialTime changes
  useEffect(() => {
    if (initialTime) {
      setSelectedTime(initialTime);
    }
  }, [initialTime, visible]);

  const handleSave = () => {
    onSave(selectedTime);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/50 justify-center items-center px-6"
      >
        <Pressable
          onPress={() => {}}
          className="w-full bg-white rounded-2xl p-6 border border-gray-200"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-gray-900">
              Edit Time Slot
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View className="relative mb-6">
            <TouchableOpacity
              onPress={() => setOpenDropdown(!openDropdown)}
              className="border border-gray-300 rounded-lg px-4 py-3 flex-row justify-between items-center"
            >
              <Text className="text-gray-800">{selectedTime}</Text>
              <Ionicons
                name={openDropdown ? "chevron-up" : "chevron-down"}
                size={20}
                color="#555"
              />
            </TouchableOpacity>

            {openDropdown && (
              <View className="absolute left-0 right-0 top-14 bg-white border border-gray-300 rounded-lg shadow-lg z-20 max-h-48">
                <ScrollView>
                  {times.map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => {
                        setSelectedTime(t);
                        setOpenDropdown(false);
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

          {/* BUTTONS */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 bg-gray-300 py-3 rounded-full"
            >
              <Text className="text-center text-white font-bold text-lg">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              className="flex-1 bg-[#F9EF08] py-3 rounded-full"
            >
              <Text className="text-center text-white font-bold text-lg">
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
