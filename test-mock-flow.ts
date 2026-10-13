import { chromium } from 'playwright';
import { GuidedFlowManager } from './src/conversation/guidedFlowManager.js';
import { DEFAULT_MOCK_PROFILE, getMockTranscriptForStep } from './src/mock/mockData.js';
import { HAWAII_PORTAL_FLOW } from './src/conversation/formFlow.js';
import { navigateToSnapApplication } from './src/browser/portalNavigator.js';
import { config } from './src/config.js';

async function runMockFeedbackLoop() {
  console.log('=== [PHASE 1 FEEDBACK LOOP] Testing Hawaii SNAP Mock Flow ===');
  console.log('Launching headless Playwright Chromium...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  let page = await context.newPage();

  try {
    console.log(`Navigating to portal: ${config.portalUrl}`);
    await page.goto(config.portalUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    page = await navigateToSnapApplication(page);

    console.log(`Current page URL: ${page.url()}`);
    console.log(`Total defined flow steps: ${HAWAII_PORTAL_FLOW.length}`);

    const flowManager = new GuidedFlowManager();
    let stepCount = 0;

    while (true) {
      const currentStep = flowManager.getCurrentStep();
      if (!currentStep) break;

      const transcript = getMockTranscriptForStep(currentStep.id, DEFAULT_MOCK_PROFILE);
      console.log(`[Step ${stepCount + 1}/${HAWAII_PORTAL_FLOW.length}] Executing step: ${currentStep.id} ("${currentStep.fieldLabel}") with mock answer: "${transcript}"`);

      const result = await flowManager.processUserInput(page, transcript);
      stepCount++;

      if (result.isComplete) {
        break;
      }
    }

    const collected = flowManager.getCollectedData();
    console.log('\n--- Collected Mock Data ---');
    console.log(JSON.stringify(collected, null, 2));

    const requiredKeys = [
      'select_programs',
      'language_assistance',
      'primary_language',
      'english_proficiency',
      'applicant_first_name',
      'applicant_last_name',
      'applicant_phone',
      'applicant_gender',
      'applicant_ssn',
      'applicant_dob',
      'applicant_email',
      'res_address',
      'res_city',
      'res_zip',
    ];

    const missingKeys = requiredKeys.filter((k) => !(k in collected));
    if (missingKeys.length > 0) {
      console.error(`\n❌ FEEDBACK LOOP FAILED: Missing required steps: ${missingKeys.join(', ')}`);
      process.exit(1);
    }

    if (collected.applicant_dob !== '1990-05-15') {
      console.error(`\n❌ FEEDBACK LOOP FAILED: Expected DOB "1990-05-15", got "${collected.applicant_dob}"`);
      process.exit(1);
    }

    if (collected.applicant_ssn !== '123-45-6789') {
      console.error(`\n❌ FEEDBACK LOOP FAILED: Expected SSN "123-45-6789", got "${collected.applicant_ssn}"`);
      process.exit(1);
    }

    if (collected.household_roster !== 'Roster confirmed') {
      console.error(`\n❌ FEEDBACK LOOP FAILED: Expected roster "Roster confirmed", got "${collected.household_roster}"`);
      process.exit(1);
    }

    console.log('\n✅ FEEDBACK LOOP PASSED: All steps executed, mapped, and verified successfully!');
  } finally {
    await browser.close();
  }
}

runMockFeedbackLoop().catch((err) => {
  console.error('Fatal error in mock loop:', err);
  process.exit(1);
});
