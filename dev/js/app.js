import { initTabs, addTab, closeTab, setActiveTab, getActiveTabId, updateTabName, updateMeetingData, getTabCount } from './tabs.js';
import {
  initStorage, requestRootFolder, restoreRootFolder, hasRootFolder,
  writeFile, readFile, fileExists, renameFile, buildFilename, buildDefaultFilename,
  resolveUniqueFilename, listDirectory, createDirectory, setFolderColor,
  loadConfig, idbSave, idbLoad, getRootFolderName,
} from './storage.js';
import { initEditor, focusEditor, setContent, getMarkdown, clearEditor } from './editor.js';
import { saveGroqKey, getGroqKey, hasGroqKey } from './groq.js';

// ── App state ──────────────────────────────────────────────
const meetings         = new Map();   // tabId → meeting object
const lastSavedContent = new Map();   // tabId → last written content (skip identical saves)
let autoSaveTimer   = null;
let renameDebounce  = null;

// ── Init ───────────────────────────────────────────────────

async function init() {
  applyTheme(localStorage.getItem('notesai-theme') || 'light');
  await initStorage();

  setupThemeToggle();
  setupModals();
  setupFolderColorPicker();
  initTabs({ onSwitch: handleTabSwitch, onClose: handleTabClose });
  initEditor({ onChange: () => {} });
  setupMeetingHeader();
  setupBottomBar();
  setupSidebar();
  setupSidebarResize();

  const setupDone = localStorage.getItem('notesai-setup-done');

  if (!setupDone) {
    showModal('onboarding');
    return;
  }

  const restored = await restoreRootFolder();
  if (!restored) {
    const folderName = getRootFolderName();
    if (folderName) {
      // Previously set up but permission lapsed — show re-auth
      document.getElementById('reauth-folder-name').textContent = folderName;
      showModal('reauth');
    } else {
      showModal('onboarding');
    }
  } else {
    await afterFolderSelected();
  }
}

// ── Post-setup ─────────────────────────────────────────────

async function afterFolderSelected() {
  await refreshDirectoryTree();
}

// ── Theme ──────────────────────────────────────────────────

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('theme-icon').textContent = theme === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('notesai-theme', theme);
}

function setupThemeToggle() {
  document.getElementById('btn-theme-toggle').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });
}

// ── Modals ─────────────────────────────────────────────────

function showModal(name) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('modal-overlay').querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.getElementById(`modal-${name}`)?.classList.remove('hidden');
}

function hideModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-overlay').querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

function setupModals() {
  // ── Onboarding: step 1 (Groq key)
  const groqNext = document.getElementById('btn-onboarding-next');
  const groqSkip = document.getElementById('btn-onboarding-skip-groq');

  const goToStep2 = () => {
    const key = document.getElementById('input-groq-key').value.trim();
    if (key) saveGroqKey(key);
    document.getElementById('input-groq-key').value = '';
    document.getElementById('onboarding-step-1').classList.add('hidden');
    document.getElementById('onboarding-step-2').classList.remove('hidden');
    // Update step indicator
    document.querySelectorAll('.step-dot').forEach((d, i) => d.classList.toggle('active', i === 1));
  };
  groqNext.addEventListener('click', goToStep2);
  groqSkip.addEventListener('click', goToStep2);
  document.getElementById('input-groq-key').addEventListener('keydown', e => { if (e.key === 'Enter') goToStep2(); });

  // ── Onboarding: step 2 (folder)
  document.getElementById('btn-select-folder').addEventListener('click', async () => {
    const handle = await requestRootFolder();
    if (handle) { hideModal(); await afterFolderSelected(); }
  });

  // ── Re-auth modal
  document.getElementById('btn-reauth-folder').addEventListener('click', async () => {
    const handle = await requestRootFolder();
    if (handle) { hideModal(); await afterFolderSelected(); }
  });

  // ── New folder
  document.getElementById('btn-new-folder-cancel').addEventListener('click', hideModal);
  document.getElementById('btn-new-folder-confirm').addEventListener('click', handleCreateFolder);
  document.getElementById('input-folder-name').addEventListener('keydown', e => { if (e.key === 'Enter') handleCreateFolder(); });

  // ── Generic confirm
  document.getElementById('btn-confirm-cancel').addEventListener('click', hideModal);
}

