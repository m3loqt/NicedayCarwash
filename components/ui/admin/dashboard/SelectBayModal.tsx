import { Ionicons } from '@expo/vector-icons';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import BaySelectionGrid, { Bay } from './BaySelectionGrid';

interface SelectBayModalProps {
  visible: boolean;
  bays: Bay[];
  selectedBay: number | null;
  onClose: () => void;
  onBaySelect: (bayNumber: number) => void;
  onFinish: () => void;
  loading?: boolean;
}

export default function SelectBayModal({
  visible,
  bays,
  selectedBay,
  onClose,
  onBaySelect,
  onFinish,
  loading = false,
}: SelectBayModalProps) {
  const transformedBays: Bay[] = bays.map((bay) => ({
    ...bay,
    status: selectedBay === bay.number ? 'selected' : bay.status,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/40 justify-end">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />

        <View className="bg-white rounded-t-xl">
          {/* Handle */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
            <Text className="text-[17px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'Inter_700Bold' }}>
              Select a Bay
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#999" />
            </TouchableOpacity>
          </View>

          <View className="h-[0.5px] bg-[#F0F0F0]" />

          {/* Bay Grid */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            style={{ maxHeight: 300 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}
          >
            {loading ? (
              <View className="py-10 items-center">
                <Text className="text-[13px] text-[#999]" style={{ fontFamily: 'Inter_400Regular' }}>
                  Loading bays…
                </Text>
              </View>
            ) : (
              <BaySelectionGrid bays={transformedBays} onBaySelect={onBaySelect} />
            )}
          </ScrollView>

          {/* Confirm Button */}
          <View className="px-5 pb-8 pt-1">
            <TouchableOpacity
              className={`rounded-2xl py-4 items-center ${selectedBay !== null ? 'bg-[#F9EF08]' : 'bg-[#F5F5F5]'}`}
              onPress={onFinish}
              disabled={selectedBay === null}
              activeOpacity={0.85}
            >
              <Text
                className={`text-[14px] font-bold ${selectedBay !== null ? 'text-[#1A1A1A]' : 'text-[#BDBDBD]'}`}
                style={{ fontFamily: 'Inter_700Bold' }}
              >
                Confirm Bay {selectedBay !== null ? `${selectedBay}` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
