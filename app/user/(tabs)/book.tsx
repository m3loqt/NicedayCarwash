import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
      {currentStep === 1 && (
        <BranchSelection
          onBranchSelect={handleBranchSelect}
          onNextStep={handleNextStep}
        />
      )}
      {/* TODO: Add other steps here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
});
