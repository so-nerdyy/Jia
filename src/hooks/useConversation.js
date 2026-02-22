/**
 * useConversation — fast, voice-first AI assistant
 *
 * - SpeechRecognition for instant transcription (no Whisper API)
 * - speechSynthesis for instant TTS (no OpenAI TTS API)
 * - Only network call is GPT chat stream
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Config ────────────────────────────────────────────────────────────────
const PROACTIVE_INTERVAL_MS = 25000;
const SHRINK_DURATION_MS = 2000;
const SPEECH_PAUSE_MS = 500;
const SENTENCE_SPLIT = /(?<=[.!?])\s+/;

const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

function playThinkingChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    setTimeout(() => ctx.close(), 600);
  } catch { /* silent fail */ }
}

const SYSTEM_PROMPT = `You are Jia, a warm and caring AI companion for visually impaired people. You speak naturally, like a trusted friend who happens to be their eyes.

Your personality:
- Warm, calm, and reassuring
- Proactive — if you notice something important, say it without being asked
- Concise — short natural sentences, not paragraphs
- Never say "I can see in the image" — just describe like you're there

Your job:
- Continuously describe the environment as it changes
- Warn about hazards immediately: "Watch out — there are stairs just ahead"
- Guide navigation: "There's a door on your right", "The hallway is clear ahead"
- Answer questions conversationally, using what you can see
- Confirm when the user has completed a task: "Good, you've made it through the door"
- Keep track of context across the whole conversation

Response style:
- Max 2-3 sentences per turn unless asked for more
- Speak in present tense like you're narrating live
- If nothing changed and nothing to say, stay silent (respond with exactly: [SILENT])`;

