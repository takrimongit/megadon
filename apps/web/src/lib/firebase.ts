import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
let currentWorkspaceId: string | null = null;

export function initFirebase() {
  app = getApps()[0] ?? initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
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
  if (id) localStorage.setItem('adforge.workspaceId', id);
  else localStorage.removeItem('adforge.workspaceId');
}

export function getWorkspaceId(): string | null {
  return currentWorkspaceId ?? localStorage.getItem('adforge.workspaceId');
}
