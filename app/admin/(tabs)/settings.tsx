import { AnalyticsSkeleton } from '@/components/ui/admin/AdminScreenSkeleton';
import RemoteImage from '@/components/ui/common/RemoteImage';
import {
  RecentBookings,
  TotalSalesCard,
  useBranchAnalytics,
} from '@/components/ui/admin/analytics';
import SignOutModal from '@/components/ui/SignOutModal';
import { auth, db } from '@/firebase/firebase';
import { useAlert } from '@/hooks/use-alert';
import { useTabBarClearance } from '@/hooks/use-tab-bar-height';
import { logError } from '@/lib/logger';
import { registerForPushNotificationsAsync } from '@/lib/pushNotifications';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { get, ref, set } from 'firebase/database';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { AppButton } from '@/components/ui/common/AppButton';
import {
  Linking,
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Deterministic placeholder for a branch with no uploaded photo yet - same set the customer app
// falls back to, picked by branchId so the same branch always shows the same one.
const BRANCH_IMAGES = [
  require('../../../assets/images/branch1.jpg'),
  require('../../../assets/images/branch2.jpg'),
  require('../../../assets/images/branch3.jpg'),
];

type Period = 'daily' | 'weekly' | 'monthly';
const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: 'daily', label: 'Day' },
  { key: 'weekly', label: 'Week' },
  { key: 'monthly', label: 'Month' },
];
const PERIOD_COPY: Record<Period, { current: string; previous: string }> = {
  daily: { current: 'today', previous: 'yesterday' },
  weekly: { current: 'this week', previous: 'last week' },
  monthly: { current: 'this month', previous: 'last month' },
};

