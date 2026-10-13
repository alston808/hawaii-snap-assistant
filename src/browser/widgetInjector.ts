import { Page } from 'playwright';

export async function injectVoiceWidget(page: Page) {
  try {
    await page.waitForLoadState('domcontentloaded');
  } catch (e) {}

  await page.evaluate(`(() => {
    if (document.getElementById('hawaii-snap-hud')) return;
    const target = document.body || document.documentElement;
    if (!target) return;

    const widget = document.createElement('div');
    widget.id = 'hawaii-snap-hud';
    widget.innerHTML = \`
      <div style="
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 380px;
        background: linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.94));
        color: #f8fafc;
        border-radius: 18px;
        box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(56, 189, 248, 0.2);
        padding: 18px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        z-index: 9999999;
        backdrop-filter: blur(12px);
      ">
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div id="snap-hud-status-dot" style="width: 10px; height: 10px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981;"></div>
            <strong style="font-size: 15px; color: #38bdf8; letter-spacing: 0.3px;">🌴 Keoki | SNAP Guide</strong>
          </div>
          
          <!-- Auto-Listen Toggle -->
          <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #94a3b8;">
            <label for="snap-hud-auto-listen" style="cursor: pointer; user-select: none;">Auto-Listen</label>
            <input type="checkbox" id="snap-hud-auto-listen" checked style="cursor: pointer; accent-color: #10b981;" />
          </div>
        </div>

        <!-- Assistant Speech Bubble -->
        <div id="snap-hud-speech-box" style="
          background: rgba(15, 23, 42, 0.85);
          border-radius: 10px;
          padding: 12px 14px;
          margin-bottom: 12px;
          min-height: 52px;
          font-size: 13.5px;
          line-height: 1.45;
          color: #f1f5f9;
          border-left: 3px solid #38bdf8;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
        ">
          Aloha! Keoki is ready.
        </div>

        <!-- Transcript Preview -->
        <div id="snap-hud-transcript-box" style="
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 12px;
          font-style: italic;
          min-height: 18px;
        ">
          Status: Ready for input
        </div>

        <!-- Backup Text Chat Input -->
        <div style="display: flex; gap: 6px; margin-bottom: 12px;">
          <input id="snap-hud-text-input" type="text" placeholder="Type answer & press Enter..." style="
            flex: 1;
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            background: rgba(30, 41, 59, 0.8);
            color: #fff;
            font-size: 13px;
            outline: none;
            transition: border-color 0.2s;
          " />
          <button id="snap-hud-send-btn" style="
            padding: 8px 14px;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          ">Send</button>
        </div>

        <!-- Voice Control Bar -->
        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="snap-hud-mic-btn" style="
            flex: 1;
            padding: 9px;
            background: linear-gradient(135deg, #0284c7, #0369a1);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
            transition: all 0.2s ease;
          ">
            <span>🎙️</span> <span id="snap-hud-mic-label">Listening (Auto)...</span>
          </button>
        </div>
      </div>
    \`;

    target.appendChild(widget);

    // Audio recording & Speech recognition setup
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    const micBtn = document.getElementById('snap-hud-mic-btn');
    const micLabel = document.getElementById('snap-hud-mic-label');
    const statusDot = document.getElementById('snap-hud-status-dot');
    const autoListenToggle = document.getElementById('snap-hud-auto-listen');
    const textInput = document.getElementById('snap-hud-text-input');
    const sendBtn = document.getElementById('snap-hud-send-btn');

    // Auto-listen silence detector
    let audioContext = null;
    let analyser = null;
    let silenceTimer = null;

    const startRecording = async () => {
      if (isRecording) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunks = [];
        isRecording = true;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          isRecording = false;
          if (audioChunks.length === 0) return;
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          if (audioBlob.size < 1000) return; // Ignore micro fragments

          const arrayBuffer = await audioBlob.arrayBuffer();
          const base64Audio = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          if (window.__onUserAudioRecorded) {
            window.__onUserAudioRecorded(base64Audio);
          }
        };

        // Voice activity silence detection
        try {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const source = audioContext.createMediaStreamSource(stream);
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          let spokeOnce = false;

          const checkVolume = () => {
            if (!isRecording) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;

            if (avg > 12) {
              spokeOnce = true;
              clearTimeout(silenceTimer);
              silenceTimer = setTimeout(() => {
                if (autoListenToggle.checked && isRecording && spokeOnce) {
                  stopRecording();
                }
              }, 1600); // 1.6s pause marks end of sentence
            }
            requestAnimationFrame(checkVolume);
          };
          requestAnimationFrame(checkVolume);
        } catch (e) {}

        mediaRecorder.start(250);
        micLabel.textContent = autoListenToggle.checked ? 'Listening (Speak now)...' : 'Recording...';
        micBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        statusDot.style.background = '#ef4444';
        statusDot.style.boxShadow = '0 0 10px #ef4444';
      } catch (err) {
        console.error('Microphone error:', err);
      }
    };

    const stopRecording = () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      }
      isRecording = false;
      micLabel.textContent = autoListenToggle.checked ? 'Auto-Listen On' : 'Click to Speak';
      micBtn.style.background = 'linear-gradient(135deg, #0284c7, #0369a1)';
      statusDot.style.background = '#10b981';
      statusDot.style.boxShadow = '0 0 8px #10b981';
    };

    // Toggle mic button
    micBtn.addEventListener('click', () => {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    });

    // Auto-listen state
    autoListenToggle.addEventListener('change', () => {
      if (!autoListenToggle.checked && isRecording) {
        stopRecording();
      }
    });

    // Text chat submit
    const submitText = () => {
      const val = textInput.value.trim();
      if (!val) return;
      textInput.value = '';
      if (window.__updateUserTranscript) {
        window.__updateUserTranscript(val);
      }
      if (window.__onUserTextSubmitted) {
        window.__onUserTextSubmitted(val);
      }
    };

    if (sendBtn) sendBtn.addEventListener('click', submitText);
    if (textInput) {
      textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitText();
        }
      });
    }

    // Audio Playback with auto-listen triggering on completion
    window.__playAssistantAudio = (base64Audio) => {
      const audio = new Audio(\`data:audio/mp3;base64,\${base64Audio}\`);
      statusDot.style.background = '#38bdf8';
      statusDot.style.boxShadow = '0 0 10px #38bdf8';
      
      audio.onended = () => {
        statusDot.style.background = '#10b981';
        statusDot.style.boxShadow = '0 0 8px #10b981';
        // When Keoki finishes speaking, automatically open mic if auto-listen is ON
        if (autoListenToggle.checked) {
          setTimeout(startRecording, 300);
        }
      };

      audio.play().catch((e) => {
        console.log('Autoplay deferred:', e);
        if (autoListenToggle.checked) {
          setTimeout(startRecording, 500);
        }
      });
    };

    window.__updateAssistantText = (text) => {
      const box = document.getElementById('snap-hud-speech-box');
      if (box) box.textContent = text;
    };

    window.__updateUserTranscript = (text) => {
      const box = document.getElementById('snap-hud-transcript-box');
      if (box) box.textContent = \`You: "\${text}"\`;
    };
  })()`);
}
