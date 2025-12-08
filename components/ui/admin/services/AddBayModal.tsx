import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useState } from "react";
import {
    Modal,
    Pressable,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface AddBayModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (bayId: number) => void;
}

export default function AddBayModal({
  visible,
  onClose,
  onAdd,
}: AddBayModalProps) {
  const [bayId, setBayId] = useState("");

  const handleAdd = () => {
    const id = parseInt(bayId);
    if (isNaN(id) || id <= 0) {
      return;
    }
    onAdd(id);
    setBayId(""); // Reset after adding
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
            <Text className="text-3xl font-bold text-[#1E1E1E]" numberOfLines={1}>
              Add Bay
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-gray-700 font-medium mb-2">Bay ID</Text>
            <TextInput
              className="border border-gray-100 rounded-lg px-4 py-3 text-gray-800 bg-white"
              placeholder="eg. 1"
              value={bayId}
              onChangeText={(text) => {
                // Only allow numeric input
                const numericValue = text.replace(/[^0-9]/g, '');
                setBayId(numericValue);
              }}
              keyboardType="numeric"
            />
          </View>

          {/* Button */}
          <TouchableOpacity
            onPress={handleAdd}
            className="bg-[#F9EF08] rounded-xl py-4 items-center"
          >
            <Text className="text-base font-semibold text-white" numberOfLines={1}>
              Add Bay
            </Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
}
