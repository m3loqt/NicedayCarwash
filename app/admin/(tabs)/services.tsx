import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AddOns from "../../../components/ui/admin/services/AddOns";
import Bays from "../../../components/ui/admin/services/Bays";
import Services from "../../../components/ui/admin/services/Services";
import TimeSlots from "../../../components/ui/admin/services/TimeSlot";

export default function AdminServicesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="flex flex-row items-center p-4 bg-white border-b border-gray-200">
        <View className="w-8" />

        <Text className="flex-1 text-center text-xl font-bold text-[#1E1E1E]">
          Services & Prices
        </Text>

        <View className="w-8" />
      </View>

      {/* Body */}
      <ScrollView
        className="flex-1 px-4 py-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Services */}
        <View className="mb-8">
          <Text className="text-2xl font-semibold text-gray-900 mb-4">
            Services
          </Text>
          <Services />
        </View>

        {/* Add-ons */}
        <View className="mb-8">
          <Text className="text-2xl font-semibold text-gray-900 mb-4">
            Add-ons
          </Text>
          <AddOns />
        </View>

        {/* Time Slots */}
        <View className="mb-8">
          <View className="flex flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-semibold text-gray-900">
              Time Slots
            </Text>
            <TouchableOpacity>
              <Text className="text-[#F9EF08] font-medium">Add Time Slot</Text>
            </TouchableOpacity>
          </View>
          <TimeSlots />
        </View>

        {/* Bays */}
        <View className="mb-8">
          <View className="flex flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-semibold text-gray-900">
              Bays
            </Text>
            <TouchableOpacity>
              <Text className="text-[#F9EF08] font-medium">Add Bay</Text>
            </TouchableOpacity>
          </View>
          <Bays />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
