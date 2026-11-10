import { useAlert } from '@/hooks/use-alert';
import { isBranchVisibleToCustomer } from '@/lib/branch';
import { getSwitchableBranches, moveBookingToBranch } from '@/lib/branchSwitch';
import { consumeClientRateLimit } from '@/lib/clientRateLimit';
import { formatDistance, getCurrentLocation, haversineMeters } from '@/lib/location';
import { auth, db } from '@/firebase/firebase';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { get, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { AppButton } from '@/components/ui/common/AppButton';
import RemoteImage from '@/components/ui/common/RemoteImage';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const BRANCH_IMAGES = [
  require('../../assets/images/branch1.jpg'),
  require('../../assets/images/branch2.jpg'),
  require('../../assets/images/branch3.jpg'),
];

interface SwitchableBranch {
  id: string;
  name: string;
  address: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
}

interface CurrentBooking {
  branchName: string;
  address: string;
  imageUrl?: string;
  summary: string;
}

function branchFromProfile(id: string, profile: any): SwitchableBranch {
  const lat = Number(profile.latitude);
  const lng = Number(profile.longitude);
  return {
    id,
    name: profile.name,
    address: profile.address || '',
    imageUrl: typeof profile.imageUrl === 'string' ? profile.imageUrl : undefined,
    latitude: isFinite(lat) ? lat : undefined,
    longitude: isFinite(lng) ? lng : undefined,
  };
}

// Reservations are keyed by an MM-DD-YYYY date key - turns it into "Oct 31, 2026" for display.
function formatDateKey(dateKey?: string): string | undefined {
  const [m, d, y] = (dateKey ?? '').split('-').map(Number);
  if (!m || !d || !y) return undefined;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SwitchBranchScreen() {
  const insets = useSafeAreaInsets();
  const { appointmentId, date } = useLocalSearchParams<{ appointmentId: string; date: string }>();
  const { showAlert, AlertComponent } = useAlert();
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<SwitchableBranch[]>([]);
  const [currentBooking, setCurrentBooking] = useState<CurrentBooking | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentLocation().then(setUserLocation);
  }, []);

  useEffect(() => {
    if (!appointmentId) return;
    let cancelled = false;

    (async () => {
      try {
        const branchIds = await getSwitchableBranches(appointmentId);
        if (cancelled) return;

        const profiles = await Promise.all(
          branchIds.map(async (id) => {
            const snap = await get(ref(db, `Branches/${id}/profile`));
            if (!snap.exists()) return null;
            const profile = snap.val();
            if (!isBranchVisibleToCustomer(profile)) return null;
            return branchFromProfile(id, profile);
          })
        );

        if (!cancelled) {
          setBranches(profiles.filter((b): b is SwitchableBranch => b !== null));
        }
      } catch {
        if (!cancelled) {
          showAlert("We couldn't load nearby branches.\nPlease try again", { title: 'Something went wrong', type: 'error' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  // Context for the picker (where the booking sits right now) - purely informational, so any
  // failure just leaves the card out rather than blocking the actual switch.
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !appointmentId || !date) return;
    let cancelled = false;

    (async () => {
      try {
        const bookingSnap = await get(ref(db, `Reservations/ReservationsByUser/${uid}/${date}/${appointmentId}`));
        if (!bookingSnap.exists()) return;
        const booking = bookingSnap.val();
        if (!booking.branchId) return;
        const profileSnap = await get(ref(db, `Branches/${booking.branchId}/profile`));
        if (!profileSnap.exists() || cancelled) return;
        const current = branchFromProfile(booking.branchId, profileSnap.val());
        const summary = [formatDateKey(date), booking.timeSlot?.time].filter(Boolean).join(' · ');
        setCurrentBooking({ branchName: current.name, address: current.address, imageUrl: current.imageUrl, summary });
      } catch {
        // see above
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appointmentId, date]);

  const sortedBranches = [...branches].sort((a, b) => {
    if (!userLocation || a.latitude === undefined || b.latitude === undefined) return 0;
    const da = haversineMeters(userLocation.latitude, userLocation.longitude, a.latitude!, a.longitude!);
    const db_ = haversineMeters(userLocation.latitude, userLocation.longitude, b.latitude!, b.longitude!);
    return da - db_;
  });

  const performSwitch = async (branch: SwitchableBranch) => {
    if (!appointmentId || switchingId) return;

    const gate = consumeClientRateLimit(`switch-branch:${appointmentId}`, { windowMs: 8000, maxAttempts: 1 });
    if (!gate.allowed) {
      const waitSeconds = Math.ceil(gate.retryAfterMs / 1000);
      showAlert(`You can try again in ${waitSeconds}s`, { title: 'Please wait', type: 'warning' });
      return;
    }

    setSwitchingId(branch.id);
    try {
      await moveBookingToBranch(appointmentId, branch.id);
      showAlert(`Your booking is now at ${branch.name}`, {
        title: 'Branch switched',
        type: 'success',
        buttons: [
          {
            text: 'OK',
            onPress: () => router.replace({ pathname: '/user/booking-progress' as any, params: { appointmentId, date } }),
          },
        ],
        dismissOnBackdrop: false,
      });
    } catch (error: any) {
      showAlert(error?.message || "We couldn't switch branches.\nPlease try again", {
        title: 'Something went wrong',
        type: 'error',
      });
    } finally {
      setSwitchingId(null);
    }
  };

  // Moving is one tap away from a stray touch on a list this long, so every pick is confirmed
  // first - the rate limit only counts once the user actually commits.
  const handleSelect = (branch: SwitchableBranch) => {
    if (!appointmentId || switchingId) return;
    const from = currentBooking ? ` from ${currentBooking.branchName}` : '';
    showAlert(`Move your booking${from} to ${branch.name}?\nSame date and time, no extra payment`, {
      title: 'Move booking?',
      type: 'info',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Move', onPress: () => performSwitch(branch) },
      ],
    });
  };

  // Same shell as the Bookings tab: a white title block over a #FAFAFA body of white, borderless cards.
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="bg-white px-5 pt-2 pb-6">
        <AppButton
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="w-9 h-9 rounded-full border border-[#EEEEEE] items-center justify-center"
        >
          <Ionicons name="chevron-back" size={20} color="#1A1A1A" />
        </AppButton>
        <Text className="text-3xl font-bold text-[#1A1A1A] mt-4">Switch Branch</Text>
      </View>

      <View className="flex-1 bg-[#FAFAFA]">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#F9EF08" />
          </View>
        ) : sortedBranches.length === 0 ? (
          <View className="flex-1 items-center justify-center px-10">
            <Ionicons name="location-outline" size={48} color="#E0E0E0" />
            <Text className="text-[19px] font-bold text-[#1A1A1A] mt-4 mb-1.5 text-center">
              No branches available
            </Text>
            <Text className="text-[14px] text-[#666] text-center leading-6" style={{ maxWidth: 280 }}>
              {'No other branches nearby have\nroom for this date and time'}
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
            {currentBooking && (
              <View className="mb-2">
                <Text className="px-5 pt-3 pb-2 text-[12px] font-bold text-[#999] uppercase tracking-wide">
                  Current branch
                </Text>
                <View className="bg-white rounded-2xl px-3 py-4 mx-5 flex-row items-center">
                  <RemoteImage
                    uri={currentBooking.imageUrl}
                    fallback={BRANCH_IMAGES[0]}
                    style={{ width: 60, height: 60, borderRadius: 12, marginRight: 16 }}
                  />
                  <View className="flex-1">
                    <Text className="text-[16px] font-bold text-[#1A1A1A] mb-1" numberOfLines={1}>
                      {currentBooking.branchName}
                    </Text>
                    {!!currentBooking.summary && (
                      <Text className="text-[13px] text-[#999]" numberOfLines={1}>
                        {currentBooking.summary}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            <Text className="px-5 pt-3 pb-2 text-[12px] font-bold text-[#999] uppercase tracking-wide">
              {sortedBranches.length} {sortedBranches.length === 1 ? 'branch has' : 'branches have'} room · tap to move
            </Text>

            {sortedBranches.map((branch, index) => {
              const hasCoords = userLocation && branch.latitude !== undefined && branch.longitude !== undefined;
              const distanceText = hasCoords
                ? formatDistance(
                    haversineMeters(userLocation!.latitude, userLocation!.longitude, branch.latitude!, branch.longitude!)
                  )
                : null;
              const isSwitching = switchingId === branch.id;

              return (
                <AppButton
                  key={branch.id}
                  className="bg-white rounded-2xl px-3 py-4 mx-5 mb-1.5 flex-row items-center"
                  onPress={() => handleSelect(branch)}
                  disabled={!!switchingId}
                >
                  <RemoteImage
                    uri={branch.imageUrl}
                    fallback={BRANCH_IMAGES[index % BRANCH_IMAGES.length]}
                    style={{ width: 60, height: 60, borderRadius: 12, marginRight: 16 }}
                  />
                  <View className="flex-1 mr-3">
                    <Text className="text-[16px] font-bold text-[#1A1A1A] mb-1" numberOfLines={1}>
                      {branch.name}
                    </Text>
                    <Text className="text-[13px] text-[#999] mb-1" numberOfLines={1}>
                      {distanceText ? `${distanceText} away` : 'Distance unavailable'}
                    </Text>
                    <Text className="text-[13px] text-[#BDBDBD]" numberOfLines={1}>
                      {branch.address}
                    </Text>
                  </View>
                  {isSwitching ? (
                    <ActivityIndicator size="small" color="#1A1A1A" />
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
                  )}
                </AppButton>
              );
            })}
          </ScrollView>
        )}
      </View>

      {AlertComponent}
    </SafeAreaView>
  );
}
