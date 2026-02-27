import { Text, TouchableOpacity, View } from 'react-native';

interface HistoryTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'pending', label: 'Pending' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

export default function HistoryTabs({ activeTab, onTabChange }: HistoryTabsProps) {
  return (
    <View className="flex-row mt-2 border-b border-[#F0F0F0]">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            className="flex-1 items-center pb-3"
            onPress={() => onTabChange(tab.id)}
          >
            <Text
              className={`text-[14px] ${isActive ? 'font-bold text-[#1A1A1A]' : 'font-medium text-[#B0B0B0]'}`}
            >
              {tab.label}
            </Text>
            {isActive && (
              <View
                className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#F9EF08]"
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
