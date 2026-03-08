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

export interface ServiceFormData {
  name: string;
  sedanPrice: number;
  suvPrice: number;
  pickupPrice: number;
  estimatedTime: number;
  description: string;
}

interface AddServiceModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: ServiceFormData) => Promise<void>;
}

export default function AddServiceModal({ visible, onClose, onAdd }: AddServiceModalProps) {
  const [name, setName] = useState("");
  const [sedanPrice, setSedanPrice] = useState("");
  const [suvPrice, setSuvPrice] = useState("");
  const [pickupPrice, setPickupPrice] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setName("");
    setSedanPrice("");
    setSuvPrice("");
    setPickupPrice("");
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
    if (!name.trim()) { setError("Service name is required."); return; }
    const sedan = parseFloat(sedanPrice);
    const suv = parseFloat(suvPrice);
    const pickup = parseFloat(pickupPrice);
    const time = parseInt(estimatedTime);
    if (isNaN(sedan) || sedan < 0) { setError("Enter a valid sedan price."); return; }
    if (isNaN(suv) || suv < 0) { setError("Enter a valid SUV price."); return; }
    if (isNaN(pickup) || pickup < 0) { setError("Enter a valid pickup price."); return; }
    if (isNaN(time) || time <= 0) { setError("Enter a valid estimated time (minutes)."); return; }

    setLoading(true);
    try {
      await onAdd({
        name: name.trim(),
        sedanPrice: sedan,
        suvPrice: suv,
        pickupPrice: pickup,
        estimatedTime: time,
        description: description.trim(),
      });
      reset();
    } catch {
      setError("Failed to add service. Please try again.");
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
        <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-xl font-bold text-[#1A1A1A]">Add Service</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Field label="Service Name" value={name} onChangeText={setName} placeholder="e.g. Full Detail" />
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Field label="Sedan ₱" value={sedanPrice} onChangeText={setSedanPrice} placeholder="0" keyboardType="numeric" />
              </View>
              <View className="flex-1">
                <Field label="SUV ₱" value={suvPrice} onChangeText={setSuvPrice} placeholder="0" keyboardType="numeric" />
              </View>
              <View className="flex-1">
                <Field label="Pickup ₱" value={pickupPrice} onChangeText={setPickupPrice} placeholder="0" keyboardType="numeric" />
              </View>
            </View>
            <Field label="Est. Time (mins)" value={estimatedTime} onChangeText={setEstimatedTime} placeholder="e.g. 45" keyboardType="numeric" />
            <Field label="Description (optional)" value={description} onChangeText={setDescription} placeholder="Comma-separated features" multiline />

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
                <Text className="text-[14px] font-bold text-[#1A1A00]">Add Service</Text>
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
