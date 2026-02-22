import type { ColorMode } from './types';
import { storage } from './storage';

export function applyColorMode(mode: ColorMode) {
  const dark =
    mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

export function initColorMode(): () => void {
  const mq = matchMedia('(prefers-color-scheme: dark)');
  let currentMode: ColorMode = 'system';

  function onSystemChange() {
    if (currentMode === 'system') applyColorMode('system');
  }

  storage.getColorMode().then((mode) => {
    currentMode = mode ?? 'system';
    applyColorMode(currentMode);
  });

  mq.addEventListener('change', onSystemChange);
  return () => mq.removeEventListener('change', onSystemChange);
}
