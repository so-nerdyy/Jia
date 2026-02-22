export default function Description({
  text,
  isSpeaking,
  onPlay,
  onPause,
  onReplay,
  onCopy
}) {
  return (
    <section className="description" aria-label="AI description panel">
      <h2>What I See</h2>
      <div className="description-text" role="region" aria-live="polite" aria-label="Generated image description">
        {text || (
          <div className="empty-state">
            <p className="empty-title">No description yet.</p>
            <p className="empty-instruction">Point the camera at something and tap the big blue button to take a picture.</p>
            <p className="empty-instruction">I will look at the picture and tell you what I see!</p>
          </div>
        )}
      </div>

      <div className="description-controls">
        <button type="button" className="control-button" onClick={onPlay} aria-label="Read description aloud" disabled={!text}>
          {isSpeaking ? 'Listening...' : 'Read Aloud'}
        </button>
        <button type="button" className="control-button" onClick={onPause} aria-label="Stop reading" disabled={!text || !isSpeaking}>
          Stop
        </button>
        <button type="button" className="control-button" onClick={onReplay} aria-label="Replay description" disabled={!text}>
          Repeat
        </button>
        <button type="button" className="control-button" onClick={onCopy} aria-label="Copy text" disabled={!text}>
          Copy Text
        </button>
      </div>
    </section>
  );
}
