import { PlaywrightRunner } from './browser/playwrightRunner.js';

async function main() {
  console.log('==================================================');
  console.log('   🌴 Hawaii SNAP Voice-Guided Assistant 🌴');
  console.log('   Powered by Fish Audio TTS & Groq Whisper');
  console.log('==================================================\n');

  const runner = new PlaywrightRunner();
  await runner.start();
}

main().catch((err) => {
  console.error('Fatal error starting assistant:', err);
  process.exit(1);
});
