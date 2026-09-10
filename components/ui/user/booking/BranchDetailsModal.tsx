import { fetchBranchServiceNames, type BranchServiceSummary } from '@/lib/branchServices';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import RemoteImage from '@/components/ui/common/RemoteImage';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { height } = Dimensions.get('window');

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  status: 'Open' | 'Closed';
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

const MAX_PILLS = 8;

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center">
      <View className="w-9 h-9 rounded-full bg-white items-center justify-center border border-[#EEEEEE]">
        <Ionicons name={icon} size={15} color="#6B7280" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-[11px] font-inter-regular text-[#9CA3AF]">{label}</Text>
        <Text className="text-[13px] font-inter-medium text-[#374151]" numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function BranchDetailsModal({
  visible,
  branch,
  distanceText,
  onClose,
  onMakeOrder,
}: BranchDetailsModalProps) {
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

  const shownPills = services.slice(0, MAX_PILLS);
  const extraPills = services.length - shownPills.length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BlurView intensity={20} className="flex-1 justify-end">
        {/* Backdrop: tapping this closes the modal */}
        <Pressable style={{ flex: 1 }} onPress={onClose} />

        <View
          className="bg-white rounded-t-3xl overflow-hidden"
          style={{ maxHeight: height * 0.82 }}
        >
          {branch && (
            <>
              {/* Drag handle */}
              <View className="items-center pt-3 pb-1">
                <View className="w-9 h-1 rounded-full bg-[#E0E0E0]" />
              </View>

              {/* Inset rounded photo header with the name + address over a dark gradient */}
              <View style={{ paddingHorizontal: 12, paddingTop: 6 }}>
                <View style={{ height: 156, borderRadius: 18, overflow: 'hidden' }}>
                  <RemoteImage
                    uri={branch.imageUrl}
                    fallback={require('../../../../assets/images/branch1.jpg')}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <LinearGradient
                    colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.82)']}
                    locations={[0, 0.3, 0.55, 1]}
                    style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
                  />

                  {/* Close */}
                  <TouchableOpacity
                    onPress={onClose}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/35 items-center justify-center"
                  >
                    <Ionicons name="close" size={18} color="#FFFFFF" />
                  </TouchableOpacity>

                  {/* Name + address */}
                  <View className="absolute left-4 right-4 bottom-3.5">
                    <Text className="text-[20px] font-inter-bold text-white" numberOfLines={1}>
                      {branch.name}
                    </Text>
                    <Text
                      className="text-[12px] font-inter-regular mt-1"
                      style={{ color: 'rgba(255,255,255,0.85)' }}
                      numberOfLines={1}
                    >
                      {branch.address}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Content */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
                contentContainerStyle={{ padding: 20, paddingBottom: 8 }}
              >
                {/* Info - plain rows, no card */}
                <View style={{ gap: 16 }}>
                  <View className="flex-row">
                    <View className="flex-1">
                      <InfoRow icon="call-outline" label="Contact number" value={branch.phone || 'Not available'} />
                    </View>
                    {distanceText ? (
                      <View className="flex-1">
                        <InfoRow icon="navigate-outline" label="Distance from you" value={distanceText} />
                      </View>
                    ) : null}
                  </View>
                  <InfoRow icon="time-outline" label="Open hours" value={branch.hours || 'Not available'} />
                </View>

                {/* Services */}
                <View className="mt-5">
                  <Text className="text-[12px] font-inter-semibold text-[#9CA3AF] uppercase tracking-wider mb-2.5">
                    Services offered
                  </Text>

                  {loadingServices ? (
                    <ActivityIndicator size="small" color="#9CA3AF" style={{ alignSelf: 'flex-start' }} />
                  ) : services.length > 0 ? (
                    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                      {shownPills.map((s) => (
                        <View
                          key={s.id}
                          className="flex-row items-center bg-[#FEFCE8] border border-[#FDE68A] rounded-full pl-2.5 pr-3 py-1.5"
                        >
                          <Ionicons name={serviceIcon(s.name)} size={13} color="#A16207" />
                          <Text className="ml-1.5 text-[12px] font-inter-medium text-[#1A1A1A]">
                            {s.name}
                          </Text>
                        </View>
                      ))}
                      {extraPills > 0 && (
                        <View className="bg-[#F3F4F6] rounded-full px-3 py-1.5">
                          <Text className="text-[12px] font-inter-medium text-[#6B7280]">
                            +{extraPills} more
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <Text className="text-[12px] font-inter-regular text-[#BDBDBD]">
                      You&apos;ll see the full menu after choosing this branch.
                    </Text>
                  )}
                </View>
              </ScrollView>

              {/* CTA */}
              <View
                className="px-5 pt-3 border-t border-[#F0F0F0]"
                style={{ paddingBottom: Platform.OS === 'ios' ? 32 : 18 }}
              >
                <TouchableOpacity
                  className="bg-[#F9EF08] py-4 rounded-2xl items-center"
                  onPress={onMakeOrder}
                  activeOpacity={0.85}
                >
                  <Text className="text-[#1A1A00] text-[15px] font-inter-bold">Choose branch</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </BlurView>
    </Modal>
  );
}
