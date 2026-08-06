import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="text-[15px] font-inter-bold tracking-tight text-[#1A1A1A] mb-2">{title}</Text>
      <Text className="text-[13px] font-inter-regular tracking-tight text-[#4A4A4A] leading-5">{children}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View className="flex-row items-center px-6 pt-4 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="mr-3"
        >
          <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text className="text-[17px] font-inter-bold tracking-tight text-[#1A1A1A]">Privacy Policy</Text>
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[12px] font-inter-regular tracking-tight text-[#999] mb-6">Last updated: July 2026</Text>

        <Text className="text-[13px] font-inter-regular tracking-tight text-[#4A4A4A] leading-5 mb-6">
          Niceday Carwash ("we", "us", or "our") respects your privacy. This Privacy Policy
          explains what information we collect through the Niceday Carwash mobile application (the
          "Service"), how we use it, and the choices you have. By using the Service, you agree to
          the practices described in this policy.
        </Text>

        <Section title="1. Information We Collect">
          {'We collect the information you provide directly, such as your name, email address, ' +
            'phone number, and vehicle details (make, plate number, and vehicle type). We also ' +
            'collect information generated through your use of the Service, such as booking history, ' +
            'appointment status, and payment status.'}
        </Section>

        <Section title="2. Location Information">
          With your permission, we use your device location to show nearby branches and estimate
          distance and travel time. You can decline location access and still use the Service by
          browsing and selecting a branch manually.
        </Section>

        <Section title="3. Push Notifications">
          If you allow notifications, we store a device push token to send you updates about your
          bookings, such as confirmations, status changes, and completion alerts. You can disable
          notifications at any time from your device settings, which stops future notifications
          from being delivered to that device.
        </Section>

        <Section title="4. Payment Information">
          Booking fees paid online are processed by our third party payment partner, Maya. We do
          not collect or store your full card or e wallet credentials. We retain only the
          information needed to confirm and reconcile your payment, such as the transaction
          reference and payment status.
        </Section>

        <Section title="5. How We Use Your Information">
          We use your information to create and manage your account, process bookings and
          payments, communicate with you about your appointments, improve the Service, and comply
          with legal obligations. We do not sell your personal information to third parties.
        </Section>

        <Section title="6. Sharing of Information">
          We share information with branch staff to fulfill your bookings, with our payment
          partner to process transactions, and with service providers who support our
          infrastructure, such as hosting and analytics. These parties are only given the
          information necessary to perform their function.
        </Section>

        <Section title="7. Data Retention and Security">
          We retain your account and booking information for as long as your account is active or
          as needed to comply with legal and business requirements. We apply reasonable technical
          and organizational measures to protect your information, but no method of transmission
          or storage is completely secure.
        </Section>

        <Section title="8. Your Choices and Rights">
          You may review and update your profile information at any time from the app. You may
          also request access to, correction of, or deletion of your personal information by
          contacting us through the channels below, subject to any legal retention requirements.
        </Section>

        <Section title="9. Children's Privacy">
          The Service is not directed at children, and we do not knowingly collect personal
          information from individuals under 18 years of age without parental or guardian consent.
        </Section>

        <Section title="10. Changes to This Policy">
          We may update this Privacy Policy from time to time to reflect changes in our practices
          or legal requirements. We will indicate the date of the most recent revision at the top
          of this page. Continued use of the Service after changes take effect constitutes your
          acceptance of the revised policy.
        </Section>

        <Section title="11. Contact Us">
          If you have questions about this Privacy Policy or how your information is handled,
          please reach out to us through the Help Center or at your nearest Niceday Carwash branch.
        </Section>

        <Text className="text-[12px] font-inter-regular tracking-tight text-[#999] text-center mt-2 mb-4">
          By using Niceday Carwash, you acknowledge that you have read and understood this Privacy
          Policy.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
