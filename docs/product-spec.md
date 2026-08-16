# Pocket Pals — Product Specification

**Status:** Discovery draft  
**Version:** 0.1  
**Purpose:** Living source of truth for product design and implementation

## 1. Product definition

Pocket Pals is a parent-guided allowance, savings, and giving tracker designed initially for one household with two children aged 9 and 10.

The child experience should feel like an animal-care game rather than a conventional finance application. Children manage real money through three visual jars while healthy money habits progress virtual pets, habitats, badges, and cosmetic rewards.

The application does not hold or transfer real funds. It records a family-managed ledger that corresponds to physical cash or money held by the parent.

## 2. Confirmed product goals

Pocket Pals should help each child:

1. Understand how much money they currently have.
2. Save toward specific things they want.
3. Practise choosing how much to spend, save, and give.

Success should be measured by comprehension and habit formation, not by which child accumulates the most money.

## 3. Confirmed household model

- Two child profiles, initially aged 9 and 10.
- Default weekly allowance: **SGD $10 per child**.
- Money custody is mixed:
  - **Spending:** physical cash held by the child.
  - **Savings:** real money held by the parent or in a parent-managed bank account.
  - **Giving:** real money held by the parent until donated.
- The child requests each weekly allowance.
- The parent approves the request.
- After approval, the child freely divides the entire $10 between Spending, Savings, and Giving.
- Both children initially follow the same rules.

Amounts must be stored in integer cents. The interface may display whole-dollar coins during the standard $10 allowance flow but the ledger must support cents for purchases, interest, adjustments, and future allowance changes.

## 4. Product principles

### 4.1 Financial integrity

- The ledger is the source of truth for all balances.
- Every balance change must have a timestamp, actor, type, amount, and human-readable description.
- Confirmed transactions are not silently edited or deleted. Corrections are represented by reversing or adjustment entries.
- The system must prevent accidental duplicate allowance approvals and duplicate reward payments.
- Child-accessible actions must not produce a negative jar balance.

### 4.2 Child ownership with parent oversight

- Children can request allowance, allocate it, record spending, manage goals, and initiate permitted transfers.
- Parents approve actions that create new family liabilities or release parent-held money.
- Routine spending from child-held cash does not require pre-approval; it is visible for later parent review.

### 4.3 Positive game design

- Virtual progression rewards habits and participation, not the size of a child’s balance.
- A pet must never become sick, sad, disappear, or regress because a child missed a week or spent money.
- No ranking based on total money, total savings, or parental bonuses.
- Sibling comparison, when present, should be cooperative or based on personal consistency rather than absolute amounts.
- Cosmetics are earned through app activity and are never purchased with the child’s real money.

### 4.4 Age-appropriate interaction

- Use plain language and short instructions.
- Prefer visual choices over financial jargon.
- Provide large tap targets and clear confirmations.
- Make irreversible child actions explicit without making the interface intimidating.
- Avoid dense charts on child screens.

## 5. Roles and permissions

### 5.1 Child

A child can:

- View their own jars, goals, pet, chores, rewards, and history.
- Request the current week’s allowance.
- Allocate an approved allowance across the three jars.
- Record a purchase from Spending.
- Transfer money from Spending to Savings or Giving.
- Create and manage savings goals within parent-configured limits.
- Request use of Savings for a goal purchase.
- Mark a chore as complete.
- View parent praise and app achievements.

A child cannot:

- Approve or create allowance funds.
- Transfer money out of Savings or Giving.
- Directly release parent-held money.
- Change ledger entries after confirmation.
- Configure interest, matching, allowance amount, or household settings.
- View the sibling’s detailed transaction history unless explicitly enabled later.

### 5.2 Parent

A parent can:

