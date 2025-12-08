import { Text, View } from 'react-native';

interface TransactionSummaryCardProps {
  totalTransactions: number;
}

export default function TransactionSummaryCard({ totalTransactions }: TransactionSummaryCardProps) {
  return (
    <View className="bg-white rounded-lg mx-6 mt-4 p-4 shadow-md">
      <View className="items-center">
        <Text className="text-gray-600 text-base text-center">You've successfully managed</Text>
        <Text className="text-2xl font-bold text-[#1E1E1E] mt-1 text-center">
          {totalTransactions} Transactions
        </Text>
      </View>
    </View>
  );
}

