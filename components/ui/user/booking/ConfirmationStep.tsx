import { useAlert } from '@/hooks/use-alert';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';
import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AlertModal from './modals/AlertModal';

interface ServiceOrAddon {
  id: string;
  name: string;
  sedan?: number;
  suv?: number;
  pickup?: number;
  price?: number;
  estimatedTime?: number;
}

interface ConfirmationStepProps {
  branch: { id: string; name: string; address?: string; image?: any };
  vehicle: { vname: string; vplateNumber: string; classification?: string; vtype?: string };
  services: ServiceOrAddon[];
  addons: ServiceOrAddon[];
  date: Date | null;
  timeSlot: { time: string } | null;
  totalEstimatedTime: number;
  paymentMethod: string | null;
  onBack?: () => void;
  onDone?: () => void;
}

const getClassificationName = (vtype?: string): string => {
  if (!vtype) return '';
  const map: Record<string, string> = {
    sedan: 'Sedan',
    suv: 'SUV',
    pickup: 'Pickup',
    'motorcycle-small': 'Motorcycle (S)',
    'motorcycle-large': 'Motorcycle (L)',
  };
  return map[vtype.toLowerCase()] || vtype;
};

const getVehicleIcon = (vehicleType?: string) => {
  switch (vehicleType?.toLowerCase()) {
    case 'sedan': return require('../../../../assets/images/sedan.png');
    case 'suv': return require('../../../../assets/images/suv.png');
    case 'pickup': return require('../../../../assets/images/pickup.png');
    case 'motorcycle-small': return require('../../../../assets/images/motosmall.png');
    case 'motorcycle-large': return require('../../../../assets/images/motobig.png');
    default: return require('../../../../assets/images/sedan.png');
  }
};

const getPriceForClassification = (item: ServiceOrAddon, classification?: string): number => {
  if (item.price) return item.price;
  switch (classification?.toLowerCase()) {
    case 'sedan': return item.sedan || 0;
    case 'suv': return item.suv || 0;
    case 'pickup': return item.pickup || 0;
    default: return item.sedan || 0;
  }
};

const formatDate = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const formatTimeRange = (timeSlot: { time: string } | null, estimatedMins: number): string => {
  if (!timeSlot) return '';
  const match = timeSlot.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return timeSlot.time;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  const endMinutes = hour * 60 + minute + estimatedMins;
  const endHour = Math.floor(endMinutes / 60) % 24;
  const endMin = endMinutes % 60;
  const endPeriod = endHour >= 12 ? 'PM' : 'AM';
  const endHour12 = endHour > 12 ? endHour - 12 : endHour === 0 ? 12 : endHour;
  return `${timeSlot.time} – ${endHour12}:${endMin.toString().padStart(2, '0')} ${endPeriod}`;
};

// ─── Row helper ────────────────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center py-2.5 border-b border-[#F5F5F5]">
      <Text className="text-[12px] text-[#999]">{label}</Text>
      <Text className="text-[13px] font-semibold text-[#1A1A1A]">{value}</Text>
    </View>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-[10px] font-semibold tracking-widest text-[#999] uppercase mb-2">
      {children}
    </Text>
  );
}

