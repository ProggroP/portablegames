import { h } from '../core/dom';
import { load, save } from '../core/storage';
import { GAMES, playerRange } from '../games/registry';
import type { GameDef } from '../core/types';

type Filter = 'alle' | 'allein' | 'zu-zweit';

const FILTERS: [Filter, string][] = [
  ['alle', 'Alle'],
  ['allein', 'Allein'],
  ['zu-zweit', 'Zu zweit']
];

const DOT_COLORS: Record<string, string> = {
  B: 'var(--p1)',
  O: 'var(--p2)',
  W: 'var(--text-2)',
  _: 'var(--line)'
};

function matches(g: GameDef, f: Filter): boolean {
  const range = playerRange(g);
  return f === 'alle' || range === 'beides' || range === f;
}

function playersLabel(g: GameDef): string {
  const range = playerRange(g);
  return range === 'beides' ? '1–2 Spieler' : range === 'allein' ? 'Allein' : 'Zu zweit';
}

function seatingLabel(g: GameDef): string {
  const { gegenueber, nebeneinander } = g.seating;
  if (gegenueber && nebeneinander) return 'Gegenüber und nebeneinander';
  if (gegenueber) return 'Gegenüber';
  if (nebeneinander) return 'Nur nebeneinander';
  return 'Allein';
}

function formatLabel(g: GameDef): string {
  const formats = new Set(Object.values(g.seating));
  if (formats.size > 1) return 'Hoch und quer';
  return formats.has('landscape') ? 'Querformat' : 'Hochformat';
}

function gameIcon(pattern: string): HTMLElement {
  return h(
    'span',
    { class: 'game-icon', 'aria-hidden': 'true' },
    ...pattern.split('').map((ch) => {
      const dot = h('span');
      dot.style.background = DOT_COLORS[ch] ?? DOT_COLORS._;
      return dot;
    })
  );
}

function gameCard(g: GameDef): HTMLElement {
  const body = [
    gameIcon(g.icon),
    h('span', { class: 'game-card__text' },
      h('span', { class: 'game-card__name' }, g.name),
      h('span', { class: 'game-card__kind' }, g.kind)
    ),
    h('span', { class: 'game-card__meta' },
      h('span', { class: 'chips' },
        h('span', { class: 'chip' }, playersLabel(g)),
        g.create ? h('span', { class: 'chip chip--outline' }, formatLabel(g)) : h('span', { class: 'chip chip--soon' }, 'Demnächst')
      ),
      h('span', { class: 'game-card__seating' }, seatingLabel(g))
    )
  ];
  return g.create
    ? h('a', { class: 'game-card', href: `#/spiel/${g.id}` }, ...body)
    : h('div', { class: 'game-card is-soon', 'aria-disabled': 'true' }, ...body);
}

export function homeScreen(root: HTMLElement): void {
  let filter = load<{ filter: Filter }>('home', { filter: 'alle' }).filter;

  const filterButtons = FILTERS.map(([key, label]) =>
    h('button', {
      class: 'seg__btn',
      type: 'button',
      onclick: () => {
        filter = key;
        save('home', { filter });
        render();
      }
    }, label)
  );
  const count = h('span', { class: 'muted small' });
  const grid = h('div', { class: 'game-grid' });

  function render(): void {
    filterButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(FILTERS[i][0] === filter)));
    const list = GAMES.filter((g) => matches(g, filter));
    const ready = list.filter((g) => g.create).length;
    count.textContent = `${ready} spielbar, ${list.length - ready} geplant`;
    grid.replaceChildren(...list.map(gameCard));
  }

  root.append(
    h('div', { class: 'page' },
      h('header', { class: 'page__header' },
        h('div', {},
          h('h1', { class: 'title' }, 'PortableGames'),
          h('p', { class: 'muted' }, 'Klassiker für dich allein oder zu zweit.')
        )
      ),
      h('section', { class: 'section' },
        h('h2', { class: 'label' }, 'Wer spielt?'),
        h('div', { class: 'seg', role: 'group', 'aria-label': 'Spielerzahl' }, ...filterButtons)
      ),
      h('section', { class: 'section' },
        h('div', { class: 'section__head' }, h('h2', { class: 'subtitle' }, 'Spiele'), count),
        grid
      ),
      h('footer', { class: 'home-footer muted small' },
        h('a', { href: 'lizenzen.txt', target: '_blank', rel: 'noopener' }, 'Lizenzen')
      )
    )
  );
  render();
}
