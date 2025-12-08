import { useAlert } from "@/hooks/use-alert";
import { Ionicons } from "@expo/vector-icons";
import { get, getDatabase, ref } from "firebase/database";
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import DateSelectionModal from "./modals/DateSelectionModal";
import ScheduleUnavailableModal from "./modals/ScheduleUnavailableModal";

interface Service {
  id: string;
  name: string;
  sedan: number;
  suv: number;
  pickup: number;
  estimatedTime: number;
  isAvailable?: boolean;
}

interface Addon {
  id: string;
  name: string;
  price: number;
  estimatedTime: number;
  isAvailable?: boolean;
}

interface TimeSlot {
  time: string;
  status: "available" | "unavailable";
}

interface Vehicle {
  vname: string;
  vplateNumber: string;
  classification: string;
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
  const [showDateModal, setShowDateModal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(
    null
  );
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [branchSchedule, setBranchSchedule] = useState<{ openTime: string; closeTime: string } | null>(null);
  const [showScheduleUnavailableModal, setShowScheduleUnavailableModal] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<string>("");

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
          const key = child.key;
          
          // Including only available services (isAvailable !== false)
          // Defaulting to true if isAvailable is undefined (for backward compatibility)
          // Handling both boolean and string values
          let isAvailable = true;
          if (val.isAvailable !== undefined) {
            if (typeof val.isAvailable === 'boolean') {
              isAvailable = val.isAvailable;
            } else if (typeof val.isAvailable === 'string') {
              isAvailable = val.isAvailable.toLowerCase() === 'true';
            } else {
              isAvailable = Boolean(val.isAvailable);
            }
          }
          
          if (isAvailable) {
            // Checking for required fields (supports both camelCase and standard field names)
            const hasPrices = val.sedanPrice !== undefined || val.suvPrice !== undefined || val.pickupPrice !== undefined ||
                             val.sedan !== undefined || val.suv !== undefined || val.pickup !== undefined;
            
            if (val.name && hasPrices) {
              const service = {
                id: key!,
                name: val.name,
                sedan: val.sedanPrice || val.sedan || 0,
                suv: val.suvPrice || val.suv || 0,
                pickup: val.pickupPrice || val.pickup || 0,
                estimatedTime: val.estimatedTime || 0,
                isAvailable: true,
              };
              data.push(service);
            }
          }
        });
        
        setServices(data);
      } else {
        setServices([]);
      }
    } catch (err) {
      console.error("Error loading services:", err);
      alert("Error", "Failed to load services");
      setServices([]);
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
          // Including only available add-ons (isAvailable !== false)
          const isAvailable = val.isAvailable !== undefined ? val.isAvailable : true;
          if (isAvailable) {
            data.push({
              id: child.key!,
              name: val.name,
              price: val.price,
              estimatedTime: val.estimatedTime,
              isAvailable: true,
            });
          }
        });
        setAddons(data);
      }
    } catch (err) {
      alert("Error", "Failed to load add-ons");
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

  const loadTimeSlots = async (date: Date) => {
    try {
      // First, try to load time slots from database array
      const timeSlotsRef = ref(db, `Branches/${sanitizePath(branchId)}/TimeSlots`);
      const timeSlotsSnapshot = await get(timeSlotsRef);
      
      if (timeSlotsSnapshot.exists()) {
        const timeSlotsData = timeSlotsSnapshot.val();
        const slots: TimeSlot[] = [];
        
        // Handle array format: [null, {time: "10:00 AM", status: "available"}, ...]
        if (Array.isArray(timeSlotsData)) {
          timeSlotsData.forEach((slot: any) => {
            if (slot && slot.time && slot.status === "available") {
              slots.push({
                time: slot.time,
                status: "available",
              });
            }
          });
        } else if (typeof timeSlotsData === 'object' && timeSlotsData !== null) {
          // Handle object format as fallback
          Object.keys(timeSlotsData).forEach((key) => {
            const slot = timeSlotsData[key];
            if (slot && slot.time && slot.status === "available") {
              slots.push({
                time: slot.time,
                status: "available",
              });
            }
          });
        }
        
        // Filter out past time slots if selecting today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDateOnly = new Date(date);
        selectedDateOnly.setHours(0, 0, 0, 0);
        const isToday = selectedDateOnly.getTime() === today.getTime();
        const currentHour = isToday ? new Date().getHours() : 0;
        
        const filteredSlots = slots.filter((slot) => {
          if (!isToday) return true;
          
          // Parse time string to compare with current hour
          const timeMatch = slot.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (!timeMatch) return true;
          
          let hour = parseInt(timeMatch[1], 10);
          const period = timeMatch[3].toUpperCase();
          
          if (period === "PM" && hour !== 12) hour += 12;
          if (period === "AM" && hour === 12) hour = 0;
          
          return hour > currentHour;
        });
        
        setTimeSlots(filteredSlots);
        // Clearing selected time slot if it's not in the available slots
        if (selectedTimeSlot && !filteredSlots.find(s => s.time === selectedTimeSlot.time)) {
          setSelectedTimeSlot(null);
        }
        return;
      }
      
      // Fallback to dynamic generation if TimeSlots array doesn't exist
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDateOnly = new Date(date);
      selectedDateOnly.setHours(0, 0, 0, 0);
      const isToday = selectedDateOnly.getTime() === today.getTime();
      
      // Using current hour for today, otherwise starting from 0
      const currentHour = isToday ? new Date().getHours() : 0;
      
      // Fetching schedule from database: Branches/{branchId}/profile/schedule
      const scheduleRef = ref(db, `Branches/${sanitizePath(branchId)}/profile/schedule`);
      const scheduleSnapshot = await get(scheduleRef);
      
      const slots: TimeSlot[] = [];
      let openHour = 8; // Default fallback
      let closeHour = 18; // Default fallback
      
      if (scheduleSnapshot.exists()) {
        const scheduleString = scheduleSnapshot.val();
        
        // Extract time range from schedule string (e.g., "8:00 AM - 6:00 PM" or "Mon-Sat: 9:00 AM - 6:00 PM")
        // Handle various formats: "8:00 am - 6:00 pm", "Mon-Sat: 9:00 AM - 6:00 PM", etc.
        const timeMatch = String(scheduleString).match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/i);
        
        if (timeMatch) {
          openHour = parseTimeTo24Hour(`${timeMatch[1]}:${timeMatch[2]} ${timeMatch[3].toUpperCase()}`);
          closeHour = parseTimeTo24Hour(`${timeMatch[4]}:${timeMatch[5]} ${timeMatch[6].toUpperCase()}`);
        } else {
          // If parsing fails, use branchSchedule if available, otherwise use defaults
          if (branchSchedule) {
            openHour = parseTimeTo24Hour(branchSchedule.openTime);
            closeHour = parseTimeTo24Hour(branchSchedule.closeTime);
          }
        }
      } else {
        // No schedule found in database, use branchSchedule if available
        if (branchSchedule) {
          openHour = parseTimeTo24Hour(branchSchedule.openTime);
          closeHour = parseTimeTo24Hour(branchSchedule.closeTime);
        }
      }
      
      // Generate hourly time slots from openHour to closeHour
      // Example: 8 AM to 6 PM generates: 8 AM, 9 AM, 10 AM, ..., 5 PM
      for (let h = openHour; h < closeHour; h++) {
        // Skip past hours when selecting today's date
        if (isToday && h <= currentHour) {
          continue;
        }
        
        // Convert 24-hour format to 12-hour format with AM/PM
        const hour12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        const period = h >= 12 ? "PM" : "AM";
        slots.push({
          time: `${hour12}:00 ${period}`,
          status: "available",
        });
      }
      
      setTimeSlots(slots);
      // Clearing selected time slot if it's not in the available slots
      if (selectedTimeSlot && !slots.find(s => s.time === selectedTimeSlot.time)) {
        setSelectedTimeSlot(null);
      }
    } catch (err) {
      console.error("Failed to load timeslots:", err);
      // Fallback to default behavior on error
      const openHour = branchSchedule ? parseTimeTo24Hour(branchSchedule.openTime) : 8;
      const closeHour = branchSchedule ? parseTimeTo24Hour(branchSchedule.closeTime) : 18;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDateOnly = new Date(date);
      selectedDateOnly.setHours(0, 0, 0, 0);
      const isToday = selectedDateOnly.getTime() === today.getTime();
      const currentHour = isToday ? new Date().getHours() : 0;
      
      const slots: TimeSlot[] = [];
      for (let h = openHour; h < closeHour; h++) {
        if (isToday && h <= currentHour) {
          continue;
        }
        const hour12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        const period = h >= 12 ? "PM" : "AM";
        slots.push({
          time: `${hour12}:00 ${period}`,
          status: "available",
        });
      }
      setTimeSlots(slots);
    }
  };

  // Price and formatting utilities
  const getPriceForClassification = (service: Service) => {
    switch (selectedVehicle.classification) {
      case "Sedan":
        return service.sedan;
      case "SUV":
        return service.suv;
      case "Pickup":
        return service.pickup;
      default:
        return service.sedan;
    }
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

  // Validating selections and proceeding to confirmation step
  const handleNext = () => {
    if (!selectedServices.length || !selectedTimeSlot) {
      alert("Error", "Please select a service and time slot");
      return;
    }
    if (!paymentMethod) {
      alert("Error", "Please select a payment method");
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
      classification: selectedVehicle.classification,
      paymentMethod,
    });
  };

  return (
    <View className="flex-1 bg-[#F8F8F8] px-4">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ------------------- SERVICES ------------------- */}
        <Text className="text-xl font-semibold mt-4 mb-3">
          Choose Service <Text className="text-gray-500">(Choose 1)</Text>
        </Text>

        {services.length === 0 ? (
          <View className="bg-white rounded-xl p-4 mb-4">
            <Text className="text-gray-500 text-center">
              No services available at this time.
            </Text>
          </View>
        ) : (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ alignItems: 'center' }}
          >
            {services.map((s) => {
              const selected = selectedServices.some((x) => x.id === s.id);
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => toggleService(s)}
                  style={{ 
                    width: 220, 
                    height: 140,
                  }}
                  className={`rounded- bg-white mx-2 border-2 flex-col p-1 ${
                    selected ? "border-yellow-300" : "border-transparent"
                  }`}
                >
                  <View className="flex-1 justify-center px-5">
                    <Text className="text-2xl font-semibold text-gray-400 text-center">
                      {s.name}
                    </Text>
                  </View>

                  <View className="bg-yellow-300 px-4 py-2 rounded-b-2xl">
                    <View className="flex-row justify-between mb-1.5">
                      <Text className="text-white font-medium text-lg">Sedan</Text>
                      <Text className="text-white font-medium text-lg">
                        ₱{s.sedan}.00
                      </Text>
                    </View>
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-white font-medium text-lg">SUV</Text>
                      <Text className="text-white font-medium text-lg">₱{s.suv}.00</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-white font-medium text-lg">Pick Up</Text>
                      <Text className="text-white font-medium text-lg">
                        ₱{s.pickup}.00
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ------------------- ADD ONS ------------------- */}
        <Text className="text-xl font-semibold mt-6 mb-3">
          Add ons <Text className="text-gray-500">(Optional)</Text>
        </Text>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center' }}
        >
          {addons.map((a) => {
            const selected = selectedAddons.some((x) => x.id === a.id);
            return (
              <TouchableOpacity
                key={a.id}
                onPress={() => toggleAddon(a)}
                style={{ 
                  width: 170, 
                  height: 90,
                }}
                className={`rounded-xl bg-white mx-2 border-2 flex-col p-1 ${
                  selected ? "border-yellow-300" : "border-transparent"
                }`}
              >
                <View className="flex-1 justify-center px-5">
                  <Text className="text-xl font-semibold text-gray-400 text-center">
                    {a.name}
                  </Text>
                </View>
                <View className="bg-yellow-300 px-4 py-3 rounded-b-2xl items-center justify-center">
                  <Text className="text-white font-medium text-center text-xl">
                    ₱{a.price}.00
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ------------------- DATE & TIME ------------------- */}
        <View className="flex-row justify-between items-center mt-6 mb-3 px-1">
          <Text className="text-xl font-semibold">Date and Time</Text>

          <TouchableOpacity
            onPress={() => {
              setCalendarMonth(new Date(selectedDate));
              setShowDateModal(true);
            }}
            className="bg-white px-4 py-2 rounded-xl"
          >
            <Text className="text-gray-400 font-medium">
              {formatDate(selectedDate)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Selection Modal */}
        <DateSelectionModal
          visible={showDateModal}
          selectedDate={selectedDate}
          calendarMonth={calendarMonth}
          branchSchedule={branchSchedule}
          onClose={() => setShowDateModal(false)}
          onDateSelect={(date) => {
            setSelectedDate(date);
            setShowDateModal(false);
            loadTimeSlots(date);
          }}
          onMonthNavigate={navigateMonth}
          checkDateAvailability={checkDateAvailability}
          loadBranchSchedule={loadBranchSchedule}
          onUnavailableDate={(reason) => {
            setUnavailableReason(reason);
            setShowScheduleUnavailableModal(true);
          }}
        />

        {/* Schedule Unavailable Modal */}
        <ScheduleUnavailableModal
          visible={showScheduleUnavailableModal}
          reason={unavailableReason}
          branchSchedule={branchSchedule}
          onClose={() => setShowScheduleUnavailableModal(false)}
        />

        {/* ------------------- TIMESLOTS ------------------- */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {timeSlots.map((t) => (
            <TouchableOpacity
              key={t.time}
              onPress={() => {
                if (t.status === "available") {
                  setSelectedTimeSlot(t);
                }
              }}
              disabled={t.status === "unavailable"}
              className={`px-5 py-3 rounded-xl bg-white border mr-3 ${
                selectedTimeSlot?.time === t.time
                  ? "border-yellow-300 border-2"
                  : "border-transparent border-2"
              }`}
              style={{
                opacity: t.status === "unavailable" ? 0.5 : 1,
              }}
            >
              <Text className={`font-medium text-center ${t.status === "unavailable" ? "text-gray-300" : "text-gray-400"}`}>
                {t.time}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ------------------- PAYMENT OPTIONS ------------------- */}
        <Text className="text-xl font-semibold mt-6 mb-3">Payment Option</Text>
        {[
          {
            id: "COD",
            title: "Cash on Delivery (COD)",
            desc: "Pay cash on delivery for your purchase when it arrives at your doorstep.",
            icon: require("@/assets/images/cod_ic.png"),
          },
          {
            id: "E-Wallet",
            title: "Pay Using E-Wallet",
            desc: "Pay using supported e-wallets such as GCash, Maya, and more.",
            icon: require("@/assets/images/ewallet_ic.png"),
          },
          {
            id: "Card",
            title: "Pay Using Card",
            desc: "Use supported Debit/Credit cards such as Mastercard and Visa.",
            icon: require("@/assets/images/credit_card_ic.png"),
          },
        ].map((p) => (
          <TouchableOpacity
            key={p.id}
            onPress={() => setPaymentMethod(p.id)}
            className="bg-white p-4 rounded-2xl shadow-sm flex-row items-center mx-2 mb-4 border border-gray-200"
          >
            {p.icon && <Image source={p.icon} className="w-8 h-8 mr-3" />}
            <View className="flex-1">
              <Text className="text-[17px] font-semibold">{p.title}</Text>
              <Text className="text-gray-500 mt-1">{p.desc}</Text>
            </View>
            <View
              className={`w-6 h-6 rounded-full border-2 ${
                paymentMethod === p.id ? "border-[#F9EF08]" : "border-gray-300"
              } items-center justify-center`}
            >
              {paymentMethod === p.id && (
                <View className="w-3.5 h-3.5 rounded-full bg-[#F9EF08]" />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* NEXT BUTTON */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-16 h-16 bg-[#F9EF08] rounded-full shadow-lg"
        onPress={handleNext}
        activeOpacity={0.8}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons name="chevron-forward" size={46} color="white" style={{ marginLeft: 4 }} />
      </TouchableOpacity>
      {AlertComponent}
    </View>
  );
}
