import {
  ACCOUNT_LABELS,
  addBonus,
  adjustBalance,
  allocateAllowance,
  applyInterest,
  applySavingsMatch,
  approveAllowance,
  createChore,
  createGoal,
  getActivityForChild,
  getAllowanceCycle,
  getAllowanceStatus,
  getBadgeDetails,
  getBalances,
  getChild,
  getGoalProgress,
  getLevel,
  getMonthKey,
  getParentBank,
  getPendingApprovals,
  getUnreviewedPurchases,
  recordDonation,
  recordPurchase,
  requestAllowance,
  requestGoalPurchase,
  resolveChore,
  resolveGoalPurchase,
  returnAllowanceRequest,
  reviewPurchase,
  submitChore,
  transferFromSpending,
} from "./domain.js";
import { exportState, loadState, resetState, saveState } from "./storage.js";

const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modal-root");
const toastRoot = document.querySelector("#toast-root");

let state = loadState();
const ui = {
  screen: "home",
  childId: null,
  parentUnlocked: false,
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(cents) {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: state.household.currency ?? "SGD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function parseMoney(value, label = "Amount") {
  const number = Number(String(value).trim());
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${label} must be greater than zero`);
  return Math.round(number * 100);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function closeModal() {
  modalRoot.innerHTML = "";
  document.body.classList.remove("modal-open");
}

function showToast(message, tone = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast--${tone}`;
  toast.textContent = message;
  toastRoot.append(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 220);
  }, 3200);
}

function showCelebration(message) {
  const layer = document.createElement("div");
  layer.className = "celebration";
  layer.innerHTML = `<div class="celebration__burst" aria-hidden="true">🎉 ✨ 🐾 ✨ 🎉</div><strong>${escapeHtml(message)}</strong>`;
  document.body.append(layer);
  setTimeout(() => layer.remove(), 1800);
}

function mutate(action, successMessage, { celebrate = false } = {}) {
  try {
    action();
    saveState(state);
    render();
    if (successMessage) showToast(successMessage);
    if (celebrate) showCelebration(successMessage);
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Something went wrong", "error");
  }
}

