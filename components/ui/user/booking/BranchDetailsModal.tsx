import { fetchBranchServiceNames, type BranchServiceSummary } from '@/lib/branchServices';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import RemoteImage from '@/components/ui/common/RemoteImage';
import { AppButton } from '@/components/ui/common/AppButton';
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  status: 'Open' | 'Closed';
  acceptingReservations: boolean;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  imageUrl?: string;
}

interface BranchDetailsModalProps {
  visible: boolean;
  branch: Branch | null;
  distanceText?: string | null;
  onClose: () => void;
  onMakeOrder: () => void;
}

const MAX_CHIPS = 8;

// Best-effort icon per service, keyed off words in its name (the catalog carries no icon field).
const serviceIcon = (name: string): keyof typeof Ionicons.glyphMap => {
  const n = name.toLowerCase();
  if (n.includes('wax') || n.includes('buff') || n.includes('polish') || n.includes('coat')) return 'sparkles-outline';
  if (n.includes('interior') || n.includes('vacuum') || n.includes('shampoo') || n.includes('seat')) return 'car-outline';
  if (n.includes('motor')) return 'bicycle-outline';
  if (n.includes('engine') || n.includes('chassis') || n.includes('under')) return 'construct-outline';
  if (n.includes('tire') || n.includes('tyre') || n.includes('wheel')) return 'ellipse-outline';
  if (n.includes('wash') || n.includes('rinse') || n.includes('foam')) return 'water-outline';
  return 'pricetag-outline';
};

// Branch hours arrive as one string like "Mon-Sun: 6:00 AM - 9:00 PM". Shown as the time range
// with the days underneath, and with "to" instead of dashes (the app doesn't use dashes in copy).
// Anything that doesn't match that shape is shown as it came, just without the dashes.
const TIME_RANGE = /(\d{1,2}(?::\d{2})?\s?(?:AM|PM))\s*[-–—]\s*(\d{1,2}(?::\d{2})?\s?(?:AM|PM))/i;

function parseHours(raw?: string): { time: string; days?: string } | null {
  if (!raw) return null;
  const match = raw.match(TIME_RANGE);
  if (!match || match.index === undefined) {
    return { time: raw.replace(/\s*[-–—]\s*/g, ' to ') };
  }
  const days = raw
    .slice(0, match.index)
    .replace(/[:\s]+$/, '')
    .replace(/\s*[-–—]\s*/g, ' to ')
    .trim();
  return {
    time: `${match[1]} to ${match[2]}`,
    days: days === 'Mon to Sun' ? 'Every day' : days || undefined,
  };
}

// Label on the left, value on the right, a hairline between rows - the same plain rows the review
// screen's bill uses, with no icon tiles.
function DetailRow({
  label,
  value,
  sub,
  last,
  onPress,
}: {
  label: string;
  value: string;
  sub?: string;
  last?: boolean;
  onPress?: () => void;
}) {
  const row = (
    <View
      className={`flex-row items-start justify-between py-3 ${last ? '' : 'border-b border-[#F0F0F0]'}`}
    >
      <Text className="text-[13px] font-inter-regular text-[#6B6B6B] pt-0.5">{label}</Text>
      <View className="flex-1 items-end pl-4">
        <Text className="text-[15px] font-inter-medium text-[#1A1A1A] text-right">{value}</Text>
        {!!sub && (
          <Text className="text-[13px] font-inter-regular text-[#6B6B6B] text-right mt-0.5">{sub}</Text>
        )}
      </View>
    </View>
  );
  return onPress ? <AppButton onPress={onPress}>{row}</AppButton> : row;
}

