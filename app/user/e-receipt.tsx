import Barcode from '@/components/ui/user/receipt/Barcode';
import { formatDuration } from '@/lib/duration';
import { logError } from '@/lib/logger';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { getAuth } from 'firebase/auth';
import { get, getDatabase, onValue, ref } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

interface ReceiptItem {
  name?: string;
  price?: number | string;
}

interface BookingData {
  appointmentId: string;
  branchName: string;
  branchAddress?: string;
  branchId?: string;
  status: string;
  timeSlot?: { time: string; appointmentDate: string; estCompletion?: string };
  vehicleDetails?: { vehicleName: string; plateNumber: string; classification: string };
  amountDue: number;
  paymentMethod?: string;
  services?: ReceiptItem[];
  addOns?: ReceiptItem[];
  completedAt?: string;
  mayaPaymentId?: string;
  transactionId?: string;
}

const formatDateTime = (isoLike?: string): string => {
  if (!isoLike) return '';
  const d = new Date(isoLike);
  if (isNaN(d.getTime())) return isoLike;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} | ${hours}:${minutes} ${ampm}`;
};

const formatAppointmentDateTime = (appointmentDate?: string, time?: string): string => {
  if (!appointmentDate) return '';
  const parts = appointmentDate.split('-');
  if (parts.length !== 3) return appointmentDate;
  const [month, day, year] = parts.map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (!month || month < 1 || month > 12) return appointmentDate;
  const datePart = `${months[month - 1]} ${day}, ${year}`;
  return time ? `${datePart} | ${time}` : datePart;
};

const formatPrice = (value?: number | string): string => {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return `₱${(isNaN(num) ? 0 : num).toFixed(2)}`;
};

// Small punched-hole notches along the top/bottom edge, colored to match the page background
// behind the ticket - the classic "torn receipt" look.
function ScallopEdge({ position }: { position: 'top' | 'bottom' }) {
  const notches = Array.from({ length: 16 });
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -6,
        right: -6,
        [position]: -7,
        flexDirection: 'row',
        justifyContent: 'space-between',
      }}
    >
      {notches.map((_, i) => (
        <View
          key={i}
          style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#FAFAFA' }}
        />
      ))}
    </View>
  );
}

// RN can't render a dashed line via a filled background (only via a border), so this is a
// zero-height view with just a dashed bottom border rather than the old solid bg-[#EEEEEE] fill.
function Divider() {
  return (
    <View
      className="my-3"
      style={{ borderBottomWidth: 1, borderStyle: 'dashed', borderColor: '#DADADA' }}
    />
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View className="flex-row justify-between items-center py-2">
      <Text className="text-[12.5px] font-inter-regular tracking-tight text-[#999]">{label}</Text>
      <Text
        className={`text-[13px] tracking-tight text-[#1A1A1A] ${bold ? 'font-inter-bold' : 'font-inter-semibold'}`}
      >
        {value}
      </Text>
    </View>
  );
}