function openFormModal({ title, description = "", fields, submitLabel = "Save", submitTone = "primary", onSubmit }) {
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title" data-modal-card>
        <div class="modal-card__header">
          <div>
            <p class="eyebrow">Pocket Pals</p>
            <h2 id="modal-title">${escapeHtml(title)}</h2>
            ${description ? `<p>${escapeHtml(description)}</p>` : ""}
          </div>
          <button class="icon-button" type="button" data-action="close-modal" aria-label="Close">×</button>
        </div>
        <form class="form-stack" data-modal-form>
          <div class="form-error" data-form-error hidden></div>
          ${fields}
          <div class="modal-actions">
            <button class="button button--quiet" type="button" data-action="close-modal">Cancel</button>
            <button class="button button--${submitTone}" type="submit">${escapeHtml(submitLabel)}</button>
          </div>
        </form>
      </section>
    </div>`;
  document.body.classList.add("modal-open");

  const backdrop = modalRoot.querySelector(".modal-backdrop");
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeModal();
  });

  const form = modalRoot.querySelector("[data-modal-form]");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const errorBox = form.querySelector("[data-form-error]");
    try {
      const message = onSubmit(new FormData(form));
      saveState(state);
      closeModal();
      render();
      if (message) showToast(message);
    } catch (error) {
      errorBox.hidden = false;
      errorBox.textContent = error instanceof Error ? error.message : "Something went wrong";
    }
  });

  setTimeout(() => form.querySelector("input, select, textarea")?.focus(), 0);
}

function openConfirm({ title, description, confirmLabel = "Confirm", tone = "primary", onConfirm }) {
  openFormModal({
    title,
    description,
    fields: "",
    submitLabel: confirmLabel,
    submitTone: tone,
    onSubmit: () => onConfirm(),
  });
}

function renderTopbar() {
  const contextActions = ui.screen === "child"
    ? `<button class="button button--quiet button--small" data-action="go-home">Switch profile</button>
       <button class="button button--small" data-action="open-parent">Parent view</button>`
    : ui.screen === "parent"
      ? `<button class="button button--quiet button--small" data-action="go-home">Profiles</button>
         <button class="button button--small" data-action="lock-parent">Lock parent view</button>`
      : `<button class="button button--small" data-action="open-parent">Parent view</button>`;

  return `
    <header class="topbar">
      <button class="brand" data-action="go-home" aria-label="Pocket Pals home">
        <span class="brand__mark">🐾</span>
        <span><strong>Pocket Pals</strong><small>Money habits, made playful</small></span>
      </button>
      <nav class="topbar__actions" aria-label="Page controls">${contextActions}</nav>
    </header>`;
}

function renderHome() {
  return `
    <main class="page page--home">
      <section class="welcome-card">
        <div class="welcome-card__copy">
          <p class="eyebrow">Family allowance game</p>
          <h1>Meet your pals.<br>Grow good money habits.</h1>
          <p>Sort weekly allowance into three jars, watch savings goals grow, and care for an animal friend along the way.</p>
          <div class="feature-pills" aria-label="Pocket Pals features">
            <span>🪙 Weekly allowance</span><span>🫙 Three money jars</span><span>🎯 Savings goals</span><span>🐾 Animal friends</span>
          </div>
        </div>
        <div class="welcome-card__scene" aria-hidden="true">
          <span class="scene-cloud scene-cloud--one">☁️</span>
          <span class="scene-cloud scene-cloud--two">☁️</span>
          <div class="scene-hill"></div>
          <div class="scene-pals">${state.children.map((child) => `<span>${child.pet.emoji}</span>`).join("")}</div>
        </div>
      </section>

      <section class="profile-section" aria-labelledby="choose-profile">
        <div class="section-heading">
          <div><p class="eyebrow">Choose a profile</p><h2 id="choose-profile">Who is using Pocket Pals?</h2></div>
          <p>Demo names and animals can be replaced later.</p>
        </div>
        <div class="profile-grid">
          ${state.children.map((child) => {
            const balances = getBalances(state, child.id);
            const level = getLevel(child);
            return `
              <button class="profile-card" data-action="open-child" data-child-id="${child.id}">
                <span class="profile-card__pet">${child.pet.emoji}</span>
                <span class="profile-card__body">
                  <small>${escapeHtml(child.pet.name)} · Level ${level.level}</small>
                  <strong>${escapeHtml(child.name)}</strong>
                  <span>${formatMoney(balances.spending + balances.savings + balances.giving)} across all jars</span>
                </span>
                <span class="profile-card__arrow">→</span>
              </button>`;
          }).join("")}
          <button class="profile-card profile-card--parent" data-action="open-parent">
            <span class="profile-card__pet">🔐</span>
            <span class="profile-card__body"><small>Protected area</small><strong>Parent dashboard</strong><span>Approvals, Parent Bank, chores, and reports</span></span>
            <span class="profile-card__arrow">→</span>
          </button>
        </div>
      </section>

      <aside class="prototype-note">
        <strong>Local-first prototype</strong>
        <span>Data stays in this browser. The demo parent PIN is <code>2468</code>. Do not use real child details until authentication and a private database are added.</span>
      </aside>
    </main>`;
}

function allowanceCard(child) {
  const status = getAllowanceStatus(state, child.id);
  const cycle = getAllowanceCycle(state, child.id);
  const amount = cycle?.amountCents ?? state.settings.weeklyAllowanceCents;

  const content = {
    DUE: `
      <div><span class="status-chip status-chip--due">Ready this week</span><h3>Ask for this week’s allowance</h3><p>Your parent will approve ${formatMoney(amount)}, then you can sort every coin into the jars.</p></div>
      ${cycle?.parentNote ? `<div class="parent-note">Parent note: ${escapeHtml(cycle.parentNote)}</div>` : ""}
      <button class="button button--primary" data-action="request-allowance" data-child-id="${child.id}">Request allowance</button>`,
    REQUESTED: `
      <div><span class="status-chip status-chip--pending">Waiting for parent</span><h3>Request sent</h3><p>Your coins will appear after a parent approves them.</p></div>
      <div class="waiting-pals" aria-hidden="true">${child.pet.emoji} · · · 🪙</div>`,
    APPROVED_FOR_ALLOCATION: `
      <div><span class="status-chip status-chip--ready">Coins ready</span><h3>Sort ${formatMoney(amount)} into your jars</h3><p>There is no required split. Choose what feels right for Spending, Savings, and Giving.</p></div>
      <button class="button button--primary" data-action="open-allocation" data-child-id="${child.id}">Sort my coins</button>`,
    COMPLETED: `
      <div><span class="status-chip status-chip--done">All sorted</span><h3>This week is complete</h3><p>${child.pet.name} earned pet points because you took care of your money.</p></div>
      <div class="allowance-check" aria-hidden="true">✓</div>`,
  }[status];

  return `<section class="allowance-card">${content}</section>`;
}

function jarCard(child, account, balances) {
  const details = {
    spending: { icon: "🪙", title: "Spending", copy: "Cash you keep for everyday choices.", modifier: "spending", reference: Math.max(3000, balances.spending) },
    savings: { icon: "🌱", title: "Savings", copy: "Money your parent holds for future goals.", modifier: "savings", reference: Math.max(...state.goals.filter((goal) => goal.childId === child.id && goal.status !== "PURCHASED").map((goal) => goal.targetCents), 5000) },
    giving: { icon: "💛", title: "Giving", copy: "Money committed to helping someone else.", modifier: "giving", reference: Math.max(2000, balances.giving) },
  }[account];
  const fill = Math.min(92, Math.max(balances[account] > 0 ? 12 : 3, Math.round((balances[account] / details.reference) * 88)));
  const actions = account === "spending"
    ? `<button class="text-button" data-action="open-purchase" data-child-id="${child.id}">Record purchase</button>
       <button class="text-button" data-action="open-transfer" data-child-id="${child.id}">Move money</button>`
    : account === "savings"
      ? `<button class="text-button" data-action="open-goal" data-child-id="${child.id}">Add a goal</button>`
      : `<span class="jar-card__held">Held by parent</span>`;

  return `
    <article class="jar-card jar-card--${details.modifier}">
      <div class="jar-visual" aria-hidden="true">
        <div class="jar-visual__rim"></div>
        <div class="jar-visual__glass"><div class="jar-visual__fill" style="height:${fill}%"></div><span>${details.icon}</span></div>
      </div>
      <div class="jar-card__copy">
        <small>${details.title} jar</small>
        <strong>${formatMoney(balances[account])}</strong>
        <p>${details.copy}</p>
        <div class="jar-card__actions">${actions}</div>
      </div>
    </article>`;
}

function goalCard(goal) {
  const progress = getGoalProgress(state, goal);
  const percentage = Math.round(progress.progress * 100);
  let action = "";
  if (goal.status === "PURCHASED") action = `<span class="status-chip status-chip--done">Goal completed</span>`;
  else if (goal.status === "PURCHASE_REQUESTED") action = `<span class="status-chip status-chip--pending">Parent approval pending</span>`;
  else if (progress.reached) action = `<button class="button button--small" data-action="request-goal" data-child-id="${goal.childId}" data-goal-id="${goal.id}">Ask to buy</button>`;
  else action = `<span class="goal-card__remaining">${formatMoney(Math.max(0, goal.targetCents - progress.savingsCents))} to go</span>`;

  return `
    <article class="goal-card ${goal.status === "PURCHASED" ? "goal-card--complete" : ""}">
      <div class="goal-card__picture">${escapeHtml(goal.picture)}</div>
      <div class="goal-card__body">
        <div class="goal-card__heading"><div><small>Savings goal</small><h4>${escapeHtml(goal.name)}</h4></div><strong>${percentage}%</strong></div>
        <div class="progress-track" role="progressbar" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100" aria-label="${escapeHtml(goal.name)} progress"><span style="width:${percentage}%"></span></div>
        <div class="goal-card__meta"><span>${formatMoney(progress.savingsCents)} saved</span><span>Target ${formatMoney(goal.targetCents)}</span></div>
        <div class="goal-card__action">${action}</div>
      </div>
    </article>`;
}

function choreCard(chore, childId) {
  const status = chore.statusByChild[childId];
  const action = status === "AVAILABLE"
    ? `<button class="button button--small" data-action="submit-chore" data-child-id="${childId}" data-chore-id="${chore.id}">I did it</button>`
    : status === "SUBMITTED"
      ? `<span class="status-chip status-chip--pending">Waiting for parent</span>`
      : `<span class="status-chip status-chip--done">Reward paid</span>`;
  return `
    <article class="quest-card">
      <span class="quest-card__icon">${status === "PAID" ? "⭐" : "🧹"}</span>
      <div><strong>${escapeHtml(chore.title)}</strong><span>${formatMoney(chore.rewardCents)} to ${ACCOUNT_LABELS[chore.destination]}</span></div>
      ${action}
    </article>`;
}

function renderChild() {
  const child = getChild(state, ui.childId);
  const balances = getBalances(state, child.id);
  const level = getLevel(child);
  const badges = getBadgeDetails(child);
  const goals = state.goals.filter((goal) => goal.childId === child.id && goal.status !== "ARCHIVED");
  const chores = state.chores.filter((chore) => chore.assignedChildIds.includes(child.id));
  const activity = getActivityForChild(state, child.id, 8);

  return `
    <main class="page child-page">
      <section class="child-hero">
        <div class="habitat" aria-hidden="true"><span class="habitat__sun">☀️</span><span class="habitat__cloud">☁️</span><div class="habitat__pet">${child.pet.emoji}</div><div class="habitat__ground"></div></div>
        <div class="child-hero__copy">
          <p class="eyebrow">${escapeHtml(child.name)}’s habitat</p>
          <h1>${escapeHtml(child.pet.name)} is ready for a money adventure.</h1>
          <p>Each helpful money habit earns pet points. Your pal never loses progress when you spend or miss a week.</p>
          <div class="level-card">
            <div><strong>Level ${level.level}</strong><span>${level.currentLevelXp} / ${level.nextLevelXp} pet points</span></div>
            <div class="progress-track progress-track--xp"><span style="width:${level.currentLevelXp}%"></span></div>
          </div>
          <div class="badge-row">${badges.length ? badges.map((badge) => `<span title="${escapeHtml(badge.label)}">${badge.icon} ${escapeHtml(badge.label)}</span>`).join("") : "<span>Complete your first weekly sort to earn a badge.</span>"}</div>
        </div>
      </section>

      ${allowanceCard(child)}

      <section class="content-section" aria-labelledby="jars-title">
        <div class="section-heading"><div><p class="eyebrow">Your money</p><h2 id="jars-title">Three jars, three purposes</h2></div><p>Balances come from the activity ledger, not editable totals.</p></div>
        <div class="jar-grid">${["spending", "savings", "giving"].map((account) => jarCard(child, account, balances)).join("")}</div>
      </section>

      <section class="two-column-section">
        <div class="content-card">
          <div class="card-heading"><div><p class="eyebrow">General Savings</p><h2>Things I’m saving for</h2></div><button class="button button--quiet button--small" data-action="open-goal" data-child-id="${child.id}">Add goal</button></div>
          <p class="shared-balance-note"><strong>${formatMoney(balances.savings)}</strong> is shown against every goal. Goals are progress pictures, not separate money pockets.</p>
          <div class="goal-list">${goals.length ? goals.map(goalCard).join("") : `<div class="empty-state"><span>🎯</span><strong>No goals yet</strong><p>Add something worth saving toward.</p></div>`}</div>
        </div>

        <div class="content-card">
          <div class="card-heading"><div><p class="eyebrow">Helpful quests</p><h2>Chores</h2></div></div>
          <div class="quest-list">${chores.length ? chores.map((chore) => choreCard(chore, child.id)).join("") : `<div class="empty-state"><span>🌿</span><strong>No chores assigned</strong><p>Your parent can add one from the dashboard.</p></div>`}</div>
        </div>
      </section>

      <section class="content-card activity-card">
        <div class="card-heading"><div><p class="eyebrow">Your story</p><h2>Recent activity</h2></div></div>
        <div class="activity-list">${activity.map((entry) => `<article><span class="activity-dot"></span><div><strong>${escapeHtml(entry.message)}</strong><time>${formatDate(entry.createdAt)}</time></div></article>`).join("")}</div>
      </section>
    </main>`;
}

function pendingApprovalCard(item) {
  const child = getChild(state, item.childId);
  if (item.type === "ALLOWANCE") {
    return `<article class="approval-card"><span class="approval-card__icon">🪙</span><div><small>Allowance request</small><strong>${escapeHtml(child.name)} requested ${formatMoney(item.data.amountCents)}</strong><span>For the week beginning ${escapeHtml(item.data.weekKey)}</span></div><div class="approval-card__actions"><button class="button button--small" data-action="approve-allowance" data-child-id="${child.id}">Approve</button><button class="button button--quiet button--small" data-action="return-allowance" data-child-id="${child.id}">Return</button></div></article>`;
  }
  if (item.type === "GOAL_PURCHASE") {
    return `<article class="approval-card"><span class="approval-card__icon">${escapeHtml(item.data.picture)}</span><div><small>Goal purchase</small><strong>${escapeHtml(child.name)} is ready to buy ${escapeHtml(item.data.name)}</strong><span>This will release ${formatMoney(item.data.targetCents)} from general Savings.</span></div><div class="approval-card__actions"><button class="button button--small" data-action="approve-goal" data-goal-id="${item.data.id}">Approve purchase</button><button class="button button--quiet button--small" data-action="return-goal" data-goal-id="${item.data.id}">Not yet</button></div></article>`;
  }
  return `<article class="approval-card"><span class="approval-card__icon">🧹</span><div><small>Chore submission</small><strong>${escapeHtml(child.name)} completed ${escapeHtml(item.data.title)}</strong><span>Reward: ${formatMoney(item.data.rewardCents)} to ${ACCOUNT_LABELS[item.data.destination]}</span></div><div class="approval-card__actions"><button class="button button--small" data-action="approve-chore" data-child-id="${child.id}" data-chore-id="${item.data.id}">Approve & pay</button><button class="button button--quiet button--small" data-action="return-chore" data-child-id="${child.id}" data-chore-id="${item.data.id}">Try again</button></div></article>`;
}

function transactionAmount(transaction) {
  const postings = transaction.postings.filter((posting) => ["unallocated", "spending", "savings", "giving"].includes(posting.account));
  return Math.max(0, ...postings.map((posting) => Math.abs(posting.amountCents)));
}

function renderParent() {
  const bank = getParentBank(state);
  const pending = getPendingApprovals(state);
  const unreviewed = getUnreviewedPurchases(state);
  const latestTransactions = [...state.ledger].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12);

  return `
    <main class="page parent-page">
      <section class="parent-header">
        <div><p class="eyebrow">Parent dashboard</p><h1>Household money overview</h1><p>Approve requests, reconcile parent-held money, and support each child without ranking them against each other.</p></div>
        <div class="parent-header__actions"><button class="button button--quiet" data-action="export-data">Export data</button><button class="button button--danger-quiet" data-action="reset-demo">Reset demo</button></div>
      </section>

      <section class="metric-grid" aria-label="Household summary">
        <article><span>🔔</span><div><small>Waiting for you</small><strong>${pending.length}</strong></div></article>
        <article><span>🏦</span><div><small>Parent Bank</small><strong>${formatMoney(bank.totalCents)}</strong></div></article>
        <article><span>🧾</span><div><small>Purchases to review</small><strong>${unreviewed.length}</strong></div></article>
        <article><span>🐾</span><div><small>Active pals</small><strong>${state.children.length}</strong></div></article>
      </section>

      <section class="parent-layout">
        <div class="parent-layout__main">
          <section class="content-card">
            <div class="card-heading"><div><p class="eyebrow">Approval inbox</p><h2>Waiting for you</h2></div><span class="count-badge">${pending.length}</span></div>
            <div class="approval-list">${pending.length ? pending.map(pendingApprovalCard).join("") : `<div class="empty-state empty-state--compact"><span>✓</span><strong>All caught up</strong><p>New allowance, chore, and goal requests will appear here.</p></div>`}</div>
          </section>

          <section class="content-card">
            <div class="card-heading"><div><p class="eyebrow">Children</p><h2>Balances and controls</h2></div><button class="button button--small" data-action="open-chore-create">Create chore</button></div>
            <div class="parent-child-list">
              ${state.children.map((child) => {
                const balances = getBalances(state, child.id);
                return `<article class="parent-child-card">
                  <div class="parent-child-card__identity"><span>${child.pet.emoji}</span><div><small>${escapeHtml(child.pet.name)}</small><strong>${escapeHtml(child.name)}</strong></div></div>
                  <div class="mini-balances"><span><small>Spending</small><strong>${formatMoney(balances.spending)}</strong></span><span><small>Savings</small><strong>${formatMoney(balances.savings)}</strong></span><span><small>Giving</small><strong>${formatMoney(balances.giving)}</strong></span></div>
                  <div class="parent-child-card__actions">
                    <button class="text-button" data-action="open-bonus" data-child-id="${child.id}">Add money</button>
                    <button class="text-button" data-action="open-adjustment" data-child-id="${child.id}">Correct balance</button>
                    <button class="text-button" data-action="open-donation" data-child-id="${child.id}">Record giving</button>
                    <button class="text-button" data-action="apply-interest" data-child-id="${child.id}">Pay interest</button>
                    <button class="text-button" data-action="apply-match" data-child-id="${child.id}">Match savings</button>
                  </div>
                </article>`;
              }).join("")}
            </div>
          </section>

          <section class="content-card">
            <div class="card-heading"><div><p class="eyebrow">Review</p><h2>Child-recorded purchases</h2></div><span class="count-badge">${unreviewed.length}</span></div>
            <div class="purchase-list">${unreviewed.length ? unreviewed.map((transaction) => {
              const child = getChild(state, transaction.childId);
              const amount = Math.abs(transaction.postings.find((posting) => posting.account === "spending")?.amountCents ?? 0);
              return `<article><span class="purchase-list__icon">🧾</span><div><small>${escapeHtml(child.name)} · ${escapeHtml(transaction.metadata.category ?? "Other")}</small><strong>${escapeHtml(transaction.description)}</strong><span>${formatDate(transaction.createdAt)}</span></div><strong>${formatMoney(amount)}</strong><button class="button button--quiet button--small" data-action="review-purchase" data-transaction-id="${transaction.id}">Review</button></article>`;
            }).join("") : `<div class="empty-state empty-state--compact"><span>✓</span><strong>No purchases waiting</strong></div>`}</div>
          </section>
        </div>

        <aside class="parent-layout__side">
          <section class="content-card bank-card">
            <div class="card-heading"><div><p class="eyebrow">Real-world custody</p><h2>Parent Bank</h2></div></div>
            <p>This is the Savings and Giving money the ledger says the parent should hold.</p>
            <div class="bank-total"><small>Total to hold</small><strong>${formatMoney(bank.totalCents)}</strong></div>
            <div class="bank-breakdown">${bank.children.map((entry) => `<article><strong>${escapeHtml(entry.name)}</strong><span>Savings ${formatMoney(entry.savingsCents)}</span><span>Giving ${formatMoney(entry.givingCents)}</span><b>${formatMoney(entry.totalCents)}</b></article>`).join("")}</div>
          </section>

          <section class="content-card ledger-card">
            <div class="card-heading"><div><p class="eyebrow">Audit trail</p><h2>Latest ledger entries</h2></div></div>
            <div class="ledger-list">${latestTransactions.length ? latestTransactions.map((transaction) => `<article><div><strong>${escapeHtml(transaction.description)}</strong><span>${escapeHtml(getChild(state, transaction.childId).name)} · ${formatDate(transaction.createdAt)}</span></div><b>${formatMoney(transactionAmount(transaction))}</b></article>`).join("") : `<div class="empty-state empty-state--compact"><span>📖</span><strong>No entries yet</strong></div>`}</div>
          </section>

          <section class="security-note"><strong>Prototype security</strong><p>The PIN and data live only in this browser. This is not production authentication.</p></section>
        </aside>
      </section>
    </main>`;
}

function render() {
  const body = ui.screen === "child" ? renderChild() : ui.screen === "parent" ? renderParent() : renderHome();
  app.innerHTML = `${renderTopbar()}${body}<footer class="footer"><span>🐾 Pocket Pals MVP</span><span>Local data · SGD · Asia/Singapore</span></footer>`;
  window.scrollTo({ top: 0, behavior: "instant" });
}

function openParentUnlock() {
  if (ui.parentUnlocked) {
    ui.screen = "parent";
    render();
    return;
  }
  openFormModal({
    title: "Parent view",
    description: "Enter the demo PIN. Production authentication is not part of this local prototype.",
    fields: `<label class="field"><span>Parent PIN</span><input name="pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" required><small>Demo PIN: 2468</small></label>`,
    submitLabel: "Unlock",
    onSubmit: (data) => {
      if (data.get("pin") !== state.settings.parentPin) throw new Error("That PIN is not correct");
      ui.parentUnlocked = true;
      ui.screen = "parent";
      return "Parent dashboard unlocked";
    },
  });
}

function openAllocation(childId) {
  const child = getChild(state, childId);
  const cycle = getAllowanceCycle(state, childId);
  if (!cycle || cycle.status !== "APPROVED_FOR_ALLOCATION") {
    showToast("This allowance is not ready to sort", "error");
    return;
  }
  const wholeCoins = Math.floor(cycle.amountCents / 100);
  const remainderCents = cycle.amountCents % 100;
  if (remainderCents) {
    showToast("The coin sorter currently supports whole-dollar weekly allowances", "error");
    return;
  }
  const assignments = Array(wholeCoins).fill(null);
  const order = [null, "spending", "savings", "giving"];

  modalRoot.innerHTML = `<div class="modal-backdrop allocation-backdrop"><section class="modal-card modal-card--wide" role="dialog" aria-modal="true" aria-labelledby="allocation-title" data-modal-card><div class="modal-card__header"><div><p class="eyebrow">Weekly allowance</p><h2 id="allocation-title">Sort ${formatMoney(cycle.amountCents)} into the jars</h2><p>Tap a coin to move it, drag it onto a jar, or use the plus and minus buttons.</p></div><button class="icon-button" type="button" data-action="close-modal" aria-label="Close">×</button></div><div data-allocation-body></div></section></div>`;
  document.body.classList.add("modal-open");

  const redraw = () => {
    const counts = { spending: 0, savings: 0, giving: 0 };
    assignments.forEach((account) => { if (account) counts[account] += 1; });
    const unallocated = assignments.filter((account) => !account).length;
    const body = modalRoot.querySelector("[data-allocation-body]");
    body.innerHTML = `
      <div class="coin-tray">
        <div class="coin-tray__heading"><strong>${unallocated ? `${unallocated} coin${unallocated === 1 ? "" : "s"} left` : "Every coin has a home"}</strong><span>Each coin is $1</span></div>
        <div class="coin-grid">${assignments.map((account, index) => `<button type="button" draggable="true" class="coin ${account ? `coin--${account}` : ""}" data-allocation-coin="${index}" aria-label="Coin ${index + 1}, ${account ? `in ${ACCOUNT_LABELS[account]}` : "not allocated"}">$1</button>`).join("")}</div>
      </div>
      <div class="allocation-jars">
        ${[
          ["spending", "🪙", "Spending"],
          ["savings", "🌱", "Savings"],
          ["giving", "💛", "Giving"],
        ].map(([account, icon, label]) => `<article class="allocation-jar allocation-jar--${account}" data-allocation-drop="${account}"><span>${icon}</span><strong>${label}</strong><b>${formatMoney(counts[account] * 100)}</b><div class="stepper"><button type="button" data-allocation-minus="${account}" aria-label="Remove one dollar from ${label}">−</button><span>${counts[account]} coin${counts[account] === 1 ? "" : "s"}</span><button type="button" data-allocation-plus="${account}" aria-label="Add one dollar to ${label}" ${unallocated ? "" : "disabled"}>+</button></div></article>`).join("")}
      </div>
      <div class="allocation-summary"><div><span>Spending <strong>${formatMoney(counts.spending * 100)}</strong></span><span>Savings <strong>${formatMoney(counts.savings * 100)}</strong></span><span>Giving <strong>${formatMoney(counts.giving * 100)}</strong></span></div><button class="button button--primary" type="button" data-allocation-confirm ${unallocated ? "disabled" : ""}>Confirm my split</button></div>`;

    body.querySelectorAll("[data-allocation-coin]").forEach((coin) => {
      coin.addEventListener("click", () => {
        const index = Number(coin.dataset.allocationCoin);
        assignments[index] = order[(order.indexOf(assignments[index]) + 1) % order.length];
        redraw();
      });
      coin.addEventListener("dragstart", (event) => event.dataTransfer.setData("text/plain", coin.dataset.allocationCoin));
    });
    body.querySelectorAll("[data-allocation-drop]").forEach((jar) => {
      jar.addEventListener("dragover", (event) => event.preventDefault());
      jar.addEventListener("drop", (event) => {
        event.preventDefault();
        const index = Number(event.dataTransfer.getData("text/plain"));
        if (Number.isInteger(index) && assignments[index] !== undefined) assignments[index] = jar.dataset.allocationDrop;
        redraw();
      });
    });
    body.querySelectorAll("[data-allocation-plus]").forEach((button) => button.addEventListener("click", () => {
      const index = assignments.findIndex((account) => !account);
      if (index >= 0) assignments[index] = button.dataset.allocationPlus;
      redraw();
    }));
    body.querySelectorAll("[data-allocation-minus]").forEach((button) => button.addEventListener("click", () => {
      for (let index = assignments.length - 1; index >= 0; index -= 1) {
        if (assignments[index] === button.dataset.allocationMinus) {
          assignments[index] = null;
          break;
        }
      }
      redraw();
    }));
    body.querySelector("[data-allocation-confirm]")?.addEventListener("click", () => {
      try {
        allocateAllowance(state, childId, {
          spending: counts.spending * 100,
          savings: counts.savings * 100,
          giving: counts.giving * 100,
        });
        saveState(state);
        closeModal();
        render();
        showCelebration(`${child.pet.name} earned 30 pet points!`);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Could not save the split", "error");
      }
    });
  };
  redraw();
}

function openPurchaseForm(childId) {
  const balances = getBalances(state, childId);
  openFormModal({
    title: "Record a purchase",
    description: `Available in Spending: ${formatMoney(balances.spending)}. Parent approval is not required, but the purchase will be visible for review.`,
    fields: `
      <label class="field"><span>What did you buy?</span><input name="description" maxlength="80" placeholder="Example: notebook" required></label>
      <div class="field-row"><label class="field"><span>Amount (SGD)</span><input name="amount" type="number" min="0.01" max="${(balances.spending / 100).toFixed(2)}" step="0.01" inputmode="decimal" required></label><label class="field"><span>Category</span><select name="category"><option>Toys</option><option>Food</option><option>Books</option><option>School</option><option>Gifts</option><option selected>Other</option></select></label></div>`,
    submitLabel: "Record purchase",
    onSubmit: (data) => {
      recordPurchase(state, childId, { amountCents: parseMoney(data.get("amount")), description: data.get("description"), category: data.get("category") });
      return "Purchase recorded";
    },
  });
}

function openTransferForm(childId) {
  const balances = getBalances(state, childId);
  openFormModal({
    title: "Move money from Spending",
    description: "Money moved into Savings or Giving is a commitment. Only a parent can correct a genuine mistake.",
    fields: `<div class="field-row"><label class="field"><span>Move to</span><select name="destination"><option value="savings">Savings</option><option value="giving">Giving</option></select></label><label class="field"><span>Amount (SGD)</span><input name="amount" type="number" min="0.01" max="${(balances.spending / 100).toFixed(2)}" step="0.01" inputmode="decimal" required></label></div><p class="form-hint">Available in Spending: ${formatMoney(balances.spending)}</p>`,
    submitLabel: "Move money",
    onSubmit: (data) => {
      const destination = data.get("destination");
      transferFromSpending(state, childId, { destination, amountCents: parseMoney(data.get("amount")) });
      return `Money moved to ${ACCOUNT_LABELS[destination]}`;
    },
  });
}

function openGoalForm(childId) {
  openFormModal({
    title: "Add a savings goal",
    description: "Every goal compares its target against the same general Savings balance. No money is locked to one goal.",
    fields: `<label class="field"><span>Goal name</span><input name="name" maxlength="60" placeholder="Example: roller skates" required></label><div class="field-row"><label class="field"><span>Picture</span><select name="picture"><option>🛼</option><option>🎨</option><option>🚲</option><option>📚</option><option>🎮</option><option>🎁</option><option>🧸</option><option>🎯</option></select></label><label class="field"><span>Target (SGD)</span><input name="target" type="number" min="1" step="0.01" inputmode="decimal" required></label></div>`,
    submitLabel: "Create goal",
    onSubmit: (data) => {
      createGoal(state, childId, { name: data.get("name"), picture: data.get("picture"), targetCents: parseMoney(data.get("target"), "Target") });
      return "New savings goal added";
    },
  });
}

function childOptions(selectedId = "") {
  return state.children.map((child) => `<option value="${child.id}" ${child.id === selectedId ? "selected" : ""}>${escapeHtml(child.name)}</option>`).join("");
}

function openBonusForm(selectedChildId) {
  openFormModal({
    title: "Add bonus or gift money",
    description: "This creates a traceable parent-funded ledger entry.",
    fields: `<label class="field"><span>Child</span><select name="childId">${childOptions(selectedChildId)}</select></label><div class="field-row"><label class="field"><span>Amount (SGD)</span><input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" required></label><label class="field"><span>Destination</span><select name="destination"><option value="spending">Spending</option><option value="savings">Savings</option><option value="giving">Giving</option></select></label></div><label class="field"><span>Reason</span><input name="reason" maxlength="100" placeholder="Birthday gift, extra help…" required></label>`,
    submitLabel: "Add money",
    onSubmit: (data) => {
      addBonus(state, data.get("childId"), { amountCents: parseMoney(data.get("amount")), destination: data.get("destination"), reason: data.get("reason") });
      return "Money added to the ledger";
    },
  });
}

