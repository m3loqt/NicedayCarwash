import { CONTACT_INFO } from '@/constants/contact';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabKey = 'faq' | 'contact';

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'How do I book a car wash?',
    answer:
      'Go to the Book tab, choose a branch near you, pick your vehicle and the services or add-ons you want, then select an available time slot to confirm your appointment.',
  },
  {
    question: 'What is the booking fee for?',
    answer:
      'A small booking fee secures your time slot and bay reservation at the branch. The remaining balance for services and add-ons is settled at the branch after your wash is done.',
  },
  {
    question: "Can I get a refund if I cancel or don't show up?",
    answer:
      "Cancellations caused by the branch (such as washer unavailability or no bay capacity) are refund-eligible. If you arrive late or don't show up for your appointment, the booking fee is non-refundable.",
  },
  {
    question: 'How long does a car wash take?',
    answer:
      'Service duration depends on your vehicle type and condition. You can see the estimated duration for your selected services and add-ons before confirming your booking.',
  },
  {
    question: 'What payment methods are accepted?',
    answer:
      'You can pay the booking fee online through Maya (cards, GCash, and other e-wallets), or settle everything in cash directly at the branch.',
  },
  {
    question: 'How will I know when my car is ready?',
    answer:
      "You'll get a notification as soon as the branch accepts your booking, when your appointment time arrives, and again when it's completed. You can also check live status anytime from the History tab.",
  },
  {
    question: 'Can I change or cancel my appointment?',
    answer:
      'To cancel or make changes to an appointment, please contact us using the details in the Contact Us tab. Once your wash is in progress, it can no longer be cancelled.',
  },
  {
    question: 'Where can I see my past bookings and receipts?',
    answer:
      'The History tab lists all your bookings by status. For completed bookings, open the booking and tap "View E-Receipt" to see a full breakdown of what you paid for.',
  },
];

