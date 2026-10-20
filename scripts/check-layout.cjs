// Prüft auf kleinen Handybildschirmen, ob in jedem Spiel und jeder Sitzordnung alle Bedienelemente
// sichtbar und antippbar sind (nicht verdeckt, nicht außerhalb des Bildschirms).
//
// Aufruf: npm run build && npm run preview, dann in zweitem Terminal npm run check:layout
// Braucht Playwright (lokal oder global installiert).
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'));
}
const BASE = process.argv[2] || 'http://localhost:4173';
const GAMES = {
  tictactoe: ['gegenueber', 'nebeneinander', 'allein'], reversi: ['gegenueber', 'nebeneinander', 'allein'],
  muehle: ['gegenueber', 'nebeneinander', 'allein'], dame: ['gegenueber', 'nebeneinander', 'allein'],
  kaesekaestchen: ['gegenueber', 'nebeneinander', 'allein'], mancala: ['gegenueber', 'nebeneinander', 'allein'],
  backgammon: ['gegenueber', 'nebeneinander', 'allein'], airhockey: ['gegenueber', 'nebeneinander', 'allein'],
  gomoku: ['gegenueber', 'nebeneinander', 'allein'], fallreihe: ['nebeneinander', 'allein'],
  paarweise: ['gegenueber', 'nebeneinander', 'allein'], fuenfwuerfel: ['gegenueber', 'nebeneinander', 'allein'],
  solitaer: ['allein'], feldraeumer: ['allein'], neunerfeld: ['allein'],
  schach: ['gegenueber', 'nebeneinander', 'allein']
};
const LABEL = { gegenueber: 'Gegenüber', nebeneinander: 'Nebeneinander' };
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const [w, hgt] of [[360, 640], [640, 360]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: hgt }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push(`JS-Fehler: ${e.message}`));
    for (const [id, modes] of Object.entries(GAMES)) {
      for (const mode of modes) {
        await page.goto(`${BASE}/#/spiel/${id}`);
        await page.waitForSelector('text=Los geht’s');
        if (await page.$('.seg__btn:has-text("Zu zweit")')) await page.click(mode === 'allein' ? '.seg__btn:has-text("Allein")' : '.seg__btn:has-text("Zu zweit")');
        if (mode !== 'allein' && (await page.$(`.seg__btn:has-text("${LABEL[mode]}")`))) await page.click(`.seg__btn:has-text("${LABEL[mode]}")`);
        await page.click('text=Los geht’s');
        await page.waitForTimeout(350);
        const bad = await page.evaluate(() => {
          const out = [];
          const controls = [...document.querySelectorAll('.stage button:not([hidden]):not([disabled]), .stage canvas')];
          for (const el of controls) {
            if (el.closest('[hidden]') || el.closest('.rules-overlay')) continue;
            const b = el.getBoundingClientRect();
            if (b.width < 1 || b.height < 1) continue;
            const x = b.left + b.width / 2, y = b.top + b.height / 2;
            const inView = x >= 0 && y >= 0 && x <= innerWidth && y <= innerHeight;
            const hit = inView ? document.elementFromPoint(x, y) : null;
            if (!inView || !(hit && (el === hit || el.contains(hit) || hit.contains(el)))) out.push(el.getAttribute('aria-label') || el.className);
          }
          return out;
        });
        if (bad.length) problems.push(`${w}x${hgt} ${id} ${mode}: ${bad.length} nicht erreichbar, z. B. ${bad.slice(0, 3).join(' | ')}`);
      }
    }
    await ctx.close();
  }
  console.log(problems.length ? problems.join('\n') : 'Alle Bedienelemente erreichbar.');
  process.exitCode = problems.length ? 1 : 0;
  await browser.close();
})();
