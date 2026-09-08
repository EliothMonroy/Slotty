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
        : [symbol, symbol, (symbol + 1 + Math.floor(random() * 4)) % 5];
    payout =
      Math.round(
        ((new Set(reels).size === 1 ? prizes[symbol] : 20) * multiplier) / 10,
      ) * 10;
  } else {
    const first = Math.floor(random() * 5);
    const second = (first + 1 + Math.floor(random() * 4)) % 5;
    const remaining = [0, 1, 2, 3, 4].filter(
      (x) => x !== first && x !== second,
    );
    reels = [first, second, remaining[Math.floor(random() * 3)]];
  }
  return { win, reels, payout };
}

// Independent row odds preserve the displayed chance of at least one win per spin.
export function roll(
  chance: number,
  multiplier: number,
  diamondLevel: number,
  random = Math.random,
) {
  const rowChance = (1 - Math.cbrt(1 - chance / 100)) * 100;
  const rows = Array.from({ length: 3 }, () =>
    rollRow(rowChance, multiplier, diamondLevel, random),
  );
  return {
    win: rows.some((row) => row.win),
    reels: rows.map((row) => row.reels),
    payout: rows.reduce((sum, row) => sum + row.payout, 0),
    winningRows: rows.flatMap((row, i) => (row.win ? [i] : [])),
  };
}
