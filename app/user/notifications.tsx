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

const TYPE_STYLE: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  accepted: { icon: 'checkmark-circle', color: '#16A34A', bg: '#DCFCE7' },
  completed: { icon: 'sparkles', color: '#D97706', bg: '#FEF3C7' },
  cancelled: { icon: 'close-circle', color: '#DC2626', bg: '#FEE2E2' },
};

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
    const unsub = onValue(ref(db, `users/${uid}/notifications`), (snap) => {
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
      update(ref(db, `users/${uid}/notifications/${notif.id}`), { read: true });
    }
    if (notif.appointmentId && notif.date) {
      router.push({ pathname: '/user/booking-progress', params: { appointmentId: notif.appointmentId, date: notif.date } });
    }
  };

  const markAllRead = () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const updates: Record<string, boolean> = {};
    notifications.forEach((n) => { if (!n.read) updates[`users/${uid}/notifications/${n.id}/read`] = true; });
    if (Object.keys(updates).length > 0) update(ref(db), updates);
  };

  const todayItems = notifications.filter((n) => isToday(n.createdAt));
  const earlierItems = notifications.filter((n) => !isToday(n.createdAt));
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2F2F7' }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginLeft: 12 }}>Notifications</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {notifications.length === 0 ? (
          /* Empty state */
          <View style={{ alignItems: 'center', paddingTop: 100, paddingHorizontal: 40 }}>
            <View style={{
              width: 100, height: 100, borderRadius: 50,
              backgroundColor: '#FFFDE7', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
            }}>
              <Ionicons name="mail-outline" size={48} color="#D4C800" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 }}>
              No notifications yet
            </Text>
            <Text style={{ fontSize: 14, color: '#8E8E93', textAlign: 'center', lineHeight: 20 }}>
              Your notifications will appear here once you've received them.
            </Text>
          </View>
        ) : (
          <>
            {todayItems.length > 0 && (
              <>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#8E8E93', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 }}>
                  Today
                </Text>
                {todayItems.map((notif) => <NotifCard key={notif.id} notif={notif} onPress={handlePress} />)}
              </>
            )}
            {earlierItems.length > 0 && (
              <>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#8E8E93', paddingHorizontal: 20, paddingTop: todayItems.length > 0 ? 16 : 8, paddingBottom: 6 }}>
                  Previously
                </Text>
                {earlierItems.map((notif) => <NotifCard key={notif.id} notif={notif} onPress={handlePress} />)}
              </>
            )}
          </>
        )}

        {/* Footer */}
        {unreadCount > 0 && (
          <View style={{ alignItems: 'center', marginTop: 32 }}>
            <Text style={{ fontSize: 13, color: '#8E8E93' }}>Missing notifications?</Text>
            <TouchableOpacity onPress={markAllRead}>
              <Text style={{ fontSize: 13, color: '#B8A800', marginTop: 2 }}>Mark all as read.</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotifCard({ notif, onPress }: { notif: Notification; onPress: (n: Notification) => void }) {
  const style = TYPE_STYLE[notif.type] ?? TYPE_STYLE.accepted;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => onPress(notif)}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginVertical: 4,
        borderRadius: 14,
        padding: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {/* Avatar */}
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: style.bg,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
      }}>
        <Ionicons name={style.icon} size={22} color={style.color} />
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
          <Text style={{ fontSize: 11, color: '#AEAEB2', marginLeft: 8 }}>
            {formatDate(notif.createdAt)}
          </Text>
        </View>
        <Text numberOfLines={2} style={{ fontSize: 13, color: '#636366', lineHeight: 18 }}>
          {notif.body}
        </Text>
      </View>

      {/* Unread dot */}
      {!notif.read && (
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F9EF08', borderWidth: 1, borderColor: '#D4C800', marginLeft: 8, marginTop: 4 }} />
      )}
    </TouchableOpacity>
  );
}
