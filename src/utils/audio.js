export function playSound(path) {
  const audio = new Audio(path);
  audio.play().catch(() => {});
}
