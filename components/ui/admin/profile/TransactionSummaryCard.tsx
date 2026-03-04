import { Text, View } from 'react-native';

interface TransactionSummaryCardProps {
  totalTransactions: number;
}

export default function TransactionSummaryCard({ totalTransactions }: TransactionSummaryCardProps) {
  return (
    <View className="mx-5 mt-4 bg-[#FAFAFA] border border-[#EEEEEE] rounded-2xl px-4 py-4">
      <Text className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-1.5">
        Overview
      </Text>
      <Text className="text-[13px] text-[#999]">
        You've successfully managed
      </Text>
      <Text className="text-[18px] font-bold text-[#1A1A1A] mt-1">
        {totalTransactions} transactions
      </Text>
    </View>
  );
}

