# Pocket Pals — Child Game UX

**Status:** Confirmed design direction  
**Purpose:** Implementation contract for the child-facing experience

## 1. Core design decision

The child experience must feel like a small cozy video game, not a financial dashboard with game decoration.

The **Home World is the navigation system**. Children should primarily move through the app by tapping objects in their pet's environment rather than using a conventional menu or tab bar.

The parent experience remains a conventional management interface behind parent authentication.

## 2. Child game loop

1. Enter the child's world.
2. See the animal pal and current world state.
3. Notice an allowance, quest, savings-goal, or jar interaction.
4. Complete a real-money or habit activity.
5. Receive immediate animation, sound, pet reaction, and XP feedback.
6. Unlock or progress a cosmetic/game reward.
7. Return to the world and see something changed.

Real-money balances and virtual progression are separate systems. Children never spend real money on virtual items.

## 3. Primary child spaces

MVP child navigation is limited to six major spaces.

### 3.1 Home World

The main screen is a pet habitat such as a bedroom/treehouse environment.

It contains:

- Large interactive animal pal as the visual focus.
- Spending jar.
- Savings jar.
- Giving jar.
- Wish board for savings goals.
- Quest board for chores.
- Allowance mailbox/envelope.
- Small level/XP indicator.
- Decorations earned through progression.

The environment itself is interactive navigation:

- Tap Spending jar → Spending Pouch.
- Tap Savings jar or Wish Board → Treasure Room.
- Tap Giving jar → Giving interaction.
- Tap Quest Board → Quests.
- Tap Allowance Mailbox → allowance request/allocation flow.
- Tap pet/decor area → Collection Room.

A persistent conventional bottom navigation bar should not be required for normal child use.

### 3.2 Allowance Coin Drop

Weekly allowance allocation is a repeatable mini-game and should receive the highest interaction polish.

Flow:

1. Child asks for allowance from the glowing mailbox.
2. Parent approves.
3. Ten $1 coins appear for the default $10 allowance.
4. Child drags or taps coins into Spending, Savings, and Giving jars.
5. Jars react immediately to each coin.
6. Confirmation becomes available only when every coin is allocated.
7. Pet celebrates the completed choice without judging the chosen split.

Jar reactions:

- Spending: tactile rattle/bounce.
- Savings: warm glow/stars.
- Giving: hearts/sparkles.

Drag-and-drop must have an accessible tap/button alternative.

### 3.3 Treasure Room

The Savings experience is presented as a treasure room, not an account screen.

Show:

- Large animated Savings jar.
- Current total Savings balance.
- Multiple visual Wish Cards.
- Milestone celebrations.

Confirmed goal model: **visual goals only**.

Savings goals do not earmark or lock money. Every active goal compares its target against the same general Savings balance. Example: if Savings is $42, a $60 bicycle goal shows $42/$60 and a $100 headphones goal also shows $42/$100.

Child-facing explanation:

> Your savings can help you reach any of your wishes.

Each Wish Card includes:

- Goal name.
- Image.
- Target amount.
- Playful progress visualization.
- Milestones at approximately 25%, 50%, 75%, and 100%.

At 100%, show **You can afford it!** and allow the child to ask the parent to use Savings for that goal.

### 3.4 Spending Pouch

The Spending experience should resemble opening a coin pouch rather than a transaction ledger.

Primary action wording: **I bought something**.

Flow:

1. Ask what the child bought.
2. Let the child choose an emoji/category and short name.
3. Enter amount.
4. Optionally attach a picture later.
5. Show a simple before/after balance preview.
6. Confirm.
7. Pet acknowledges the action neutrally.

Avoid finance terminology such as transaction, debit, reconciliation, or expense on child screens.

### 3.5 Quest Board

Child-facing chores are called **Quests**.

Each quest card shows:

- Friendly icon/illustration.
- Short task description.
- Real-money reward, when applicable.
- Optional due state.
- Large **I did it!** action.

After submission, the quest enters a waiting-for-parent state. Parent approval produces a reward-chest style celebration and posts the real reward through the underlying ledger.

Quest completion may also award XP, but XP is independent from the monetary reward amount.

### 3.6 Collection Room

This is the main game-progression space.

Children can view and equip unlocked:

