import {
  initTabs, addTab, closeTab, setActiveTab, getActiveTabId,
  updateTabName, updateMeetingData, getTabCount, getAllTabs,
} from './tabs.js';
import {
  initStorage, requestRootFolder, restoreRootFolder, hasRootFolder, getRootHandle,
  writeFile, readFile, deleteFile, fileExists, renameFile,
  deleteDirectory, renameFolder, moveFolderIntoFolder, moveFolderBetweenDirs,
  buildFilename, buildDefaultFilename,
  resolveUniqueFilename, listDirectory, createDirectory, setFolderColor,
  loadConfig, saveConfig, idbSave, idbLoad, getRootFolderName,
} from './storage.js';
import { initEditor, focusEditor, focusAtCoords, setContent, getMarkdown, clearEditor } from './editor.js';
import { saveGroqKey, getGroqKey, hasGroqKey } from './groq.js';

// ── App state ──────────────────────────────────────────────
const meetings         = new Map();
const lastSavedContent = new Map();
let autoSaveTimer     = null;
let renameDebounce    = null;
let contextItem       = null;
let createSubfolderIn = null;
let currentDragData   = null;   // set during dragstart, cleared on dragend/drop

// ── Init ───────────────────────────────────────────────────

async function init() {
  applyTheme(localStorage.getItem('notesai-theme') || 'light');
  await initStorage();

  setupThemeToggle();
  setupModals();
  setupFolderColorPicker();
  initTabs({ onSwitch: handleTabSwitch, onClose: handleTabClose, onNew: () => createMeeting() });
  initEditor({ onChange: () => {} });
  setupMeetingHeader();
  setupBottomBar();
  setupSidebar();
  setupSidebarResize();
  setupEditorWrapClick();

  // Clear drag state on any dragend/drop anywhere
  document.addEventListener('dragend', () => { currentDragData = null; });

  const setupDone = localStorage.getItem('notesai-setup-done');
  if (!setupDone) { showModal('onboarding'); return; }

  const restored = await restoreRootFolder();
  if (!restored) {
    const folderName = getRootFolderName();
    if (folderName) {
      document.getElementById('reauth-folder-name').textContent = folderName;
      showModal('reauth');
    } else {
      showModal('onboarding');
    }
  } else {
    await afterFolderSelected();
  }
}

