import { BranchListSkeleton } from '@/components/ui/user/UserScreenSkeleton';
import { formatDistance, getCurrentLocation, haversineMeters } from '@/lib/location';
import { logError, logWarn } from '@/lib/logger';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { getDatabase, onValue, ref } from 'firebase/database';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

// Below this latitudeDelta, branch pins have enough room to show their name label
// without overlapping neighbors into unreadable clutter when zoomed out.
const LABEL_ZOOM_DELTA_THRESHOLD = 0.08;

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

interface BranchSelectionProps {
  onBranchSelect?: (branch: Branch) => void;
  initialQuery?: string;
  // A value that changes on every navigation even when initialQuery repeats (e.g. tapping the
  // same branch card twice in a row) - see the effect below for why initialQuery alone can't be
  // used to detect a fresh request.
  initialQueryNonce?: string;
}

export default function BranchSelection({ onBranchSelect, initialQuery, initialQueryNonce }: BranchSelectionProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [bookingBranch, setBookingBranch] = useState<Branch | null>(null);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [showPinLabels, setShowPinLabels] = useState(false);

  const mapRef = useRef(null);
  const searchAnimTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnimatedBranchId = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (searchAnimTimeout.current) clearTimeout(searchAnimTimeout.current);
    };
  }, []);

  // Checking if a branch has available timeslots - takes data already present in the single
  // `Branches` snapshot the listener below reads (TimeSlots and profile.schedule are both
  // children of Branches/{branchId}, already fetched in full). Previously this issued two more
  // get() round-trips PER BRANCH and blocked the whole list behind Promise.all(N branches) -
  // synchronous here means the list now renders as soon as that one snapshot arrives.
  const branchHasTimeslots = (timeSlotsData: unknown, scheduleString: unknown): boolean => {
    try {
      if (timeSlotsData) {
        if (Array.isArray(timeSlotsData)) {
          const hasAvailableSlot = timeSlotsData.some(
            (slot: any) => slot && slot.time && slot.status === "available"
          );
          if (hasAvailableSlot) return true;
        } else if (typeof timeSlotsData === 'object') {
          const hasAvailableSlot = Object.values(timeSlotsData).some(
            (slot: any) => slot && slot.time && slot.status === "available"
          );
          if (hasAvailableSlot) return true;
        }
      }

      // Falling back to checking if schedule allows for timeslots to be generated
      if (scheduleString) {
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
      logError('BranchSelectionNative.branchHasTimeslots', err, { context: 'Failed to evaluate timeslots for branch' });
      return false; // Excluding branch on error to be safe
    }
  };

const handleSearch = (q: string) => {
  setSearchQuery(q);
  const query = q.trim().toLowerCase();

  const filtered = query
    ? branches.filter(
        (b) =>
          b.name.toLowerCase().includes(query) ||
          b.address.toLowerCase().includes(query)
      )
    : branches;
  setFilteredBranches(filtered);

  if (searchAnimTimeout.current) clearTimeout(searchAnimTimeout.current);

  const first = filtered[0];
  if (!first) {
    lastAnimatedBranchId.current = null;
    return;
  }

  // Debouncing the camera move so rapid typing doesn't cancel and restart the
  // animation on every keystroke - that's what made it look like an instant jump.
  searchAnimTimeout.current = setTimeout(() => {
    if (first.id === lastAnimatedBranchId.current || !mapRef.current) return;
    lastAnimatedBranchId.current = first.id;

    const lat = Number(first.coordinates.latitude);
    const lng = Number(first.coordinates.longitude);
    if (isFinite(lat) && isFinite(lng)) {
      // @ts-ignore
      mapRef.current.animateToRegion(
        { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        600
      );
    }
  }, 350);
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



  // Runs independently of the branches fetch below - awaiting location first (as this used to)
  // meant the whole screen sat on a loading skeleton for however long GPS took to get a fix,
  // even though the branch list itself was ready almost instantly.
  useEffect(() => {
    getCurrentLocation().then(setUserLocation);
  }, []);

  useEffect(() => {
    const db = getDatabase();
    const branchesRef = ref(db, 'Branches');

    const unsubscribe = onValue(branchesRef, (snapshot) => {
      const list: Branch[] = [];

      snapshot.forEach(branchSnap => {
        const branchId = branchSnap.key;
        const profile = branchSnap.child('profile').val();

        if (profile && !profile.archivedAt) {
          // Converting coordinates to numbers and validating they are finite
          const lat = Number(profile.latitude);
          const lng = Number(profile.longitude);

          if (!isFinite(lat) || !isFinite(lng)) {
            // Skipping branches with invalid coordinates to prevent map rendering errors
            logWarn('BranchSelectionNative.branchesListener', 'Skipping branch due to invalid coordinates', { branchId });
            return;
          }

          const timeSlotsData = branchSnap.child('TimeSlots').val();
          if (branchHasTimeslots(timeSlotsData, profile.schedule)) {
            list.push({
              id: branchId ?? '',
              name: profile.name,
              address: profile.address,
              phone: profile.contact_number,
              hours: profile.schedule,
              status: profile.status ?? 'Open', // optional
              coordinates: {
                latitude: lat,
                longitude: lng,
              },
              imageUrl: typeof profile.imageUrl === 'string' ? profile.imageUrl : undefined,
            });
          }
        }
      });

      setBranches(list);
      setFilteredBranches(list);
      setBranchesLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Seeds the search field (and its existing filter/map-animate behavior) from a branch name
  // picked in the home screen's search dropdown or a "Branches near you" card - applied once per
  // distinct navigation, only after branches have actually loaded, since handleSearch filters
  // over `branches` and would otherwise run against an empty list and then get clobbered when
  // the real list arrives a moment later. Keyed off initialQueryNonce (not initialQuery itself) -
  // this screen is a tab that stays mounted, so tapping the SAME branch card twice in a row sends
  // the identical `q` string both times, which React's dependency check would treat as "nothing
  // changed" and never re-run this effect at all; the nonce changes on every tap regardless of
  // which branch was picked, so it's what actually detects "this is a new request". When the name
  // matches a branch exactly (both call sites always pass the real branch.name, never free-typed
  // text), the user already told us which branch they want, so this skips straight to
  // BookingFlow instead of making them tap it again on this screen.
  const appliedInitialQueryNonce = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!initialQuery || branchesLoading || appliedInitialQueryNonce.current === (initialQueryNonce ?? initialQuery)) return;
    appliedInitialQueryNonce.current = initialQueryNonce ?? initialQuery;
    handleSearch(initialQuery);

    const exactMatch = branches.find((b) => b.name === initialQuery);
    if (exactMatch) {
      handleListPress(exactMatch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, initialQueryNonce, branchesLoading]);

  const handleMarkerPress = (branch: Branch) => {
    setSelectedBranch(branch);
    setBookingBranch(branch);

    const lat = Number(branch.coordinates.latitude);
    const lng = Number(branch.coordinates.longitude);
    if (mapRef.current && isFinite(lat) && isFinite(lng)) {
      // @ts-ignore
      mapRef.current.animateToRegion(
        { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        600
      );
    }
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

  // Sorted nearest-first once location is available - computed here (not baked into the branch
  // list itself) so it stays correct regardless of whether location or the branch data resolves
  // first, and re-sorts automatically if either updates later.
  const sortedFilteredBranches = useMemo(() => {
    if (!userLocation) return filteredBranches;
    return [...filteredBranches].sort((a, b) => {
      const distA = haversineMeters(userLocation.latitude, userLocation.longitude, a.coordinates.latitude, a.coordinates.longitude);
      const distB = haversineMeters(userLocation.latitude, userLocation.longitude, b.coordinates.latitude, b.coordinates.longitude);
      return distA - distB;
    });
  }, [filteredBranches, userLocation]);

  return (
    <View className="flex-1 bg-[#FAFAFA]">
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

      {/* Map - expands to fill the space the branch list leaves behind while it's
          hidden for the details sheet, instead of leaving that space empty */}
      <View className="relative" style={selectedBranch ? { flex: 1 } : { height: height * 0.5 }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          provider={PROVIDER_GOOGLE}
          initialRegion={getRegion()}
          onRegionChangeComplete={(region) => setShowPinLabels(region.latitudeDelta < LABEL_ZOOM_DELTA_THRESHOLD)}
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

          const iconBoxWidth = 32;

          // Icon-only when zoomed out - packed-together pins would otherwise overlap
          // their labels into unreadable clutter, and the label's extra width would
          // also widen the marker's tap target into neighboring pins.
          if (!showPinLabels) {
            return (
              <Marker
                key={branch.id}
                coordinate={{ latitude: lat, longitude: lng }}
                onPress={() => handleMarkerPress(branch)}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View
                  style={{
                    width: iconBoxWidth,
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
          }

          // react-native-maps rasterizes custom marker content on Android bound to its
          // measured box, so absolutely-positioned overflow gets clipped - the label needs
          // real layout space, with `anchor` compensating so the pin still sits on the coordinate.
          const markerWidth = 190;

          return (
            <Marker
              key={branch.id}
              coordinate={{ latitude: lat, longitude: lng }}
              onPress={() => handleMarkerPress(branch)}
              anchor={{ x: (iconBoxWidth / 2) / markerWidth, y: 0.5 }}
            >
              <View
                collapsable={false}
                style={{
                  width: markerWidth,
                  height: 32,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    width: iconBoxWidth,
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
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  allowFontScaling={false}
                  style={{
                    marginLeft: 4,
                    // Fixed (not max) width - `maxWidth` needs Android to measure the text's
                    // intrinsic content size, which was racing with react-native-maps' marker
                    // snapshot and rendering the label at ~0 width. Font scaling disabled too,
                    // since otherwise the device's system text-scale setting would make the
                    // actual rendered glyph size (and thus what needs to fit this fixed box)
                    // unpredictable at measurement time.
                    width: markerWidth - iconBoxWidth - 4,
                    fontSize: 11,
                    fontWeight: '700',
                    color: '#1A1A1A',
                    textShadowColor: 'rgba(255,255,255,0.9)',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 3,
                  }}
                >
                  {branch.name}
                </Text>
              </View>
            </Marker>
          );
        })}
        </MapView>

        {branchesLoading && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#FAFAFA',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ActivityIndicator size="small" color="#1A1A1A" />
          </View>
        )}

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

      {/* Branch cards - hidden while the branch details sheet is open so it can't peek out above it */}
      <View className="flex-1 pt-4" style={{ display: selectedBranch ? 'none' : 'flex' }}>
        {branchesLoading ? (
          <BranchListSkeleton />
        ) : (
          <>
            <View className="px-5 mb-2">
              <Text className="text-[15px] font-semibold text-[#1A1A1A]">
                Available branches near you
              </Text>
            </View>
            <View className="flex-1">
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
              >
                {sortedFilteredBranches.map((branch) => {
                  const distanceText = userLocation
                    ? formatDistance(
                        haversineMeters(userLocation.latitude, userLocation.longitude, branch.coordinates.latitude, branch.coordinates.longitude)
                      )
                    : null;
                  return (
                    <TouchableOpacity
                      key={branch.id}
                      className="bg-white rounded-2xl px-3 py-5 mx-5 mb-1.5 flex-row items-center"
                      activeOpacity={0.8}
                      onPress={() => handleListPress(branch)}
                    >
                      <View className="w-[60px] h-[60px] rounded-xl overflow-hidden bg-white mr-4">
                        <Image
                          source={branch.imageUrl ? { uri: branch.imageUrl } : require('../../../../assets/images/branch1.jpg')}
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
                        {distanceText && (
                          <Text className="text-[12px] text-[#BDBDBD] mt-0.5">{distanceText}</Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#BDBDBD" />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {/* Fades list content into the floating tab bar instead of cutting it off abruptly */}
              <LinearGradient
                colors={['rgba(250,250,250,0)', 'rgba(250,250,250,0.85)', '#FAFAFA']}
                locations={[0, 0.5, 1]}
                pointerEvents="none"
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 110 }}
              />
            </View>
          </>
        )}
      </View>

      {/* Branch details bottom sheet */}
      <BranchDetailsModal
        visible={!!selectedBranch}
        branch={selectedBranch}
        distanceText={
          userLocation && selectedBranch
            ? formatDistance(
                haversineMeters(userLocation.latitude, userLocation.longitude, selectedBranch.coordinates.latitude, selectedBranch.coordinates.longitude)
              )
            : null
        }
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
