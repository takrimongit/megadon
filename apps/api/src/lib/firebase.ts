import admin from 'firebase-admin';
import { config } from './config.js';

let initialized = false;

export function initFirebase(): admin.app.App {
  if (initialized) return admin.app();
  admin.initializeApp({
    projectId: config.gcpProject,
    storageBucket: config.storageBucket,
  });
  initialized = true;
  return admin.app();
}

export const db = () => admin.firestore();
export const auth = () => admin.auth();
export const bucket = () => admin.storage().bucket();

export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;
