import { useCallback, useState } from 'react';

export function useVision() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const describeImage = useCallback(async ({ base64Image, prompt }) => {
    const endpoint = import.meta.env.VITE_VISION_API_URL || '/api/vision';

    if (!base64Image) {
      throw new Error('No image available for analysis.');
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          base64Image,
          prompt
        })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(`Vision request failed (${response.status}): ${message}`);
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) {
        throw new Error('No description was returned by the vision model.');
      }

      return text;
    } catch (err) {
      const message = err?.message || 'Unknown vision request error.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    describeImage
  };
}