- Manage both child profiles.
- Approve or decline weekly allowance requests.
- Add bonus money for birthdays, gifts, chores, or other reasons.
- Make documented corrections or deductions.
- Approve savings withdrawals for goal purchases.
- Review spending records.
- Create and manage paid chores.
- Configure and apply savings interest.
- Configure and apply matching contributions.
- View balances, reports, transaction history, and money held in the Parent Bank.
- Manage goals, pets, rewards, and household settings where necessary.

## 6. Money model

### 6.1 Jars

Each child has three primary money accounts:

| Jar | Meaning | Real-world custody |
| --- | --- | --- |
| Spending | Money available for ordinary purchases | Child |
| Savings | Money intentionally retained for later use | Parent/bank |
| Giving | Money committed for donation or helping others | Parent |

The application should visually render these as jars that fill in a playful way. The visual fill level must not imply a hard capacity unless a target is explicitly configured.

### 6.2 Allowed transfers

Children may initiate:

- Spending → Savings
- Spending → Giving

Children may not initiate:

- Savings → Spending
- Giving → Spending
- Giving → Savings
- Savings → Giving

Once a child confirms a transfer into Savings or Giving, it is a commitment. A parent may correct genuine mistakes using a documented adjustment rather than an invisible reversal.

### 6.3 Parent Bank

The Parent Bank is a parent-only reconciliation view showing the real money the parent should currently be holding.

For each child it shows:

- Savings held.
- Giving held.
- Pending approved withdrawals.
- Total parent-held amount.

Household total:

`sum(all child Savings balances + all child Giving balances - approved but unsettled releases)`

The Parent Bank must clearly distinguish ledger balance from whether the parent has physically reconciled or moved the equivalent cash.

### 6.4 Ledger architecture

Implementation should use an append-only double-entry or equivalently auditable ledger. Displayed balances should be derived from ledger entries rather than maintained as independently editable numbers.

Suggested internal accounts include:

- Household funding source.
- Child unallocated funds.
- Child Spending.
- Child Savings.
- Child Giving.
- Goal earmarks, if goals use real sub-balances.
- Parent-held settlement account.
- External spending/donation sink.
- Adjustment and reversal accounts.

The final account model depends on the unresolved savings-goal funding decision.

## 7. Core workflows

### 7.1 Weekly allowance

Allowance-cycle states:

1. `DUE` — the current weekly allowance can be requested.
2. `REQUESTED` — child submitted a request; parent action is pending.
3. `APPROVED_FOR_ALLOCATION` — parent approved; funds await child allocation.
4. `ALLOCATING` — child is arranging the allowance across jars.
5. `COMPLETED` — the full allowance was allocated and ledger entries were posted.
6. `DECLINED` or `RETURNED` — optional parent response with a child-friendly note.

Rules:

- Only one active allowance cycle per child per week.
- A child cannot request the same cycle twice.
- Parent approval does not allow the child to receive more than the configured allowance.
- During allocation, the interface presents ten draggable $1 coins for the default $10 allowance.
- The child may rearrange coins freely before confirming.
- Confirmation is enabled only when all approved money is allocated.
- Zero allocation to a jar is allowed because the child has free choice.
- Once confirmed, the split is immutable; later changes use permitted transfers or parent adjustments.
- The pet celebrates completion without praising one allocation choice over another.

### 7.2 Recording spending

Flow:

1. Child opens the Spending jar and taps **Record purchase**.
2. Child enters amount and a short description.
3. Optional fields may include category, picture, and date.
4. App previews the new Spending balance.
5. Child confirms.
6. Spending is immediately reduced and the record is marked `UNREVIEWED`.
7. Parent can later mark it `REVIEWED`, add a note, or create a correcting transaction.

Rules:

- Purchase amount must be greater than zero and no more than the Spending balance.
- Parent approval is not required before posting.
- Review status does not affect the balance.
- A child cannot directly edit or delete a confirmed purchase.

### 7.3 Moving Spending into Savings or Giving

Flow:

1. Child selects **Move money** from the Spending jar.
2. Child selects Savings or Giving as the destination.
3. Child selects an amount.
4. App explains that the money cannot be moved back by the child.
5. Child confirms.
6. Ledger transfer posts immediately and both jars animate.

