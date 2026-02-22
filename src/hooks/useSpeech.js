import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const COMMAND_PATTERNS = [
  { name: 'capture', match: /\bcapture\b|\btake (a )?(photo|picture)\b/i },
  { name: 'read_this', match: /\bread( this)?\b|\bscan text\b/i },
  { name: 'describe', match: /\bdescribe\b|\bwhat('?s| is) (this|here|in front)\b/i },
  { name: 'stop', match: /\bstop\b|\bpause\b|\bquiet\b/i },
  { name: 'repeat', match: /\brepeat\b|\bsay that again\b|\bagain\b/i }
];

export function parseCommand(transcript = '') {
  const text = transcript.trim();
  if (!text) return null;
  const found = COMMAND_PATTERNS.find((item) => item.match.test(text));
  return found?.name || null;
}

export function shouldTreatAsQuestion(transcript = '') {
  const text = transcript.trim().toLowerCase();
  if (!text) return false;
  if (/\?$/.test(text)) return true;
  return /^(what|where|who|when|why|how|is|are|can|could|should|do|does|did|tell me|which|would)\b/i.test(
    text
  );
}

export function useSpeech() {
  const recognitionRef = useRef(null);
  const onCommandRef = useRef(null);
  const continuousRef = useRef(false);
  const [lastSpokenText, setLastSpokenText] = useState('');
  const [lastHeard, setLastHeard] = useState('');
  const [lastCommand, setLastCommand] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [error, setError] = useState('');

  const speechRecognition = useMemo(
    () => window.SpeechRecognition || window.webkitSpeechRecognition || null,
    []
  );

  const isRecognitionSupported = Boolean(speechRecognition);
  const isTTSSupported = typeof window.speechSynthesis !== 'undefined';

  const stopSpeaking = useCallback(() => {
    if (!isTTSSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isTTSSupported]);

  const speak = useCallback(
    (text) => {
      if (!isTTSSupported || !text) return;
      stopSpeaking();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => {
        setIsSpeaking(false);
        setError('Text-to-speech playback failed.');
      };

      setLastSpokenText(text);
      window.speechSynthesis.speak(utterance);
    },
    [isTTSSupported, stopSpeaking]
  );

  const replay = useCallback(() => {
    if (lastSpokenText) {
      speak(lastSpokenText);
    }
  }, [lastSpokenText, speak]);

  const startListening = useCallback(() => {
    if (!isRecognitionSupported || isListening) return;

    setError('');

    const recognition = new speechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      if (continuousRef.current && !isSpeaking) {
        window.setTimeout(() => {
          startListening();
        }, 250);
      }
    };
    recognition.onerror = (event) => {
      recognitionRef.current = null;
      setIsListening(false);
      if (event.error !== 'no-speech') {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() || '';
      setLastHeard(transcript);
      const cmd = parseCommand(transcript);
      setLastCommand(cmd || (shouldTreatAsQuestion(transcript) ? 'question' : ''));
      if (onCommandRef.current) {
        onCommandRef.current(cmd || 'question', transcript);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening, isRecognitionSupported, speechRecognition, isSpeaking]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const setContinuousMode = useCallback((enabled) => {
    continuousRef.current = enabled;
    setIsContinuousMode(enabled);
  }, []);

  const setOnCommand = useCallback((fn) => {
    onCommandRef.current = fn;
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      stopSpeaking();
    };
  }, [stopSpeaking]);

  useEffect(() => {
    if (!isRecognitionSupported) return;
    if (isContinuousMode && !isListening && !isSpeaking) {
      startListening();
    }
    if (!isContinuousMode && isListening) {
      stopListening();
    }
  }, [isContinuousMode, isListening, isRecognitionSupported, isSpeaking, startListening, stopListening]);

  useEffect(() => {
    if (!isContinuousMode || isSpeaking || isListening) return;
    const id = window.setTimeout(() => {
      startListening();
    }, 250);
    return () => window.clearTimeout(id);
  }, [isContinuousMode, isListening, isSpeaking, startListening]);

  return {
    isRecognitionSupported,
    isTTSSupported,
    isListening,
    isSpeaking,
    isContinuousMode,
    error,
    lastHeard,
    lastCommand,
    speak,
    stopSpeaking,
    replay,
    startListening,
    stopListening,
    setOnCommand,
    setContinuousMode
  };
}
