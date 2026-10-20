// Erzeugt die Rätsel für Ausparken und schreibt sie nach src/games/ausparken/puzzles.ts.
// Aufruf: node --experimental-strip-types scripts/generate-ausparken.ts
import { writeFileSync } from 'node:fs';
import { hardestInComponent, parse, randomLayout, solve } from '../src/games/ausparken/logic.ts';

const PER_LEVEL = 30;
const BUCKETS = [
  { name: 'leicht', min: 4, max: 8 },
  { name: 'mittel', min: 9, max: 15 },
  { name: 'schwer', min: 16, max: 60 }
];

let seed = 20261020;
const rng = (): number => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

const found: { puzzle: string; moves: number }[][] = BUCKETS.map(() => []);
const seen = new Set<string>();
const started = Date.now();
let tries = 0;
while (found.some((f) => f.length < PER_LEVEL) && Date.now() - started < 15 * 60 * 1000) {
  tries++;
  const r = hardestInComponent(randomLayout(rng, 6 + Math.floor(rng() * 9)));
  if (!r || seen.has(r.puzzle)) continue;
  const b = BUCKETS.findIndex((x) => r.moves >= x.min && r.moves <= x.max);
  if (b < 0 || found[b].length >= PER_LEVEL) continue;
  // Gegenprobe mit dem Löser aus der App
  const check = solve(parse(r.puzzle));
  if (!check || check.length !== r.moves) throw new Error(`Widerspruch bei ${r.puzzle}`);
  seen.add(r.puzzle);
  found[b].push(r);
}

for (const f of found) f.sort((a, b) => a.moves - b.moves);
const body = BUCKETS.map((b, i) => `  // ${b.name}: ${found[i].length} Rätsel, ${found[i][0]?.moves} bis ${found[i].at(-1)?.moves} Züge\n  [\n${found[i].map((p) => `    { p: '${p.puzzle}', n: ${p.moves} }`).join(',\n')}\n  ]`).join(',\n');
writeFileSync(
  new URL('../src/games/ausparken/puzzles.ts', import.meta.url),
  `// Erzeugt mit scripts/generate-ausparken.ts. Nicht von Hand ändern.\n// p: Rätsel (36 Felder, Zeile für Zeile), n: Züge der kürzesten Lösung\n\nexport const PUZZLES: { p: string; n: number }[][] = [\n${body}\n];\n`
);
console.log(`${tries} Versuche, ${Math.round((Date.now() - started) / 1000)} s:`, found.map((f, i) => `${BUCKETS[i].name} ${f.length} (${f[0]?.moves}-${f.at(-1)?.moves})`).join(', '));
