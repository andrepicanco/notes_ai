const IDB_NAME = 'notesai';
const IDB_VERSION = 1;
const IDB_STORE = 'drafts';
const CONFIG_FILENAME = 'notesai-config.json';
const ROOT_HANDLE_KEY = 'notesai-root-handle';

let rootHandle = null;
let idb = null;

// ── IndexedDB ──────────────────────────────────────────────

export async function initStorage() {
  idb = await openIDB();
}

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror  = e => reject(e.target.error);
  });
}

export async function idbSave(id, data) {
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put({ id, ...data, savedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror    = e => reject(e.target.error);
  });
}

export async function idbLoad(id) {
  return new Promise((resolve, reject) => {
    const tx  = idb.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(id);
    req.onsuccess = e => resolve(e.target.result || null);
    req.onerror   = e => reject(e.target.error);
  });
}

export async function idbDelete(id) {
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror    = e => reject(e.target.error);
  });
}

export async function idbLoadAll() {
  return new Promise((resolve, reject) => {
    const tx  = idb.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = e => resolve(e.target.result || []);
    req.onerror   = e => reject(e.target.error);
  });
}

// ── Root folder ────────────────────────────────────────────

export async function requestRootFolder() {
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    await persistRootHandle(handle);
    rootHandle = handle;
    localStorage.setItem('notesai-root-folder-name', handle.name);
    localStorage.setItem('notesai-setup-done', '1');
    return handle;
  } catch (err) {
    if (err.name === 'AbortError') return null;
    throw err;
  }
}

export async function restoreRootFolder() {
  try {
    const stored = await getStoredHandle();
    if (!stored) return null;
    const perm = await stored.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') { rootHandle = stored; return stored; }
    const req = await stored.requestPermission({ mode: 'readwrite' });
    if (req === 'granted') { rootHandle = stored; return stored; }
    return null;
  } catch {
    return null;
  }
}

export function getRootHandle()  { return rootHandle; }
export function hasRootFolder()  { return rootHandle !== null; }
export function getRootFolderName() {
  return rootHandle?.name || localStorage.getItem('notesai-root-folder-name') || '';
}

async function persistRootHandle(handle) {
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put({ id: ROOT_HANDLE_KEY, handle });
    tx.oncomplete = () => resolve();
    tx.onerror    = e => reject(e.target.error);
  });
}

async function getStoredHandle() {
  return new Promise((resolve, reject) => {
    const tx  = idb.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(ROOT_HANDLE_KEY);
    req.onsuccess = e => resolve(e.target.result?.handle || null);
    req.onerror   = e => reject(e.target.error);
  });
}

// ── File operations ────────────────────────────────────────

export async function writeFile(relativePath, content, dirHandle = null) {
  const dir = dirHandle || rootHandle;
  if (!dir) throw new Error('No root folder');
  const parts = relativePath.replace(/\\/g, '/').split('/');
  const filename = parts.pop();
  let current = dir;
  for (const part of parts) {
    if (!part) continue;
    current = await current.getDirectoryHandle(part, { create: true });
  }
  const fh = await current.getFileHandle(filename, { create: true });
  const writable = await fh.createWritable();
  await writable.write(content);
  await writable.close();
  return fh;
}

export async function readFile(relativePath, dirHandle = null) {
  const dir = dirHandle || rootHandle;
  if (!dir) throw new Error('No root folder');
  const parts = relativePath.replace(/\\/g, '/').split('/');
  const filename = parts.pop();
  let current = dir;
  for (const part of parts) {
    if (!part) continue;
    current = await current.getDirectoryHandle(part, { create: false });
  }
  const fh   = await current.getFileHandle(filename);
  const file = await fh.getFile();
  return file.text();
}

export async function deleteFile(relativePath, dirHandle = null) {
  const dir = dirHandle || rootHandle;
  if (!dir) throw new Error('No root folder');
  const parts = relativePath.replace(/\\/g, '/').split('/');
  const filename = parts.pop();
  let current = dir;
  for (const part of parts) {
    if (!part) continue;
    current = await current.getDirectoryHandle(part, { create: false });
  }
  await current.removeEntry(filename);
}

export async function renameFile(oldPath, newPath, dirHandle = null) {
  const content = await readFile(oldPath, dirHandle);
  await writeFile(newPath, content, dirHandle);
  await deleteFile(oldPath, dirHandle);
}

export async function fileExists(relativePath, dirHandle = null) {
  try { await readFile(relativePath, dirHandle); return true; } catch { return false; }
}

export async function createDirectory(name, dirHandle = null) {
  const dir = dirHandle || rootHandle;
  if (!dir) throw new Error('No root folder');
  return dir.getDirectoryHandle(name, { create: true });
}

export async function resolveUniqueFilename(path, dirHandle = null) {
  if (!(await fileExists(path, dirHandle))) return path;
  const dotIdx = path.lastIndexOf('.');
  const base = dotIdx !== -1 ? path.slice(0, dotIdx) : path;
  const ext  = dotIdx !== -1 ? path.slice(dotIdx)    : '';
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}_${i}${ext}`;
    if (!(await fileExists(candidate, dirHandle))) return candidate;
  }
  return `${base}_${Date.now()}${ext}`;
}

export async function moveFile(sourcePath, destPath) {
  await renameFile(sourcePath, destPath);
}

// ── Directory listing (.md and .txt) ──────────────────────

export async function listDirectory(dirHandle = null) {
  const dir = dirHandle || rootHandle;
  if (!dir) return [];
  const entries = [];
  for await (const [name, handle] of dir.entries()) {
    if (name.startsWith('.')) continue;
    if (name === 'notesai-config.json') continue;
    if (handle.kind === 'directory') {
      entries.push({ name, kind: 'directory', handle });
    } else if (handle.kind === 'file' && (name.endsWith('.md') || name.endsWith('.txt'))) {
      entries.push({ name, kind: 'file', handle });
    }
  }
  entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
  return entries;
}

// ── Config ─────────────────────────────────────────────────

export async function loadConfig() {
  try { return JSON.parse(await readFile(CONFIG_FILENAME)); }
  catch { return { folderColors: {} }; }
}

export async function saveConfig(config) {
  await writeFile(CONFIG_FILENAME, JSON.stringify(config, null, 2));
}

export async function setFolderColor(folderName, color) {
  const cfg = await loadConfig();
  cfg.folderColors = cfg.folderColors || {};
  cfg.folderColors[folderName] = color;
  await saveConfig(cfg);
}

export async function getFolderColor(folderName) {
  const cfg = await loadConfig();
  return cfg.folderColors?.[folderName] || '#6b7280';
}

// ── Filename helpers ───────────────────────────────────────

export function sanitizeFilename(name) {
  return name
    .replace(/[\\/:*?"<>|]/g, '')   // remove invalid Windows chars (no replacement)
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 200)
    || 'reuniao';
}

// Default filename: YYYY-MM-DD_Reunião_HHmm.md
export function buildDefaultFilename(date) {
  const d = date instanceof Date ? date : new Date(date);
  const ymd  = d.toISOString().slice(0, 10);
  const hh   = d.getHours().toString().padStart(2, '0');
  const mm   = d.getMinutes().toString().padStart(2, '0');
  return `${ymd}_Reunião_${hh}${mm}.md`;
}

// Filename for renamed meetings
export function buildFilename(date, meetingName) {
  const d = date instanceof Date ? date : new Date(date);
  const ymd = d.toISOString().slice(0, 10);
  return `${ymd}_${sanitizeFilename(meetingName)}.md`;
}
