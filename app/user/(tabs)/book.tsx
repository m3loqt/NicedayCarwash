import { StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BranchSelection } from '../../../components/ui/user/booking';

export default function UserBookScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <BranchSelection />
    </SafeAreaView>
  );
}
