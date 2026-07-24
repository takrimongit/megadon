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
  // Image ad model for the classic COMPOSITE path: a text-free background that
  // the worker composites the headline/CTA/logo onto.
  kieImageModel: process.env.KIE_IMAGE_MODEL ?? 'flux-2/pro-text-to-image',
  // DESIGNED mode: a text-native model renders the whole ad (integrated
  // typography + layout) and we skip compositing. nano-banana-2 (Gemini 3.1
  // Flash Image) has strong, accurate text rendering. Set KIE_IMAGE_DESIGNED=false
  // to fall back to the composite pipeline (flux + overlay).
  kieImageDesigned: (process.env.KIE_IMAGE_DESIGNED ?? 'true') === 'true',
  kieDesignedImageModel: process.env.KIE_DESIGNED_IMAGE_MODEL ?? 'nano-banana-2',
  // Veo 3.1 variants: veo3 (Quality) | veo3_fast (Fast, balanced) | veo3_lite (cheapest).
  // Default is Fast — noticeably richer b-roll than lite with native audio.
  kieVideoModel: process.env.KIE_VIDEO_MODEL ?? 'veo3_fast',

  // Cinematic video: nano-banana scene image → Veo 3.1 image-to-video (8s) →
  // Veo extend ×(segments-1) → ~48-64s. Replaces the single-clip video path.
  // Set CINEMATIC_VIDEO=false to fall back to the avatar/scenic single-clip path.
  cinematicVideo: (process.env.CINEMATIC_VIDEO ?? 'true') !== 'false',
  cinematicSegments: Number(process.env.CINEMATIC_SEGMENTS ?? '8'), // 8s + 7×7s ≈ 57s
  cinematicVeoModel: process.env.CINEMATIC_VEO_MODEL ?? 'veo3_fast',
  cinematicImageModel: process.env.CINEMATIC_IMAGE_MODEL ?? 'nano-banana-2',

  // Avatar video engine. 'omnihuman' animates a HeyGen photo-avatar portrait into
  // a lively, moving presenter (kie OmniHuman) with an ElevenLabs voice; 'heygen'
  // is the older static talking-photo (rollback).
  avatarEngine: process.env.AVATAR_ENGINE ?? 'omnihuman',
  omnihumanModel: process.env.OMNIHUMAN_MODEL ?? 'omnihuman-1-5',
  // HeyGen talking-photo avatar whose portrait OmniHuman animates.
  omnihumanAvatarId: process.env.OMNIHUMAN_AVATAR_ID ?? 'a927c2eb39a04b4d9c425c9c41cc3d01',
  kieUploadBase: process.env.KIE_UPLOAD_BASE ?? 'https://kieai.redpandaai.co',
  // ElevenLabs TTS (direct — kie's ElevenLabs relay is unreliable). Key from
  // Secret Manager as ELEVENLABS_API_KEY.
  elevenLabsKey: process.env.ELEVENLABS_API_KEY ?? '',
  elevenLabsModel: process.env.ELEVENLABS_MODEL ?? 'eleven_multilingual_v2',
  elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM',

  // Meta (Facebook/Instagram) organic publishing. The Page token is injected
  // by Cloud Run from Secret Manager as META_PAGE_TOKEN (same pattern as
  // KIE_API_KEY); only the Graph API version is a plain default here.
  metaGraphVersion: process.env.META_GRAPH_VERSION ?? 'v21.0',

  // Single-brand fallback: when set, these env vars are used for every
  // workspace instead of per-workspace Secret Manager / Firestore settings.
  // Convenient for a one-client deployment; leave empty for multi-tenant.
  metaPageToken: process.env.META_PAGE_TOKEN ?? '',
  metaFacebookPageId: process.env.META_FACEBOOK_PAGE_ID ?? '',
  metaInstagramUserId: process.env.META_INSTAGRAM_USER_ID ?? '',

  // HeyGen avatar video. Key injected from Secret Manager as HEYGEN_API_KEY
  // (same pattern as KIE_API_KEY). Default avatar + voice power the
  // single-brand spokesperson; a Geek-Mode override can swap them per ad.
  heygenKey: process.env.HEYGEN_API_KEY ?? '',
  heygenApiBase: process.env.HEYGEN_API_BASE ?? 'https://api.heygen.com',
  heygenAvatarId: process.env.HEYGEN_AVATAR_ID ?? '',
  heygenVoiceId: process.env.HEYGEN_VOICE_ID ?? '',
  // Effectiveness tuning for avatar ads. Captions + branded backgrounds +
  // the multi-scene spoken script are on by default (safe for any voice/plan).
  // Emotion needs an emotion-capable voice, and HD (1080p) needs a plan that
  // supports it — so both are opt-in to avoid breaking a working pipeline.
  // Wrap every generated video ad with a cinematic intro/outro via ffmpeg.
  // OFF by default: the ffmpeg encode OOM-killed the 512Mi Cloud Run worker
  // (uncatchable — the process dies → the batch fails), and the card design
  // still needs work. Being reworked (more worker memory + better cards +
  // actual visual verification) before it's re-enabled.
  videoIntroOutro: (process.env.VIDEO_INTRO_OUTRO ?? 'false') === 'true',
  heygenCaptions: (process.env.HEYGEN_CAPTIONS ?? 'true') !== 'false',
  heygenVoiceEmotion: process.env.HEYGEN_VOICE_EMOTION ?? '', // e.g. 'Friendly'
  heygenVoiceSpeed: Number(process.env.HEYGEN_VOICE_SPEED ?? '1.05'),
  heygenHd: (process.env.HEYGEN_HD ?? 'false') === 'true',

  emulators: {
    auth: process.env.FIREBASE_AUTH_EMULATOR_HOST,
    firestore: process.env.FIRESTORE_EMULATOR_HOST,
    storage: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
  },

  isEmulator(): boolean {
    return !!process.env.FIRESTORE_EMULATOR_HOST;
  },
};
