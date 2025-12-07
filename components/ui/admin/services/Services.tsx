import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import AvailabilityModal from "./AvailabilityModal";

export default function Services() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);

  const data = [
    { id: 1, name: "Body Wash", sedan: 180, suv: 220, pickup: 270 },
    { id: 2, name: "Value Wash", sedan: 150, suv: 200, pickup: 250 },
  ];

  const handleEditAvailability = (itemId: number) => {
    setSelectedServiceId(itemId);
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
              width: 220, 
              height: 140,
            }}
            className="rounded-2xl bg-white mx-2 border-2 border-transparent flex-col p-1"
          >
            <View className="flex-1 justify-center px-5">
              <Text className="text-2xl font-semibold text-gray-400 text-center">
                {item.name}
              </Text>
            </View>

            <View className="bg-yellow-300 px-4 py-2 rounded-b-2xl">
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-white font-medium text-lg">Sedan</Text>
                <Text className="text-white font-medium text-lg">
                  ₱{item.sedan}.00
                </Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-white font-medium text-lg">SUV</Text>
                <Text className="text-white font-medium text-lg">₱{item.suv}.00</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-white font-medium text-lg">Pick Up</Text>
                <Text className="text-white font-medium text-lg">
                  ₱{item.pickup}.00
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* AVAILABILITY MODAL */}
      <AvailabilityModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedServiceId(null);
        }}
        onFinish={(status) => {
          console.log("Selected availability:", status);
          setModalVisible(false);
          setSelectedServiceId(null);
        }}
      />
    </>
  );
}
