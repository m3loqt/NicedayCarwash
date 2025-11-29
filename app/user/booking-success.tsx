import BookingSuccess from '../../components/ui/user/booking/BookingSuccess';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from 'react-native';

export default function BookingSuccessPage() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <BookingSuccess />
      </View>
    </SafeAreaView>
  );
}
