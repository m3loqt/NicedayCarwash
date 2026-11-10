import { AppButton } from '@/components/ui/common/AppButton';
import RemoteImage from '@/components/ui/common/RemoteImage';
import { useAlert } from '@/hooks/use-alert';
import { BOOKING_FEE } from '@/lib/bookingFee';
import { checkBranchCapacity } from '@/lib/capacityCheck';
import { consumeClientRateLimit } from '@/lib/clientRateLimit';
import { formatDuration } from '@/lib/duration';
import { formatPeso } from '@/lib/formatPeso';
import { logWarn } from '@/lib/logger';
import { payBookingFeeWithMaya } from '@/lib/mayaPayment';
import { sanitizePlainText } from '@/lib/sanitize';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { get, getDatabase, ref, remove, set } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Keyboard, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ServiceOrAddon {
  id: string;
  name: string;
  sedan?: number;
  suv?: number;
  pickup?: number;
  motorcycle?: number;
  price?: number;
  estimatedTime?: number;
}

interface ConfirmationStepProps {
  branch: { id: string; name: string; address?: string; image?: any; imageUrl?: string };
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
  const c = classification?.toLowerCase() ?? '';
  // vtype is 'motorcycle-small' / 'motorcycle-large'; classification strings may just say 'motorcycle'
  if (c.startsWith('motorcycle')) return item.motorcycle || 0;
  switch (c) {
    case 'sedan': return item.sedan || 0;
    case 'suv': return item.suv || 0;
    case 'pickup': return item.pickup || 0;
    default: return item.sedan || 0;
  }
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Thu, Nov 5" (the year is implied: bookings are at most a week out)
const formatDate = (date: Date): string =>
  `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;

// 12 hour clock label for a minutes-since-midnight value, e.g. 885 -> "2:45 PM"
const formatClock = (totalMinutes: number): string => {
  const h24 = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 > 12 ? h24 - 12 : h24 === 0 ? 12 : h24;
  return `${h12}:${String(minute).padStart(2, '0')} ${period}`;
};

// Estimated finish time for a slot such as "2:00 PM" plus the booking's total minutes.
const getEstimatedFinish = (timeSlot: { time: string } | null, estimatedMins: number): string => {
  if (!timeSlot || estimatedMins <= 0) return '';
  const match = timeSlot.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return '';
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return formatClock(hour * 60 + minute + estimatedMins);
};

// One white card per block of the review, no outline.
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <View className={`bg-white rounded-2xl p-4 mb-3 ${className}`}>{children}</View>;
}

// A quiet label, a title and an optional second line. The label says what the block is, which
// does the job a leading icon would, without mixing icon styles.
function InfoRow({
  label,
  title,
  subtitle,
  subtitleLines,
}: {
  label: string;
  title: string;
  subtitle?: string;
  subtitleLines?: number;
}) {
  return (
    <View>
      <Text className="text-[12px] text-[#6B6B6B]">{label}</Text>
      <Text className="text-[15px] font-semibold text-[#1A1A1A] mt-0.5">{title}</Text>
      {!!subtitle && (
        <Text className="text-[13px] text-[#6B6B6B] mt-0.5" numberOfLines={subtitleLines}>
          {subtitle}
        </Text>
      )}
    </View>
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
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState('');

  // A booking that's been written to the DB but hasn't yet reached the booking-success screen.
  // If the user backs out of a hung payment before then, the unmount cleanup below removes the
  // orphaned "pending" hold so it never lingers in their history or the active-booking bar.
  const pendingCleanupRef = useRef<
    { appointmentId: string; datePath: string; branchId: string; userId: string } | null
  >(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      const pending = pendingCleanupRef.current;
      if (!pending) return;
      const db = getDatabase();
      const { appointmentId, datePath, branchId, userId } = pending;
      // Only tear down a still-unpaid hold - if the webhook confirmed payment after we
      // unmounted (paid on Maya, then killed the app), leave the booking alone.
      get(ref(db, `Reservations/ReservationsByUser/${userId}/${datePath}/${appointmentId}/isPaid`))
        .then((snap) => {
          if (snap.val() === true) return;
          remove(ref(db, `Reservations/ReservationsByUser/${userId}/${datePath}/${appointmentId}`)).catch(() => {});
          remove(ref(db, `Notifications/ByBranch/${branchId}/pendingBookings/${appointmentId}`)).catch(() => {});
        })
        .catch(() => {});
    };
  }, []);

  const generateAppointmentId = () =>
    `ND-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;