async function afterFolderSelected() {
  await refreshDirectoryTree();
  await restoreTabState();
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
  // ── Onboarding step 1
  const goToStep2 = () => {
    const key = document.getElementById('input-groq-key').value.trim();
    if (key) saveGroqKey(key);
    document.getElementById('input-groq-key').value = '';
    document.getElementById('onboarding-step-1').classList.add('hidden');
    document.getElementById('onboarding-step-2').classList.remove('hidden');
    document.querySelectorAll('.step-dot').forEach((d, i) => d.classList.toggle('active', i === 1));
  };
  document.getElementById('btn-onboarding-next').addEventListener('click', goToStep2);
  document.getElementById('btn-onboarding-skip-groq').addEventListener('click', goToStep2);
  document.getElementById('input-groq-key').addEventListener('keydown', e => { if (e.key === 'Enter') goToStep2(); });

  // ── Onboarding step 2
  document.getElementById('btn-select-folder').addEventListener('click', async () => {
    const handle = await requestRootFolder();
    if (handle) { hideModal(); await afterFolderSelected(); }
  });

  // ── Re-auth
  document.getElementById('btn-reauth-folder').addEventListener('click', async () => {
    const handle = await requestRootFolder();
    if (handle) { hideModal(); await afterFolderSelected(); }
  });

  // ── New folder / subfolder
  document.getElementById('btn-new-folder-cancel').addEventListener('click', () => {
    createSubfolderIn = null; hideModal();
  });
  document.getElementById('btn-new-folder-confirm').addEventListener('click', handleCreateFolder);
  document.getElementById('input-folder-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleCreateFolder();
  });

  // ── Item actions (⁝ menu)
  document.getElementById('btn-item-actions-cancel').addEventListener('click', () => {
    contextItem = null; hideModal();
  });
  document.getElementById('btn-action-rename').addEventListener('click', () => {
    if (!contextItem) return;
    const current = contextItem.kind === 'file'
      ? contextItem.filename.replace(/\.(md|txt)$/, '').replace(/_/g, ' ').replace(/^\d{4}-\d{2}-\d{2}_/, '')
      : contextItem.name;
    document.getElementById('rename-item-title').textContent =
      contextItem.kind === 'file' ? 'Renomear arquivo' : 'Renomear pasta';
    document.getElementById('input-rename-value').value = current;
    showModal('rename-item');
    setTimeout(() => {
      const inp = document.getElementById('input-rename-value');
      inp.focus(); inp.select();
    }, 100);
  });
  document.getElementById('btn-action-subfolder').addEventListener('click', () => {
    if (!contextItem || contextItem.kind !== 'folder') return;
    createSubfolderIn = contextItem;
    document.getElementById('new-folder-title').textContent = `Nova subpasta em "${contextItem.name}"`;
    document.getElementById('input-folder-name').value = '';
    document.querySelectorAll('#folder-color-picker .color-swatch').forEach((s, i) => s.classList.toggle('selected', i === 0));
    showModal('new-folder');
    setTimeout(() => document.getElementById('input-folder-name').focus(), 100);
  });
  document.getElementById('btn-action-delete').addEventListener('click', () => {
    if (!contextItem) return;
    const isFile = contextItem.kind === 'file';
    const label  = isFile ? `"${contextItem.filename}"` : `a pasta "${contextItem.name}" e todo o seu conteúdo`;
    document.getElementById('modal-confirm-title').textContent = isFile ? 'Excluir arquivo' : 'Excluir pasta';
    document.getElementById('modal-confirm-desc').textContent  = `Deseja excluir ${label}? Esta ação não pode ser desfeita.`;
    const okBtn = document.getElementById('btn-confirm-ok');
    okBtn.textContent = 'Excluir'; okBtn.className = 'btn btn-danger';
    const doDelete = async () => {
      okBtn.removeEventListener('click', doDelete);
      await executeDeleteItem();
    };
    okBtn.addEventListener('click', doDelete);
    document.getElementById('btn-confirm-cancel').addEventListener('click', () => {
      okBtn.removeEventListener('click', doDelete);
    }, { once: true });
    showModal('confirm');
  });

  // ── Rename item
  document.getElementById('btn-rename-cancel').addEventListener('click', () => {
    contextItem = null; hideModal();
  });
  document.getElementById('btn-rename-confirm').addEventListener('click', executeRenameItem);
  document.getElementById('input-rename-value').addEventListener('keydown', e => {
    if (e.key === 'Enter') executeRenameItem();
  });

  // ── Generic confirm cancel
  document.getElementById('btn-confirm-cancel').addEventListener('click', hideModal);

  // ── Shortcuts
  document.getElementById('btn-shortcuts-close').addEventListener('click', hideModal);
  document.getElementById('btn-shortcuts-help').addEventListener('click', () => showModal('shortcuts'));
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

  const now   = new Date();
  const hh    = now.getHours().toString().padStart(2, '0');
  const mm    = now.getMinutes().toString().padStart(2, '0');
  const dd    = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year  = now.getFullYear();
  const id    = `meeting-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const defaultName  = `Reunião em ${dd}/${month}/${year} às ${hh}:${mm}`;
  const folder       = folderPath || '';
  const rawFilename  = buildDefaultFilename(now);
  const relativePath = folder ? `${folder}/${rawFilename}` : rawFilename;
  const filename     = await resolveUniqueFilename(relativePath);

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
  persistTabState();
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

// ── Tab state persistence ──────────────────────────────────

function persistTabState() {
  try {
    const state = getAllTabs().map(t => {
      const m = meetings.get(t.id);
      return { filename: m?.filename || '', name: t.name };
    }).filter(s => s.filename);
    const activeMeeting = meetings.get(getActiveTabId());
    localStorage.setItem('notesai-tab-state', JSON.stringify({
      tabs: state,
      activeFilename: activeMeeting?.filename || '',
    }));
  } catch { /* non-fatal */ }
}

async function restoreTabState() {
  try {
    const raw = localStorage.getItem('notesai-tab-state');
    if (!raw) return false;
    const { tabs: saved, activeFilename } = JSON.parse(raw);
    if (!Array.isArray(saved) || saved.length === 0) return false;

    let activeId = null;
    let restoredCount = 0;

    for (const s of saved) {
      if (!s.filename) continue;
      try {
        const content   = await readFile(s.filename);
        const id        = `meeting-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const nameLine  = content.split('\n').find(l => l.startsWith('# '));
        const name      = nameLine ? nameLine.slice(2).trim() : (s.name || s.filename);
        const objLine   = content.split('\n').find(l => l.startsWith('**Objetivo:**'));
        const objective = objLine ? objLine.replace('**Objetivo:**', '').trim() : '';
        const parts     = s.filename.split('/');
        const folder    = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
        const meeting   = { id, name, objective, filename: s.filename, createdAt: new Date(), folder, isDefaultName: false };
        meetings.set(id, meeting);
        lastSavedContent.set(id, content);
        addTab({ id, name });
        restoredCount++;
        if (s.filename === activeFilename) activeId = id;
      } catch { /* file deleted — skip */ }
    }

    if (restoredCount === 0) return false;
    const targetId = activeId || meetings.keys().next().value;
    setActiveTab(targetId);
    await handleTabSwitch(targetId);
    return true;
  } catch { return false; }
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
  document.getElementById('meeting-name-input').value         = meeting.name;
  document.getElementById('meeting-date-display').textContent = formatMeetingDate(meeting.createdAt);
  document.getElementById('meeting-objective-input').value    = meeting.objective || '';
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
      const resolved   = await resolveUniqueFilename(newRelative);
      await renameFile(meeting.filename, resolved);
      meeting.filename = resolved;
      lastSavedContent.delete(tabId);
      await refreshDirectoryTree();
      persistTabState();
    } catch (err) { console.error('Rename failed:', err); }
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
  if (lastSavedContent.get(tabId) === content) return;

  if (hasRootFolder()) {
    try {
      await writeFile(meeting.filename, content);
      lastSavedContent.set(tabId, content);
      showAutosaveIndicator();
    } catch (err) {
      if (err.name === 'NotFoundError') showFileNotFoundWarning(tabId, meeting, content);
      else await idbSave(tabId, { content, filename: meeting.filename });
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
  okBtn.textContent = 'Recriar'; okBtn.className = 'btn btn-primary';
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
    clearEditor();
    stopAutoSave();
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
  persistTabState();
}

function handleTabClose(tabId) {
  saveMeeting(tabId).catch(console.error);
  meetings.delete(tabId);
  lastSavedContent.delete(tabId);
  setTimeout(persistTabState, 0);
  return true;
}

function stripHeader(content) {
  if (!content?.trim()) return '';
  const lines = content.split('\n');
  let i = 0;
  if (lines[i]?.startsWith('# ')) i++;
  while (i < lines.length && (lines[i]?.startsWith('**') || lines[i] === '')) i++;
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

// ── Editor wrap click → focus at cursor Y position ─────────

function setupEditorWrapClick() {
  document.getElementById('editor-wrap').addEventListener('click', e => {
    if (e.target.closest('.ProseMirror')) return;
    if (!getActiveTabId()) return;
    focusAtCoords(e.clientX, e.clientY);
  });
}

// ── Sidebar ────────────────────────────────────────────────

function setupSidebar() {
  document.getElementById('btn-new-folder').addEventListener('click', () => {
    createSubfolderIn = null;
    document.getElementById('new-folder-title').textContent = 'Nova pasta';
    document.getElementById('input-folder-name').value = '';
    document.querySelectorAll('#folder-color-picker .color-swatch').forEach((s, i) => s.classList.toggle('selected', i === 0));
    showModal('new-folder');
    setTimeout(() => document.getElementById('input-folder-name').focus(), 100);
  });
}

async function handleCreateFolder() {
  const name = document.getElementById('input-folder-name').value.trim();
  if (!name || !hasRootFolder()) { createSubfolderIn = null; hideModal(); return; }
  try {
    if (createSubfolderIn) {
      const existingEntries = await listDirectory(createSubfolderIn.handle);
      const subCount = existingEntries.filter(e => e.kind === 'directory').length;
      if (subCount >= 3) {
        alert('Esta pasta já contém 3 subpastas. Não é possível adicionar mais.');
        createSubfolderIn = null; hideModal(); return;
      }
      const parentPath = createSubfolderIn.fullPath;
      await createDirectory(name, createSubfolderIn.handle);
      await setFolderColor(`${parentPath}/${name}`, getSelectedFolderColor());
    } else {
      await createDirectory(name);
      await setFolderColor(name, getSelectedFolderColor());
    }
    createSubfolderIn = null;
    hideModal();
    await refreshDirectoryTree();
  } catch (err) { console.error('Create folder failed:', err); createSubfolderIn = null; hideModal(); }
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
        tree.appendChild(await createFolderElement(
          entry.name, color, entry.handle, cfg, activeMeeting, 0, '', getRootHandle()
        ));
      } else {
        tree.appendChild(createFileElement(entry.name, '', activeMeeting));
      }
    }

    // Root drop zone: empty area below items
    setupRootDropZone(tree);
  } catch (err) { console.error('Directory refresh failed:', err); }
}

