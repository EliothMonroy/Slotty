import assert from 'node:assert/strict';
import test from 'node:test';
import {
  roll,
  prizes,
  evaluateGrid,
  settleSpin,
  DEVIL_ROW_CHANCE,
} from '../lib/game.ts';

test('all three horizontal rows pay and totals add up', () => {
  const result = roll(100, 1, 0, () => 0);
  assert.deepEqual(result.reels, [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]);
  assert.deepEqual(result.winningRows, [0, 1, 2]);
  assert.equal(result.payout, prizes[0] * 3);
});

test('one winning row pays once; vertical matches do not count', () => {
  const values = [0, 0, 0, 0.9, 0.99, 0, 0, 0, 0.99, 0, 0, 0];
  const result = roll(40, 1, 0, () => values.shift());
  assert.deepEqual(result.reels, [
    [0, 0, 0],
    [0, 1, 2],
    [0, 1, 2],
  ]);
  assert.deepEqual(result.winningRows, [0]);
  assert.equal(result.payout, 40);
  const loss = roll(0, 1, 0, () => 0.5);
  assert.equal(loss.win, false);
  assert.equal(loss.payout, 0);
  assert.deepEqual(loss.winningRows, []);
});

test('diamond conversion and multiplier apply to each winning row', () => {
  const result = roll(100, 3.5, 5, () => 0);
  assert.deepEqual(result.reels, [
    [3, 3, 3],
    [3, 3, 3],
    [3, 3, 3],
  ]);
  assert.equal(result.payout, 530 * 3);
});

test('grid validity, summed payouts, and overall advertised odds at every luck level', () => {
  let seed = 42;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let level = 0; level <= 8; level++) {
    let wins = 0;
    for (let i = 0; i < 10000; i++) {
      const multiplier = 1 + (i % 6) * 0.5;
      const result = roll(40 + level * 5, multiplier, i % 6, random);
      assert.equal(result.reels.length, 3);
      let expected = 0;
      result.reels.forEach((row, index) => {
        assert.equal(row.length, 3);
        assert(row.every((s) => Number.isInteger(s) && s >= 0 && s < 6));
        const unique = new Set(row).size;
        assert.equal(
          result.winningRows.includes(index),
          !result.devilRows.length &&
            row.some(
              (symbol) =>
                symbol !== 5 && row.filter((s) => s === symbol).length >= 2,
            ),
        );
        expected +=
          unique === 3 || row[0] === 5
            ? 0
            : Math.round(
                ((unique === 1 ? prizes[row[0]] : 20) * multiplier) / 10,
              ) * 10;
      });
      if (result.devilRows.length) expected = 0;
      assert.equal(result.payout, expected);
      assert.equal(result.win, expected > 0);
      assert.equal(result.payout % 10, 0);
      wins += Number(result.win);
    }
    assert(
      Math.abs(
        wins / 10000 - ((40 + level * 5) / 100) * (1 - DEVIL_ROW_CHANCE) ** 3,
      ) < 0.02,
    );
  }
});

test('devil triple overrides all ordinary payouts and charges half after the spin cost', () => {
  const outcome = evaluateGrid(
    [
      [5, 5, 5],
      [4, 4, 4],
      [3, 3, 3],
    ],
    3.5,
  );
  assert.equal(outcome.win, false);
  assert.equal(outcome.payout, 0);
  assert.deepEqual(outcome.winningRows, []);
  assert.deepEqual(outcome.devilRows, [0]);
  assert.deepEqual(settleSpin(100, outcome), {
    cost: 10,
    loss: 45,
    payout: 0,
    balance: 45,
  });
});

test('multiple devil rows charge only once and upgrades never protect against the penalty', () => {
  const outcome = evaluateGrid(
    [
      [5, 5, 5],
      [5, 5, 5],
      [5, 5, 5],
    ],
    3.5,
  );
  assert.equal(settleSpin(100, outcome).balance, 45);
  assert.deepEqual(roll(100, 3.5, 5, () => 0.99).devilRows, [0, 1, 2]);
});

test('devil pairs and diagonal devils do not trigger penalty or pay', () => {
  const outcome = evaluateGrid(
    [
      [5, 5, 0],
      [1, 5, 2],
      [1, 2, 5],
    ],
    1,
  );
  assert.equal(outcome.payout, 0);
  assert.deepEqual(outcome.devilRows, []);
  assert.equal(settleSpin(100, outcome).balance, 90);
  const mixed = evaluateGrid(
    [
      [0, 5, 0],
      [1, 2, 3],
      [1, 2, 5],
    ],
    1,
  );
  assert.equal(mixed.payout, 20);
});

test('devil penalties round to whole dollars and partial final spins never go negative', () => {
  const devil = evaluateGrid(
    [
      [5, 5, 5],
      [0, 1, 2],
      [1, 2, 3],
    ],
    1,
  );
  assert.deepEqual(settleSpin(45, devil), {
    cost: 10,
    loss: 18,
    payout: 0,
    balance: 17,
  });
  assert.equal(settleSpin(11, devil).balance, 0);
  assert.equal(settleSpin(7, devil).balance, 0);
  assert.equal(settleSpin(0, devil).balance, 0);
  const win = evaluateGrid(
    [
      [0, 0, 0],
      [0, 1, 2],
      [1, 2, 3],
    ],
    1,
  );
  assert.deepEqual(settleSpin(7, win), {
    cost: 7,
    loss: 0,
    payout: 40,
    balance: 40,
  });
});

test('all integer bankrolls keep integer balances through devil penalties', () => {
  const devil = evaluateGrid(
    [
      [5, 5, 5],
      [0, 0, 0],
      [4, 4, 4],
    ],
    1,
  );
  for (let bankroll = 0; bankroll <= 1000; bankroll++) {
    const result = settleSpin(bankroll, devil);
    assert.equal(result.loss, Math.round(Math.max(0, bankroll - 10) / 2));
    assert(Number.isInteger(result.balance));
    assert(result.balance >= 0);
    assert.equal(result.balance + result.loss + result.cost, bankroll);
    assert.equal(result.payout, 0);
  }
});