### 7.4 Savings goals

Confirmed requirements:

- A child has a general Savings balance.
- A child may have multiple savings goals.
- Each goal includes:
  - Name.
  - Picture or visual representation.
  - Target amount.
  - Playful progress visualization.
- Goals should feel exciting and concrete rather than like accounting sub-ledgers.

Still unresolved:

- Whether goal money is truly earmarked or whether goals only visualize progress against the general Savings balance.
- Whether money can be allocated directly to a goal during weekly allowance allocation.
- Whether goal contributions can be moved between goals.
- Whether the child or parent creates goals and supplies goal pictures.

These decisions must be resolved before implementing goal balances.

### 7.5 Goal purchase and savings release

Proposed state model:

- `ACTIVE`
- `TARGET_REACHED`
- `PURCHASE_REQUESTED`
- `APPROVED`
- `PURCHASED`
- `CANCELLED`
- `ARCHIVED`

Confirmed parent capability:

- The child requests use of Savings for a goal purchase.
- The parent approves release of the parent-held money.
- Approval and settlement are recorded separately if the real-world purchase occurs later.

The exact rules for partial purchases, changed prices, leftover money, and cancelled goals remain open.

### 7.6 Giving

Giving is a committed parent-held balance. The product must eventually support recording when money is donated so the jar reflects available committed funds rather than an ever-growing lifetime total.

The donation workflow, recipient details, child involvement, and privacy level remain open requirements.

### 7.7 Bonuses and gifts

Parent can add money with:

- Amount.
- Reason.
- Date.
- Optional personal message.
- Destination or allocation method.

Whether a bonus goes directly to a chosen jar or enters a child allocation flow is not yet decided.

### 7.8 Chores

Parent capabilities:

- Create a one-time or repeating chore.
- Set description and reward amount.
- Assign it to one or both children.
- Optionally set a due date.
- Review a child’s completion claim.
- Approve and pay the reward.

Proposed states:

- `AVAILABLE`
- `CLAIMED`
- `SUBMITTED`
- `APPROVED`
- `PAID`
- `DECLINED`
- `EXPIRED`

A chore reward must not post twice. The destination/allocation behavior for approved rewards remains open.

### 7.9 Savings interest

Parent can configure and apply interest to Savings.

Minimum requirements:

- Rate or fixed amount.
- Frequency or manual application.
- Optional maximum payout.
- Clear explanation shown to the child.
- Ledger record identifying interest as parent-funded bonus money.
- Idempotency to prevent duplicate payment for the same period.

### 7.10 Savings matching

Parent can configure a rule such as “Parent adds $1 for each $1 newly saved.”

Minimum requirements:

- Match ratio.
- Eligible source actions.
- Time period.
- Per-period or lifetime cap.
- Automatic or parent-confirmed payout.
- Ledger trace linking the match to qualifying savings transactions.

Interest and matching must remain distinct in reports.

## 8. Game and visual system

### 8.1 Theme

The confirmed theme is **Animal Friends**.

Possible initial animals include a panda, fox, otter, bunny, red panda, or capybara. Selection should be customizable and not tied to gender stereotypes.

### 8.2 Progression

Children may unlock:

- Animal companions.
- Pet accessories.
- Toys.
- Habitats and backgrounds.
- Jar designs.
- Stickers and badges.
- Seasonal cosmetic items.

Progress should be awarded for behaviours such as:

- Completing the weekly allowance allocation.
- Recording purchases consistently.
- Contributing to Savings.
- Contributing to Giving.
- Completing a personal goal.
- Completing approved chores.
- Maintaining personal participation streaks.

Avoid awarding substantially more progression merely because a parent gives a larger bonus.

### 8.3 Pet behaviour

The pet may celebrate, encourage, explain, and acknowledge milestones. It should not pressure the child to save a specific percentage unless the parent later enables a teaching rule.

