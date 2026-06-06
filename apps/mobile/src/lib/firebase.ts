import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  connectAuthEmulator,
  type Auth,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
let currentWorkspaceId: string | null = null;

export function initFirebase() {
  if (getApps().length > 0) {
    app = getApps()[0];
  } else {
    app = initializeApp(firebaseConfig);
  }

  try {
    authInstance = getAuth(app);
  } catch {
    authInstance = initializeAuth(app);
  }
  dbInstance = getFirestore(app);

  if (process.env.EXPO_PUBLIC_USE_EMULATOR === 'true') {
    const host = process.env.EXPO_PUBLIC_EMULATOR_HOST ?? 'localhost';
    connectAuthEmulator(authInstance, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(dbInstance, host, 8081);
  }
}

export function getAuthInstance(): Auth {
  if (!authInstance) initFirebase();
  return authInstance;
}

export function getDb(): Firestore {
  if (!dbInstance) initFirebase();
  return dbInstance;
}

export async function getAuthToken(): Promise<string | null> {
  const user = getAuthInstance().currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export function setWorkspaceId(id: string | null) {
  currentWorkspaceId = id;
}
export function getWorkspaceId(): string | null {
  return currentWorkspaceId;
}
