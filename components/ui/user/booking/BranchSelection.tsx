import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRef, useState } from 'react';
import {
    Dimensions,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

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

interface BranchSelectionProps {
  onBranchSelect: (branch: Branch) => void;
  onNextStep: () => void;
}

const sampleBranches: Branch[] = [
  {
    id: '1',
    name: 'P. Mabolo',
    address: 'Branch 1, Cebu City',
    phone: '+63 912 345 6789',
    hours: 'Mon-Fri: 8:00 AM - 5:00 PM',
    distance: '58.60 km',
    status: 'Open',
    coordinates: {
      latitude: 10.3157,
      longitude: 123.8854,
    },
  },
  {
    id: '2',
    name: 'Ayala Center Cebu',
    address: 'Branch 2, Cebu City',
    phone: '+63 912 345 6790',
    hours: 'Mon-Sun: 9:00 AM - 9:00 PM',
    distance: '45.20 km',
    status: 'Open',
    coordinates: {
      latitude: 10.3157,
      longitude: 123.9154,
    },
  },
  {
    id: '3',
    name: 'SM City Cebu',
    address: 'Branch 3, Cebu City',
    phone: '+63 912 345 6791',
    hours: 'Mon-Sun: 10:00 AM - 10:00 PM',
    distance: '52.10 km',
    status: 'Open',
    coordinates: {
      latitude: 10.3057,
      longitude: 123.9054,
    },
  },
];

export default function BranchSelection({ onBranchSelect, onNextStep }: BranchSelectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>(sampleBranches);
  const mapRef = useRef<MapView>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredBranches(sampleBranches);
    } else {
      const filtered = sampleBranches.filter(branch =>
        branch.name.toLowerCase().includes(query.toLowerCase()) ||
        branch.address.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredBranches(filtered);
    }
  };

  const handleMarkerPress = (branch: Branch) => {
    setSelectedBranch(branch);
    onBranchSelect(branch);
  };

  const handleMakeOrder = () => {
    if (selectedBranch) {
      onNextStep();
    }
  };

  const getRegion = () => {
    if (filteredBranches.length === 0) {
      return {
        latitude: 10.3157,
        longitude: 123.8854,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }

    const latitudes = filteredBranches.map(b => b.coordinates.latitude);
    const longitudes = filteredBranches.map(b => b.coordinates.longitude);
    
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat, 0.01) * 1.5,
      longitudeDelta: Math.max(maxLng - minLng, 0.01) * 1.5,
    };
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose a Branch</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Branches"
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={getRegion()}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {filteredBranches.map((branch) => (
          <Marker
            key={branch.id}
            coordinate={branch.coordinates}
            onPress={() => handleMarkerPress(branch)}
          >
            <View style={styles.markerContainer}>
              <View style={[
                styles.marker,
                selectedBranch?.id === branch.id && styles.selectedMarker
              ]}>
                <Ionicons name="location" size={20} color="white" />
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Branch Details Modal */}
      <Modal
        visible={selectedBranch !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedBranch(null)}
      >
        <BlurView intensity={20} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedBranch && (
              <>
                <View style={styles.branchHeader}>
                  <View style={styles.branchInfo}>
                    <Text style={styles.branchName}>{selectedBranch.name}</Text>
                    <View style={styles.statusContainer}>
                      <Text style={[
                        styles.status,
                        selectedBranch.status === 'Open' ? styles.openStatus : styles.closedStatus
                      ]}>
                        {selectedBranch.status}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.branchDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="business" size={16} color="#666" />
                    <Text style={styles.detailText}>{selectedBranch.address}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="location" size={16} color="#666" />
                    <Text style={styles.detailText}>{selectedBranch.distance}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="call" size={16} color="#666" />
                    <Text style={styles.detailText}>{selectedBranch.phone}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="time" size={16} color="#666" />
                    <Text style={styles.detailText}>{selectedBranch.hours}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.orderButton}
                  onPress={handleMakeOrder}
                >
                  <Text style={styles.orderButtonText}>Make an Order</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </BlurView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: '#F8F8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    backgroundColor: '#FF4444',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedMarker: {
    backgroundColor: '#4CAF50',
    transform: [{ scale: 1.2 }],
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: height * 0.6,
  },
  branchHeader: {
    marginBottom: 16,
  },
  branchInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  branchName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusContainer: {
    marginLeft: 12,
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  openStatus: {
    color: '#FFA726',
    backgroundColor: '#FFF3E0',
  },
  closedStatus: {
    color: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  branchDetails: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  orderButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  orderButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});


