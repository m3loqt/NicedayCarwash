import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { onValue, ref, update } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebase/firebase';

interface Notification {
  id: string;
  title: string;
  body: string;
  appointmentId: string;
  date: string;
  type: 'accepted' | 'completed' | 'cancelled';
  read: boolean;
  createdAt: string;
}

// Monochrome throughout - only the glyph changes by type, never the color.
const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  accepted: 'calendar-outline',
  completed: 'sparkles-outline',
  cancelled: 'close-circle-outline',
};

function formatDate(isoString: string): string {
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

function isToday(isoString: string): boolean {
  const d = new Date(isoString);
  const now = new Date();
  return d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onValue(ref(db, `Notifications/ByUser/${uid}`), (snap) => {
      if (!snap.exists()) { setNotifications([]); return; }
      const list: Notification[] = Object.entries(snap.val()).map(([id, val]: [string, any]) => ({ id, ...val }));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(list);
    });
    return () => unsub();
  }, []);

  const handlePress = (notif: Notification) => {
    const uid = auth.currentUser?.uid;
    if (uid && !notif.read) {
      update(ref(db, `Notifications/ByUser/${uid}/${notif.id}`), { read: true });
    }
    if (notif.appointmentId && notif.date) {
      router.push({ pathname: '/user/booking-progress', params: { appointmentId: notif.appointmentId, date: notif.date } });
    }
  };

  const markSectionRead = (items: Notification[]) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const updates: Record<string, boolean> = {};
    items.forEach((n) => { if (!n.read) updates[`Notifications/ByUser/${uid}/${n.id}/read`] = true; });
    if (Object.keys(updates).length > 0) update(ref(db), updates);
  };

  const todayItems = notifications.filter((n) => isToday(n.createdAt));
  const earlierItems = notifications.filter((n) => !isToday(n.createdAt));
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginRight: unreadCount > 0 ? 0 : 22 }}>
          Notifications
        </Text>
        {unreadCount > 0 && (
          <View style={{ backgroundColor: '#1A1A1A', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
              {unreadCount} NEW
            </Text>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {notifications.length === 0 ? (
          /* Empty state */
          <View style={{ alignItems: 'center', paddingTop: 100, paddingHorizontal: 40 }}>
            <View style={{
              width: 100, height: 100, borderRadius: 50,
              backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
            }}>
              <Ionicons name="mail-outline" size={48} color="#BDBDBD" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 }}>
              No notifications yet
            </Text>
            <Text style={{ fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 }}>
              Your notifications will appear here once you&apos;ve received them.
            </Text>
          </View>
        ) : (
          <>
            {todayItems.length > 0 && (
              <>
                <SectionHeader
                  label="Today"
                  showMarkRead={todayItems.some((n) => !n.read)}
                  onMarkRead={() => markSectionRead(todayItems)}
                  topPadding={8}
                />
                {todayItems.map((notif) => <NotifCard key={notif.id} notif={notif} onPress={handlePress} />)}
              </>
            )}
            {earlierItems.length > 0 && (
              <>
                <SectionHeader
                  label="Earlier"
                  showMarkRead={earlierItems.some((n) => !n.read)}
                  onMarkRead={() => markSectionRead(earlierItems)}
                  topPadding={todayItems.length > 0 ? 16 : 8}
                />
                {earlierItems.map((notif) => <NotifCard key={notif.id} notif={notif} onPress={handlePress} />)}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({
  label,
  showMarkRead,
  onMarkRead,
  topPadding,
}: {
  label: string;
  showMarkRead: boolean;
  onMarkRead: () => void;
  topPadding: number;
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingTop: topPadding, paddingBottom: 6,
    }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Text>
      {showMarkRead && (
        <TouchableOpacity onPress={onMarkRead} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 12, color: '#999' }}>Mark all as read</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function NotifCard({ notif, onPress }: { notif: Notification; onPress: (n: Notification) => void }) {
  const icon = TYPE_ICON[notif.type] ?? TYPE_ICON.accepted;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => onPress(notif)}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: notif.read ? 'transparent' : '#FFFFFF',
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
        <Ionicons name={icon} size={20} color="#1A1A1A" />
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontSize: 14, fontWeight: notif.read ? '500' : '700', color: '#1A1A1A' }}
          >
            {notif.title}
          </Text>
          <Text style={{ fontSize: 11, color: '#BDBDBD', marginLeft: 8 }}>
            {formatDate(notif.createdAt)}
          </Text>
        </View>
        <Text numberOfLines={2} style={{ fontSize: 13, color: '#999', lineHeight: 18 }}>
          {notif.body}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
