# Pocket Pals

Pocket Pals is a parent-guided allowance, savings, and giving game for children aged 9–10.

Children manage real money through three playful jars—**Spending**, **Savings**, and **Giving**—while caring for virtual animal companions. The app is a family ledger; it does not hold or transfer funds.

## Current status

A dependency-free, local-first MVP is implemented on `feat/mvp-foundation`.

The vertical slice includes:

- Two child profiles and Animal Friends habitats.
- Weekly SGD $10 allowance request, parent approval, and ten-coin allocation.
- Tap, drag, and button-based coin sorting.
- Ledger-derived Spending, Savings, and Giving jars.
- Child-recorded purchases with later parent review.
- Spending → Savings/Giving transfers only.
- General Savings with multiple visual progress goals.
- Goal purchase requests and parent approval.
- Paid chores, bonuses, corrections, donations, interest, and matching.
- Parent Bank reconciliation and a recent ledger view.
- Pet points, levels, badges, local persistence, and JSON export.

## Run locally

Node.js 20 or newer is required. There are no package dependencies to install.

```bash
npm run dev
```

Open `http://localhost:4173`.

The seeded parent PIN is:

```text
2468
```

This PIN is only a demonstration gate stored in browser code. It is not production authentication.

## Verify

```bash
npm run check
```

This performs syntax checks and runs the built-in Node test suite. GitHub Actions runs the same command for branch pushes and pull requests.

## Architecture

```text
index.html                 App shell
styles.css                Responsive visual system
src/app.js                Browser UI and interaction flows
src/domain.js             Ledger, permissions, workflows, and game rules
src/storage.js            localStorage persistence and JSON export
scripts/serve.mjs         Dependency-free local server
tests/domain.test.mjs     Core money-rule tests
docs/                     Product and implementation decisions
```

The domain layer has no browser dependency. This keeps the rules testable and makes a later migration to React/Next.js and a database straightforward.

## Important product decision

Savings goals are visual only. Each child has one general Savings balance, and every goal compares that shared balance with its target. Goals do not lock or earmark money.

## Documentation

- [Living product specification](docs/product-spec.md)
- [MVP implementation notes](docs/mvp-implementation.md)

## Prototype limitations

- Data remains in one browser’s `localStorage` and does not sync across devices.
- Placeholder names, emoji pets, and emoji goal art are used.
- There is no secure authentication or household authorization yet.
- Weekly scheduling and notifications are not automated.
- Parent Bank shows ledger custody totals but not physical reconciliation status.

Do not enter real child names, photographs, or sensitive information until authentication, private storage, and household access controls are implemented.
