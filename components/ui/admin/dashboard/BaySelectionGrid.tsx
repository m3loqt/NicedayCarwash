import { View } from 'react-native';
import BayButton, { BayStatus } from './BayButton';

export interface Bay {
  number: number;
  status: BayStatus;
}

interface BaySelectionGridProps {
  bays: Bay[];
  onBaySelect: (bayNumber: number) => void;
}

/**
 * Grid component displaying bay selection buttons in a 2x2 layout
 * Receives array of bays with their status and handles selection
 */
export default function BaySelectionGrid({ bays, onBaySelect }: BaySelectionGridProps) {
  return (
    <View className="flex-row flex-wrap gap-2 mb-6">
      {bays.map((bay) => (
        <View key={bay.number} className="w-[48%]">
          <BayButton
            bayNumber={bay.number}
            status={bay.status}
            onPress={() => onBaySelect(bay.number)}
          />
        </View>
      ))}
    </View>
  );
}
