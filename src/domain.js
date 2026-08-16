const CHILD_ACCOUNTS = new Set(["unallocated", "spending", "savings", "giving"]);
const JAR_ACCOUNTS = new Set(["spending", "savings", "giving"]);

export const ACCOUNT_LABELS = {
  unallocated: "Ready to sort",
  spending: "Spending",
  savings: "Savings",
  giving: "Giving",
  household: "Household funding",
  external: "Money used",
  adjustment: "Adjustment",
};

export function makeId(prefix = "id") {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `${prefix}-${uuid}` : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function toIso(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return date.toISOString();
}

export function getWeekKey(value = new Date()) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  date.setHours(0, 0, 0, 0);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getMonthKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function createInitialState(value = new Date()) {
  const createdAt = toIso(value);
  const children = [
    { id: "child-mia", name: "Mia", age: 10, pet: { name: "Pip", species: "panda", emoji: "🐼" }, xp: 0, badges: [] },
    { id: "child-zoe", name: "Zoe", age: 9, pet: { name: "Maple", species: "fox", emoji: "🦊" }, xp: 0, badges: [] },
  ];
  return {
    version: 1,
    household: { id: "household-demo", name: "Pocket Pals Family", currency: "SGD", timezone: "Asia/Singapore", createdAt },
    settings: { weeklyAllowanceCents: 1000, parentPin: "2468", interestRateBps: 500, matchRatioBps: 10000, matchCapCents: 1000 },
    children,
    ledger: [],
    allowanceCycles: [],
    goals: [
      { id: "goal-mia-skates", childId: children[0].id, name: "Roller skates", picture: "🛼", targetCents: 8000, status: "ACTIVE", createdAt },
      { id: "goal-zoe-art", childId: children[1].id, name: "Big art set", picture: "🎨", targetCents: 4500, status: "ACTIVE", createdAt },
    ],
    chores: [{
      id: "chore-demo-desk",
      title: "Tidy the study desk",
      rewardCents: 200,
      destination: "spending",
      assignedChildIds: children.map((child) => child.id),
      statusByChild: Object.fromEntries(children.map((child) => [child.id, "AVAILABLE"])),
      createdAt,
    }],
    purchaseReviews: {},
    incentiveRuns: [],
    activity: [{ id: makeId("activity"), childId: null, type: "WELCOME", message: "Pocket Pals is ready for its first allowance week.", createdAt }],
  };
}

export function getChild(state, childId) {
  const child = state.children.find((item) => item.id === childId);
  if (!child) throw new Error("Child profile not found");
  return child;
}

export function getAccountBalance(state, childId, account) {
  return state.ledger
    .filter((transaction) => transaction.childId === childId)
    .flatMap((transaction) => transaction.postings)
    .filter((posting) => posting.account === account)
    .reduce((sum, posting) => sum + posting.amountCents, 0);
}

export function getBalances(state, childId) {
  return Object.fromEntries(["unallocated", "spending", "savings", "giving"].map((account) => [account, getAccountBalance(state, childId, account)]));
}

export function getParentBank(state) {
  const children = state.children.map((child) => {
    const balances = getBalances(state, child.id);
    return { childId: child.id, name: child.name, savingsCents: balances.savings, givingCents: balances.giving, totalCents: balances.savings + balances.giving };
  });
  return { children, totalCents: children.reduce((sum, child) => sum + child.totalCents, 0) };
}

function assertIntegerCents(value, label = "Amount") {
  if (!Number.isInteger(value)) throw new Error(`${label} must use whole cents`);
}

function addActivity(state, { childId = null, type, message, createdAt = new Date() }) {
  state.activity.unshift({ id: makeId("activity"), childId, type, message, createdAt: toIso(createdAt) });
  state.activity = state.activity.slice(0, 120);
}

function postTransaction(state, { childId, type, description, actor, postings, metadata = {}, createdAt = new Date(), idempotencyKey = null }) {
  getChild(state, childId);
  if (!Array.isArray(postings) || postings.length < 2) throw new Error("A transaction requires at least two postings");
  if (idempotencyKey && state.ledger.some((item) => item.idempotencyKey === idempotencyKey)) throw new Error("This action has already been recorded");
  let sum = 0;
  for (const posting of postings) {
    assertIntegerCents(posting.amountCents);
    sum += posting.amountCents;
    if (posting.amountCents < 0 && CHILD_ACCOUNTS.has(posting.account)) {
      if (getAccountBalance(state, childId, posting.account) + posting.amountCents < 0) {
        throw new Error(`${ACCOUNT_LABELS[posting.account] ?? posting.account} does not have enough money`);
      }
    }
  }
  if (sum !== 0) throw new Error("Ledger postings must balance to zero");
  const transaction = {
    id: makeId("tx"), childId, type, description, actor,
    postings: postings.map((posting) => ({ ...posting })), metadata: { ...metadata },
    idempotencyKey, createdAt: toIso(createdAt),
  };
  state.ledger.push(transaction);
  return transaction;
}

function awardXp(state, childId, points, reason, createdAt = new Date()) {
  getChild(state, childId).xp += points;
  addActivity(state, { childId, type: "XP", message: `+${points} pet points — ${reason}`, createdAt });
}

const BADGES = [
  { id: "first-sort", label: "Coin Sorter", icon: "🪙", test: (state, id) => state.allowanceCycles.some((cycle) => cycle.childId === id && cycle.status === "COMPLETED") },
  { id: "saver-sprout", label: "Saver Sprout", icon: "🌱", test: (state, id) => getAccountBalance(state, id, "savings") >= 1000 },
  { id: "kind-heart", label: "Kind Heart", icon: "💛", test: (state, id) => getAccountBalance(state, id, "giving") > 0 },
  { id: "goal-setter", label: "Goal Setter", icon: "🎯", test: (state, id) => state.goals.some((goal) => goal.childId === id) },
  { id: "money-detective", label: "Money Detective", icon: "🔎", test: (state, id) => state.ledger.filter((tx) => tx.childId === id && tx.type === "PURCHASE").length >= 3 },
  { id: "goal-hero", label: "Goal Hero", icon: "🏆", test: (state, id) => state.goals.some((goal) => goal.childId === id && goal.status === "PURCHASED") },
  { id: "helpful-pal", label: "Helpful Pal", icon: "⭐", test: (state, id) => state.chores.some((chore) => chore.statusByChild?.[id] === "PAID") },
];

export function refreshAchievements(state, childId, createdAt = new Date()) {
  const child = getChild(state, childId);
  for (const badge of BADGES) {
    if (!child.badges.includes(badge.id) && badge.test(state, childId)) {
      child.badges.push(badge.id);
      addActivity(state, { childId, type: "BADGE", message: `${badge.icon} New badge: ${badge.label}`, createdAt });
    }
  }
}

export function getBadgeDetails(child) {
  return child.badges.map((id) => BADGES.find((badge) => badge.id === id)).filter(Boolean);
}

export function getLevel(child) {
  return { level: Math.floor(child.xp / 100) + 1, currentLevelXp: child.xp % 100, nextLevelXp: 100 };
}

export function getAllowanceCycle(state, childId, weekKey = getWeekKey()) {
  return state.allowanceCycles.find((cycle) => cycle.childId === childId && cycle.weekKey === weekKey) ?? null;
}

export function getAllowanceStatus(state, childId, weekKey = getWeekKey()) {
  const cycle = getAllowanceCycle(state, childId, weekKey);
  return !cycle || cycle.status === "RETURNED" ? "DUE" : cycle.status;
}

export function requestAllowance(state, childId, date = new Date()) {
  getChild(state, childId);
  const weekKey = getWeekKey(date);
  const existing = getAllowanceCycle(state, childId, weekKey);
  if (existing && existing.status !== "RETURNED") throw new Error("This week's allowance has already been requested");
  if (existing) {
    Object.assign(existing, { status: "REQUESTED", requestedAt: toIso(date) });
    delete existing.parentNote;
  } else {
    state.allowanceCycles.push({ id: makeId("allowance"), childId, weekKey, amountCents: state.settings.weeklyAllowanceCents, status: "REQUESTED", requestedAt: toIso(date) });
  }
  addActivity(state, { childId, type: "ALLOWANCE_REQUESTED", message: "Weekly allowance requested.", createdAt: date });
  return getAllowanceCycle(state, childId, weekKey);
}

export function approveAllowance(state, childId, date = new Date()) {
  const weekKey = getWeekKey(date);
  const cycle = getAllowanceCycle(state, childId, weekKey);
  if (!cycle || cycle.status !== "REQUESTED") throw new Error("No allowance request is waiting for approval");
  postTransaction(state, {
    childId, type: "ALLOWANCE_FUNDED", description: `Weekly allowance for ${weekKey}`, actor: "parent",
    postings: [{ account: "household", amountCents: -cycle.amountCents }, { account: "unallocated", amountCents: cycle.amountCents }],
    metadata: { weekKey }, idempotencyKey: `allowance-funding:${childId}:${weekKey}`, createdAt: date,
  });
  Object.assign(cycle, { status: "APPROVED_FOR_ALLOCATION", approvedAt: toIso(date) });
  addActivity(state, { childId, type: "ALLOWANCE_APPROVED", message: "Allowance approved — the coins are ready to sort.", createdAt: date });
  return cycle;
}

export function returnAllowanceRequest(state, childId, note = "Please ask me first.", date = new Date()) {
  const cycle = getAllowanceCycle(state, childId, getWeekKey(date));
  if (!cycle || cycle.status !== "REQUESTED") throw new Error("No allowance request is waiting for a response");
  Object.assign(cycle, { status: "RETURNED", parentNote: note, returnedAt: toIso(date) });
  addActivity(state, { childId, type: "ALLOWANCE_RETURNED", message: `Allowance request returned: ${note}`, createdAt: date });
  return cycle;
}

export function allocateAllowance(state, childId, allocation, date = new Date()) {
  const weekKey = getWeekKey(date);
  const cycle = getAllowanceCycle(state, childId, weekKey);
  if (!cycle || cycle.status !== "APPROVED_FOR_ALLOCATION") throw new Error("The allowance is not ready to allocate");
  const normalized = Object.fromEntries(["spending", "savings", "giving"].map((account) => [account, Number(allocation[account] ?? 0)]));
  for (const [account, amount] of Object.entries(normalized)) {
    assertIntegerCents(amount, account);
    if (amount < 0) throw new Error("Jar amounts cannot be negative");
  }
  const total = Object.values(normalized).reduce((sum, amount) => sum + amount, 0);
  if (total !== cycle.amountCents) throw new Error("All allowance money must be placed into jars");
  const postings = [{ account: "unallocated", amountCents: -total }];
  for (const account of ["spending", "savings", "giving"]) if (normalized[account] > 0) postings.push({ account, amountCents: normalized[account] });
  postTransaction(state, {
    childId, type: "ALLOWANCE_ALLOCATION", description: "Weekly allowance sorted into jars", actor: "child", postings,
    metadata: { weekKey, allocation: normalized }, idempotencyKey: `allowance-allocation:${childId}:${weekKey}`, createdAt: date,
  });
  Object.assign(cycle, { status: "COMPLETED", completedAt: toIso(date), allocation: normalized });
  awardXp(state, childId, 30, "weekly coins sorted", date);
  refreshAchievements(state, childId, date);
  return cycle;
}

export function recordPurchase(state, childId, { amountCents, description, category = "Other" }, date = new Date()) {
  assertIntegerCents(amountCents);
  if (amountCents <= 0) throw new Error("Purchase amount must be greater than zero");
  if (!description?.trim()) throw new Error("Add a short description of the purchase");
  const transaction = postTransaction(state, {
    childId, type: "PURCHASE", description: description.trim(), actor: "child",
    postings: [{ account: "spending", amountCents: -amountCents }, { account: "external", amountCents }], metadata: { category }, createdAt: date,
  });
  state.purchaseReviews[transaction.id] = { status: "UNREVIEWED" };
  awardXp(state, childId, 5, "purchase recorded", date);
  refreshAchievements(state, childId, date);
  return transaction;
}

export function reviewPurchase(state, transactionId, note = "", date = new Date()) {
  const transaction = state.ledger.find((item) => item.id === transactionId && item.type === "PURCHASE");
  if (!transaction) throw new Error("Purchase record not found");
  state.purchaseReviews[transactionId] = { status: "REVIEWED", note: note.trim(), reviewedAt: toIso(date) };
  addActivity(state, { childId: transaction.childId, type: "PURCHASE_REVIEWED", message: note.trim() ? `Parent reviewed a purchase: ${note.trim()}` : "Parent reviewed a purchase.", createdAt: date });
}

export function transferFromSpending(state, childId, { destination, amountCents }, date = new Date()) {
  if (!["savings", "giving"].includes(destination)) throw new Error("Money can only move from Spending into Savings or Giving");
  assertIntegerCents(amountCents);
  if (amountCents <= 0) throw new Error("Transfer amount must be greater than zero");
  const transaction = postTransaction(state, {
    childId, type: destination === "savings" ? "TRANSFER_TO_SAVINGS" : "TRANSFER_TO_GIVING",
    description: `Moved money from Spending to ${ACCOUNT_LABELS[destination]}`, actor: "child",
    postings: [{ account: "spending", amountCents: -amountCents }, { account: destination, amountCents }], metadata: { destination }, createdAt: date,
  });
  awardXp(state, childId, 10, destination === "savings" ? "saved extra money" : "set money aside to give", date);
  refreshAchievements(state, childId, date);
  return transaction;
}

export function createGoal(state, childId, { name, picture = "🎯", targetCents }, date = new Date()) {
  getChild(state, childId);
  assertIntegerCents(targetCents);
  if (!name?.trim()) throw new Error("Goal name is required");
  if (targetCents <= 0) throw new Error("Goal target must be greater than zero");
  if (state.goals.filter((goal) => goal.childId === childId && goal.status !== "ARCHIVED").length >= 8) throw new Error("Archive a goal before creating another one");
  const goal = { id: makeId("goal"), childId, name: name.trim(), picture, targetCents, status: "ACTIVE", createdAt: toIso(date) };
  state.goals.push(goal);
  awardXp(state, childId, 10, "new savings goal created", date);
  refreshAchievements(state, childId, date);
  return goal;
}

export function getGoalProgress(state, goal) {
  const savingsCents = getAccountBalance(state, goal.childId, "savings");
  return { savingsCents, targetCents: goal.targetCents, progress: goal.targetCents > 0 ? Math.min(1, savingsCents / goal.targetCents) : 0, reached: savingsCents >= goal.targetCents };
}

export function requestGoalPurchase(state, childId, goalId, date = new Date()) {
  const goal = state.goals.find((item) => item.id === goalId && item.childId === childId);
  if (!goal || goal.status !== "ACTIVE") throw new Error("This goal cannot be requested");
  if (!getGoalProgress(state, goal).reached) throw new Error("Keep saving until the goal is reached");
  Object.assign(goal, { status: "PURCHASE_REQUESTED", requestedAt: toIso(date) });
  addActivity(state, { childId, type: "GOAL_PURCHASE_REQUESTED", message: `Purchase requested for ${goal.name}.`, createdAt: date });
  return goal;
}

export function resolveGoalPurchase(state, goalId, { approved, note = "" }, date = new Date()) {
  const goal = state.goals.find((item) => item.id === goalId);
  if (!goal || goal.status !== "PURCHASE_REQUESTED") throw new Error("No goal purchase is waiting for approval");
  if (!approved) {
    Object.assign(goal, { status: "ACTIVE", parentNote: note.trim(), respondedAt: toIso(date) });
    addActivity(state, { childId: goal.childId, type: "GOAL_PURCHASE_RETURNED", message: note.trim() ? `Goal purchase returned: ${note.trim()}` : "Goal purchase was not approved yet.", createdAt: date });
    return goal;
  }
  postTransaction(state, {
    childId: goal.childId, type: "GOAL_PURCHASE", description: `Purchased savings goal: ${goal.name}`, actor: "parent",
    postings: [{ account: "savings", amountCents: -goal.targetCents }, { account: "external", amountCents: goal.targetCents }],
    metadata: { goalId: goal.id }, idempotencyKey: `goal-purchase:${goal.id}`, createdAt: date,
  });
  Object.assign(goal, { status: "PURCHASED", purchasedAt: toIso(date), parentNote: note.trim() });
  awardXp(state, goal.childId, 40, `${goal.name} goal completed`, date);
  refreshAchievements(state, goal.childId, date);
  return goal;
}

export function addBonus(state, childId, { amountCents, destination = "spending", reason = "Bonus" }, date = new Date()) {
  assertIntegerCents(amountCents);
  if (amountCents <= 0) throw new Error("Bonus must be greater than zero");
  if (!JAR_ACCOUNTS.has(destination)) throw new Error("Choose a valid destination jar");
  if (!reason?.trim()) throw new Error("Add a reason for the bonus");
  const transaction = postTransaction(state, {
    childId, type: "BONUS", description: reason.trim(), actor: "parent",
    postings: [{ account: "household", amountCents: -amountCents }, { account: destination, amountCents }], metadata: { destination }, createdAt: date,
  });
  addActivity(state, { childId, type: "BONUS", message: `${reason.trim()} was added to ${ACCOUNT_LABELS[destination]}.`, createdAt: date });
  refreshAchievements(state, childId, date);
  return transaction;
}

export function adjustBalance(state, childId, { account, signedAmountCents, reason }, date = new Date()) {
  if (!JAR_ACCOUNTS.has(account)) throw new Error("Choose a valid jar");
  assertIntegerCents(signedAmountCents);
  if (!signedAmountCents) throw new Error("Adjustment cannot be zero");
  if (!reason?.trim()) throw new Error("A reason is required for every adjustment");
  const positive = signedAmountCents > 0;
  const amountCents = Math.abs(signedAmountCents);
  const transaction = postTransaction(state, {
    childId, type: "ADJUSTMENT", description: reason.trim(), actor: "parent",
    postings: positive
      ? [{ account: "adjustment", amountCents: -amountCents }, { account, amountCents }]
      : [{ account, amountCents: -amountCents }, { account: "adjustment", amountCents }],
    metadata: { account, direction: positive ? "increase" : "decrease" }, createdAt: date,
  });
  addActivity(state, { childId, type: "ADJUSTMENT", message: `Parent adjustment: ${reason.trim()}`, createdAt: date });
  refreshAchievements(state, childId, date);
  return transaction;
}

export function recordDonation(state, childId, { amountCents, description }, date = new Date()) {
  assertIntegerCents(amountCents);
  if (amountCents <= 0) throw new Error("Donation amount must be greater than zero");
  if (!description?.trim()) throw new Error("Describe where the giving money went");
  const transaction = postTransaction(state, {
    childId, type: "DONATION", description: description.trim(), actor: "parent",
    postings: [{ account: "giving", amountCents: -amountCents }, { account: "external", amountCents }], createdAt: date,
  });
  addActivity(state, { childId, type: "DONATION", message: `Giving recorded: ${description.trim()}`, createdAt: date });
  return transaction;
}

export function createChore(state, { title, rewardCents, assignedChildIds, destination = "spending" }, date = new Date()) {
  assertIntegerCents(rewardCents);
  if (!title?.trim()) throw new Error("Chore title is required");
  if (rewardCents <= 0) throw new Error("Chore reward must be greater than zero");
  if (!JAR_ACCOUNTS.has(destination)) throw new Error("Choose a valid reward destination");
  if (!Array.isArray(assignedChildIds) || !assignedChildIds.length) throw new Error("Assign the chore to at least one child");
  const ids = [...new Set(assignedChildIds)];
  ids.forEach((id) => getChild(state, id));
  const chore = { id: makeId("chore"), title: title.trim(), rewardCents, destination, assignedChildIds: ids, statusByChild: Object.fromEntries(ids.map((id) => [id, "AVAILABLE"])), createdAt: toIso(date) };
  state.chores.push(chore);
  return chore;
}

export function submitChore(state, childId, choreId, date = new Date()) {
  const chore = state.chores.find((item) => item.id === choreId && item.assignedChildIds.includes(childId));
  if (!chore || chore.statusByChild[childId] !== "AVAILABLE") throw new Error("This chore cannot be submitted");
  chore.statusByChild[childId] = "SUBMITTED";
  chore.submittedAtByChild = { ...(chore.submittedAtByChild ?? {}), [childId]: toIso(date) };
  addActivity(state, { childId, type: "CHORE_SUBMITTED", message: `Chore submitted: ${chore.title}`, createdAt: date });
  return chore;
}

export function resolveChore(state, childId, choreId, { approved, note = "" }, date = new Date()) {
  const chore = state.chores.find((item) => item.id === choreId && item.assignedChildIds.includes(childId));
  if (!chore || chore.statusByChild[childId] !== "SUBMITTED") throw new Error("No chore submission is waiting");
  if (!approved) {
    chore.statusByChild[childId] = "AVAILABLE";
    chore.noteByChild = { ...(chore.noteByChild ?? {}), [childId]: note.trim() };
    addActivity(state, { childId, type: "CHORE_RETURNED", message: note.trim() ? `Chore returned: ${note.trim()}` : `Please try ${chore.title} again.`, createdAt: date });
    return chore;
  }
  postTransaction(state, {
    childId, type: "CHORE_REWARD", description: `Chore reward: ${chore.title}`, actor: "parent",
    postings: [{ account: "household", amountCents: -chore.rewardCents }, { account: chore.destination, amountCents: chore.rewardCents }],
    metadata: { choreId: chore.id, destination: chore.destination }, idempotencyKey: `chore-reward:${chore.id}:${childId}`, createdAt: date,
  });
  chore.statusByChild[childId] = "PAID";
  chore.paidAtByChild = { ...(chore.paidAtByChild ?? {}), [childId]: toIso(date) };
  awardXp(state, childId, 25, "chore completed", date);
  refreshAchievements(state, childId, date);
  return chore;
}

export function applyInterest(state, childId, { periodKey = getMonthKey(), rateBps = state.settings.interestRateBps, capCents = null } = {}, date = new Date()) {
  assertIntegerCents(rateBps, "Interest rate");
  const key = `interest:${childId}:${periodKey}`;
  if (state.incentiveRuns.some((run) => run.key === key)) throw new Error("Interest was already applied for this period");
  const basis = getAccountBalance(state, childId, "savings");
  let amountCents = Math.round((basis * rateBps) / 10000);
  if (Number.isInteger(capCents) && capCents >= 0) amountCents = Math.min(amountCents, capCents);
  if (amountCents <= 0) throw new Error("There is not enough savings to produce an interest payment");
  postTransaction(state, {
    childId, type: "INTEREST", description: `Savings interest for ${periodKey}`, actor: "parent",
    postings: [{ account: "household", amountCents: -amountCents }, { account: "savings", amountCents }],
    metadata: { periodKey, rateBps, savingsBasisCents: basis }, idempotencyKey: key, createdAt: date,
  });
  state.incentiveRuns.push({ key, type: "INTEREST", childId, periodKey, amountCents, createdAt: toIso(date) });
  addActivity(state, { childId, type: "INTEREST", message: `Savings earned extra money for ${periodKey}.`, createdAt: date });
  refreshAchievements(state, childId, date);
  return amountCents;
}

export function applySavingsMatch(state, childId, { periodKey = getMonthKey(), ratioBps = state.settings.matchRatioBps, capCents = state.settings.matchCapCents } = {}, date = new Date()) {
  assertIntegerCents(ratioBps, "Match ratio");
  assertIntegerCents(capCents, "Match cap");
  const key = `match:${childId}:${periodKey}`;
  if (state.incentiveRuns.some((run) => run.key === key)) throw new Error("Savings matching was already applied for this period");
  const eligibleTypes = new Set(["ALLOWANCE_ALLOCATION", "TRANSFER_TO_SAVINGS"]);
  const qualifyingSavingsCents = state.ledger
    .filter((tx) => tx.childId === childId && eligibleTypes.has(tx.type) && tx.createdAt.slice(0, 7) === periodKey)
    .flatMap((tx) => tx.postings)
    .filter((posting) => posting.account === "savings" && posting.amountCents > 0)
    .reduce((sum, posting) => sum + posting.amountCents, 0);
  const amountCents = Math.min(Math.round((qualifyingSavingsCents * ratioBps) / 10000), capCents);
  if (amountCents <= 0) throw new Error("No eligible savings were found for this period");
  postTransaction(state, {
    childId, type: "SAVINGS_MATCH", description: `Parent savings match for ${periodKey}`, actor: "parent",
    postings: [{ account: "household", amountCents: -amountCents }, { account: "savings", amountCents }],
    metadata: { periodKey, ratioBps, capCents, qualifyingSavingsCents }, idempotencyKey: key, createdAt: date,
  });
  state.incentiveRuns.push({ key, type: "SAVINGS_MATCH", childId, periodKey, amountCents, createdAt: toIso(date) });
  addActivity(state, { childId, type: "SAVINGS_MATCH", message: "Parent matched this month's saving habit.", createdAt: date });
  refreshAchievements(state, childId, date);
  return amountCents;
}

export function getActivityForChild(state, childId, limit = 10) {
  return state.activity.filter((entry) => entry.childId === childId || entry.childId === null).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

export function getPendingApprovals(state) {
  const allowance = state.allowanceCycles.filter((cycle) => cycle.status === "REQUESTED").map((cycle) => ({ type: "ALLOWANCE", childId: cycle.childId, id: cycle.id, data: cycle }));
  const goals = state.goals.filter((goal) => goal.status === "PURCHASE_REQUESTED").map((goal) => ({ type: "GOAL_PURCHASE", childId: goal.childId, id: goal.id, data: goal }));
  const chores = state.chores.flatMap((chore) => Object.entries(chore.statusByChild).filter(([, status]) => status === "SUBMITTED").map(([childId]) => ({ type: "CHORE", childId, id: chore.id, data: chore })));
  return [...allowance, ...goals, ...chores];
}

export function getUnreviewedPurchases(state) {
  return state.ledger.filter((tx) => tx.type === "PURCHASE" && state.purchaseReviews[tx.id]?.status !== "REVIEWED").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function amountForAccount(transaction, account) {
  return transaction.postings.filter((posting) => posting.account === account).reduce((sum, posting) => sum + posting.amountCents, 0);
}