function setupRootDropZone(tree) {
  tree.addEventListener('dragover', e => {
    if (e.target.closest('.sidebar-item')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    tree.classList.add('drag-over-root');
  });
  tree.addEventListener('dragleave', e => {
    if (!tree.contains(e.relatedTarget)) tree.classList.remove('drag-over-root');
  });
  tree.addEventListener('drop', e => {
    if (e.target.closest('.sidebar-item')) return;
    e.preventDefault();
    tree.classList.remove('drag-over-root');
    if (currentDragData) handleDropToRoot(currentDragData);
  });
}

async function createFolderElement(name, color, handle, cfg, activeMeeting, depth, parentPath, ownParentHandle) {
  const wrapper   = document.createElement('div');
  const folderRow = document.createElement('div');
  folderRow.className        = 'sidebar-item sidebar-folder';
  folderRow.style.paddingLeft = `${12 + depth * 14}px`;
  folderRow.dataset.folder   = name;

  const toggle = document.createElement('span');
  toggle.className   = 'sidebar-toggle';
  toggle.textContent = '▾';

  // Drag handle (color dot + icon) — only for root-level folders
  const dragHandle = document.createElement('span');
  dragHandle.className = 'folder-drag-handle';
  if (depth === 0) {
    dragHandle.setAttribute('draggable', 'true');
    dragHandle.title = 'Arrastar para mover pasta';
    dragHandle.addEventListener('dragstart', e => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = 'move';
      currentDragData = { kind: 'folder', name, depth, parentPath, parentHandle: ownParentHandle };
      e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'folder', name, depth, parentPath }));
    });
  } else {
    dragHandle.style.cursor = 'default';
  }

  const dot = document.createElement('span');
  dot.className        = 'folder-color-dot';
  dot.style.background = color;

  const icon = document.createElement('span');
  icon.className   = 'folder-icon';
  icon.textContent = '📁';

  dragHandle.append(dot, icon);

  const nameEl = document.createElement('span');
  nameEl.className   = 'sidebar-item-name';
  nameEl.textContent = name;

  // Context menu button
  const menuBtn = document.createElement('button');
  menuBtn.className   = 'sidebar-item-menu';
  menuBtn.textContent = '⁝';
  menuBtn.title       = 'Ações';
  menuBtn.setAttribute('aria-label', 'Ações da pasta');
  menuBtn.addEventListener('click', e => {
    e.stopPropagation();
    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    contextItem = { kind: 'folder', name, handle, parentHandle: ownParentHandle || getRootHandle(), depth, parentPath, fullPath };
    document.getElementById('item-actions-title').textContent = `📁 ${name}`;
    document.getElementById('btn-action-subfolder').style.display = depth < 2 ? '' : 'none';
    showModal('item-actions');
  });

  folderRow.append(toggle, dragHandle, nameEl, menuBtn);

  const children = document.createElement('div');
  children.className = 'folder-children';

  const entries = await listDirectory(handle).catch(() => []);
  const fullPath = parentPath ? `${parentPath}/${name}` : name;

  // Store subfolder count for drag validation
  const subfolderCount = entries.filter(e => e.kind === 'directory').length;
  folderRow.dataset.subfolderCount = subfolderCount;

  for (const entry of entries) {
    if (entry.kind === 'file') {
      children.appendChild(createFileElement(entry.name, fullPath, activeMeeting, depth + 1));
    } else if (entry.kind === 'directory' && depth < 2) {
      const subColor = cfg.folderColors?.[`${fullPath}/${entry.name}`] || cfg.folderColors?.[entry.name] || '#6b7280';
      children.appendChild(await createFolderElement(
        entry.name, subColor, entry.handle, cfg, activeMeeting, depth + 1, fullPath, handle
      ));
    }
  }

  folderRow.addEventListener('click', e => {
    if (menuBtn.contains(e.target) || dragHandle.contains(e.target)) return;
    folderRow.classList.toggle('collapsed');
  });

  // Drop zone — accepts files and root-level folders
  folderRow.addEventListener('dragover', e => {
    e.stopPropagation();
    const isFolderDrag = currentDragData?.kind === 'folder';
    if (isFolderDrag) {
      const count = parseInt(folderRow.dataset.subfolderCount || '0');
      const isSelf = currentDragData.name === name;
      if (count >= 3 || isSelf) {
        folderRow.classList.add('drag-forbidden');
        folderRow.classList.remove('drag-over');
        return; // no preventDefault → drop forbidden
      }
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    folderRow.classList.add('drag-over');
    folderRow.classList.remove('drag-forbidden');
  });
  folderRow.addEventListener('dragleave', () => {
    folderRow.classList.remove('drag-over', 'drag-forbidden');
  });
  folderRow.addEventListener('drop', e => {
    e.stopPropagation();
    e.preventDefault();
    folderRow.classList.remove('drag-over', 'drag-forbidden');
    let data;
    try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; }
    if (data.kind === 'folder') {
      if (data.name !== name) handleFolderDrop(data.name, name);
    } else {
      handleFileDrop(data, fullPath);
    }
  });

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
  el.className         = 'sidebar-item sidebar-file';
  el.style.paddingLeft = `${28 + depth * 14}px`;
  el.dataset.filename  = filename;
  el.dataset.folder    = folder;
  el.title             = displayName;

  const nameEl = document.createElement('span');
  nameEl.className   = 'sidebar-item-name';
  nameEl.textContent = displayName;

  const menuBtn = document.createElement('button');
  menuBtn.className   = 'sidebar-item-menu';
  menuBtn.textContent = '⁝';
  menuBtn.title       = 'Ações';
  menuBtn.setAttribute('aria-label', 'Ações do arquivo');
  menuBtn.addEventListener('click', e => {
    e.stopPropagation();
    contextItem = { kind: 'file', filename, folder, relativePath: folder ? `${folder}/${filename}` : filename };
    document.getElementById('item-actions-title').textContent = `📄 ${displayName}`;
    document.getElementById('btn-action-subfolder').style.display = 'none';
    showModal('item-actions');
  });

  el.appendChild(nameEl);
  el.appendChild(menuBtn);

  const relativePath = folder ? `${folder}/${filename}` : filename;
  if (activeMeeting?.filename === relativePath) el.classList.add('active');

  el.setAttribute('draggable', 'true');
  el.addEventListener('dragstart', e => {
    e.stopPropagation();
    currentDragData = { kind: 'file', filename, folder };
    e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'file', filename, folder }));
  });
  el.addEventListener('click', e => {
    if (menuBtn.contains(e.target)) return;
    openMeetingFile(filename, folder);
  });
  return el;
}

