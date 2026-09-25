import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '@/components/ui/common/AppButton';
import { Image, Modal, ScrollView, Text, View, Pressable } from 'react-native';

interface VehicleClassification {
  id: string;
  name: string;
  icon: string;
  examples?: string;
  details?: string;
}

interface VehicleClassificationModalProps {
  visible: boolean;
  classifications: VehicleClassification[];
  selectedClassification: VehicleClassification | null;
  getVehicleIcon: (type: string) => any;
  onSelect: (classification: VehicleClassification) => void;
  onClose: () => void;
  topPosition?: number;
  backdropColor?: string;
}

export default function VehicleClassificationModal({
  visible,
  classifications,
  selectedClassification,
  getVehicleIcon,
  onSelect,
  onClose,
  topPosition = 185,
  backdropColor,
}: VehicleClassificationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1"
        onPress={onClose}
        style={backdropColor ? { backgroundColor: backdropColor } : undefined}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="absolute left-6 right-6 bg-white rounded-xl shadow-lg border border-gray-200 mt-2"
          style={{ top: topPosition }}
        >
          <ScrollView
            scrollEnabled={classifications.length > 5}
            nestedScrollEnabled={true}
          >
            {classifications.map((classification, index) => (
              <AppButton
                key={classification.id}
                className={`flex-row items-center p-4 ${
                  index < classifications.length - 1 ? 'border-b border-gray-200' : ''
                }`}
                onPress={() => onSelect(classification)}
              >
                <Image
                  source={getVehicleIcon(classification.id)}
                  className="w-8 h-8 mr-4"
                  resizeMode="contain"
                />
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-800">
                    {classification.name}
                  </Text>
                  <Text className="text-sm text-gray-500 mt-1">
                    {classification.examples || classification.details}
                  </Text>
                </View>
                {selectedClassification?.id === classification.id && (
                  <Ionicons name="checkmark" size={24} color="#F9EF08" />
                )}
              </AppButton>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

