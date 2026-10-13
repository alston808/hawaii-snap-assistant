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

        // Try OpenRouter first (Fish Audio s2.1-pro-free:free)
        if (env.OPENROUTER_API_KEY) {
          try {
            const orRes = await fetch('https://openrouter.ai/api/v1/audio/speech', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://pais-benefits.dhs.hawaii.gov/',
                'X-Title': 'Uncle Keoki Hawaii SNAP Voice Assistant',
              },
              body: JSON.stringify({
                model: 'fish-audio/s2.1-pro-free:free',
                input: text,
                response_format: 'mp3',
              }),
            });

            if (orRes.ok) {
              const audioBlob = await orRes.arrayBuffer();
              return new Response(audioBlob, {
                headers: { ...CORS_HEADERS, 'Content-Type': 'audio/mpeg' },
              });
            }
          } catch (e) {
            console.error('OpenRouter TTS error:', e);
          }
        }

        // Direct Fish Audio fallback
        if (env.FISH_API_KEY) {
          try {
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

            if (ttsRes.ok) {
              const audioBlob = await ttsRes.arrayBuffer();
              return new Response(audioBlob, {
                headers: { ...CORS_HEADERS, 'Content-Type': 'audio/mpeg' },
              });
            }
          } catch (e) {
            console.error('Fish Audio direct error:', e);
          }
        }

        return new Response(JSON.stringify({ error: 'TTS unavailable, please use browser voice fallback' }), {
          status: 503,
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
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content:
                  'You are Uncle Keoki: a warm, energetic, beloved Hawaii kupuna helping local island families apply for SNAP food stamps. You have great aloha spirit, humor, and heart—never cold or clinical! You use natural local phrasing (Aloha, right on brah/sis, chee-hoo, pau, no sweat, got your back).\n\nAnalyze the applicant\'s response and return JSON with:\n- "action": "fill" | "skip" | "back"\n- "cleanValue": sanitized form value (clean name, digits only for phone/ssn/zip, YYYY-MM-DD for dates, or Yes/No)\n- "keokiReply": a lively, comforting 1-2 sentence reaction in Uncle Keoki\'s charming voice affirming what they said and cheering them on',
              },
              {
                role: 'user',
                content: `Target Field: "${fieldLabel}"\nUncle Keoki Prompted: "${speechPrompt}"\nApplicant Replied: "${userInput}"`,
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
