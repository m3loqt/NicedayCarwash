import { logWarn } from '@/lib/logger';
import * as Location from 'expo-location';

export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    if (!Location || !Location.requestForegroundPermissionsAsync) {
      logWarn('location.getCurrentLocation', 'expo-location module not available');
      return null;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      logWarn('location.getCurrentLocation', 'Location permission not granted');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    if (!location || !location.coords) {
      logWarn('location.getCurrentLocation', 'Location data invalid');
      return null;
    }

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (e) {
    // No fix available - GPS off, no signal, location services disabled, or an emulator with
    // no location set. All expected; callers already fall back to a no-location experience, so
    // this is a warning, not an error (an ERROR here also trips the dev-mode red LogBox).
    logWarn('location.getCurrentLocation', 'Could not get a device location fix', {
      code: (e as { code?: string })?.code,
    });
    return null;
  }
}

// Haversine formula - returns distance in meters between two coordinates.
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(meters: number): string {
  if (!isFinite(meters) || meters <= 0) return '0 m';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}
