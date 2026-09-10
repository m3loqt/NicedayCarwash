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

export default function TermsScreen() {
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
        <Text className="text-[17px] font-inter-bold tracking-tight text-[#1A1A1A]">Terms and Conditions</Text>
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[12px] font-inter-regular tracking-tight text-[#999] mb-6">Last updated: July 2026</Text>

        <Text className="text-[13px] font-inter-regular tracking-tight text-[#4A4A4A] leading-5 mb-6">
          Welcome to Niceday Carwash. These Terms and Conditions ("Terms") govern your access to
          and use of the Niceday Carwash mobile application and booking services (the "Service"),
          operated by Niceday Carwash. By creating an account, booking a service, or otherwise
          using the Service, you agree to be bound by these Terms. If you do not agree with any
          part of these Terms, please do not use the Service.
        </Text>

        <Section title="1. Eligibility">
          You must be at least 18 years old, or have the consent of a parent or legal guardian, to
          create an account and use the Service. By registering, you confirm that all information
          you provide is accurate, current, and complete.
        </Section>

        <Section title="2. Account Registration and Security">
          You are responsible for maintaining the confidentiality of your account credentials and
          for all activity that occurs under your account. Please notify us immediately if you
          suspect any unauthorized use of your account. Niceday Carwash reserves the right to
          suspend or terminate accounts that provide false information or are used in violation of
          these Terms.
        </Section>

        <Section title="3. Description of Service">
          Niceday Carwash allows you to browse participating branches, select vehicle wash and
          detailing services, and schedule appointments for car wash services at a chosen branch
          and time slot. Service availability, pricing, and offerings may vary by branch and are
          subject to change without prior notice.
        </Section>

        <Section title="4. Bookings and Reservations">
          {'When you submit a booking, it is initially recorded as pending and reviewed by branch ' +
            'staff, who will confirm the appointment and assign a service bay based on availability. ' +
            'We do our best to accommodate every request, but a booking is not guaranteed until it has ' +
            'been accepted by the branch. Appointments may be booked no earlier than seven (7) days in ' +
            'advance and must be made at least one (1) hour before the desired appointment time. A ' +
            'branch can only review and accept bookings during its posted operating hours; a booking ' +
            'submitted outside those hours will be reviewed once the branch reopens. Please arrive on ' +
            'or before your scheduled appointment time to help us serve you and other customers ' +
            'efficiently.'}
        </Section>

        <Section title="5. Booking Fee and Payment">
          A booking fee is required to confirm and hold your appointment slot and is charged
          through our third party payment partner at the time of booking. Any remaining balance for
          services and add ons rendered is settled at the branch after your service is completed,
          using the payment method available at that branch. All prices are listed in Philippine
          Pesos (PHP) and are inclusive of applicable taxes unless otherwise stated.
        </Section>

        <Section title="6. Cancellations, No Shows, and Refunds">
          {'The booking fee is strictly non refundable if you fail to arrive for your scheduled ' +
            'appointment (a no show) or if you arrive significantly late without prior notice to the ' +
            'branch. However, if Niceday Carwash is unable to honor your booking for reasons within ' +
            'our control, including but not limited to washer unavailability, service unavailability, ' +
            'power interruptions, or insufficient bay capacity, your booking fee will be refunded to ' +
            'your original payment method. A booking must be paid within fifteen (15) minutes of ' +
            'submission, or the reserved slot is released and the booking cancelled. Once paid, branch ' +
            'staff have twenty four (24) hours of the operating hours of the branch, not counting ' +
            'hours the branch is closed, to review and accept your booking. If the branch has not ' +
            'acted on your booking by then, or no later than thirty (30) minutes before your scheduled ' +
            'appointment time, whichever comes first, your booking will be automatically cancelled and ' +
            'the booking fee refunded. Refund processing times may vary depending on your payment ' +
            'provider.'}
        </Section>

        <Section title="7. Vehicle Condition and Owner Responsibilities">
          You are responsible for removing personal belongings and valuables from your vehicle
          before service. Niceday Carwash is not responsible for items left inside the vehicle. You
          agree to disclose any pre existing damage, mechanical issues, or fragile modifications to
          branch staff before service begins. Niceday Carwash will exercise reasonable care while
          servicing your vehicle but is not liable for pre existing damage or conditions not
          disclosed prior to service.
        </Section>

        <Section title="8. User Conduct">
          You agree to use the Service only for lawful purposes and to treat branch staff and other
          customers with respect. You may not use the Service to submit fraudulent bookings, abuse
          promotional offers, or interfere with the normal operation of the Service. Niceday Carwash
          reserves the right to refuse service, cancel bookings, or suspend accounts that engage in
          abusive, fraudulent, or disruptive behavior.
        </Section>

        <Section title="9. Intellectual Property">
          The Niceday Carwash name, logo, application design, and all related content are the
          property of Niceday Carwash and are protected by applicable intellectual property laws.
          You may not copy, modify, distribute, or create derivative works based on the Service
          without our prior written consent.
        </Section>

        <Section title="10. Limitation of Liability">
          To the fullest extent permitted by law, Niceday Carwash shall not be liable for any
          indirect, incidental, or consequential damages arising from your use of the Service. Our
          total liability for any claim relating to a specific booking shall not exceed the total
          amount paid by you for that booking.
        </Section>

        <Section title="11. Privacy">
          We collect and use personal information such as your name, email address, and vehicle
          details to create your account, process bookings, and facilitate payments. We do not sell
          your personal information to third parties. By using the Service, you consent to the
          collection and use of your information as described in this section and in accordance
          with applicable data privacy laws.
        </Section>

        <Section title="12. Changes to the Service and These Terms">
          Niceday Carwash may update these Terms from time to time to reflect changes in our
          Service, business practices, or legal requirements. We will indicate the date of the most
          recent revision at the top of this page. Continued use of the Service after changes take
          effect constitutes your acceptance of the revised Terms.
        </Section>

        <Section title="13. Termination">
          We may suspend or terminate your access to the Service at any time if we believe you have
          violated these Terms. You may also stop using the Service and request account deletion at
          any time by contacting us through the channels below.
        </Section>

        <Section title="14. Governing Law">
          These Terms are governed by the laws of the Republic of the Philippines, without regard
          to its conflict of law principles. Any disputes arising from these Terms or your use of
          the Service shall be subject to the exclusive jurisdiction of the appropriate courts of
          the Philippines.
        </Section>

        <Section title="15. Contact Us">
          If you have any questions about these Terms, please reach out to us through the contact
          details available in the app or at your nearest Niceday Carwash branch.
        </Section>

        <Text className="text-[12px] font-inter-regular tracking-tight text-[#999] text-center mt-2 mb-4">
          By using Niceday Carwash, you acknowledge that you have read, understood, and agree to
          these Terms and Conditions.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
