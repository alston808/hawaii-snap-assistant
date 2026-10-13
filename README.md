# 🌴 Hawaii SNAP Voice-Guided Assistant (Uncle Keoki)

A voice assistant and browser companion for navigating and applying for Hawaii Food Stamps (SNAP) at the [Hawaii DHS PAIS Portal](https://pais-benefits.dhs.hawaii.gov/).

<div align="center">

[![Install Userscript](https://img.shields.io/badge/Tampermonkey%20%2F%20Violentmonkey-1--Click%20Install%20Userscript-10b981?style=for-the-badge&logo=tampermonkey&logoColor=white)](https://raw.githubusercontent.com/alston808/hawaii-snap-assistant/main/userscript/hawaii-snap-assistant.user.js)
[![Download Chrome Extension](https://img.shields.io/badge/Chrome%20Extension-Download%20ZIP-0284c7?style=for-the-badge&logo=googlechrome&logoColor=white)](https://raw.githubusercontent.com/alston808/hawaii-snap-assistant/main/hawaii-snap-assistant-chrome.zip)
[![GitHub Repo](https://img.shields.io/badge/GitHub-alston808%2Fhawaii--snap--assistant-181717?style=for-the-badge&logo=github)](https://github.com/alston808/hawaii-snap-assistant)

</div>

---

## ⚡ 1-Click Install Options

### Option A: Userscript (Tampermonkey, Violentmonkey, Greasemonkey)
If you have **Tampermonkey** or **Violentmonkey** installed in your browser:
1. **[Click here to Install Userscript directly](https://raw.githubusercontent.com/alston808/hawaii-snap-assistant/main/userscript/hawaii-snap-assistant.user.js)**.
2. Your monkey extension will automatically open its native **"Install Userscript"** confirmation page. Click **Install**.
3. Go to [https://pais-benefits.dhs.hawaii.gov/](https://pais-benefits.dhs.hawaii.gov/) — Uncle Keoki's assistant HUD will appear in the bottom-right corner!
*(Auto-updates are enabled via `@updateURL` directly from this GitHub repository).*

---

### Option B: Chrome Extension (Manifest V3)
1. **[Download hawaii-snap-assistant-chrome.zip](https://raw.githubusercontent.com/alston808/hawaii-snap-assistant/main/hawaii-snap-assistant-chrome.zip)** and extract it to a folder.
2. In Google Chrome, go to `chrome://extensions`.
3. In the top-right corner, toggle on **Developer mode**.
4. Click **Load unpacked** (top-left) and select the extracted folder.
5. Open [https://pais-benefits.dhs.hawaii.gov/](https://pais-benefits.dhs.hawaii.gov/).

---

## ❓ FAQ: Publishing & Developer Accounts

### *Can I use my Google Play Store Developer account to publish or test Chrome Extensions?*
> **No.** Although both use your Google account, **Google Play Console** (Android) and the **Chrome Web Store Developer Dashboard** are entirely separate platforms:
> - **Google Play Console**: One-time $25 fee for Android APKs/AABs.
> - **Chrome Web Store Dashboard**: Separate one-time $5 developer registration fee.
>
> **However, you do not need the Chrome Web Store at all!**
> 1. Anyone can install the **Userscript** with 1 click via Tampermonkey/Violentmonkey without any store fees, reviews, or approvals.
> 2. Anyone can load the **Unpacked Extension** in Chrome with Developer Mode enabled.
> 3. If you decide to register for the Chrome Web Store ($5 one-time), you can publish the extension as **Private** (shared only with test email accounts) or **Unlisted** (direct link only, not indexed in search).

---

## 🚀 Desktop Playwright CLI

For local headless development and automated testing:

```bash
npm install
cp .env.example .env
```

### Run Modes
- **Interactive Voice Mode**:
  ```bash
  npm start
  ```
- **Automated Mock Run (Fills all 20 steps with mock data)**:
  ```bash
  npm run start:mock
  ```
- **Headless Regression Test**:
  ```bash
  npm run test:mock
  ```
- **Package Chrome Extension ZIP**:
  ```bash
  npm run package:extension
  ```

---

## 🛡️ Cloudflare Worker API Gateway (`worker/`)

A serverless edge proxy that keeps your `GROQ_API_KEY` and `FISH_API_KEY` secure so they are never bundled into client-side scripts.

### Deploy in 1 Minute (Free 100,000 requests/day):
```bash
cd worker
npm install
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put FISH_API_KEY
npx wrangler deploy
```

Endpoints:
- `POST /api/stt`: Audio WebM &rarr; Groq Whisper transcription
- `POST /api/tts`: Text &rarr; Fish Audio speech synthesis
- `POST /api/brain`: Field + transcript &rarr; Structured slot extraction

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
