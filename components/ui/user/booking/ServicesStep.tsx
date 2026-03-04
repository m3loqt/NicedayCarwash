import { useAlert } from "@/hooks/use-alert";
import { Ionicons } from "@expo/vector-icons";
import { get, getDatabase, ref } from "firebase/database";
import { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import AlertModal from "./modals/AlertModal";
import ScheduleUnavailableModal from "./modals/ScheduleUnavailableModal";

interface Service {
  id: string;
  name: string;
  sedan: number;
  suv: number;
  pickup: number;
  motorcycle: number;
  estimatedTime: number;
  description?: string;
}

interface Addon {
  id: string;
  name: string;
  price: number;
  estimatedTime: number;
  description?: string;
}

interface TimeSlot {
  time: string;
  status: "available" | "unavailable";
}

interface Vehicle {
  vname: string;
  vplateNumber: string;
  vtype: string;
  classification?: string;
}

export default function ServicesStep({
  branchId,
  selectedVehicle,
  onNext,
}: {
  branchId: string;
  selectedVehicle: Vehicle;
  onNext: (data: any) => void;
}) {
  const { alert, AlertComponent } = useAlert();
  const [services, setServices] = useState<Service[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(
    null
  );
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [branchSchedule, setBranchSchedule] = useState<{ openTime: string; closeTime: string } | null>(null);
  const [showScheduleUnavailableModal, setShowScheduleUnavailableModal] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<string>("");
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type?: 'error' | 'warning' | 'info' | 'success';
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string, type: 'error' | 'warning' | 'info' | 'success' = 'error') => {
    setAlertModal({ visible: true, type, title, message });
  };

  const db = getDatabase();

  const sanitizePath = (path: string) => path.replace(/[.#$[\]]/g, "");

  useEffect(() => {
    loadServices();
    loadAddons();
    loadBranchSchedule();
  }, []);

  useEffect(() => {
    loadTimeSlots(selectedDate);
  }, [selectedDate]);

  const loadBranchSchedule = async (): Promise<{ openTime: string; closeTime: string } | null> => {
    try {
      const snapshot = await get(
        ref(db, `Branches/${sanitizePath(branchId)}/profile`)
      );
      if (snapshot.exists()) {
        const profile = snapshot.val();
        // Extracting open and close times from schedule string (format: "8:00 AM - 6:00 PM")
        const schedule = profile.schedule || "";
        // Parsing schedule string using regex to extract time components
        const timeMatch = schedule.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        let scheduleData: { openTime: string; closeTime: string };
        if (timeMatch) {
          scheduleData = {
            openTime: `${timeMatch[1]}:${timeMatch[2]} ${timeMatch[3]}`,
            closeTime: `${timeMatch[4]}:${timeMatch[5]} ${timeMatch[6]}`
          };
        } else {
          // Falling back to default hours when schedule format is invalid
          scheduleData = { openTime: "8:00 AM", closeTime: "6:00 PM" };
        }
        setBranchSchedule(scheduleData);
        return scheduleData;
      }
    } catch (err) {
      console.error("Failed to load branch schedule:", err);
      // Returning default schedule when loading fails
      const defaultSchedule = { openTime: "8:00 AM", closeTime: "6:00 PM" };
      setBranchSchedule(defaultSchedule);
      return defaultSchedule;
    }
    return null;
  };

  // Loading services data from Firebase
  const loadServices = async () => {
    try {
      const path = `Branches/${sanitizePath(branchId)}/Services`;
      const snapshot = await get(ref(db, path));
      
      if (snapshot.exists()) {
        const data: Service[] = [];
        
        snapshot.forEach((child) => {
          const val = child.val();
          data.push({
            id: child.key!,
            name: val.name,
            sedan: val.sedanPrice ?? 0,
            suv: val.suvPrice ?? 0,
            pickup: val.pickupPrice ?? 0,
            motorcycle: val.motorcyclePrice ?? 0,
            estimatedTime: val.estimatedTime ?? 0,
            description: val.description ?? '',
          });
        });
        setServices(data);
      } else {
        setServices([]);
      }
    } catch (err) {
      showAlert("Couldn't load services", "Something went wrong while fetching the available services. Please try again.", 'error');
    }
  };

  const loadAddons = async () => {
    try {
      const snapshot = await get(
        ref(db, `Branches/${sanitizePath(branchId)}/AddOns`)
      );
      if (snapshot.exists()) {
        const data: Addon[] = [];
        snapshot.forEach((child) => {
          const val = child.val();
          data.push({
            id: child.key!,
            name: val.name,
            price: val.price,
            estimatedTime: val.estimatedTime ?? 0,
            description: val.description ?? '',
          });
        });
        setAddons(data);
      }
    } catch (err) {
      showAlert("Couldn't load add-ons", "Something went wrong while fetching the available add-ons. Please try again.", 'error');
    }
  };

  const parseTimeTo24Hour = (timeStr: string): number => {
    // Converting 12-hour time string to 24-hour integer (0-23)
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 8; // Defaulting to 8 AM
    
    let hour = parseInt(match[1], 10);
    const period = match[3].toUpperCase();
    
    if (period === "PM" && hour !== 12) {
      hour += 12;
    } else if (period === "AM" && hour === 12) {
      hour = 0;
    }
    
    return hour;
  };

  const checkDateAvailability = (date: Date, schedule?: { openTime: string; closeTime: string }): { available: boolean; reason: string } => {
    const scheduleToUse = schedule || branchSchedule;
    if (!scheduleToUse) {
      return { available: true, reason: "" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateOnly = new Date(date);
    selectedDateOnly.setHours(0, 0, 0, 0);
    const isToday = selectedDateOnly.getTime() === today.getTime();
    
    // Using current hour for today's date, otherwise using 0
    const currentHour = isToday ? new Date().getHours() : 0;
    
    // Converting schedule times to 24-hour format
    const openHour = parseTimeTo24Hour(scheduleToUse.openTime);
    const closeHour = parseTimeTo24Hour(scheduleToUse.closeTime);
    
    // Rejecting dates when store is already closed today
    if (isToday && currentHour >= closeHour) {
      return {
        available: false,
        reason: `The store is closed.`
      };
    }
    
    // Verifying schedule has valid time range with available slots
    let hasAvailableSlots = false;
    for (let h = openHour; h < closeHour; h++) {
      if (isToday && h <= currentHour) {
        continue;
      }
      hasAvailableSlots = true;
      break;
    }
    
    if (!hasAvailableSlots) {
      return {
        available: false,
        reason: `The store is closed.`
      };
    }
    
    return { available: true, reason: "" };
  };

  const loadTimeSlots = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateOnly = new Date(date);
    selectedDateOnly.setHours(0, 0, 0, 0);
    const isToday = selectedDateOnly.getTime() === today.getTime();
    
    // Get current hour if selecting today
    const currentHour = isToday ? new Date().getHours() : 0;
    
    // Get branch schedule hours
    const openHour = branchSchedule ? parseTimeTo24Hour(branchSchedule.openTime) : 8;
    const closeHour = branchSchedule ? parseTimeTo24Hour(branchSchedule.closeTime) : 18;
    
    // Generate time slots from open to close hour
    const slots: TimeSlot[] = [];
    for (let h = openHour; h < closeHour; h++) {
      // If today, only show future hours
      if (isToday && h <= currentHour) {
        continue;
      }
      
      const hour12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      const period = h >= 12 ? "PM" : "AM";
      slots.push({
        time: `${hour12}:00 ${period}`,
        isAvailable: true,
      });
    }
    
    setTimeSlots(slots);
    // Reset selected time slot if it's no longer available
    if (selectedTimeSlot && !slots.find(s => s.time === selectedTimeSlot.time)) {
      setSelectedTimeSlot(null);
    }
  };

  // ------------------ Helpers ------------------
  const getVehicleLabel = () => {
    switch (selectedVehicle.vtype) {
      case 'sedan': return 'Sedan';
      case 'suv': return 'SUV';
      case 'pickup': return 'Pickup';
      case 'motorcycle-small': return 'Motorcycle (S)';
      case 'motorcycle-large': return 'Motorcycle (L)';
      default: return selectedVehicle.classification ?? 'Vehicle';
    }
  };

  const getPriceForVehicle = (service: Service) => {
    switch (selectedVehicle.vtype) {
      case 'sedan': return service.sedan;
      case 'suv': return service.suv;
      case 'pickup': return service.pickup;
      case 'motorcycle-small':
      case 'motorcycle-large': return service.motorcycle;
      default: return service.sedan;
    }
  };

  const getServiceFeatures = (service: Service): string[] => {
    if (service.description) {
      const parts = service.description
        .split(/[,;]/)
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 5);
      if (parts.length > 0) return parts;
    }
    return ['Exterior wash', 'Rinse & dry', 'Tire shine'];
  };

  const totalEstimatedTime =
    selectedServices.reduce((acc, s) => acc + s.estimatedTime, 0) +
    selectedAddons.reduce((acc, a) => acc + a.estimatedTime, 0);

  const toggleService = (s: Service) => {
    const exists = selectedServices.find((x) => x.id === s.id);
    exists
      ? setSelectedServices(selectedServices.filter((x) => x.id !== s.id))
      : setSelectedServices([s]);
  };

  const toggleAddon = (a: Addon) => {
    const exists = selectedAddons.find((x) => x.id === a.id);
    exists
      ? setSelectedAddons(selectedAddons.filter((x) => x.id !== a.id))
      : setSelectedAddons([...selectedAddons, a]);
  };

  // Converting Date object to abbreviated format (e.g., "Dec. 7, 2025")
  const formatDate = (date: Date): string => {
    const months = [
      "Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.",
      "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."
    ];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCalendarMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getMonthName = (date: Date): string => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return months[date.getMonth()];
  };

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))
      .filter(d => d >= today);
  };

  const isSameDay = (a: Date, b: Date): boolean =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // ------------------ Confirm Booking ------------------
  const handleNext = () => {
    if (!selectedServices.length) {
      showAlert("No service selected", "Please choose a washing plan before proceeding.", 'warning');
      return;
    }
    if (!selectedTimeSlot) {
      showAlert("No time slot selected", "Please pick an available time slot for your appointment.", 'warning');
      return;
    }
    if (!paymentMethod) {
      showAlert("No payment method", "Please select how you'd like to pay before completing your booking.", 'warning');
      return;
    }

    onNext({
      services: selectedServices,
      addons: selectedAddons,
      timeSlot: selectedTimeSlot,
      date: selectedDate,
      totalEstimatedTime,
      vehicleName: selectedVehicle.vname,
      plateNumber: selectedVehicle.vplateNumber,
      classification: getVehicleLabel(),
      paymentMethod,
    });
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingBottom: 0 }}>
        {/* ------------------- SERVICES ------------------- */}
        <Text className="text-xl font-semibold mt-4 px-4">
          Select plan
        </Text>
        <Text className="text-sm text-[#999] mb-3 px-4">
          Select your washing plan for{' '}
          <Text className="font-semibold text-[#1A1A1A]">{getVehicleLabel()}</Text>
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 4, paddingHorizontal: 12 }}
        >
          {services.map((s) => {
            const selected = selectedServices.some((x) => x.id === s.id);
            const price = getPriceForVehicle(s);
            const features = getServiceFeatures(s);
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => toggleService(s)}
                className={`mx-2 rounded-2xl px-4 pt-4 pb-4 w-64 ${
                  selected
                    ? 'bg-[#FAFAFA] border border-[#D4D4D4]'
                    : 'bg-[#FAFAFA] border border-transparent'
                }`}
                activeOpacity={0.8}
              >
                {/* Name row + time pill */}
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-[15px] font-bold text-[#1A1A1A] flex-1 pr-2">
                    {s.name}
                  </Text>
                  <View className="flex-row items-center bg-white border border-[#EEEEEE] rounded-full px-3 py-1">
                    <Ionicons name="time-outline" size={13} color="#9CA3AF" />
                    <Text className="text-[12px] text-[#9CA3AF] ml-1">
                      {s.estimatedTime} mins
                    </Text>
                  </View>
                </View>

                {/* Feature checklist */}
                {features.map((feat, i) => (
                  <View key={i} className="flex-row items-start mb-1.5">
                    <Ionicons name="checkmark" size={14} color="#9CA3AF" style={{ marginTop: 1, marginRight: 6 }} />
                    <Text className="text-[12px] text-[#666] flex-1" numberOfLines={2}>
                      {feat}
                    </Text>
                  </View>
                ))}

                {/* Price */}
                <View className="mt-3 pt-3 border-t border-[#F0F0F0] flex-row justify-between items-center">
                  <Text className="text-[12px] text-[#999]">Price</Text>
                  <Text className="text-[15px] font-bold text-[#1A1A1A]">
                    ₱{price}.00
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ------------------- ADD ONS ------------------- */}
        <Text className="text-xl font-semibold mt-6 mb-3 px-4">
          Add ons <Text className="text-gray-500">(Optional)</Text>
        </Text>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 4, paddingHorizontal: 12 }}
        >
          {addons.map((a) => {
            const selected = selectedAddons.some((x) => x.id === a.id);
            return (
              <TouchableOpacity
                key={a.id}
                onPress={() => toggleAddon(a)}
                className={`mx-2 rounded-2xl px-4 pt-4 pb-4 w-56 ${
                  selected
                    ? 'bg-[#FAFAFA] border border-[#D4D4D4]'
                    : 'bg-[#FAFAFA] border border-transparent'
                }`}
                activeOpacity={0.8}
              >
                {/* Name */}
                <Text className="text-[15px] font-bold text-[#1A1A1A] mb-2">
                  {a.name}
                </Text>

                {/* Description */}
                <Text className="text-[12px] text-[#666] leading-[18px] mb-3">
                  {a.description || 'No description available.'}
                </Text>

                {/* Price */}
                <View className="pt-3 border-t border-[#F0F0F0] flex-row justify-between items-center">
                  <Text className="text-[12px] text-[#999]">Price</Text>
                  <Text className="text-[15px] font-bold text-[#1A1A1A]">
                    ₱{a.price}.00
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ------------------- DATE & TIME ------------------- */}
        <Text className="text-[11px] font-semibold tracking-widest text-[#999] mt-6 mb-3 px-4 uppercase">
          Select Date
        </Text>

        {/* Month header + arrows */}
        <View className="flex-row items-center px-4 mb-3">
          <Text className="text-[17px] font-bold text-[#1A1A1A] flex-1">
            {getMonthName(calendarMonth)} {calendarMonth.getFullYear()}
          </Text>
          <TouchableOpacity onPress={() => navigateMonth('prev')} className="p-1 mr-2">
            <Ionicons name="arrow-back" size={18} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigateMonth('next')} className="p-1">
            <Ionicons name="arrow-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Horizontal day scroller */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          className="mb-5"
        >
          {getDaysInMonth(calendarMonth).map((date) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isPast = date < today;
            const isSelected = isSameDay(date, selectedDate);
            const dayLabel = DAY_LABELS[date.getDay()];

            return (
              <TouchableOpacity
                key={date.toISOString()}
                disabled={isPast}
                onPress={async () => {
                  let currentSchedule = branchSchedule;
                  if (!currentSchedule) {
                    currentSchedule = await loadBranchSchedule();
                  }
                  const availability = checkDateAvailability(date, currentSchedule || undefined);
                  if (!availability.available) {
                    setUnavailableReason(availability.reason);
                    setShowScheduleUnavailableModal(true);
                    return;
                  }
                  setSelectedDate(date);
                  loadTimeSlots(date);
                }}
                className={`mr-2 items-center justify-center rounded-2xl px-3 py-3 w-16 border ${
                  isSelected
                    ? 'bg-[#F9EF08] border-[#F9EF08]'
                    : 'bg-[#FAFAFA] border-transparent'
                }`}
                activeOpacity={0.8}
              >
                <Text className={`text-[10px] font-semibold mb-1 ${
                  isSelected ? 'text-[#1A1A00]' : isPast ? 'text-[#C4C4C4]' : 'text-[#999]'
                }`}>
                  {dayLabel}
                </Text>
                <Text className={`text-[18px] font-bold ${
                  isSelected ? 'text-[#1A1A00]' : isPast ? 'text-[#C4C4C4]' : 'text-[#1A1A1A]'
                }`}>
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Schedule Unavailable Modal */}
        <ScheduleUnavailableModal
          visible={showScheduleUnavailableModal}
          reason={unavailableReason}
          branchSchedule={branchSchedule}
          onClose={() => setShowScheduleUnavailableModal(false)}
        />

        {/* Alert Modal */}
        <AlertModal
          visible={alertModal.visible}
          type={alertModal.type}
          title={alertModal.title}
          message={alertModal.message}
          onClose={() => setAlertModal(prev => ({ ...prev, visible: false }))}
        />

        {/* Time slot label */}
        {timeSlots.length > 0 && (
          <Text className="text-[11px] font-semibold tracking-widest text-[#999] px-4 mb-2 uppercase">
            Select Time
          </Text>
        )}

        {/* ------------------- TIMESLOTS ------------------- */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {timeSlots.map((t) => (
            <TouchableOpacity
              key={t.time}
              onPress={() => setSelectedTimeSlot(t)}
              className={`mr-2 px-4 py-2.5 rounded-xl border ${
                selectedTimeSlot?.time === t.time
                  ? 'bg-[#F9EF08] border-[#F9EF08]'
                  : 'bg-[#FAFAFA] border-transparent'
              }`}
              activeOpacity={0.8}
            >
              <Text className={`text-[13px] font-medium ${
                selectedTimeSlot?.time === t.time ? 'text-[#1A1A00]' : 'text-[#666]'
              }`}>
                {t.time}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ------------------- PAYMENT OPTIONS ------------------- */}
        <Text className="text-xl font-semibold mt-6 mb-3 px-4">Payment Option</Text>
        <View className="px-4">
          {[
            {
              id: "COD",
              title: "Cash on Delivery",
              desc: "Pay cash when you arrive at the branch.",
              icon: "cash-outline" as const,
            },
            {
              id: "E-Wallet",
              title: "E-Wallet",
              desc: "GCash, Maya, and other supported wallets.",
              icon: "wallet-outline" as const,
            },
            {
              id: "Card",
              title: "Debit / Credit Card",
              desc: "Mastercard, Visa, and other supported cards.",
              icon: "card-outline" as const,
            },
          ].map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => setPaymentMethod(p.id)}
              className={`flex-row items-center px-4 py-3 rounded-2xl mb-3 ${
                paymentMethod === p.id
                  ? 'bg-[#FAFAFA] border border-[#D4D4D4]'
                  : 'bg-[#FAFAFA] border border-transparent'
              }`}
              activeOpacity={0.8}
            >
              <View className="w-9 h-9 rounded-xl bg-white border border-[#EEEEEE] items-center justify-center mr-3">
                <Ionicons name={p.icon} size={20} color="#1A1A1A" />
              </View>
              <View className="flex-1">
                <Text className="text-[13px] font-semibold text-[#1A1A1A]">{p.title}</Text>
                <Text className="text-[11px] text-[#999] mt-0.5">{p.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* NEXT BUTTON */}
        <View className="px-4 pt-4 pb-8">
          <TouchableOpacity
            className="bg-[#F9EF08] rounded-2xl py-4 items-center"
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text className="text-[15px] font-bold text-[#1A1A00]">
              Complete and Review
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
