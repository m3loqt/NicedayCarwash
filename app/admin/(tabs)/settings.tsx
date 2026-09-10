import { AnalyticsSkeleton } from '@/components/ui/admin/AdminScreenSkeleton';
import {
  StatTile,
  TotalSalesCard,
  useBranchAnalytics,
} from '@/components/ui/admin/analytics';
import SignOutModal from '@/components/ui/SignOutModal';
import { auth, db } from '@/firebase/firebase';
import { logError } from '@/lib/logger';
import { registerForPushNotificationsAsync } from '@/lib/pushNotifications';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { get, ref } from 'firebase/database';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Linking, Platform, ScrollView, StatusBar, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Fallback for a branch that hasn't had a real photo uploaded on the web yet - same generic
// placeholders BranchesSlider.tsx and BranchDetailsModal.tsx fall back to, just picked
// deterministically per branchId (see placeholderBranchImage below) instead of by list position,
// since there's no list to index into on a single-branch admin account.
const BRANCH_IMAGES = [
  require('../../../assets/images/branch1.jpg'),
  require('../../../assets/images/branch2.jpg'),
  require('../../../assets/images/branch3.jpg'),
];

type Period = 'daily' | 'weekly' | 'monthly';
const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];
const PERIOD_COPY: Record<Period, { current: string; previousLabel: string }> = {
  daily: { current: 'today', previousLabel: 'Yesterday' },
  weekly: { current: 'this week', previousLabel: 'Prior week' },
  monthly: { current: 'this month', previousLabel: 'Last month' },
};

