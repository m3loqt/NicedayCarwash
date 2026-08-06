import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getReactNativePersistence,
  initializeAuth
} from "firebase/auth";
import { connectDatabaseEmulator, getDatabase } from "firebase/database";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { Platform } from "react-native";
import { initializeFirebaseAppCheck } from "./appCheck";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
void initializeFirebaseAppCheck(app);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getDatabase(app);

// Opt-in local Firebase Emulator Suite connection - OFF by default so normal dev/testing keeps
// hitting live data as it always has. Only activates with EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true.
// Android's emulator can't reach the host machine via "localhost" - 10.0.2.2 is its host-loopback alias.
if (process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
  const emulatorHost = Platform.OS === "android" ? "10.0.2.2" : "localhost";
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  connectDatabaseEmulator(db, emulatorHost, 9000);
  connectFunctionsEmulator(getFunctions(app), emulatorHost, 5001);
}
