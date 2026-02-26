import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { getDatabase, onValue, ref } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import BookingFlow from './BookingFlow';

// Verify expo-location is available
if (!Location) {
  console.error('expo-location module failed to load');
}


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

export default function BranchSelection({ onBranchSelect, onNextStep }: { onBranchSelect: (branch: Branch) => void; onNextStep: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [bookingBranch, setBookingBranch] = useState<Branch | null>(null);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const mapRef = useRef(null);

  // helper: get current device location (wrap in promise)
  const getCurrentLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      // Check if Location module is available
      if (!Location || !Location.requestForegroundPermissionsAsync) {
        console.warn('expo-location module not available');
        return null;
      }

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission not granted');
        return null;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (!location || !location.coords) {
        console.warn('Location data invalid');
        return null;
      }

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (e) {
      console.warn('Failed to get device location:', e);
      return null;
    }
  };

  // haversine distance in meters
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

const handleSearch = (q: string) => {
  setSearchQuery(q);

  if (q.trim() === '') {
    setFilteredBranches(branches);
    return;
  }

  setFilteredBranches(
    branches.filter(b =>
      b.name.toLowerCase().includes(q.toLowerCase()) ||
      b.address.toLowerCase().includes(q.toLowerCase())
    )
  );
};


  const getRegion = () => {
  if (!filteredBranches.length) {
    return {
      latitude: 10.3157,
      longitude: 123.8854,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }

  const lats = filteredBranches.map(b => b.coordinates.latitude);
  const lngs = filteredBranches.map(b => b.coordinates.longitude);

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
  // get device location once, then subscribe to branches and compute distances
  let unsub = () => {};
  (async () => {
    const userLoc = await getCurrentLocation();
    console.log('Initial user location fetched:', userLoc);
    setUserLocation(userLoc); // Store user location in state

    const unsubscribe = onValue(branchesRef, snapshot => {
      const list: Branch[] = [];

      snapshot.forEach(branchSnap => {
        const branchId = branchSnap.key;
        const profile = branchSnap.child('profile').val();

        if (profile) {
          // Coerce latitude/longitude to numbers and validate
          const lat = Number(profile.latitude);
          const lng = Number(profile.longitude);

          if (!isFinite(lat) || !isFinite(lng)) {
            // skip branches with invalid coordinates; helps avoid AIRMapMarker errors
            console.warn(`Skipping branch ${branchId} due to invalid coordinates:`, profile.latitude, profile.longitude);
            return;
          }

          // compute distance from user location (if available)
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

      setBranches(list);
      setFilteredBranches(list);
    });

    unsub = () => unsubscribe();
  })();

  return () => unsub();
}, []);



  const handleBranchPress = (branch: Branch) => {
    setSelectedBranch(branch);
    setBookingBranch(branch);
    onBranchSelect(branch);
    setShowBookingFlow(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Progress + header */}
      <View className="bg-white pt-6 pb-3">
        {/* Simple step indicator: step 1 of 3 */}
        <View className="flex-row justify-between items-center px-5 mb-4">
          <View className="w-2 h-2 rounded-full bg-[#F9EF08]" />
          <View className="flex-1 h-[3px] mx-2 bg-[#E5E5E5]" />
          <View className="w-2 h-2 rounded-full bg-[#E5E5E5]" />
          <View className="flex-1 h-[3px] mx-2 bg-[#E5E5E5]" />
          <View className="w-2 h-2 rounded-full bg-[#E5E5E5]" />
        </View>

        <View className="px-5">
          <Text className="text-[20px] font-bold text-[#1A1A1A] mb-1">
            Select branch
          </Text>
        </View>
      </View>

      {/* Map */}
      <View className="relative" style={{ height: height * 0.55 }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          provider={PROVIDER_GOOGLE}
          initialRegion={getRegion()}
          showsUserLocation
          showsMyLocationButton
        >
        {filteredBranches.map((branch) => {
          const lat = Number(branch.coordinates?.latitude);
          const lng = Number(branch.coordinates?.longitude);
          if (!isFinite(lat) || !isFinite(lng)) {
            console.warn('Skipping render of Marker due to invalid coords for branch', branch.id, branch.coordinates);
            return null;
          }

          return (
            <Marker
              key={branch.id}
              coordinate={{ latitude: lat, longitude: lng }}
              onPress={() => handleBranchPress(branch)}
            >
              <View className="items-center">
                <View
                  className="w-12 h-12 rounded-full justify-center items-center border-2 border-white"
                  style={{
                    backgroundColor: '#F9EF08',
                  }}
                >
                  <Ionicons name="location" size={20} color="#1A1A00" />
                </View>
              </View>
            </Marker>
          );
        })}
        </MapView>

        {/* Search Bar Overlay */}
        <View className="absolute top-4 left-4 right-4 flex-row items-center bg-[#FAFAFA] px-3 py-2 rounded-full">
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {filteredBranches.map((branch) => (
            <TouchableOpacity
              key={branch.id}
              className="bg-[#FAFAFA] rounded-2xl px-3 py-5 mx-5 mb-1.5 flex-row items-center"
              activeOpacity={0.8}
              onPress={() => handleBranchPress(branch)}
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
      </View>

      {showBookingFlow && (
        <BookingFlow
          branch={bookingBranch}
          onClose={() => setShowBookingFlow(false)}
        />
      )}
    </SafeAreaView>
  );
}