// ── Sidebar context menu actions ───────────────────────────

async function executeRenameItem() {
  const newName = document.getElementById('input-rename-value').value.trim();
  if (!newName || !contextItem) { hideModal(); return; }

  if (contextItem.kind === 'file') {
    const ext         = contextItem.filename.endsWith('.txt') ? '.txt' : '.md';
    const sanitized   = newName.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
    const newFilename = `${sanitized}${ext}`;
    const folder      = contextItem.folder || '';
    const newRelative = folder ? `${folder}/${newFilename}` : newFilename;
    try {
      const resolved = await resolveUniqueFilename(newRelative);
      await renameFile(contextItem.relativePath, resolved);
      for (const [id, m] of meetings.entries()) {
        if (m.filename === contextItem.relativePath) {
          m.filename = resolved;
          updateTabName(id, newName);
          updateMeetingData(id, { name: newName });
          if (id === getActiveTabId()) loadMeetingIntoHeader(id);
        }
      }
      persistTabState();
    } catch (err) { console.error('File rename failed:', err); }
  } else if (contextItem.kind === 'folder') {
    try {
      await renameFolder(contextItem.name, newName, contextItem.parentHandle);
      for (const [id, m] of meetings.entries()) {
        if (m.folder === contextItem.fullPath || m.folder.startsWith(contextItem.fullPath + '/')) {
          m.folder   = m.folder.replace(contextItem.fullPath, newName);
          m.filename = m.filename.replace(contextItem.fullPath + '/', newName + '/');
          if (id === getActiveTabId()) loadMeetingIntoHeader(id);
        }
      }
      persistTabState();
    } catch (err) { console.error('Folder rename failed:', err); }
  }

  contextItem = null;
  hideModal();
  await refreshDirectoryTree();
}