function openAdjustmentForm(selectedChildId) {
  openFormModal({
    title: "Correct a jar balance",
    description: "Corrections are new audit entries; confirmed history is never silently edited.",
    fields: `<label class="field"><span>Child</span><select name="childId">${childOptions(selectedChildId)}</select></label><div class="field-row"><label class="field"><span>Jar</span><select name="account"><option value="spending">Spending</option><option value="savings">Savings</option><option value="giving">Giving</option></select></label><label class="field"><span>Direction</span><select name="direction"><option value="increase">Increase</option><option value="decrease">Decrease</option></select></label><label class="field"><span>Amount (SGD)</span><input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" required></label></div><label class="field"><span>Required reason</span><input name="reason" maxlength="120" placeholder="Explain what is being corrected" required></label>`,
    submitLabel: "Record correction",
    onSubmit: (data) => {
      const amount = parseMoney(data.get("amount"));
      adjustBalance(state, data.get("childId"), { account: data.get("account"), signedAmountCents: data.get("direction") === "increase" ? amount : -amount, reason: data.get("reason") });
      return "Correction recorded";
    },
  });
}

function openDonationForm(selectedChildId) {
  const child = getChild(state, selectedChildId);
  const balances = getBalances(state, selectedChildId);
  openFormModal({
    title: "Record giving money used",
    description: `${child.name} has ${formatMoney(balances.giving)} in Giving. Recording a donation reduces that committed balance.`,
    fields: `<label class="field"><span>Amount (SGD)</span><input name="amount" type="number" min="0.01" max="${(balances.giving / 100).toFixed(2)}" step="0.01" inputmode="decimal" required></label><label class="field"><span>Where did it go?</span><input name="description" maxlength="120" placeholder="Donation, gift, helping someone…" required></label>`,
    submitLabel: "Record giving",
    onSubmit: (data) => {
      recordDonation(state, selectedChildId, { amountCents: parseMoney(data.get("amount")), description: data.get("description") });
      return "Giving activity recorded";
    },
  });
}

