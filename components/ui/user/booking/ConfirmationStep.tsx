import { useAlert } from '@/hooks/use-alert';
import { checkBranchCapacity } from '@/lib/capacityCheck';
import { consumeClientRateLimit } from '@/lib/clientRateLimit';
import { formatDuration } from '@/lib/duration';
import { logWarn } from '@/lib/logger';
import { payBookingFeeWithMaya } from '@/lib/mayaPayment';
import { sanitizePlainText } from '@/lib/sanitize';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';
import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
  const { showAlert, AlertComponent } = useAlert();
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState('');

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
      showAlert('Please select a date and time slot.', { title: 'Missing info', type: 'warning' });
      return;
    }
    setSubmitting(true);
    try {
      const auth = getAuth();
      const userId = auth.currentUser?.uid;
      if (!userId) {
        showAlert('Please sign in and try again.', { title: 'Not authenticated', type: 'error' });
        setSubmitting(false);
        return;
      }
      const bookingThrottle = consumeClientRateLimit(`booking-submit:${userId}`, {
        windowMs: 15000,
        maxAttempts: 1,
      });
      if (!bookingThrottle.allowed) {
        setSubmitting(false);
        const waitSeconds = Math.ceil(bookingThrottle.retryAfterMs / 1000);
        logWarn('ConfirmationStep.handleConfirm', 'Client throttle blocked repeated booking submit', { userId, waitSeconds });
        showAlert(`Too many attempts. Try again in ${waitSeconds}s.`, { title: 'Please wait', type: 'warning' });
        return;
      }
      const db = getDatabase();
      const appointmentId = generateAppointmentId();
      const datePath = formatDateForPath(date);

      // Soft, conservative pre-payment check to reject obvious overbooking — bay assignment
      // itself stays a manual admin decision, since actual wash duration varies by vehicle
      // condition and can't be fully predicted here. Fails open on infrastructure errors (e.g.
      // a Cloud Function hiccup) rather than blocking every booking over a transient issue.
      try {
        const capacity = await checkBranchCapacity(branch.id, datePath, timeSlot.time, totalEstimatedTime);
        if (!capacity.ok) {
          showAlert(capacity.reason || 'Please choose another time slot.', { title: 'Branch fully booked', type: 'warning' });
          setSubmitting(false);
          return;
        }
      } catch (capacityError) {
        logWarn('ConfirmationStep.handleConfirm', 'Capacity check failed, proceeding with booking', { capacityError });
      }

      const classification = vehicle.classification || getClassificationName(vehicle.vtype) || '';
      const bookingData = {
        appointmentId,
        branchId: branch.id,
        branchName: branch.name,
        branchAddress: branch.address || '',
        paymentMethod: paymentMethod || '',
        status: 'pending',
        isPaid: false,
        createdAt: new Date().toISOString(),
        note: sanitizePlainText(note, 240),
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

      let paymentStatus: 'paid' | 'unconfirmed' | 'error' = 'unconfirmed';
      try {
        paymentStatus = await payBookingFeeWithMaya(appointmentId, datePath, userId);
      } catch (paymentError) {
        logWarn('ConfirmationStep.handleConfirm', 'Maya checkout failed after booking was created', { appointmentId, paymentError });
        paymentStatus = 'error';
      }

      setSubmitting(false);
      onDone?.();
      router.replace({ pathname: '/user/booking-success', params: { appointmentId, paymentStatus, dateKey: datePath } } as any);
    } catch {
      showAlert('Failed to save your booking. Please try again.', { title: 'Something went wrong', type: 'error' });
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <ScrollView contentContainerStyle={{ paddingBottom: 110, paddingTop: 16 }}>

        <View className="mx-4 mb-4 bg-white rounded-2xl px-4 pt-5 pb-4">

          {/* Branch + Vehicle — plain rows, matching the rest of this summary's style */}
          <Row label="Branch" value={branch?.name || ''} />
          <View className="mb-5">
            <Row
              label="Vehicle"
              value={`${vehicle?.vname || ''} · ${vehicle?.vplateNumber || ''} · ${
                vehicle?.classification || getClassificationName(vehicle?.vtype)
              }`}
            />
          </View>

          {/* Date & Time */}
          {date && (
            <>
              <SectionLabel>Date &amp; Time</SectionLabel>
              <Row label="Appointment date" value={formatDate(date)} />
              {timeSlot && <Row label="Time" value={formatTimeRange(timeSlot, totalEstimatedTime)} />}
              <View className="mb-5">
                <Row label="Est. duration" value={formatDuration(totalEstimatedTime) || '—'} />
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
          <View className="flex-row justify-between items-center py-2.5 mb-5 border-b border-[#F5F5F5]">
            <Text className="text-[12px] text-[#999]">Method</Text>
            {paymentMethod ? (
              <Image
                source={require('../../../../assets/images/maya_logo.png')}
                style={{ width: 45, height: 14 }}
                resizeMode="contain"
              />
            ) : (
              <Text className="text-[13px] font-semibold text-[#1A1A1A]">Not selected</Text>
            )}
          </View>

          {/* Note */}
          <SectionLabel>Note to Branch</SectionLabel>
          <TextInput
            className="bg-[#FAFAFA] border border-[#EEEEEE] rounded-xl px-3 py-3 text-[#1A1A1A] mb-4"
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

      {AlertComponent}
    </View>
  );
}