// ── Folder color picker ────────────────────────────────────

function setupFolderColorPicker() {
  document.getElementById('folder-color-picker').addEventListener('click', e => {
    const swatch = e.target.closest('.color-swatch');
    if (!swatch) return;
    document.querySelectorAll('#folder-color-picker .color-swatch').forEach(s => s.classList.remove('selected'));
    swatch.classList.add('selected');
  });
}

function getSelectedFolderColor() {
  return document.querySelector('#folder-color-picker .color-swatch.selected')?.dataset.color || '#6b7280';
}

// ── Meeting creation ───────────────────────────────────────

function formatMeetingDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

async function createMeeting(folderPath = null) {
  if (getTabCount() >= 8) return;

  const now    = new Date();
  const hh     = now.getHours().toString().padStart(2, '0');
  const mm     = now.getMinutes().toString().padStart(2, '0');
  const id     = `meeting-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const defaultName = `Reunião em ${now.getDate()} - ${hh}:${mm}`;
  const folder      = folderPath || '';
  const rawFilename = buildDefaultFilename(now);
  const relativePath = folder ? `${folder}/${rawFilename}` : rawFilename;
  const filename    = await resolveUniqueFilename(relativePath);

  const meeting = { id, name: defaultName, objective: '', filename, createdAt: now, folder, isDefaultName: true };
  meetings.set(id, meeting);

  if (hasRootFolder()) {
    const initial = buildMdContent(meeting, '');
    await writeFile(filename, initial).catch(console.error);
    lastSavedContent.set(id, initial);
    await refreshDirectoryTree();
  } else {
    const initial = buildMdContent(meeting, '');
    await idbSave(id, { content: initial, filename });
    lastSavedContent.set(id, initial);
  }

  addTab({ id, name: defaultName });
  loadMeetingIntoHeader(id);
  clearEditor();
  setTimeout(() => focusEditor(), 50);
  startAutoSave();

  return id;
}

function buildMdContent(meeting, editorMd) {
  const lines = [
    `# ${meeting.name}`,
    `**Data:** ${formatMeetingDate(meeting.createdAt)}`,
  ];
  if (meeting.objective) lines.push(`**Objetivo:** ${meeting.objective}`);
  lines.push('', '---', '', editorMd || '');
  return lines.join('\n').trimEnd() + '\n';
}

// ── Meeting header ─────────────────────────────────────────

function setupMeetingHeader() {
  const nameInput = document.getElementById('meeting-name-input');
  const objInput  = document.getElementById('meeting-objective-input');

  nameInput.addEventListener('input', () => {
    const tabId = getActiveTabId();
    if (!tabId) return;
    const name    = nameInput.value || 'Nova reunião';
    const meeting = meetings.get(tabId);
    if (!meeting) return;

    meeting.name          = name;
    meeting.isDefaultName = false;
    updateTabName(tabId, name);
    updateMeetingData(tabId, { name });
    scheduleRename(tabId, meeting);
  });

  objInput.addEventListener('input', () => {
    const tabId = getActiveTabId();
    if (!tabId) return;
    const meeting = meetings.get(tabId);
    if (!meeting) return;
    meeting.objective = objInput.value.trim();
    updateMeetingData(tabId, { objective: meeting.objective });
    updateFinishButton();
  });
}

function loadMeetingIntoHeader(tabId) {
  const meeting = meetings.get(tabId);
  if (!meeting) return;
  document.getElementById('meeting-name-input').value        = meeting.name;
  document.getElementById('meeting-date-display').textContent = formatMeetingDate(meeting.createdAt);
  document.getElementById('meeting-objective-input').value   = meeting.objective || '';
  updateFinishButton();
}

function updateFinishButton() {
  const meeting = meetings.get(getActiveTabId());
  const btn     = document.getElementById('btn-finish-notes');
  const has     = !!(meeting?.objective?.trim());
  btn.disabled  = !has;
  btn.title     = has ? 'Finalizar e refinar notas com IA' : 'Preencha o objetivo da reunião para finalizar';
}

// ── Rename scheduling (debounced 1 s) ──────────────────────

