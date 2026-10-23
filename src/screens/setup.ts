import { levelNames, loadConfig, saveConfig, type GameConfig } from '../core/config';
import { h, icon } from '../core/dom';
import { PLAYER_COLOR_NAMES } from '../core/players';
import type { GameDef, Level, Orientation, SeatMode } from '../core/types';

const SEAT_TEXT: Record<Exclude<SeatMode, 'allein'>, { label: string; desc: string }> = {
  gegenueber: {
    label: 'Gegenüber',
    desc: 'Das Handy liegt zwischen euch. Die Anzeige von Spieler 2 steht für Spieler 1 auf dem Kopf.'
  },
  nebeneinander: {
    label: 'Nebeneinander',
    desc: 'Ihr schaut beide von derselben Seite auf das Brett.'
  }
};

const FORMAT_TEXT: Record<Orientation, string> = { portrait: 'Hochformat', landscape: 'Querformat' };

function segmented<T>(label: string, options: [T, string][], value: T, onPick: (v: T) => void): HTMLElement {
  // Mehr als drei Knöpfe passen auf kleinen Handys nicht in eine Zeile
  return h('div', { class: options.length > 3 ? 'seg seg--wrap' : 'seg', role: 'group', 'aria-label': label },
    ...options.map(([v, text]) =>
      h('button', { class: 'seg__btn', type: 'button', 'aria-pressed': String(v === value), onclick: () => onPick(v) }, text)
    )
  );
}

export function setupScreen(root: HTMLElement, def: GameDef): void {
  const cfg: GameConfig = loadConfig(def);
  const canSolo = !!def.seating.allein;
  const duoModes = (['gegenueber', 'nebeneinander'] as const).filter((m) => def.seating[m]);
  let lastDuo: SeatMode = cfg.mode !== 'allein' ? cfg.mode : duoModes[0] ?? 'allein';

  const body = h('div', { class: 'stack' });

  function nameField(i: 0 | 1, hint: string): HTMLElement {
    const id = `name-${i}`;
    const input = h('input', {
      id,
      class: 'name-field__input',
      type: 'text',
      autocomplete: 'off',
      maxlength: 16,
      placeholder: PLAYER_COLOR_NAMES[i],
      value: cfg.names[i]
    });
    input.addEventListener('input', () => {
      cfg.names[i] = input.value;
    });
    return h('div', { class: 'name-field' },
      h('span', { class: `marker marker--p${i + 1}`, 'aria-hidden': 'true' }),
      h('div', { class: 'name-field__body' },
        h('label', { for: id, class: 'small muted' }, `${PLAYER_COLOR_NAMES[i]}, ${hint}`),
        input
      )
    );
  }

  function render(): void {
    const solo = cfg.mode === 'allein';
    const sections: HTMLElement[] = [];

    if (def.howTo?.length) {
      sections.push(
        h('details', { class: 'howto section' },
          h('summary', { class: 'howto__summary' }, 'So geht’s'),
          h('ul', { class: 'howto__list' }, ...def.howTo.map((line) => h('li', {}, line)))
        )
      );
    }

    if (canSolo && duoModes.length) {
      sections.push(
        h('section', { class: 'section' },
          h('h2', { class: 'label' }, 'Wer spielt?'),
          segmented('Spielerzahl', [[true, 'Allein'], [false, 'Zu zweit']] as [boolean, string][], solo, (s) => {
            cfg.mode = s ? 'allein' : lastDuo;
            render();
          })
        )
      );
    }

    if (!solo && duoModes.length) {
      const mode = cfg.mode as Exclude<SeatMode, 'allein'>;
      sections.push(
        h('section', { class: 'section' },
          h('h2', { class: 'label' }, 'Wie sitzt ihr?'),
          duoModes.length > 1
            ? segmented('Sitzordnung', duoModes.map((m) => [m, SEAT_TEXT[m].label] as [SeatMode, string]), cfg.mode, (m) => {
                cfg.mode = m;
                lastDuo = m;
                render();
              })
            : h('p', { class: 'strong' }, SEAT_TEXT[mode].label),
          h('p', { class: 'muted small' }, SEAT_TEXT[mode].desc),
          mode === 'gegenueber'
            ? h('p', { class: 'muted small tip' }, 'Tipp: Schalte die automatische Drehung des Handys aus, wenn es flach auf dem Tisch liegt. Die App richtet sich selbst aus.')
            : null
        )
      );
    }

    if (solo) {
      sections.push(
        h('section', { class: 'section' },
          h('h2', { class: 'label' }, duoModes.length ? 'Computer' : 'Schwierigkeit'),
          segmented('Schwierigkeit', levelNames(def).map((name, i) => [i, name] as [Level, string]), cfg.level, (l) => {
            cfg.level = l;
            render();
          })
        )
      );
    }

    const orientation = def.seating[cfg.mode] ?? 'portrait';
    if (duoModes.length) {
      // Namen nur, wenn es einen Gegner gibt
      sections.push(
        h('section', { class: 'section' },
          h('h2', { class: 'label' }, 'Namen'),
          h('div', { class: 'stack stack--tight' },
            nameField(0, solo ? 'das bist du' : cfg.mode === 'gegenueber' ? 'sitzt unten' : 'links'),
            solo ? null : nameField(1, cfg.mode === 'gegenueber' ? 'sitzt gegenüber' : 'rechts')
          )
        )
      );
    }
    sections.push(
      h('p', { class: 'muted small' }, duoModes.length ? `Format: ${FORMAT_TEXT[orientation]}. Wer beginnt, wechselt nach jedem Spiel.` : `Format: ${FORMAT_TEXT[orientation]}.`)
    );

    body.replaceChildren(...sections);
  }

  const start = h('a', {
    class: 'btn btn--primary btn--block',
    href: `#/spiel/${def.id}/los`,
    onclick: () => saveConfig(def, cfg)
  }, 'Los geht’s');

  root.append(
    h('div', { class: 'page page--with-footer' },
      h('header', { class: 'page__header page__header--row' },
        h('a', { class: 'icon-btn', href: '#/', 'aria-label': 'Zurück zur Spieleauswahl' }, icon('back')),
        h('div', {},
          h('p', { class: 'muted small' }, 'Spielaufbau'),
          h('h1', { class: 'title title--sm' }, def.name)
        )
      ),
      body
    ),
    h('footer', { class: 'page-footer' }, start)
  );
  render();
}