export default function BranchDetailsModal({
  visible,
  branch,
  distanceText,
  onClose,
  onMakeOrder,
}: BranchDetailsModalProps) {
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState<BranchServiceSummary[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  useEffect(() => {
    if (!branch?.id) {
      setServices([]);
      return;
    }
    let cancelled = false;
    setLoadingServices(true);
    setServices([]);
    fetchBranchServiceNames(branch.id)
      .then((list) => {
        if (!cancelled) setServices(list);
      })
      .catch(() => {
        if (!cancelled) setServices([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingServices(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branch?.id]);

  const shownServices = services.slice(0, MAX_CHIPS);
  const extraServices = services.length - shownServices.length;
  const hours = parseHours(branch?.hours);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-end">
        {/* Backdrop: tapping this closes the sheet */}
        <Pressable style={{ flex: 1 }} onPress={onClose} />

        <View className="bg-white rounded-t-3xl overflow-hidden" style={{ maxHeight: height * 0.85 }}>
          {branch && (
            <>
              {/* Handle */}
              <View className="items-center pt-3 pb-1">
                <View className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
              </View>

              {/* Header: the same photo, name and address row as the branch list card and the review
                  screen. It stays put while the rest scrolls, so the close button is always there.
                  The address wraps in full instead of being cut off. */}
              <View className="flex-row items-start pt-3 pb-4" style={{ paddingHorizontal: 20 }}>
                <RemoteImage
                  uri={branch.imageUrl}
                  fallback={require('../../../../assets/images/branch1.jpg')}
                  style={{ width: 64, height: 64, borderRadius: 12, marginRight: 12 }}
                />
                <View className="flex-1 pr-3">
                  <Text className="text-[18px] font-inter-bold text-[#1A1A1A]">{branch.name}</Text>
                  {!!branch.address && (
                    <Text
                      className="text-[13px] font-inter-regular text-[#6B6B6B] mt-0.5"
                      style={{ lineHeight: 19 }}
                    >
                      {branch.address}
                    </Text>
                  )}
                </View>
                <AppButton onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={22} color="#6B6B6B" />
                </AppButton>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
              >
                {/* Same quiet grey reminder card as the review screen, not a warning box */}
                {!branch.acceptingReservations && (
                  <View className="flex-row items-start rounded-2xl bg-[#F3F3F3] px-4 py-3 mb-4">
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color="#6B6B6B"
                      style={{ marginRight: 8, marginTop: 1 }}
                    />
                    <View className="flex-1">
                      <Text className="text-[13px] font-inter-semibold text-[#1A1A1A]">
                        Online booking is paused right now
                      </Text>
                      <Text className="text-[13px] font-inter-regular text-[#6B6B6B] mt-0.5">
                        Walk-ins are still welcome
                      </Text>
                    </View>
                  </View>
                )}

                {/* Details */}
                <View className="border-t border-[#F0F0F0]">
                  {/* "Call us" promises an action, so the number dials when tapped */}
                  <DetailRow
                    label="Call us"
                    value={branch.phone || 'Not available'}
                    onPress={
                      branch.phone
                        ? () => Linking.openURL(`tel:${branch.phone.replace(/[^\d+]/g, '')}`).catch(() => {})
                        : undefined
                    }
                    last={!hours && !distanceText}
                  />
                  {hours && (
                    <DetailRow label="We're open" value={hours.time} sub={hours.days} last={!distanceText} />
                  )}
                  {!!distanceText && <DetailRow label="From you" value={`${distanceText} away`} last />}
                </View>

                {/* Services */}
                <View className="mt-4">
                  <Text className="text-[13px] font-inter-regular text-[#6B6B6B] mb-2.5">Services</Text>

                  {loadingServices ? (
                    <ActivityIndicator size="small" color="#6B6B6B" style={{ alignSelf: 'flex-start' }} />
                  ) : services.length > 0 ? (
                    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                      {shownServices.map((s) => (
                        <View key={s.id} className="flex-row items-center rounded-lg bg-[#F3F3F3] px-2.5 py-1.5">
                          <Ionicons name={serviceIcon(s.name)} size={14} color="#6B6B6B" />
                          <Text className="ml-1.5 text-[13px] font-inter-medium text-[#1A1A1A]">{s.name}</Text>
                        </View>
                      ))}
                      {extraServices > 0 && (
                        <View className="rounded-lg bg-[#F3F3F3] px-2.5 py-1.5">
                          <Text className="text-[13px] font-inter-medium text-[#6B6B6B]">
                            +{extraServices} more
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <Text className="text-[13px] font-inter-regular text-[#6B6B6B]">
                      You&apos;ll see the full menu after choosing this branch
                    </Text>
                  )}
                </View>
              </ScrollView>

              {/* CTA */}
              <View
                className="bg-white border-t border-[#EDEDED] pt-3"
                style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 12 }}
              >
                {branch.acceptingReservations ? (
                  <AppButton
                    className="bg-[#F9EF08] rounded-2xl items-center justify-center"
                    style={{ height: 52 }}
                    onPress={onMakeOrder}
                  >
                    <Text className="text-[16px] font-inter-bold text-[#1A1A1A]">Choose branch</Text>
                  </AppButton>
                ) : (
                  <View className="bg-[#F3F3F3] rounded-2xl items-center justify-center" style={{ height: 52 }}>
                    <Text className="text-[16px] font-inter-bold text-[#6B6B6B]">Walk-ins only</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
