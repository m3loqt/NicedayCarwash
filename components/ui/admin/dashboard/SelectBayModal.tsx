import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import BaySelectionGrid, { Bay } from './BaySelectionGrid';
import Legend from './Legend';

interface SelectBayModalProps {
  visible: boolean;
  bays: Bay[];
  selectedBay: number | null;
  onClose: () => void;
  onBaySelect: (bayNumber: number) => void;
  onFinish: () => void;
  loading?: boolean;
}

/**
 * Select Bay Modal Component
 * Allows admin to select a bay for an appointment
 * Features:
 * - Legend showing Available/Unavailable status
 * - Dynamic grid of bay selection buttons (flexible number of bays)
 * - Finish button to confirm selection
 * - Close button in top-right corner
 * - Scrollable content for many bays
 */
export default function SelectBayModal({
  visible,
  bays,
  selectedBay,
  onClose,
  onBaySelect,
  onFinish,
  loading = false,
}: SelectBayModalProps) {
  // Transform bays array to include selected status
  const transformedBays: Bay[] = bays.map((bay) => ({
    ...bay,
    status: selectedBay === bay.number ? 'selected' : bay.status,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={80} tint="light" className="flex-1 justify-center items-center">
        {/* Backdrop: tapping this closes the modal */}
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={onClose}
        />

        {/* Modal Content */}
        <View
          className="bg-white rounded-3xl px-6 py-6 mx-6 w-[80%] max-w-sm relative z-10"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
            maxHeight: '80%',
          }}
        >
          {/* Close Button - Top Right */}
          <TouchableOpacity
            className="absolute top-4 right-4 z-10"
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>

          {/* Title */}
          <View className="items-center mb-4 mt-2">
            <Text
              className="text-3xl font-bold text-[#1E1E1E]"
              style={{ fontFamily: 'Inter_700Bold' }}
            >
              Select Bay
            </Text>
          </View>

          {/* Scrollable Content */}
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
            style={{ maxHeight: 400 }}
          >
            {/* Legend */}
            <Legend />

            {/* Bay Selection Grid */}
            {loading ? (
              <View className="py-8 items-center">
                <Text className="text-base text-gray-500" style={{ fontFamily: 'Inter_400Regular' }}>
                  Loading bay availability...
                </Text>
              </View>
            ) : (
              <BaySelectionGrid bays={transformedBays} onBaySelect={onBaySelect} />
            )}
          </ScrollView>

          {/* Finish Button */}
          <TouchableOpacity
            className="bg-white border-2 border-[#F9EF08] rounded-xl py-4 items-center"
            onPress={onFinish}
            disabled={selectedBay === null}
            activeOpacity={selectedBay === null ? 1 : 0.7}
            style={{ opacity: selectedBay === null ? 0.5 : 1 }}
          >
            <Text
              className="text-lg font-bold text-[#F9EF08]"
              style={{ fontFamily: 'Inter_700Bold' }}
            >
              Finish
            </Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
}
