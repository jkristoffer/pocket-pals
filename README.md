# Pocket Pals

Pocket Pals is a parent-guided allowance and savings game for two children aged 9–10.

Children manage real money through three playful jars—**Spending**, **Savings**, and **Giving**—while caring for and unlocking virtual animal companions. The financial ledger remains grounded in real money; the game rewards remain virtual.

## Product status

**Game-first MVP implemented.** Child mode is a cozy interactive Home World rather than a finance dashboard; parent mode remains a practical management layer.

## Run locally

```bash
npm install
npm run dev
```

Tests:

```bash
npm test
```

The prototype persists data in browser `localStorage`. Parent mode uses demo PIN `2468`; production authentication is intentionally not implemented yet.

## MVP loop

1. Pick one of two child profiles and enter their Home World.
2. Request weekly allowance from the animated mailbox.
3. Parent approves the request in Parent Basecamp.
4. Return to the child and play Coin Drop to divide ten $1 coins among Spend, Save, and Give.
5. Open the Spending Pouch to record purchases or commit money to Save/Give.
6. Complete Quest Board chores and receive rewards after parent approval.
7. Watch wish progress, XP, collections, and the Adventure Book grow.

## Product principles

- Child mode should feel like a game, not a financial dashboard.
- The Home World itself is the primary navigation system.
- Reward habits, not wealth or sibling comparison.
- Keep real money and virtual rewards clearly separate.
- Give children ownership while preserving parent oversight.
- Never punish a child’s pet for missed activity or lower balances.

## Documentation

- [Living product specification](docs/product-spec.md)
- [Confirmed child game UX](docs/child-game-ux.md)

The product specification records financial/domain requirements. The child game UX document is the implementation contract for the game-first child experience.