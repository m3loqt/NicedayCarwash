import { BranchListSkeleton } from '@/components/ui/user/UserScreenSkeleton';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { getDatabase, onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import BookingFlow from './BookingFlow';
import BranchDetailsModal from './BranchDetailsModal';

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

  const getCurrentLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      if (!Location || !Location.requestForegroundPermissionsAsync) {
        console.warn('expo-location module not available');
        return null;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission not granted');
        return null;
      }
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

  const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371000;
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

  const handleBranchPress = async (branch: Branch) => {
    try {
      const currentUserLoc = userLocation || await getCurrentLocation();
      if (currentUserLoc) {
        setUserLocation(currentUserLoc);
        const distanceMeters = haversineMeters(
          currentUserLoc.latitude,
          currentUserLoc.longitude,
          branch.coordinates.latitude,
          branch.coordinates.longitude
        );
        const updatedBranch = { ...branch, distance: formatDistance(distanceMeters) };
        setSelectedBranch(updatedBranch);
        onBranchSelect?.(updatedBranch);
      } else {
        setSelectedBranch(branch);
        onBranchSelect?.(branch);
      }
    } catch (err) {
      console.error('Error handling branch press', err);
    }
  };

  useEffect(() => {
    const db = getDatabase();
    const branchesRef = ref(db, 'Branches');
    let unsub = () => {};
    (async () => {
      const userLoc = await getCurrentLocation();
      setUserLocation(userLoc);

      const unsubscribe = onValue(branchesRef, snapshot => {
        const list: Branch[] = [];
        snapshot.forEach(branchSnap => {
          const branchId = branchSnap.key;
          const profile = branchSnap.child('profile').val();
          if (profile) {
            const lat = Number(profile.latitude);
            const lng = Number(profile.longitude);
            if (!isFinite(lat) || !isFinite(lng)) return;

            const distanceMeters = userLoc ? haversineMeters(userLoc.latitude, userLoc.longitude, lat, lng) : 0;
            const distanceText = userLoc ? formatDistance(distanceMeters) : '0 km';

            list.push({
              id: branchId ?? '',
              name: profile.name,
              address: profile.address,
              phone: profile.contact_number,
              hours: profile.schedule,
              status: profile.status ?? 'Open',
              distance: distanceText,
              coordinates: { latitude: lat, longitude: lng },
            });
          }
        });
        setBranches(list);
        setFilteredBranches(list);
        setBranchesLoading(false);
      });
      unsub = () => unsubscribe();
    })();
    return () => unsub();
  }, []);

  return (
    <View className="flex-1 bg-[#F5F5F5]">
      <View
        className="flex-row items-center justify-center px-4 pb-4 mt-4 bg-[#F8F8F8] border-b border-[#E0E0E0]"
        style={{ paddingTop: Platform.OS === 'ios' ? 50 : 20 }}
      >
        <Text className="text-lg font-semibold text-[#333]">Choose a Branch</Text>
      </View>

      <View className="px-4 py-3">
        <View className="flex-row items-center bg-white px-3 py-2 rounded-full border border-[#E0E0E0]">
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            className="flex-1 ml-2 text-base text-[#333]"
            placeholder="Search Branches"
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      {branchesLoading ? (
        <BranchListSkeleton />
      ) : (
        <ScrollView className="flex-1 px-4">
            {filteredBranches.map(branch => (
              <TouchableOpacity
                key={branch.id}
                className="bg-white rounded-xl p-4 mb-3 border border-[#E0E0E0]"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                }}
                onPress={() => handleBranchPress(branch)}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="text-base font-semibold text-[#333]">{branch.name}</Text>
                    <Text className="text-sm text-[#666] mt-1">{branch.address}</Text>
                    <View className="flex-row items-center mt-2">
                      <View
                        className="px-2 py-0.5 rounded-full mr-2"
                        style={{ backgroundColor: branch.status === 'Open' ? '#E8F5E9' : '#FFEBEE' }}
                      >
                        <Text
                          className="text-xs font-medium"
                          style={{ color: branch.status === 'Open' ? '#4CAF50' : '#F44336' }}
                        >
                          {branch.status}
                        </Text>
                      </View>
                      <Ionicons name="location-outline" size={14} color="#999" />
                      <Text className="text-xs text-[#999] ml-1">{branch.distance}</Text>
                    </View>
                  </View>
                  <View
                    className="w-10 h-10 rounded-full justify-center items-center"
                    style={{ backgroundColor: selectedBranch?.id === branch.id ? '#4CAF50' : '#FF4444' }}
                  >
                    <Ionicons name="location" size={20} color="white" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            {filteredBranches.length === 0 && (
              <View className="items-center justify-center py-12">
                <Ionicons name="business-outline" size={48} color="#CCC" />
                <Text className="text-[#999] mt-3 text-base">No branches found</Text>
              </View>
            )}
          </ScrollView>
      )}

      <BranchDetailsModal
        visible={!!selectedBranch}
        branch={selectedBranch}
        onClose={() => setSelectedBranch(null)}
        onMakeOrder={() => {
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
