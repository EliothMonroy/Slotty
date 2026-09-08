# Slotty

A browser slot game with virtual money. Start at $100; each spin costs $10 (or your remaining bankroll if less). The machine has a 3×3 grid. Each horizontal row pays separately for matching pairs or triples; row payouts are added together. Columns and diagonals do not pay. Click or tap the lever (or press Space) to spin. The lever locks while the reels are rolling. At $0, the run ends and Play again resets the bankroll and upgrades.

- Lucky charm adds 5 percentage points to the starting 40% win chance per level (80% maximum).
- The win-chance meter measures at least one winning row per spin. Each independent row uses `1 - (1 - matchChance)^(1/3)` ordinary match odds; net win chance is `matchChance * 0.98^3` after devil overrides.
- Heavy pockets adds 0.5 to the payout multiplier per level (3.5× maximum).
- Diamond touch converts 8% more winning rows per level into triple diamonds (40% maximum).
- Upgrade prices double each level. Purchases reserve $10 for another spin.
- Normal payouts round to the nearest $10. A horizontal triple of devils cancels every payout and deducts 50% of the bankroll remaining after the spin cost, rounded to the nearest cent. Multiple devil rows trigger only one penalty. Devil pairs do not pay.
- Devil triples have an independent 2% chance per row, unaffected by upgrades. The displayed win chance includes the chance of a devil override.
- Runs are held in memory; refreshing starts over. No real money, accounts, or payments.

## Development

Use Node 22.13+ and npm. Run `npm ci`, then `npm run dev`. `npm run build` builds the Sites application; `npx tsc --noEmit` checks types.

## Verification

Run `node --experimental-strip-types --test tests/game.test.mjs` for grid, per-row payout, diamond upgrade, and overall win-chance checks (90,000 seeded spins).

Production build and TypeScript checks passed. 90,000 generated outcomes were checked for valid symbols, matching outcomes, payout consistency, and multiples of $10. The preview route returned HTTP 200. Browser interaction and visual QA were not run. Optional WebMCP tools are feature-detected; no supported WebMCP validation context was available.

## Standalone HTML

Open `index.html` directly in a browser to play without installing dependencies. It includes the game, React runtime, icons, and styles. Regenerate after changes with `node scripts/export-html.mjs`.

## Hosting status

Private publishing was attempted twice and failed in the hosting service with HTTP 409 Conflict during sign-in callback registration. The local game and standalone HTML remain usable.

- Site: `appgprj_6aa05845c35881919d6c6886b9266d51`
- Saved version: `appgprj_6aa05845c35881919d6c6886b9266d51~appgver_13572beca94c81918232295cde3379c4`
- Last failed deployment: `appgdep_6aa059d236588191b914b5eca648c70d`