function openChoreForm() {
  openFormModal({
    title: "Create a paid chore",
    description: "Children submit completion, then a parent approves the reward once.",
    fields: `<label class="field"><span>Chore</span><input name="title" maxlength="80" placeholder="Example: water the plants" required></label><div class="field-row"><label class="field"><span>Reward (SGD)</span><input name="reward" type="number" min="0.01" step="0.01" inputmode="decimal" required></label><label class="field"><span>Reward goes to</span><select name="destination"><option value="spending">Spending</option><option value="savings">Savings</option><option value="giving">Giving</option></select></label></div><fieldset class="field"><legend>Assign to</legend><div class="check-grid">${state.children.map((child) => `<label><input type="checkbox" name="childIds" value="${child.id}" checked><span>${child.pet.emoji} ${escapeHtml(child.name)}</span></label>`).join("")}</div></fieldset>`,
    submitLabel: "Create chore",
    onSubmit: (data) => {
      createChore(state, { title: data.get("title"), rewardCents: parseMoney(data.get("reward"), "Reward"), destination: data.get("destination"), assignedChildIds: data.getAll("childIds") });
      return "Chore created";
    },
  });
}

function openReturnNote({ title, description, submitLabel = "Return", onSubmit }) {
  openFormModal({
    title,
    description,
    fields: `<label class="field"><span>Short note</span><textarea name="note" rows="3" maxlength="160" placeholder="Explain what should happen next"></textarea></label>`,
    submitLabel,
    submitTone: "quiet",
    onSubmit: (data) => onSubmit(data.get("note") || "Please check with me first."),
  });
}

