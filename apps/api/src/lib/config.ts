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

  // kie.ai — single key powers both copy + images.
  // - Chat is per-model OpenAI-compatible at https://api.kie.ai/{model}/v1
  // - Images use kie.ai's async task pattern at https://api.kie.ai/api/v1/jobs/*
  kieKey: process.env.KIE_API_KEY ?? '',
  kieChatModel: process.env.KIE_CHAT_MODEL ?? 'gpt-5-2',
  kieImageModel: process.env.KIE_IMAGE_MODEL ?? 'flux-2/pro-text-to-image',
  // Veo 3.1 variants: veo3 (flagship) | veo3_fast (light) | veo3_lite (cheapest)
  kieVideoModel: process.env.KIE_VIDEO_MODEL ?? 'veo3_lite',

  emulators: {
    auth: process.env.FIREBASE_AUTH_EMULATOR_HOST,
    firestore: process.env.FIRESTORE_EMULATOR_HOST,
    storage: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
  },

  isEmulator(): boolean {
    return !!process.env.FIRESTORE_EMULATOR_HOST;
  },
};
