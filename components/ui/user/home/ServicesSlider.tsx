import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const services = [
  {
    id: 1,
    title: 'Give your car the shine it deserves',
    subtitle: 'Transform Your Car Today',
    image: require('../../../../assets/images/carwash_img.png')
  },
  {
    id: 2,
    title: 'Premium Car Wash Service',
    subtitle: 'Professional Cleaning',
    image: require('../../../../assets/images/carwash_img.png')
  },
  {
    id: 3,
    title: 'Express Car Wash',
    subtitle: 'Quick & Efficient',
    image: require('../../../../assets/images/carwash_img.png')
  }
];

export default function ServicesSlider() {
  const handleServicePress = (service: any) => {
    console.log('Service pressed:', service.title);
  };

  const handleBookNow = () => {
    console.log('Book now pressed');
  };

  return (
    <View className="mt-6">
      {/* Header */}
      <View className="px-4 mb-4">
        <Text className="text-xl font-bold text-gray-900">Our Services</Text>
      </View>

      {/* Services Slider */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        className="px-4"
        contentContainerStyle={{ paddingRight: 16 }}
      >
        {services.map((service) => (
          <TouchableOpacity 
            key={service.id}
            className="rounded-xl overflow-hidden mr-4 w-80"
            onPress={() => handleServicePress(service)}
          >
            <Image 
              source={service.image}
              className="w-full h-48"
              resizeMode="cover"
            />
            <View className="absolute inset-0 bg-black/50 justify-center items-center">
              <View className="items-center">
                <Text className="text-white text-xl font-bold text-center mb-2">
                  {service.title}
                </Text>
                <Text className="text-white text-base text-center mb-6">
                  {service.subtitle}
                </Text>
                <TouchableOpacity 
                  className="bg-white px-6 py-3 rounded-xl"
                  onPress={handleBookNow}
                >
                  <Text className="text-gray-800 font-semibold">Book now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
