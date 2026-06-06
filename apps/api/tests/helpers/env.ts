// Set emulator env BEFORE firebase-admin gets imported anywhere.
process.env.NODE_ENV = 'test';
process.env.ROLE = 'api';
process.env.GCP_PROJECT = 'megadon-test';
process.env.GOOGLE_CLOUD_PROJECT = 'megadon-test';
process.env.STORAGE_BUCKET = 'megadon-test.appspot.com';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? 'localhost:9099';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8081';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? 'localhost:9199';
process.env.PORT = '0';
process.env.WORKER_URL = 'http://localhost:0';
// Provider keys: not required; we mock the OpenAI module per-test.
process.env.KIE_API_KEY = 'test-key';
process.env.KIE_BASE_URL = 'http://localhost:0/mock';
process.env.KIE_MODEL = 'gpt-4o-mini';
