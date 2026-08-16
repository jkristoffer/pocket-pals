import test from "node:test";
import assert from "node:assert/strict";

import {
  addBonus,
  allocateAllowance,
  applyInterest,
  applySavingsMatch,
  approveAllowance,
  createChore,
  createGoal,
  createInitialState,
  getAccountBalance,
  getAllowanceStatus,
  getBalances,
  getGoalProgress,
  getParentBank,
  getWeekKey,
  recordPurchase,
  requestAllowance,
  requestGoalPurchase,
  resolveChore,
  resolveGoalPurchase,
  submitChore,
  transferFromSpending,
} from "../src/domain.js";

const AUGUST_WEEK = new Date("2026-08-04T12:00:00.000Z");
const WEEK_KEY = getWeekKey(AUGUST_WEEK);
const fresh = () => createInitialState(AUGUST_WEEK);

test("weekly allowance is requested, approved, and fully allocated once", () => {
  const state = fresh();
  const childId = state.children[0].id;

  assert.equal(getAllowanceStatus(state, childId, WEEK_KEY), "DUE");
  requestAllowance(state, childId, AUGUST_WEEK);
  assert.equal(getAllowanceStatus(state, childId, WEEK_KEY), "REQUESTED");
  approveAllowance(state, childId, AUGUST_WEEK);
  assert.equal(getAllowanceStatus(state, childId, WEEK_KEY), "APPROVED_FOR_ALLOCATION");

  allocateAllowance(state, childId, { spending: 500, savings: 400, giving: 100 }, AUGUST_WEEK);

  assert.deepEqual(getBalances(state, childId), {
    unallocated: 0,
    spending: 500,
    savings: 400,
    giving: 100,
  });
  assert.equal(getAllowanceStatus(state, childId, WEEK_KEY), "COMPLETED");
  assert.throws(() => requestAllowance(state, childId, AUGUST_WEEK), /already been requested/);
});

test("child money only moves out of Spending toward committed jars", () => {
  const state = fresh();
  const childId = state.children[0].id;

  addBonus(state, childId, { amountCents: 1200, destination: "spending", reason: "Birthday cash" }, AUGUST_WEEK);
  transferFromSpending(state, childId, { destination: "savings", amountCents: 400 }, AUGUST_WEEK);
  transferFromSpending(state, childId, { destination: "giving", amountCents: 100 }, AUGUST_WEEK);
  recordPurchase(state, childId, { amountCents: 250, description: "Notebook", category: "School" }, AUGUST_WEEK);

  assert.deepEqual(getBalances(state, childId), {
    unallocated: 0,
    spending: 450,
    savings: 400,
    giving: 100,
  });
  assert.throws(
    () => transferFromSpending(state, childId, { destination: "spending", amountCents: 100 }, AUGUST_WEEK),
    /only move from Spending/,
  );
  assert.throws(
    () => recordPurchase(state, childId, { amountCents: 500, description: "Too much" }, AUGUST_WEEK),
    /does not have enough money/,
  );
});

test("all visual goals compare against one general Savings balance", () => {
  const state = fresh();
  const childId = state.children[0].id;
  state.goals = [];

  addBonus(state, childId, { amountCents: 3000, destination: "savings", reason: "Starting savings" }, AUGUST_WEEK);
  const bike = createGoal(state, childId, { name: "Bike", picture: "🚲", targetCents: 5000 }, AUGUST_WEEK);
  const book = createGoal(state, childId, { name: "Book set", picture: "📚", targetCents: 2000 }, AUGUST_WEEK);

  assert.equal(getGoalProgress(state, bike).progress, 0.6);
  assert.equal(getGoalProgress(state, book).progress, 1);

  requestGoalPurchase(state, childId, book.id, AUGUST_WEEK);
  resolveGoalPurchase(state, book.id, { approved: true }, AUGUST_WEEK);

  assert.equal(book.status, "PURCHASED");
  assert.equal(getAccountBalance(state, childId, "savings"), 1000);
  assert.equal(getGoalProgress(state, bike).progress, 0.2);
});

test("a paid chore cannot post its reward twice", () => {
  const state = fresh();
  const childId = state.children[0].id;
  state.chores = [];

  const chore = createChore(state, {
    title: "Fold laundry",
    rewardCents: 300,
    assignedChildIds: [childId],
    destination: "spending",
  }, AUGUST_WEEK);

  submitChore(state, childId, chore.id, AUGUST_WEEK);
  resolveChore(state, childId, chore.id, { approved: true }, AUGUST_WEEK);

  assert.equal(getAccountBalance(state, childId, "spending"), 300);
  assert.throws(
    () => resolveChore(state, childId, chore.id, { approved: true }, AUGUST_WEEK),
    /No chore submission is waiting/,
  );
});

test("interest and savings matching are idempotent per month", () => {
  const state = fresh();
  const childId = state.children[0].id;

  requestAllowance(state, childId, AUGUST_WEEK);
  approveAllowance(state, childId, AUGUST_WEEK);
  allocateAllowance(state, childId, { spending: 500, savings: 500, giving: 0 }, AUGUST_WEEK);

  assert.equal(applyInterest(state, childId, { periodKey: "2026-08", rateBps: 500 }, AUGUST_WEEK), 25);
  assert.equal(applySavingsMatch(state, childId, { periodKey: "2026-08", ratioBps: 10000, capCents: 300 }, AUGUST_WEEK), 300);
  assert.equal(getAccountBalance(state, childId, "savings"), 825);

  assert.throws(
    () => applyInterest(state, childId, { periodKey: "2026-08", rateBps: 500 }, AUGUST_WEEK),
    /already applied/,
  );
  assert.throws(
    () => applySavingsMatch(state, childId, { periodKey: "2026-08", ratioBps: 10000, capCents: 300 }, AUGUST_WEEK),
    /already applied/,
  );
});

test("Parent Bank equals all parent-held Savings and Giving balances", () => {
  const state = fresh();
  const first = state.children[0].id;
  const second = state.children[1].id;

  addBonus(state, first, { amountCents: 500, destination: "savings", reason: "Gift" }, AUGUST_WEEK);
  addBonus(state, first, { amountCents: 100, destination: "giving", reason: "Giving money" }, AUGUST_WEEK);
  addBonus(state, second, { amountCents: 700, destination: "savings", reason: "Gift" }, AUGUST_WEEK);

  const bank = getParentBank(state);
  assert.equal(bank.totalCents, 1300);
  assert.deepEqual(bank.children.map((child) => child.totalCents), [600, 700]);
});
