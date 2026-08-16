# Pocket Pals — MVP Implementation Notes

**Status:** First vertical slice  
**Decision date:** 16 August 2026  
**Branch:** `feat/mvp-foundation`

## Purpose

This implementation turns the discovery specification into a runnable, local-first family prototype. It is intentionally dependency-free so the household workflows and money rules can be tested before selecting production infrastructure.

The application records a family-managed ledger. It does not hold, move, or connect to real funds.

## Confirmed goal model

Savings goals are **visual progress goals**.

- Each child has one general Savings balance.
- Every active goal compares that same balance against its own target.
- Goals do not reserve or lock money.
- A child can request a goal purchase once general Savings reaches its target.
- Parent approval records the purchase and deducts the goal target from general Savings.
- Other goal progress updates immediately after that deduction.

This decision supersedes the unresolved goal-earmarking questions in product specification version 0.1.

## Implemented child workflows

- Select one of two child profiles.
- Request the current week’s SGD $10 allowance.
- Wait for parent approval.
- Sort ten $1 coins freely among Spending, Savings, and Giving.
- Allocate coins by tap, drag-and-drop, or plus/minus controls.
- View ledger-derived jar balances.
- Record a purchase from Spending without prior approval.
- Move Spending money into Savings or Giving.
- Create and view multiple visual savings goals.
- Request a purchase when a goal target is reached.
- Submit assigned chores for parent approval.
- View pet level, badges, and a child-friendly activity timeline.

## Implemented parent workflows

- Unlock the prototype dashboard with the local demo PIN.
- Approve or return weekly allowance requests.
- Approve or return goal purchase requests.
- Approve a chore once and pay its reward.
- Add gift or bonus money directly to a selected jar.
- Record a documented increase or decrease correction.
- Record when Giving money has been donated or used.
- Review child-recorded purchases.
- Create one-time paid chores for one or both children.
- Apply monthly savings interest manually.
- Apply monthly savings matching manually.
- View per-child balances, recent ledger entries, and Parent Bank totals.
- Export all local household data as JSON.
- Reset the seeded demonstration household.

## Ledger design

Amounts are stored as integer cents. Displayed balances are calculated from append-only balanced transactions rather than editable balance fields.

Current accounts:

- `household` — parent funding source.
- `unallocated` — approved allowance waiting for the child’s split.
- `spending` — cash held by the child.
- `savings` — money held by the parent or parent-managed bank account.
- `giving` — committed money held by the parent.
- `external` — money spent, donated, or released for a goal.
- `adjustment` — counter-account for documented corrections.

Every transaction contains an actor, timestamp, type, description, postings, and optional metadata. Idempotency keys prevent duplicate allowance funding, allowance allocation, chore rewards, goal purchases, monthly interest, and monthly matching.

## Child money rules

Children may initiate:

- Spending → Savings
- Spending → Giving

Children may not initiate:

- Savings → Spending
- Giving → Spending
- Giving → Savings
- Savings → Giving

Child actions cannot make a jar negative. Confirmed transactions are not edited or deleted; corrections become new ledger entries.

## Game progression

The first slice uses simple pet points and badges. Progress is awarded for participation and habits rather than total wealth.

Examples:

- Complete a weekly allowance split: 30 points.
- Record a purchase: 5 points.
- Move extra money into Savings or Giving: 10 points.
- Create a goal: 10 points.
- Complete a paid chore: 25 points.
- Complete a savings goal: 40 points.

A pet never becomes sick, unhappy, disappears, or loses progress because a child spends money or misses a week.

## MVP assumptions

These choices keep the first slice executable while further discovery continues:

- `Mia` and `Zoe` are placeholder profile names, not real child data.
- Animals and goal pictures use emoji placeholders instead of permanent art assets.
- Parent PIN `2468` is a local demonstration gate, not secure authentication.
- Bonuses go directly into a parent-selected jar.
- Chore rewards go directly into a parent-selected jar.
- A goal’s target amount is treated as its purchase amount when approved.
- Interest and savings matching are manually applied once per calendar month.
- Savings matching includes child-directed allowance allocations and Spending-to-Savings transfers, with a configurable cap.
- Data is stored in browser `localStorage` and is not synchronized across devices.

## Verification

Run:

```bash
npm run check
```

The check performs JavaScript syntax validation and Node’s built-in test suite. Tests cover:

- Weekly allowance lifecycle and duplicate protection.
- One-way child transfers and non-negative balances.
- Shared general Savings across visual goals.
- Chore reward idempotency.
- Interest and matching idempotency.
- Parent Bank reconciliation.

GitHub Actions runs the same command on branch pushes and pull requests.

## Next production priorities

1. Replace the local PIN with real parent authentication and child-safe profile access.
2. Move state and the ledger to a private database with household authorization.
3. Add profile, pet, and household settings rather than seeded placeholders.
4. Add settled-versus-unsettled Parent Bank reconciliation.
5. Add notifications and weekly scheduling using the household timezone.
6. Add image upload and a consistent illustrated animal asset system.
7. Add browser and accessibility testing for touch devices used by the children.
