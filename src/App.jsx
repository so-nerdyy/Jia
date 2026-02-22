import { useCamera } from './hooks/useCamera';
import { useConversation } from './hooks/useConversation';

export default function App() {
  const {
    videoRef,
    isReady,
    toggleCamera,
    captureFrame
  } = useCamera();

  const {
    isThinking,
    isSpeaking,
    isListening,
    isSending,
    isActive,
    currentJiaText,
    currentUserText,
    ringScale,
    onOrbTap,
    startConversation,
    stopConversation
  } = useConversation({ captureFrame });

  const orbState = isSending ? 'sending'
    : isThinking ? 'thinking'
    : isSpeaking ? 'speaking'
    : isListening ? 'listening'
    : 'idle';

  return (
    <div className="voice-shell">
      <video
        ref={videoRef}
        className="camera-bg"
        autoPlay
        muted
        playsInline
      />
      <div className="camera-overlay" />

      <button className="btn-cam" onClick={toggleCamera} aria-label="Switch camera">
        ⇄
      </button>

      {isActive && (
        <div className="orb-container" onClick={onOrbTap} role="button" tabIndex={0}>
          <div
            className={`orb orb--${orbState}`}
            style={isListening ? { '--ring-scale': ringScale } : undefined}
          >
            <div className="orb-ring" />
            <div className="orb-ring orb-ring--2" />
            <div className="orb-core" />
          </div>
          <span className="orb-label">
            {isSending ? 'Sending…'
              : isThinking ? 'Thinking…'
              : isSpeaking ? 'Speaking…'
              : isListening ? 'Listening…'
              : 'Ready'}
          </span>
        </div>
      )}

      {currentUserText && isActive && isListening && (
        <div className="transcript-text" aria-live="polite">
          <p>{currentUserText}</p>
        </div>
      )}

      {currentJiaText && isActive && (
        <div className="response-text" aria-live="polite">
          <p>{currentJiaText}</p>
        </div>
      )}

      <div className="action-area">
        {!isActive ? (
          <button className="btn-action btn-action--start" onClick={startConversation} disabled={!isReady}>
            {isReady ? 'Start' : 'Waiting for camera…'}
          </button>
        ) : (
          <button className="btn-action btn-action--end" onClick={stopConversation}>
            End
          </button>
        )}
      </div>
    </div>
  );
}
