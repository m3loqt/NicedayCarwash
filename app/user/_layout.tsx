import { Stack } from 'expo-router';

export default function UserLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="add-vehicle" 
        options={{ 
          headerShown: false,
          presentation: 'modal'
        }} 
      />
      <Stack.Screen 
        name="edit-vehicle" 
        options={{ 
          headerShown: false,
          presentation: 'modal'
        }} 
      />
      <Stack.Screen 
        name="edit-profile" 
        options={{ 
          headerShown: false,
          presentation: 'modal'
        }} 
      />
      <Stack.Screen
        name="booking-success"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="booking-progress"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="cancelled-bookings"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="payment"
        options={{
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
