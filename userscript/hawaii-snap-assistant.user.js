// ==UserScript==
// @name         🌴 Uncle Keoki: Hawaii SNAP Voice Assistant
// @namespace    https://pais-benefits.dhs.hawaii.gov/
// @version      1.1.0
// @description  AI Voice-guided assistant and smart navigator for Hawaii DHS PAIS benefits portal with Fish Audio TTS & Uncle Keoki personality
// @author       alston808
// @match        https://pais-benefits.dhs.hawaii.gov/*
// @downloadURL  https://raw.githubusercontent.com/alston808/hawaii-snap-assistant/main/userscript/hawaii-snap-assistant.user.js
// @updateURL    https://raw.githubusercontent.com/alston808/hawaii-snap-assistant/main/userscript/hawaii-snap-assistant.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  // Live Cloudflare Worker Gateway (routes STT, Fish Audio TTS & Uncle Keoki Brain)
  const WORKER_URL = GM_getValue('worker_url', 'https://hawaii-snap-assistant-gateway.alstonalika.workers.dev');

  // Rich, personality-filled Uncle Keoki flow mapped to DHS PAIS DOM
  const FORM_STEPS = [
    {
      id: 'select_programs',
      label: 'Benefit Programs',
      prompt: "Aloha, I'm Uncle Keoki! Your personal Hawaii food stamp guide. Are we getting you pure SNAP food money, or going for the whole package with financial assistance too?",
      fieldId: 'chkSNAP',
      shouldAdvance: true
    },
    {
      id: 'language_assistance',
      label: 'Interpreter Services',
      prompt: "Right on. Do you need the state to send an interpreter, or is my smooth local English doing the trick for you? Just say No or Yes.",
      fieldId: 'interpreterOption2',
      shouldAdvance: true
    },
    {
      id: 'primary_language',
      label: 'Primary Language',
      prompt: "What primary language is spoken in your hale or household? English, Hawaiian, or another?",
      fieldId: 'txtPrimaryLanguageSpoken',
      shouldAdvance: false
    },
    {
      id: 'english_proficiency',
      label: 'English Proficiency',
      prompt: "How's your English reading and speaking? Adequate, or do you prefer keeping it short and sweet?",
      fieldId: 'chkSpeaksEnglishWritesWell',
      shouldAdvance: true
    },
    {
      id: 'applicant_first_name',
      label: 'First Name',
      prompt: "Alright boss, what's your legal first name? The one on your official ID, not your nickname at the beach!",
      fieldId: 'txtApplicantFirstName',
      shouldAdvance: false
    },
    {
      id: 'applicant_middle_name',
      label: 'Middle Name',
      prompt: "Got a middle name, or did your parents keep it simple? Say 'none' if you don't have one.",
      fieldId: 'txtApplicantMiddleName',
      shouldAdvance: false
    },
    {
      id: 'applicant_last_name',
      label: 'Last Name',
      prompt: "And what's your legal last name?",
      fieldId: 'txtApplicantLastName',
      shouldAdvance: false
    },
    {
      id: 'applicant_phone',
      label: 'Phone Number',
      prompt: "What's your 10-digit phone number so DHS can hit you up when your benefits get approved?",
      fieldId: 'txtApplicantPhone',
      shouldAdvance: false
    },
    {
      id: 'applicant_gender',
      label: 'Gender',
      prompt: "Official gender for state records: Male or Female?",
      fieldId: 'dropdownGender',
      shouldAdvance: false
    },
    {
      id: 'applicant_ssn',
      label: 'SSN',
      prompt: "What's your Social Security Number for the state verification system? (Say 'skip' if you don't have it on hand).",
      fieldId: 'txtApplicantSSN',
      shouldAdvance: false
    },
    {
      id: 'applicant_dob',
      label: 'Date of Birth',
      prompt: "When's your birthday? Don't worry, I won't tell anyone how young you really are.",
      fieldId: 'txtApplicantDOB',
      shouldAdvance: false
    },
    {
      id: 'applicant_email',
      label: 'Email Address',
      prompt: "Drop your email address so we can get past this screen and onto your address.",
      fieldId: 'txtApplicantEmail',
      shouldAdvance: true
    },
    {
      id: 'res_address',
      label: 'Street Address',
      prompt: "Sweet, we made it to the address section! What's your Hawaii street address?",
      fieldId: 'txtResAddressLine1',
      shouldAdvance: false
    },
    {
      id: 'res_city',
      label: 'City',
      prompt: "What city or town is that in?",
      fieldId: 'txtResAddressCity',
      shouldAdvance: false
    },
    {
      id: 'res_zip',
      label: 'ZIP Code',
      prompt: "And what's your 5-digit Hawaii ZIP code?",
      fieldId: 'txtResAddressZip',
      shouldAdvance: false
    },
    {
      id: 'recaptcha_gate',
      label: 'Security Verification',
      prompt: "Ah, the state wants to make sure you're not a robot like me! Please check that 'I am not a robot' box on screen, then give me a shout or say 'Ready'.",
      fieldId: 'g-recaptcha-response',
      shouldAdvance: true
    },
    {
      id: 'spouse_info',
      label: 'Spouse Details',
      prompt: "Are you married and living together, or living that solo single life? Say 'No' or give me their name.",
      fieldId: 'txtSpouseFirstName',
      shouldAdvance: true
    },
    {
      id: 'food_household_counts',
      label: 'Household Food Count',
      prompt: "How many hungry mouths in total are eating and prepping meals together in your home?",
      fieldId: 'foodCount',
      shouldAdvance: true
    },
    {
      id: 'expedited_questions',
      label: 'Shelter Expenses',
      prompt: "Do you pay monthly rent or mortgage shelter costs? (Answering yes gets you solid deductions!)",
      fieldId: 'radShelterExpensesYes',
      shouldAdvance: true
    },
    {
      id: 'household_roster',
      label: 'Household Roster',
      prompt: "Chee-hoo! Check out the household roster on screen. Does it look accurate, or do you want to add another person?",
      fieldId: 'roster',
      shouldAdvance: true
    }
  ];

  let currentStepIndex = 0;
  let mediaRecorder = null;
  let audioChunks = [];
  let currentAudio = null;

  function initUI() {
    if (document.getElementById('keoki-assistant-hud')) return;

    const hud = document.createElement('div');
    hud.id = 'keoki-assistant-hud';
    hud.innerHTML = `
      <div style="position:fixed;bottom:20px;right:20px;width:370px;background:linear-gradient(145deg,#090d16 0%,#111827 100%);color:#f8fafc;border-radius:20px;box-shadow:0 16px 40px rgba(0,0,0,0.55);font-family:system-ui,-apple-system,sans-serif;z-index:999999;padding:18px;border:2px solid #0284c7;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:40px;height:40px;background:#0369a1;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;border:2px solid #38bdf8;">🌴</div>
            <div>
              <strong style="font-size:15px;display:block;color:#38bdf8;font-weight:700;">Uncle Keoki</strong>
              <span style="font-size:11px;color:#94a3b8;" id="keoki-step-info">Step 1 of ${FORM_STEPS.length}</span>
            </div>
          </div>
          <div style="display:flex;gap:6px;">
            <button id="keoki-tts-toggle" title="Toggle Voice Audio" style="background:#1e293b;color:#38bdf8;border:1px solid #334155;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;">🔊 Voice On</button>
            <button id="keoki-mock-btn" title="Auto-fill with mock profile" style="background:#334155;color:#e2e8f0;border:none;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;">Mock Fill</button>
          </div>
        </div>
        <div id="keoki-speech-box" style="font-size:13px;line-height:1.5;background:#030712;padding:14px;border-radius:12px;margin-bottom:12px;min-height:54px;border:1px solid #1f2937;color:#e0f2fe;transition:all 0.2s ease;">
          Aloha! Uncle Keoki here, your personal Hawaii food stamp whisperer. Let's get your benefits sorted!
        </div>
        <div style="display:flex;gap:8px;margin-bottom:10px;">
          <input type="text" id="keoki-text-input" placeholder="Type answer or speak..." style="flex:1;background:#030712;border:1px solid #374151;color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;outline:none;">
          <button id="keoki-send-btn" style="background:#0284c7;color:#fff;border:none;border-radius:10px;padding:10px 14px;cursor:pointer;font-weight:600;font-size:13px;">Send</button>
        </div>
        <div style="display:flex;gap:8px;">
          <button id="keoki-voice-btn" style="flex:1;background:#0284c7;color:#fff;border:none;border-radius:12px;padding:12px;font-weight:bold;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;transition:background 0.2s ease;">
            <span>🎙️</span> <span>Click to Speak</span>
          </button>
          <button id="keoki-back-btn" title="Back to previous question" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:12px;padding:0 14px;cursor:pointer;font-size:14px;">↩</button>
          <button id="keoki-skip-btn" title="Skip this question" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:12px;padding:0 14px;cursor:pointer;font-size:12px;font-weight:600;">Skip</button>
        </div>
      </div>
    `;
    document.body.appendChild(hud);

    document.getElementById('keoki-send-btn').onclick = submitTextInput;
    document.getElementById('keoki-text-input').onkeydown = (e) => { if (e.key === 'Enter') submitTextInput(); };
    document.getElementById('keoki-voice-btn').onclick = toggleVoiceRecording;
    document.getElementById('keoki-mock-btn').onclick = runMockFill;
    document.getElementById('keoki-back-btn').onclick = handleBacktrack;
    document.getElementById('keoki-skip-btn').onclick = handleSkip;

    let ttsEnabled = true;
    document.getElementById('keoki-tts-toggle').onclick = () => {
      ttsEnabled = !ttsEnabled;
      document.getElementById('keoki-tts-toggle').innerText = ttsEnabled ? '🔊 Voice On' : '🔇 Muted';
      if (!ttsEnabled && currentAudio) currentAudio.pause();
    };

    // Auto navigate past landing and LEP disclaimer pages if starting from entry
    autoAdvanceLanding();

    // Prompt first question
    promptCurrentStep();
  }

  async function autoAdvanceLanding() {
    // If on PAIS landing page, click APPLY NOW
    const applyNow = Array.from(document.querySelectorAll('button, a')).find(el => /APPLY NOW|Start a new application/i.test(el.textContent));
    if (applyNow && applyNow.offsetWidth > 0) {
      applyNow.click();
      return;
    }
    // If on LEP page, click NEXT
    const nextBtn = document.getElementById('next-btn') || Array.from(document.querySelectorAll('button, input[value="NEXT"]')).find(el => el.offsetWidth > 0);
    if (window.location.href.includes('getLEPPage') && nextBtn) {
      nextBtn.click();
    }
  }

  function promptCurrentStep() {
    if (currentStepIndex >= FORM_STEPS.length) {
      speakUtterance("Chee-hoo! All questions completed, boss! Take a quick look over your screen and you're good to submit.");
      return;
    }
    const step = FORM_STEPS[currentStepIndex];
    const info = document.getElementById('keoki-step-info');
    if (info) info.innerText = `Step ${currentStepIndex + 1} of ${FORM_STEPS.length}: ${step.label}`;
    speakUtterance(step.prompt);
  }

  function updateSpeech(text) {
    const box = document.getElementById('keoki-speech-box');
    if (box) box.innerText = text;
  }

  // Plays Uncle Keoki's authentic Fish Audio voice from Cloudflare Worker (fallback to Web Speech)
  async function speakUtterance(text) {
    updateSpeech(text);

    const toggle = document.getElementById('keoki-tts-toggle');
    if (toggle && toggle.innerText.includes('Muted')) return;

    try {
      const res = await fetch(`${WORKER_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (res.ok) {
        const audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        if (currentAudio) currentAudio.pause();
        currentAudio = new Audio(audioUrl);
        await currentAudio.play().catch(() => {});
        return;
      }
    } catch (e) {
      console.warn('[Keoki TTS] Falling back to Web Speech:', e);
    }

    // Natural browser voice fallback with warm male resonance
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.05;
      utter.pitch = 0.92;
      window.speechSynthesis.speak(utter);
    }
  }

  async function submitTextInput() {
    const input = document.getElementById('keoki-text-input');
    const val = input.value.trim();
    if (!val) return;
    input.value = '';
    await processAnswerWithBrain(val);
  }

  async function toggleVoiceRecording() {
    const btn = document.getElementById('keoki-voice-btn');
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunks = [];
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = async () => {
          updateSpeech("Uncle Keoki is listening with big ears...");
          const blob = new Blob(audioChunks, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('file', blob, 'audio.webm');

          try {
            const res = await fetch(`${WORKER_URL}/api/stt`, { method: 'POST', body: formData });
            const data = await res.json();
            if (data.text) {
              await processAnswerWithBrain(data.text);
            } else {
              speakUtterance("Sorry brah, couldn't catch that. Give 'em another shot or type below!");
            }
          } catch (err) {
            speakUtterance("Had a hiccup with the mic gateway. Go ahead and type it in!");
          }
        };
        mediaRecorder.start();
        btn.innerHTML = '<span>⏹️</span> <span>Stop & Process</span>';
        btn.style.background = '#ef4444';
      } catch (err) {
        updateSpeech("Microphone permission denied. No stress, you can type right here!");
      }
    } else {
      mediaRecorder.stop();
      btn.innerHTML = '<span>🎙️</span> <span>Click to Speak</span>';
      btn.style.background = '#0284c7';
    }
  }

  // Processes user answer using Uncle Keoki AI Brain for intent, personality, and slot cleaning
  async function processAnswerWithBrain(userInput) {
    const step = FORM_STEPS[currentStepIndex];
    if (!step) return;

    updateSpeech(`Uncle Keoki is thinking on "${userInput}"...`);

    let decision = { action: 'fill', cleanValue: userInput, keokiReply: '' };
    try {
      const res = await fetch(`${WORKER_URL}/api/brain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldLabel: step.label,
          speechPrompt: step.prompt,
          userInput: userInput
        })
      });
      if (res.ok) {
        decision = await res.json();
      }
    } catch (e) {
      console.warn('[Brain Error] Fallback to raw text:', e);
    }

    // 1. Handle Backtrack
    if (decision.action === 'back') {
      handleBacktrack(decision.keokiReply);
      return;
    }

    // 2. Handle Skip
    if (decision.action === 'skip') {
      handleSkip(decision.keokiReply);
      return;
    }

    // 3. Handle Fill
    fillDomElement(step.id, step.fieldId, decision.cleanValue || userInput);

    // Speak Uncle Keoki's personal reaction
    if (decision.keokiReply) {
      await speakUtterance(decision.keokiReply);
    }

    // Smartly advance wizard if fieldset is completed
    if (step.shouldAdvance) {
      setTimeout(() => advanceWizard(), 500);
    }

    currentStepIndex++;
    setTimeout(promptCurrentStep, 1000);
  }

  function handleBacktrack(customReply) {
    if (currentStepIndex > 0) {
      currentStepIndex--;
      goBackWizard();
    }
    const prev = FORM_STEPS[currentStepIndex];
    speakUtterance(customReply || `Alright, cruising back to ${prev.label}! ${prev.prompt}`);
  }

  function handleSkip(customReply) {
    currentStepIndex++;
    const next = FORM_STEPS[currentStepIndex];
    if (next) {
      speakUtterance(customReply || `Skipping that one, no sweat! ${next.prompt}`);
    } else {
      promptCurrentStep();
    }
  }

  // Smart form filler handling inputs, selects, custom Bootstrap checkboxes & label overlays
  function fillDomElement(stepId, fieldId, value) {
    if (stepId === 'select_programs') {
      clickCheckbox('chkSNAP');
      if (/money|financial|both/i.test(value)) clickCheckbox('chkMoney');
      return;
    }
    if (stepId === 'language_assistance') {
      if (/yes|interpreter/i.test(value)) clickCheckbox('interpreterOption1');
      else clickCheckbox('interpreterOption2');
      return;
    }
    if (stepId === 'english_proficiency') {
      if (/limited/i.test(value)) clickCheckbox('chkLimitedUnderstanding');
      else if (/not|does not/i.test(value)) clickCheckbox('chkDoesNotSpeakEnglish');
      else clickCheckbox('chkSpeaksEnglishWritesWell');
      return;
    }
    if (stepId === 'recaptcha_gate') {
      return;
    }
    if (stepId === 'food_household_counts') {
      const foodInput = document.querySelector('input[type="number"], input.form-control[name*="food" i]');
      if (foodInput) foodInput.value = value.match(/\d+/)?.[0] || '1';
      clickCheckbox('radPurchaseFoodYes');
      clickCheckbox('radPregnantNo');
      return;
    }
    if (stepId === 'expedited_questions') {
      if (/rent|mortgage|yes|1\d+/i.test(value)) clickCheckbox('radShelterExpensesYes');
      else clickCheckbox('radShelterExpensesNo');
      clickCheckbox('radCashSavingsNo');
      clickCheckbox('withoutPlaceToLiveNo');
      return;
    }

    const el = document.getElementById(fieldId);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.outline = '3px solid #10b981';
    el.style.boxShadow = '0 0 12px rgba(16, 185, 129, 0.5)';

    if (el.tagName.toLowerCase() === 'select') {
      el.value = /f/i.test(value) ? 'F' : 'M';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function clickCheckbox(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!el.checked) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) label.click();
      else el.click();
    }
    el.checked = true;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function advanceWizard() {
    const activeFieldset = Array.from(document.querySelectorAll('form.msform fieldset')).find(fs => window.getComputedStyle(fs).display !== 'none');
    if (activeFieldset) {
      const nextBtn = Array.from(activeFieldset.querySelectorAll('input[type="button"], button')).find(b => b.value === 'NEXT' || b.innerText.includes('NEXT'));
      if (nextBtn) { nextBtn.click(); return; }
    }
    const anyNext = Array.from(document.querySelectorAll('input[value="NEXT"], #next-btn')).find(b => b.offsetWidth > 0);
    if (anyNext) anyNext.click();
  }

  function goBackWizard() {
    const activeFieldset = Array.from(document.querySelectorAll('form.msform fieldset')).find(fs => window.getComputedStyle(fs).display !== 'none');
    if (activeFieldset) {
      const backBtn = Array.from(activeFieldset.querySelectorAll('input[type="button"], button')).find(b => b.value === 'BACK' || b.innerText.includes('BACK'));
      if (backBtn) { backBtn.click(); return; }
    }
    const anyBack = Array.from(document.querySelectorAll('input[value="BACK"]')).find(b => b.offsetWidth > 0);
    if (anyBack) anyBack.click();
  }

  function runMockFill() {
    speakUtterance("Aloha! Populating the application with Kai Keanu Kahale mock profile now!");
    const mock = [
      () => fillDomElement('select_programs', 'chkSNAP', 'SNAP'),
      () => advanceWizard(),
      () => fillDomElement('language_assistance', 'interpreterOption2', 'No'),
      () => advanceWizard(),
      () => fillDomElement('primary_language', 'txtPrimaryLanguageSpoken', 'English'),
      () => fillDomElement('english_proficiency', 'chkSpeaksEnglishWritesWell', 'adequate'),
      () => advanceWizard(),
      () => fillDomElement('applicant_first_name', 'txtApplicantFirstName', 'Kai'),
      () => fillDomElement('applicant_middle_name', 'txtApplicantMiddleName', 'Keanu'),
      () => fillDomElement('applicant_last_name', 'txtApplicantLastName', 'Kahale'),
      () => fillDomElement('applicant_phone', 'txtApplicantPhone', '8085550199'),
      () => fillDomElement('applicant_gender', 'dropdownGender', 'Male'),
      () => fillDomElement('applicant_ssn', 'txtApplicantSSN', '123-45-6789'),
      () => fillDomElement('applicant_dob', 'txtApplicantDOB', '1990-05-15'),
      () => fillDomElement('applicant_email', 'txtApplicantEmail', 'kai.kahale@example.com'),
      () => advanceWizard(),
      () => fillDomElement('res_address', 'txtResAddressLine1', '1234 Ala Moana Blvd'),
      () => fillDomElement('res_city', 'txtResAddressCity', 'Honolulu'),
      () => fillDomElement('res_zip', 'txtResAddressZip', '96814'),
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < mock.length) {
        mock[i]();
        i++;
      } else {
        clearInterval(interval);
        currentStepIndex = 15;
        speakUtterance("Chee-hoo! All mock fields filled and verified across the wizard!");
      }
    }, 400);
  }

  // Mount when page is loaded
  window.addEventListener('load', () => setTimeout(initUI, 1000));
  if (document.readyState === 'complete') setTimeout(initUI, 1000);
})();
