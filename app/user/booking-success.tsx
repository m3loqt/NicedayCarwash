import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BookingSuccess from '../../components/ui/user/booking/BookingSuccess';

export default function BookingSuccessPage() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <BookingSuccess />
      </View>
    </SafeAreaView>
  );
}