export default function ConfirmationStep({
  branch,
  vehicle,
  services,
  addons,
  date,
  timeSlot,
  totalEstimatedTime,
  paymentMethod,
  onBack,
  onDone,
}: ConfirmationStepProps) {
  const { alert, AlertComponent } = useAlert();
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState('');
  const [alertModal, setAlertModal] = useState<{
    visible: boolean; title: string; message: string;
  }>({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string) =>
    setAlertModal({ visible: true, title, message });

  const generateAppointmentId = () =>
    `ND-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;

  const formatDateForPath = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${m}-${day}-${y}`;
  };

  const classificationForPrice = vehicle?.vtype || vehicle?.classification?.toLowerCase() || '';
  const bookingFee = 25.00;
  const orderSummary = [
    ...services.map(s => ({ label: s.name, price: getPriceForClassification(s, classificationForPrice) })),
    ...addons.map(a => ({ label: a.name, price: getPriceForClassification(a, classificationForPrice) })),
    { label: 'Booking Fee', price: bookingFee },
  ];
  const amountDue = orderSummary.reduce((sum, i) => sum + i.price, 0);
  const fmt = (v: number) => `₱ ${v.toFixed(2)}`;

  const handleConfirm = async () => {
    if (!date || !timeSlot) {
      showAlert('Missing info', 'Please select a date and time slot.');
      return;
    }
    setSubmitting(true);
    try {
      const auth = getAuth();
      const userId = auth.currentUser?.uid;
      if (!userId) {
        showAlert('Not authenticated', 'Please sign in and try again.');
        setSubmitting(false);
        return;
      }
      const db = getDatabase();
      const appointmentId = generateAppointmentId();
      const datePath = formatDateForPath(date);
      const classification = vehicle.classification || getClassificationName(vehicle.vtype) || '';
      const bookingData = {
        appointmentId,
        branchName: branch.name,
        branchAddress: branch.address || '',
        paymentMethod: paymentMethod || '',
        status: 'pending',
        isPaid: false,
        createdAt: new Date().toISOString(),
        note: note.trim() || '',
        amountDue,
        timeSlot: {
          time: timeSlot.time,
          appointmentDate: formatDateForPath(date),
          available: true,
          estCompletion: String(totalEstimatedTime),
        },
        vehicleDetails: {
          vehicleName: vehicle.vname || '',
          plateNumber: vehicle.vplateNumber || '',
          classification,
        },
        services: services.map(s => ({
          name: s.name,
          price: getPriceForClassification(s, classificationForPrice),
          estimatedTime: String(s.estimatedTime || 0),
        })),
        addOns: addons.map(a => ({
          name: a.name,
          price: getPriceForClassification(a, classificationForPrice),
          estimatedTime: String(a.estimatedTime || 0),
        })),
      };
      await set(ref(db, `Reservations/ReservationsByUser/${userId}/${datePath}/${appointmentId}`), bookingData);
      await set(ref(db, `Notifications/ByBranch/${branch.id}/pendingBookings/${appointmentId}`), {
        userId,
        dateKey: datePath,
        appointmentId,
        branchId: branch.id,
        branchName: branch.name,
        createdAt: bookingData.createdAt,
      });
      setSubmitting(false);
      onDone?.();
      router.replace({ pathname: '/user/booking-success', params: { appointmentId } } as any);
    } catch {
      showAlert('Something went wrong', 'Failed to save your booking. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingBottom: 110, paddingTop: 16 }}>

        <View className="mx-4 mb-4 bg-[#FAFAFA] rounded-2xl px-4 pt-5 pb-4">

          {/* Branch */}
          <SectionLabel>Branch</SectionLabel>
          <Text className="text-[14px] font-bold text-[#1A1A1A] mb-0.5">{branch?.name}</Text>
          <View className="flex-row items-center mb-5">
            <Ionicons name="location-outline" size={11} color="#9CA3AF" style={{ marginRight: 3 }} />
            <Text className="text-[12px] text-[#999] flex-1">{branch?.address || 'No address'}</Text>
          </View>

          {/* Vehicle */}
          <SectionLabel>Vehicle</SectionLabel>
          <View className="flex-row items-center mb-5">
            <Image
              source={getVehicleIcon(vehicle?.vtype || vehicle?.classification)}
              style={{ width: 40, height: 26, tintColor: '#1A1A1A' }}
              resizeMode="contain"
            />
            <View className="flex-1 ml-3">
              <Text className="text-[13px] font-semibold text-[#1A1A1A]">{vehicle?.vname}</Text>
              <Text className="text-[11px] text-[#999] mt-0.5">
                {vehicle?.vplateNumber}  ·  {vehicle?.classification || getClassificationName(vehicle?.vtype)}
              </Text>
            </View>
          </View>

          {/* Date & Time */}
          {date && (
            <>
              <SectionLabel>Date &amp; Time</SectionLabel>
              <Row label="Appointment date" value={formatDate(date)} />
              {timeSlot && <Row label="Time" value={formatTimeRange(timeSlot, totalEstimatedTime)} />}
              <View className="mb-5">
                <Row label="Est. duration" value={`${totalEstimatedTime} mins`} />
              </View>
            </>
          )}

          {/* Order Summary */}
          <SectionLabel>Order Summary</SectionLabel>
          {orderSummary.map((item, i) => (
            <Row key={i} label={item.label} value={fmt(item.price)} />
          ))}
          <View className="flex-row justify-between items-center pt-3 mb-5">
            <Text className="text-[13px] font-bold text-[#1A1A1A]">Amount Due</Text>
            <Text className="text-[15px] font-bold text-[#1A1A1A]">{fmt(amountDue)}</Text>
          </View>

          {/* Payment */}
          <SectionLabel>Payment</SectionLabel>
          <View className="mb-5">
            <Row label="Method" value={paymentMethod || 'Not selected'} />
          </View>

          {/* Note */}
          <SectionLabel>Note to Branch</SectionLabel>
          <TextInput
            className="bg-white border border-[#EEEEEE] rounded-xl px-3 py-3 text-[#1A1A1A] mb-4"
            placeholder="e.g. I'd like to request a specific washer"
            placeholderTextColor="#C4C4C4"
            multiline
            numberOfLines={3}
            value={note}
            onChangeText={setNote}
            textAlignVertical="top"
            style={{ fontSize: 12, minHeight: 72 }}
          />

          {/* Disclaimer */}
          <Text className="text-[11px] text-[#C4C4C4] italic text-center">
            Final duration will depend on the vehicle's size and condition.
          </Text>

        </View>

      </ScrollView>

      {/* Confirm Button */}
      <View className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-3 bg-white border-t border-[#F5F5F5]">
        <TouchableOpacity
          className="bg-[#F9EF08] rounded-2xl py-4 items-center"
          onPress={handleConfirm}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#1A1A00" />
          ) : (
            <Text className="text-[14px] font-bold text-[#1A1A00]">Confirm Booking</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Alert Modal */}
      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        onClose={() => setAlertModal(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}
