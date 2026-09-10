import { useAlert } from "@/hooks/use-alert";
import { logError } from "@/lib/logger";
import { normalizeForSearch } from "@/lib/textMatch";
import { AddonCardsSkeleton, ServiceCardsSkeleton } from "@/components/ui/user/UserScreenSkeleton";
import { Ionicons } from "@expo/vector-icons";
import { get, getDatabase, onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import ScheduleUnavailableModal from "./modals/ScheduleUnavailableModal";

interface Service {
  id: string;
  name: string;
  sedan: number;
  suv: number;
  pickup: number;
  motorcycle: number;
  estimatedTime: number;
  // The web catalog manager stores a multi-line description as a string array (one entry per
  // line, each of which may itself contain commas) - kept in its raw shape here so
  // getServiceFeatures can tell "already-split lines" apart from a single delimited string.
  description?: string | string[];
}

interface Addon {
  id: string;
  name: string;
  price: number;
  estimatedTime: number;
  // Optional catalog field (mirrors "branches") for which vehicle classes this add-on applies
  // to - not yet editable from the web catalog manager, so most add-ons won't have it set.
  vehicleClasses?: string[];
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

// Client policy (confirmed with the business owner): a booking must be placed at least 1 hour
// before its slot - this is what guarantees the supervisor real buffer to review it, for every
// slot, not just the first one of the day - and no more than 1 week ahead.
const MIN_LEAD_TIME_MS = 60 * 60 * 1000;
const MAX_ADVANCE_DAYS = 7;

// Individual feature lines for a service's bullet list. An array description is already
// pre-split by the web catalog manager (each entry is one line, which may itself contain
// commas - e.g. "to remove dirt, dust, and road grime." - so it must NOT be re-split). A plain
// string description (from the app's own "Add Service" admin flow) is comma/semicolon-delimited
// and still needs splitting.
const getDescriptionLines = (desc: unknown): string[] => {
  if (Array.isArray(desc)) {
    return desc.map((line) => String(line).trim()).filter(Boolean);
  }
  if (typeof desc === 'string') {
    return desc.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

// Minutes-since-midnight for a "6:00 AM" / "12:00 PM" slot label - used to order slots.
const slotTimeToMinutes = (timeStr: string): number => {
  const match = String(timeStr).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return hour * 60 + minute;
};

// Normalises Branches/{id}/TimeSlots - stored as an array, or an object keyed by index, and
// possibly with holes left by deletes - into a clean, time-ordered list.
const parseBranchTimeSlots = (raw: unknown): TimeSlot[] => {
  const rows: any[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? Object.values(raw)
      : [];
  return rows
    .filter((s) => s && typeof s === 'object' && s.time)
    .map((s): TimeSlot => ({
      time: String(s.time),
      status: s.status === 'unavailable' ? 'unavailable' : 'available',
    }))
    .sort((a, b) => slotTimeToMinutes(a.time) - slotTimeToMinutes(b.time));
};

type VehicleClass = 'sedan' | 'suv' | 'pickup' | 'motorcycle';

const getVehicleClass = (vtype: string): VehicleClass =>
  vtype.startsWith('motorcycle') ? 'motorcycle' : (vtype as VehicleClass);

// Unlike services, the "addOns" catalog has no per-vehicle-class field the web catalog manager
// can edit yet - this name-keyed map (confirmed with the business owner per item) is the
// fallback for add-ons that don't have a `vehicleClasses` array set directly on their catalog
// document. Once the web tool grows a UI for that field (mirroring "branches"), items using it
// no longer need an entry here. Any add-on matched by neither is assumed to apply to every
// vehicle class, so a brand new add-on shows up everywhere by default instead of silently
// disappearing until someone remembers to update this map.
const ADDON_VEHICLE_CLASSES: Record<string, VehicleClass[]> = {
  'Motorcycle Wax (Small)': ['motorcycle'],
  'Motorcycle Wax (Large)': ['motorcycle'],
  'Interior Shampoo (Car)': ['sedan'],
  'Interior Shampoo (SUV/Pickup)': ['suv', 'pickup'],
  'Exterior Buff (Car)': ['sedan'],
  'Exterior Buff (SUV/Pickup)': ['suv', 'pickup'],
  'Vacuum': ['sedan', 'suv', 'pickup'],
  'Engine Wash': ['sedan', 'suv', 'pickup'],
  'Under Chassis Wash': ['sedan', 'suv', 'pickup'],
  'Engine Detailing': ['sedan', 'suv', 'pickup'],
  'Seat Cover Installation': ['sedan', 'suv', 'pickup'],
  'Armor All (Body & Dashboard)': ['sedan', 'suv', 'pickup'],
};

const isAddonAvailableForVehicleClass = (addon: Addon, vehicleClass: VehicleClass): boolean => {
  if (Array.isArray(addon.vehicleClasses) && addon.vehicleClasses.length > 0) {
    return addon.vehicleClasses.includes(vehicleClass);
  }
  const allowed = ADDON_VEHICLE_CLASSES[addon.name];
  return !allowed || allowed.includes(vehicleClass);
};

export default function ServicesStep({
  branchId,
  selectedVehicle,
  onNext,
}: {
  branchId: string;
  selectedVehicle: Vehicle;
  onNext: (data: any) => void;
}) {
  const { showAlert, AlertComponent } = useAlert();
  const [services, setServices] = useState<Service[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [addonsLoading, setAddonsLoading] = useState(true);
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
  // The branch's real bookable slots (Branches/{id}/TimeSlots) - the same node the branch admin
  // and the web dashboard write to. This is the source of truth for which hours are offered and
  // which are switched off; `null` = not loaded yet, `[]` = branch has no TimeSlots node (legacy,
  // fall back to synthesising an hourly range from the schedule string).
  const [branchTimeSlots, setBranchTimeSlots] = useState<TimeSlot[] | null>(null);
  const [showScheduleUnavailableModal, setShowScheduleUnavailableModal] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<string>("");

  const db = getDatabase();

  const sanitizePath = (path: string) => path.replace(/[.#$[\]]/g, "");

  useEffect(() => {
    loadServices();
    loadAddons();
    loadBranchSchedule();

    // Live subscription (not a one-shot get) so a slot change made from the branch admin or the
    // web dashboard shows up here without the customer having to back out and re-open the branch.
    const slotsRef = ref(db, `Branches/${sanitizePath(branchId)}/TimeSlots`);
    const unsubscribe = onValue(slotsRef, (snapshot) => {
      setBranchTimeSlots(parseBranchTimeSlots(snapshot.val()));
    }, () => {
      // A read failure must not wedge the picker on "loading" - fall back to the schedule string.
      setBranchTimeSlots([]);
    });
    return () => unsubscribe();
  }, []);

  // Recompute the visible slots whenever the date, the branch's slots, or its schedule changes.
  // Listing every input as a dependency is what kills the old race where this ran once on mount
  // with a still-null schedule (hard-coded 6 PM fallback) and never refreshed unless a day was
  // tapped.
  useEffect(() => {
    const next = computeTimeSlots(selectedDate);
    setTimeSlots(next);
    // Drop a previously-picked slot that the new list no longer offers (e.g. the branch turned
    // it off, or the lead-time cutoff has since passed).
    setSelectedTimeSlot((cur) => (cur && next.some((s) => s.time === cur.time) ? cur : null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, branchTimeSlots, branchSchedule]);

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
      logError("ServicesStep.loadBranchSchedule", err, { context: "Failed to load branch schedule" });
      // Returning default schedule when loading fails
      const defaultSchedule = { openTime: "8:00 AM", closeTime: "6:00 PM" };
      setBranchSchedule(defaultSchedule);
      return defaultSchedule;
    }
    return null;
  };

  // Loading services data from Firebase. The shared "services" catalog (managed on the web) is
  // the source of truth for which services exist and which branches offer them, via its
  // `branches` array - Branches/{id}/Services only holds legacy full-object services created
  // directly in-app, plus optional per-branch availability overrides for catalog services.
  const loadServices = async () => {
    try {
      const sanitizedBranchId = sanitizePath(branchId);
      const [branchSnapshot, catalogSnapshot] = await Promise.all([
        get(ref(db, `Branches/${sanitizedBranchId}/Services`)),
        get(ref(db, 'services')),
      ]);

      const branchLocal = branchSnapshot.val() ?? {};
      const catalog = catalogSnapshot.val() ?? {};
      const data: Service[] = [];
      const addedIds = new Set<string>();

      Object.entries(branchLocal).forEach(([id, val]: [string, any]) => {
        if (val && typeof val === 'object' && val.name) {
          // Legacy format: full service object stored directly under the branch
          if (val.isAvailable === false) return;
          data.push({
            id,
            name: val.name,
            sedan: val.sedanPrice ?? 0,
            suv: val.suvPrice ?? 0,
            pickup: val.pickupPrice ?? 0,
            motorcycle: val.motorcyclePrice ?? 0,
            estimatedTime: val.estimatedTime ?? 0,
            description: val.description,
          });
          addedIds.add(id);
        }
      });

      Object.entries(catalog).forEach(([id, master]: [string, any]) => {
        if (addedIds.has(id)) return;
        if (!Array.isArray(master?.branches) || !master.branches.includes(sanitizedBranchId)) return;

        // A branch-local entry with this id (if any) is an availability override, not a service.
        const override = branchLocal[id];
        const isAvailable =
          typeof override === 'boolean' ? override : override?.isAvailable !== undefined ? override.isAvailable : true;
        if (!isAvailable) return;

        const prices = master.branchPrices?.[sanitizedBranchId] ?? master.defaultPrices ?? {};
        data.push({
          id,
          name: master.name,
          sedan: prices.sedan ?? 0,
          suv: prices.suv ?? 0,
          pickup: prices.pickup ?? 0,
          motorcycle: prices.motorcycle ?? 0,
          estimatedTime: master.estimatedTime ?? 0,
          description: master.description,
        });
        addedIds.add(id);
      });

      setServices(data);
    } catch (err) {
      showAlert("Something went wrong while fetching the available services. Please try again.", { title: "Couldn't load services", type: 'error' });
    } finally {
      setServicesLoading(false);
    }
  };

  // Same source-of-truth model as loadServices, against the shared "addOns" catalog.
  const loadAddons = async () => {
    try {
      const sanitizedBranchId = sanitizePath(branchId);
      const [branchSnapshot, catalogSnapshot] = await Promise.all([
        get(ref(db, `Branches/${sanitizedBranchId}/AddOns`)),
        get(ref(db, 'addOns')),
      ]);

      const branchLocal = branchSnapshot.val() ?? {};
      const catalog = catalogSnapshot.val() ?? {};
      const data: Addon[] = [];
      const addedIds = new Set<string>();

      Object.entries(branchLocal).forEach(([id, val]: [string, any]) => {
        if (val && typeof val === 'object' && val.name) {
          // Legacy format: full add-on object stored directly under the branch
          if (val.isAvailable === false) return;
          data.push({
            id,
            name: val.name,
            price: val.price ?? 0,
            estimatedTime: val.estimatedTime ?? 0,
          });
          addedIds.add(id);
        }
      });

      Object.entries(catalog).forEach(([id, master]: [string, any]) => {
        if (addedIds.has(id)) return;
        if (!Array.isArray(master?.branches) || !master.branches.includes(sanitizedBranchId)) return;

        const override = branchLocal[id];
        const isAvailable =
          typeof override === 'boolean' ? override : override?.isAvailable !== undefined ? override.isAvailable : true;
        if (!isAvailable) return;

        const price = master.branchPrices?.[sanitizedBranchId]?.price ?? master.defaultPrice ?? 0;
        data.push({
          id,
          name: master.name,
          price,
          estimatedTime: master.estimatedTime ?? 0,
          vehicleClasses: master.vehicleClasses,
        });
        addedIds.add(id);
      });

      setAddons(data);
    } catch (err) {
      showAlert("Something went wrong while fetching the available add-ons. Please try again.", { title: "Couldn't load add-ons", type: 'error' });
    } finally {
      setAddonsLoading(false);
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

  // A slot is bookable only once it's at least MIN_LEAD_TIME_MS away from right now - this
  // naturally handles "today" (filters out the next hour) and every future date (always well
  // past the cutoff) with the same check, no isToday special-casing needed.
  const isSlotBookable = (date: Date, hour: number): boolean => {
    const slotDateTime = new Date(date);
    slotDateTime.setHours(hour, 0, 0, 0);
    return slotDateTime.getTime() >= Date.now() + MIN_LEAD_TIME_MS;
  };

  const checkDateAvailability = (date: Date, schedule?: { openTime: string; closeTime: string }): { available: boolean; reason: string } => {
    // Same source-of-truth order as computeTimeSlots: real slots first, schedule string only as
    // the legacy fallback. Keeps this gate in step with what the picker will actually show.
    if (branchTimeSlots && branchTimeSlots.length > 0) {
      const hasAvailableSlots = branchTimeSlots.some(
        (s) => s.status !== 'unavailable' && isSlotBookable(date, parseTimeTo24Hour(s.time))
      );
      return hasAvailableSlots
        ? { available: true, reason: "" }
        : { available: false, reason: `The store is closed.` };
    }

    const scheduleToUse = schedule || branchSchedule;
    if (!scheduleToUse) {
      return { available: true, reason: "" };
    }

    // Converting schedule times to 24-hour format
    const openHour = parseTimeTo24Hour(scheduleToUse.openTime);
    const closeHour = parseTimeTo24Hour(scheduleToUse.closeTime);

    // Verifying schedule has valid time range with available slots
    let hasAvailableSlots = false;
    for (let h = openHour; h < closeHour; h++) {
      if (!isSlotBookable(date, h)) continue;
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

  // The slots to show for `date`. Prefers the branch's real TimeSlots (kept live by the listener
  // above), honouring each slot's on/off status; only synthesises a plain hourly range from the
  // schedule string for legacy branches that have no TimeSlots node at all.
  const computeTimeSlots = (date: Date): TimeSlot[] => {
    if (branchTimeSlots && branchTimeSlots.length > 0) {
      return branchTimeSlots.filter(
        (s) => s.status !== 'unavailable' && isSlotBookable(date, parseTimeTo24Hour(s.time))
      );
    }

    // Nothing loaded yet - show an empty strip for the moment rather than a wrong guessed range.
    if (branchTimeSlots === null && !branchSchedule) return [];

    const openHour = branchSchedule ? parseTimeTo24Hour(branchSchedule.openTime) : 8;
    const closeHour = branchSchedule ? parseTimeTo24Hour(branchSchedule.closeTime) : 18;
    const slots: TimeSlot[] = [];
    for (let h = openHour; h < closeHour; h++) {
      if (!isSlotBookable(date, h)) continue;
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const period = h >= 12 ? "PM" : "AM";
      slots.push({ time: `${hour12}:00 ${period}`, status: 'available' });
    }
    return slots;
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
    // Capped at 2 so a card never grows past a predictable height - each shown line is left
    // to wrap in full (never truncated mid-sentence), the rest is simply not shown on the card.
    const lines = getDescriptionLines(service.description).slice(0, 2);
    if (lines.length > 0) return lines;
    return ['Exterior wash', 'Rinse & dry'];
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
      showAlert("Please choose a washing plan before proceeding.", { title: "No service selected", type: 'warning' });
      return;
    }
    if (!selectedTimeSlot) {
      showAlert("Please pick an available time slot for your appointment.", { title: "No time slot selected", type: 'warning' });
      return;
    }
    if (!paymentMethod) {
      showAlert("Please select how you'd like to pay before completing your booking.", { title: "No payment method", type: 'warning' });
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

  const vehicleClass = getVehicleClass(selectedVehicle.vtype);

  // A price of exactly 0 means the catalog doesn't offer that service for this vehicle type
  // (e.g. "Motorcycle Wax" has sedan/suv/pickup: 0, and the car wash plans have motorcycle: 0)
  // rather than the service genuinely being free - filter those out instead of showing ₱0.00.
  const availableServices = services.filter((s) => getPriceForVehicle(s) > 0);

  // A few items ("Motorcycle Wax (S/L)") sit in both the services and add-ons catalogs. For a
  // vehicle that can book one as a plan, it IS the plan - there's no separate motorcycle wash to
  // add wax onto - so the service card wins and the item is dropped from the add-on list, never
  // the other way round (doing it the other way hid a motorcycle's only plans entirely).
  const serviceNames = new Set(availableServices.map((s) => normalizeForSearch(s.name)));
  const availableAddons = addons.filter(
    (a) =>
      isAddonAvailableForVehicleClass(a, vehicleClass) &&
      !serviceNames.has(normalizeForSearch(a.name)),
  );

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <ScrollView contentContainerStyle={{ paddingBottom: 0 }}>
        {/* ------------------- SERVICES ------------------- */}
        <Text className="text-xl font-semibold mt-4 px-4">
          Select plan
        </Text>
        <Text className="text-sm text-[#999] mb-3 px-4">
          Select your washing plan for{' '}
          <Text className="font-semibold text-[#1A1A1A]">{getVehicleLabel()}</Text>
        </Text>

        {servicesLoading ? (
          <ServiceCardsSkeleton />
        ) : availableServices.length === 0 ? (
          <View className="mx-4 mb-3 px-4 py-6 bg-white rounded-2xl items-center">
            <Text className="text-[13px] text-[#999] text-center">
              No washing plans available yet for {getVehicleLabel()} at this branch.
            </Text>
          </View>
        ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 4, paddingHorizontal: 12 }}
        >
          {availableServices.map((s) => {
            const selected = selectedServices.some((x) => x.id === s.id);
            const price = getPriceForVehicle(s);
            const features = getServiceFeatures(s);
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => toggleService(s)}
                className={`mx-2 rounded-2xl px-4 pt-4 pb-4 w-64 ${
                  selected
                    ? 'bg-[#F9EF08] border border-[#F9EF08]'
                    : 'bg-white border border-transparent'
                }`}
                activeOpacity={0.8}
              >
                {/* Name */}
                <Text className="text-[15px] font-bold text-[#1A1A1A] mb-3">
                  {s.name}
                </Text>

                {/* Feature checklist */}
                {features.map((feat, i) => (
                  <View key={i} className="flex-row items-start mb-1.5">
                    <Ionicons name="checkmark" size={14} color="#9CA3AF" style={{ marginTop: 1, marginRight: 6 }} />
                    <Text className="text-[12px] text-[#666] flex-1" numberOfLines={2}>
                      {feat}
                    </Text>
                  </View>
                ))}

                {/* Time + Price */}
                <View
                  className={`mt-3 pt-3 border-t flex-row justify-between items-center ${
                    selected ? 'border-[#1A1A00]/5' : 'border-[#F0F0F0]'
                  }`}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="time-outline" size={13} color="#1A1A1A" />
                    <Text className="text-[13px] font-semibold text-[#1A1A1A] ml-1">
                      {s.estimatedTime} mins
                    </Text>
                  </View>
                  <Text className="text-[15px] font-bold text-[#1A1A1A]">
                    ₱{price}.00
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        )}

        {/* ------------------- ADD ONS ------------------- */}
        {/* Hidden entirely for a vehicle with no applicable add-ons (e.g. motorcycles) */}
        {(addonsLoading || availableAddons.length > 0) && (
        <>
        <Text className="text-xl font-semibold mt-6 mb-3 px-4">
          Add ons <Text className="text-gray-500">(Optional)</Text>
        </Text>

        {addonsLoading ? (
          <AddonCardsSkeleton />
        ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 4, paddingHorizontal: 12 }}
        >
          {availableAddons.map((a) => {
            const selected = selectedAddons.some((x) => x.id === a.id);
            return (
              <TouchableOpacity
                key={a.id}
                onPress={() => toggleAddon(a)}
                className={`mx-2 rounded-2xl px-4 pt-4 pb-4 w-48 ${
                  selected
                    ? 'bg-[#F9EF08] border border-[#F9EF08]'
                    : 'bg-white border border-transparent'
                }`}
                activeOpacity={0.8}
              >
                {/* Name */}
                <Text className="text-[15px] font-bold text-[#1A1A1A]">
                  {a.name}
                </Text>

                {/* Time + Price */}
                <View
                  className={`mt-2 pt-3 border-t flex-row justify-between items-center ${
                    selected ? 'border-[#1A1A00]/5' : 'border-[#F0F0F0]'
                  }`}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="time-outline" size={13} color="#1A1A1A" />
                    <Text className="text-[13px] font-semibold text-[#1A1A1A] ml-1">
                      {a.estimatedTime} mins
                    </Text>
                  </View>
                  <Text className="text-[15px] font-bold text-[#1A1A1A]">
                    ₱{a.price}.00
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        )}
        </>
        )}

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
            const maxBookableDate = new Date(today);
            maxBookableDate.setDate(maxBookableDate.getDate() + MAX_ADVANCE_DAYS);
            const isPast = date < today;
            const isTooFarAhead = date > maxBookableDate;
            const isDisabled = isPast || isTooFarAhead;
            const isSelected = isSameDay(date, selectedDate);
            const dayLabel = DAY_LABELS[date.getDay()];

            return (
              <TouchableOpacity
                key={date.toISOString()}
                disabled={isDisabled}
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
                  // The [selectedDate] effect recomputes the slot strip - no manual call needed.
                  setSelectedDate(date);
                }}
                className={`mr-2 items-center justify-center rounded-2xl px-3 py-3 w-16 border ${
                  isSelected
                    ? 'bg-[#F9EF08] border-[#F9EF08]'
                    : 'bg-white border-transparent'
                }`}
                activeOpacity={0.8}
              >
                <Text className={`text-[10px] font-semibold mb-1 ${
                  isSelected ? 'text-[#1A1A00]' : isDisabled ? 'text-[#C4C4C4]' : 'text-[#999]'
                }`}>
                  {dayLabel}
                </Text>
                <Text className={`text-[18px] font-bold ${
                  isSelected ? 'text-[#1A1A00]' : isDisabled ? 'text-[#C4C4C4]' : 'text-[#1A1A1A]'
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
                  : 'bg-white border-transparent'
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
          {/* Maya - the only integrated payment method */}
          <TouchableOpacity
            onPress={() => setPaymentMethod('Maya')}
            className={`flex-row items-center px-4 py-3 rounded-2xl mb-3 ${
              paymentMethod === 'Maya'
                ? 'bg-white border border-[#D4D4D4]'
                : 'bg-white border border-transparent'
            }`}
            activeOpacity={0.8}
          >
            <View className="flex-1">
              <Text className="text-[13px] font-semibold text-[#1A1A1A]">Maya</Text>
              <Text className="text-[11px] text-[#999] mt-0.5">Pay via Maya wallet, card, or QR Ph.</Text>
            </View>
            <Image
              source={require('../../../../assets/images/maya_logo.png')}
              style={{ width: 45, height: 14 }}
              resizeMode="contain"
              className="ml-3"
            />
          </TouchableOpacity>
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
      {AlertComponent}
    </View>
  );
}