export function useConversation({ captureFrame }) {
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState('');
  const [currentJiaText, setCurrentJiaText] = useState('');
  const [currentUserText, setCurrentUserText] = useState('');
  const [ringScale, setRingScale] = useState(1);

  const activeRef = useRef(false);
  const speakingRef = useRef(false);
  const thinkingRef = useRef(false);
  const sendingRef = useRef(false);
  const messagesRef = useRef([]);
  const recognitionRef = useRef(null);
  const pendingUtterancesRef = useRef(0);
  const transcriptRef = useRef('');
  const proactiveTimerRef = useRef(null);
  const lastFrameHashRef = useRef('');
  const startListeningRef = useRef(null);
  const shrinkRAFRef = useRef(null);
  const speechPauseRef = useRef(null);
  const hadSpeechRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { activeRef.current = isActive; }, [isActive]);
  useEffect(() => { speakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { thinkingRef.current = isThinking; }, [isThinking]);
  useEffect(() => { sendingRef.current = isSending; }, [isSending]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // ── Animation cleanup ─────────────────────────────────────────────────
  const stopAnimations = useCallback(() => {
    if (shrinkRAFRef.current) {
      cancelAnimationFrame(shrinkRAFRef.current);
      shrinkRAFRef.current = null;
    }
    if (speechPauseRef.current) {
      clearTimeout(speechPauseRef.current);
      speechPauseRef.current = null;
    }
  }, []);

  // ── Kill recognition cleanly ──────────────────────────────────────────
  const killRecognition = useCallback(() => {
    stopAnimations();
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, [stopAnimations]);

  // Find the best available natural-sounding voice
  const getBestVoice = () => {
    const voices = window.speechSynthesis?.getVoices() || [];
    
    // Prefer neural/natural voices (Google Neural2, Microsoft Zira, Apple, Samsung)
    const preferredPatterns = [
      'Neural2',
      'Google US English',
      'Microsoft Zira',
      'Samantha',
      'Karen',
      'Daniel',
      'Moira',
      'Nunana'
    ];
    
    // First try to find a preferred voice
    for (const pattern of preferredPatterns) {
      const found = voices.find(v => v.name.includes(pattern) && v.lang.startsWith('en'));
      if (found) return found;
    }
    
    // Fallback to any English voice
    return voices.find(v => v.lang.startsWith('en')) || null;
  };

  // ── TTS via browser speechSynthesis ────────────────────────────────────
  const stopAllAudio = useCallback(() => {
    window.speechSynthesis?.cancel();
    pendingUtterancesRef.current = 0;
    setIsSpeaking(false);
    speakingRef.current = false;
  }, []);

  const speakSentence = useCallback((sentence) => {
    if (!sentence.trim() || sentence === '[SILENT]') return;

    const utterance = new SpeechSynthesisUtterance(sentence);
    
    // Use best available natural voice
    const bestVoice = getBestVoice();
    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang || 'en-US';
    }
    
    // Slightly faster rate feels more natural/engaging without adding delay perception
    utterance.rate = 1.05;
    utterance.pitch = 1;
    
    // Enhance naturalness with slight volume variation
    utterance.volume = 1;

    pendingUtterancesRef.current++;
    setIsSpeaking(true);
    speakingRef.current = true;

    const onDone = () => {
      pendingUtterancesRef.current--;
      if (pendingUtterancesRef.current <= 0) {
        pendingUtterancesRef.current = 0;
        setIsSpeaking(false);
        speakingRef.current = false;
        setCurrentJiaText('');
        // Resume listening - but don't wait, allow user to speak anytime
        if (activeRef.current && !thinkingRef.current) {
          setTimeout(() => startListeningRef.current?.(), 100);
        }
      }
    };

    utterance.onend = onDone;
    utterance.onerror = onDone;

    window.speechSynthesis.speak(utterance);
  }, []);

  // ── Chat: streaming GPT with sentence splitting ────────────────────────
  const sendToChat = useCallback(async (userText, imageBase64, isProactive = false) => {
    if (thinkingRef.current && !isProactive) return;
    if (sendingRef.current && !isProactive) return;

    // Kill any active recognition first
    stopAnimations();
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    setIsListening(false);
    setCurrentJiaText('');
    setCurrentUserText('');
    setRingScale(1);
    setError('');

    if (!isProactive) {
      setIsSending(true);
      sendingRef.current = true;
    }

    playThinkingChime();

    const userMsg = userText ? { role: 'user', content: userText } : null;
    const history = userMsg ? [...messagesRef.current, userMsg] : messagesRef.current;
    if (userMsg) setMessages(history);

    try {
      const res = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
          base64Image: imageBase64
        })
      });

      if (!res.ok) throw new Error(`Chat failed: ${res.status}`);

      // Transition: Sending → Thinking
      if (!isProactive) {
        setIsSending(false);
        sendingRef.current = false;
      }
      setIsThinking(true);
      thinkingRef.current = true;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';
      let hasSentences = false;

      const flushSentence = (text) => {
        const parts = text.split(SENTENCE_SPLIT);
        for (let i = 0; i < parts.length - 1; i++) {
          if (parts[i].trim()) {
            hasSentences = true;
            speakSentence(parts[i].trim());
          }
        }
        return parts[parts.length - 1];
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        for (const line of chunk.split('\n')) {
          const trimmed = line.replace(/^data: /, '').trim();
          if (!trimmed || trimmed === '[DONE]') continue;
          try {
            const parsed = JSON.parse(trimmed);
            const delta = parsed?.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullText += delta;
              buffer += delta;
              setCurrentJiaText(fullText);
              buffer = flushSentence(buffer);
            }
          } catch { /* partial JSON chunk */ }
        }
      }

      if (buffer.trim() && buffer.trim() !== '[SILENT]') {
        hasSentences = true;
        speakSentence(buffer.trim());
      }

      // Transition: Thinking → Speaking
      if (hasSentences) {
        setIsSpeaking(true);
        speakingRef.current = true;
      }
      setIsThinking(false);
      thinkingRef.current = false;

      if (fullText.trim() && fullText.trim() !== '[SILENT]') {
        setMessages(prev => [...prev, { role: 'assistant', content: fullText.trim() }]);
      } else {
        setCurrentJiaText('');
      }

    } catch (err) {
      setIsThinking(false);
      thinkingRef.current = false;
      setIsSending(false);
      sendingRef.current = false;
      setCurrentJiaText('');
      if (!isProactive) {
        setError(err.message || 'Something went wrong.');
      }
    }
  }, [speakSentence, stopAnimations]);

  // ── Trigger send (used by both tap and ring-shrink) ────────────────────
  const triggerSend = useCallback(() => {
    const text = transcriptRef.current;
    transcriptRef.current = '';
    hadSpeechRef.current = false;
    setCurrentUserText('');
    setRingScale(1);
    stopAnimations();

    // Stop AI speaking if user is interrupting
    if (speakingRef.current) {
      stopAllAudio();
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);

    if (text && activeRef.current) {
      const frame = captureFrame?.();
      sendToChat(text, frame?.base64 || null);
    } else if (activeRef.current) {
      setTimeout(() => startListeningRef.current?.(), 300);
    }
  }, [captureFrame, sendToChat, stopAnimations, stopAllAudio]);

  // ── Speech recognition ─────────────────────────────────────────────────
  // Allow user to speak anytime - even while bot is speaking
  const startListeningCycle = useCallback(() => {
    if (!activeRef.current || thinkingRef.current || sendingRef.current) return;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser.');
      return;
    }

    // Clean up any prior instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    stopAnimations();

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    transcriptRef.current = '';
    hadSpeechRef.current = false;
    setRingScale(1);

    // ── Ring animation: expand on speech, shrink on silence ──────────
    const startShrink = () => {
      const startTime = performance.now();
      setRingScale(1.0);

      const animate = (now) => {
        if (!activeRef.current || thinkingRef.current || sendingRef.current) return;
        if (recognitionRef.current !== recognition) return;

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / SHRINK_DURATION_MS, 1);
        const scale = 1.0 - progress;
        setRingScale(scale);

        if (progress >= 1) {
          // Rings touched core — auto-send!
          triggerSend();
          return;
        }
        shrinkRAFRef.current = requestAnimationFrame(animate);
      };
      shrinkRAFRef.current = requestAnimationFrame(animate);
    };

    const onSpeechActivity = () => {
      stopAnimations();
      setRingScale(1.4);

      // After a pause in speech, start shrinking
      speechPauseRef.current = setTimeout(() => {
        if (!hadSpeechRef.current) return;
        startShrink();
      }, SPEECH_PAUSE_MS);
    };

    // Enable listening immediately - allow user to speak anytime
    // Don't wait for bot to finish speaking

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let final = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      transcriptRef.current = (final + interim).trim();
      setCurrentUserText(transcriptRef.current);
      hadSpeechRef.current = true;
      onSpeechActivity();
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('SpeechRecognition error:', event.error);
      }
    };

    recognition.onend = () => {
      // If recognition ended on its own (browser timeout), handle it
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
        setIsListening(false);
        stopAnimations();

        const text = transcriptRef.current;
        transcriptRef.current = '';

        if (text && activeRef.current && !speakingRef.current && !thinkingRef.current && !sendingRef.current) {
          setCurrentUserText('');
          setRingScale(1);
          const frame = captureFrame?.();
          sendToChat(text, frame?.base64 || null);
        } else if (activeRef.current && !speakingRef.current && !thinkingRef.current && !sendingRef.current) {
          setTimeout(() => startListeningRef.current?.(), 300);
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [captureFrame, sendToChat, stopAnimations, triggerSend]);

  useEffect(() => { startListeningRef.current = startListeningCycle; }, [startListeningCycle]);

  // ── Orb tap ────────────────────────────────────────────────────────────
  const onOrbTap = useCallback(() => {
    if (speakingRef.current) {
      // Stop Jia speaking, go back to listening
      stopAllAudio();
      if (activeRef.current && !thinkingRef.current) {
        setTimeout(() => startListeningRef.current?.(), 200);
      }
    } else if (recognitionRef.current && hadSpeechRef.current) {
      // Tap to send what we have
      triggerSend();
    }
  }, [stopAllAudio, triggerSend]);

  // ── Proactive scene awareness ──────────────────────────────────────────
  const startProactiveMonitor = useCallback(() => {
    if (proactiveTimerRef.current) clearInterval(proactiveTimerRef.current);

    proactiveTimerRef.current = setInterval(async () => {
      if (!activeRef.current || speakingRef.current || thinkingRef.current) return;

      const frame = captureFrame?.();
      if (!frame?.base64) return;

      const hash = frame.base64.slice(0, 200);
      if (hash === lastFrameHashRef.current) return;
      lastFrameHashRef.current = hash;

      await sendToChat(
        'Observe the current scene. If there is anything important, dangerous, or notably different, mention it naturally. Otherwise respond with [SILENT].',
        frame.base64,
        true
      );
    }, PROACTIVE_INTERVAL_MS);
  }, [captureFrame, sendToChat]);

  // ── Start / stop ───────────────────────────────────────────────────────
  const startConversation = useCallback(() => {
    // Warm up speechSynthesis with a silent utterance (required on mobile)
    try {
      const warmup = new SpeechSynthesisUtterance('');
      warmup.volume = 0;
      window.speechSynthesis?.speak(warmup);
    } catch {}

    setIsActive(true);
    activeRef.current = true;
    setMessages([]);
    setError('');
    setCurrentJiaText('');
    setCurrentUserText('');
    setRingScale(1);

    startProactiveMonitor();
    setTimeout(() => startListeningRef.current?.(), 300);
  }, [startProactiveMonitor]);

  const stopConversation = useCallback(() => {
    setIsActive(false);
    activeRef.current = false;
    killRecognition();
    stopAllAudio();
    if (proactiveTimerRef.current) {
      clearInterval(proactiveTimerRef.current);
      proactiveTimerRef.current = null;
    }
    setIsListening(false);
    setIsThinking(false);
    thinkingRef.current = false;
    setIsSending(false);
    sendingRef.current = false;
    setIsSpeaking(false);
    speakingRef.current = false;
    setCurrentJiaText('');
    setCurrentUserText('');
    setRingScale(1);
  }, [stopAllAudio, killRecognition]);

  // Resume listening when idle
  useEffect(() => {
    if (!isThinking && !isSending && isActive && !isSpeaking && !isListening) {
      setRingScale(1);
      setTimeout(() => startListeningRef.current?.(), 300);
    }
  }, [isThinking, isSending, isActive, isSpeaking, isListening]);

  // ── Cleanup ────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      activeRef.current = false;
      stopAnimations();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      window.speechSynthesis?.cancel();
      if (proactiveTimerRef.current) clearInterval(proactiveTimerRef.current);
    };
  }, [stopAnimations]);

  return {
    isThinking,
    isSpeaking,
    isListening,
    isSending,
    isActive,
    error,
    currentJiaText,
    currentUserText,
    ringScale,
    onOrbTap,
    startConversation,
    stopConversation
  };
}
