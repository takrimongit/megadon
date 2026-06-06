import admin from 'firebase-admin';

const PROJECT = process.env.GCP_PROJECT!;
const API_KEY = process.env.FIREBASE_API_KEY!;
const BASE_URL = process.env.STAGING_API_URL!.replace(/\/$/, '');

let adminApp: admin.app.App | null = null;
function getAdmin() {
  if (!adminApp) {
    adminApp = admin.apps.length > 0
      ? admin.app()
      : admin.initializeApp({ projectId: PROJECT });
  }
  return adminApp;
}

export interface E2ETestUser {
  uid: string;
  email: string;
  idToken: string;
}

/**
 * Mint an ephemeral test user in real Firebase Auth + return an ID token.
 * The uid is deterministic from the test name so reruns are idempotent.
 */
export async function createTestUser(uniqueSuffix: string): Promise<E2ETestUser> {
  const uid = `e2e_${uniqueSuffix}_${Date.now()}`;
  const email = `${uid}@e2e.adforge.test`;

  await getAdmin().auth().createUser({ uid, email });

  const customToken = await getAdmin().auth().createCustomToken(uid);
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  if (!resp.ok) throw new Error(`Token exchange failed: ${resp.status} ${await resp.text()}`);
  const data = (await resp.json()) as { idToken: string };
  return { uid, email, idToken: data.idToken };
}

export async function deleteTestUser(uid: string): Promise<void> {
  try {
    await getAdmin().auth().deleteUser(uid);
  } catch (e: any) {
    if (e?.code !== 'auth/user-not-found') throw e;
  }
}

/**
 * Delete every workspace owned by a test user (and their nested data).
 * Best-effort — we don't want stale e2e data piling up in real Firestore.
 */
export async function cleanupWorkspaces(uid: string): Promise<void> {
  const db = getAdmin().firestore();
  const snap = await db.collection('workspaces').where('ownerId', '==', uid).get();
  for (const doc of snap.docs) {
    await deleteRecursive(db.doc(doc.ref.path));
  }
}

async function deleteRecursive(ref: FirebaseFirestore.DocumentReference): Promise<void> {
  const subs = await ref.listCollections();
  for (const sub of subs) {
    const subDocs = await sub.get();
    for (const d of subDocs.docs) await deleteRecursive(d.ref);
  }
  await ref.delete();
}

// ============ HTTP helper ============

interface CallOpts {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  idToken?: string;
  workspaceId?: string;
  body?: unknown;
}

export interface CallResponse<T = any> {
  status: number;
  body: { data: T | null; error: { code: string; message: string } | null };
}

export async function httpCall<T = any>(opts: CallOpts): Promise<CallResponse<T>> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (opts.idToken) headers['authorization'] = `Bearer ${opts.idToken}`;
  if (opts.workspaceId) headers['x-workspace-id'] = opts.workspaceId;

  const resp = await fetch(`${BASE_URL}${opts.path}`, {
    method: opts.method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  let parsed: any;
  try {
    parsed = await resp.json();
  } catch {
    parsed = { data: null, error: { code: 'PARSE', message: await resp.text() } };
  }
  return { status: resp.status, body: parsed };
}

export const STAGING_URL = BASE_URL;