Allowed emotional states are temporary and positive or neutral, such as curious, excited, sleepy, proud, and playful. The pet must not guilt the child.

### 8.4 Jar interaction

During allowance allocation:

- Approved money appears as draggable coins.
- Each jar has distinct, gentle visual and audio feedback.
- Spending may rattle, Savings may glow, and Giving may sparkle.
- The total remaining to allocate remains visible.
- Coins must also be allocatable through accessible buttons; drag-and-drop cannot be the only input method.

## 9. Proposed information architecture

### 9.1 Child experience

1. **Profile entry / child unlock**
   - Select child profile.
   - Child-safe access method to be decided.

2. **Home habitat**
   - Pet and current mood/animation.
   - Three jar balances.
   - Current goal progress.
   - Allowance status.
   - Chores or simple quests.
   - Recent achievement.

3. **Allowance request**
   - Current week and amount.
   - Request button.
   - Pending/approved state.

4. **Coin allocation**
   - Ten coins for the default allowance.
   - Three jars.
   - Amount in each jar.
   - Unallocated remainder.
   - Confirmation step.

5. **Jar detail**
   - Balance.
   - Relevant actions.
   - Simple recent history.

6. **Record purchase**
   - Amount, description, optional category/image.
   - Balance preview and confirmation.

7. **Savings goals**
   - Goal cards with pictures and progress.
   - General Savings balance.
   - Create/view goal actions.

8. **Goal detail**
   - Target and progress.
   - Contribution history.
   - Purchase request when eligible.

9. **Giving**
   - Giving balance.
   - Simple explanation of committed money.
   - Donation history when that workflow is defined.

10. **Chores**
    - Available and submitted chores.
    - Reward and due date.

11. **Pet and collection**
    - Current pet.
    - Unlocked cosmetics and habitats.
    - Personal achievements.

12. **History**
    - Child-friendly activity timeline.
    - No accounting terminology.

### 9.2 Parent experience

1. **Parent unlock**
   - Secure parent-only authentication.

2. **Household dashboard**
   - Both children at a glance.
   - Pending approvals.
   - Jar balances.
   - Current goals.
   - Quick actions.

3. **Approval inbox**
   - Allowance requests.
   - Chore claims.
   - Goal purchase requests.
   - Other parent-gated actions.

4. **Child detail**
   - Balances, goals, chores, incentives, activity, and controls.

5. **Add money / adjustment**
   - Bonus, gift, correction, deduction, reversal.
   - Mandatory reason for adjustments and deductions.

6. **Parent Bank**
   - Per-child Savings and Giving custody totals.
   - Household total and reconciliation status.

7. **Chore manager**
   - Create, assign, repeat, review, and pay chores.

8. **Savings incentives**
   - Configure interest and matching independently.
   - Preview financial effect before enabling.

9. **Reports and history**
   - Money flow by child, jar, and transaction type.
   - Spending patterns and goal progress.
   - Export is a later decision.

10. **Household settings**
    - Weekly allowance amount and due day.
    - Currency and timezone.
    - Child profiles and visuals.
    - Notifications and privacy.

## 10. Proposed domain entities

The final schema may differ, but implementation should cover these concepts.

### Household and identity

- `households`
- `parent_users`
- `child_profiles`
- `household_memberships`
- `auth_credentials` or external authentication references

### Money and ledger

- `money_accounts`
- `ledger_transactions`
- `ledger_entries`
- `transaction_reviews`
- `parent_bank_reconciliations`

### Allowance

- `allowance_rules`
- `allowance_cycles`
- `allowance_requests`
- `allowance_allocations`

### Goals

- `savings_goals`
- `goal_contributions` or `goal_earmarks`
- `goal_purchase_requests`
- `goal_settlements`

### Chores and incentives

- `chores`
- `chore_assignments`
- `chore_submissions`
- `reward_payments`
- `interest_rules`
- `interest_runs`
- `matching_rules`
- `matching_runs`