export default function EReceiptScreen() {
  const { appointmentId, date } = useLocalSearchParams<{ appointmentId: string; date: string }>();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [branchPhone, setBranchPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  const uid = getAuth().currentUser?.uid;

  useEffect(() => {
    if (!appointmentId || !date || !uid) {
      setLoading(false);
      return;
    }
    const db = getDatabase();
    const bookingRef = ref(db, `Reservations/ReservationsByUser/${uid}/${date}/${appointmentId}`);
    const unsubscribe = onValue(bookingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const servicesObj = data.services;
        const services = Array.isArray(servicesObj)
          ? servicesObj
          : servicesObj && typeof servicesObj === 'object'
          ? Object.values(servicesObj)
          : [];
        const addOnsObj = data.addOns;
        const addOns = Array.isArray(addOnsObj)
          ? addOnsObj
          : addOnsObj && typeof addOnsObj === 'object'
          ? Object.values(addOnsObj)
          : [];
        setBooking({ ...data, services, addOns });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [appointmentId, date, uid]);

  // Branch phone isn't stored on the booking record itself (only branchName/branchAddress are),
  // so it's a one-time fetch once we know which branch - static receipt, no need for a live
  // subscription like the booking data above.
  useEffect(() => {
    if (!booking?.branchId) return;
    const db = getDatabase();
    get(ref(db, `Branches/${booking.branchId}/profile/contact_number`)).then((snap) => {
      if (snap.exists()) setBranchPhone(snap.val());
    });
  }, [booking?.branchId]);

  const handleCopyTransactionId = async () => {
    const id = booking?.mayaPaymentId || booking?.transactionId || booking?.appointmentId;
    if (!id) return;
    await Clipboard.setStringAsync(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = async () => {
    if (!viewShotRef.current?.capture) return;
    setDownloading(true);
    try {
      const uri = await viewShotRef.current.capture();
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Save E-Receipt' });
      }
    } catch (error) {
      logError('EReceipt.handleDownload', error, { context: 'Failed to capture/share e-receipt' });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color="#F9EF08" />
      </SafeAreaView>
    );
  }

  if (!booking || booking.status !== 'completed') {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8" edges={['top']}>
        <Ionicons name="receipt-outline" size={48} color="#E0E0E0" />
        <Text className="text-[14px] font-inter-medium tracking-tight text-[#999] mt-4 text-center">
          E-Receipt not available for this booking
        </Text>
        <TouchableOpacity
          className="mt-6 bg-[#F9EF08] rounded-2xl px-8 py-3"
          onPress={() => router.back()}
        >
          <Text className="text-[14px] font-inter-bold tracking-tight text-[#1A1A00]">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const classification = booking.vehicleDetails?.classification || '';
  const plateNumber = booking.vehicleDetails?.plateNumber || '';
  const durationLabel = formatDuration(booking.timeSlot?.estCompletion) || '—';
  const transactionId = booking.mayaPaymentId || booking.transactionId || booking.appointmentId;
  const completedLabel = formatDateTime(booking.completedAt);

  const orderRows = [
    ...(booking.services?.map((s) => ({ label: s.name || 'Service', price: s.price })) ?? []),
    ...(booking.addOns?.map((a) => ({ label: a.name || 'Add-on', price: a.price })) ?? []),
    { label: 'Booking Fee', price: 25 },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2 pb-5">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="w-9 h-9 rounded-full border border-[#EEEEEE] items-center justify-center"
        >
          <Ionicons name="chevron-back" size={20} color="#1A1A1A" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-[17px] font-bold text-[#1A1A1A] mr-9">
          E-Receipt
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
          {/* FAFAFA backdrop is captured along with the ticket so the scalloped notches (cut
              to match this exact color) still read correctly in the downloaded/shared image. */}
          <View style={{ backgroundColor: '#FAFAFA', paddingHorizontal: 20, paddingVertical: 24 }}>
            <View className="bg-white rounded-2xl px-6 pt-6 pb-7">
              <ScallopEdge position="top" />
              {/* Shop header - the branch's own identity, like a printed receipt's letterhead */}
              <View className="items-center mb-5">
                <Text className="text-[15px] font-inter-bold tracking-wide text-[#1A1A1A] uppercase text-center">
                  {booking.branchName || 'Nice Day Carwash'}
                </Text>
                {!!booking.branchAddress && (
                  <Text className="text-[11px] font-inter-regular tracking-tight text-[#999] mt-1 text-center">
                    Address: {booking.branchAddress}
                  </Text>
                )}
                {!!branchPhone && (
                  <Text className="text-[11px] font-inter-regular tracking-tight text-[#999] mt-0.5 text-center">
                    Tel: {branchPhone}
                  </Text>
                )}
              </View>

              {/* Barcode */}
              <View className="items-center mb-5">
                <Barcode value={transactionId} width={280} height={64} />
              </View>

            <Row
              label="Booking Date"
              value={formatAppointmentDateTime(booking.timeSlot?.appointmentDate, booking.timeSlot?.time) || '—'}
            />
            <Row label="Car" value={`${classification}${classification && plateNumber ? ' | ' : ''}${plateNumber}`} />
            <Row label="Estimated Service Duration" value={durationLabel} />

            <Divider />

            {orderRows.map((item, idx) => (
              <Row key={idx} label={item.label} value={formatPrice(item.price)} />
            ))}

            <Divider />

            <Row label="Total" value={formatPrice(booking.amountDue)} bold />

            <Divider />

            <View className="flex-row justify-between items-center py-2">
              <Text className="text-[12.5px] font-inter-regular tracking-tight text-[#999]">Payment Method</Text>
              {booking.paymentMethod?.toLowerCase() === 'maya' ? (
                <Image
                  source={require('../../assets/images/maya_logo.png')}
                  style={{ width: 51, height: 16 }}
                  resizeMode="contain"
                />
              ) : (
                <Text className="text-[13px] font-inter-bold tracking-tight text-[#1A1A1A]">
                  {booking.paymentMethod || 'Cash'}
                </Text>
              )}
            </View>
            <Row label="Date" value={completedLabel || '—'} />

            <View className="flex-row justify-between items-center py-2">
              <Text className="text-[12.5px] font-inter-regular tracking-tight text-[#999]">Transaction ID</Text>
              <TouchableOpacity className="flex-row items-center" onPress={handleCopyTransactionId} activeOpacity={0.7}>
                <Text className="text-[13px] font-inter-bold tracking-tight text-[#1A1A1A] mr-1.5">
                  {transactionId}
                </Text>
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={14} color="#999" />
              </TouchableOpacity>
            </View>

            <Divider />
            {/* Same brand line already used on the booking-success screen - Nice Day, not the
                specific branch, is what the client's own copy thanks the customer for. */}
            <Text className="text-[13px] font-inter-bold uppercase text-[#1A1A1A] text-center">
              Thank you for choosing Nice Day!
            </Text>

            <ScallopEdge position="bottom" />
            </View>
          </View>
        </ViewShot>

        <View className="px-6 mt-4">
          <TouchableOpacity
            className={`bg-[#F9EF08] rounded-full py-4 items-center ${downloading ? 'opacity-60' : ''}`}
            onPress={handleDownload}
            disabled={downloading}
            activeOpacity={0.85}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#1A1A00" />
            ) : (
              <Text className="text-[14px] font-inter-bold tracking-tight text-[#1A1A00]">Download E-Receipt</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
