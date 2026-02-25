import { Ionicons } from '@expo/vector-icons';
import { Image, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface AppointmentDetailsModalProps {
  visible: boolean;
  branchName: string;
  branchAddress: string;
  branchImage: any;
  vehicleName?: string;
  plateNumber?: string;
  classification?: string;
  date: string;
  time: string;
  orderSummary: Array<{ label: string; price: string }>;
  amountDue: string;
  paymentMethod: string;
  estimatedCompletion?: string;
  note?: string;
  onClose: () => void;
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  if (month < 1 || month > 12) return dateString;
  return `${months[month - 1]} ${day}, ${year}`;
};

const formatPrice = (value?: string | number): string => {
  if (value === null || value === undefined || value === '') return '₱0.00';
  const str = String(value).replace(/[₱,\s]/g, '');
  const num = parseFloat(str);
  if (isNaN(num)) return '₱0.00';
  return `₱${num.toFixed(2)}`;
};

const getVehicleIcon = (vehicleType?: string) => {
  switch (vehicleType?.toLowerCase()) {
    case 'suv':
      return require('../../../../../assets/images/suv.png');
    case 'pickup':
      return require('../../../../../assets/images/pickup.png');
    case 'motorcycle-small':
      return require('../../../../../assets/images/motorcycle_small.png');
    case 'motorcycle-large':
      return require('../../../../../assets/images/motorcycle_large.png');
    default:
      return require('../../../../../assets/images/sedan.png');
  }
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center py-1">
      <Text className="text-[13px] text-[#999]">{label}</Text>
      <Text className="text-[13px] font-semibold text-[#1A1A1A]">{value}</Text>
    </View>
  );
}

function Divider() {
  return <View className="h-[0.5px] bg-[#F0F0F0]" />;
}

export default function AppointmentDetailsModal({
  visible,
  branchName,
  branchAddress,
  branchImage,
  vehicleName,
  plateNumber,
  classification,
  date,
  time,
  orderSummary,
  amountDue,
  paymentMethod,
  estimatedCompletion,
  note,
  onClose,
}: AppointmentDetailsModalProps) {
  const estHours = estimatedCompletion
    ? parseInt(String(estimatedCompletion).replace(/\D/g, ''), 10) || 0
    : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/40 justify-end">
        {/* Tap backdrop to close */}
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />

        {/* Sheet */}
        <View
          className="bg-white rounded-t-3xl"
          style={{ maxHeight: '82%' }}
        >
          {/* Handle bar */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pb-3">
            <Text className="text-[17px] font-bold text-[#1A1A1A]">Appointment Details</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color="#999" />
            </TouchableOpacity>
          </View>

          <Divider />

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {/* Branch */}
            <View className="px-5 py-3 flex-row items-center">
              {branchImage && (
                <Image
                  source={branchImage}
                  className="rounded-xl mr-3"
                  style={{ width: 48, height: 48 }}
                  resizeMode="cover"
                />
              )}
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-[#1A1A1A]">{branchName}</Text>
                <Text className="text-[12px] text-[#999] mt-0.5" numberOfLines={1}>
                  {branchAddress || 'No address'}
                </Text>
              </View>
            </View>

            <Divider />

            {/* Vehicle */}
            {(vehicleName || plateNumber) && (
              <>
                <View className="px-5 py-3 flex-row items-center">
                  <Image
                    source={getVehicleIcon(classification)}
                    style={{ width: 32, height: 32, tintColor: '#F9EF08' }}
                    resizeMode="contain"
                  />
                  <View className="w-[0.5px] h-8 bg-[#F0F0F0] mx-3" />
                  <View className="flex-1 flex-row justify-between">
                    <Text className="text-[13px] text-[#666]">{vehicleName || '-'}</Text>
                    <Text className="text-[13px] text-[#999]">{plateNumber} {classification}</Text>
                  </View>
                </View>
                <Divider />
              </>
            )}

            {/* Date & Time */}
            <View className="px-5 py-3">
              <Row label="Date" value={formatDate(date)} />
              {time ? <Row label="Time" value={time} /> : null}
              {estHours > 0 && (
                <Row label="Est. Completion" value={`${estHours} ${estHours === 1 ? 'Hour' : 'Hours'}`} />
              )}
            </View>

            <Divider />

            {/* Order Summary */}
            <View className="px-5 py-3">
              <Text className="text-[14px] font-bold text-[#1A1A1A] mb-1">Order Summary</Text>
              {orderSummary.map((item, idx) => (
                <View key={idx} className="flex-row justify-between py-1.5">
                  <Text className="text-[13px] text-[#999]">{item.label}</Text>
                  <Text className="text-[13px] text-[#666]">{formatPrice(item.price)}</Text>
                </View>
              ))}
              <View className="h-[0.5px] bg-[#F0F0F0] my-2" />
              <View className="flex-row justify-between">
                <Text className="text-[14px] font-bold text-[#1A1A1A]">Amount Due</Text>
                <Text className="text-[14px] font-bold text-[#1A1A1A]">{formatPrice(amountDue)}</Text>
              </View>
            </View>

            <Divider />

            {/* Payment */}
            <View className="px-5 py-3">
              <Row label="Payment Method" value={paymentMethod || 'Not selected'} />
            </View>

            {/* Note */}
            <Divider />
            <View className="px-5 py-3">
              <Text className="text-[14px] font-bold text-[#1A1A1A] mb-2">Note</Text>
              <View className="rounded-xl bg-[#FAFAFA] p-3">
                <Text className="text-[12px] text-[#666] leading-[17px]">
                  {note || 'No note provided.'}
                </Text>
              </View>
            </View>

            {/* Disclaimer */}
            <View className="px-5 pt-4 pb-2">
              <Text className="text-[13px] font-semibold text-[#1A1A1A] text-center mb-1">Disclaimer</Text>
              <Text className="text-[11px] text-[#999] italic text-center leading-[16px]">
                Final duration of the carwash will depend on the car size and state
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
