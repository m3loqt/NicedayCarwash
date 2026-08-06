import Barcode from '@/components/ui/user/receipt/Barcode';
import { logError } from '@/lib/logger';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { getAuth } from 'firebase/auth';
import { getDatabase, onValue, ref } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

interface ReceiptItem {
  name?: string;
  price?: number | string;
}

interface BookingData {
  appointmentId: string;
  branchName: string;
  status: string;
  timeSlot?: { time: string; appointmentDate: string; estCompletion?: string };
  vehicleDetails?: { vehicleName: string; plateNumber: string; classification: string };
  amountDue: number;
  paymentMethod?: string;
  services?: ReceiptItem[];
  addOns?: ReceiptItem[];
  completedAt?: string;
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

  const handleCopyTransactionId = async () => {
    if (!booking?.transactionId) return;
    await Clipboard.setStringAsync(booking.transactionId);
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
  const estMinutes = parseFloat(String(booking.timeSlot?.estCompletion || '0').replace(/[^\d.]/g, '')) || 0;
  const estHours = estMinutes >= 60 ? +(estMinutes / 60).toFixed(1) : null;
  const durationLabel = estHours
    ? `${estHours} ${estHours === 1 ? 'Hour' : 'Hours'}`
    : estMinutes > 0
    ? `${estMinutes} Minutes`
    : '—';
  const transactionId = booking.transactionId || booking.appointmentId;
  const completedLabel = formatDateTime(booking.completedAt);

  const orderRows = [
    ...(booking.services?.map((s) => ({ label: s.name || 'Service', price: s.price })) ?? []),
    ...(booking.addOns?.map((a) => ({ label: a.name || 'Add-on', price: a.price })) ?? []),
    { label: 'Booking Fee', price: 25 },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text className="text-[17px] font-inter-semibold tracking-tight text-[#1A1A1A] ml-2">E-Receipt</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
          <View className="bg-white px-6 pt-4 pb-6">
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
            <Row label="Branch" value={booking.branchName || '—'} />

            <View className="h-[0.5px] bg-[#EEEEEE] my-3" />

            {orderRows.map((item, idx) => (
              <Row key={idx} label={item.label} value={formatPrice(item.price)} />
            ))}

            <View className="h-[0.5px] bg-[#EEEEEE] my-3" />

            <Row label="Total" value={formatPrice(booking.amountDue)} bold />

            <View className="h-[0.5px] bg-[#EEEEEE] my-3" />

            <Row label="Payment Method" value={booking.paymentMethod || 'Cash'} />
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
          </View>
        </ViewShot>

        <View className="px-6 mt-4">
          <TouchableOpacity
            className={`bg-[#1A1A1A] rounded-full py-4 items-center ${downloading ? 'opacity-60' : ''}`}
            onPress={handleDownload}
            disabled={downloading}
            activeOpacity={0.85}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-[14px] font-inter-bold tracking-tight text-white">Download E-Receipt</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
