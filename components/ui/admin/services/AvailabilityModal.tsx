import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";

export default function AvailabilityModal({
  visible,
  onClose,
  onFinish,
}: {
  visible: boolean;
  onClose: () => void;
  onFinish: (status: string) => void;
}) {
  const [selected, setSelected] = useState("Available");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* DARK BACKGROUND OVERLAY */}
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/50 justify-center items-center px-6"
      >
        {/* CARD */}
        <Pressable 
          className="w-full bg-white rounded-2xl p-6 border border-gray-200"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
          onPress={() => {}}
        >
          <Text className="text-xl font-bold text-center text-gray-900 mb-6">
            Set Availability
          </Text>

          {/* DROPDOWN */}
          <View className="mb-6">
            <Text className="text-base text-gray-700 mb-2">Availability</Text>

            <TouchableOpacity
              onPress={() => setDropdownOpen(!dropdownOpen)}
              className="border border-gray-300 rounded-lg px-4 py-3 flex-row justify-between items-center"
            >
              <Text className="text-gray-800">{selected}</Text>
              <Ionicons
                name={dropdownOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color="#555"
              />
            </TouchableOpacity>

            {/* DROPDOWN ITEMS */}
            {dropdownOpen && (
              <View className="mt-2 border border-gray-300 rounded-lg bg-white">
                {["Available", "Unavailable"].map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => {
                      setSelected(option);
                      setDropdownOpen(false);
                    }}
                    className="px-4 py-3 border-b border-gray-200 last:border-0"
                  >
                    <Text className="text-gray-800">{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* FINISH BUTTON */}
          <TouchableOpacity
            onPress={() => onFinish(selected)}
            className="bg-[#F9EF08] py-3 rounded-full"
          >
            <Text className="text-center font-bold text-white text-lg">
              Finish
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
