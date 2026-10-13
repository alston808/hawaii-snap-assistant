# 🌴 Hawaii SNAP Voice-Guided Assistant (Uncle Keoki)

A voice assistant and browser companion for navigating and applying for Hawaii Food Stamps (SNAP) at the [Hawaii DHS PAIS Portal](https://pais-benefits.dhs.hawaii.gov/).

Available in 3 deployment formats:
1. **Desktop Playwright CLI**: Automated Chromium browser with floating HUD and voice controls.
2. **Tampermonkey Userscript**: 1-click in-browser userscript directly on the DHS portal.
3. **Chrome Extension (Manifest V3)**: Unpacked Chrome extension with persistent portal injection.
4. **Cloudflare Worker Gateway**: Free serverless edge API routing STT, TTS, and LLM without exposing secrets.

---

## 🚀 Quick Start (Playwright CLI)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Add your free API keys:
- **`GROQ_API_KEY`**: Free tier Groq Whisper STT & Llama-3.3 brain ([console.groq.com](https://console.groq.com))
- **`FISH_API_KEY`**: Free Fish Audio TTS ([fish.audio](https://fish.audio))

*(If keys are omitted, the assistant falls back to browser Web Speech synthesis).*

### 3. Run Modes

- **Automated Mock Mode (No Mic / API keys required)**:
  ```bash
  npm run start:mock
  ```
  Launches the browser and automatically navigates and populates all 20 wizard steps with verified mock profile data.

- **Headless Mock Verification Test**:
  ```bash
  npm run test:mock
  ```

- **Interactive Voice Mode**:
  ```bash
  npm start
  ```

---

## ⚡ Cloudflare Worker API Gateway (`worker/`)

Keeps all API keys secure while serving requests from the Tampermonkey userscript and Chrome extension.

### Deploy in 1 Minute (100k free requests/day):
```bash
cd worker
npm install
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put FISH_API_KEY
npx wrangler deploy
```

Endpoints provided:
- `POST /api/stt`: Audio WebM &rarr; Groq Whisper transcription
- `POST /api/tts`: Text &rarr; Fish Audio speech synthesis
- `POST /api/brain`: Field + transcript &rarr; Structured slot extraction

---

## 🐒 Tampermonkey Userscript (`userscript/`)

Install the userscript directly in Tampermonkey, Violentmonkey, or Greasemonkey:
1. Open Tampermonkey &rarr; **Create a new script**.
2. Paste the contents of [`userscript/hawaii-snap-assistant.user.js`](./userscript/hawaii-snap-assistant.user.js).
3. Update `WORKER_URL` with your Cloudflare Worker URL (or keep default).
4. Navigate to [Hawaii DHS PAIS Portal](https://pais-benefits.dhs.hawaii.gov/).
5. Uncle Keoki's HUD appears automatically in the bottom-right corner!

---

## 🧩 Chrome Extension (`chrome-extension/`)

Load Uncle Keoki as an unpacked extension:
1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked** and select the [`chrome-extension`](./chrome-extension) directory.
4. Visit [https://pais-benefits.dhs.hawaii.gov/](https://pais-benefits.dhs.hawaii.gov/).

---

## 📋 Mapped Wizard Steps

The assistant maps and validates all 20 sections of the Hawaii PAIS SNAP registration wizard:

| Step | Form Section | Target Selector |
| :--- | :--- | :--- |
| 1 | Program Selection | `#chkSNAP` |
| 2 | Interpreter Services | `#interpreterOption2` |
| 3 | Primary Language | `#txtPrimaryLanguageSpoken` |
| 4 | English Proficiency | `#chkSpeaksEnglishWritesWell` |
| 5-8 | Name & Contact | `#txtApplicantFirstName`, `#txtApplicantLastName`, `#txtApplicantPhone` |
| 9-10 | Gender & SSN | `#dropdownGender`, `#txtApplicantSSN` |
| 11-12 | Birthday & Email | `#txtApplicantDOB`, `#txtApplicantEmail` |
| 13-15 | Hawaii Address | `#txtResAddressLine1`, `#txtResAddressCity`, `#txtResAddressZip` |
| 16 | reCAPTCHA | `#g-recaptcha-response` |
| 17 | Spouse Details | `#txtSpouseFirstName` |
| 18 | Household Counts | Spinbutton `#foodCount` |
| 19 | Shelter Deductions | `#radShelterExpensesYes` |
| 20 | Roster Confirmation | `+ Add Another Person` / `NEXT` |

---

## 📄 License

MIT
