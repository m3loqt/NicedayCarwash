import { db } from "@/firebase/firebase";
import { useAlert } from "@/hooks/use-alert";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { get, ref, set } from "firebase/database";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";

interface AvailabilityModalProps {
  visible: boolean;
  onClose: () => void;
  onFinish?: (status: boolean) => void;
  branchId: string | null;
  itemId: string | null;
  itemName: string | null;
  type: "service" | "addon";
}

export default function AvailabilityModal({
  visible,
  onClose,
  onFinish,
  branchId,
  itemId,
  itemName,
  type,
}: AvailabilityModalProps) {
  const { alert } = useAlert();
  const [selected, setSelected] = useState<boolean>(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentAvailability, setCurrentAvailability] = useState<boolean | null>(null);

  // Fetching current availability when modal opens
  useEffect(() => {
    if (visible && branchId && itemId) {
      fetchCurrentAvailability();
    } else {
      setCurrentAvailability(null);
    }
  }, [visible, branchId, itemId]);

  const fetchCurrentAvailability = async () => {
    if (!branchId || !itemId) return;

    try {
      const path = type === "service" 
        ? `Branches/${branchId}/Services/${itemId}/isAvailable`
        : `Branches/${branchId}/AddOns/${itemId}/isAvailable`;
      
      const itemRef = ref(db, path);
      const snapshot = await get(itemRef);
      
      if (snapshot.exists()) {
        const isAvailable = snapshot.val();
        setCurrentAvailability(isAvailable === true);
        setSelected(isAvailable === true);
      } else {
        // Defaulting to available if not found
        setCurrentAvailability(true);
        setSelected(true);
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
      setCurrentAvailability(true);
      setSelected(true);
    }
  };

  const handleSave = async () => {
    if (!branchId || !itemId) {
      alert("Error", "Missing information to update availability.");
      return;
    }

    setLoading(true);
    try {
      const path = type === "service"
        ? `Branches/${branchId}/Services/${itemId}/isAvailable`
        : `Branches/${branchId}/AddOns/${itemId}/isAvailable`;
      
      const itemRef = ref(db, path);
      await set(itemRef, selected);

      alert("Success", `${itemName || "Item"} availability has been updated.`);
      onFinish?.(selected);
      onClose();
    } catch (error) {
      console.error("Error updating availability:", error);
      alert("Error", "Failed to update availability.");
    } finally {
      setLoading(false);
    }
  };

  const selectedText = selected ? "Available" : "Unavailable";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={80} tint="light" className="flex-1 justify-center items-center">
        {/* Backdrop pressable area that closes the modal */}
        <Pressable 
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} 
          onPress={onClose} 
        />

        {/* Modal content container */}
        <View 
          className="bg-gray-50 rounded-3xl px-6 py-6 mx-6 w-[80%] max-w-sm relative z-10"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          {/* Close button in top right corner */}
          <TouchableOpacity
            className="absolute top-4 right-4 z-10"
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>

          {/* Title display */}
          <View className="items-center mb-6 mt-2">
            <Text className="text-3xl font-bold text-[#1E1E1E]" numberOfLines={1}>
              Set Availability
            </Text>
          </View>

          {/* Availability dropdown */}
          <View className="mb-6">
            <Text className="text-gray-700 font-medium mb-2">Availability</Text>

            <TouchableOpacity
              onPress={() => setDropdownOpen(!dropdownOpen)}
              className="rounded-lg px-4 py-3 flex-row justify-between items-center bg-white"
            >
              <Text className="text-gray-800">{selectedText}</Text>
              <Ionicons
                name={dropdownOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color="#666"
              />
            </TouchableOpacity>

            {/* Dropdown items list */}
            {dropdownOpen && (
              <View className="mt-2 rounded-lg bg-white">
                {["Available", "Unavailable"].map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => {
                      setSelected(option === "Available");
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

          {/* Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            className="bg-[#F9EF08] rounded-xl py-4 items-center"
          >
            <Text className="text-base font-semibold text-white" numberOfLines={1}>
              {loading ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
}
