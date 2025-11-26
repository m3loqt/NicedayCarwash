import { StyleSheet, Text, View } from 'react-native';

export default function AdminCustomersScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Customer Management</Text>
      <Text style={styles.subtitle}>View and manage customer information</Text>
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
