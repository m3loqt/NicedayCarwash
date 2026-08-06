import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    Modal,
    Pressable,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface EditBayModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (bayId: string | number) => void;
  initialBay: { id: string | number; name: string } | null;
}

export default function EditBayModal({
  visible,
  onClose,
  onSave,
  initialBay,
}: EditBayModalProps) {
  const [bayId, setBayId] = useState<string>("");

  useEffect(() => {
    if (initialBay) {
      setBayId(String(initialBay.id));
    }
  }, [initialBay, visible]);

  const handleSave = () => {
    const numericId = parseInt(bayId.replace(/[^\d]/g, ""), 10);
    if (isNaN(numericId) || numericId <= 0) {
      return;
    }

    onSave(numericId);
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
              Edit Bay
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View className="mb-6">
            <Text className="text-gray-700 font-medium mb-2">Bay number</Text>
            <TextInput
              className="bg-[#FAFAFA] rounded-lg px-4 py-3 text-gray-800"
              placeholder="Enter bay number"
              value={bayId}
              onChangeText={(text) => setBayId(text.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
            />
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
