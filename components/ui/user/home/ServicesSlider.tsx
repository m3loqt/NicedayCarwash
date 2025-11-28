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

  const handleViewMore = (service: any) => {
    console.log('View more pressed:', service.title);
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
        snapToInterval={360}
        decelerationRate="fast"
        className="px-4"
        contentContainerStyle={{ paddingRight: 16 }}
      >
        {services.map((service) => (
          <TouchableOpacity 
            key={service.id}
            className="rounded-xl overflow-hidden mr-4 h-48"
            style={{ width: 340 }}
            onPress={() => handleServicePress(service)}
          >
            <Image 
              source={service.image}
              className="w-full h-full"
              resizeMode="cover"
            />
            <View className="absolute inset-0 bg-black/50 justify-end items-start p-6">
              <View className="items-start">
                <Text className="text-white text-xl font-bold text-left mb-2">
                  {service.title}
                </Text>
                <Text className="text-white text-base text-left mb-6">
                  {service.subtitle}
                </Text>
                <TouchableOpacity 
                  className="bg-white px-6 py-3 rounded-xl"
                  onPress={handleBookNow}
                >
                  <Text className="text-gray-800 font-semibold">Book now</Text>
                </TouchableOpacity>
              </View>

              {/* View More centered at bottom */}
              <View className="w-full items-center mt-3 pb-1">
                <TouchableOpacity onPress={() => handleViewMore(service)}>
                  <Text className="text-white underline font-semibold">View More</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
