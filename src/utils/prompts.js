export const PROMPTS = {
  general:
    'Describe what you see in this image in detail. Focus on objects, people, text, and any important visual elements. Be specific and helpful for someone who cannot see the image.',
  reading:
    "Extract and read all visible text from this image. Maintain the reading order and formatting. If there's no text, say 'No readable text found.'",
  describe:
    'What is in this image? Give a clear, concise description focusing on the main subject or scene.',
  safety:
    'You are a mobility safety assistant. Identify immediate hazards for someone walking right now (stairs up/down, curbs, drop-offs, obstacles, vehicles, wet floor, glass doors, crowds). Start with "DANGER:" only if urgent risk is present in the next few steps. If not urgent, start with "SAFE:" and give short guidance.',
  voiceQuestion:
    'Answer the user question about this scene in plain language. If the answer depends on uncertain details, say what is uncertain.'
};

export const MODE_LABELS = {
  general: 'General',
  reading: 'Read Text',
  describe: 'Describe Scene'
};
