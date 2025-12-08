import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useEffect, useState } from "react";
import {
    Modal,
    Pressable,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface SetAvailabilityModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (status: string) => void;
  currentStatus: string;
  bayName: string;
}

export default function SetAvailabilityModal({
  visible,
  onClose,
  onSave,
  currentStatus,
  bayName,
}: SetAvailabilityModalProps) {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus || "available");

  useEffect(() => {
    if (visible) {
      setSelectedStatus(currentStatus || "available");
    }
  }, [visible, currentStatus]);

  const handleSave = () => {
    onSave(selectedStatus);
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
              Set Availability
            </Text>
          </View>

          <Text className="text-gray-600 mb-4 text-center">Bay: {bayName}</Text>

          {/* Availability Options */}
          <View className="mb-6">
            <TouchableOpacity
              onPress={() => setSelectedStatus("available")}
              className={`bg-white rounded-xl py-2.5 px-4 mb-3 border ${
                selectedStatus === "available" 
                  ? "border-[#F9EF08]" 
                  : "border-gray-100"
              }`}
            >
              <View className="flex-row items-center">
                <View
                  className={`w-5 h-5 rounded-full mr-3 ${
                    selectedStatus === "available"
                      ? "bg-[#F9EF08]"
                      : "border border-gray-400"
                  }`}
                >
                  {selectedStatus === "available" && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
                <Text className="text-base text-[#1E1E1E] font-normal">Available</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedStatus("unavailable")}
              className={`bg-white rounded-xl py-2.5 px-4 border ${
                selectedStatus === "unavailable" 
                  ? "border-[#F9EF08]" 
                  : "border-gray-100"
              }`}
            >
              <View className="flex-row items-center">
                <View
                  className={`w-5 h-5 rounded-full mr-3 ${
                    selectedStatus === "unavailable"
                      ? "bg-[#F9EF08]"
                      : "border border-gray-400"
                  }`}
                >
                  {selectedStatus === "unavailable" && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
                <Text className="text-base text-[#1E1E1E] font-normal">Unavailable</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Button */}
          <TouchableOpacity
            className="bg-[#F9EF08] rounded-xl py-4 items-center"
            onPress={handleSave}
          >
            <Text className="text-base font-semibold text-white">
              Save
            </Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
}