- Animal pals.
- Pet accessories.
- Toys.
- Habitat decorations.
- Backgrounds.
- Jar skins.
- Stickers and badges.

All virtual items are earned through habits and milestones. No real-money purchase mechanic is allowed.

## 4. Secondary game interactions

### Giving

The Giving jar may open into a small heart garden or similar positive space.

Contributing can grow flowers, hearts, lanterns, or another visual element. When the parent records a real donation, the child receives a celebration acknowledging that their set-aside money helped someone.

### Adventure Book

Child history is called **My Adventure Book**.

Entries are plain-language events such as:

- You received $10 allowance.
- You moved $3 into savings.
- You bought a toy for $4.
- You reached halfway to your bicycle wish.

The underlying ledger remains fully auditable in parent mode.

### Level-up moments

Important progress events may temporarily take over the screen with a game-style celebration showing:

- New level.
- New item/pet/habitat unlock.
- Clear continue action.

These should be occasional and meaningful rather than triggered after every tap.

## 5. Game progression rules

XP and unlocks reward participation and habits, not wealth.

Good progression triggers include:

- Completing weekly allowance allocation.
- Recording purchases consistently.
- Moving money into Savings.
- Moving money into Giving.
- Completing an approved quest.
- Reaching a personal savings-goal milestone.
- Completing a savings goal.

Do not scale XP directly with dollar amount. A child receiving a larger parental bonus should not gain a major game advantage.

Never remove previously earned rewards because a child spends money, misses a week, or breaks a streak.

## 6. Pet rules

The animal pal is the main character and guide.

It may be:

- Curious.
- Playful.
- Excited.
- Sleepy.
- Proud.
- Celebratory.

It must never become sick, abandoned, starving, sad, or endangered because of the child's financial decisions or inactivity.

Pet dialogue should explain and acknowledge rather than pressure. It must not tell a child that one allowance split is morally or financially superior unless a future parent-configured teaching rule explicitly requires it.

## 7. Language system

Prefer game language on child screens:

| Financial/product term | Child-facing language |
| --- | --- |
| Dashboard | Home World |
| Chores | Quests |
| Savings goals | Wishes |
| Transaction history | Adventure Book |
| Record purchase | I bought something |
| Savings account | Treasure / Savings Jar |
| Pending approval | Waiting for parent |
| Reward inventory | Collection |

Parent mode can use conventional financial terminology.

## 8. Visual hierarchy

On the Home World, priority should be:

1. Pet/world.
2. Current interactive opportunity.
3. Goal/quest progress.
4. Jars and their visual state.
5. Exact balances.

Exact money values remain visible and understandable but should not visually dominate the child interface.

Avoid conventional dashboard patterns such as grids of KPI cards, dense charts, tables, and persistent finance navigation.

## 9. MVP child component structure

```text
GameShell
├── HomeWorld
│   ├── Pet
│   ├── SpendingJar
│   ├── SavingsJar
│   ├── GivingJar
│   ├── WishBoard
│   ├── QuestBoard
│   └── AllowanceMailbox
├── CoinDropGame
├── TreasureRoom
│   └── WishCard[]
├── SpendingPouch
├── QuestScreen
└── CollectionRoom
```

Secondary interactions should initially use overlays, sheets, or short modal flows rather than creating many separate routes.

## 10. Child UX acceptance criteria

- A child can reach every common task from an object in Home World.
- Normal child use does not require understanding a navigation menu.
- The pet/world occupies more visual emphasis than balances or analytics.
- Weekly allowance allocation feels like an interactive coin mini-game, not a form.
- Jars respond visually to allocation.
- Chores are presented as Quests.
- Goals are presented as Wishes and use the shared general Savings balance.
- Real money cannot buy game cosmetics.
- XP does not materially scale with parent-provided dollar amounts.
- No child-facing interaction uses guilt, loss of pets, punishment, or financial ranking between siblings.
- Parent mode remains visually and functionally distinct from child mode.

## 11. Implementation priority

Rebuild the child-facing MVP in this order:

1. Home World scene and object-based navigation.
2. Coin Drop allowance mini-game.
3. Treasure Room and Wish Cards.
4. Spending Pouch.
5. Quest Board.
6. Collection Room and basic unlock system.
7. Adventure Book and Giving presentation.

Do not add more finance features to the child interface until this core game loop feels coherent.