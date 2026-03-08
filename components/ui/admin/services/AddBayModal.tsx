import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";

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
    const id = parseInt(bayId, 10);
    if (isNaN(id) || id <= 0) return;
    onAdd(id);
    setBayId("");
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
              Add bay
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#999" />
            </TouchableOpacity>
          </View>

          <Text className="text-[#666] text-sm mb-2" style={{ fontFamily: "Inter_400Regular" }}>
            Bay number
          </Text>
          <TextInput
            className="bg-[#FAFAFA] rounded-lg px-4 py-3 text-[#1E1E1E] text-base mb-6"
            style={{ fontFamily: "Inter_400Regular" }}
            placeholder="e.g. 1"
            placeholderTextColor="#999"
            value={bayId}
            onChangeText={(text) => setBayId(text.replace(/[^0-9]/g, ""))}
            keyboardType="numeric"
          />

          <TouchableOpacity
            onPress={handleAdd}
            className="bg-[#F9EF08] rounded-lg py-3 items-center"
          >
            <Text className="text-[#1A1A1A] font-bold" style={{ fontFamily: "Inter_700Bold" }}>
              Add bay
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
