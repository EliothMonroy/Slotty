export const prizes = [40, 50, 80, 150, 250];
function rollRow(
  chance: number,
  multiplier: number,
  diamondLevel: number,
  random = Math.random,
) {
  const win = random() < chance / 100;
  let reels: number[];
  let payout = 0;
  if (win) {
    const triple = random() < 0.3;
    let symbol = Math.floor(random() * 5);
    if (random() < diamondLevel * 0.08) {
      symbol = 3;
      reels = [3, 3, 3];
    } else
      reels = triple
        ? [symbol, symbol, symbol]
        : [symbol, symbol, (symbol + 1 + Math.floor(random() * 5)) % 6];
    payout =
      Math.round(
        ((new Set(reels).size === 1 ? prizes[symbol] : 20) * multiplier) / 10,
      ) * 10;
  } else {
    const first = Math.floor(random() * 6);
    const second = (first + 1 + Math.floor(random() * 5)) % 6;
    const remaining = [0, 1, 2, 3, 4, 5].filter(
      (x) => x !== first && x !== second,
    );
    reels = [first, second, remaining[Math.floor(random() * remaining.length)]];
  }
  return { win, reels, payout };
}

export const DEVIL = 5;
export const DEVIL_ROW_CHANCE = 0.02;
export function devilRowChance(wardLevel: number) {
  return (
    DEVIL_ROW_CHANCE * 0.8 ** Math.min(5, Math.max(0, Math.floor(wardLevel)))
  );
}

export function evaluateGrid(reels: number[][], multiplier: number) {
  const devilRows = reels.flatMap((row, i) =>
    row.every((symbol) => symbol === DEVIL) ? [i] : [],
  );
  if (devilRows.length)
    return {
      win: false,
      reels,
      payout: 0,
      winningRows: [],
      devilRows,
      fatal: devilRows.length === 3,
    };
  const payouts = reels.map((row) => {
    const counts = new Map<number, number>();
    for (const symbol of row) counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
    for (const [symbol, count] of counts) {
      if (symbol !== DEVIL && count >= 2)
        return (
          Math.round(((count === 3 ? prizes[symbol] : 20) * multiplier) / 10) *
          10
        );
    }
    return 0;
  });
  return {
    win: payouts.some((p) => p > 0),
    reels,
    payout: payouts.reduce((sum, p) => sum + p, 0),
    winningRows: payouts.flatMap((p, i) => (p > 0 ? [i] : [])),
    devilRows,
    fatal: false,
  };
}

export function settleSpin(
  bankroll: number,
  outcome: ReturnType<typeof evaluateGrid>,
  stake = 10,
) {
  if (!Number.isInteger(stake) || stake < 10 || stake > 100 || stake % 10 !== 0)
    throw new Error('Spin cost must be $10–$100 in steps of $10');
  if (bankroll < stake) throw new Error('Not enough money for this spin');
  const cost = stake;
  const remaining = bankroll - cost;
  const loss = outcome.fatal
    ? remaining
    : outcome.devilRows.length
      ? Math.round(remaining / 2)
      : 0;
  const payout = outcome.devilRows.length ? 0 : outcome.payout * (stake / 10);
  return {
    cost,
    loss,
    payout,
    balance: remaining - loss + payout,
  };
}

// Devil checks are independent of luck and run after all ordinary outcomes.
export function roll(
  chance: number,
  multiplier: number,
  diamondLevel: number,
  random = Math.random,
  wardLevel = 0,
) {
  const rowChance = (1 - Math.cbrt(1 - chance / 100)) * 100;
  const reels = Array.from(
    { length: 3 },
    () => rollRow(rowChance, multiplier, diamondLevel, random).reels,
  );
  for (let i = 0; i < reels.length; i++)
    if (random() >= 1 - devilRowChance(wardLevel))
      reels[i] = [DEVIL, DEVIL, DEVIL];
  return evaluateGrid(reels, multiplier);
}
