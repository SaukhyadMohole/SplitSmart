/**
 * SplitSmart – Shared Utilities (app.js)
 * Handles: sessionStorage helpers, dark mode, page guards, formatting
 */

// ─── Storage Keys ──────────────────────────────────────────────────
const KEYS = {
  members:  'splitsmart_members',
  expenses: 'splitsmart_expenses',
  theme:    'splitsmart_theme'
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

/** Format number to 2 decimal places, strip trailing zeros neatly */
function fmt(num) {
  const n = parseFloat(num);
  return n % 1 === 0 ? n.toLocaleString('en-IN') : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
