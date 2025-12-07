import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import AvailabilityModal from "./AvailabilityModal";

export default function AddOns() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAddonId, setSelectedAddonId] = useState<number | null>(null);

  const data = [
    { id: 1, name: "Armour All", price: 400 },
    { id: 2, name: "Under Chassis", price: 100 },
  ];

  const handleEditAvailability = (itemId: number) => {
    setSelectedAddonId(itemId);
    setModalVisible(true);
  };

  return (
    <>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        {data.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => handleEditAvailability(item.id)}
            style={{ 
              width: 170, 
              height: 90,
            }}
            className="rounded-2xl bg-white mx-2 border-2 border-transparent flex-col p-1"
          >
            <View className="flex-1 justify-center px-5">
              <Text className="text-xl font-semibold text-gray-400 text-center">
                {item.name}
              </Text>
            </View>
            <View className="bg-yellow-300 px-4 py-3 rounded-b-2xl items-center justify-center">
              <Text className="text-white font-medium text-center text-xl">
                ₱{item.price}.00
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* MODAL */}
      <AvailabilityModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedAddonId(null);
        }}
        onFinish={(status) => {
          console.log("Selected availability:", status);
          setModalVisible(false);
          setSelectedAddonId(null);
        }}
      />
    </>
  );
}
