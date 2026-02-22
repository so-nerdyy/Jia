export default function VoiceControl({
  isRecognitionSupported,
  isListening,
  isContinuousMode,
  lastHeard,
  lastCommand,
  onStartListening,
  onStopListening
}) {
  if (!isRecognitionSupported) {
    return (
      <section className="voice-control" aria-label="Voice controls">
        <h2>Voice Control</h2>
        <div className="unsupported-box">
          <p>Voice control is not supported in this browser.</p>
          <p className="small">You can still use the buttons to control the app.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="voice-control" aria-label="Voice controls">
      <h2>Voice Control</h2>
      <div className="voice-content">
        <div className="voice-status">
          <span className={`mic-dot ${isListening ? 'active' : ''}`} aria-hidden="true" />
          <span aria-live="polite">
            {isContinuousMode
              ? isListening
                ? 'Active mode listening...'
                : 'Active mode standby...'
              : isListening
                ? 'Listening...'
                : 'Tap & Hold to Talk'}
          </span>
        </div>

        {!isContinuousMode && (
          <button
            type="button"
            className="control-button voice-btn"
            onMouseDown={onStartListening}
            onMouseUp={onStopListening}
            onMouseLeave={onStopListening}
            onTouchStart={onStartListening}
            onTouchEnd={onStopListening}
            aria-label="Hold to speak command"
          >
            {isListening ? 'Listening...' : 'Hold to Speak'}
          </button>
        )}

        {lastHeard && (
          <div className="voice-transcript">
            <p><strong>Last heard:</strong> {lastHeard}</p>
          </div>
        )}
        
        <div className="voice-help">
          <p>Try saying:</p>
          <ul>
            <li>"Capture" - Take a photo</li>
            <li>"Read this" - Read text</li>
            <li>"What is in front of me?" - Ask a scene question</li>
            <li>"Is there a door near me?" - Ask navigation-style questions</li>
            <li>"Stop" - Stop talking</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
