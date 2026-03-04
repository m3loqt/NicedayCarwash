import { View } from 'react-native';
import TransactionCard from './TransactionCard';

interface TransactionCounts {
  pending: number;
  ongoing: number;
  completed: number;
  cancelled: number;
}

type TabCategory = 'pending' | 'ongoing' | 'completed' | 'cancelled';

interface TransactionSummaryCardsProps {
  counts: TransactionCounts;
  onCardPress?: (tab: TabCategory) => void;
}

export default function TransactionSummaryCards({ counts, onCardPress }: TransactionSummaryCardsProps) {
  return (
    <View className="px-6 mt-2">
      <View className="flex-row gap-2" style={{ alignItems: 'stretch' }}>
        <View style={{ width: '50%' }}>
          <TransactionCard
            label="Pending Transactions"
            count={counts.pending}
            icon="pending"
            isLarge
            onPress={onCardPress ? () => onCardPress('pending') : undefined}
          />
        </View>
        <View style={{ width: '50%' }} className="gap-2">
          <TransactionCard
            label="Ongoing Transactions"
            count={counts.ongoing}
            icon="ongoing"
            onPress={onCardPress ? () => onCardPress('ongoing') : undefined}
          />
          <TransactionCard
            label="Completed Transactions"
            count={counts.completed}
            icon="completed"
            onPress={onCardPress ? () => onCardPress('completed') : undefined}
          />
          <TransactionCard
            label="Canceled Transactions"
            count={counts.cancelled}
            icon="cancelled"
            onPress={onCardPress ? () => onCardPress('cancelled') : undefined}
          />
        </View>
      </View>
    </View>
  );
}