function scheduleRename(tabId, meeting) {
  if (renameDebounce) clearTimeout(renameDebounce);
  renameDebounce = setTimeout(async () => {
    if (!hasRootFolder()) return;
    const newFilename  = buildFilename(meeting.createdAt, meeting.name);
    const folder       = meeting.folder || '';
    const newRelative  = folder ? `${folder}/${newFilename}` : newFilename;
    if (newRelative === meeting.filename) return;
    try {
      const resolved     = await resolveUniqueFilename(newRelative);
      await renameFile(meeting.filename, resolved);
      meeting.filename   = resolved;
      lastSavedContent.delete(tabId); // force re-save with new path
      await refreshDirectoryTree();
    } catch (err) {
      console.error('Rename failed:', err);
    }
  }, 1000);
}

// ── Auto-save ──────────────────────────────────────────────

function startAutoSave() {
  stopAutoSave();
  autoSaveTimer = setInterval(() => {
    const tabId = getActiveTabId();
    if (tabId) saveMeeting(tabId);
  }, 30_000);
}

function stopAutoSave() {
  if (autoSaveTimer) { clearInterval(autoSaveTimer); autoSaveTimer = null; }
}

async function saveMeeting(tabId) {
  const meeting = meetings.get(tabId);
  if (!meeting) return;

  const md      = getMarkdown();
  const content = buildMdContent(meeting, md);

  // Skip if content unchanged
  if (lastSavedContent.get(tabId) === content) return;

  if (hasRootFolder()) {
    try {
      await writeFile(meeting.filename, content);
      lastSavedContent.set(tabId, content);
      showAutosaveIndicator();
    } catch (err) {
      if (err.name === 'NotFoundError') {
        showFileNotFoundWarning(tabId, meeting, content);
      } else {
        await idbSave(tabId, { content, filename: meeting.filename });
      }
    }
  } else {
    await idbSave(tabId, { content, filename: meeting.filename });
    lastSavedContent.set(tabId, content);
  }
}

function showAutosaveIndicator() {
  const el = document.getElementById('autosave-indicator');
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 2000);
}

function showFileNotFoundWarning(tabId, meeting, content) {
  document.getElementById('modal-confirm-title').textContent = 'Arquivo não encontrado';
  document.getElementById('modal-confirm-desc').textContent  =
    `"${meeting.filename}" não foi encontrado. Deseja recriar?`;
  const okBtn = document.getElementById('btn-confirm-ok');
  okBtn.textContent = 'Recriar';
  okBtn.className   = 'btn btn-primary';
  const recreate = async () => {
    await writeFile(meeting.filename, content).catch(console.error);
    lastSavedContent.set(tabId, content);
    hideModal();
    okBtn.removeEventListener('click', recreate);
    okBtn.textContent = 'Confirmar'; okBtn.className = 'btn btn-danger';
  };
  okBtn.addEventListener('click', recreate);
  document.getElementById('btn-confirm-cancel').addEventListener('click', () => {
    okBtn.removeEventListener('click', recreate);
    okBtn.textContent = 'Confirmar'; okBtn.className = 'btn btn-danger';
  }, { once: true });
  showModal('confirm');
}

// ── Tab switching ──────────────────────────────────────────

async function handleTabSwitch(tabId) {
  if (tabId === null) {
    if (hasRootFolder()) await createMeeting();
    else showModal('onboarding');
    return;
  }

  const meeting = meetings.get(tabId);
  if (!meeting) return;

  loadMeetingIntoHeader(tabId);

  let fileContent = '';
  if (hasRootFolder()) {
    try { fileContent = await readFile(meeting.filename); }
    catch { const d = await idbLoad(tabId); if (d) fileContent = d.content; }
  } else {
    const d = await idbLoad(tabId); if (d) fileContent = d.content;
  }

  setContent(stripHeader(fileContent));
  setTimeout(() => focusEditor(), 50);
  startAutoSave();
}

function handleTabClose(tabId) {
  saveMeeting(tabId).catch(console.error);
  meetings.delete(tabId);
  lastSavedContent.delete(tabId);
  return true;
}

