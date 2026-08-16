import { createInitialState } from "./domain.js";

const STORAGE_KEY = "pocket-pals-state-v1";

function normalizeState(value) {
  const fallback = createInitialState();
  if (!value || typeof value !== "object") return fallback;
  const state = {
    ...fallback,
    ...value,
    household: { ...fallback.household, ...(value.household ?? {}) },
    settings: { ...fallback.settings, ...(value.settings ?? {}) },
    children: Array.isArray(value.children) ? value.children : fallback.children,
    ledger: Array.isArray(value.ledger) ? value.ledger : [],
    allowanceCycles: Array.isArray(value.allowanceCycles) ? value.allowanceCycles : [],
    goals: Array.isArray(value.goals) ? value.goals : fallback.goals,
    chores: Array.isArray(value.chores) ? value.chores : fallback.chores,
    purchaseReviews: value.purchaseReviews && typeof value.purchaseReviews === "object" ? value.purchaseReviews : {},
    incentiveRuns: Array.isArray(value.incentiveRuns) ? value.incentiveRuns : [],
    activity: Array.isArray(value.activity) ? value.activity : fallback.activity,
  };
  state.children = state.children.map((child) => ({
    xp: 0,
    badges: [],
    ...child,
    pet: { name: "Pal", species: "animal", emoji: "🐾", ...(child.pet ?? {}) },
    badges: Array.isArray(child.badges) ? child.badges : [],
  }));
  return state;
}

export function loadState() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : createInitialState();
  } catch (error) {
    console.warn("Pocket Pals could not load saved data; starting fresh.", error);
    return createInitialState();
  }
}

export function saveState(state) {
  globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  const state = createInitialState();
  saveState(state);
  return state;
}

export function exportState(state) {
  return JSON.stringify(state, null, 2);
}
