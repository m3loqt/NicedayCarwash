import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export interface AddonFormData {
  name: string;
  price: number;
  estimatedTime: number;
  description: string;
}

interface AddAddonModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: AddonFormData) => Promise<void>;
}

export default function AddAddonModal({ visible, onClose, onAdd }: AddAddonModalProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setName("");
    setPrice("");
    setEstimatedTime("");
    setDescription("");
    setError("");
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAdd = async () => {
    setError("");
    if (!name.trim()) { setError("Add-on name is required."); return; }
    const p = parseFloat(price);
    const t = parseInt(estimatedTime);
    if (isNaN(p) || p < 0) { setError("Enter a valid price."); return; }
    if (isNaN(t) || t <= 0) { setError("Enter a valid estimated time (minutes)."); return; }

    setLoading(true);
    try {
      await onAdd({
        name: name.trim(),
        price: p,
        estimatedTime: t,
        description: description.trim(),
      });
      reset();
    } catch {
      setError("Failed to add add-on. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-black/50 justify-end"
      >
        <Pressable className="flex-1" onPress={handleClose} />
        <View className="bg-white rounded-t-xl px-5 pt-5 pb-8">
          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-xl font-bold text-[#1A1A1A]">Add Add-on</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Field label="Add-on Name" value={name} onChangeText={setName} placeholder="e.g. Engine Wash" />
            <Field label="Price ₱" value={price} onChangeText={setPrice} placeholder="0" keyboardType="numeric" />
            <Field label="Est. Time (mins)" value={estimatedTime} onChangeText={setEstimatedTime} placeholder="e.g. 30" keyboardType="numeric" />
            <Field label="Description (optional)" value={description} onChangeText={setDescription} placeholder="Brief description" multiline />

            {!!error && (
              <Text className="text-red-500 text-xs mb-3">{error}</Text>
            )}

            <TouchableOpacity
              className={`bg-[#F9EF08] rounded-2xl py-4 items-center mt-2 ${loading ? 'opacity-60' : ''}`}
              onPress={handleAdd}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#1A1A00" />
              ) : (
                <Text className="text-[14px] font-bold text-[#1A1A00]">Add Add-on</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label, value, onChangeText, placeholder, keyboardType, multiline,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; multiline?: boolean;
}) {
  return (
    <View className="mb-4">
      <Text className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-1.5">{label}</Text>
      <TextInput
        className="bg-[#FAFAFA] border border-[#EEEEEE] rounded-xl px-4 py-3 text-[13px] text-[#1A1A1A]"
        placeholder={placeholder}
        placeholderTextColor="#C4C4C4"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? "top" : "center"}
        style={multiline ? { minHeight: 72 } : { minHeight: 48 }}
      />
    </View>
  );
}
