import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Dimensions, Image, Modal, Platform, Pressable, Text, TouchableOpacity, View } from 'react-native';

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
          className="bg-white rounded-t-3xl px-5 pt-4"
          style={{
            paddingBottom: Platform.OS === 'ios' ? 32 : 20,
            maxHeight: height * 0.55,
          }}
        >
          {branch && (
            <>
              {/* Handle bar */}
              <View className="items-center mb-4">
                <View className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
              </View>

              {/* Branch card-style content */}
              <View className="bg-[#FAFAFA] rounded-2xl px-3 py-5 mb-4 flex-row items-center">
                <Image
                  source={require('../../../../assets/images/branch1.jpg')}
                  className="rounded-xl mr-4"
                  style={{ width: 60, height: 60 }}
                  resizeMode="cover"
                />

                <View className="flex-1 mr-2">
                  <Text className="text-[16px] font-bold text-[#1A1A1A] mb-1" numberOfLines={1}>
                    {branch.name}
                  </Text>
                  <Text className="text-[13px] text-[#999]" numberOfLines={2}>
                    {branch.address}
                  </Text>
                </View>
              </View>

              {/* Extra details */}
              <View className="mb-5">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="call-outline" size={16} color="#666" />
                  <Text className="ml-3 text-[13px] text-[#666]">
                    {branch.phone}
                  </Text>
                </View>
                <View className="flex-row items-center mb-2">
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text className="ml-3 text-[13px] text-[#666]">
                    {branch.hours}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="location-outline" size={16} color="#666" />
                  <Text className="ml-3 text-[13px] text-[#666]">
                    {branch.distance}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                className="bg-[#F9EF08] py-4 rounded-2xl items-center"
                onPress={onMakeOrder}
              >
                <Text className="text-[#1A1A00] text-base font-bold">
                  Choose branch
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </BlurView>
    </Modal>
  );
}
