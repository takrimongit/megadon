import type { WizardOptions } from '@megadon/types';

export const defaultWizardOptions: WizardOptions = {
  goals: [
    { id: 'awareness', label: 'Brand Awareness', desc: 'Reach new audiences and increase visibility', icon: 'campaign' },
    { id: 'conversion', label: 'Drive Conversions', desc: 'Turn viewers into buyers with compelling CTAs', icon: 'shopping-cart' },
    { id: 'engagement', label: 'Boost Engagement', desc: 'Increase likes, shares, and comments', icon: 'favorite' },
    { id: 'retention', label: 'Customer Retention', desc: 'Re-engage existing customers with offers', icon: 'repeat' },
  ],
  ageGroups: ['18–24', '25–34', '35–44', '45–54', '55+'],
  interests: ['Fashion', 'Tech', 'Fitness', 'Travel', 'Food', 'Finance', 'Gaming', 'Parenting'],
  platforms: [
    { id: 'instagram', label: 'Instagram', formats: 'Reels, Stories, Feed', icon: 'photo-camera' },
    { id: 'tiktok', label: 'TikTok', formats: 'Short-form Video', icon: 'music-video' },
    { id: 'facebook', label: 'Facebook', formats: 'Feed, Stories, Reels', icon: 'facebook' },
    { id: 'youtube', label: 'YouTube', formats: 'Shorts, In-stream', icon: 'play-circle' },
    { id: 'linkedin', label: 'LinkedIn', formats: 'Feed, Stories', icon: 'work' },
  ],
  visualStyles: [
    { id: 'bold', label: 'Bold & Energetic', desc: 'High contrast, dynamic motion' },
    { id: 'minimal', label: 'Minimal & Clean', desc: 'Whitespace-first, elegant typography' },
    { id: 'warm', label: 'Warm & Authentic', desc: 'Natural tones, lifestyle imagery' },
    { id: 'playful', label: 'Playful & Fun', desc: 'Bright colors, quirky elements' },
  ],
  tones: ['Professional', 'Casual', 'Urgent', 'Inspiring', 'Humorous', 'Trustworthy'],
};
