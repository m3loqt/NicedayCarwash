import { AnalyticsSkeleton } from '@/components/ui/admin/AdminScreenSkeleton';
import RemoteImage from '@/components/ui/common/RemoteImage';
import {
  RecentBookings,
  StatTile,
  TotalSalesCard,
  useBranchAnalytics,
} from '@/components/ui/admin/analytics';
import SignOutModal from '@/components/ui/SignOutModal';
import { auth, db } from '@/firebase/firebase';
import { useTabBarClearance } from '@/hooks/use-tab-bar-height';
import { logError } from '@/lib/logger';
import { registerForPushNotificationsAsync } from '@/lib/pushNotifications';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { get, ref } from 'firebase/database';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Linking,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const todayLabel = (): string =>
  new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 999, padding: 2 }}>
      {PERIOD_OPTIONS.map((opt) => {
        const active = opt.key === value;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.8}
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
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AdminOverviewScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'android' ? Math.max(insets.top, StatusBar.currentHeight ?? 0) : insets.top;
  const tabBarClearance = useTabBarClearance();
  // Cap the fixed cover image so on a short viewport the scroll area below can't collapse to the
  // point the sign-out row is unreachable.
  const headerHeight = Math.min(184, Dimensions.get('window').height * 0.24);

  // The cover photo scrolls with the content. Status-bar icons are light while the photo is
  // under them, and flip to dark once it has scrolled away and the grey page is behind them.
  const [darkIcons, setDarkIcons] = useState(false);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const shouldBeDark = e.nativeEvent.contentOffset.y > headerHeight * 0.55;
    setDarkIcons((cur) => (cur === shouldBeDark ? cur : shouldBeDark));
  };
  const barStyle: 'dark-content' | 'light-content' = darkIcons ? 'dark-content' : 'light-content';
  // RN's <StatusBar> shares one native module across mounted tabs, so re-assert on focus.
  const barStyleRef = useRef(barStyle);
  barStyleRef.current = barStyle;
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(barStyleRef.current);
      return () => StatusBar.setBarStyle('dark-content');
    }, [])
  );

  const [branchId, setBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);
  const [branchAddress, setBranchAddress] = useState<string | null>(null);
  const [branchImageUrl, setBranchImageUrl] = useState<string | null>(null);
  const [branchLoading, setBranchLoading] = useState(true);

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
  // Whole-number change for the two count cards (a % swing off a tiny base is noise).
  const countChange = (curr: number, prev: number): number | null => (curr === prev ? null : curr - prev);
  const successDelta = countChange(currentBucket.completedCount, previousBucket.completedCount);
  const cancelledDelta = countChange(currentBucket.cancelledCount, previousBucket.cancelledCount);

  const notifSwitch = (
    <Switch
      value={!!notificationsGranted}
      onValueChange={handleToggleNotifications}
      trackColor={{ false: '#E5E5E5', true: '#F9EF08' }}
      thumbColor="#FFFFFF"
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <StatusBar barStyle={barStyle} translucent backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: tabBarClearance }}
      >
        {/* Full-bleed branch cover - scrolls with the content. Name + address bottom-left over a
            dark gradient; today's date top-right. */}
        <View style={{ height: headerHeight + topPadding }}>
          <RemoteImage
            uri={branchImageUrl}
            fallback={placeholderBranchImage}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.82)']}
            locations={[0, 0.28, 0.6, 1]}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          />
          <Text
            style={{
              position: 'absolute',
              top: topPadding + 10,
              right: 20,
              fontSize: 12,
              fontWeight: '600',
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            {todayLabel()}
          </Text>
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 16 }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#FFFFFF' }} numberOfLines={1}>
              {branchName || 'Overview'}
            </Text>
            {!!branchAddress && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.85)" />
                <Text
                  style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginLeft: 4, flex: 1 }}
                  numberOfLines={1}
                >
                  {branchAddress}
                </Text>
              </View>
            )}
          </View>
        </View>

        {loading ? (
          <AnalyticsSkeleton />
        ) : (
          <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
          {branchId ? (
            <>
              {/* Revenue card */}
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
                  comparison={`${formatPeso(previousBucket.revenue)} ${PERIOD_COPY[period].previous}`}
                  series={buckets.slice(-7).map((b) => b.revenue)}
                />
              </View>

              {/* Two count cards */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <StatTile
                  label="Successful bookings"
                  value={String(currentBucket.completedCount)}
                  delta={successDelta}
                  deltaSuffix=""
                />
                <StatTile
                  label="Cancelled"
                  value={String(currentBucket.cancelledCount)}
                  delta={cancelledDelta}
                  deltaSuffix=""
                  alarmOnRise
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
                  <TouchableOpacity onPress={() => router.push('/admin/(tabs)/bookings')} hitSlop={8}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#8A8A8A' }}>See all</Text>
                  </TouchableOpacity>
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
          <TouchableOpacity
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              paddingHorizontal: 18,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            activeOpacity={0.7}
            onPress={() => setSignOutModalVisible(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="log-out-outline" size={18} color="#8A8A8A" />
              <Text style={{ fontSize: 14, color: '#1A1A1A', marginLeft: 12 }}>Sign out</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
          </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <SignOutModal
        visible={signOutModalVisible}
        onClose={() => setSignOutModalVisible(false)}
        onConfirm={handleSignOutConfirm}
        loading={signingOut}
      />
    </View>
  );
}