function stripHeader(content) {
  const lines = content.split('\n');
  let i = 0;
  if (lines[i]?.startsWith('# ')) i++;
  while (i < lines.length && (lines[i].startsWith('**') || lines[i] === '')) i++;
  if (lines[i] === '---') i++;
  while (i < lines.length && lines[i] === '') i++;
  return lines.slice(i).join('\n').trim();
}

// ── Bottom bar ─────────────────────────────────────────────

function setupBottomBar() {
  document.getElementById('btn-finish-notes').addEventListener('click', async () => {
    const tabId = getActiveTabId();
    if (!tabId) return;
    await saveMeeting(tabId);
    alert('Nota salva! O refinamento com IA estará disponível na Fase 3.');
  });
}

// ── Sidebar ────────────────────────────────────────────────

function setupSidebar() {
  document.getElementById('btn-new-folder').addEventListener('click', () => {
    document.getElementById('input-folder-name').value = '';
    document.querySelectorAll('#folder-color-picker .color-swatch').forEach((s, i) => s.classList.toggle('selected', i === 0));
    showModal('new-folder');
    setTimeout(() => document.getElementById('input-folder-name').focus(), 100);
  });
}

async function handleCreateFolder() {
  const name = document.getElementById('input-folder-name').value.trim();
  if (!name || !hasRootFolder()) { hideModal(); return; }
  try {
    await createDirectory(name);
    await setFolderColor(name, getSelectedFolderColor());
    hideModal();
    await refreshDirectoryTree();
  } catch (err) { console.error('Create folder failed:', err); hideModal(); }
}

// ── Sidebar resize ─────────────────────────────────────────

function setupSidebarResize() {
  const sidebar = document.getElementById('sidebar');
  const handle  = document.getElementById('sidebar-resize-handle');
  let dragging = false, startX = 0, startW = 0;

  handle.addEventListener('mousedown', e => {
    dragging = true; startX = e.clientX; startW = sidebar.offsetWidth;
    handle.classList.add('dragging');
    document.body.style.cssText += ';cursor:col-resize;user-select:none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const min = window.innerWidth * 0.10;
    const max = window.innerWidth * 0.40;
    const w   = Math.max(min, Math.min(max, startW + (e.clientX - startX)));
    sidebar.style.width    = w + 'px';
    sidebar.style.minWidth = w + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false; handle.classList.remove('dragging');
    document.body.style.cursor = ''; document.body.style.userSelect = '';
  });
}

// ── Directory tree ─────────────────────────────────────────

async function refreshDirectoryTree() {
  if (!hasRootFolder()) return;
  const tree = document.getElementById('directory-tree');
  tree.innerHTML = '';
  try {
    const cfg          = await loadConfig();
    const entries      = await listDirectory();
    const activeMeeting = meetings.get(getActiveTabId());

    for (const entry of entries) {
      if (entry.kind === 'directory') {
        const color = cfg.folderColors?.[entry.name] || '#6b7280';
        tree.appendChild(await createFolderElement(entry.name, color, entry.handle, cfg, activeMeeting, 0));
      } else {
        tree.appendChild(createFileElement(entry.name, '', activeMeeting));
      }
    }
  } catch (err) { console.error('Directory refresh failed:', err); }
}

