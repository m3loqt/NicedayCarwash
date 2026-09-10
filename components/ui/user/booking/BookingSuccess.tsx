import { useAlert } from "@/hooks/use-alert";
import { consumeClientRateLimit } from "@/lib/clientRateLimit";
import { payBookingFeeWithMaya } from "@/lib/mayaPayment";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { getAuth } from "firebase/auth";
import { getDatabase, onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

type PaymentStatus = "paid" | "unconfirmed" | "cancelled" | "error";

const PAYMENT_STATE: Record<
  PaymentStatus,
  { title: string; icon: keyof typeof Ionicons.glyphMap; notice: string }
> = {
  paid: {
    title: "Thank you for choosing Nice Day!",
    icon: "checkmark-circle-outline",
    notice:
      "We're processing your appointment and will notify you once it's confirmed. Please hold on for a moment!",
  },
  unconfirmed: {
    title: "Booking Not Sent",
    icon: "time-outline",
    notice:
      "This hasn't been sent to the branch yet. If you don't complete payment shortly, the slot will be released, pay again below to keep it.",
  },
  cancelled: {
    title: "Booking Not Sent",
    icon: "alert-circle-outline",
    notice:
      "This hasn't been sent to the branch yet. If you don't complete payment shortly, the slot will be released, pay again below to keep it.",
  },
  error: {
    title: "Booking Not Sent",
    icon: "alert-circle-outline",
    notice:
      "We couldn't start payment, so this hasn't been sent to the branch. If you don't complete payment shortly, the slot will be released - try again below.",
  },
};

export default function BookingSuccess() {
  const { showAlert, AlertComponent } = useAlert();
  const { appointmentId, paymentStatus, dateKey } = useLocalSearchParams<{
    appointmentId: string;
    paymentStatus?: string;
    dateKey?: string;
  }>();
  const [status, setStatus] = useState<PaymentStatus>(
    paymentStatus && paymentStatus in PAYMENT_STATE
      ? (paymentStatus as PaymentStatus)
      : "paid",
  );
  const [retrying, setRetrying] = useState(false);
  const state = PAYMENT_STATE[status];

  // Self-heals if the webhook confirms after we've already given up and rendered "not paid" -
  // e.g. it landed just past the grace window, or the app was backgrounded while waiting. Without
  // this, a user who actually paid would be stuck staring at "Pay Again" (which would then reject
  // as already-paid) until they left and reopened this screen.
  useEffect(() => {
    if (status === "paid") return;
    const userId = getAuth().currentUser?.uid;
    if (!appointmentId || !dateKey || !userId) return;
    const isPaidRef = ref(
      getDatabase(),
      `Reservations/ReservationsByUser/${userId}/${dateKey}/${appointmentId}/isPaid`,
    );
    const unsubscribe = onValue(isPaidRef, (snapshot) => {
      if (snapshot.val() === true) setStatus("paid");
    });
    return () => unsubscribe();
  }, [status, appointmentId, dateKey]);

  const handlePayAgain = async () => {
    const userId = getAuth().currentUser?.uid;
    if (!appointmentId || !dateKey || !userId) {
      showAlert(
        "Missing booking details. Please try from your booking history instead.",
        {
          title: "Something went wrong",
          type: "error",
        },
      );
      return;
    }

    const gate = consumeClientRateLimit(
      `payment-retry:${userId}:${appointmentId}`,
      {
        windowMs: 10000,
        maxAttempts: 1,
      },
    );
    if (!gate.allowed) {
      const waitSeconds = Math.ceil(gate.retryAfterMs / 1000);
      showAlert(`Too many attempts. Try again in ${waitSeconds}s.`, {
        title: "Please wait",
        type: "warning",
      });
      return;
    }

    setRetrying(true);
    try {
      const result = await payBookingFeeWithMaya(
        appointmentId,
        dateKey,
        userId,
      );
      setStatus(result);
    } catch {
      setStatus("error");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      {/* Icon */}
      <View className="w-16 h-16 rounded-2xl bg-[#FAFAFA] border border-[#EEEEEE] items-center justify-center mb-5">
        <Ionicons name={state.icon} size={30} color="#1A1A1A" />
      </View>

      {/* Title */}
      <Text className="text-[18px] font-bold text-[#1A1A1A] text-center mb-1.5">
        {state.title}
      </Text>

      {/* Appointment ID - only once there's a real, confirmed appointment */}
      {status === "paid" && (
        <Text className="text-[12px] text-[#999] text-center mb-2">
          Your appointment ID is{" "}
          <Text className="font-semibold text-[#1A1A1A]">
            {appointmentId || "ND-000000"}
          </Text>
        </Text>
      )}

      {/* Payment notice */}
      <Text className="text-[12px] text-[#999] text-center mb-6 px-2">
        {state.notice}
      </Text>

      {status === "paid" ? (
        <>
          {/* My Bookings */}
          <TouchableOpacity
            className="w-full bg-[#F9EF08] py-3.5 rounded-2xl items-center mb-3"
            activeOpacity={0.85}
            onPress={() =>
              router.push({ pathname: "/user/(tabs)/history" } as any)
            }
          >
            <Text className="text-[14px] font-bold text-[#1A1A00]">
              My Bookings
            </Text>
          </TouchableOpacity>

          {/* Home */}
          <TouchableOpacity
            className="w-full bg-[#FAFAFA] border border-[#EEEEEE] py-3.5 rounded-2xl items-center"
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: "/user" } as any)}
          >
            <Text className="text-[14px] font-semibold text-[#1A1A1A]">
              Go Home
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        /* Pay Again - the only action while there's nothing confirmed yet */
        <TouchableOpacity
          className="w-full bg-[#F9EF08] py-3.5 rounded-2xl items-center justify-center"
          activeOpacity={0.85}
          onPress={handlePayAgain}
          disabled={retrying}
        >
          {retrying ? (
            <ActivityIndicator color="#1A1A00" />
          ) : (
            <Text className="text-[14px] font-bold text-[#1A1A00]">
              Pay Again
            </Text>
          )}
        </TouchableOpacity>
      )}

      {AlertComponent}
    </View>
  );
}
