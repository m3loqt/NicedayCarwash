import { BranchListSkeleton } from '@/components/ui/user/UserScreenSkeleton';
import { logError, logWarn } from '@/lib/logger';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { get, getDatabase, onValue, ref } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import BookingFlow from './BookingFlow';
import BranchDetailsModal from './BranchDetailsModal';



const { height } = Dimensions.get('window');

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  distance: string;
  status: 'Open' | 'Closed';
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export default function BranchSelection({ onBranchSelect }: { onBranchSelect?: (branch: Branch) => void } = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [bookingBranch, setBookingBranch] = useState<Branch | null>(null);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [branchesLoading, setBranchesLoading] = useState(true);

  const mapRef = useRef(null);

  // Retrieve device's current GPS coordinates
  const getCurrentLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      // Verify expo-location module is available
      if (!Location || !Location.requestForegroundPermissionsAsync) {
        logWarn('BranchSelectionNative.getCurrentLocation', 'expo-location module not available');
        return null;
      }

      // Requesting foreground location permission from user
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        logWarn('BranchSelectionNative.getCurrentLocation', 'Location permission not granted');
        return null;
      }

      // Fetching current device coordinates
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (!location || !location.coords) {
        logWarn('BranchSelectionNative.getCurrentLocation', 'Location data invalid');
        return null;
      }

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (e) {
      logError('BranchSelectionNative.getCurrentLocation', e, { context: 'Failed to get device location' });
      return null;
    }
  };

  // Calculating distance between two coordinates using Haversine formula (returns meters)
  const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371000; // Earth radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDistance = (meters: number) => {
    if (!isFinite(meters) || meters <= 0) return '0 m';
    if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
    return `${Math.round(meters)} m`;
  };

  // Checking if a branch has available timeslots
  const checkBranchHasTimeslots = async (branchId: string): Promise<boolean> => {
    try {
      const db = getDatabase();
      const sanitizePath = (path: string) => path.replace(/[.#$[\]]/g, "");
      const sanitizedBranchId = sanitizePath(branchId);
      
      // Checking if TimeSlots array exists in database
      const timeSlotsRef = ref(db, `Branches/${sanitizedBranchId}/TimeSlots`);
      const timeSlotsSnapshot = await get(timeSlotsRef);
      
      if (timeSlotsSnapshot.exists()) {
        const timeSlotsData = timeSlotsSnapshot.val();
        
        // Checking array format
        if (Array.isArray(timeSlotsData)) {
          const hasAvailableSlot = timeSlotsData.some(
            (slot: any) => slot && slot.time && slot.status === "available"
          );
          if (hasAvailableSlot) return true;
        } else if (typeof timeSlotsData === 'object' && timeSlotsData !== null) {
          // Checking object format
          const hasAvailableSlot = Object.values(timeSlotsData).some(
            (slot: any) => slot && slot.time && slot.status === "available"
          );
          if (hasAvailableSlot) return true;
        }
      }
      
      // Falling back to checking if schedule allows for timeslots to be generated
      const scheduleRef = ref(db, `Branches/${sanitizedBranchId}/profile/schedule`);
      const scheduleSnapshot = await get(scheduleRef);
      
      if (scheduleSnapshot.exists()) {
        const scheduleString = scheduleSnapshot.val();
        const timeMatch = String(scheduleString).match(
          /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/i
        );
        
        if (timeMatch) {
          // Parsing times to check if there's a valid time range
          const parseTimeTo24Hour = (timeStr: string): number => {
            const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (!match) return 8;
            let hour = parseInt(match[1], 10);
            const period = match[3].toUpperCase();
            if (period === "PM" && hour !== 12) hour += 12;
            else if (period === "AM" && hour === 12) hour = 0;
            return hour;
          };
          
          const openHour = parseTimeTo24Hour(`${timeMatch[1]}:${timeMatch[2]} ${timeMatch[3].toUpperCase()}`);
          const closeHour = parseTimeTo24Hour(`${timeMatch[4]}:${timeMatch[5]} ${timeMatch[6].toUpperCase()}`);
          
          // Returning true if there's a valid time range (openHour < closeHour), timeslots can be generated
          return openHour < closeHour;
        }
      }
      
      return false;
    } catch (err) {
      logError('BranchSelectionNative.checkBranchHasTimeslots', err, { context: 'Failed to check timeslots for branch', branchId });
      return false; // Excluding branch on error to be safe
    }
  };

const handleSearch = (q: string) => {
  setSearchQuery(q);
  const query = q.trim().toLowerCase();

  if (!query) {
    setFilteredBranches(branches);
    return;
  }

  const filtered = branches.filter(
    (b) =>
      b.name.toLowerCase().includes(query) ||
      b.address.toLowerCase().includes(query)
  );
  setFilteredBranches(filtered);

  const first = filtered[0];
  if (first && mapRef.current) {
    const lat = Number(first.coordinates.latitude);
    const lng = Number(first.coordinates.longitude);
    if (isFinite(lat) && isFinite(lng)) {
      // @ts-ignore
      mapRef.current.animateToRegion(
        { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        400
      );
    }
  }
};


  const getRegion = () => {
  if (!branches.length) {
    return {
      latitude: 10.3157,
      longitude: 123.8854,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }

  const lats = branches.map(b => b.coordinates.latitude);
  const lngs = branches.map(b => b.coordinates.longitude);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(maxLat - minLat, 0.01) * 1.5,
    longitudeDelta: Math.max(maxLng - minLng, 0.01) * 1.5,
  };
};



  useEffect(() => {
  const db = getDatabase();
  const branchesRef = ref(db, 'Branches');
  // Fetching user location once, then subscribing to branch updates and calculating distances
  let unsub = () => {};
  (async () => {
    const userLoc = await getCurrentLocation();
    setUserLocation(userLoc);

    const unsubscribe = onValue(branchesRef, async (snapshot) => {
      const list: Branch[] = [];
      const branchPromises: Promise<void>[] = [];

      snapshot.forEach(branchSnap => {
        const branchId = branchSnap.key;
        const profile = branchSnap.child('profile').val();

        if (profile) {
          // Converting coordinates to numbers and validating they are finite
          const lat = Number(profile.latitude);
          const lng = Number(profile.longitude);

          if (!isFinite(lat) || !isFinite(lng)) {
            // Skipping branches with invalid coordinates to prevent map rendering errors
            logWarn('BranchSelectionNative.branchesListener', 'Skipping branch due to invalid coordinates', { branchId });
            return;
          }

          // Checking if branch has available timeslots before adding to list
          const branchPromise = checkBranchHasTimeslots(branchId ?? '').then(hasTimeslots => {
            if (hasTimeslots) {
              // Calculating distance from user's location to branch (0 if location unavailable)
              const distanceMeters = userLoc ? haversineMeters(userLoc.latitude, userLoc.longitude, lat, lng) : 0;
              const distanceText = userLoc ? formatDistance(distanceMeters) : '0 km';

              list.push({
                id: branchId ?? '',
                name: profile.name,
                address: profile.address,
                phone: profile.contact_number,
                hours: profile.schedule,
                status: profile.status ?? 'Open', // optional
                distance: distanceText,
                coordinates: {
                  latitude: lat,
                  longitude: lng,
                },
              });
            }
          });

          branchPromises.push(branchPromise);
        }
      });

      // Waiting for all timeslot checks to complete
      await Promise.all(branchPromises);

      setBranches(list);
      setFilteredBranches(list);
      setBranchesLoading(false);
    });

    unsub = () => unsubscribe();
  })();

  return () => unsub();
}, []);

  const handleMarkerPress = (branch: Branch) => {
    setSelectedBranch(branch);
    setBookingBranch(branch);
  };

  const handleListPress = (branch: Branch) => {
    setBookingBranch(branch);
    onBranchSelect?.(branch);
    setShowBookingFlow(true);
  };

  const handleSelectBranch = () => {
    if (!bookingBranch) return;
    onBranchSelect?.(bookingBranch);
    setShowBookingFlow(true);
    setSelectedBranch(null);
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header + segmented progress line */}
      <View className="bg-white pt-4 pb-0">
        {/* Title row */}
        <View className="px-5 flex-row items-center mb-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <Text className="text-[20px] font-bold text-[#1A1A1A] mb-1">
            Select branch
          </Text>
        </View>

        {/* Segmented progress line at bottom edge of header */}
        <View className="flex-row w-full h-[2px]">
          <View className="flex-1 bg-[#E5E5E5]" />
          <View className="flex-1 bg-[#E5E5E5]" />
          <View className="flex-1 bg-[#E5E5E5]" />
        </View>
      </View>

      {/* Map */}
      <View className="relative" style={{ height: height * 0.5 }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          provider={PROVIDER_GOOGLE}
          initialRegion={getRegion()}
          showsUserLocation
          showsMyLocationButton
        >
        {branches.map((branch) => {
          const lat = Number(branch.coordinates?.latitude);
          const lng = Number(branch.coordinates?.longitude);
          if (!isFinite(lat) || !isFinite(lng)) {
            logWarn('BranchSelectionNative.renderMarker', 'Skipping render of marker due to invalid coordinates', { branchId: branch.id });
            return null;
          }

          return (
            <Marker
              key={branch.id}
              coordinate={{ latitude: lat, longitude: lng }}
              onPress={() => handleMarkerPress(branch)}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image
                  source={require('../../../../assets/images/nd_appicon.png')}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                  }}
                  resizeMode="cover"
                />
              </View>
            </Marker>
          );
        })}
        </MapView>

        {/* Search Bar Overlay */}
        <View className="absolute top-4 left-4 right-4 flex-row items-center bg-[#FAFAFA] border border-[#EEEEEE] px-3 py-2 rounded-full">
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            className="flex-1 ml-2 text-[14px] text-[#333]"
            placeholder="Search branches"
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      {/* Branch cards */}
      <View className="flex-1 pt-4">
        {branchesLoading ? (
          <BranchListSkeleton />
        ) : (
          <>
            <View className="px-5 mb-2">
              <Text className="text-[15px] font-semibold text-[#1A1A1A]">
                Available branches near you
              </Text>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {filteredBranches.map((branch) => (
                <TouchableOpacity
                  key={branch.id}
                  className="bg-[#FAFAFA] rounded-2xl px-3 py-5 mx-5 mb-1.5 flex-row items-center"
                  activeOpacity={0.8}
                  onPress={() => handleListPress(branch)}
                >
                  <View className="w-[60px] h-[60px] rounded-xl overflow-hidden bg-white mr-4">
                    <Image
                      source={require('../../../../assets/images/branch1.jpg')}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[16px] font-bold text-[#1A1A1A]" numberOfLines={1}>
                      {branch.name}
                    </Text>
                    <Text className="text-[13px] text-[#999] mt-0.5" numberOfLines={1}>
                      {branch.address}
                    </Text>
                    <Text className="text-[12px] text-[#BDBDBD] mt-0.5">
                      {branch.distance}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#BDBDBD" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      </View>

      {/* Branch details bottom sheet */}
      <BranchDetailsModal
        visible={!!selectedBranch}
        branch={selectedBranch}
        onClose={() => setSelectedBranch(null)}
        onMakeOrder={handleSelectBranch}
      />

      {showBookingFlow && bookingBranch && (
        <BookingFlow
          branch={bookingBranch}
          onClose={() => {
            setShowBookingFlow(false);
            setBookingBranch(null);
          }}
        />
      )}
    </View>
  );
}
