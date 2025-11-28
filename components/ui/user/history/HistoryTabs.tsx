import { Text, TouchableOpacity, View } from 'react-native';

interface HistoryTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function HistoryTabs({ activeTab, onTabChange }: HistoryTabsProps) {
  const tabs = [
    { id: 'pending', label: 'Pending' },
    { id: 'ongoing', label: 'Ongoing' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Canceled' }
  ];

  return (
    <View className="flex-row bg-white border-b border-gray-200">
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          className="flex-1 py-4 items-center"
          onPress={() => onTabChange(tab.id)}
        >
          <Text 
            className={`text-base font-medium ${
              activeTab === tab.id 
                ? 'text-gray-900 font-bold' 
                : 'text-gray-600'
            }`}
          >
            {tab.label}
          </Text>
          {activeTab === tab.id && (
            <View className="absolute bottom-0 left-0 right-0 h-1 bg-[#F9EF08] rounded-t-full" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