### Game system

- `pet_definitions`
- `child_pets`
- `reward_definitions`
- `reward_unlocks`
- `achievement_definitions`
- `child_achievements`
- `habit_events`

### Media and notifications

- `media_assets`
- `notifications`
- `parent_messages`

Every table containing child activity should be scoped by household and protected by authorization checks; a supplied child ID alone must never grant access.

## 11. Proposed application commands

These names are illustrative and can map to REST endpoints, server actions, RPC methods, or use cases.

### Child commands

- `requestWeeklyAllowance(childId, cycleId)`
- `confirmAllowanceAllocation(childId, cycleId, spending, savings, giving)`
- `recordPurchase(childId, amount, description, metadata)`
- `transferFromSpending(childId, destination, amount)`
- `createSavingsGoal(childId, goal)`
- `contributeToGoal(childId, goalId, amount)` — pending goal-funding decision
- `requestGoalPurchase(childId, goalId, expectedAmount)`
- `submitChore(childId, assignmentId, note)`
- `equipPetCosmetic(childId, cosmeticId)`

### Parent commands

- `approveAllowanceRequest(parentId, requestId)`
- `declineAllowanceRequest(parentId, requestId, note)`
- `addBonus(parentId, childId, amount, reason, destination)`
- `postAdjustment(parentId, childId, amount, account, reason)`
- `reviewPurchase(parentId, transactionId, note)`
- `approveGoalPurchase(parentId, requestId)`
- `settleGoalPurchase(parentId, requestId, actualAmount)`
- `createChore(parentId, chore)`
- `approveChoreSubmission(parentId, submissionId)`
- `payChoreReward(parentId, submissionId)`
- `configureInterestRule(parentId, childId, rule)`
- `runInterest(parentId, period)`
- `configureMatchingRule(parentId, childId, rule)`
- `runMatching(parentId, period)`
- `reconcileParentBank(parentId, snapshot)`

All money-changing commands require idempotency protection, authorization, validation, and atomic ledger posting.

## 12. Notifications

Likely notifications include:

- Parent: allowance requested.
- Child: allowance approved or returned.
- Parent: chore submitted.
- Child: chore approved and reward available.
- Parent: goal purchase requested.
- Child: goal purchase approved.
- Household: allowance due reminder.

Delivery channel is not yet selected. In-app notifications are sufficient for the first implementation unless product platform decisions require push notifications.

## 13. Reporting

### Child-facing

- Current jar balances.
- Progress toward personal goals.
- Personal streaks and achievements.
- Simple activity timeline.
- Positive insights such as “You added money to Savings three weeks in a row.”

### Parent-facing

- Balance by child and jar.
- Parent-held liability total.
- Allowance history.
- Purchases by period and optional category.
- Savings and giving contributions.
- Goal completion.
- Chore rewards, bonuses, interest, and matching shown separately.
- Full ledger audit trail.

Reports must not present one child as financially better than the other.

## 14. MVP scope

The first usable product should include all explicitly requested parent controls while keeping the game system deliberately small.

### Required child functionality

- Two child profiles.
- View three jars and balances.
- Request weekly allowance.
- Allocate approved allowance.
- Record purchases.
- Move Spending to Savings or Giving.
- General Savings plus multiple goals.
- Goal purchase request.
- View and submit chores.
- One active pet per child.
- Basic achievements and cosmetic unlocks.
- Child-friendly history.

### Required parent functionality

- Parent authentication.
- Household dashboard.
- Approve weekly allowance.
- Add bonuses and gifts.
- Post deductions and corrections.
- Review purchases.
- Approve savings use for goals.
- Create and approve paid chores.
- Configure/apply interest.
- Configure/apply matching contributions.
- View reports, full history, and Parent Bank.

### Deliberately excluded from initial MVP unless later selected

