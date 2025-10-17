import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import PromotionalBanner from './PromotionalBanner';

export default function HomeHeader() {
  const [showFilter, setShowFilter] = useState(false);

  const handleFilterToggle = () => {
    setShowFilter(!showFilter);
  };

  const handleRegionSelect = (region: string) => {
    console.log('Selected region:', region);
    setShowFilter(false);
  };

  return (
    <View className="mb-8">
      {/* Yellow Header Background */}
      <View className="bg-[#F9EF08] px-4 pt-8 pb-36 relative z-20 ">
        {/* Greeting + Logo */}
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-gray-800 text-2xl font-bold">Hello, Welcome Back!</Text>
            <Text className="text-gray-800 text-xl font-semibold opacity-90">Mel Angelo</Text>
          </View>
          <Image 
            source={require('../../../../assets/images/ndcwlogo.png')}
            className="w-24 h-12"
            resizeMode="contain"
          />
        </View>

        {/* Search Bar */}
        <View className="bg-white rounded-xl px-4 py-3 flex-row items-center shadow">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput 
            placeholder="Search branch"
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-3 text-gray-800"
          />
          <TouchableOpacity onPress={handleFilterToggle} className="ml-2">
            <Image 
              source={require('../../../../assets/images/search2_burger.png')}
              className="w-6 h-6"
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Dropdown - Outside header container with higher z-index */}
      {showFilter && (
        <View className="absolute z-50 left-4 right-4 bg-white rounded-xl shadow-lg"
              style={{ top: 150, elevation: 10 }}>
          <TouchableOpacity 
            className="px-4 py-3 border-b border-gray-200"
            onPress={() => handleRegionSelect('Luzon')}
          >
            <Text className="text-gray-700 text-base">Luzon</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="px-4 py-3 border-b border-gray-200"
            onPress={() => handleRegionSelect('Visayas')}
          >
            <Text className="text-gray-700 text-base">Visayas</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="px-4 py-3"
            onPress={() => handleRegionSelect('Mindanao')}
          >
            <Text className="text-gray-700 text-base">Mindanao</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Promotional Banner */}
      <View className="-mt-28 z-30 px-4">
        <PromotionalBanner />
      </View>
    </View>
  );
}
