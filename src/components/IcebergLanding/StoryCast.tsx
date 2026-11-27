import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { TRY_IT_PATH, TRY_IT_STATE } from './tryIt';

/**
 * "Our stories are fun": one long comic collage you scroll through, like a
 * single big page, with Leo narrating it. The collage is made of groups, one
 * per character or event (a portrait from the character sheet, then panels
 * from the real comic pages where they appear), packed edge to edge so the
 * groups don't read as separate blocks. Whichever group is in the middle of the
 * screen sets what Leo says: on phones he slides in from the side at the bottom
 * of the screen, on desktop he stands in a sticky rail next to the collage.
 * He spoils a little on purpose (the jealousy, the stolen car, the money).
 * While he talks about a group, the rest of the page dims, and the group's
 * character-sheet portraits get a green frame and a name tag.
 *
 * Layout: each group is a 6-column grid; a row is [height in units, cells] and
 * its cells' column spans add up to 6, so there are no holes. One unit is 8% of
 * the collage's width (container units), so the page keeps its proportions at
 * any width. Leo's lines are language data and stay in code; names, roles and
 * the Russian translations come from iceberg.cast (no translation in English).
 */

const IMG = import.meta.glob('../../assets/landing/cast/*.webp', { eager: true, import: 'default' }) as Record<string, string>;
const img = (name: string) => IMG[`../../assets/landing/cast/${name}.webp`];

type Key = 'leo' | 'mia' | 'ginger' | 'katrin' | 'parents' | 'greg' | 'car' | 'friends' | 'bye';
type Row = [number, [string, number][]];
interface Group {
  key: Exclude<Key, 'bye'>;
  line: string;
  rows: Row[];
}

const GROUPS: Group[] = [
  {
    key: 'leo',
    line: "Hi, I'm Leo, and I am the main character of the malako stories. You'll learn everything about me and my family, my friends and my life.",
    rows: [
      [5, [['leo-laugh', 3], ['p-leo-10-00', 3]]],
      [4, [['leo-sketch', 4], ['p-love-life-6-00', 2]]],
    ],
  },
  {
    key: 'mia',
    line: "My big sister Mia. A surgeon, a climber, and the only person I'm a little afraid of. Her own stories are coming soon!",
    rows: [
      [5, [['mia', 3], ['p-friendships-4-05', 3]]],
      [5, [['p-friendships-4-06', 4], ['mia-laugh', 2]]],
    ],
  },
  {
    key: 'ginger',
    line: "Ginger, my cat. She's a little fat, she's always hungry, and she's the real boss of my flat.",
    rows: [
      [5, [['ginger-sit', 2], ['ginger-chin', 2], ['leo-cat', 2]]],
      [4, [['p-new-car-2-00', 3], ['p-love-life-3-08', 3]]],
      [3, [['p-leo-10-02', 6]]],
    ],
  },
  {
    key: 'katrin',
    line: 'Katrin. We met at a party: she came with another guy... and left with me. And then the jealousy started!',
    rows: [
      [5, [['katrin', 2], ['katrin-laugh', 2], ['p-love-life-3-07', 2]]],
      [4, [['p-love-life-3-00', 3], ['p-love-life-3-01', 3]]],
      [5, [['p-love-life-2-02', 6]]],
      [4, [['p-love-life-3-05', 3], ['p-love-life-6-01', 3]]],
    ],
  },
  {
    key: 'parents',
    line: 'My parents, Mark and Anna. Dad says a real man decides by himself. Mom says Mom knows best. Guess who usually wins?',
    rows: [
      [5, [['mark', 2], ['anna', 2], ['p-leo-4-02', 2]]],
      [4, [['p-leo-4-04', 2], ['p-friendships-1-00', 4]]],
      [4, [['p-leo-4-03', 2], ['p-new-car-1-02', 4]]],
      [3, [['p-new-car-1-05', 6]]],
    ],
  },
  {
    key: 'greg',
    line: "Uncle Greg. He's sixty, and he loves a good story more than anybody. Never tell him a secret!",
    rows: [
      [5, [['greg-laugh', 3], ['greg-cigar', 3]]],
      [7, [['p-love-life-1-00', 6]]],
      [4, [['p-love-life-1-03', 6]]],
    ],
  },
  {
    key: 'car',
    line: 'My first car! A red Fiat. I loved it... and then a girl on a red bike drove away in it. Long story.',
    rows: [
      [5, [['p-new-car-2-01', 4], ['p-new-car-1-03', 2]]],
      [4, [['p-new-car-2-04', 6]]],
      [5, [['p-new-car-4-00', 4], ['p-new-car-3-05', 2]]],
      [5, [['p-new-car-5-02', 3], ['p-new-car-3-04', 3]]],
      [4, [['p-new-car-4-03', 6]]],
    ],
  },
  {
    key: 'friends',
    line: 'And my friends. Football, champagne, a bet... and one friend who is not my friend any more.',
    rows: [
      [4, [['p-friendships-2-00', 6]]],
      [5, [['p-friendships-1-05', 3], ['p-friendships-3-02', 3]]],
      [3, [['p-friendships-5-03', 6]]],
    ],
  },
];