- Real bank integrations or money movement.
- Public profiles, friends, chat, or social sharing.
- Competitive balance leaderboards.
- In-app purchases.
- Open-ended virtual economy.
- AI-generated financial advice to children.
- Multi-household institutions or classroom support.
- Complex investment education.

## 15. Baseline acceptance criteria

### Allowance

- A child can submit no more than one request for an allowance cycle.
- A parent can approve a pending request once.
- The child cannot confirm allocation until the full approved amount is assigned.
- Confirming allocation atomically updates all three jar balances and closes the cycle.
- Retrying the same request cannot duplicate funds.

### Spending

- A child can record a purchase no larger than their Spending balance.
- The purchase reduces Spending immediately.
- Parent review does not change the balance.
- Any correction creates a visible linked adjustment.

### Transfers

- A child can move money from Spending to Savings or Giving.
- The interface blocks every other child-initiated transfer direction.
- The transfer posts atomically and cannot create a negative balance.

### Goals

- A child can view more than one active goal.
- Each goal shows a name, image, target, and progress.
- Goal progress and Savings balance remain mathematically consistent under the selected funding model.
- Savings cannot leave parent custody without a parent-authorized ledger event.

### Parent Bank

- Parent Bank totals equal the ledger balances for all parent-held accounts.
- Per-child totals and household total are visible.
- Reconciliation does not alter balances unless the parent separately posts an adjustment.

### Chores and incentives

- A chore reward cannot be paid twice.
- Interest and matching runs cannot duplicate the same period.
- Interest, match, chore reward, gift, and allowance remain separately identifiable in history.

### Security and privacy

- A child cannot access parent-only screens through direct navigation or crafted requests.
- One child cannot mutate the sibling’s data.
- Uploaded goal images are private to the household by default.
- Sensitive parent operations require recent parent authentication.

### Game system

- Real money balances cannot be spent on virtual cosmetics.
- Missing activity cannot remove previously earned pets or cosmetics.
- Pet feedback never shames a child for spending, saving less, or missing a streak.

## 16. Open requirements

The following decisions should be resolved through the continuing interview before this specification is considered implementation-ready:

1. Exact savings-goal funding and earmarking model.
2. Goal creation, editing, cancellation, and purchase-settlement rules.
3. What happens to giving money when a donation is made.
4. Where bonuses, gifts, chore rewards, interest, and matching initially land.
5. Weekly due day, missed-week behaviour, and whether allowance can accumulate.
6. Parent and child authentication model, including shared-device behaviour.
7. Target platform: responsive web/PWA, native mobile, or both.
8. Notification channels.
9. Chore recurrence, proof, expiry, and disputes.
10. Interest and matching formulas, caps, and automatic/manual operation.
11. Spending categories, photos, receipts, and parent correction flow.
12. Pet progression, achievement thresholds, and amount of sibling visibility.
13. Goal-picture source: presets, camera/upload, image search, or combinations.
14. Data export, backup, deletion, and child privacy expectations.
15. Technical stack, hosting, and deployment constraints.

## 17. Confirmed decision log

| Area | Decision |
| --- | --- |
| Users | Two children, ages 9 and 10 |
| Primary goals | Know balances; save for goals; split money among Spending/Savings/Giving |
| Allowance | SGD $10 weekly per child |
| Allowance trigger | Child requests; parent approves |
| Allocation | Child freely chooses the split each week |
| Custody | Spending held by child; Savings and Giving held by parent |
| Spending records | Child records; parent reviews later |
| Child transfers | Spending may move to Savings or Giving only |
| Savings | General Savings balance plus multiple goals |
| Goal presentation | Name, picture, and playful progress visualization |
| Parent tools | Approvals, bonuses, corrections, savings release, reports, chores, interest, and matching are required |
| Theme | Animal Friends |
| Core interaction | Three visual jars and draggable allowance coins |
| Competition | Do not rank children by money totals |

---

This document should be updated after each material requirement decision. Confirmed rules belong in the relevant functional section and in the decision log; unresolved assumptions should remain explicitly marked as open.