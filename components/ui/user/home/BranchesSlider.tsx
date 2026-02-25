import { Ionicons } from '@expo/vector-icons';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const branches = [
  {
    id: 1,
    name: 'Bacolod',
    address: 'The District North Point, Talisay City, Negros Occidental',
    image: require('../../../../assets/images/branch1.jpg'),
    status: 'Open',
  },
  {
    id: 2,
    name: 'P. Mabolo',
    address: 'Along Pope John Paul Avenue, Cebu City',
    image: require('../../../../assets/images/branch2.jpg'),
    status: 'Open',
  },
  {
    id: 3,
    name: 'Urgello',
    address: '11 J Urgello Road, Sambag 1, Cebu City',
    image: require('../../../../assets/images/branch3.jpg'),
    status: 'Closed',
  },
];

export default function BranchesSlider() {
  const handleBranchPress = (branch: (typeof branches)[number]) => {
    console.log('Branch pressed:', branch.name);
  };

  return (
    <View className="mt-6">
      {/* Section header */}
      <View className="flex-row justify-between items-center px-5 mb-2">
        <Text className="text-lg font-bold text-[#1A1A1A]">
          Branches near you
        </Text>
        <TouchableOpacity
          className="flex-row items-center"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-sm font-semibold text-[#1A1A1A] mr-1">
            See All
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      {/* Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 8 }}
      >
        {branches.map((branch, index) => {
          const isOpen = branch.status === 'Open';
          return (
            <TouchableOpacity
              key={branch.id}
              className={`bg-white rounded-2xl ${index < branches.length - 1 ? 'mr-4' : ''}`}
              style={{
                width: 220,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.07,
                shadowRadius: 12,
                elevation: 3,
              }}
              onPress={() => handleBranchPress(branch)}
              activeOpacity={0.82}
            >
              {/* Image with inner padding */}
              <View className="p-2.5 pb-0">
                <View className="rounded-xl overflow-hidden">
                  <Image
                    source={branch.image}
                    className="w-full"
                    style={{ height: 115 }}
                    resizeMode="cover"
                  />
                  {/* Status badge on image */}
                  <View
                    className="absolute top-2 left-2 flex-row items-center rounded-full px-2.5 py-1"
                    style={{ backgroundColor: isOpen ? '#F9EF08' : '#EF4444' }}
                  >
                    <View
                      className="w-1.5 h-1.5 rounded-full mr-1.5"
                      style={{ backgroundColor: isOpen ? '#1A1A00' : '#FFFFFF' }}
                    />
                    <Text
                      className="text-[10px] font-bold"
                      style={{ color: isOpen ? '#1A1A00' : '#FFFFFF' }}
                    >
                      {branch.status}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Content */}
              <View className="px-3.5 pt-3 pb-3.5">
                <Text className="text-[14px] font-bold text-[#1A1A1A] mb-0.5">
                  {branch.name}
                </Text>
                <Text
                  className="text-[11px] text-[#999] leading-[15px]"
                  numberOfLines={2}
                >
                  {branch.address}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
