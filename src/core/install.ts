// Installation als App. Chrome und Edge melden mit „beforeinstallprompt“, dass sie installieren könnten.
// Safari kennt das nicht, dort geht es nur über „Zum Home-Bildschirm“.

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = (): void => listeners.forEach((fn) => fn());

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as InstallPromptEvent;
  notify();
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  notify();
});

/** Läuft die App bereits installiert, also ohne Browserleiste? */
export const isStandalone = (): boolean =>
  matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

export const canInstall = (): boolean => deferred !== null && !isStandalone();

export async function install(): Promise<boolean> {
  if (!deferred) return false;
  const ev = deferred;
  deferred = null;
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  notify();
  return outcome === 'accepted';
}

/** Meldet Änderungen an der Installierbarkeit. Liefert eine Funktion zum Abmelden. */
export function onInstallChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
