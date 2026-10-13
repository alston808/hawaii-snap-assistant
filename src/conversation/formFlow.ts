import { Page } from 'playwright';
import { advanceWizard, checkInput, fillInput } from '../browser/wizardController.js';

export interface FormStepAction {
  id: string;
  sectionTitle: string;
  speechPrompt: string;
  fieldLabel: string;
  run: (page: Page, transcript: string) => Promise<{ success: boolean; value: string }>;
}

export const HAWAII_PORTAL_FLOW: FormStepAction[] = [
  // ====================================================
  // PHASE 1: REGISTRATION WIZARD (DHS-1240 Cover / Page 3)
  // ====================================================

  // Fieldset 0: Program Selection
  {
    id: 'select_programs',
    sectionTitle: 'Program Selection',
    speechPrompt: "Aloha, I'm Keoki! Your personal Hawaii food stamp whisperer. Are we getting you pure SNAP food money, or going for the whole package with financial assistance too?",
    fieldLabel: 'Benefit Programs',
    run: async (page: Page, text: string) => {
      const lower = text.toLowerCase();
      await checkInput(page, 'chkSNAP');
      if (lower.includes('money') || lower.includes('financial') || lower.includes('both')) {
        await checkInput(page, 'chkMoney');
      }
      await page.waitForTimeout(400);
      await advanceWizard(page);
      return { success: true, value: lower.includes('both') ? 'SNAP + Financial' : 'SNAP' };
    },
  },

  // Fieldset 1: Interpreter
  {
    id: 'language_assistance',
    sectionTitle: 'Language Preferences',
    speechPrompt: "Right on. Do you need the state to send an interpreter, or is my smooth local English doing the trick for you? Just say No or Yes.",
    fieldLabel: 'Interpreter Needed',
    run: async (page: Page, text: string) => {
      const lower = text.toLowerCase();
      if (lower.includes('yes') || lower.includes('interpreter') || lower.includes('sign')) {
        await checkInput(page, 'interpreterOption1');
        if (lower.includes('sign')) {
          await page.locator('#dropdownLanguage').selectOption('American Sign Language').catch(() => {});
        }
      } else {
        await checkInput(page, 'interpreterOption2'); // No
      }
      await page.waitForTimeout(400);
      await advanceWizard(page);
      return { success: true, value: lower.includes('yes') ? 'Yes' : 'No' };
    },
  },

  // Fieldset 2: Primary Language & English Proficiency
  {
    id: 'primary_language',
    sectionTitle: 'Language Preferences',
    speechPrompt: "What primary language is spoken in your hale or household? English, Hawaiian, or another?",
    fieldLabel: 'Primary Language',
    run: async (page: Page, text: string) => {
      const clean = text.trim();
      await fillInput(page, 'txtPrimaryLanguageSpoken', clean);
      return { success: true, value: clean };
    },
  },
  {
    id: 'english_proficiency',
    sectionTitle: 'English Proficiency',
    speechPrompt: "How's your English reading and speaking? Adequate, or do you prefer keeping it short and sweet?",
    fieldLabel: 'English Proficiency',
    run: async (page: Page, text: string) => {
      const lower = text.toLowerCase();
      if (lower.includes('limited')) {
        await checkInput(page, 'chkLimitedUnderstanding');
      } else if (lower.includes('not') || lower.includes('does not')) {
        await checkInput(page, 'chkDoesNotSpeakEnglish');
      } else {
        await checkInput(page, 'chkSpeaksEnglishWritesWell');
      }
      await page.waitForTimeout(400);
      await advanceWizard(page);
      return { success: true, value: text };
    },
  },

  // Fieldset 3: Applicant Identity
  {
    id: 'applicant_first_name',
    sectionTitle: 'Personal Info',
    speechPrompt: "Alright boss, what's your legal first name? The one on your official ID, not your nickname at the beach.",
    fieldLabel: 'First Name',
    run: async (page: Page, text: string) => {
      const clean = text.replace(/(?:my name is|first name is|it is|it's)\s*/i, '').trim().split(' ')[0];
      await fillInput(page, 'txtApplicantFirstName', clean);
      return { success: true, value: clean };
    },
  },
  {
    id: 'applicant_middle_name',
    sectionTitle: 'Personal Info',
    speechPrompt: "Got a middle name, or did your parents keep it simple? Say 'none' if you don't have one.",
    fieldLabel: 'Middle Name',
    run: async (page: Page, text: string) => {
      if (!/none|blank|no middle|skip/i.test(text)) {
        const clean = text.trim().split(' ')[0];
        await fillInput(page, 'txtApplicantMiddleName', clean);
        return { success: true, value: clean };
      }
      return { success: true, value: 'None' };
    },
  },
  {
    id: 'applicant_last_name',
    sectionTitle: 'Personal Info',
    speechPrompt: "And what's your legal last name?",
    fieldLabel: 'Last Name',
    run: async (page: Page, text: string) => {
      const clean = text.replace(/(?:last name is|surname is)\s*/i, '').trim().split(' ')[0];
      await fillInput(page, 'txtApplicantLastName', clean);
      return { success: true, value: clean };
    },
  },
  {
    id: 'applicant_phone',
    sectionTitle: 'Personal Info',
    speechPrompt: "What's your 10-digit phone number so DHS can hit you up when your benefits get approved?",
    fieldLabel: 'Phone Number',
    run: async (page: Page, text: string) => {
      const digits = text.replace(/\D/g, '');
      await fillInput(page, 'txtApplicantPhone', digits);
      return { success: true, value: digits };
    },
  },
  {
    id: 'applicant_gender',
    sectionTitle: 'Personal Info',
    speechPrompt: "Official gender for state records: Male or Female?",
    fieldLabel: 'Gender',
    run: async (page: Page, text: string) => {
      const gender = /female|woman|f/i.test(text) ? 'F' : 'M';
      await page.locator('#dropdownGender').selectOption(gender).catch(() => {});
      return { success: true, value: gender === 'M' ? 'Male' : 'Female' };
    },
  },
  {
    id: 'applicant_ssn',
    sectionTitle: 'Personal Info',
    speechPrompt: "What is your Social Security Number for the state verification system? (9 digits, say 'skip' if you don't have one right now).",
    fieldLabel: 'SSN',
    run: async (page: Page, text: string) => {
      if (/skip|none|no/i.test(text)) {
        return { success: true, value: 'Skipped' };
      }
      const digits = text.replace(/\D/g, '');
      const formatted = digits.length === 9 ? `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}` : text.trim();
      await fillInput(page, 'txtApplicantSSN', formatted);
      return { success: true, value: formatted };
    },
  },
  {
    id: 'applicant_dob',
    sectionTitle: 'Personal Info',
    speechPrompt: "When's your birthday? Don't worry, I won't tell anyone how young you really are.",
    fieldLabel: 'Date of Birth',
    run: async (page: Page, text: string) => {
      let dob = text.trim();
      const isoMatch = text.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
      if (isoMatch) {
        dob = `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
      } else {
        const usMatch = text.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
        if (usMatch) {
          const y = usMatch[3].length === 2 ? '19' + usMatch[3] : usMatch[3];
          const m = usMatch[1].padStart(2, '0');
          const d = usMatch[2].padStart(2, '0');
          dob = `${y}-${m}-${d}`;
        }
      }
      await fillInput(page, 'txtApplicantDOB', dob);
      return { success: true, value: dob };
    },
  },
  {
    id: 'applicant_email',
    sectionTitle: 'Personal Info',
    speechPrompt: "Drop your email address so we can get past this screen and onto your address.",
    fieldLabel: 'Email Address',
    run: async (page: Page, text: string) => {
      const clean = text.toLowerCase().replace(/\bat\b/g, '@').replace(/\s+/g, '').replace(/dot/g, '.');
      await fillInput(page, 'txtApplicantEmail', clean);
      await page.waitForTimeout(400);
      await advanceWizard(page);
      return { success: true, value: clean };
    },
  },

  // Fieldset 4: Addresses
  {
    id: 'res_address',
    sectionTitle: 'Address',
    speechPrompt: "Sweet, we made it to the address section! What's your Hawaii street address?",
    fieldLabel: 'Street Address',
    run: async (page: Page, text: string) => {
      await fillInput(page, 'txtResAddressLine1', text.trim());
      await fillInput(page, 'txtMailAddressLine1', text.trim());
      return { success: true, value: text.trim() };
    },
  },
  {
    id: 'res_city',
    sectionTitle: 'Address',
    speechPrompt: "What city or town is that in?",
    fieldLabel: 'City',
    run: async (page: Page, text: string) => {
      const city = text.trim();
      await fillInput(page, 'txtResAddressCity', city);
      await fillInput(page, 'txtMailAddressCity', city);
      await page.locator('#dropdownResAddressState').selectOption('HI').catch(() => {});
      await page.locator('#dropdownMailAddressState').selectOption('HI').catch(() => {});
      return { success: true, value: city };
    },
  },
  {
    id: 'res_zip',
    sectionTitle: 'Address',
    speechPrompt: "And what's your 5-digit Hawaii ZIP code?",
    fieldLabel: 'ZIP Code',
    run: async (page: Page, text: string) => {
      const zip = text.replace(/\D/g, '').slice(0, 5);
      await fillInput(page, 'txtResAddressZip', zip);
      await fillInput(page, 'txtMailAddressZip', zip);
      return { success: true, value: zip };
    },
  },
  {
    id: 'recaptcha_gate',
    sectionTitle: 'Security Verification',
    speechPrompt: "Ah, the state wants to make sure you're not a robot like me! Please check that 'I am not a robot' box on screen, then type 'Ready' or give me a shout.",
    fieldLabel: 'reCAPTCHA',
    run: async (page: Page, _text: string) => {
      await page.waitForTimeout(500);
      await advanceWizard(page);
      return { success: true, value: 'Verified' };
    },
  },

  // Spouse Section
  {
    id: 'spouse_info',
    sectionTitle: 'Spouse Information',
    speechPrompt: "Are you married and living together, or living that solo single life? Say 'No' or give me their name.",
    fieldLabel: 'Spouse',
    run: async (page: Page, text: string) => {
      if (/no|single|unmarried|none|skip/i.test(text)) {
        await page.getByRole('button', { name: /NEXT/i }).first().click().catch(() => {});
        return { success: true, value: 'None' };
      }
      const parts = text.trim().split(' ');
      if (parts.length > 0) {
        await page.locator('#txtSpouseFirstName').fill(parts[0]).catch(() => {});
        if (parts.length > 1) {
          await page.locator('#txtSpouseLastName').fill(parts.slice(1).join(' ')).catch(() => {});
        }
      }
      await page.getByRole('button', { name: /NEXT/i }).first().click().catch(() => {});
      return { success: true, value: text };
    },
  },

  // Household Members & Food Prep
  {
    id: 'food_household_counts',
    sectionTitle: 'Household Setup',
    speechPrompt: "How many hungry mouths in total are eating and prepping meals together in your home?",
    fieldLabel: 'Household Food Count',
    run: async (page: Page, text: string) => {
      const count = text.match(/\d+/)?.[0] || '1';
      const foodInput = page.getByRole('spinbutton', { name: /How many people purchase food/i }).first();
      if (await foodInput.isVisible().catch(() => false)) {
        await foodInput.fill(count).catch(() => {});
      }
      await page.locator('#radPurchaseFoodYes').check().catch(() => {});
      await page.locator('#radPregnantNo').check().catch(() => {});
      await page.getByRole('button', { name: /NEXT/i }).first().click().catch(() => {});
      return { success: true, value: count };
    },
  },

  // Expedited SNAP & Liquid Assets
  {
    id: 'expedited_questions',
    sectionTitle: 'Expedited SNAP & Assets',
    speechPrompt: "Do you pay monthly rent or mortgage shelter costs? (Answering yes gets you solid deductions!)",
    fieldLabel: 'Expedited & Assets',
    run: async (page: Page, text: string) => {
      const lower = text.toLowerCase();
      if (lower.includes('rent') || lower.includes('shelter') || lower.includes('mortgage') || lower.includes('yes')) {
        await page.locator('#radShelterExpensesYes').check().catch(() => {});
      } else {
        await page.locator('#radShelterExpensesNo').check().catch(() => {});
      }
      await page.locator('#radCashSavingsNo').check().catch(() => {});
      await page.locator('#radSeasonalNo').check().catch(() => {});
      await page.locator('#radExpectsOrReceivedMoneyNo').check().catch(() => {});
      await page.locator('#withoutPlaceToLiveNo').check().catch(() => {});
      await page.getByRole('button', { name: /NEXT/i }).first().click().catch(() => {});
      return { success: true, value: text };
    },
  },

  // Household Roster
  {
    id: 'household_roster',
    sectionTitle: 'Household Roster',
    speechPrompt: "Chee-hoo! Check out the household roster on screen. Does it look accurate, or do you want to add another person?",
    fieldLabel: 'Household Roster',
    run: async (page: Page, text: string) => {
      if (/add\s+(?:another|more|a\s+person)|add\s+person/i.test(text)) {
        await page.getByRole('button', { name: '+ Add Another Person' }).first().click().catch(() => {});
        return { success: true, value: 'Added another member' };
      }
      await page.getByRole('button', { name: /NEXT/i }).first().click().catch(() => {});
      return { success: true, value: 'Roster confirmed' };
    },
  },
];