async function executeDeleteItem() {
  if (!contextItem) { hideModal(); return; }

  if (contextItem.kind === 'file') {
    try {
      await deleteFile(contextItem.relativePath);
      for (const [tabId, m] of meetings.entries()) {
        if (m.filename === contextItem.relativePath) {
          meetings.delete(tabId);
          lastSavedContent.delete(tabId);
          closeTab(tabId);
          break;
        }
      }
    } catch (err) { console.error('Delete file failed:', err); }
  } else if (contextItem.kind === 'folder') {
    try {
      // Use the correct parentHandle (supports any depth)
      await deleteDirectory(contextItem.name, contextItem.parentHandle);
      for (const [tabId, m] of [...meetings.entries()]) {
        if (m.folder === contextItem.fullPath ||
            m.folder.startsWith(contextItem.fullPath + '/') ||
            m.filename.startsWith(contextItem.fullPath + '/')) {
          meetings.delete(tabId);
          lastSavedContent.delete(tabId);
          closeTab(tabId);
        }
      }
    } catch (err) { console.error('Delete folder failed:', err); }
  }

  contextItem = null;
  hideModal();
  await refreshDirectoryTree();
  persistTabState();
}

// ── Drag: folder into folder ───────────────────────────────

async function handleFolderDrop(srcName, destName) {
  if (srcName === destName) return;
  try {
    await moveFolderIntoFolder(srcName, destName);
    const newBase = `${destName}/${srcName}`;
    for (const [id, m] of meetings.entries()) {
      if (m.folder === srcName || m.folder.startsWith(srcName + '/')) {
        const newFolder   = m.folder === srcName ? newBase : m.folder.replace(srcName, newBase);
        const newFilename = m.filename.replace(m.folder + '/', newFolder + '/');
        m.folder   = newFolder;
        m.filename = newFilename;
        if (id === getActiveTabId()) loadMeetingIntoHeader(id);
      }
    }
    persistTabState();
    await refreshDirectoryTree();
  } catch (err) {
    if (err.message === 'MAX_SUBFOLDERS') {
      alert('Esta pasta já contém 3 subpastas. Não é possível mover para dentro dela.');
    } else { console.error('Move folder failed:', err); }
  }
}

