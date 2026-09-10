import { usePendingBranchBookings, type PendingBranchBooking } from '@/hooks/use-pending-branch-bookings';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatRelativeDate(isoString: string): string {
  const d = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
  if (diffMins < 2880) return '1d';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function AdminNotificationsScreen() {
  const { items, count } = usePendingBranchBookings();

  const handlePress = (item: PendingBranchBooking) => {
    router.push('/admin/(tabs)/bookings?tab=pending');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginRight: count > 0 ? 0 : 22 }}>
          Notifications
        </Text>
        {count > 0 && (
          <View style={{ backgroundColor: '#F9EF08', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1A1A00' }}>
              {count} PENDING
            </Text>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {items.length === 0 ? (
          /* Empty state */
          <View style={{ alignItems: 'center', paddingTop: 100, paddingHorizontal: 40 }}>
            <View style={{
              width: 100, height: 100, borderRadius: 50,
              backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
            }}>
              <Ionicons name="mail-outline" size={48} color="#BDBDBD" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 }}>
              No pending requests
            </Text>
            <Text style={{ fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 }}>
              New booking requests for your branch will appear here.
            </Text>
          </View>
        ) : (
          <>
            <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                New booking requests
              </Text>
            </View>
            {items.map((item) => (
              <NotifCard key={item.appointmentId} item={item} onPress={handlePress} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotifCard({ item, onPress }: { item: PendingBranchBooking; onPress: (item: PendingBranchBooking) => void }) {
  const vehicleLabel = item.vehicleDetails.vehicleName || item.vehicleDetails.classification || 'Vehicle';

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => onPress(item)}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginVertical: 2,
        borderRadius: 14,
        padding: 14,
      }}
    >
      {/* Icon */}
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#F5F5F5',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
      }}>
        <Ionicons name="calendar-outline" size={20} color="#1A1A1A" />
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}
          >
            New booking request
          </Text>
          <Text style={{ fontSize: 11, color: '#BDBDBD', marginLeft: 8 }}>
            {formatRelativeDate(item.createdAt)}
          </Text>
        </View>
        <Text numberOfLines={2} style={{ fontSize: 13, color: '#999', lineHeight: 18 }}>
          {vehicleLabel} · {item.timeSlot.appointmentDate} at {item.timeSlot.time} · P{item.amountDue.toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
