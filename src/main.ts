import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import './core/install';
import { findGame } from './games/registry';
import { homeScreen } from './screens/home';
import { playScreen } from './screens/play';
import { setupScreen } from './screens/setup';

registerSW({ immediate: true });

const app = document.getElementById('app')!;
let cleanup: (() => void) | null = null;

// Routen: #/  ·  #/spiel/<id>  ·  #/spiel/<id>/los
function route(): void {
  cleanup?.();
  cleanup = null;
  app.replaceChildren();
  window.scrollTo(0, 0);

  const [section, id, action] = location.hash.replace(/^#\/?/, '').split('/');
  const def = section === 'spiel' && id ? findGame(id) : undefined;

  if (def?.create && action === 'los') cleanup = playScreen(app, def);
  else if (def?.create) setupScreen(app, def);
  else cleanup = homeScreen(app);
}

window.addEventListener('hashchange', route);
route();
