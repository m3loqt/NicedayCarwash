import { StyleSheet, Text, View } from 'react-native';

export default function UserHistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Booking History</Text>
      <Text style={styles.subtitle}>View your past car wash bookings</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
