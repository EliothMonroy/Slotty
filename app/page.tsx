'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Clover,
  ArrowUpRight,
  RotateCcw,
  Coins,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
const symbols = ['🍒', '🍋', '🔔', '💎', '7', '😈'];
import { roll, prizes, settleSpin, DEVIL_ROW_CHANCE } from '../lib/game';
const cash = (n: number) =>
  '$' +
  n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
const fresh = () => ({
  money: 100,
  spins: 0,
  wins: 0,
  earned: 0,
  best: 0,
  levels: [0, 0, 0],
});
const upgrades = [
  {
    name: 'Lucky charm',
    icon: Clover,
    desc: 'More chances to win on at least one row.',
    base: 40,
    max: 8,
  },
  {
    name: 'Heavy pockets',
    icon: Coins,
    desc: 'Every winning payout gets bigger.',
    base: 60,
    max: 5,
  },
  {
    name: 'Diamond touch',
    icon: Sparkles,
    desc: 'Turn more winning rows into triple diamonds.',
    base: 100,
    max: 5,
  },
];
export default function Home() {
  const [s, setS] = useState(fresh);
  const [reels, setReels] = useState([
    [0, 3, 4],
    [2, 1, 0],
    [4, 2, 3],
  ]);
  const [winningRows, setWinningRows] = useState<number[]>([]);
  const [devilRows, setDevilRows] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('A little luck goes a long way.');
  const [last, setLast] = useState(0);
  const [sound, setSound] = useState(false);
  const lock = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [history, setHistory] = useState<
    { r: number[][]; p: number; loss: number; cost: number; devil: boolean }[]
  >([]);
  const chance = 40 + s.levels[0] * 5;
  const netChance = chance * (1 - DEVIL_ROW_CHANCE) ** 3;
  const spinCost = Math.min(10, s.money);
  const multiplier = 1 + s.levels[1] * 0.5;
  const over = s.money === 0 && !busy;
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function tone(win: boolean) {
    if (!sound) return;
    try {
      const a = new AudioContext();
      const o = a.createOscillator();
      const g = a.createGain();
      o.connect(g);
      g.connect(a.destination);
      o.frequency.setValueAtTime(win ? 660 : 180, a.currentTime);
      o.frequency.exponentialRampToValueAtTime(
        win ? 990 : 80,
        a.currentTime + 0.2,
      );
      g.gain.setValueAtTime(0.06, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.3);
      o.start();
      o.stop(a.currentTime + 0.3);
      o.onended = () => void a.close();
    } catch {}
  }
  function spin() {
    if (lock.current || s.money === 0) return;
    lock.current = true;
    setBusy(true);
    setLast(0);
    setWinningRows([]);
    setDevilRows([]);
    setMessage('Let the good times roll…');
    const outcome = roll(chance, multiplier, s.levels[2]);
    const {
      win,
      reels: result,
      winningRows: matches,
      devilRows: devils,
    } = outcome;
    const { payout, loss, balance, cost } = settleSpin(s.money, outcome);
    setS((v) => ({ ...v, money: v.money - cost }));
    timer.current = setTimeout(() => {
      setReels(result);
      setWinningRows(matches);
      setDevilRows(devils);
      setLast(devils.length ? -loss : payout);
      setS((v) => ({
        ...v,
        money: balance,
        spins: v.spins + 1,
        wins: v.wins + (win ? 1 : 0),
        earned: v.earned + payout,
        best: Math.max(v.best, payout),
      }));
      setHistory((h) =>
        [
          { r: result, p: payout, loss, cost, devil: devils.length > 0 },
          ...h,
        ].slice(0, 5),
      );
      setMessage(
        devils.length
          ? 'Three devils. Half the bankroll lost; all payouts canceled.'
          : win
            ? `${matches.length} winning ${matches.length === 1 ? 'row' : 'rows'}. Beautiful.`
            : 'No match. The next spin is yours.',
      );
      setBusy(false);
      lock.current = false;
      tone(win);
    }, 1050);
  }
  function buy(i: number) {
    const u = upgrades[i],
      cost = u.base * 2 ** s.levels[i];
    if (lock.current || s.levels[i] >= u.max || s.money - cost < 10) return;
    setS((v) => ({
      ...v,
      money: v.money - cost,
      levels: v.levels.map((l, j) => (j === i ? l + 1 : l)),
    }));
    setMessage(u.name + ' upgraded. Make your own luck.');
  }
  function restart() {
    if (lock.current) return;
    setS(fresh());
    setReels([
      [0, 3, 4],
      [2, 1, 0],
      [4, 2, 3],
    ]);
    setWinningRows([]);
    setDevilRows([]);
    setHistory([]);
    setLast(0);
    setMessage('A fresh start. A hundred possibilities.');
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(
          (e.target as HTMLElement).tagName,
        )
      ) {
        e.preventDefault();
        spin();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  const api = useRef({ spin, s, busy });
  api.current = { spin, s, busy };
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: unknown,
          ) => Promise<void> | void;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    const register = (tool: unknown) => {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: controller.signal }),
        ).catch(() => {});
      } catch {}
    };
    register({
      name: 'get_slotty_game',
      description: 'Read the virtual bankroll, upgrades, and spin statistics.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: () => ({ ...api.current.s, busy: api.current.busy }),
    });
    register({
      name: 'spin_slotty',
      description:
        'Spend up to $10 of virtual money on one spin and return the resolved bankroll and statistics.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (input: unknown) => {
        if (!input || typeof input !== 'object' || Object.keys(input).length)
          throw new Error('Expected an empty object');
        if (lock.current || api.current.s.money <= 0)
          throw new Error('Cannot spin now');
        api.current.spin();
        await new Promise((resolve) => setTimeout(resolve, 1150));
        return { ...api.current.s, busy: api.current.busy };
      },
    });
    return () => controller.abort();
  }, []);
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Slotty home">
          <Clover size={30} fill="currentColor" />
          <span>
            slotty<span className="brand-dot">.</span>
          </span>
        </a>
        <span className="club">
          THE LUCKY CLUB <span>✳</span> EST. 2026
        </span>
        <span className="virtual">
          <i />
          All play. Virtual money.
        </span>
      </header>
      <section className="intro">
        <div>
          <div className="eyebrow">AN INCREMENTAL SLOT GAME</div>
          <h1>
            Make your own <em>luck.</em>
          </h1>
          <p>Spin. Win. Upgrade. See how far $100 can take you.</p>
        </div>
        <button
          className="icon-button"
          onClick={() => setSound(!sound)}
          aria-label={sound ? 'Mute sound' : 'Enable sound'}
        >
          {sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </section>
      <div className="game-grid">
        <section className="play-area">
          <div className="bankroll">
            <div>
              <span className="eyebrow">YOUR BANKROLL</span>
              <div className="balance">{cash(s.money)}</div>
            </div>
            <div className="bankroll-side">
              <span className="status-dot" />{' '}
              {over
                ? 'OUT OF LUCK'
                : busy
                  ? 'SPIN IN PROGRESS'
                  : 'READY TO ROLL'}
              <small>Started with $100</small>
            </div>
          </div>
          <div className="machine-assembly">
            <div
              className={
                'machine ' +
                (devilRows.length ? 'cursed' : last > 0 ? 'won' : '')
              }
            >
              <div className="machine-heading">
                <span>★</span>
                <span>THE LUCKY ORIGINAL</span>
                <span>★</span>
              </div>
              <div className="machine-sub">
                THREE REELS. THREE WINNING LINES.
              </div>
              <div className="reel-frame">
                <div
                  className="reels"
                  role="img"
                  aria-label={
                    busy
                      ? 'Three by three reels spinning'
                      : reels
                          .map(
                            (row, i) =>
                              `Row ${i + 1}: ${row.map((r) => ['cherry', 'lemon', 'bell', 'diamond', 'seven', 'devil'][r]).join(', ')}${devilRows.includes(i) ? ', devil penalty row' : winningRows.includes(i) ? ', winning row' : ''}`,
                          )
                          .join('; ')
                  }
                >
                  {reels.map((row, rowIndex) => (
                    <div
                      key={rowIndex}
                      className={
                        'reel-row ' +
                        (devilRows.includes(rowIndex)
                          ? 'devil-row'
                          : winningRows.includes(rowIndex)
                            ? 'winning-row'
                            : '')
                      }
                      aria-hidden="true"
                    >
                      <span className="payline left">▸</span>
                      {row.map((r, column) => (
                        <div
                          key={column}
                          className={'reel ' + (busy ? 'rolling' : '')}
                        >
                          <span
                            className={'symbol ' + (r === 4 ? 'seven' : '')}
                            style={{ animationDelay: `${column * -0.08}s` }}
                          >
                            {symbols[r]}
                          </span>
                          <span className="reel-shine" />
                        </div>
                      ))}
                      <span className="payline right">◂</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="result" role="status" aria-live="polite">
                {over
                  ? devilRows.length
                    ? 'Three devils. Bankroll empty. Game over.'
                    : 'The bankroll is empty. What a ride.'
                  : message}
                {last > 0 && <strong>+{cash(last)}</strong>}
                {last < 0 && (
                  <strong className="penalty">−{cash(-last)}</strong>
                )}
              </div>
              <div className="machine-controls">
                <div className="spin-cost">
                  <span>PER SPIN</span>
                  <strong>{cash(over ? 10 : spinCost)}</strong>
                </div>
                {over ? (
                  <button className="spin-button" onClick={restart}>
                    <RotateCcw size={21} /> PLAY AGAIN <span>$100</span>
                  </button>
                ) : (
                  <div className="lever-control">
                    <div className="lever-instructions">
                      <strong>{busy ? 'Good luck…' : 'Give it a pull.'}</strong>
                      <span>
                        {busy
                          ? 'The reels are rolling'
                          : 'Click or tap the lever to spin'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="machine-footer">
                {over ? (
                  'New run. Fresh upgrades. Another chance.'
                ) : (
                  <>
                    PRESS <kbd>SPACE</kbd> TO SPIN <span>•</span> TRUST THE
                    PROCESS
                  </>
                )}
              </div>
            </div>
            <button
              className={'slot-lever ' + (busy ? 'pulled' : '')}
              onClick={spin}
              disabled={busy || over}
              aria-label={
                over
                  ? 'Game over — start a new run to use the lever'
                  : busy
                    ? 'Spinning — lever locked'
                    : `Pull lever to spin for ${cash(spinCost)}`
              }
            >
              <span className="lever-assembly" aria-hidden="true">
                <span className="lever-plate" />
                <span className="lever-pivot" />
                <span className="lever-arm">
                  <span className="lever-knob" />
                </span>
              </span>
              <span className="lever-label" aria-hidden="true">
                {over ? 'EMPTY' : busy ? '•••' : 'PULL ↓'}
              </span>
            </button>
          </div>
          <div className="stats">
            <div>
              <span>TOTAL SPINS</span>
              <strong>{s.spins.toString().padStart(2, '0')}</strong>
            </div>
            <div>
              <span>TOTAL WON</span>
              <strong>{cash(s.earned)}</strong>
            </div>
            <div>
              <span>BIGGEST WIN</span>
              <strong>{cash(s.best)}</strong>
            </div>
          </div>
        </section>
        <aside className="shop">
          <div className="shop-heading">
            <div>
              <span className="eyebrow">INVEST IN YOURSELF</span>
              <h2>
                The upgrade shop<span>↗</span>
              </h2>
            </div>
          </div>
          <div className="luck-bar">
            <div>
              <span>
                <Clover size={16} /> Win chance
              </span>
              <strong>{netChance.toFixed(1)}%</strong>
            </div>
            <div className="track">
              <i style={{ width: netChance + '%' }} />
            </div>
            <small>
              Base match chance 40%{' '}
              <span>+{s.levels[0] * 5}% from upgrades</span>
            </small>
          </div>
          {upgrades.map((u, i) => {
            const level = s.levels[i],
              cost = u.base * 2 ** level,
              max = level === u.max;
            return (
              <article className="upgrade" key={u.name}>
                <div className={'upgrade-icon icon-' + i}>
                  <u.icon size={24} />
                </div>
                <div className="upgrade-content">
                  <div className="upgrade-title">
                    <h3>{u.name}</h3>
                    <span>
                      LVL {level}/{u.max}
                    </span>
                  </div>
                  <p>{u.desc}</p>
                  <div className="upgrade-effect">
                    {i === 0
                      ? '+5% match chance'
                      : i === 1
                        ? '+0.5× payout multiplier'
                        : '+8% diamond conversion'}
                  </div>
                  <div className="upgrade-bottom">
                    <div
                      className="levels"
                      aria-label={`Level ${level} of ${u.max}`}
                    >
                      {Array.from({ length: u.max }, (_, j) => (
                        <i key={j} className={j < level ? 'filled' : ''} />
                      ))}
                    </div>
                    <button
                      onClick={() => buy(i)}
                      disabled={busy || max || s.money < cost + 10}
                      aria-label={`Buy ${u.name} for ${cash(cost)}`}
                    >
                      {max ? (
                        'MAXED'
                      ) : (
                        <>
                          {cash(cost)} <ArrowUpRight size={15} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          <div className="shop-note">
            <Sparkles size={18} />
            <p>
              Luck is an investment.
              <br />
              <span>Keep $10 aside for your next spin.</span>
            </p>
          </div>
        </aside>
      </div>
      <section className="bottom-grid">
        <div className="payouts">
          <div className="section-label">
            KNOW YOUR MATCHES <span>{multiplier.toFixed(1)}× PAYOUT</span>
          </div>
          <p className="payout-rules">
            Each horizontal row pays separately. Row payouts add up; columns and
            diagonals do not pay.
          </p>
          <p className="devil-rule">
            😈 😈 😈 <strong>Lose 50%</strong> of your bankroll after the spin
            cost (rounded to the nearest dollar; .5 rounds up). All payouts are
            canceled, even on other rows. One penalty per spin. Devil pairs do
            not pay. Each row has a 2% devil-triple chance; the win meter
            includes this risk. Below $10, your final spin uses the remaining
            balance.
          </p>
          <div className="payout-list">
            <div>
              <span className="pair">
                AA<span>?</span>
              </span>
              <small>Normal pair</small>
              <strong>{cash(20 * multiplier)}</strong>
            </div>
            {symbols.slice(0, 5).map((x, i) => (
              <div key={i}>
                <span className={'payout-symbol ' + (i === 4 ? 'seven' : '')}>
                  {x}
                </span>
                <small>
                  Triple{' '}
                  {['cherry', 'lemon', 'bell', 'diamond', 'seven', 'devil'][i]}
                </small>
                <strong>
                  {cash(Math.round((prizes[i] * multiplier) / 10) * 10)}
                </strong>
              </div>
            ))}
          </div>
        </div>
        <div className="recent">
          <div className="section-label">
            LAST FIVE SPINS <span>{s.wins} WINS</span>
          </div>
          {history.length ? (
            <div className="history">
              {history.map((h, i) => (
                <div key={i}>
                  <span
                    className="history-grid"
                    aria-label={h.r
                      .map(
                        (row, n) =>
                          `Row ${n + 1}: ${row.map((r) => ['cherry', 'lemon', 'bell', 'diamond', 'seven', 'devil'][r]).join(', ')}`,
                      )
                      .join('; ')}
                  >
                    {h.r.flat().map((r, cell) => (
                      <span key={cell} aria-hidden="true">
                        {symbols[r]}
                      </span>
                    ))}
                  </span>
                  <strong
                    className={h.devil ? 'penalty' : h.p ? 'positive' : ''}
                  >
                    {h.devil
                      ? `Devils −${cash(h.loss)} · spin ${cash(h.cost)}`
                      : h.p
                        ? '+' + cash(h.p)
                        : '−' + cash(h.cost)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-history">
              <RotateCcw size={21} />
              <p>Your story starts with a spin.</p>
            </div>
          )}
        </div>
      </section>
      <footer>
        <span>
          <Clover size={15} /> A little risk. A lot of possibility.
        </span>
        <span>Virtual currency only · No real money</span>
      </footer>
    </main>
  );
}
