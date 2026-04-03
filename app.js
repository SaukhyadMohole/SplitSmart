// ─── Storage Keys ──────────────────────────────────────────────────
const KEYS = {
  members:  'splitsmart_members',
  expenses: 'splitsmart_expenses',
  theme:    'splitsmart_theme',
  currency: 'splitsmart_currency'
};

// ─── Storage Helpers ───────────────────────────────────────────────

/** Initialize sessionStorage with empty arrays if not set */
function initStorage() {
  if (!sessionStorage.getItem(KEYS.members))
    sessionStorage.setItem(KEYS.members, JSON.stringify([]));
  if (!sessionStorage.getItem(KEYS.expenses))
    sessionStorage.setItem(KEYS.expenses, JSON.stringify([]));
}

function getMembers() {
  return JSON.parse(sessionStorage.getItem(KEYS.members) || '[]');
}
function saveMembers(arr) {
  sessionStorage.setItem(KEYS.members, JSON.stringify(arr));
}

function getExpenses() {
  return JSON.parse(sessionStorage.getItem(KEYS.expenses) || '[]');
}
function saveExpenses(arr) {
  sessionStorage.setItem(KEYS.expenses, JSON.stringify(arr));
}

/**
 * Normalize older and newer expense records into a consistent shape.
 * Supports legacy records that only have {paidBy, amount, ...}.
 */
function normalizeExpense(expense, members) {
  const baseMembers = Array.isArray(members) ? members : getMembers();
  const splitType = expense.splitType === 'custom' ? 'custom' : 'equal';
  const participants = Array.isArray(expense.participants) && expense.participants.length
    ? expense.participants.filter(name => baseMembers.includes(name))
    : [...baseMembers];

  const normalized = {
    ...expense,
    splitType,
    participants
  };

  if (splitType === 'custom' && expense.customShares && typeof expense.customShares === 'object') {
    const cleanShares = {};
    participants.forEach(name => {
      const val = parseFloat(expense.customShares[name] || 0);
      cleanShares[name] = Number.isFinite(val) ? +val.toFixed(2) : 0;
    });
    normalized.customShares = cleanShares;
  } else {
    normalized.customShares = null;
  }

  return normalized;
}

/**
 * Compute paid/owed/balance using expense-level split metadata.
 * - equal split: only selected participants share equally
 * - custom split: customShares defines exact per-member share
 */
function computeBalances(members, expenses) {
  const paid = {};
  const owed = {};
  members.forEach(m => {
    paid[m] = 0;
    owed[m] = 0;
  });

  const normalizedExpenses = expenses.map(e => normalizeExpense(e, members));

  normalizedExpenses.forEach(exp => {
    const amount = +parseFloat(exp.amount || 0).toFixed(2);
    if (!Number.isFinite(amount) || amount <= 0) return;

    if (paid[exp.paidBy] !== undefined) paid[exp.paidBy] += amount;

    if (exp.splitType === 'custom' && exp.customShares) {
      let customSum = 0;
      exp.participants.forEach(name => {
        const share = +parseFloat(exp.customShares[name] || 0).toFixed(2);
        if (owed[name] !== undefined) owed[name] += share;
        customSum += share;
      });
      // Fallback safety for malformed data: if shares don't sum, use equal split.
      if (Math.abs(customSum - amount) > 0.01 && exp.participants.length > 0) {
        const equalShare = amount / exp.participants.length;
        exp.participants.forEach(name => {
          if (owed[name] !== undefined) {
            owed[name] -= +parseFloat(exp.customShares[name] || 0).toFixed(2);
            owed[name] += equalShare;
          }
        });
      }
      return;
    }

    if (exp.participants.length === 0) return;
    const share = amount / exp.participants.length;
    exp.participants.forEach(name => {
      if (owed[name] !== undefined) owed[name] += share;
    });
  });

  const balance = {};
  members.forEach(m => {
    paid[m] = +paid[m].toFixed(2);
    owed[m] = +owed[m].toFixed(2);
    balance[m] = +(paid[m] - owed[m]).toFixed(2);
  });

  return { paid, owed, balance, normalizedExpenses };
}

function clearStorage() {
  sessionStorage.removeItem(KEYS.members);
  sessionStorage.removeItem(KEYS.expenses);
  sessionStorage.removeItem(KEYS.currency);
}

function getCurrency() {
  return sessionStorage.getItem(KEYS.currency) || '₹';
}
function saveCurrency(sym) {
  sessionStorage.setItem(KEYS.currency, sym);
}

// ─── Page Guard ────────────────────────────────────────────────────
/**
 * Redirect user if required data is missing.
 * @param {'expenses'|'settlement'} page
 */
function guardPage(page) {
  const members = getMembers();
  if (members.length < 2) {
    window.location.href = 'index.html';
    return;
  }
  if (page === 'settlement') {
    const expenses = getExpenses();
    if (expenses.length === 0) {
      window.location.href = 'expenses.html';
    }
  }
}

// ─── Formatting ────────────────────────────────────────────────────

/** Format number to 2 decimal places, strip trailing zeros neatly. Includes currency. */
function fmt(num) {
  const n = parseFloat(num);
  const formatted = n % 1 === 0 ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { minimumFractionDigits: 2, 
    maximumFractionDigits: 2 });
  return getCurrency() + formatted;
}

/** Escape HTML to prevent XSS */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Dark Mode ─────────────────────────────────────────────────────
(function initTheme() {
  // Use localStorage so theme persists across page navigations
  const saved = localStorage.getItem(KEYS.theme);
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
})();

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  // Sync icon state
  const updateIcon = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.querySelector('.toggle-icon').textContent = isDark ? '☀' : '☽';
  };
  updateIcon();

  btn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem(KEYS.theme, 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem(KEYS.theme, 'dark');
    }
    updateIcon();
  });
});