/** Character-sheet portraits that get a name tag (iceberg.cast.tags.*) while their group is Leo's topic. */
const TAGS: Record<string, string> = {
  'leo-laugh': 'leo', mia: 'mia', 'ginger-sit': 'ginger', katrin: 'katrin', mark: 'mark', anna: 'anna', 'greg-laugh': 'greg',
};

const BYE = "So, are you ready to meet them? Come on, it won't be boring!";
const LINES: Record<Key, string> = { ...Object.fromEntries(GROUPS.map((g) => [g.key, g.line])), bye: BYE } as Record<Key, string>;

/** Leo, telling about whatever is in the middle of the screen. Hidden while nothing is. */
function Narrator({ active }: { active: Key | null }) {
  const { t } = useTranslation();
  // keep the last line while he slides away, so the bubble doesn't empty mid-exit
  const last = useRef<Key>('leo');
  if (active) last.current = active;
  const k = active ?? last.current;
  const name = t(`iceberg.cast.${k}.name`);
  const tr = t(`iceberg.cast.${k}.tr`);
  return (
    <div className={`ib-cs-narr${active ? ' on' : ''}`} aria-live="polite">
      <img className="ib-cs-face" src={img('leo-face')} alt="" width={64} height={64} />
      <div key={k} className="ib-cs-bubble">
        {name && <p className="ib-cs-who">{name}</p>}
        <p className="ib-cs-line" lang="en">{LINES[k]}</p>
        {tr && <p className="ib-cs-tr" lang="ru">{tr}</p>}
      </div>
    </div>
  );
}

export default function StoryCast() {
  const { t } = useTranslation();
  const collageRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Key | null>(null);
  // groups that have scrolled in (in state, not classList: the group's className re-renders with the highlight)
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    const root = collageRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const parts = Array.from(root.querySelectorAll<HTMLElement>('[data-key]'));
    // which part crosses the middle band of the screen: that one is Leo's topic
    const live = new Set<HTMLElement>();
    const pick = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? live.add(e.target as HTMLElement) : live.delete(e.target as HTMLElement)));
        const now = parts.find((p) => live.has(p));
        setActive(now ? (now.dataset.key as Key) : null);
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    // panels arrive as their group scrolls in
    const reveal = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          const key = (e.target as HTMLElement).dataset.key as string;
          setSeen((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
          reveal.unobserve(e.target);
        }
      }),
      { rootMargin: '0px 0px -12% 0px' },
    );
    parts.forEach((p) => {
      pick.observe(p);
      reveal.observe(p);
    });
    return () => {
      pick.disconnect();
      reveal.disconnect();
    };
  }, []);

  return (
    <section className="ib-sec ib-cast" aria-labelledby="ib-cast-title">
      <div className="ib-wrap">
        <p className="ib-kicker">{t('iceberg.cast.kicker')}</p>
        <h2 id="ib-cast-title" className="ib-h2">{t('iceberg.cast.title')}</h2>

        <div className="ib-cs-stage">
          <div ref={collageRef} className={`ib-cs-collage${active && active !== 'bye' ? ' has-on' : ''}`}>
            {GROUPS.map((g) => (
              <div key={g.key} className={`ib-cs-group${seen.has(g.key) ? ' in' : ''}${active === g.key ? ' is-on' : ''}`} data-key={g.key}>
                {g.rows.flatMap(([h, cells], r) =>
                  cells.map(([name, c], k) => {
                    const tag = TAGS[name];
                    return (
                      <figure
                        key={`${r}-${name}`}
                        className={`ib-cs-cell${tag ? ' ib-cs-tagged' : ''}`}
                        style={{ gridColumn: `span ${c}`, gridRow: `span ${h}`, transitionDelay: `${(r * 2 + k) * 0.06}s` }}
                      >
                        <img src={img(name)} alt="" loading="lazy" />
                        {tag && <figcaption className="ib-cs-tag">{t(`iceberg.cast.tags.${tag}`)}</figcaption>}
                      </figure>
                    );
                  }),
                )}
              </div>
            ))}
            {/* the last frame of the page: Leo's goodbye and the way in */}
            <div className="ib-cs-endcap" data-key="bye">
              <p className="ib-cs-end-title">{t('iceberg.cast.endTitle')}</p>
              <Link to={TRY_IT_PATH} state={TRY_IT_STATE} className="ib-cta">
                {t('iceberg.cast.cta')}
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </div>
            {/* phones: Leo docks at the bottom of the screen while the collage scrolls under him */}
            <div className="ib-cs-dock">
              <Narrator active={active} />
            </div>
          </div>
          {/* desktop: Leo stands beside the collage */}
          <aside className="ib-cs-rail">
            <Narrator active={active} />
          </aside>
        </div>
      </div>
    </section>
  );
}
