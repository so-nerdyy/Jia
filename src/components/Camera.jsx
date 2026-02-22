import { useState } from 'react';
import { playSound } from '../utils/audio';

export default function Camera({
  videoRef,
  isReady,
  isInitializing,
  error,
  facingMode,
  onCapture,
  onToggleCamera
}) {
  const [flash, setFlash] = useState(false);

  const handleCapture = async () => {
    setFlash(true);
    playSound('/sounds/capture.mp3');
    onCapture?.();
    window.setTimeout(() => setFlash(false), 180);
  };

  return (
    <section className="camera" aria-label="Camera preview section">
      <div className={`flash-overlay ${flash ? 'visible' : ''}`} aria-hidden="true" />

      <video
        ref={videoRef}
        className="camera-video"
        autoPlay
        muted
        playsInline
        aria-label="Live camera preview"
      />

      <div className="camera-overlay" aria-live="polite">
        {!isReady && isInitializing && <p className="overlay-message">Initializing camera…</p>}
        {error && <p className="overlay-message error">{error}</p>}
      </div>

      <div className="camera-controls">
        <button
          type="button"
          className="control-button secondary"
          onClick={onToggleCamera}
          aria-label={`Switch camera. Current mode: ${facingMode === 'environment' ? 'rear' : 'front'}`}
        >
          Switch Camera
        </button>

        <button
          type="button"
          className="control-button capture"
          onClick={handleCapture}
          aria-label="Capture image"
          disabled={!isReady}
        >
          Capture
        </button>
      </div>
    </section>
  );
}
