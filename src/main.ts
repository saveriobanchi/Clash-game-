import '@fontsource/jacquard-24/400.css';
import '@fontsource/jersey-15/400.css';
import './styles.css';
import './games.css';
import { loadPixels } from './ui/px';
import { initBg } from './ui/bg';
import { initFx } from './ui/fx';
import { startApp } from './ui/app';

async function boot(): Promise<void> {
  await loadPixels();
  initBg();
  initFx();
  startApp(document.getElementById('app')!);
  document.getElementById('boot')?.remove();
  if (location.search.includes('dev')) {
    const [fx, eco] = await Promise.all([import('./ui/fx'), import('./core/economy')]);
    (window as unknown as Record<string, unknown>).__va = { fx, eco };
  }
}
void boot();
if ('serviceWorker' in navigator && import.meta.env.PROD) addEventListener('load', () => { void navigator.serviceWorker.register('./sw.js').catch(() => undefined); });