  const formatDateForPath = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${m}-${day}-${y}`;
  };

  const classificationForPrice = vehicle?.vtype || vehicle?.classification?.toLowerCase() || '';
  const bookingFee = BOOKING_FEE;
  const orderSummary = [
    ...services.map(s => ({ label: s.name, price: getPriceForClassification(s, classificationForPrice) })),
    ...addons.map(a => ({ label: a.name, price: getPriceForClassification(a, classificationForPrice) })),
    { label: 'Booking Fee', price: bookingFee },
  ];
  const amountDue = orderSummary.reduce((sum, i) => sum + i.price, 0);
  // What the customer pays where: only the booking fee is charged online (Maya); services and add
  // ons are settled at the branch after the wash. amountDue (the stored total) is unchanged.
  const dueAtBranch = amountDue - bookingFee;
  const [noteFocused, setNoteFocused] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const noteRef = useRef<TextInput>(null);

  // The app runs edge to edge, so the window does not resize for the keyboard by itself.
  // KeyboardAvoidingView left stale padding behind once the keyboard closed, so the height is
  // tracked explicitly: the screen is padded by it while the keyboard is up, which lifts the note
  // field and the Pay button above it, and reset to 0 when it goes away.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  // Once the keyboard is up and the note is being edited, bring the note fully into view
  useEffect(() => {
    if (keyboardHeight <= 0 || !noteFocused) return;
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [keyboardHeight, noteFocused]);
  useEffect(() => {
    // Measured from where the keyboard actually starts on screen: its reported height can fall
    // short of the real overlap once the system navigation inset is involved.
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setKeyboardHeight(Math.max(0, Dimensions.get('screen').height - e.endCoordinates.screenY)),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
      // Android keeps focus on the field when the keyboard is closed with its own button, which
      // would leave the yellow "being typed in" outline on: drop focus with the keyboard.
      noteRef.current?.blur();
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const handleConfirm = async () => {
    if (!date || !timeSlot) {
      showAlert('Pick a date and a time to continue', { title: 'Missing info', type: 'warning' });
      return;
    }
    setSubmitting(true);
    try {
      const auth = getAuth();
      const userId = auth.currentUser?.uid;
      if (!userId) {
        showAlert('Your session has ended.\nSign in again to continue', { title: 'Please sign in', type: 'error' });
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
        showAlert(`You can try again in ${waitSeconds}s`, { title: 'Please wait', type: 'warning' });
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
      // From here on, if the screen unmounts before we hand off to booking-success, the hold
      // above is orphaned - mark it for teardown.
      pendingCleanupRef.current = { appointmentId, datePath, branchId: branch.id, userId };

      let paymentStatus: 'paid' | 'unconfirmed' | 'error' = 'unconfirmed';
      try {
        paymentStatus = await payBookingFeeWithMaya(appointmentId, datePath, userId);
      } catch (paymentError) {
        logWarn('ConfirmationStep.handleConfirm', 'Maya checkout failed after booking was created', { appointmentId, paymentError });
        paymentStatus = 'error';
      }

      // The user backed out of a hung payment - don't yank them to booking-success; the unmount
      // cleanup has already torn down the orphaned hold.
      if (!mountedRef.current) return;

      // Reached the hand-off - booking-success owns the booking now (it offers "Pay Again" for
      // the unpaid/error states), so it must not be torn down when this screen unmounts.
      pendingCleanupRef.current = null;
      setSubmitting(false);
      onDone?.();
      router.replace({ pathname: '/user/booking-success', params: { appointmentId, paymentStatus, dateKey: datePath } } as any);
    } catch {
      showAlert("We couldn't save your booking.\nPlease try again", { title: 'Something went wrong', type: 'error' });
      setSubmitting(false);
    }
  };

  const vehicleClassLabel = vehicle?.classification || getClassificationName(vehicle?.vtype);
  const estimatedFinish = getEstimatedFinish(timeSlot, totalEstimatedTime);
  const durationLabel = formatDuration(totalEstimatedTime);
  const planItems = services.map((s) => ({
    key: `s-${s.name}`,
    name: s.name,
    duration: formatDuration(s.estimatedTime),
    price: getPriceForClassification(s, classificationForPrice),
  }));
  const addonItems = addons.map((a) => ({
    key: `a-${a.name}`,
    name: a.name,
    duration: formatDuration(a.estimatedTime),
    price: getPriceForClassification(a, classificationForPrice),
  }));

  return (
    <View className="flex-1 bg-[#FAFAFA]" style={{ paddingBottom: keyboardHeight }}>
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
      >
        {/* Vehicle and branch share one card */}
        <Card>
          {/* The plate is what identifies a vehicle at a glance, so it gets a chip of its own;
              the vehicle type rides inline after the name, like the durations in the bill. */}
          <View>
            <Text className="text-[12px] text-[#6B6B6B]">Vehicle information</Text>
            <View className="flex-row items-center justify-between mt-1.5">
              <Text className="flex-1 text-[15px] font-semibold text-[#1A1A1A] pr-3">
                {vehicle?.vname || ''}
                {!!vehicleClassLabel && (
                  <Text className="text-[13px] font-normal text-[#6B6B6B]">{`   ${vehicleClassLabel}`}</Text>
                )}
              </Text>
              {!!vehicle?.vplateNumber && (
                <View className="rounded-lg bg-[#F3F3F3] px-2.5 py-1">
                  <Text className="text-[13px] font-semibold text-[#1A1A1A]" style={{ letterSpacing: 0.5 }}>
                    {vehicle.vplateNumber}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* The branch is the one block with real material to show: its own photo, the same one
              the branch list uses (RemoteImage handles the loading shimmer and the fallback). */}
          <View className="mt-4 pt-4 border-t border-[#F0F0F0]">
            <Text className="text-[12px] text-[#6B6B6B]">Branch address</Text>
            <View className="flex-row items-center mt-2">
              <RemoteImage
                uri={branch?.imageUrl}
                fallback={require('../../../../assets/images/branch1.jpg')}
                style={{ width: 56, height: 56, borderRadius: 12, marginRight: 12 }}
              />
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1A1A1A]">{branch?.name || ''}</Text>
                {!!branch?.address && (
                  <Text className="text-[13px] text-[#6B6B6B] mt-0.5" numberOfLines={2}>
                    {branch.address}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </Card>

        {/* Schedule */}
        {date && (
          <Card>
            <InfoRow
              label="Schedule"
              title={`${formatDate(date)}${timeSlot ? ` at ${timeSlot.time}` : ''}`}
              subtitle={
                durationLabel
                  ? `About ${durationLabel}${estimatedFinish ? `, done around ${estimatedFinish}` : ''}`
                  : undefined
              }
            />
          </Card>
        )}

        {/* The bill: what you picked, then who gets paid when. The wash adds up to the branch
            amount, and branch plus fee equals the total, so the maths is visible. */}
        <Card>
          <Text className="text-[12px] text-[#6B6B6B] mb-2.5">Your wash</Text>
          {[...planItems, ...addonItems].map((item, i) => (
            <View key={item.key} className={`flex-row items-start justify-between ${i > 0 ? 'mt-3' : ''}`}>
              <Text className="flex-1 text-[15px] font-medium text-[#1A1A1A] pr-3">
                {item.name}
                {!!item.duration && (
                  <Text className="text-[13px] font-normal text-[#6B6B6B]">{`   ${item.duration}`}</Text>
                )}
              </Text>
              <Text className="text-[15px] font-medium text-[#1A1A1A]">{formatPeso(item.price)}</Text>
            </View>
          ))}

          <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-[#F0F0F0]">
            <View className="flex-1 pr-3">
              <Text className="text-[15px] font-medium text-[#1A1A1A]">Pay at the branch</Text>
              <Text className="text-[13px] text-[#6B6B6B] mt-0.5">After your wash</Text>
            </View>
            <Text className="text-[15px] font-medium text-[#1A1A1A]">{formatPeso(dueAtBranch)}</Text>
          </View>
          <View className="flex-row items-center justify-between mt-4">
            <View className="flex-1 pr-3">
              <Text className="text-[15px] font-semibold text-[#1A1A1A]">Pay now</Text>
              <View className="flex-row items-center mt-0.5">
                <Text className="text-[13px] text-[#6B6B6B]">
                  {paymentMethod ? 'Booking fee, charged with ' : 'Payment method not selected'}
                </Text>
                {!!paymentMethod && (
                  <Image
                    source={require('../../../../assets/images/maya_logo.png')}
                    style={{ width: 50, height: 16 }}
                    resizeMode="contain"
                  />
                )}
              </View>
            </View>
            <Text className="text-[20px] font-bold text-[#1A1A1A]">{formatPeso(bookingFee)}</Text>
          </View>
          <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-[#F0F0F0]">
            <Text className="text-[15px] text-[#6B6B6B]">Total</Text>
            <Text className="text-[15px] text-[#6B6B6B]">{formatPeso(amountDue)}</Text>
          </View>
        </Card>

        {/* Note: outlined in yellow only while it is being typed in */}
        <View
          className={`bg-white rounded-2xl mb-3 border-2 ${noteFocused ? 'border-[#F9EF08]' : 'border-transparent'}`}
        >
          <TextInput
            ref={noteRef}
            className="px-4 py-3.5 text-[#1A1A1A]"
            placeholder="Add a note for the branch (optional)"
            placeholderTextColor="#6B7280"
            multiline
            maxLength={240}
            value={note}
            onChangeText={setNote}
            onFocus={() => setNoteFocused(true)}
            onBlur={() => setNoteFocused(false)}
            textAlignVertical="top"
            style={{ fontSize: 14, minHeight: 48 }}
          />
        </View>

        {/* A kind reminder: light grey card, small muted info glyph */}
        <View className="flex-row items-start rounded-2xl bg-[#F3F3F3] px-4 py-3">
          <Ionicons name="information-circle-outline" size={16} color="#6B6B6B" style={{ marginRight: 8, marginTop: 1 }} />
          <View className="flex-1">
            <Text className="text-[13px] font-semibold text-[#1A1A1A]">Please arrive a few minutes early.</Text>
            <Text className="text-[12px] leading-[17px] text-[#6B6B6B] mt-0.5">This helps us keep your slot on time.</Text>
          </View>
        </View>
      </ScrollView>

      {/* ------------------- BOOK ------------------- */}
      <View
        className="bg-white border-t border-[#EDEDED] px-4 pt-3"
        style={{ paddingBottom: keyboardHeight > 0 ? 12 : insets.bottom + 12 }}
      >
        <AppButton
          className="bg-[#F9EF08] rounded-2xl items-center justify-center"
          style={{ height: 52 }}
          onPress={handleConfirm}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel={`Pay ${formatPeso(bookingFee)} to book`}
        >
          {submitting ? (
            <ActivityIndicator color="#1A1A1A" />
          ) : (
            <Text className="text-[16px] font-bold text-[#1A1A1A]">Pay {formatPeso(bookingFee)} to book</Text>
          )}
        </AppButton>
      </View>

      {AlertComponent}
    </View>
  );
}
