import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function ServicesStep({ branch, selectedServices, selectedAddons, dateTime, paymentMethod, onUpdateServices, onUpdateAddons, onUpdateDateTime, onUpdatePayment, onNext }: any) {
  const sampleServices = [
    { id: 'body', name: 'Body Wash', price: 130 },
    { id: 'value', name: 'Value Wash', price: 140 },
  ];

  const sampleAddons = [
    { id: 'armour', name: 'Armour All', price: 120 },
    { id: 'under', name: 'Under Chassis', price: 140 },
  ];

  const toggleService = (s: any) => {
    const exists = selectedServices.find((x: any) => x.id === s.id);
    if (exists) onUpdateServices(selectedServices.filter((x: any) => x.id !== s.id));
    else onUpdateServices([...selectedServices, s]);
  };

  const toggleAddon = (a: any) => {
    const exists = selectedAddons.find((x: any) => x.id === a.id);
    if (exists) onUpdateAddons(selectedAddons.filter((x: any) => x.id !== a.id));
    else onUpdateAddons([...selectedAddons, a]);
  };

  return (
    <View className="flex-1 bg-gray-100">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text className="text-lg font-semibold mb-4">Services</Text>
        {sampleServices.map(s => (
          <TouchableOpacity key={s.id} onPress={() => toggleService(s)} className="bg-white rounded-xl p-4 mb-3">
            <View className="flex-row justify-between">
              <Text className="font-medium">{s.name}</Text>
              <Text>₱{s.price.toFixed(2)}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text className="text-lg font-semibold mt-6 mb-4">Add ons</Text>
        {sampleAddons.map(a => (
          <TouchableOpacity key={a.id} onPress={() => toggleAddon(a)} className="bg-white rounded-xl p-4 mb-3">
            <View className="flex-row justify-between">
              <Text className="font-medium">{a.name}</Text>
              <Text>₱{a.price.toFixed(2)}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text className="text-lg font-semibold mt-6 mb-4">Date and Time</Text>
        <View className="flex-row mb-4">
          {['6:00 AM','7:00 AM','8:00 AM','9:00 AM'].map(t => (
            <TouchableOpacity key={t} onPress={() => onUpdateDateTime(t)} className="bg-white rounded-xl p-3 mr-3">
              <Text>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-lg font-semibold mt-6 mb-4">Payment Option</Text>
        {['COD','E-Wallet','Card'].map(p => (
          <TouchableOpacity key={p} onPress={() => onUpdatePayment(p)} className="bg-white rounded-xl p-4 mb-3">
            <Text className="font-medium">{p}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        className="absolute bottom-6 right-6 w-16 h-16 bg-[#F9EF08] rounded-full items-center justify-center shadow-lg"
        onPress={onNext}
      >
        <Text className="text-white text-2xl">›</Text>
      </TouchableOpacity>
    </View>
  );
}
