import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { getDatabase, onValue, ref } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Platform,
  Text,
  TextInput,
  View
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import BookingFlow from './BookingFlow';
import BranchDetailsModal from './BranchDetailsModal';

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



  return (
    <View className="flex-1 bg-[#F5F5F5]">

      {/* Header */}
      <View
        className="flex-row items-center justify-center px-4 pb-4 mt-4 bg-[#F8F8F8] border-b border-[#E0E0E0]"
        style={{ paddingTop: Platform.OS === 'ios' ? 50 : 20 }}
      >
        <Text className="text-lg font-semibold text-[#333]">Choose a Branch</Text>
      </View>

      {/* Map */}
      <View className="flex-1 relative">
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
              onPress={async () => {
                if (!isFinite(lat) || !isFinite(lng)) {
                  console.warn('Marker pressed but coords invalid for', branch.id);
                  return;
                }
                try {
                  console.log('Marker pressed:', branch.id);
                  // Recalculate distance using current user location
                  const currentUserLoc = userLocation || await getCurrentLocation();
                  console.log('Current user location:', currentUserLoc);
                  console.log('Branch coordinates:', { lat, lng });
                  
                  if (currentUserLoc) {
                    setUserLocation(currentUserLoc); // Update stored location
                    const distanceMeters = haversineMeters(
                      currentUserLoc.latitude,
                      currentUserLoc.longitude,
                      lat,
                      lng
                    );
                    console.log('Calculated distance (meters):', distanceMeters);
                    const distanceText = formatDistance(distanceMeters);
                    console.log('Formatted distance:', distanceText);
                    
                    const updatedBranch = {
                      ...branch,
                      distance: distanceText,
                    };
                    setSelectedBranch(updatedBranch);
                    if (onBranchSelect) onBranchSelect(updatedBranch);
                  } else {
                    console.warn('Location unavailable, using branch distance as-is:', branch.distance);
                    // If location unavailable, use branch as-is
                    setSelectedBranch(branch);
                    if (onBranchSelect) onBranchSelect(branch);
                  }
                } catch (err) {
                  console.error('Error handling marker press', err);
                }
              }}
            >
              <View className="items-center">
                <View
                  className="w-10 h-10 rounded-full justify-center items-center border-4 border-white"
                  style={{
                    backgroundColor: selectedBranch?.id === branch.id ? '#4CAF50' : '#FF4444',
                    transform: selectedBranch?.id === branch.id ? [{ scale: 1.2 }] : [],
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                  }}
                >
                  <Ionicons name="location" size={20} color="white" />
                </View>
              </View>
            </Marker>
          );
        })}
        </MapView>

        {/* Search Bar Overlay */}
        <View className="absolute top-4 left-4 right-4 flex-row items-center bg-white px-3 py-2 rounded-full border border-[#E0E0E0]">
          <Ionicons name="search" size={20} color="#666" className="mr-2" />
          <TextInput
            className="flex-1 text-base text-[#333]"
            placeholder="Search Branches"
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      {/* Branch Details Modal */}
      <BranchDetailsModal
        visible={!!selectedBranch}
        branch={selectedBranch}
        onClose={() => setSelectedBranch(null)}
        onMakeOrder={() => {
          // close details modal and open booking flow
          setBookingBranch(selectedBranch);
          setSelectedBranch(null);
          setShowBookingFlow(true);
        }}
      />

      {showBookingFlow && (
        <BookingFlow
          branch={bookingBranch}
          onClose={() => setShowBookingFlow(false)}
        />
      )}
    </View>
  );
}
