import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function Bays() {
  const data = [
    { id: 1, name: "Bay 1" },
    { id: 2, name: "Bay 2" },
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
          className="bg-white rounded-xl p-4 mr-4 w-56 shadow"
        >
          <Text className="text-lg font-bold text-gray-900 mb-4">
            {item.name}
          </Text>

          <View className="flex-row justify-between">
            <TouchableOpacity className="bg-[#F9EF08] px-5 py-2 rounded-full">
              <Text className="font-semibold text-white text-center">
                Available
              </Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-[#F9EF08] px-5 py-2 rounded-full">
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
