import { Ionicons } from '@expo/vector-icons';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const branches = [
  {
    id: 1,
    name: 'Bacolod',
    address: 'The District North Point, Talisay City, Negros Occidental',
    image: require('../../../../assets/images/samplebranch.png')
  },
  {
    id: 2,
    name: 'P. Mabolo',
    address: 'Along Pope John Paul Avenue, Cebu City',
    image: require('../../../../assets/images/samplebranch.png')
  },
  {
    id: 3,
    name: 'Urgello',
    address: '11 J Urgello Road, Sambag 1, Cebu City',
    image: require('../../../../assets/images/samplebranch.png')
  }
];

export default function BranchesSlider() {
  const handleBranchPress = (branch: any) => {
    // Branch press handler
  };

  return (
    <View className="">
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 mb-4">
        <Text className="text-xl font-bold text-[#1E1E1E]">Our branches near you</Text>
        <TouchableOpacity className="flex-row items-center bg-gray-100 px-3 py-2 rounded-lg">
          <Text className="text-gray-700 mr-2">Mindanao</Text>
          <Ionicons name="chevron-down" size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Branches Slider */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        className="px-4"
        contentContainerStyle={{ paddingRight: 16 }}
      >
        {branches.map((branch) => (
          <TouchableOpacity 
            key={branch.id}
            className="bg-white rounded-xl shadow-md mr-4 w-64 overflow-hidden"
            onPress={() => handleBranchPress(branch)}
          >
            <Image 
              source={branch.image}
              className="w-full h-32"
              resizeMode="cover"
            />
            <View className="p-4">
              <Text className="text-lg font-bold text-[#1E1E1E] mb-2">{branch.name}</Text>
              <View className="flex-row items-start">
                <Ionicons name="location" size={16} color="#6B7280" className="mr-2 mt-1" />
                <Text className="text-sm text-gray-600 flex-1">{branch.address}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
