import fetch from 'node-fetch';
import { config } from '../config.js';

export interface FishTtsOptions {
  referenceId?: string;
  format?: 'mp3' | 'wav' | 'pcm' | 'opus';
  latency?: 'normal' | 'balanced';
}

export class FishAudioTtsService {
  private apiKey: string;
  private voiceId: string;
  private model: string;

  constructor() {
    this.apiKey = config.fishApiKey;
    this.voiceId = config.fishVoiceId;
    this.model = config.fishModel;
  }

  /**
   * Convert text into speech audio buffer using Fish Audio developer preview model
   */
  async synthesize(text: string, options?: FishTtsOptions): Promise<Buffer> {
    if (!this.apiKey) {
      throw new Error('FISH_API_KEY is not configured in .env');
    }

    const payload: Record<string, any> = {
      text,
      format: options?.format || 'mp3',
      model: this.model, // s2.1-pro-free
      latency: options?.latency || 'balanced',
    };

    const refId = options?.referenceId || this.voiceId;
    if (refId) {
      payload.reference_id = refId;
    }

    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Fish Audio TTS error (${response.status}): ${err}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
