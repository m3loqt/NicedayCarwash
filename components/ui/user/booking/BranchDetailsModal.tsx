import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Dimensions, Modal, Platform, Pressable, Text, TouchableOpacity, View } from 'react-native';

const { height } = Dimensions.get('window');

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  distance: string;
  status: 'Open' | 'Closed';
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface BranchDetailsModalProps {
  visible: boolean;
  branch: Branch | null;
  onClose: () => void;
  onMakeOrder: () => void;
}

export default function BranchDetailsModal({
  visible,
  branch,
  onClose,
  onMakeOrder,
}: BranchDetailsModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <BlurView intensity={20} className="flex-1 justify-end">
        {/* Backdrop: tapping this closes the modal */}
        <Pressable style={{ flex: 1 }} onPress={onClose} />

        <View
          className="bg-white rounded-t-2xl px-5 pt-5"
          style={{
            paddingBottom: Platform.OS === 'ios' ? 40 : 20,
            maxHeight: height * 0.6,
          }}
        >
          {branch && (
            <>
              <View className="mb-4">
                <View className="flex-row justify-between items-center">
                  <Text className="text-xl font-bold text-[#333] flex-1">
                    {branch.name}
                  </Text>

                  <View className="ml-3">
                    <Text
                      className="text-sm font-semibold px-2 py-1 rounded"
                      style={{
                        backgroundColor:
                          branch.status === 'Open' ? '#FFF3E0' : '#FFEBEE',
                        color:
                          branch.status === 'Open' ? '#FFA726' : '#F44336',
                      }}
                    >
                      {branch.status}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="mb-6">
                {[
                  { icon: 'business', value: branch.address },
                  { icon: 'location', value: branch.distance },
                  { icon: 'call', value: branch.phone },
                  { icon: 'time', value: branch.hours },
                ].map((item, i) => (
                  <View key={i} className="flex-row items-center mb-3">
                    <Ionicons name={item.icon as any} size={16} color="#666" />
                    <Text className="ml-3 text-sm text-[#666] flex-1">
                      {item.value}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                className="bg-[#FFD700] py-4 rounded-xl items-center"
                onPress={onMakeOrder}
              >
                <Text className="text-white text-base font-semibold">
                  Make an Order
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </BlurView>
    </Modal>
  );
}
