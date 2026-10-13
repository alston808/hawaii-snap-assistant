// ==UserScript==
// @name         🌴 Uncle Keoki: Hawaii SNAP Voice Assistant
// @namespace    https://pais-benefits.dhs.hawaii.gov/
// @version      1.0.0
// @description  AI Voice-guided assistant and auto-navigator for Hawaii DHS PAIS benefits portal
// @author       alston808
// @match        https://pais-benefits.dhs.hawaii.gov/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  // Configurable Worker Gateway (or localhost during development)
  const WORKER_URL = GM_getValue('worker_url', 'https://hawaii-snap-assistant-gateway.<your-subdomain>.workers.dev');

  // Form field steps mapped directly to Hawaii DHS PAIS DOM
  const FORM_STEPS = [
    { id: 'select_programs', label: 'Benefit Programs', prompt: "Aloha! Are we applying for SNAP food money, or going for financial assistance too?", targetId: 'chkSNAP' },
    { id: 'language_assistance', label: 'Interpreter Needed', prompt: "Do you need the state to provide an interpreter? Say No or Yes.", targetId: 'interpreterOption2' },
    { id: 'primary_language', label: 'Primary Language', prompt: "What primary language is spoken in your household?", targetId: 'txtPrimaryLanguageSpoken' },
    { id: 'english_proficiency', label: 'English Proficiency', prompt: "How's your English reading and speaking? Adequate, or limited?", targetId: 'chkSpeaksEnglishWritesWell' },
    { id: 'applicant_first_name', label: 'First Name', prompt: "What is your legal first name?", targetId: 'txtApplicantFirstName' },
    { id: 'applicant_middle_name', label: 'Middle Name', prompt: "Got a middle name, or say none?", targetId: 'txtApplicantMiddleName' },
    { id: 'applicant_last_name', label: 'Last Name', prompt: "What is your legal last name?", targetId: 'txtApplicantLastName' },
    { id: 'applicant_phone', label: 'Phone Number', prompt: "What is your 10-digit phone number?", targetId: 'txtApplicantPhone' },
    { id: 'applicant_gender', label: 'Gender', prompt: "Official gender for state records: Male or Female?", targetId: 'dropdownGender' },
    { id: 'applicant_ssn', label: 'SSN', prompt: "What is your 9-digit Social Security Number? (or say skip)", targetId: 'txtApplicantSSN' },
    { id: 'applicant_dob', label: 'Date of Birth', prompt: "What is your date of birth?", targetId: 'txtApplicantDOB' },
    { id: 'applicant_email', label: 'Email Address', prompt: "What is your email address?", targetId: 'txtApplicantEmail' },
    { id: 'res_address', label: 'Street Address', prompt: "What is your Hawaii street address?", targetId: 'txtResAddressLine1' },
    { id: 'res_city', label: 'City', prompt: "What city or town is that in?", targetId: 'txtResAddressCity' },
    { id: 'res_zip', label: 'ZIP Code', prompt: "What is your 5-digit Hawaii ZIP code?", targetId: 'txtResAddressZip' },
    { id: 'recaptcha_gate', label: 'Security Check', prompt: "Please check the 'I am not a robot' box, then click Ready!", targetId: 'g-recaptcha-response' },
    { id: 'spouse_info', label: 'Spouse', prompt: "Are you married and living together, or solo? Say No or their name.", targetId: 'txtSpouseFirstName' },
    { id: 'food_household_counts', label: 'Household Size', prompt: "How many people purchase and prepare food together in your home?", targetId: 'foodCount' },
    { id: 'expedited_questions', label: 'Shelter Expenses', prompt: "Do you pay monthly rent or mortgage shelter costs?", targetId: 'radShelterExpensesYes' },
    { id: 'household_roster', label: 'Roster Review', prompt: "Review your household roster on screen. Does it look accurate?", targetId: 'roster' },
  ];

  let currentStepIndex = 0;
  let mediaRecorder = null;
  let audioChunks = [];

  function initUI() {
    if (document.getElementById('keoki-assistant-hud')) return;

    const hud = document.createElement('div');
    hud.id = 'keoki-assistant-hud';
    hud.innerHTML = `
      <div style="position:fixed;bottom:20px;right:20px;width:360px;background:linear-gradient(135deg,#0f172a,#1e293b);color:#f8fafc;border-radius:18px;box-shadow:0 12px 36px rgba(0,0,0,0.45);font-family:system-ui,-apple-system,sans-serif;z-index:999999;padding:18px;border:2px solid #0ea5e9;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:26px;">🌴</span>
            <div>
              <strong style="font-size:15px;display:block;color:#38bdf8;">Uncle Keoki</strong>
              <span style="font-size:11px;color:#94a3b8;" id="keoki-step-info">Step 1 of ${FORM_STEPS.length}</span>
            </div>
          </div>
          <button id="keoki-mock-btn" style="background:#334155;color:#e2e8f0;border:none;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;">Mock Fill</button>
        </div>
        <div id="keoki-speech-box" style="font-size:13px;line-height:1.45;background:#090d16;padding:12px;border-radius:10px;margin-bottom:12px;min-height:50px;border:1px solid #1e293b;">
          Aloha! I'm Uncle Keoki, your guide for Hawaii Food Stamps. Let's get your benefits sorted!
        </div>
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <input type="text" id="keoki-text-input" placeholder="Type answer or speak..." style="flex:1;background:#0f172a;border:1px solid #334155;color:#fff;border-radius:8px;padding:8px 10px;font-size:13px;">
          <button id="keoki-send-btn" style="background:#0284c7;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;font-weight:600;">Send</button>
        </div>
        <button id="keoki-voice-btn" style="width:100%;background:#0284c7;color:#fff;border:none;border-radius:10px;padding:11px;font-weight:bold;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;">
          <span>🎙️</span> <span>Click to Speak</span>
        </button>
      </div>
    `;
    document.body.appendChild(hud);

    document.getElementById('keoki-send-btn').onclick = submitTextInput;
    document.getElementById('keoki-text-input').onkeydown = (e) => { if (e.key === 'Enter') submitTextInput(); };
    document.getElementById('keoki-voice-btn').onclick = toggleVoiceRecording;
    document.getElementById('keoki-mock-btn').onclick = runMockFill;

    promptCurrentStep();
  }

  function promptCurrentStep() {
    if (currentStepIndex >= FORM_STEPS.length) {
      updateSpeech("Chee-hoo! All questions completed! Double check everything on screen before submitting.");
      return;
    }
    const step = FORM_STEPS[currentStepIndex];
    document.getElementById('keoki-step-info').innerText = `Step ${currentStepIndex + 1} of ${FORM_STEPS.length}: ${step.label}`;
    updateSpeech(step.prompt);
    speakUtterance(step.prompt);
  }

  function updateSpeech(text) {
    const box = document.getElementById('keoki-speech-box');
    if (box) box.innerText = text;
  }

  function speakUtterance(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.05;
      utter.pitch = 0.95;
      window.speechSynthesis.speak(utter);
    }
  }

  async function submitTextInput() {
    const input = document.getElementById('keoki-text-input');
    const val = input.value.trim();
    if (!val) return;
    input.value = '';
    await processAnswer(val);
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
          updateSpeech("Uncle Keoki is listening and transcribing...");
          const blob = new Blob(audioChunks, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('file', blob, 'audio.webm');

          try {
            const res = await fetch(`${WORKER_URL}/api/stt`, { method: 'POST', body: formData });
            const data = await res.json();
            if (data.text) {
              updateSpeech(`Heard: "${data.text}"`);
              await processAnswer(data.text);
            }
          } catch (err) {
            updateSpeech("Could not reach voice gateway, please type your response!");
          }
        };
        mediaRecorder.start();
        btn.innerHTML = '<span>⏹️</span> <span>Stop & Process</span>';
        btn.style.background = '#ef4444';
      } catch (err) {
        updateSpeech("Microphone permission denied. You can type in the box below!");
      }
    } else {
      mediaRecorder.stop();
      btn.innerHTML = '<span>🎙️</span> <span>Click to Speak</span>';
      btn.style.background = '#0284c7';
    }
  }

  async function processAnswer(answerText) {
    const step = FORM_STEPS[currentStepIndex];
    if (!step) return;

    // Fill DOM target
    fillDomElement(step.targetId, answerText);

    currentStepIndex++;
    setTimeout(promptCurrentStep, 600);
  }

  function fillDomElement(id, value) {
    const el = document.getElementById(id);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.outline = '3px solid #10b981';

    if (el.type === 'checkbox' || el.type === 'radio') {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) label.click();
      else el.click();
    } else if (el.tagName.toLowerCase() === 'select') {
      el.value = /f/i.test(value) ? 'F' : 'M';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function runMockFill() {
    updateSpeech("Populating Hawaii SNAP application with Kai Keanu Kahale mock profile...");
    const mockValues = {
      chkSNAP: 'on',
      interpreterOption2: 'on',
      txtPrimaryLanguageSpoken: 'English',
      chkSpeaksEnglishWritesWell: 'on',
      txtApplicantFirstName: 'Kai',
      txtApplicantMiddleName: 'Keanu',
      txtApplicantLastName: 'Kahale',
      txtApplicantPhone: '8085550199',
      dropdownGender: 'M',
      txtApplicantSSN: '123-45-6789',
      txtApplicantDOB: '1990-05-15',
      txtApplicantEmail: 'kai.kahale@example.com',
      txtResAddressLine1: '1234 Ala Moana Blvd',
      txtResAddressCity: 'Honolulu',
      txtResAddressZip: '96814',
    };

    for (const [id, val] of Object.entries(mockValues)) {
      fillDomElement(id, val);
    }
    updateSpeech("✅ All personal, address, and benefit fields filled with verified mock data!");
  }

  // Mount when page is loaded
  window.addEventListener('load', () => setTimeout(initUI, 1200));
  if (document.readyState === 'complete') setTimeout(initUI, 1200);
})();
