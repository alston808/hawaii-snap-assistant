import fetch from 'node-fetch';
import { config } from '../config.js';

export interface OpenRouterTtsOptions {
  model?: string;
  voice?: string;
  format?: 'mp3' | 'wav';
}

export class OpenRouterTtsService {
  private apiKey: string;
  private defaultModel: string;
  private defaultVoice: string;

  constructor() {
    this.apiKey = config.openrouterApiKey;
    this.defaultModel = config.openrouterTtsModel; // fish-audio/s2.1-pro-free:free
    this.defaultVoice = config.openrouterVoice;
  }

  /**
   * Convert text to speech audio buffer via OpenRouter audio endpoint
   */
  async synthesize(text: string, options?: OpenRouterTtsOptions): Promise<Buffer> {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured in .env');
    }

    const payload: Record<string, any> = {
      model: options?.model || this.defaultModel,
      input: text,
      response_format: options?.format || 'mp3',
    };

    const voice = options?.voice || this.defaultVoice;
    if (voice) {
      payload.voice = voice;
    }

    const response = await globalThis.fetch('https://openrouter.ai/api/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter TTS error (${response.status}): ${errText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
