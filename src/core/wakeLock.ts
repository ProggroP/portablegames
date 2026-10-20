// Hält das Display während eines Spiels an. Ohne Unterstützung passiert einfach nichts.

let sentinel: WakeLockSentinel | null = null;
let wanted = false;

async function request(): Promise<void> {
  if (!wanted || sentinel || !('wakeLock' in navigator)) return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => {
      sentinel = null;
    });
  } catch {
    sentinel = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void request();
});

export function keepAwake(on: boolean): void {
  wanted = on;
  if (on) void request();
  else if (sentinel) {
    void sentinel.release();
    sentinel = null;
  }
}
