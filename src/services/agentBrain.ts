import { config } from '../config.js';

export interface BrainDecision {
  action: 'fill' | 'back' | 'skip' | 'clarify';
  cleanValue: string;
  keokiReply: string;
}

export class AgentBrain {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = config.groqApiKey;
    this.model = 'openai/gpt-oss-120b'; // Ultra-fast LPU inference on Groq
  }

  /**
   * Decide what action to take based on the user's spoken or typed intent
   */
  async decide(
    currentField: string,
    currentPrompt: string,
    userInput: string,
    history: string[] = []
  ): Promise<BrainDecision> {
    if (!this.apiKey) {
      // Fallback simple heuristic if no API key
      return this.fallbackHeuristic(currentField, userInput);
    }

    const systemPrompt = `You are "Keoki", an intelligent, upbeat, slightly sarcastic, and humorous Hawaii local AI assistant helping the user navigate the official Hawaii Food Stamps (SNAP) online application.

Your job is to analyze the user's response to the current form question:
Field: "${currentField}"
Question asked: "${currentPrompt}"

Determine their INTENT:
1. "back": The user wants to go back, correct a previous mistake, redo a field, or change their mind (e.g. "wait go back", "previous screen", "I messed up", "no that was wrong").
2. "skip": The user wants to skip or leave it blank (e.g. "skip", "no middle name", "none", "leave it").
3. "fill": The user provided the answer to the current field.
   CRITICAL FOR "cleanValue":
   - Strip out conversational filler, polite chatter, punctuation like commas or periods in names! E.g. "My name is Alston, bro" -> "Alston".
   - For names: clean alphabetic string only.
   - For phone: 10 digits only.
   - For dates: formatted cleanly (YYYY-MM-DD or MM/DD/YYYY).
   - For yes/no: "Yes" or "No".
4. "clarify": The user asked a question about SNAP, DHS, or needs help understanding what the state is asking.

Respond ONLY with a valid JSON object matching this schema:
{
  "action": "fill" | "back" | "skip" | "clarify",
  "cleanValue": string,
  "keokiReply": string (a short, fun, 1-sentence Keoki response in his characteristic upbeat island voice)
}`;

    try {
      const response = await globalThis.fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userInput },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        return this.fallbackHeuristic(currentField, userInput);
      }

      const data = (await response.json()) as any;
      const content = data.choices[0]?.message?.content;
      const parsed = JSON.parse(content);

      return {
        action: parsed.action || 'fill',
        cleanValue: parsed.cleanValue ?? userInput.trim(),
        keokiReply: parsed.keokiReply || '',
      };
    } catch (e) {
      return this.fallbackHeuristic(currentField, userInput);
    }
  }

  private fallbackHeuristic(field: string, text: string): BrainDecision {
    const lower = text.toLowerCase();
    if (lower.includes('back') || lower.includes('previous') || lower.includes('undo')) {
      return {
        action: 'back',
        cleanValue: '',
        keokiReply: "No worries, taking you back to the previous screen!",
      };
    }
    if (lower.includes('skip') || lower.includes('none') || lower.includes('blank')) {
      return {
        action: 'skip',
        cleanValue: 'None',
        keokiReply: "Skipping that one, easy peasy.",
      };
    }
    // Clean names of trailing commas, periods
    const clean = text.replace(/[^a-zA-Z0-9\s\-]/g, '').trim();
    return {
      action: 'fill',
      cleanValue: clean,
      keokiReply: "Got it!",
    };
  }
}
