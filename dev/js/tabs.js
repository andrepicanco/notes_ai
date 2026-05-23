const MAX_TABS = 8;
const TOOLTIP_KEY = 'notesai-tabs-tooltip-shown';

let tabs = [];
let activeTabId = null;
let onTabSwitch = null;
let onTabClose = null;

export function initTabs({ onSwitch, onClose }) {
  onTabSwitch = onSwitch;
  onTabClose = onClose;

  document.addEventListener('keydown', handleTabKeyNav);
  document.getElementById('btn-new-tab').addEventListener('click', () => {
    if (onTabSwitch) onTabSwitch(null);
  });
  document.getElementById('btn-new-meeting-empty').addEventListener('click', () => {
    if (onTabSwitch) onTabSwitch(null);
  });
}

export function addTab(meetingData) {
  if (tabs.length >= MAX_TABS) {
    showMaxTabsWarning();
    return null;
  }
  const tab = { id: meetingData.id, name: meetingData.name, meetingData };
  tabs.push(tab);
  renderTabs();
  setActiveTab(tab.id);
  if (tabs.length === 2) maybeShowTooltip();
  return tab.id;
}

export function updateTabName(tabId, name) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;
  tab.name = name;
  if (tab.meetingData) tab.meetingData.name = name;
  renderTabs();
}

export function closeTab(tabId) {
  const idx = tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return;
  tabs.splice(idx, 1);
  if (activeTabId === tabId) {
    const next = tabs[idx] || tabs[idx - 1] || null;
    activeTabId = next ? next.id : null;
    if (onTabSwitch) onTabSwitch(activeTabId);
  }
  renderTabs();
  updateEmptyState();
}

export function setActiveTab(tabId) {
  activeTabId = tabId;
  renderTabs();
  updateEmptyState();
}

export function getActiveTabId() { return activeTabId; }
export function getTabCount()    { return tabs.length; }

export function getMeetingData(tabId) {
  const tab = tabs.find(t => t.id === tabId);
  return tab ? tab.meetingData : null;
}

export function updateMeetingData(tabId, partial) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;
  Object.assign(tab.meetingData, partial);
  if (partial.name !== undefined) {
    tab.name = partial.name;
    renderTabs();
  }
}

// ── Rendering ──────────────────────────────────────────────

function renderTabs() {
  const list = document.getElementById('tabs-list');
  list.innerHTML = '';
  tabs.forEach(tab => {
    const el = document.createElement('div');
    el.className = 'tab' + (tab.id === activeTabId ? ' active' : '');
    el.setAttribute('role', 'tab');
    el.setAttribute('aria-selected', tab.id === activeTabId ? 'true' : 'false');
    el.dataset.tabId = tab.id;

    const nameEl = document.createElement('span');
    nameEl.className = 'tab-name';
    nameEl.textContent = tab.name || 'Nova reunião';
    nameEl.title = tab.name || 'Nova reunião';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close';
    closeBtn.innerHTML = '×';
    closeBtn.title = 'Fechar';
    closeBtn.setAttribute('aria-label', `Fechar ${tab.name}`);
    closeBtn.addEventListener('click', e => { e.stopPropagation(); requestCloseTab(tab.id); });

    el.appendChild(nameEl);
    el.appendChild(closeBtn);
    el.addEventListener('click', () => {
      if (tab.id !== activeTabId) {
        setActiveTab(tab.id);
        if (onTabSwitch) onTabSwitch(tab.id);
      }
    });
    list.appendChild(el);
  });
}

function updateEmptyState() {
  const hasActive = activeTabId !== null && tabs.some(t => t.id === activeTabId);
  document.getElementById('empty-state').classList.toggle('hidden', hasActive);
  document.getElementById('meeting-header').classList.toggle('hidden', !hasActive);
  document.getElementById('editor-wrap').classList.toggle('hidden', !hasActive);
  document.getElementById('bottom-bar').classList.toggle('hidden', !hasActive);
}

// ── Keyboard navigation: Alt+PageDown / Alt+PageUp ────────

function handleTabKeyNav(e) {
  if (!e.altKey) return;
  if (e.key !== 'PageDown' && e.key !== 'PageUp') return;
  if (tabs.length < 2) return;

  e.preventDefault();
  const idx = tabs.findIndex(t => t.id === activeTabId);
  if (idx === -1) return;

  const next = e.key === 'PageDown'
    ? tabs[(idx + 1) % tabs.length]
    : tabs[(idx - 1 + tabs.length) % tabs.length];

  setActiveTab(next.id);
  if (onTabSwitch) onTabSwitch(next.id);
}

// ── Close handling ─────────────────────────────────────────

function requestCloseTab(tabId) {
  if (onTabClose) {
    const result = onTabClose(tabId);
    if (result === false) return;
    if (result && typeof result.then === 'function') {
      result.then(ok => { if (ok !== false) closeTab(tabId); });
      return;
    }
  }
  closeTab(tabId);
}

// ── Max tabs warning ───────────────────────────────────────

function showMaxTabsWarning() {
  const overlay = document.getElementById('modal-overlay');
  const modal   = document.getElementById('modal-confirm');
  document.getElementById('modal-confirm-title').textContent = 'Limite de abas atingido';
  document.getElementById('modal-confirm-desc').textContent =
    `O NotesAI suporta até ${MAX_TABS} reuniões abertas. Feche uma aba para continuar.`;
  const okBtn = document.getElementById('btn-confirm-ok');
  okBtn.textContent = 'OK';
  okBtn.className = 'btn btn-primary';
  document.getElementById('btn-confirm-cancel').classList.add('hidden');

  const cleanup = () => {
    overlay.classList.add('hidden');
    modal.classList.add('hidden');
    document.getElementById('btn-confirm-cancel').classList.remove('hidden');
    okBtn.className = 'btn btn-danger';
    okBtn.textContent = 'Confirmar';
    okBtn.removeEventListener('click', cleanup);
  };
  okBtn.addEventListener('click', cleanup);
  modal.classList.remove('hidden');
  overlay.classList.remove('hidden');
}

// ── Tooltip ────────────────────────────────────────────────

function maybeShowTooltip() {
  if (localStorage.getItem(TOOLTIP_KEY)) return;
  const tip = document.getElementById('tabs-tooltip');
  tip.classList.remove('hidden');
  localStorage.setItem(TOOLTIP_KEY, '1');
  setTimeout(() => tip.classList.add('hidden'), 5000);
}