const formatPeso = (n: number): string => `₱${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const pctDelta = (curr: number, prev: number): number | null => {
  if (prev <= 0) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
};

function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 999, padding: 2 }}>
      {PERIOD_OPTIONS.map((opt) => {
        const active = opt.key === value;
        return (
          <AppButton
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: active ? '#FFFFFF' : 'transparent',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: active ? '700' : '500', color: active ? '#1A1A1A' : '#8A8A8A' }}>
              {opt.label}
            </Text>
          </AppButton>
        );
      })}
    </View>
  );
}

// Same white card in both states - only the icon, title, and subtitle change between
// accepting/not-accepting. `children` (the branch thumbnail + name) renders above the toggle
// row, inside the same card.
function ReservationStatusCard({
  accepting,
  onToggle,
  disabled,
  children,
}: {
  accepting: boolean;
  onToggle: (next: boolean) => void;
  disabled: boolean;
  children?: ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 16,
      }}
    >
      {children}
      {!!children && <View style={{ height: 1, backgroundColor: '#F5F5F5', marginVertical: 14 }} />}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
          {accepting ? (
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#F9EF08', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="checkmark" size={13} color="#1A1A00" />
            </View>
          ) : (
            <Ionicons name="close-circle" size={20} color="#1A1A1A" />
          )}
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A' }}>
              {accepting ? 'Accepting reservations' : 'Not accepting reservations'}
            </Text>
            <Text style={{ fontSize: 12, color: '#8A8A8A', marginTop: 3 }}>
              {accepting ? 'Customers can book online' : "Customers can't book right now"}
            </Text>
          </View>
        </View>
        <Switch
          value={accepting}
          onValueChange={onToggle}
          disabled={disabled}
          trackColor={{ false: '#E5E5E5', true: '#F9EF08' }}
          thumbColor="#FFFFFF"
        />
      </View>
    </View>
  );
}

export default function AdminOverviewScreen() {
  const { alert, AlertComponent } = useAlert();
  const tabBarClearance = useTabBarClearance();

  // Status bar is always dark now that the page is a flat gray background top to bottom - the
  // scroll-tied light/dark swap only existed to stay readable over the removed cover photo.
  useFocusEffect(
    useCallback(() => {
      RNStatusBar.setBarStyle('dark-content');
      return () => RNStatusBar.setBarStyle('dark-content');
    }, [])
  );

  const [branchId, setBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);
  const [branchAddress, setBranchAddress] = useState<string | null>(null);
  const [branchImageUrl, setBranchImageUrl] = useState<string | null>(null);
  const [branchLoading, setBranchLoading] = useState(true);
  // Defaults to accepting (undefined on a branch that predates this toggle behaves like true).
  const [acceptingReservations, setAcceptingReservations] = useState(true);
  const [savingAcceptingReservations, setSavingAcceptingReservations] = useState(false);

  const placeholderBranchImage = useMemo(() => {
    if (!branchId) return BRANCH_IMAGES[0];
    let hash = 0;
    for (let i = 0; i < branchId.length; i++) hash = (hash * 31 + branchId.charCodeAt(i)) >>> 0;
    return BRANCH_IMAGES[hash % BRANCH_IMAGES.length];
  }, [branchId]);

  useEffect(() => {
    const fetchAdminBranch = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setBranchLoading(false);
        return;
      }
      try {
        const snapshot = await get(ref(db, `users/${uid}`));
        if (snapshot.exists()) {
          const data = snapshot.val();
          const resolvedBranchId = data.branchId || data.branch || null;
          setBranchId(resolvedBranchId);

          if (resolvedBranchId) {
            const profileSnapshot = await get(ref(db, `Branches/${resolvedBranchId}/profile`));
            if (profileSnapshot.exists()) {
              const profile = profileSnapshot.val();
              if (profile.name) setBranchName(profile.name);
              if (profile.address) setBranchAddress(profile.address);
              if (typeof profile.imageUrl === 'string') setBranchImageUrl(profile.imageUrl);
              setAcceptingReservations(profile.acceptingReservations !== false);
            }
          }
        }
      } finally {
        setBranchLoading(false);
      }
    };
    fetchAdminBranch();
  }, []);

  const analytics = useBranchAnalytics(branchId);
  const loading = branchLoading || analytics.loading;

  // Reflects the actual OS permission rather than a stored preference - that's the only thing
  // that determines whether a push can reach this device.
  const [notificationsGranted, setNotificationsGranted] = useState<boolean | null>(null);
  const refreshPermissionStatus = useCallback(async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationsGranted(status === 'granted');
  }, []);
  useEffect(() => {
    refreshPermissionStatus();
  }, [refreshPermissionStatus]);

  const handleToggleNotifications = async () => {
    if (notificationsGranted) {
      if (Platform.OS === 'ios') Linking.openURL('app-settings:');
      else Linking.openSettings();
      return;
    }
    await registerForPushNotificationsAsync();
    await refreshPermissionStatus();
  };

  // Day-off / no-supervisor-on-site fallback: pausing this keeps the branch listed to customers
  // (see BranchSelection.native.tsx) but blocks new online reservations while still reading as
  // open for walk-ins - a washer alone can't be deputized as a stand-in supervisor to manage
  // bookings, so this is the mitigation instead. Confirming only on the way to OFF - that's the
  // direction with a real customer-facing consequence; switching back ON is always safe.
  const commitAcceptingReservations = async (next: boolean) => {
    if (!branchId) return;
    setSavingAcceptingReservations(true);
    try {
      await set(ref(db, `Branches/${branchId}/profile/acceptingReservations`), next);
      setAcceptingReservations(next);
    } catch (error) {
      logError('AdminOverview.commitAcceptingReservations', error, { context: 'Failed to update acceptingReservations' });
      alert('Error', 'Failed to update reservation status. Please try again.');
    } finally {
      setSavingAcceptingReservations(false);
    }
  };

  const handleToggleAcceptingReservations = (next: boolean) => {
    if (!next) {
      alert(
        'Stop taking new reservations?',
        'Customers will still see this branch and can walk in, but won’t be able to book a time slot online until you turn this back on.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Stop reservations', style: 'destructive', onPress: () => commitAcceptingReservations(false) },
        ]
      );
      return;
    }
    commitAcceptingReservations(true);
  };

  const [signOutModalVisible, setSignOutModalVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOutConfirm = async () => {
    setSigningOut(true);
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      await auth.signOut();
      await AsyncStorage.clear();
      if (hasSeenOnboarding === 'true') {
        await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      }
      router.replace('/');
    } catch (error) {
      logError('AdminOverview.handleSignOutConfirm', error, { context: 'Error signing out' });
    } finally {
      setSigningOut(false);
      setSignOutModalVisible(false);
    }
  };

  const [period, setPeriod] = useState<Period>('weekly');
  const buckets =
    period === 'daily' ? analytics.dailyBuckets : period === 'monthly' ? analytics.monthlyBuckets : analytics.weeklyBuckets;
  const EMPTY_BUCKET = { revenue: 0, bookingsCount: 0, completedCount: 0, cancelledCount: 0 };
  const currentBucket = buckets[buckets.length - 1] ?? EMPTY_BUCKET;
  const previousBucket = buckets[buckets.length - 2] ?? EMPTY_BUCKET;

  const revenueDelta = pctDelta(currentBucket.revenue, previousBucket.revenue);
  const revenueDiff = currentBucket.revenue - previousBucket.revenue;

  // Chart labels, computed client-side from today's date using the same window math the hook
  // uses internally (no new data) - day-of-week letters only line up with individual days, so
  // they're used for the Day view; Week's bars are 7-day sums and Month's are calendar months,
  // labelled accordingly instead of mislabelling them as weekdays.
  const chartLabels = useMemo(() => {
    const now = new Date();
    const count = Math.min(buckets.length, 7);
    if (period === 'daily') {
      return Array.from({ length: count }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (count - 1 - i));
        return d.toLocaleDateString('en-US', { weekday: 'narrow' });
      });
    }
    if (period === 'monthly') {
      return Array.from({ length: count }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
        return d.toLocaleDateString('en-US', { month: 'short' });
      });
    }
    // weekly - each bar is the day-of-month its 7-day window ends on. Bare day numbers alone
    // ("14, 21, 28, 4...") read as ambiguous days-of-month with no visible month change, so the
    // first bar and any bar where the month rolls over gets the month name too ("Sep 25").
    const weekEndDates = Array.from({ length: count }, (_, i) => {
      const weeksAgo = count - 1 - i;
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - weeksAgo * 7);
    });
    return weekEndDates.map((d, i) => {
      const monthChanged = i === 0 || d.getMonth() !== weekEndDates[i - 1].getMonth();
      return monthChanged ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : String(d.getDate());
    });
  }, [period, buckets.length]);

  const notifSwitch = (
    <Switch
      value={!!notificationsGranted}
      onValueChange={handleToggleNotifications}
      trackColor={{ false: '#E5E5E5', true: '#F9EF08' }}
      thumbColor="#FFFFFF"
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }} edges={['top']}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarClearance }}
      >
        {loading ? (
          <AnalyticsSkeleton />
        ) : (
          <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 16 }}>
          {/* Reservation status - merged with the branch header (thumbnail + name) into one card;
              day-off / no-supervisor-on-site fallback, same toggle logic and confirmation as before. */}
          {branchId && (
            <ReservationStatusCard
              accepting={acceptingReservations}
              onToggle={handleToggleAcceptingReservations}
              disabled={savingAcceptingReservations}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {!!branchImageUrl && (
                  <RemoteImage
                    uri={branchImageUrl}
                    fallback={placeholderBranchImage}
                    style={{ width: 48, height: 48, borderRadius: 12, marginRight: 12 }}
                  />
                )}
                <Text style={{ fontSize: 22, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                  {branchName || 'Overview'}
                </Text>
              </View>
            </ReservationStatusCard>
          )}

          {branchId ? (
            <>
              {/* Revenue card - period toggle back inline, top-right of the card */}
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18 }}>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#1A1A1A' }}>Revenue</Text>
                  <PeriodToggle value={period} onChange={setPeriod} />
                </View>
                <TotalSalesCard
                  periodNoun={PERIOD_COPY[period].current}
                  value={formatPeso(currentBucket.revenue)}
                  delta={revenueDelta}
                  diffLabel={`${formatPeso(Math.abs(revenueDiff))} ${
                    revenueDiff < 0 ? 'less than' : revenueDiff > 0 ? 'more than' : 'same as'
                  } ${PERIOD_COPY[period].previous}`}
                  series={buckets.slice(-7).map((b) => b.revenue)}
                  labels={chartLabels}
                />
              </View>

              {/* Recent bookings - heading + See all on the page, list in the card below */}
              <View style={{ marginTop: 4 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 4,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A' }}>Recent bookings</Text>
                  <AppButton onPress={() => router.push('/admin/(tabs)/bookings')} hitSlop={8}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#8A8A8A' }}>See all</Text>
                  </AppButton>
                </View>
                <RecentBookings bookings={analytics.recentBookings} />
              </View>
            </>
          ) : (
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>No branch assigned yet</Text>
              <Text style={{ fontSize: 13, color: '#8A8A8A', marginTop: 4 }}>
                A superadmin needs to assign your account to a branch before figures show here.
              </Text>
            </View>
          )}

          {/* Push notifications */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              paddingHorizontal: 18,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
              <Ionicons name="notifications-outline" size={18} color="#8A8A8A" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ fontSize: 14, color: '#1A1A1A' }}>New booking alerts</Text>
                <Text style={{ fontSize: 12, color: '#8A8A8A', marginTop: 1 }}>
                  Get a push when a customer books
                </Text>
              </View>
            </View>
            {notifSwitch}
          </View>

          {/* Sign out */}
          <AppButton
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              paddingHorizontal: 18,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            onPress={() => setSignOutModalVisible(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="log-out-outline" size={18} color="#8A8A8A" />
              <Text style={{ fontSize: 14, color: '#1A1A1A', marginLeft: 12 }}>Sign out</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
          </AppButton>
          </View>
        )}
      </ScrollView>

      <SignOutModal
        visible={signOutModalVisible}
        onClose={() => setSignOutModalVisible(false)}
        onConfirm={handleSignOutConfirm}
        loading={signingOut}
      />
      {AlertComponent}
    </SafeAreaView>
  );
}
