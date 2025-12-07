import { View } from 'react-native';
import TransactionCard from './TransactionCard';

interface TransactionCounts {
  pending: number;
  ongoing: number;
  completed: number;
  cancelled: number;
}

interface TransactionSummaryCardsProps {
  counts: TransactionCounts;
}

export default function TransactionSummaryCards({ counts }: TransactionSummaryCardsProps) {
  return (
    <View className="px-6 mt-2">
      <View className="flex-row gap-2" style={{ alignItems: 'stretch' }}>
        <View style={{ width: '50%' }}>
          <TransactionCard label="Pending Transactions" count={counts.pending} icon="pending" isLarge />
        </View>
        <View style={{ width: '50%' }} className="gap-2">
          <TransactionCard label="Ongoing Transactions" count={counts.ongoing} icon="ongoing" />
          <TransactionCard label="Completed Transactions" count={counts.completed} icon="completed" />
          <TransactionCard label="Canceled Transactions" count={counts.cancelled} icon="cancelled" />
        </View>
      </View>
    </View>
  );
}

