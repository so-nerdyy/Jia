import { useCallback, useEffect, useRef, useState } from 'react';

export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isSupported, setIsSupported] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState('environment');

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(
    async (mode) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setIsSupported(false);
        setError('Camera API is not supported in this browser.');
        return;
      }

      setIsInitializing(true);
      setError('');
      setIsReady(false);

      try {
        stopCamera();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setIsReady(true);
      } catch (err) {
        setError(err?.message || 'Failed to access camera.');
      } finally {
        setIsInitializing(false);
      }
    },
    [stopCamera]
  );

  const toggleCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
    return { dataUrl, base64 };
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => stopCamera();
  }, [facingMode, startCamera, stopCamera]);

  return {
    videoRef,
    isSupported,
    isReady,
    isInitializing,
    error,
    facingMode,
    startCamera,
    stopCamera,
    toggleCamera,
    captureFrame
  };
}
