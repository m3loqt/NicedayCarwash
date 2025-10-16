import { StyleSheet, Text, View } from 'react-native';

export default function UserBookScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Book a Service</Text>
      <Text style={styles.subtitle}>Choose your car wash service</Text>
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
