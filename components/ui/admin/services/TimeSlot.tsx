import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function TimeSlots() {
  const data = [
    { id: 1, time: "08:00 AM - 01:00 PM" },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="flex-row"
    >
      {data.map((item) => (
        <View
          key={item.id}
          className="bg-white rounded-xl p-4 mr-4 w-64 shadow"
        >
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            {item.time}
          </Text>

          <View className="flex-row justify-between">
            <TouchableOpacity className="bg-[#F9EF08] px-6 py-2 rounded-full">
              <Text className="font-semibold text-white text-center">
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-[#F9EF08] px-6 py-2 rounded-full">
              <Text className="font-semibold text-white text-center">
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