// ── Drag: file or folder to root ───────────────────────────

async function handleDropToRoot(data) {
  if (!data) return;

  if (data.kind === 'file') {
    if (!data.folder) return; // already at root
    const srcPath  = `${data.folder}/${data.filename}`;
    const destPath = data.filename;
    try {
      await renameFile(srcPath, destPath);
      for (const [, m] of meetings.entries()) {
        if (m.filename === srcPath) { m.filename = destPath; m.folder = ''; }
      }
      persistTabState();
      await refreshDirectoryTree();
    } catch (err) { console.error('Move file to root failed:', err); }

  } else if (data.kind === 'folder' && data.depth > 0) {
    try {
      await moveFolderBetweenDirs(data.name, currentDragData?.parentHandle || getRootHandle(), getRootHandle());
      for (const [id, m] of meetings.entries()) {
        if (m.folder === data.name || m.folder.startsWith(data.name + '/') ||
            m.folder === `${data.parentPath}/${data.name}` ||
            m.folder.startsWith(`${data.parentPath}/${data.name}/`)) {
          const oldBase = data.parentPath ? `${data.parentPath}/${data.name}` : data.name;
          const newBase = data.name;
          m.folder   = m.folder.replace(oldBase, newBase);
          m.filename = m.filename.replace(oldBase + '/', newBase + '/');
          if (id === getActiveTabId()) loadMeetingIntoHeader(id);
        }
      }
      persistTabState();
      await refreshDirectoryTree();
    } catch (err) { console.error('Move folder to root failed:', err); }
  }
}