function exportData() {
  const blob = new Blob([exportState(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `pocket-pals-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("Household data exported");
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action, childId, goalId, choreId, transactionId } = target.dataset;

  if (action === "close-modal") return closeModal();
  if (action === "go-home") {
    ui.screen = "home";
    ui.childId = null;
    closeModal();
    return render();
  }
  if (action === "open-child") {
    ui.screen = "child";
    ui.childId = childId;
    return render();
  }
  if (action === "open-parent") return openParentUnlock();
  if (action === "lock-parent") {
    ui.parentUnlocked = false;
    ui.screen = "home";
    return render();
  }
  if (action === "request-allowance") return mutate(() => requestAllowance(state, childId), "Allowance request sent");
  if (action === "open-allocation") return openAllocation(childId);
  if (action === "open-purchase") return openPurchaseForm(childId);
  if (action === "open-transfer") return openTransferForm(childId);
  if (action === "open-goal") return openGoalForm(childId);
  if (action === "request-goal") {
    const goal = state.goals.find((item) => item.id === goalId);
    return openConfirm({ title: `Ask to buy ${goal?.name ?? "this goal"}?`, description: `A parent will decide whether to release ${formatMoney(goal?.targetCents ?? 0)} from general Savings.`, confirmLabel: "Send request", onConfirm: () => { requestGoalPurchase(state, childId, goalId); return "Goal purchase request sent"; } });
  }
  if (action === "submit-chore") return mutate(() => submitChore(state, childId, choreId), "Chore sent to parent");

  if (!ui.parentUnlocked && ["approve-allowance", "return-allowance", "approve-goal", "return-goal", "approve-chore", "return-chore", "open-bonus", "open-adjustment", "open-donation", "open-chore-create", "apply-interest", "apply-match", "review-purchase", "export-data", "reset-demo"].includes(action)) return openParentUnlock();

  if (action === "approve-allowance") return mutate(() => approveAllowance(state, childId), "Allowance approved");
  if (action === "return-allowance") return openReturnNote({ title: "Return allowance request", description: "The child can request again after reading your note.", onSubmit: (note) => { returnAllowanceRequest(state, childId, note); return "Allowance request returned"; } });
  if (action === "approve-goal") {
    const goal = state.goals.find((item) => item.id === goalId);
    return openConfirm({ title: `Approve ${goal?.name ?? "goal"}?`, description: `This records a purchase and removes ${formatMoney(goal?.targetCents ?? 0)} from general Savings.`, confirmLabel: "Approve purchase", onConfirm: () => { resolveGoalPurchase(state, goalId, { approved: true }); return "Goal purchase approved"; } });
  }
  if (action === "return-goal") return openReturnNote({ title: "Return goal request", description: "The goal stays active and no Savings money is removed.", onSubmit: (note) => { resolveGoalPurchase(state, goalId, { approved: false, note }); return "Goal request returned"; } });
  if (action === "approve-chore") return mutate(() => resolveChore(state, childId, choreId, { approved: true }), "Chore approved and reward paid", { celebrate: true });
  if (action === "return-chore") return openReturnNote({ title: "Ask the child to try again", description: "The chore returns to their available list.", onSubmit: (note) => { resolveChore(state, childId, choreId, { approved: false, note }); return "Chore returned"; } });
  if (action === "open-bonus") return openBonusForm(childId);
  if (action === "open-adjustment") return openAdjustmentForm(childId);
  if (action === "open-donation") return openDonationForm(childId);
  if (action === "open-chore-create") return openChoreForm();
  if (action === "apply-interest") {
    const child = getChild(state, childId);
    const period = getMonthKey();
    return openConfirm({ title: `Pay savings interest to ${child.name}?`, description: `Apply ${(state.settings.interestRateBps / 100).toFixed(2)}% to the current Savings balance for ${period}. This can only run once for the month.`, confirmLabel: "Pay interest", onConfirm: () => { const amount = applyInterest(state, childId, { periodKey: period }); return `${formatMoney(amount)} interest added`; } });
  }
  if (action === "apply-match") {
    const child = getChild(state, childId);
    const period = getMonthKey();
    return openConfirm({ title: `Match ${child.name}’s saving habit?`, description: `Match eligible child-directed Savings for ${period}, up to ${formatMoney(state.settings.matchCapCents)}. This can only run once for the month.`, confirmLabel: "Apply match", onConfirm: () => { const amount = applySavingsMatch(state, childId, { periodKey: period }); return `${formatMoney(amount)} savings match added`; } });
  }
  if (action === "review-purchase") return openFormModal({ title: "Review purchase", description: "Reviewing does not change the balance. Use a correction separately if the cash record is wrong.", fields: `<label class="field"><span>Optional note</span><textarea name="note" rows="3" maxlength="160" placeholder="Looks correct, remember the receipt…"></textarea></label>`, submitLabel: "Mark reviewed", onSubmit: (data) => { reviewPurchase(state, transactionId, data.get("note")); return "Purchase marked reviewed"; } });
  if (action === "export-data") return exportData();
  if (action === "reset-demo") return openConfirm({ title: "Reset all demo data?", description: "This clears every local balance, request, goal update, and activity entry on this browser. Export first if needed.", confirmLabel: "Reset everything", tone: "danger", onConfirm: () => { state = resetState(); ui.screen = "home"; ui.childId = null; ui.parentUnlocked = false; return "Demo data reset"; } });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modalRoot.innerHTML) closeModal();
});

render();
