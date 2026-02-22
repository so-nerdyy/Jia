# Jia - AI Visual Assistant

A voice-first AI companion for visually impaired people. Jia uses computer vision and natural language to describe the environment, answer questions, and provide accessibility assistance.

## Features

- 🎤 **Voice-First Interface** - Speak naturally to interact with the AI
- 👁️ **Computer Vision** - Describes what the camera sees in real-time
- 🔊 **Natural Text-to-Speech** - Uses the best available natural-sounding voices
- ⚡ **Fast Response** - Instant speech recognition and AI responses
- 🛡️ **Safety First** - Proactively warns about hazards and obstacles

## Quick Start with Ngrok

Ngrok allows you to expose your local server to the internet, enabling voice interactions from any device.

### Prerequisites

- Node.js 18+
- An OpenAI API key
- Ngrok account (free tier works)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/so-nerdyy/Jia.git
   cd Jia
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up your OpenAI API key**
   ```bash
   # Create .env file
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   OPENAI_API_KEY=your_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Expose with Ngrok (in a new terminal)**
   ```bash
   ngrok http 5173
   ```

6. **Access Jia**
   - Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
   - Open it in your browser (ON YOUR PHONE!)
   - Grant camera and microphone permissions

### Using Ngrok TCP for dev server (alternative)

If you want to use ngrok with the dev server on a specific port:

```bash
# Terminal 1: Start the app on port 5173
npm run dev

# Terminal 2: Start ngrok
ngrok tcp 5173
```

Then access using the TCP URL provided by ngrok.

## How It Works

### Architecture

- **Frontend**: React + Vite (PWA capable)
- **AI Chat**: OpenAI GPT-4o (configurable to GPT-5 when available)
- **Voice**: Web Speech API (SpeechRecognition + SpeechSynthesis)
- **Vision**: Camera API + OpenAI Vision

### Key Files

| File | Purpose |
|------|---------|
| [`vite.config.js`](vite.config.js) | API proxy and model configuration |
| [`src/hooks/useConversation.js`](src/hooks/useConversation.js) | Main conversation logic |
| [`src/hooks/useSpeech.js`](src/hooks/useSpeech.js) | Voice input/output handling |
| [`src/components/Camera.jsx`](src/components/Camera.jsx) | Camera feed component |

## Configuration

### Changing the AI Model

In [`vite.config.js`](vite.config.js), modify the `DEFAULT_MODEL`:

```javascript
const DEFAULT_MODEL = 'gpt-5'; // or 'gpt-4o', 'gpt-4o-mini'
```

Note: GPT-5 requires API access. Check your OpenAI dashboard for availability.

### Voice Settings

The app automatically selects the best natural-sounding voice available on your device. Voice selection happens in [`useConversation.js`](src/hooks/useConversation.js:115-139).

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- React 18
- Vite
- OpenAI API (GPT-4o Vision)
- Web Speech API
- MediaDevices API

## License

MIT
