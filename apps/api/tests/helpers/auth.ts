import admin from 'firebase-admin';

const PROJECT = process.env.GCP_PROJECT!;
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST!;

interface TestUser {
  uid: string;
  email: string;
  idToken: string;
}

/**
 * Create an emulator user and return a verifiable ID token.
 * Uses the emulator's REST endpoint to exchange a custom token for an ID token.
 */
export async function createTestUser(email: string): Promise<TestUser> {
  const uid = `uid_${Math.random().toString(36).slice(2, 10)}`;
  try {
    await admin.auth().createUser({ uid, email });
  } catch (e: any) {
    if (e?.code !== 'auth/uid-already-exists' && e?.code !== 'auth/email-already-exists') throw e;
  }
  const customToken = await admin.auth().createCustomToken(uid);

  // Exchange via the Auth emulator's REST endpoint.
  const url = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  if (!resp.ok) throw new Error(`Auth emulator exchange failed: ${resp.status} ${await resp.text()}`);
  const data = (await resp.json()) as { idToken: string };
  return { uid, email, idToken: data.idToken };
}

/**
 * Wipe Firestore between tests.
 */
export async function clearFirestore() {
  const host = process.env.FIRESTORE_EMULATOR_HOST!;
  const url = `http://${host}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`;
  await fetch(url, { method: 'DELETE' });
}
