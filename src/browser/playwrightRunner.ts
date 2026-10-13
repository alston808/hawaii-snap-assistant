import { chromium, BrowserContext, Page } from 'playwright';
import { config } from '../config.js';
import { injectVoiceWidget } from './widgetInjector.js';
import { navigateToSnapApplication } from './portalNavigator.js';
import { GuidedFlowManager } from '../conversation/guidedFlowManager.js';
import { FishAudioTtsService } from '../services/fishAudioTts.js';
import { OpenRouterTtsService } from '../services/openrouterTts.js';
import { GroqWhisperService } from '../services/groqWhisper.js';
import { DEFAULT_MOCK_PROFILE, getMockTranscriptForStep } from '../mock/mockData.js';

export class PlaywrightRunner {
  private page!: Page;
  private context!: BrowserContext;
  private flowManager = new GuidedFlowManager();
  private fishTts = new FishAudioTtsService();
  private openrouterTts = new OpenRouterTtsService();
  private groqWhisper = new GroqWhisperService();

  async start() {
    console.log('[PlaywrightRunner] Launching browser...');
    const browser = await chromium.launch({
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream', // Auto-grant microphone permission
        '--window-size=1280,950',
      ],
    });

    this.context = await browser.newContext({
      permissions: ['microphone'],
      viewport: { width: 1280, height: 950 },
    });

    this.page = await this.context.newPage();

    // Expose Node.js callback for audio recorded in the browser
    await this.page.exposeFunction('__onUserAudioRecorded', async (base64Webm: string) => {
      await this.handleUserAudio(base64Webm);
    });

    // Expose Node.js callback for direct text submitted via debug chat
    await this.page.exposeFunction('__onUserTextSubmitted', async (userText: string) => {
      console.log(`[Text Chat Received] "${userText}"`);
      await this.processUserResponse(userText);
    });

    console.log(`[PlaywrightRunner] Navigating to: ${config.portalUrl}`);
    await this.page.goto(config.portalUrl, { waitUntil: 'domcontentloaded' });

    // Automatically navigate through entry links directly into SNAP form
    this.page = await navigateToSnapApplication(this.page);

    // Inject our floating HUD assistant
    await injectVoiceWidget(this.page);

    // Speak initial question according to true portal sequence
    const firstStep = this.flowManager.getCurrentStep();
    if (firstStep) {
      await this.speakAndPrompt(firstStep.speechPrompt);
    }

    // Keep widget injected across subsequent page turns / navigation
    this.page.on('load', async () => {
      try {
        await injectVoiceWidget(this.page);
      } catch (e) {
        // Ignored
      }
    });

    // Also handle popup windows if opened by the portal
    this.context.on('page', async (newPage) => {
      this.page = newPage;
      newPage.on('load', async () => {
        try {
          await injectVoiceWidget(newPage);
        } catch (e) {}
      });
    });

    if (config.mockMode) {
      console.log('🤖 [PlaywrightRunner] Mock mode active: automatically navigating & filling with mock data...');
      await this.runMockFlow();
    }
  }

  private async speakAndPrompt(text: string) {
    console.log(`[Assistant] ${text}`);
    await this.page.evaluate((msg) => {
      if ((window as any).__updateAssistantText) {
        (window as any).__updateAssistantText(msg);
      }
    }, text);

    // 1. OpenRouter Free Fish Audio TTS
    if (config.openrouterApiKey) {
      try {
        const audioBuffer = await this.openrouterTts.synthesize(text);
        const base64Audio = audioBuffer.toString('base64');
        await this.page.evaluate((audioData) => {
          if ((window as any).__playAssistantAudio) {
            (window as any).__playAssistantAudio(audioData);
          }
        }, base64Audio);
        return;
      } catch (err: any) {
        console.warn(`[OpenRouterTTS] Error: ${err.message}. Falling back to browser speech synthesis.`);
      }
    }

    // 2. Direct Fish Audio if present
    if (config.fishApiKey) {
      try {
        const audioBuffer = await this.fishTts.synthesize(text);
        const base64Audio = audioBuffer.toString('base64');
        await this.page.evaluate((audioData) => {
          if ((window as any).__playAssistantAudio) {
            (window as any).__playAssistantAudio(audioData);
          }
        }, base64Audio);
        return;
      } catch (err: any) {}
    }

    // 3. Browser Web Speech fallback with male pitch
    await this.page.evaluate((msg) => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(msg);
        utter.rate = 1.05;
        utter.pitch = 0.9; // Slightly lower, natural male resonance
        window.speechSynthesis.speak(utter);
      }
    }, text);
  }

  private async handleUserAudio(base64Audio: string) {
    try {
      const audioBuffer = Buffer.from(base64Audio, 'base64');
      if (audioBuffer.length < 1000) {
        console.log(`[GroqWhisper] Ignored micro audio clip (${audioBuffer.length} bytes).`);
        return;
      }

      console.log(`[GroqWhisper] Transcribing ${audioBuffer.length} bytes of audio...`);
      let transcript = '';
      if (config.groqApiKey) {
        transcript = await this.groqWhisper.transcribe(audioBuffer);
      } else {
        transcript = 'No GROQ_API_KEY';
      }

      console.log(`[User Spoke] "${transcript}"`);
      await this.page.evaluate((t) => {
        if ((window as any).__updateUserTranscript) {
          (window as any).__updateUserTranscript(t);
        }
      }, transcript);

      await this.processUserResponse(transcript);
    } catch (err: any) {
      console.error('[Error handling audio]:', err.message);
    }
  }

  private async processUserResponse(userInput: string) {
    if (!userInput.trim()) return;

    try {
      // Use Keoki's AI Brain to evaluate intent, clean values, backtrack, or fill
      const result = await this.flowManager.processUserInput(this.page, userInput);
      if (result.nextPrompt) {
        await this.speakAndPrompt(result.nextPrompt);
      }
    } catch (err: any) {
      console.error('[Error executing step]:', err.message);
    }
  }

  private async runMockFlow() {
    while (true) {
      const step = this.flowManager.getCurrentStep();
      if (!step) break;

      const mockInput = getMockTranscriptForStep(step.id, DEFAULT_MOCK_PROFILE);
      console.log(`[Mock Mode] Step: ${step.id} ("${step.fieldLabel}") -> Input: "${mockInput}"`);
      await this.page.waitForTimeout(600);
      await this.processUserResponse(mockInput);
    }
    console.log('🎉 [Mock Mode] Finished filling all form steps with mock data!');
  }
}

