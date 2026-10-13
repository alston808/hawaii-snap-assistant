import FormData from 'form-data';
import fetch from 'node-fetch';
import { config } from '../config.js';

export interface WhisperResponse {
  text: string;
}

export class GroqWhisperService {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = config.groqApiKey;
    this.model = config.groqWhisperModel;
  }

  /**
   * Transcribe an audio buffer (WebM, WAV, MP3) using Groq Whisper API
   */
  async transcribe(audioBuffer: Buffer, filename = 'speech.webm'): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY is not configured in .env');
    }

    const form = new FormData();
    form.append('file', audioBuffer, {
      filename,
      contentType: filename.endsWith('.wav') ? 'audio/wav' : 'audio/webm',
    });
    form.append('model', this.model);
    form.append('response_format', 'json');

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...form.getHeaders(),
      },
      body: form as any,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq Whisper API error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as WhisperResponse;
    return data.text ? data.text.trim() : '';
  }
}
