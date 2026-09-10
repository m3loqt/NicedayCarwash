import { formatDuration } from '@/lib/duration';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Linking, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface AppointmentDetailsModalProps {
  visible: boolean;
  branchName: string;
  branchAddress: string;
  branchImage: any;
  customerName?: string;
  customerPhone?: string;
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
  status?: string;
  isPaid?: boolean;
  appointmentId?: string;
  paymentReferenceId?: string;
  isAdminView?: boolean;
  onClose: () => void;
  onAccept?: () => void;
  onCancel?: () => void;
  onComplete?: () => void;
  onNoShow?: () => void;
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
  customerName,
  customerPhone,
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
  status,
  isPaid,
  appointmentId,
  paymentReferenceId,
  isAdminView = false,
  onClose,
  onAccept,
  onCancel,
  onComplete,
  onNoShow,
}: AppointmentDetailsModalProps) {
  // `estimatedCompletion` is a duration in MINUTES (see lib/duration.ts).
  const estCompletionLabel = formatDuration(estimatedCompletion);

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
          className="bg-white rounded-t-xl"
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
            contentContainerStyle={{
              paddingBottom: isAdminView && (status === 'pending' || status === 'accepted' || status === 'ongoing') ? 8 : 16,
            }}
          >
            {/* Branch info means nothing to the supervisor viewing it - it's always their own
                branch - so admin view shows who the customer is instead, which is the thing
                actually missing there. Customer view keeps the branch, which is what's
                relevant to them. */}
            {isAdminView ? (
              <View className="px-5 py-3 flex-row items-center">
                <View
                  className="rounded-xl mr-3 bg-[#FAFAFA] items-center justify-center"
                  style={{ width: 48, height: 48 }}
                >
                  <Ionicons name="person" size={22} color="#999" />
                </View>
                <View className="flex-1 mr-2">
                  <Text className="text-[15px] font-bold text-[#1A1A1A]" numberOfLines={1}>{customerName || 'Customer'}</Text>
                  <Text className="text-[12px] text-[#999] mt-0.5" numberOfLines={1}>
                    {customerPhone || 'No contact number on file'}
                  </Text>
                </View>
                <TouchableOpacity
                  disabled={!customerPhone}
                  onPress={() => customerPhone && Linking.openURL(`tel:${customerPhone.replace(/[^0-9+]/g, '')}`)}
                  className={`flex-row items-center px-3 py-2 rounded-full ${
                    customerPhone ? 'bg-[#F9EF08]' : 'bg-[#F5F5F5]'
                  }`}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={14} color={customerPhone ? '#1A1A00' : '#C4C4C4'} />
                  <Text
                    className={`text-[12px] font-bold ml-1.5 ${customerPhone ? 'text-[#1A1A00]' : 'text-[#C4C4C4]'}`}
                    numberOfLines={1}
                  >
                    Call Customer
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
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
            )}

            <Divider />

            {/* Vehicle */}
            {(vehicleName || plateNumber) && (
              <>
                <View className="px-5 py-3 flex-row items-center justify-between">
                  <Text className="text-[13px] text-[#666]">
                    <Text className="text-[#999]">Vehicle Name: </Text>
                    {vehicleName || '-'}
                  </Text>
                  <Text className="text-[13px] text-[#999]">{plateNumber} {classification}</Text>
                </View>
                <Divider />
              </>
            )}

            {/* Date & Time */}
            <View className="px-5 py-3">
              <Row label="Date" value={formatDate(date)} />
              {time ? <Row label="Time" value={time} /> : null}
              {estCompletionLabel ? (
                <Row label="Est. Completion" value={estCompletionLabel} />
              ) : null}
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
              {isAdminView && appointmentId && <Row label="Appointment ID" value={appointmentId} />}
              <View className="flex-row justify-between items-center py-1">
                <Text className="text-[13px] text-[#999]">Payment Method</Text>
                {paymentMethod?.toLowerCase() === 'maya' ? (
                  <Image
                    source={require('../../../../../assets/images/maya_logo.png')}
                    style={{ width: 51, height: 16 }}
                    resizeMode="contain"
                  />
                ) : (
                  <Text className="text-[13px] font-semibold text-[#1A1A1A]">
                    {paymentMethod || 'Not selected'}
                  </Text>
                )}
              </View>
              {isAdminView && paymentReferenceId && <Row label="Transaction ID" value={paymentReferenceId} />}
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

            {/* Disclaimer – user side only */}
            {!isAdminView && (
              <View className="px-5 pt-4 pb-2">
                <Text className="text-[13px] font-semibold text-[#1A1A1A] text-center mb-1">Disclaimer</Text>
                <Text className="text-[11px] text-[#999] italic text-center leading-[16px]">
                  Final duration of the carwash will depend on the car size and state
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Admin action buttons – fixed footer so they stay visible */}
          {isAdminView && (status === 'pending' || status === 'accepted' || status === 'ongoing') && (
            <>
              <Divider />
              <View className="px-5 py-4 flex-row gap-3 bg-white">
                {status === 'pending' ? (
                  <>
                    <TouchableOpacity
                      className="flex-1 bg-[#F9EF08] rounded-2xl py-3 items-center"
                      onPress={onAccept}
                      activeOpacity={0.85}
                    >
                      <Text className="text-[13px] font-bold text-[#1A1A00]" style={{ fontFamily: 'Inter_700Bold' }}>
                        Accept
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 bg-[#FAFAFA] border border-[#EEEEEE] rounded-2xl py-3 items-center"
                      onPress={onCancel}
                      activeOpacity={0.85}
                    >
                      <Text className="text-[13px] font-semibold text-[#1A1A1A]" style={{ fontFamily: 'Inter_600SemiBold' }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : status === 'accepted' ? (
                  // Deliberately just Cancel, not Start Wash/No-Show - the "no buttons in
                  // Confirmed" decision was about removing the wash-starting tap (client: extra
                  // friction), not about removing the ability to cancel a booking before its time
                  // arrives. A customer calling ahead to cancel needs a path that doesn't require
                  // waiting for the auto-trigger to move this to Ongoing first.
                  <TouchableOpacity
                    className="flex-1 bg-[#FAFAFA] border border-[#EEEEEE] rounded-2xl py-3 items-center"
                    onPress={onCancel}
                    activeOpacity={0.85}
                  >
                    <Text className="text-[13px] font-semibold text-[#1A1A1A]" style={{ fontFamily: 'Inter_600SemiBold' }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                ) : status === 'ongoing' ? (
                  // Ongoing is where every real decision lives now, not just Complete. Confirmed
                  // carries no Start Wash (client decision - the scheduled time alone triggers the
                  // move here), so "Ongoing" no longer reliably means a human confirmed the car
                  // showed up - it just means the clock passed the scheduled time. No-Show has to
                  // live here rather than on Confirmed, since by the time anyone's looking at
                  // this, that's exactly the question in play.
                  <>
                    <TouchableOpacity
                      className="flex-1 bg-[#F9EF08] rounded-2xl py-3 items-center"
                      onPress={onComplete}
                      activeOpacity={0.85}
                    >
                      <Text className="text-[14px] font-bold text-[#1A1A00]" style={{ fontFamily: 'Inter_700Bold' }}>
                        Complete
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="bg-[#FAFAFA] rounded-2xl py-2.5 px-4 items-center"
                      onPress={onNoShow}
                      activeOpacity={0.85}
                    >
                      <Text className="text-[12px] font-semibold text-[#1A1A1A]" style={{ fontFamily: 'Inter_600SemiBold' }}>
                        No-Show
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="bg-[#FAFAFA] rounded-2xl py-2.5 px-4 items-center"
                      onPress={onCancel}
                      activeOpacity={0.85}
                    >
                      <Text className="text-[12px] font-semibold text-[#1A1A1A]" style={{ fontFamily: 'Inter_600SemiBold' }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            </>
          )}

          {/* Customer footer - lets them jump to the live status timeline for anything still active */}
          {!isAdminView && status && status !== 'cancelled' && (
            <>
              <Divider />
              <View className="px-5 pt-4 pb-7 bg-white">
                <TouchableOpacity
                  className="bg-[#F9EF08] rounded-2xl py-3.5 items-center"
                  onPress={() => {
                    onClose();
                    router.push({
                      pathname: '/user/booking-progress' as any,
                      params: { appointmentId, date },
                    });
                  }}
                  activeOpacity={0.85}
                >
                  <Text className="text-[14px] font-bold text-[#1A1A00]">View Booking Status</Text>
                </TouchableOpacity>

                {/* Only while a branch hasn't acted on it yet - once accepted, the branch is locked in */}
                {status === 'pending' && (
                  <TouchableOpacity
                    className="bg-white border border-[#EEEEEE] rounded-2xl py-3.5 items-center mt-2.5"
                    onPress={() => {
                      onClose();
                      router.push({
                        pathname: '/user/switch-branch' as any,
                        params: { appointmentId, date },
                      });
                    }}
                    activeOpacity={0.85}
                  >
                    <Text className="text-[14px] font-bold text-[#1A1A1A]">Look for Another Branch</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
