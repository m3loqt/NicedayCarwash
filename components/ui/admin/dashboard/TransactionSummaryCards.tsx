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
    <View className="px-4 mt-4">
      <View className="flex-row gap-3">
        <TransactionCard label="Pending Transactions" count={counts.pending} icon="pending" isLarge />
        <View className="flex-1 gap-3">
          <TransactionCard label="Ongoing Transactions" count={counts.ongoing} icon="ongoing" />
          <TransactionCard label="Completed Transactions" count={counts.completed} icon="completed" />
          <TransactionCard label="Canceled Transactions" count={counts.cancelled} icon="cancelled" />
        </View>
      </View>
    </View>
  );
}

