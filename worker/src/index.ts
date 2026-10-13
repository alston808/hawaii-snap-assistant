export interface Env {
  GROQ_API_KEY: string;
  FISH_API_KEY: string;
  FISH_VOICE_ID?: string;
  OPENROUTER_API_KEY?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      // 1. Health check
      if (url.pathname === '/' || url.pathname === '/health') {
        return new Response(JSON.stringify({ status: 'ok', service: 'hawaii-snap-assistant-gateway' }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // 2. Speech-to-Text: Groq Whisper
      if (url.pathname === '/api/stt' && request.method === 'POST') {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
          return new Response(JSON.stringify({ error: 'Missing audio file' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }

        const groqForm = new FormData();
        groqForm.append('file', file, 'audio.webm');
        groqForm.append('model', 'whisper-large-v3-turbo');

        const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` },
          body: groqForm,
        });

        const data: any = await groqRes.json();
        return new Response(JSON.stringify({ text: data.text || '' }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // 3. Text-to-Speech: Fish Audio Direct or OpenRouter
      if (url.pathname === '/api/tts' && request.method === 'POST') {
        const { text } = (await request.json()) as { text: string };
        if (!text) {
          return new Response(JSON.stringify({ error: 'Missing text parameter' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }

        if (env.FISH_API_KEY) {
          const ttsRes = await fetch('https://api.fish.audio/v1/tts', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.FISH_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text,
              model: 's2.1-pro-free',
              reference_id: env.FISH_VOICE_ID || null,
            }),
          });

          const audioBlob = await ttsRes.arrayBuffer();
          return new Response(audioBlob, {
            headers: { ...CORS_HEADERS, 'Content-Type': 'audio/mpeg' },
          });
        }

        return new Response(JSON.stringify({ error: 'TTS not configured' }), {
          status: 501,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // 4. AI Brain: Slot extraction and dialogue response via LLM
      if (url.pathname === '/api/brain' && request.method === 'POST') {
        const { fieldLabel, speechPrompt, userInput } = (await request.json()) as {
          fieldLabel: string;
          speechPrompt: string;
          userInput: string;
        };

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content:
                  'You are Uncle Keoki, a warm Hawaii Food Stamps assistant. Extract the intent and clean value as JSON: {"action": "fill"|"skip"|"back", "cleanValue": string, "keokiReply": string}. Use local Hawaii warmth without overly dense pidgin.',
              },
              {
                role: 'user',
                content: `Field: "${fieldLabel}"\nPrompt: "${speechPrompt}"\nUser: "${userInput}"`,
              },
            ],
          }),
        });

        const data: any = await groqRes.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        return new Response(content, {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  },
};