const formatPeso = (n: number): string => `₱${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const pctDelta = (curr: number, prev: number): number | null => {
  if (prev <= 0) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
};

function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <View className="flex-row bg-white border border-[#EEEEEE] rounded-full p-1">
      {PERIOD_OPTIONS.map((opt) => {
        const active = opt.key === value;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.7}
            className={`px-3 py-1.5 rounded-full ${active ? 'bg-[#F9EF08]' : ''}`}
          >
            <Text className={`text-xs font-semibold ${active ? 'text-[#1A1A00]' : 'text-[#999]'}`}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AdminOverviewScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'android' ? Math.max(insets.top, StatusBar.currentHeight ?? 0) : insets.top;

  // The other admin tabs stay mounted in the background and each declare their own dark-content
  // <StatusBar>, which - since RN's <StatusBar> shares one native module across every mounted
  // instance - can silently re-stomp this screen's light-content the next time one of them
  // re-renders (e.g. a live Firebase listener firing). Setting it imperatively on focus/blur
  // instead of only declaratively is what actually keeps it correct while this tab is active.
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content');
      return () => StatusBar.setBarStyle('dark-content');
    }, [])
  );

  const [branchId, setBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);
  const [branchAddress, setBranchAddress] = useState<string | null>(null);
  const [branchImageUrl, setBranchImageUrl] = useState<string | null>(null);
  const [branchLoading, setBranchLoading] = useState(true);

  // Stable per branch (not random/list-position based, since this screen only ever shows one
  // branch) so the same branch doesn't appear to change photos between app opens. Only used as
  // a fallback for branches without a real uploaded photo (branchImageUrl) yet.
  const placeholderBranchImage = useMemo(() => {
    if (!branchId) return BRANCH_IMAGES[0];
    let hash = 0;
    for (let i = 0; i < branchId.length; i++) hash = (hash * 31 + branchId.charCodeAt(i)) >>> 0;
    return BRANCH_IMAGES[hash % BRANCH_IMAGES.length];
  }, [branchId]);
  const branchImage = branchImageUrl ? { uri: branchImageUrl } : placeholderBranchImage;

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

  // Mirrors user/(tabs)/profile.tsx's toggle exactly - reflects the actual OS permission rather
  // than a stored preference, since that's the only thing that determines whether a push can
  // reach this device. registerForPushNotificationsAsync() already fires on every login
  // (app/index.tsx's routeSignedInUser, staff included) - this is for granting it up front, or
  // just checking/re-confirming status.
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
      // Runtime permission cannot be revoked from within the app - send the user to system
      // settings, where they can turn it off for this app specifically.
      if (Platform.OS === 'ios') {
        Linking.openURL('app-settings:');
      } else {
        Linking.openSettings();
      }
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
  // The KPI row below is bound to this same bucket set - switching the period here now moves
  // every number on the page together instead of the tiles silently staying on a fixed 7-day
  // window while Revenue changes underneath them.
  const buckets =
    period === 'daily' ? analytics.dailyBuckets : period === 'monthly' ? analytics.monthlyBuckets : analytics.weeklyBuckets;
  const EMPTY_BUCKET = { revenue: 0, bookingsCount: 0, completedCount: 0, cancelledCount: 0 };
  const currentBucket = buckets[buckets.length - 1] ?? EMPTY_BUCKET;
  const previousBucket = buckets[buckets.length - 2] ?? EMPTY_BUCKET;

  const currentValue = currentBucket.revenue;
  const previousValue = previousBucket.revenue;
  const seriesDelta = pctDelta(currentValue, previousValue);

  const bookingsDelta = pctDelta(currentBucket.bookingsCount, previousBucket.bookingsCount);

  const rate = (b: typeof currentBucket): number | null =>
    b.completedCount + b.cancelledCount > 0
      ? Math.round((b.completedCount / (b.completedCount + b.cancelledCount)) * 1000) / 10
      : null;
  const currentCompletionRate = rate(currentBucket);
  const previousCompletionRate = rate(previousBucket);
  const completionRateDelta =
    currentCompletionRate !== null && previousCompletionRate !== null
      ? Math.round((currentCompletionRate - previousCompletionRate) * 10) / 10
      : null;

  const ticket = (b: typeof currentBucket): number | null =>
    b.completedCount > 0 ? Math.round((b.revenue / b.completedCount) * 100) / 100 : null;
  const currentAvgTicket = ticket(currentBucket);
  const previousAvgTicket = ticket(previousBucket);
  const avgTicketDelta =
    currentAvgTicket !== null && previousAvgTicket !== null ? pctDelta(currentAvgTicket, previousAvgTicket) : null;

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <StatusBar barStyle="light-content" backgroundColor="transparent" />

      {/* Header: the branch's photo as a cover image, bleeding under the status bar, with a
          dark gradient at the bottom carrying the name + address in light text over it. A thin
          scrim at the very top keeps the status bar icons legible over a bright photo. */}
      <View style={{ height: 200 + topPadding }}>
        <Image source={branchImage} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.85)']}
          locations={[0, 0.22, 0.55, 1]}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: 18 }}>
          <Text className="text-[26px] font-bold text-white" numberOfLines={1}>
            {branchName || 'Overview'}
          </Text>
          {!!branchAddress && (
            <View className="flex-row items-center mt-1">
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.85)" />
              <Text
                className="text-[12px] ml-1 flex-1"
                style={{ color: 'rgba(255,255,255,0.85)' }}
                numberOfLines={1}
              >
                {branchAddress}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View className="flex-1 bg-[#FAFAFA]">
        {loading ? (
          <AnalyticsSkeleton />
        ) : !branchId ? (
          <View className="flex-1 items-center justify-center px-10">
            <Ionicons name="stats-chart-outline" size={36} color="#E0E0E0" />
            <Text className="text-sm text-[#BDBDBD] mt-2.5 text-center">
              No branch assigned to this account yet.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 32, gap: 18 }}
          >
            {/* Revenue: hero sales card, switchable by period */}
            <View>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-bold text-[#1A1A1A]">Revenue</Text>
                <PeriodToggle value={period} onChange={setPeriod} />
              </View>
              <TotalSalesCard
                currentLabel={PERIOD_COPY[period].current}
                currentValueLabel={formatPeso(currentValue)}
                previousLabel={PERIOD_COPY[period].previousLabel}
                previousValueLabel={formatPeso(previousValue)}
                delta={seriesDelta}
              />
            </View>

            {/* KPI row - supporting context, bound to the same period as Revenue above */}
            <View className="flex-row" style={{ gap: 10 }}>
              <StatTile
                icon="calendar-outline"
                label="Bookings"
                value={String(currentBucket.bookingsCount)}
                delta={bookingsDelta}
                upIsGood
              />
              <StatTile
                icon="checkmark-circle-outline"
                label="Completion rate"
                value={currentCompletionRate === null ? '—' : `${currentCompletionRate}%`}
                delta={completionRateDelta}
                deltaSuffix="pp"
                upIsGood
              />
              <StatTile
                icon="pricetag-outline"
                label="Avg. ticket"
                value={currentAvgTicket === null ? '—' : formatPeso(currentAvgTicket)}
                delta={avgTicketDelta}
                upIsGood
              />
            </View>

            {/* Push notifications */}
            <View className="bg-white rounded-2xl px-5 py-4 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-3">
                <Ionicons name="notifications-outline" size={18} color="#999" />
                <View className="ml-3 flex-1">
                  <Text className="text-[15px] text-[#1A1A1A]">Push Notifications</Text>
                  <Text className="text-[12px] text-[#999] mt-0.5">Get notified when a new booking comes in</Text>
                </View>
              </View>
              <Switch
                value={!!notificationsGranted}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#E5E5E5', true: '#F9EF08' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Sign out */}
            <TouchableOpacity
              className="bg-white rounded-2xl px-5 py-4 flex-row items-center justify-between"
              onPress={() => setSignOutModalVisible(true)}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <Ionicons name="log-out-outline" size={18} color="#999" />
                <Text className="text-[15px] text-[#1A1A1A] ml-3">Sign out</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
            </TouchableOpacity>
          </ScrollView>
        )}

        <SignOutModal
          visible={signOutModalVisible}
          onClose={() => setSignOutModalVisible(false)}
          onConfirm={handleSignOutConfirm}
          loading={signingOut}
        />
      </View>
    </View>
  );
}
