import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Fish Audio Direct
  fishApiKey: process.env.FISH_API_KEY || '',
  fishVoiceId: process.env.FISH_VOICE_ID || '',
  fishModel: process.env.FISH_MODEL || 's2.1-pro-free',

  // OpenRouter (Free Fish Audio TTS: fish-audio/s2.1-pro-free:free)
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  openrouterTtsModel: process.env.OPENROUTER_TTS_MODEL || 'fish-audio/s2.1-pro-free:free',
  openrouterVoice: process.env.OPENROUTER_VOICE || '',

  // Groq Whisper
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqWhisperModel: process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3-turbo',

  // Target Portal
  portalUrl: process.env.PORTAL_URL || 'https://pais-benefits.dhs.hawaii.gov/',

  // Mock Mode
  mockMode: process.env.MOCK_MODE === 'true' || process.argv.includes('--mock'),
};

