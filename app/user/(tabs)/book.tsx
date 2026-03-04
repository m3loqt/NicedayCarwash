import { useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BranchSelection } from '../../../components/ui/user/booking';

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  distance: string;
  status: 'Open' | 'Closed';
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export default function UserBookScreen() {
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch);
  };

  const handleNextStep = () => {
    // TODO: Navigate to step 2 (Service Selection)
    setCurrentStep(2);
  };

  return (
    <View style={styles.container}>
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={{ flex: 1 }}>
        {currentStep === 1 && (
          <BranchSelection
            onBranchSelect={handleBranchSelect}
            onNextStep={handleNextStep}
          />
        )}
        {/* TODO: Add other steps here */}
      </View>
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