async function createFolderElement(name, color, handle, cfg, activeMeeting, depth) {
  const wrapper   = document.createElement('div');
  const folderRow = document.createElement('div');
  folderRow.className     = 'sidebar-item sidebar-folder';
  folderRow.style.paddingLeft = `${12 + depth * 14}px`;
  folderRow.dataset.folder = name;

  const toggle = document.createElement('span');
  toggle.className   = 'sidebar-toggle';
  toggle.textContent = '▾';

  const dot = document.createElement('span');
  dot.className    = 'folder-color-dot';
  dot.style.background = color;

  const icon = document.createElement('span');
  icon.className   = 'folder-icon';
  icon.textContent = '📁';

  const nameEl = document.createElement('span');
  nameEl.className   = 'sidebar-item-name';
  nameEl.textContent = name;

  folderRow.append(toggle, dot, icon, nameEl);

  const children = document.createElement('div');
  children.className = 'folder-children';

  const entries = await listDirectory(handle).catch(() => []);
  for (const entry of entries) {
    if (entry.kind === 'file') {
      const fileEl = createFileElement(entry.name, name, activeMeeting, depth + 1);
      fileEl.setAttribute('draggable', 'true');
      fileEl.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ filename: entry.name, folder: name }));
      });
      children.appendChild(fileEl);
    } else if (entry.kind === 'directory' && depth < 2) {
      // Up to 3 levels (depth 0,1,2)
      const subColor = cfg.folderColors?.[`${name}/${entry.name}`] || cfg.folderColors?.[entry.name] || '#6b7280';
      children.appendChild(await createFolderElement(entry.name, subColor, entry.handle, cfg, activeMeeting, depth + 1));
    }
  }

  folderRow.addEventListener('click', () => folderRow.classList.toggle('collapsed'));
  folderRow.addEventListener('dragover', e => { e.preventDefault(); folderRow.classList.add('drag-over'); });
  folderRow.addEventListener('dragleave', () => folderRow.classList.remove('drag-over'));
  folderRow.addEventListener('drop', e => { e.preventDefault(); folderRow.classList.remove('drag-over'); handleFileDrop(e, name); });

  wrapper.append(folderRow, children);
  return wrapper;
}

function createFileElement(filename, folder, activeMeeting, depth = 0) {
  const ext         = filename.endsWith('.txt') ? ' .txt' : '';
  const displayName = filename
    .replace(/^\d{4}-\d{2}-\d{2}_/, '')
    .replace(/_/g, ' ')
    .replace(/\.(md|txt)$/, '') + ext;

  const el = document.createElement('div');
  el.className = 'sidebar-item sidebar-file';
  el.style.paddingLeft = `${28 + depth * 14}px`;
  el.dataset.filename  = filename;
  el.dataset.folder    = folder;
  el.title             = displayName;

  const nameEl = document.createElement('span');
  nameEl.className   = 'sidebar-item-name';
  nameEl.textContent = displayName;
  el.appendChild(nameEl);

  const relativePath = folder ? `${folder}/${filename}` : filename;
  if (activeMeeting?.filename === relativePath) el.classList.add('active');

  el.setAttribute('draggable', 'true');
  el.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ filename, folder }));
  });
  el.addEventListener('click', () => openMeetingFile(filename, folder));
  return el;
}

async function openMeetingFile(filename, folder) {
  const relativePath = folder ? `${folder}/${filename}` : filename;
  for (const [tabId, meeting] of meetings.entries()) {
    if (meeting.filename === relativePath) { setActiveTab(tabId); handleTabSwitch(tabId); return; }
  }
  try {
    const content  = await readFile(relativePath);
    const id       = `meeting-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nameLine = content.split('\n').find(l => l.startsWith('# '));
    const name     = nameLine ? nameLine.slice(2).trim() : filename.replace(/\.(md|txt)$/, '').replace(/_/g, ' ');
    const meeting  = { id, name, objective: '', filename: relativePath, createdAt: new Date(), folder, isDefaultName: false };
    meetings.set(id, meeting);
    addTab({ id, name });
    handleTabSwitch(id);
  } catch (err) { console.error('Failed to open file:', err); }
}

async function handleFileDrop(e, targetFolder) {
  let data;
  try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; }
  const { filename, folder: src } = data;
  const srcPath  = src ? `${src}/${filename}` : filename;
  const destPath = `${targetFolder}/${filename}`;
  if (srcPath === destPath) return;
  try {
    await renameFile(srcPath, destPath);
    for (const [, meeting] of meetings.entries()) {
      if (meeting.filename === srcPath) { meeting.filename = destPath; meeting.folder = targetFolder; break; }
    }
    await refreshDirectoryTree();
  } catch (err) { console.error('Move file failed:', err); }
}

// ── Keyboard shortcuts ─────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.activeElement?.blur();
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    const tabId = getActiveTabId();
    if (tabId) saveMeeting(tabId);
  }
});

document.getElementById('editor-wrap')?.addEventListener('blur', () => {
  const tabId = getActiveTabId();
  if (tabId) saveMeeting(tabId).catch(console.error);
}, true);

// ── Boot ───────────────────────────────────────────────────
init().catch(err => console.error('NotesAI init failed:', err));
