import { StyleSheet, Text, View } from 'react-native';

export default function UserHomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Nice Day Carwash</Text>
      <Text style={styles.subtitle}>Book your car wash service today!</Text>
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
