import { ERROR_COLOR } from "@/components/ui/common/FieldError";
import { useAlert } from "@/hooks/use-alert";
import { BOOKING_FEE } from "@/lib/bookingFee";
import { formatDuration } from "@/lib/duration";
import { formatPeso } from "@/lib/formatPeso";
import { logError } from "@/lib/logger";
import { normalizeForSearch } from "@/lib/textMatch";
import { AddonCardsSkeleton, DateStripSkeleton, ServiceCardsSkeleton } from "@/components/ui/user/UserScreenSkeleton";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { get, getDatabase, onValue, ref } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { AppButton } from '@/components/ui/common/AppButton';
import {
  Image,
  LayoutAnimation,
  ScrollView,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SectionHeader from "./SectionHeader";

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

// Exact motorcycle fit. The catalog has ONE `motorcycle` price per item, so "small" vs "large" is
// only carried in the item's name, e.g. "Motorcycle Wash (Large)" or "Motorcycle Wax (Small)".
// Class-level filtering alone therefore showed both sizes to every motorcycle, and since the
// charged price comes from the item picked (not from the bike) a large bike could book the
// cheaper "(Small)" plan. This reads that naming convention and keeps only the matching size.
// It fails open on purpose: an item with no size tag (or a vehicle that isn't a motorcycle) is
// never hidden by it, so a renamed or brand new catalog item can't silently disappear.
type MotorcycleSize = 'small' | 'large';

const getVehicleMotorcycleSize = (vtype: string): MotorcycleSize | null =>
  vtype === 'motorcycle-small' ? 'small' : vtype === 'motorcycle-large' ? 'large' : null;

const getItemMotorcycleSize = (name: string): MotorcycleSize | null => {
  const match = name.match(/\(\s*(small|large|s|l)\s*\)/i);
  if (!match) return null;
  return match[1].toLowerCase().startsWith('s') ? 'small' : 'large';
};

const fitsMotorcycleSize = (itemName: string, vtype: string): boolean => {
  const vehicleSize = getVehicleMotorcycleSize(vtype);
  const itemSize = getItemMotorcycleSize(itemName);
  return !vehicleSize || !itemSize || vehicleSize === itemSize;
};

// A sedan has 8 add-ons, which on their own were more than a third of the page. Past
// ADDON_COLLAPSE_ABOVE items the list shows only the first ADDON_PREVIEW_COUNT behind a "View
// more" button (hiding just one or two would save nothing, so short lists are never collapsed).
const ADDON_PREVIEW_COUNT = 3;
const ADDON_COLLAPSE_ABOVE = 4;

// "a large motorcycle", "an SUV" - used in the header and empty state copy.
const getVehiclePhrase = (vtype: string): string => {
  switch (vtype) {
    case 'sedan': return 'a sedan';
    case 'suv': return 'an SUV';
    case 'pickup': return 'a pickup';
    case 'motorcycle-small': return 'a small motorcycle';
    case 'motorcycle-large': return 'a large motorcycle';
    default: return 'your vehicle';
  }
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
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState<Service[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [addonsLoading, setAddonsLoading] = useState(true);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(
    null
  );
  // Maya is the only payment method, so it starts selected (the customer has nothing to choose).
  const [paymentMethod, setPaymentMethod] = useState<string | null>('Maya');
  const [branchSchedule, setBranchSchedule] = useState<{ openTime: string; closeTime: string } | null>(null);
  // The branch's real bookable slots (Branches/{id}/TimeSlots) - the same node the branch admin
  // and the web dashboard write to. This is the source of truth for which hours are offered and
  // which are switched off; `null` = not loaded yet, `[]` = branch has no TimeSlots node (legacy,
  // fall back to synthesising an hourly range from the schedule string).
  const [branchTimeSlots, setBranchTimeSlots] = useState<TimeSlot[] | null>(null);
  const [addonsExpanded, setAddonsExpanded] = useState(false);
  // Inline validation: nothing is flagged until the first "Review booking" attempt. After that each
  // message shows or clears on its own as its section becomes valid (see the derived errors below).
  const [triedSubmit, setTriedSubmit] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<{ time?: number; payment?: number }>({});

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
      showAlert('Check your connection and try again', { title: "Couldn't load services", type: 'error' });
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
      showAlert('Check your connection and try again', { title: "Couldn't load add-ons", type: 'error' });
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

  // The card shows only the first description line as a summary (the rest of the catalog
  // description is intentionally not surfaced). No invented filler when a legacy service has none.
  const getServiceSummary = (service: Service): string | undefined =>
    getDescriptionLines(service.description)[0];

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

  const getMonthName = (date: Date): string => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return months[date.getMonth()];
  };

  const isSameDay = (a: Date, b: Date): boolean =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // The days a customer can actually book: today through MAX_ADVANCE_DAYS ahead, minus any day
  // with no bookable slot left. That uses the same check as the time picker, so it follows each
  // branch's own hours: at 10 PM on a branch whose last slot is 5 PM, today simply isn't offered.
  // Days outside the window or without a slot are left out, not shown greyed. Not shown until the
  // branch's slots have loaded (`null`), so today can't flash in and then vanish.
  const slotsReady = branchTimeSlots !== null;
  const bookableDays: Date[] = !slotsReady
    ? []
    : Array.from({ length: MAX_ADVANCE_DAYS + 1 }, (_, i) => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + i);
        return d;
      }).filter((d) => checkDateAvailability(d).available);
  const bookableDaysKey = bookableDays.map((d) => d.getTime()).join(',');

  // The date selected by default is today, which may not be offered (see above) - move to the
  // first day that is. Also covers the selected day dropping out while the screen stays open.
  useEffect(() => {
    if (bookableDays.length === 0) return;
    if (!bookableDays.some((d) => isSameDay(d, selectedDate))) setSelectedDate(bookableDays[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookableDaysKey]);

  // "November 2026", or "November to December 2026" when the window crosses a month end.
  const getDateRangeLabel = (days: Date[]): string => {
    if (days.length === 0) return '';
    const first = days[0];
    const last = days[days.length - 1];
    if (first.getFullYear() !== last.getFullYear()) {
      return `${getMonthName(first)} ${first.getFullYear()} to ${getMonthName(last)} ${last.getFullYear()}`;
    }
    if (first.getMonth() !== last.getMonth()) {
      return `${getMonthName(first)} to ${getMonthName(last)} ${first.getFullYear()}`;
    }
    return `${getMonthName(first)} ${first.getFullYear()}`;
  };

  // ------------------ Confirm Booking ------------------
  const handleNext = () => {
    // A missing choice is something the customer can fix right on this page, so it is flagged in
    // place (every missing section at once) and the page scrolls to the first one, instead of a
    // modal that covers the very thing that needs fixing.
    const firstMissing = !selectedServices.length
      ? 'plan'
      : !selectedTimeSlot
        ? 'time'
        : !paymentMethod
          ? 'payment'
          : null;
    if (firstMissing) {
      setTriedSubmit(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const y = firstMissing === 'plan' ? 0 : sectionY.current[firstMissing] ?? 0;
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
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
  const availableServices = services.filter(
    (s) => getPriceForVehicle(s) > 0 && fitsMotorcycleSize(s.name, selectedVehicle.vtype),
  );

  // A few items ("Motorcycle Wax (S/L)") sit in both the services and add-ons catalogs. For a
  // vehicle that can book one as a plan, it IS the plan - there's no separate motorcycle wash to
  // add wax onto - so the service card wins and the item is dropped from the add-on list, never
  // the other way round (doing it the other way hid a motorcycle's only plans entirely).
  const serviceNames = new Set(availableServices.map((s) => normalizeForSearch(s.name)));
  const availableAddons = addons.filter(
    (a) =>
      isAddonAvailableForVehicleClass(a, vehicleClass) &&
      fitsMotorcycleSize(a.name, selectedVehicle.vtype) &&
      !serviceNames.has(normalizeForSearch(a.name)),
  );

  // Cheapest first, so the few add-ons visible before "View more" are the easy yeses (vacuum,
  // armor all) and the big detailing jobs sit at the end. Array.sort is stable, so equal prices
  // keep the catalog's own order. A selected add-on is never hidden by collapsing the list.
  const sortedAddons = [...availableAddons].sort((a, b) => a.price - b.price);
  const canCollapseAddons = sortedAddons.length > ADDON_COLLAPSE_ABOVE;
  const visibleAddons =
    !canCollapseAddons || addonsExpanded
      ? sortedAddons
      : sortedAddons.filter(
          (a, i) => i < ADDON_PREVIEW_COUNT || selectedAddons.some((x) => x.id === a.id),
        );
  const hiddenAddonCount = sortedAddons.length - visibleAddons.length;

  const toggleAddonsExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAddonsExpanded((v) => !v);
  };

  // What the customer will owe, mirroring ConfirmationStep's "Amount Due": plan + add-ons + the
  // flat booking fee. Only the fee is charged online; the rest is settled at the branch.
  const subtotal =
    selectedServices.reduce((acc, s) => acc + getPriceForVehicle(s), 0) +
    selectedAddons.reduce((acc, a) => acc + a.price, 0);
  const total = subtotal + BOOKING_FEE;
  const hasPlan = selectedServices.length > 0;
  const planError = triedSubmit && !hasPlan ? 'Choose a wash plan' : undefined;
  const timeError =
    triedSubmit && !selectedTimeSlot
      ? timeSlots.length > 0
        ? 'Choose a time slot'
        : 'No time slots left on this day. Pick another day.'
      : undefined;
  const paymentError = triedSubmit && !paymentMethod ? 'Choose how to pay' : undefined;
  const vehiclePhrase = getVehiclePhrase(selectedVehicle.vtype);
  const vehicleDisplayName = selectedVehicle.vname?.trim() || 'ride';

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* ------------------- HEADER ------------------- */}
        <View className="px-4 mt-3 mb-4">
          <Text className="text-[20px] leading-[26px] font-bold text-[#1A1A1A]">
            Make your {vehicleDisplayName} shine
          </Text>
          <Text className="text-[13px] text-[#999] mt-0.5">
            Plans made for {vehiclePhrase}.
          </Text>
          {!!planError && (
            <Text className="text-[13px] mt-1.5" style={{ color: ERROR_COLOR }} accessibilityLiveRegion="polite">
              {planError}
            </Text>
          )}
        </View>

        {/* ------------------- SERVICES ------------------- */}
        {servicesLoading ? (
          <ServiceCardsSkeleton />
        ) : availableServices.length === 0 ? (
          <View className="mx-4 mb-3 px-5 py-8 bg-white rounded-[20px] items-center">
            <Text className="text-[15px] font-bold text-[#1A1A1A] text-center">
              No plans for {vehiclePhrase} yet
            </Text>
            <Text className="text-[13px] text-[#999] text-center mt-1.5">
              This branch has not added one. Try another vehicle or branch.
            </Text>
          </View>
        ) : (
          <View className="px-4">
            {availableServices.map((s) => {
              const selected = selectedServices.some((x) => x.id === s.id);
              const price = getPriceForVehicle(s);
              const summary = getServiceSummary(s);
              const duration = formatDuration(s.estimatedTime);
              return (
                <AppButton
                  key={s.id}
                  onPress={() => toggleService(s)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  className={`mb-3 rounded-2xl border-2 px-4 py-3.5 ${
                    selected ? 'bg-[#FFFDE7] border-[#F9EF08]' : 'bg-white border-transparent'
                  }`}
                >
                  <View className="flex-row items-start">
                    <SelectIndicator selected={selected} shape="radio" size={22} />
                    <View className="flex-1 ml-3">
                      {/* Duration rides inline after the name (same pattern as the add-on rows) */}
                      <View className="flex-row items-start justify-between">
                        <Text className="flex-1 text-[15px] font-bold text-[#1A1A1A] pr-3">
                          {s.name}
                          {!!duration && (
                            <Text className="text-[12px] font-normal text-[#999]">{`   ${duration}`}</Text>
                          )}
                        </Text>
                        <Text className="text-[15px] font-bold text-[#1A1A1A]">{formatPeso(price)}</Text>
                      </View>
                      {!!summary && (
                        <Text className="text-[13px] leading-[19px] text-[#666] mt-1">{summary}</Text>
                      )}
                    </View>
                  </View>
                </AppButton>
              );
            })}
          </View>
        )}

        {/* ------------------- ADD ONS ------------------- */}
        {/* Hidden entirely for a vehicle with no applicable add-ons */}
        {(addonsLoading || availableAddons.length > 0) && (
          <>
            <SectionHeader title="Add ons" note="Optional" />
            {addonsLoading ? (
              <AddonCardsSkeleton />
            ) : (
              <View className="px-4">
                {visibleAddons.map((a) => {
                  const selected = selectedAddons.some((x) => x.id === a.id);
                  const duration = formatDuration(a.estimatedTime);
                  return (
                    <AppButton
                      key={a.id}
                      onPress={() => toggleAddon(a)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      className={`mb-2.5 rounded-2xl border-2 px-4 py-3 flex-row items-center ${
                        selected ? 'bg-[#FFFDE7] border-[#F9EF08]' : 'bg-white border-transparent'
                      }`}
                    >
                      <SelectIndicator selected={selected} shape="check" size={22} />
                      {/* Duration rides inline after the name so a normal row stays one line */}
                      <Text className="flex-1 text-[14px] font-semibold text-[#1A1A1A] ml-3">
                        {a.name}
                        {!!duration && (
                          <Text className="text-[12px] font-normal text-[#999]">{`   ${duration}`}</Text>
                        )}
                      </Text>
                      <Text className="text-[14px] font-bold text-[#1A1A1A] ml-3">+{formatPeso(a.price)}</Text>
                    </AppButton>
                  );
                })}

                {canCollapseAddons && (addonsExpanded || hiddenAddonCount > 0) && (
                  <AppButton
                    onPress={toggleAddonsExpanded}
                    haptic={false}
                    accessibilityRole="button"
                    className="flex-row items-center justify-center py-3"
                  >
                    <Text className="text-[14px] font-semibold text-[#1A1A1A]">
                      {addonsExpanded ? 'Show less' : `View ${hiddenAddonCount} more`}
                    </Text>
                    <Ionicons
                      name={addonsExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color="#1A1A1A"
                      style={{ marginLeft: 4 }}
                    />
                  </AppButton>
                )}
              </View>
            )}
          </>
        )}

        {/* ------------------- DATE & TIME ------------------- */}
        <SectionHeader title="Select date and time" />

        {!slotsReady ? (
          <DateStripSkeleton />
        ) : bookableDays.length === 0 ? (
          <View className="mx-4 mb-3 px-5 py-8 bg-white rounded-[20px] items-center">
            <Text className="text-[15px] font-bold text-[#1A1A1A] text-center">No open slots right now</Text>
            <Text className="text-[13px] text-[#999] text-center mt-1.5">
              This branch has nothing bookable in the next {MAX_ADVANCE_DAYS} days. Try another branch.
            </Text>
          </View>
        ) : (
          <>
            <Text className="text-[15px] font-semibold text-[#1A1A1A] px-4 mb-3">
              {getDateRangeLabel(bookableDays)}
            </Text>

            {/* Day strip: only bookable days (see bookableDays) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              className="mb-5"
            >
              {bookableDays.map((date) => {
                const isSelected = isSameDay(date, selectedDate);
                return (
                  <AppButton
                    key={date.getTime()}
                    // The [selectedDate] effect recomputes the slot strip - no manual call needed.
                    onPress={() => setSelectedDate(date)}
                    accessibilityState={{ selected: isSelected }}
                    className={`mr-2 items-center justify-center rounded-2xl px-3 py-3 w-16 border-2 ${
                      isSelected ? 'bg-[#FFFDE7] border-[#F9EF08]' : 'bg-white border-transparent'
                    }`}
                  >
                    <Text className={`text-[10px] font-semibold mb-1 ${isSelected ? 'text-[#1A1A1A]' : 'text-[#999]'}`}>
                      {DAY_LABELS[date.getDay()]}
                    </Text>
                    <Text className="text-[18px] font-bold text-[#1A1A1A]">{date.getDate()}</Text>
                  </AppButton>
                );
              })}
            </ScrollView>
          </>
        )}

        <View onLayout={(e) => { sectionY.current.time = e.nativeEvent.layout.y; }}>
        {/* Time slot label */}
        {timeSlots.length > 0 && (
          <Text className="text-[14px] font-semibold text-[#1A1A1A] px-4 mb-2.5">
            Pick a time
          </Text>
        )}
        {!!timeError && (
          <Text
            className={`text-[13px] px-4 mb-2.5 ${timeSlots.length > 0 ? '-mt-1.5' : ''}`}
            style={{ color: ERROR_COLOR }}
            accessibilityLiveRegion="polite"
          >
            {timeError}
          </Text>
        )}

        {/* ------------------- TIMESLOTS ------------------- */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-2"
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {timeSlots.map((t) => {
            const selected = selectedTimeSlot?.time === t.time;
            return (
              <AppButton
                key={t.time}
                onPress={() => setSelectedTimeSlot(t)}
                className={`mr-2 px-4 py-2.5 rounded-xl border-2 ${
                  selected ? 'bg-[#FFFDE7] border-[#F9EF08]' : 'bg-white border-transparent'
                }`}
              >
                <Text className={`text-[13px] ${selected ? 'font-bold text-[#1A1A1A]' : 'font-medium text-[#666]'}`}>
                  {t.time}
                </Text>
              </AppButton>
            );
          })}
        </ScrollView>
        </View>

        {/* ------------------- PAYMENT OPTIONS ------------------- */}
        <View onLayout={(e) => { sectionY.current.payment = e.nativeEvent.layout.y; }}>
        <SectionHeader title="Payment Option" error={paymentError} />
        <View className="px-4">
          {/* Maya - the only integrated payment method. Only the booking fee is paid online. */}
          <AppButton
            onPress={() => setPaymentMethod('Maya')}
            className={`flex-row items-center px-4 py-3.5 rounded-2xl border-2 ${
              paymentMethod === 'Maya' ? 'bg-[#FFFDE7] border-[#F9EF08]' : 'bg-white border-transparent'
            }`}
          >
            <View className="flex-1">
              <Text className="text-[14px] font-semibold text-[#1A1A1A]">Maya</Text>
              <Text className="text-[12px] text-[#999] mt-0.5">
                Pay the {formatPeso(BOOKING_FEE)} booking fee online.
              </Text>
            </View>
            <Image
              source={require('../../../../assets/images/maya_logo.png')}
              style={{ width: 45, height: 14 }}
              resizeMode="contain"
              className="ml-3"
            />
            <View style={{ marginLeft: 12 }}>
              <SelectIndicator selected={paymentMethod === 'Maya'} shape="radio" />
            </View>
          </AppButton>
        </View>
        </View>
      </ScrollView>

      {/* ------------------- STICKY TOTAL BAR ------------------- */}
      <View
        className="bg-white border-t border-[#EDEDED] px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="flex-row items-center">
          <View className="flex-1 pr-3">
            {hasPlan ? (
              <>
                <Text className="text-[20px] font-bold text-[#1A1A1A]">
                  {formatPeso(total)}
                  <Text className="text-[12px] font-normal text-[#6B6B6B]">
                    {`  including ${formatPeso(BOOKING_FEE)} booking fee`}
                  </Text>
                </Text>
              </>
            ) : (
              <Text className="text-[13px] text-[#999]">Pick a plan to get started</Text>
            )}
          </View>
          <AppButton className="bg-[#F9EF08] rounded-2xl px-6 py-3.5" onPress={handleNext}>
            <Text className="text-[15px] font-bold text-[#1A1A1A]">Review booking</Text>
          </AppButton>
        </View>
      </View>

      {AlertComponent}
    </View>
  );
}

// Round mark = "pick one" (plans, payment), rounded-square mark = "pick any" (add-ons). Selected
// is a brand-yellow fill with a dark tick (the tick is what carries the contrast); unselected is
// an empty ring so it still reads as a tappable control on a plain white card.
function SelectIndicator({
  selected,
  shape,
  size = 24,
}: {
  selected: boolean;
  shape: 'radio' | 'check';
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: shape === 'radio' ? size / 2 : 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? '#F9EF08' : 'transparent',
        borderWidth: selected ? 0 : 1.5,
        borderColor: '#D4D4D4',
      }}
    >
      {selected && <Ionicons name="checkmark" size={15} color="#1A1A1A" />}
    </View>
  );
}
