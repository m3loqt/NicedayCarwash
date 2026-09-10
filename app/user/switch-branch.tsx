import { useAlert } from '@/hooks/use-alert';
import { getSwitchableBranches, moveBookingToBranch } from '@/lib/branchSwitch';
import { consumeClientRateLimit } from '@/lib/clientRateLimit';
import { formatDistance, getCurrentLocation, haversineMeters } from '@/lib/location';
import { db } from '@/firebase/firebase';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { get, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SwitchableBranch {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

export default function SwitchBranchScreen() {
  const { appointmentId, date } = useLocalSearchParams<{ appointmentId: string; date: string }>();
  const { showAlert, AlertComponent } = useAlert();
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<SwitchableBranch[]>([]);
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
            if (!profile?.name) return null;
            const lat = Number(profile.latitude);
            const lng = Number(profile.longitude);
            return {
              id,
              name: profile.name,
              address: profile.address || '',
              latitude: isFinite(lat) ? lat : undefined,
              longitude: isFinite(lng) ? lng : undefined,
            } as SwitchableBranch;
          })
        );

        if (!cancelled) {
          setBranches(profiles.filter((b): b is SwitchableBranch => b !== null));
        }
      } catch {
        if (!cancelled) {
          showAlert('Could not load nearby branches. Please try again.', { title: 'Something went wrong', type: 'error' });
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

  const sortedBranches = [...branches].sort((a, b) => {
    if (!userLocation || a.latitude === undefined || b.latitude === undefined) return 0;
    const da = haversineMeters(userLocation.latitude, userLocation.longitude, a.latitude!, a.longitude!);
    const db_ = haversineMeters(userLocation.latitude, userLocation.longitude, b.latitude!, b.longitude!);
    return da - db_;
  });

  const handleSwitch = async (branch: SwitchableBranch) => {
    if (!appointmentId || switchingId) return;

    const gate = consumeClientRateLimit(`switch-branch:${appointmentId}`, { windowMs: 8000, maxAttempts: 1 });
    if (!gate.allowed) {
      const waitSeconds = Math.ceil(gate.retryAfterMs / 1000);
      showAlert(`Too many attempts. Try again in ${waitSeconds}s.`, { title: 'Please wait', type: 'warning' });
      return;
    }

    setSwitchingId(branch.id);
    try {
      await moveBookingToBranch(appointmentId, branch.id);
      showAlert(`Your booking has been moved to ${branch.name}.`, {
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
      showAlert(error?.message || 'Could not switch branches. Please try again.', {
        title: 'Something went wrong',
        type: 'error',
      });
    } finally {
      setSwitchingId(null);
    }
  };

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
          Switch Branch
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F9EF08" />
        </View>
      ) : sortedBranches.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="location-outline" size={48} color="#E0E0E0" />
          <Text className="text-[17px] font-bold text-[#1A1A1A] mt-4 mb-1.5 text-center">
            No branches available
          </Text>
          <Text className="text-[13px] text-[#999] text-center leading-5" style={{ maxWidth: 260 }}>
            No other nearby branches have room for this exact date and time right now.
          </Text>
        </View>
      ) : (
        <ScrollView className="px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <Text className="text-[12px] text-[#999] mb-3">
            These branches have room for your selected date and time - tap one to move your booking there.
          </Text>
          {sortedBranches.map((branch) => {
            const hasCoords = userLocation && branch.latitude !== undefined && branch.longitude !== undefined;
            const distanceText = hasCoords
              ? formatDistance(
                  haversineMeters(userLocation!.latitude, userLocation!.longitude, branch.latitude!, branch.longitude!)
                )
              : null;
            const isSwitching = switchingId === branch.id;

            return (
              <TouchableOpacity
                key={branch.id}
                className="bg-white border border-[#EEEEEE] rounded-2xl px-4 py-4 mb-3 flex-row items-center"
                onPress={() => handleSwitch(branch)}
                activeOpacity={0.8}
                disabled={!!switchingId}
              >
                <View className="w-11 h-11 rounded-full bg-[#FAFAFA] items-center justify-center mr-3">
                  <Ionicons name="business-outline" size={20} color="#666" />
                </View>
                <View className="flex-1 mr-2">
                  <Text className="text-[14px] font-bold text-[#1A1A1A]" numberOfLines={1}>
                    {branch.name}
                  </Text>
                  <Text className="text-[12px] text-[#999] mt-0.5" numberOfLines={1}>
                    {branch.address}
                  </Text>
                </View>
                {isSwitching ? (
                  <ActivityIndicator size="small" color="#1A1A1A" />
                ) : (
                  <View className="items-end">
                    {distanceText && (
                      <Text className="text-[11px] font-bold text-[#999] mb-1">{distanceText}</Text>
                    )}
                    <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {AlertComponent}
    </SafeAreaView>
  );
}
