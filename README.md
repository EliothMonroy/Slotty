# Slotty

A browser slot game with virtual money. Start at $100; each spin costs $10. Matching pairs and triples pay the amounts shown in the game. At $0, the run ends and Play again resets the bankroll and upgrades.

- Lucky charm adds 5 percentage points to the starting 40% win chance per level (80% maximum).
- Heavy pockets adds 0.5 to the payout multiplier per level (3.5× maximum).
- Diamond touch converts 8% more winning outcomes per level into triple diamonds (40% maximum).
- Upgrade prices double each level. Purchases reserve $10 for another spin.
- Payouts round to the nearest $10, so the balance can always fund whole spins.
- Runs are held in memory; refreshing starts over. No real money, accounts, or payments.

## Development

Use Node 22.13+ and npm. Run `npm ci`, then `npm run dev`. `npm run build` builds the Sites application; `npx tsc --noEmit` checks types.

## Verification

Production build and TypeScript checks passed. 90,000 generated outcomes were checked for valid symbols, matching outcomes, payout consistency, and multiples of $10. The preview route returned HTTP 200. Browser interaction and visual QA were not run. Optional WebMCP tools are feature-detected; no supported WebMCP validation context was available.