function FAQAccordion({ items }: { items: typeof FAQ_ITEMS }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <View className="items-center py-16">
        <Ionicons name="search-outline" size={40} color="#E0E0E0" />
        <Text className="text-[13px] font-inter-regular tracking-tight text-[#999] mt-3">
          No results found
        </Text>
      </View>
    );
  }

  return (
    <>
      {items.map((item, index) => {
        const expanded = expandedIndex === index;
        return (
          <TouchableOpacity
            key={item.question}
            className="bg-white rounded-2xl px-4 py-6 mb-1.5"
            activeOpacity={0.8}
            onPress={() => setExpandedIndex(expanded ? null : index)}
          >
            <View className="flex-row items-center justify-between">
              <Text className="flex-1 text-[13px] font-inter-semibold tracking-tight text-[#1A1A1A] mr-3">
                {item.question}
              </Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#999" />
            </View>
            {expanded && (
              <Text className="text-[12.5px] font-inter-regular tracking-tight text-[#666] leading-5 mt-2.5">
                {item.answer}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </>
  );
}

function ContactRow({
  icon,
  label,
  value,
  onPressValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPressValue?: () => void;
}) {
  const hasValue = !!onPressValue;

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl px-4 py-4 mb-1.5 flex-row items-center"
      activeOpacity={hasValue ? 0.7 : 1}
      onPress={onPressValue}
      disabled={!hasValue}
    >
      <View className="w-9 h-9 rounded-full bg-[#FAFAFA] items-center justify-center mr-3">
        {icon}
      </View>
      <View className="flex-1 mr-2">
        <Text className="text-[11.5px] font-inter-regular tracking-tight text-[#999]">{label}</Text>
        <Text
          className={`text-[13.5px] font-inter-semibold tracking-tight ${hasValue ? 'text-[#1A1A1A]' : 'text-[#BDBDBD]'}`}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
      {hasValue && <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />}
    </TouchableOpacity>
  );
}

// Strips the protocol and trailing slash so the card shows a clean, readable link
// (e.g. "https://www.instagram.com/nicedaycarwashmain/" -> "www.instagram.com/nicedaycarwashmain").
const formatLink = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

export default function HelpCenterScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('faq');
  const [search, setSearch] = useState('');

  const filteredFaq = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return FAQ_ITEMS;
    return FAQ_ITEMS.filter(
      (item) => item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)
    );
  }, [search]);

  const contactRows: { key: string; icon: React.ReactNode; label: string; value: string; onPressValue?: () => void }[] = [
    {
      key: 'customerService',
      icon: <Ionicons name="call-outline" size={18} color="#666" />,
      label: 'Contact Number',
      value: CONTACT_INFO.customerServicePhone || 'Contact details coming soon',
      onPressValue: CONTACT_INFO.customerServicePhone
        ? () => Linking.openURL(`tel:${CONTACT_INFO.customerServicePhone.replace(/[^0-9+]/g, '')}`)
        : undefined,
    },
    {
      key: 'email',
      icon: <Ionicons name="mail-outline" size={18} color="#666" />,
      label: 'Email',
      value: CONTACT_INFO.email || 'Contact details coming soon',
      onPressValue: CONTACT_INFO.email ? () => Linking.openURL(`mailto:${CONTACT_INFO.email}`) : undefined,
    },
    {
      key: 'website',
      icon: <Ionicons name="globe-outline" size={18} color="#666" />,
      label: 'Website',
      value: CONTACT_INFO.website ? formatLink(CONTACT_INFO.website) : 'Coming soon',
      onPressValue: CONTACT_INFO.website ? () => Linking.openURL(CONTACT_INFO.website) : undefined,
    },
    {
      key: 'facebook',
      icon: <Ionicons name="logo-facebook" size={18} color="#666" />,
      label: 'Facebook',
      value: CONTACT_INFO.facebook ? formatLink(CONTACT_INFO.facebook) : 'Coming soon',
      onPressValue: CONTACT_INFO.facebook ? () => Linking.openURL(CONTACT_INFO.facebook) : undefined,
    },
    {
      key: 'instagram',
      icon: <Ionicons name="logo-instagram" size={18} color="#666" />,
      label: 'Instagram',
      value: CONTACT_INFO.instagram ? formatLink(CONTACT_INFO.instagram) : 'Coming soon',
      onPressValue: CONTACT_INFO.instagram ? () => Linking.openURL(CONTACT_INFO.instagram) : undefined,
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="w-9 h-9 rounded-full border border-[#EEEEEE] items-center justify-center mr-3"
        >
          <Ionicons name="chevron-back" size={20} color="#1A1A1A" />
        </TouchableOpacity>
        <Text className="text-[17px] font-inter-semibold tracking-tight text-[#1A1A1A]">Help Center</Text>
      </View>

      {/* Search */}
      {activeTab === 'faq' && (
        <View className="px-5 pb-4">
          <View className="flex-row items-center bg-[#FAFAFA] border border-[#EEEEEE] rounded-full px-4 py-3">
            <Ionicons name="search" size={17} color="#999" />
            <TextInput
              className="flex-1 ml-2 text-[13px] font-inter-regular tracking-tight text-[#1A1A1A]"
              placeholder="Search"
              placeholderTextColor="#B0B0B0"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>
      )}

      {/* Tabs */}
      <View className="flex-row px-5 mb-2">
        {(['faq', 'contact'] as TabKey[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            className="flex-1 items-center pb-3"
            style={{ borderBottomWidth: 2, borderBottomColor: activeTab === tab ? '#F9EF08' : '#F0F0F0' }}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text
              className={`text-[13.5px] tracking-tight ${
                activeTab === tab ? 'font-inter-semibold text-[#1A1A1A]' : 'font-inter-regular text-[#999]'
              }`}
            >
              {tab === 'faq' ? 'FAQ' : 'Contact Us'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView className="flex-1 bg-[#FAFAFA] px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {activeTab === 'faq' ? (
          <FAQAccordion items={filteredFaq} />
        ) : (
          contactRows.map((row) => (
            <ContactRow
              key={row.key}
              icon={row.icon}
              label={row.label}
              value={row.value}
              onPressValue={row.onPressValue}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
