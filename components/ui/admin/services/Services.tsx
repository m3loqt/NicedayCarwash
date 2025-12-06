import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import AvailabilityModal from "./AvailabilityModal";

export default function Services() {
  const [modalVisible, setModalVisible] = useState(false);

  const data = [
    { id: 1, name: "Body Wash", sedan: 180, suv: 220, pickup: 270 },
    { id: 2, name: "Value Wash", sedan: 150, suv: 200, pickup: 250 },
  ];

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
        {data.map((item) => (
          <View key={item.id} className="bg-white rounded-xl p-4 mr-4 w-56 shadow">
            <Text className="text-lg font-bold text-gray-900 mb-2">{item.name}</Text>

            <Text className="text-gray-800">Sedan: ₱{item.sedan}</Text>
            <Text className="text-gray-800">SUV: ₱{item.suv}</Text>
            <Text className="text-gray-800 mb-3">Pickup: ₱{item.pickup}</Text>

            <TouchableOpacity
              className="bg-[#F9EF08] py-2 rounded-full"
              onPress={() => setModalVisible(true)}
            >
              <Text className="text-center font-semibold text-white">
                Edit Availability
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* AVAILABILITY MODAL */}
      <AvailabilityModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onFinish={(status) => {
          console.log("Selected availability:", status);
          setModalVisible(false);
        }}
      />
    </>
  );
}
