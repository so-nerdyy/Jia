Complete Plan: Jia - AI Visual Assistant PWA
Summary
A Progressive Web App that helps visually impaired users understand their surroundings using camera capture, GPT-4 Vision analysis, and text-to-speech output with voice command control.
---
Architecture
┌─────────────────────────────────────────────────────┐
│                    PWA (React)                      │
├─────────────┬─────────────┬─────────────┬──────────┤
│   Camera    │    Voice    │ Description │   UI     │
│  Component  │   Control   │   Panel     │  Shell   │
└──────┬──────┴──────┬──────┴──────┬──────┴──────────┘
       │             │             │
       ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────────┐
│ MediaDev │  │ WebSpeech│  │ OpenAI API   │
│   API    │  │   API    │  │ GPT-4 Vision │
└──────────┘  └──────────┘  └──────────────┘
---
File Structure
ai-visual-assistant/
├── public/
│   ├── manifest.json
│   ├── icons/
│   │   ├── pwa-192.png
│   │   └── pwa-512.png
│   └── sounds/
│       ├── capture.mp3
│       └── success.mp3
├── src/
│   ├── components/
│   │   ├── Camera.jsx
│   │   ├── VoiceControl.jsx
│   │   ├── Description.jsx
│   │   └── StatusIndicator.jsx
│   ├── hooks/
│   │   ├── useCamera.js
│   │   ├── useSpeech.js
│   │   └── useVision.js
│   ├── utils/
│   │   └── prompts.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env.example
├── .gitignore
├── index.html
├── vite.config.js
└── package.json
---
Core Components
1. useCamera.js Hook
- Request camera permissions
- Stream video to <video> element
- Capture frame to canvas/base64
- Handle front/back camera toggle
2. useVision.js Hook
- Accept base64 image
- Call OpenAI GPT-4 Vision API
- Return description text
- Handle loading/error states
3. useSpeech.js Hook
- TTS: window.speechSynthesis for reading descriptions
- Recognition: window.SpeechRecognition for voice commands
- Command parser: "capture", "read this", "describe", "stop", "repeat"
4. Camera.jsx Component
- Full-screen video preview
- Large capture button (center, bottom)
- Camera switch button
- Flash animation on capture
5. VoiceControl.jsx Component
- Microphone indicator (active/listening)
- Voice command button (hold to speak)
- Visual feedback for recognized commands
6. Description.jsx Component
- Display AI response text
- Large, high-contrast text
- Play/pause/replay TTS controls
- Copy text button
---
Prompt Engineering
// prompts.js
export const PROMPTS = {
  general: "Describe what you see in this image in detail. Focus on objects, people, text, and any important visual elements. Be specific and helpful for someone who cannot see the image.",
  
  reading: "Extract and read all visible text from this image. Maintain the reading order and formatting. If there's no text, say 'No readable text found.'",
  
  describe: "What is in this image? Give a clear, concise description focusing on the main subject or scene."
};
---
API Integration
// useVision.js
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENAI_API_KEY}`
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` }}
      ]
    }],
    max_tokens: 500
  })
});
---
Accessibility Features
| Feature | Implementation |
|---------|----------------|
| High contrast | Dark background, white/yellow text |
| Large targets | Min 64px touch targets |
| Audio feedback | Sound on capture, success, error |
| Screen reader | ARIA labels, live regions |
| Voice control | Full hands-free operation |
| Visual feedback | Loading states, progress indicators |
---
PWA Configuration
// manifest.json
{
  name: AI Visual Assistant,
  short_name: VisionAI,
  description: AI-powered visual assistant for accessibility,
  start_url: /,
  display: standalone,
  orientation: portrait,
  theme_color: #1a1a2e,
  background_color: #1a1a2e,
  icons: [
    { src: /icons/pwa-192.png, sizes: 192x192, type: image/png },
    { src: /icons/pwa-512.png, sizes: 512x512, type: image/png }
  ]
}
---
Environment Variables
VITE_OPENAI_API_KEY=your_key_here
---
Implementation Timeline (24-36 hrs)
| Hours | Phase | Deliverable |
|-------|-------|-------------|
| 0-2 | Project setup | Vite + React, dependencies, manifest |
| 2-5 | Camera | Working camera preview + capture |
| 5-9 | OpenAI | GPT-4 Vision integration working |
| 9-13 | TTS | Auto-read descriptions |
| 13-18 | Voice commands | SpeechRecognition integrated |
| 18-22 | UI/UX | Polished accessible interface |
| 22-26 | PWA | Installable, service worker |
| 26+ | Polish | Testing, edge cases, demo prep |
---
Dependencies
{
  dependencies: {
    react: ^18.2.0,
    react-dom: ^18.2.0
  },
  devDependencies: {
    @vitejs/plugin-react: ^4.0.0,
    vite: ^5.0.0,
    vite-plugin-pwa: ^0.17.0
  }
}
---
Next Steps (When Ready to Build)
1. npm create vite@latest ai-visual-assistant -- --template react
2. cd ai-visual-assistant && npm install
3. Create folder structure
4. Implement hooks in order: useCamera → useVision → useSpeech
5. Build components
6. Wire up App.jsx
7. Add PWA config
8. Test on real mobile device