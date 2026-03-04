import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="edit-profile" 
        options={{ 
          headerShown: false 
        }} 
      />
    </Stack>
  );
}