// ── Drag: file to folder ───────────────────────────────────

async function handleFileDrop(data, targetFolder) {
  const { filename, folder: src } = data;
  const srcPath  = src ? `${src}/${filename}` : filename;
  const destPath = `${targetFolder}/${filename}`;
  if (srcPath === destPath) return;
  try {
    await renameFile(srcPath, destPath);
    for (const [, m] of meetings.entries()) {
      if (m.filename === srcPath) { m.filename = destPath; m.folder = targetFolder; }
    }
    persistTabState();
    await refreshDirectoryTree();
  } catch (err) { console.error('Move file failed:', err); }
}

// ── Open file from sidebar ─────────────────────────────────

async function openMeetingFile(filename, folder) {
  const relativePath = folder ? `${folder}/${filename}` : filename;

  for (const [tabId, meeting] of meetings.entries()) {
    if (meeting.filename === relativePath) {
      setActiveTab(tabId);
      await handleTabSwitch(tabId);
      return;
    }
  }

  if (getTabCount() >= 8) {
    alert('Limite de 8 abas atingido. Feche uma aba para abrir este arquivo.');
    return;
  }

  try {
    const content   = await readFile(relativePath);
    const id        = `meeting-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nameLine  = content.split('\n').find(l => l.startsWith('# '));
    const name      = nameLine ? nameLine.slice(2).trim() : filename.replace(/\.(md|txt)$/, '').replace(/_/g, ' ');
    const objLine   = content.split('\n').find(l => l.startsWith('**Objetivo:**'));
    const objective = objLine ? objLine.replace('**Objetivo:**', '').trim() : '';
    const meeting   = { id, name, objective, filename: relativePath, createdAt: new Date(), folder, isDefaultName: false };
    meetings.set(id, meeting);
    lastSavedContent.set(id, content);
    addTab({ id, name });
    await handleTabSwitch(id);
  } catch (err) { console.error('Failed to open file:', err); }
}

// ── Keyboard shortcuts ─────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { hideModal(); document.activeElement?.blur(); }
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
