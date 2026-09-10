import { Text, TouchableOpacity, View } from 'react-native';

interface AppointmentsTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts?: { pending?: number; confirmed?: number; ongoing?: number };
}

export default function AppointmentsTabs({ activeTab, onTabChange, counts }: AppointmentsTabsProps) {
  // History deliberately carries no count - it only grows, so a number there is noise, not signal.
  const tabs = [
    { id: 'pending', label: 'Pending', count: counts?.pending },
    { id: 'confirmed', label: 'Confirmed', count: counts?.confirmed },
    { id: 'ongoing', label: 'Ongoing', count: counts?.ongoing },
    { id: 'history', label: 'History', count: undefined },
  ];

  return (
    <View className="flex-row bg-white border-b border-gray-200">
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          className="flex-1 py-4 items-center"
          onPress={() => onTabChange(tab.id)}
        >
          <View>
            <Text
              className={`text-base font-medium ${
                activeTab === tab.id ? 'text-[#1E1E1E] font-bold' : 'text-gray-600'
              }`}
            >
              {tab.label}
            </Text>
            {/* Floats over the label instead of sitting inline, so the label itself stays
                centered in its slot the same as every other tab - an inline badge was widening
                just this one tab's content and throwing off alignment across the row. */}
            {!!tab.count && (
              <View
                className="absolute bg-[#F0F0F0] rounded-full min-w-[16px] h-[16px] px-1 items-center justify-center"
                style={{ top: -6, right: -18 }}
              >
                <Text className="text-[9px] font-bold text-[#666]">{tab.count}</Text>
              </View>
            )}
          </View>
          {activeTab === tab.id && (
            <View className="absolute bottom-0 left-0 right-0 h-1 bg-[#F9EF08] rounded-t-full" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}
