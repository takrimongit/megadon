export const config = {
  env: process.env.NODE_ENV ?? 'development',
  role: (process.env.ROLE ?? 'api') as 'api' | 'worker',
  port: parseInt(process.env.PORT ?? '8080', 10),

  gcpProject: process.env.GCP_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? 'megadon-dev',
  gcpRegion: process.env.GCP_REGION ?? 'us-central1',

  storageBucket: process.env.STORAGE_BUCKET ?? 'megadon-dev.appspot.com',

  cloudTasksQueue: process.env.CLOUD_TASKS_QUEUE ?? 'ad-generation',
  workerUrl: process.env.WORKER_URL ?? 'http://localhost:8080',
  tasksInvokerSA: process.env.TASKS_INVOKER_SA ?? '',

  // kie.ai — OpenAI-compatible AI gateway. https://kie.ai
  // Single key powers both chat (copy + personas) and images (ad creatives).
  kieKey: process.env.KIE_API_KEY ?? '',
  kieBaseUrl: process.env.KIE_BASE_URL ?? 'https://api.kie.ai/v1',
  kieModel: process.env.KIE_MODEL ?? 'gpt-4o-mini',
  kieImageModel: process.env.KIE_IMAGE_MODEL ?? 'flux-schnell',

  emulators: {
    auth: process.env.FIREBASE_AUTH_EMULATOR_HOST,
    firestore: process.env.FIRESTORE_EMULATOR_HOST,
    storage: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
  },

  isEmulator(): boolean {
    return !!process.env.FIRESTORE_EMULATOR_HOST;
  },
};
