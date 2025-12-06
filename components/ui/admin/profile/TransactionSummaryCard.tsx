import { Text, View } from 'react-native';

interface TransactionSummaryCardProps {
  totalTransactions: number;
}

export default function TransactionSummaryCard({ totalTransactions }: TransactionSummaryCardProps) {
  return (
    <View className="bg-white rounded-lg mx-4 mt-4 p-4">
      <Text className="text-gray-600 text-base">You've successfully managed</Text>
      <Text className="text-2xl font-bold text-[#1E1E1E] mt-1">
        {totalTransactions} Transactions
      </Text>
    </View>
  );
}

