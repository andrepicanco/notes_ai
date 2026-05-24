var NotesAI = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to2, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to2, key) && key !== except)
          __defProp(to2, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to2;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // dev/js/app.js
  var app_exports = {};
  __export(app_exports, {
    getTabTranscription: () => getTabTranscription
  });

  // dev/js/tabs.js
  var MAX_TABS = 8;
  var TOOLTIP_KEY = "notesai-tabs-tooltip-shown";
  var tabs = [];
  var activeTabId = null;
  var onTabSwitch = null;
  var onTabClose = null;
  var onNewTab = null;
  var recordingTabId = null;
  var recordingTabState = "idle";
  function initTabs({ onSwitch, onClose, onNew }) {
    onTabSwitch = onSwitch;
    onTabClose = onClose;
    onNewTab = onNew;
    document.addEventListener("keydown", handleTabKeyNav);
    document.getElementById("btn-new-tab").addEventListener("click", () => {
      if (onNewTab) onNewTab();
    });
    document.getElementById("btn-new-meeting-empty").addEventListener("click", () => {
      if (onNewTab) onNewTab();
    });
  }
  function addTab(meetingData) {
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
  function updateTabName(tabId, name) {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;
    tab.name = name;
    if (tab.meetingData) tab.meetingData.name = name;
    renderTabs();
  }
  function closeTab(tabId) {
    const idx = tabs.findIndex((t) => t.id === tabId);
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
  function setActiveTab(tabId) {
    activeTabId = tabId;
    renderTabs();
    updateEmptyState();
  }
  function getActiveTabId() {
    return activeTabId;
  }
  function getTabCount() {
    return tabs.length;
  }
  function getAllTabs() {
    return tabs.map((t) => ({ ...t }));
  }
  function setTabRecording(tabId, state) {
    recordingTabId = tabId || null;
    recordingTabState = state || "idle";
    renderTabs();
  }
  function updateMeetingData(tabId, partial) {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;
    Object.assign(tab.meetingData, partial);
    if (partial.name !== void 0) {
      tab.name = partial.name;
      renderTabs();
    }
  }
  function renderTabs() {
    const list = document.getElementById("tabs-list");
    list.innerHTML = "";
    tabs.forEach((tab) => {
      const el2 = document.createElement("div");
      el2.className = "tab" + (tab.id === activeTabId ? " active" : "");
      el2.setAttribute("role", "tab");
      el2.setAttribute("aria-selected", tab.id === activeTabId ? "true" : "false");
      el2.dataset.tabId = tab.id;
      const nameEl = document.createElement("span");
      nameEl.className = "tab-name";
      nameEl.textContent = tab.name || "Nova reuni\xE3o";
      nameEl.title = tab.name || "Nova reuni\xE3o";
      const closeBtn = document.createElement("button");
      closeBtn.className = "tab-close";
      closeBtn.innerHTML = "\xD7";
      closeBtn.title = "Fechar";
      closeBtn.setAttribute("aria-label", `Fechar ${tab.name}`);
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        requestCloseTab(tab.id);
      });
      if (tab.id === recordingTabId && recordingTabState !== "idle") {
        const recDot = document.createElement("span");
        recDot.className = "rec-dot" + (recordingTabState === "paused" ? " paused" : "");
        el2.appendChild(recDot);
      }
      el2.appendChild(nameEl);
      el2.appendChild(closeBtn);
      el2.addEventListener("click", () => {
        if (tab.id !== activeTabId) {
          setActiveTab(tab.id);
          if (onTabSwitch) onTabSwitch(tab.id);
        }
      });
      list.appendChild(el2);
    });
  }
  function updateEmptyState() {
    const hasActive = activeTabId !== null && tabs.some((t) => t.id === activeTabId);
    document.getElementById("empty-state").classList.toggle("hidden", hasActive);
    document.getElementById("meeting-header").classList.toggle("hidden", !hasActive);
    document.getElementById("editor-wrap").classList.toggle("hidden", !hasActive);
    document.getElementById("bottom-bar").classList.toggle("hidden", !hasActive);
  }
  function handleTabKeyNav(e) {
    if (!e.altKey) return;
    if (e.key === "q" || e.key === "Q") {
      if (activeTabId) {
        e.preventDefault();
        requestCloseTab(activeTabId);
      }
      return;
    }
    if (e.key !== "PageDown" && e.key !== "PageUp") return;
    if (tabs.length < 2) return;
    e.preventDefault();
    const idx = tabs.findIndex((t) => t.id === activeTabId);
    if (idx === -1) return;
    const next = e.key === "PageDown" ? tabs[(idx + 1) % tabs.length] : tabs[(idx - 1 + tabs.length) % tabs.length];
    setActiveTab(next.id);
    if (onTabSwitch) onTabSwitch(next.id);
  }
  function requestCloseTab(tabId) {
    if (onTabClose) {
      const result = onTabClose(tabId);
      if (result === false) return;
      if (result && typeof result.then === "function") {
        result.then((ok) => {
          if (ok !== false) closeTab(tabId);
        });
        return;
      }
    }
    closeTab(tabId);
  }
  function showMaxTabsWarning() {
    const overlay = document.getElementById("modal-overlay");
    const modal = document.getElementById("modal-confirm");
    document.getElementById("modal-confirm-title").textContent = "Limite de abas atingido";
    document.getElementById("modal-confirm-desc").textContent = `O NotesAI suporta at\xE9 ${MAX_TABS} reuni\xF5es abertas. Feche uma aba para continuar.`;
    const okBtn = document.getElementById("btn-confirm-ok");
    const cancelBtn = document.getElementById("btn-confirm-cancel");
    okBtn.textContent = "OK";
    okBtn.className = "btn btn-primary";
    cancelBtn.classList.add("hidden");
    const cleanup = () => {
      overlay.classList.add("hidden");
      modal.classList.add("hidden");
      cancelBtn.classList.remove("hidden");
      okBtn.className = "btn btn-danger";
      okBtn.textContent = "Confirmar";
      okBtn.removeEventListener("click", cleanup);
    };
    okBtn.addEventListener("click", cleanup);
    modal.classList.remove("hidden");
    overlay.classList.remove("hidden");
  }
  function maybeShowTooltip() {
    if (localStorage.getItem(TOOLTIP_KEY)) return;
    const tip = document.getElementById("tabs-tooltip");
    tip.classList.remove("hidden");
    localStorage.setItem(TOOLTIP_KEY, "1");
    setTimeout(() => tip.classList.add("hidden"), 5e3);
  }

  // dev/js/storage.js
  var IDB_NAME = "notesai";
  var IDB_VERSION = 1;
  var IDB_STORE = "drafts";
  var CONFIG_FILENAME = "notesai-config.json";
  var ROOT_HANDLE_KEY = "notesai-root-handle";
  var MAX_SUBFOLDERS = 5;
  var MAX_FOLDER_DEPTH = 5;
  var rootHandle = null;
  var idb = null;
  async function initStorage() {
    idb = await openIDB();
  }
  function openIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = (e) => {
        const db2 = e.target.result;
        if (!db2.objectStoreNames.contains(IDB_STORE)) {
          db2.createObjectStore(IDB_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }
  async function idbSave(id2, data) {
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put({ id: id2, ...data, savedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }
  async function idbLoad(id2) {
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(id2);
      req.onsuccess = (e) => resolve(e.target.result || null);
      req.onerror = (e) => reject(e.target.error);
    });
  }
  async function requestRootFolder() {
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      await persistRootHandle(handle);
      rootHandle = handle;
      localStorage.setItem("notesai-root-folder-name", handle.name);
      localStorage.setItem("notesai-setup-done", "1");
      return handle;
    } catch (err) {
      if (err.name === "AbortError") return null;
      throw err;
    }
  }
  async function restoreRootFolder() {
    try {
      const stored = await getStoredHandle();
      if (!stored) return null;
      const perm = await stored.queryPermission({ mode: "readwrite" });
      if (perm === "granted") {
        rootHandle = stored;
        return stored;
      }
      const req = await stored.requestPermission({ mode: "readwrite" });
      if (req === "granted") {
        rootHandle = stored;
        return stored;
      }
      return null;
    } catch {
      return null;
    }
  }
  function getRootHandle() {
    return rootHandle;
  }
  function hasRootFolder() {
    return rootHandle !== null;
  }
  function getRootFolderName() {
    return rootHandle?.name || localStorage.getItem("notesai-root-folder-name") || "";
  }
  async function persistRootHandle(handle) {
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put({ id: ROOT_HANDLE_KEY, handle });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }
  async function getStoredHandle() {
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(ROOT_HANDLE_KEY);
      req.onsuccess = (e) => resolve(e.target.result?.handle || null);
      req.onerror = (e) => reject(e.target.error);
    });
  }
  async function writeFile(relativePath, content, dirHandle = null) {
    const dir = dirHandle || rootHandle;
    if (!dir) throw new Error("No root folder");
    const parts = relativePath.replace(/\\/g, "/").split("/");
    const filename = parts.pop();
    let current = dir;
    for (const part of parts) {
      if (!part) continue;
      current = await current.getDirectoryHandle(part, { create: true });
    }
    const fh2 = await current.getFileHandle(filename, { create: true });
    const writable = await fh2.createWritable();
    await writable.write(content);
    await writable.close();
    return fh2;
  }
  async function readFile(relativePath, dirHandle = null) {
    const dir = dirHandle || rootHandle;
    if (!dir) throw new Error("No root folder");
    const parts = relativePath.replace(/\\/g, "/").split("/");
    const filename = parts.pop();
    let current = dir;
    for (const part of parts) {
      if (!part) continue;
      current = await current.getDirectoryHandle(part, { create: false });
    }
    const fh2 = await current.getFileHandle(filename);
    const file = await fh2.getFile();
    return file.text();
  }
  async function deleteFile(relativePath, dirHandle = null) {
    const dir = dirHandle || rootHandle;
    if (!dir) throw new Error("No root folder");
    const parts = relativePath.replace(/\\/g, "/").split("/");
    const filename = parts.pop();
    let current = dir;
    for (const part of parts) {
      if (!part) continue;
      current = await current.getDirectoryHandle(part, { create: false });
    }
    await current.removeEntry(filename);
  }
  async function renameFile(oldPath, newPath, dirHandle = null) {
    const content = await readFile(oldPath, dirHandle);
    await writeFile(newPath, content, dirHandle);
    await deleteFile(oldPath, dirHandle);
  }
  async function fileExists(relativePath, dirHandle = null) {
    try {
      await readFile(relativePath, dirHandle);
      return true;
    } catch {
      return false;
    }
  }
  async function createDirectory(name, dirHandle = null) {
    const dir = dirHandle || rootHandle;
    if (!dir) throw new Error("No root folder");
    return dir.getDirectoryHandle(name, { create: true });
  }
  async function resolveUniqueFilename(path, dirHandle = null) {
    if (!await fileExists(path, dirHandle)) return path;
    const dotIdx = path.lastIndexOf(".");
    const base = dotIdx !== -1 ? path.slice(0, dotIdx) : path;
    const ext = dotIdx !== -1 ? path.slice(dotIdx) : "";
    for (let i = 2; i < 100; i++) {
      const candidate = `${base}_${i}${ext}`;
      if (!await fileExists(candidate, dirHandle)) return candidate;
    }
    return `${base}_${Date.now()}${ext}`;
  }
  async function listDirectory(dirHandle = null) {
    const dir = dirHandle || rootHandle;
    if (!dir) return [];
    const entries = [];
    for await (const [name, handle] of dir.entries()) {
      if (name.startsWith(".")) continue;
      if (name === "notesai-config.json") continue;
      if (handle.kind === "directory") {
        entries.push({ name, kind: "directory", handle });
      } else if (handle.kind === "file" && (name.endsWith(".md") || name.endsWith(".txt"))) {
        entries.push({ name, kind: "file", handle });
      }
    }
    entries.sort((a, b2) => {
      if (a.kind !== b2.kind) return a.kind === "directory" ? -1 : 1;
      return a.name.localeCompare(b2.name, "pt-BR");
    });
    return entries;
  }
  async function loadConfig() {
    try {
      return JSON.parse(await readFile(CONFIG_FILENAME));
    } catch {
      return { folderColors: {} };
    }
  }
  async function saveConfig(config) {
    await writeFile(CONFIG_FILENAME, JSON.stringify(config, null, 2));
  }
  async function setFolderColor(folderName, color) {
    const cfg = await loadConfig();
    cfg.folderColors = cfg.folderColors || {};
    cfg.folderColors[folderName] = color;
    await saveConfig(cfg);
  }
  function sanitizeFilename(name) {
    return name.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_").replace(/_{2,}/g, "_").replace(/^[-_]+|[-_]+$/g, "").slice(0, 200) || "reuniao";
  }
  async function copyDirContents(srcDir, destDir) {
    for await (const [name, handle] of srcDir.entries()) {
      if (handle.kind === "file") {
        const file = await handle.getFile();
        const text = await file.text();
        const dest = await destDir.getFileHandle(name, { create: true });
        const w = await dest.createWritable();
        await w.write(text);
        await w.close();
      } else if (handle.kind === "directory") {
        const sub = await destDir.getDirectoryHandle(name, { create: true });
        await copyDirContents(handle, sub);
      }
    }
  }
  async function deleteDirectory(name, parentHandle = null) {
    const parent = parentHandle || rootHandle;
    if (!parent) throw new Error("No root folder");
    await parent.removeEntry(name, { recursive: true });
  }
  async function renameFolder(oldName, newName, parentHandle = null) {
    const parent = parentHandle || rootHandle;
    if (!parent) throw new Error("No root folder");
    if (oldName === newName) return;
    const oldDir = await parent.getDirectoryHandle(oldName);
    const newDir = await parent.getDirectoryHandle(newName, { create: true });
    await copyDirContents(oldDir, newDir);
    await parent.removeEntry(oldName, { recursive: true });
    try {
      const cfg = await loadConfig();
      if (cfg.folderColors?.[oldName]) {
        cfg.folderColors[newName] = cfg.folderColors[oldName];
        delete cfg.folderColors[oldName];
        await saveConfig(cfg);
      }
    } catch {
    }
  }
  async function moveFolderBetweenDirs(folderName, srcParentHandle, destParentHandle, srcParentPath = null, destParentPath = null) {
    if (!srcParentHandle || !destParentHandle) throw new Error("No handles provided");
    let subCount = 0;
    for await (const [, h] of destParentHandle.entries()) {
      if (h.kind === "directory") subCount++;
    }
    if (subCount >= MAX_SUBFOLDERS) throw new Error("MAX_SUBFOLDERS");
    const srcDir = await srcParentHandle.getDirectoryHandle(folderName);
    const destDir = await destParentHandle.getDirectoryHandle(folderName, { create: true });
    await copyDirContents(srcDir, destDir);
    await srcParentHandle.removeEntry(folderName, { recursive: true });
    if (srcParentPath !== null && destParentPath !== null) {
      try {
        const cfg = await loadConfig();
        const oldKey = srcParentPath ? `${srcParentPath}/${folderName}` : folderName;
        const newKey = destParentPath ? `${destParentPath}/${folderName}` : folderName;
        if (oldKey !== newKey && cfg.folderColors?.[oldKey]) {
          cfg.folderColors[newKey] = cfg.folderColors[oldKey];
          delete cfg.folderColors[oldKey];
          await saveConfig(cfg);
        }
      } catch {
      }
    }
  }
  function buildDefaultFilename(date) {
    const d = date instanceof Date ? date : new Date(date);
    const ymd = d.toISOString().slice(0, 10);
    const hh2 = d.getHours().toString().padStart(2, "0");
    const mm2 = d.getMinutes().toString().padStart(2, "0");
    return `${ymd}_Reuni\xE3o_${hh2}${mm2}.md`;
  }
  function buildFilename(date, meetingName) {
    const d = date instanceof Date ? date : new Date(date);
    const ymd = d.toISOString().slice(0, 10);
    return `${ymd}_${sanitizeFilename(meetingName)}.md`;
  }

  // dev/libs/tiptap.min.js
  function re(n43) {
    this.content = n43;
  }
  re.prototype = { constructor: re, find: function(n43) {
    for (var e = 0; e < this.content.length; e += 2) if (this.content[e] === n43) return e;
    return -1;
  }, get: function(n43) {
    var e = this.find(n43);
    return e == -1 ? void 0 : this.content[e + 1];
  }, update: function(n43, e, t) {
    var r = t && t != n43 ? this.remove(t) : this, i = r.find(n43), s = r.content.slice();
    return i == -1 ? s.push(t || n43, e) : (s[i + 1] = e, t && (s[i] = t)), new re(s);
  }, remove: function(n43) {
    var e = this.find(n43);
    if (e == -1) return this;
    var t = this.content.slice();
    return t.splice(e, 2), new re(t);
  }, addToStart: function(n43, e) {
    return new re([n43, e].concat(this.remove(n43).content));
  }, addToEnd: function(n43, e) {
    var t = this.remove(n43).content.slice();
    return t.push(n43, e), new re(t);
  }, addBefore: function(n43, e, t) {
    var r = this.remove(e), i = r.content.slice(), s = r.find(n43);
    return i.splice(s == -1 ? i.length : s, 0, e, t), new re(i);
  }, forEach: function(n43) {
    for (var e = 0; e < this.content.length; e += 2) n43(this.content[e], this.content[e + 1]);
  }, prepend: function(n43) {
    return n43 = re.from(n43), n43.size ? new re(n43.content.concat(this.subtract(n43).content)) : this;
  }, append: function(n43) {
    return n43 = re.from(n43), n43.size ? new re(this.subtract(n43).content.concat(n43.content)) : this;
  }, subtract: function(n43) {
    var e = this;
    n43 = re.from(n43);
    for (var t = 0; t < n43.content.length; t += 2) e = e.remove(n43.content[t]);
    return e;
  }, toObject: function() {
    var n43 = {};
    return this.forEach(function(e, t) {
      n43[e] = t;
    }), n43;
  }, get size() {
    return this.content.length >> 1;
  } };
  re.from = function(n43) {
    if (n43 instanceof re) return n43;
    var e = [];
    if (n43) for (var t in n43) e.push(t, n43[t]);
    return new re(e);
  };
  var di = re;
  function Fo(n43, e, t) {
    for (let r = 0; ; r++) {
      if (r == n43.childCount || r == e.childCount) return n43.childCount == e.childCount ? null : t;
      let i = n43.child(r), s = e.child(r);
      if (i == s) {
        t += i.nodeSize;
        continue;
      }
      if (!i.sameMarkup(s)) return t;
      if (i.isText && i.text != s.text) {
        for (let o = 0; i.text[o] == s.text[o]; o++) t++;
        return t;
      }
      if (i.content.size || s.content.size) {
        let o = Fo(i.content, s.content, t + 1);
        if (o != null) return o;
      }
      t += i.nodeSize;
    }
  }
  function Ho(n43, e, t, r) {
    for (let i = n43.childCount, s = e.childCount; ; ) {
      if (i == 0 || s == 0) return i == s ? null : { a: t, b: r };
      let o = n43.child(--i), l = e.child(--s), a = o.nodeSize;
      if (o == l) {
        t -= a, r -= a;
        continue;
      }
      if (!o.sameMarkup(l)) return { a: t, b: r };
      if (o.isText && o.text != l.text) {
        let c = 0, u = Math.min(o.text.length, l.text.length);
        for (; c < u && o.text[o.text.length - c - 1] == l.text[l.text.length - c - 1]; ) c++, t--, r--;
        return { a: t, b: r };
      }
      if (o.content.size || l.content.size) {
        let c = Ho(o.content, l.content, t - 1, r - 1);
        if (c) return c;
      }
      t -= a, r -= a;
    }
  }
  var k = class n {
    constructor(e, t) {
      if (this.content = e, this.size = t || 0, t == null) for (let r = 0; r < e.length; r++) this.size += e[r].nodeSize;
    }
    nodesBetween(e, t, r, i = 0, s) {
      for (let o = 0, l = 0; l < t; o++) {
        let a = this.content[o], c = l + a.nodeSize;
        if (c > e && r(a, i + l, s || null, o) !== false && a.content.size) {
          let u = l + 1;
          a.nodesBetween(Math.max(0, e - u), Math.min(a.content.size, t - u), r, i + u);
        }
        l = c;
      }
    }
    descendants(e) {
      this.nodesBetween(0, this.size, e);
    }
    textBetween(e, t, r, i) {
      let s = "", o = true;
      return this.nodesBetween(e, t, (l, a) => {
        let c = l.isText ? l.text.slice(Math.max(e, a) - a, t - a) : l.isLeaf ? i ? typeof i == "function" ? i(l) : i : l.type.spec.leafText ? l.type.spec.leafText(l) : "" : "";
        l.isBlock && (l.isLeaf && c || l.isTextblock) && r && (o ? o = false : s += r), s += c;
      }, 0), s;
    }
    append(e) {
      if (!e.size) return this;
      if (!this.size) return e;
      let t = this.lastChild, r = e.firstChild, i = this.content.slice(), s = 0;
      for (t.isText && t.sameMarkup(r) && (i[i.length - 1] = t.withText(t.text + r.text), s = 1); s < e.content.length; s++) i.push(e.content[s]);
      return new n(i, this.size + e.size);
    }
    cut(e, t = this.size) {
      if (e == 0 && t == this.size) return this;
      let r = [], i = 0;
      if (t > e) for (let s = 0, o = 0; o < t; s++) {
        let l = this.content[s], a = o + l.nodeSize;
        a > e && ((o < e || a > t) && (l.isText ? l = l.cut(Math.max(0, e - o), Math.min(l.text.length, t - o)) : l = l.cut(Math.max(0, e - o - 1), Math.min(l.content.size, t - o - 1))), r.push(l), i += l.nodeSize), o = a;
      }
      return new n(r, i);
    }
    cutByIndex(e, t) {
      return e == t ? n.empty : e == 0 && t == this.content.length ? this : new n(this.content.slice(e, t));
    }
    replaceChild(e, t) {
      let r = this.content[e];
      if (r == t) return this;
      let i = this.content.slice(), s = this.size + t.nodeSize - r.nodeSize;
      return i[e] = t, new n(i, s);
    }
    addToStart(e) {
      return new n([e].concat(this.content), this.size + e.nodeSize);
    }
    addToEnd(e) {
      return new n(this.content.concat(e), this.size + e.nodeSize);
    }
    eq(e) {
      if (this.content.length != e.content.length) return false;
      for (let t = 0; t < this.content.length; t++) if (!this.content[t].eq(e.content[t])) return false;
      return true;
    }
    get firstChild() {
      return this.content.length ? this.content[0] : null;
    }
    get lastChild() {
      return this.content.length ? this.content[this.content.length - 1] : null;
    }
    get childCount() {
      return this.content.length;
    }
    child(e) {
      let t = this.content[e];
      if (!t) throw new RangeError("Index " + e + " out of range for " + this);
      return t;
    }
    maybeChild(e) {
      return this.content[e] || null;
    }
    forEach(e) {
      for (let t = 0, r = 0; t < this.content.length; t++) {
        let i = this.content[t];
        e(i, r, t), r += i.nodeSize;
      }
    }
    findDiffStart(e, t = 0) {
      return Fo(this, e, t);
    }
    findDiffEnd(e, t = this.size, r = e.size) {
      return Ho(this, e, t, r);
    }
    findIndex(e) {
      if (e == 0) return Rn(0, e);
      if (e == this.size) return Rn(this.content.length, e);
      if (e > this.size || e < 0) throw new RangeError(`Position ${e} outside of fragment (${this})`);
      for (let t = 0, r = 0; ; t++) {
        let i = this.child(t), s = r + i.nodeSize;
        if (s >= e) return s == e ? Rn(t + 1, s) : Rn(t, r);
        r = s;
      }
    }
    toString() {
      return "<" + this.toStringInner() + ">";
    }
    toStringInner() {
      return this.content.join(", ");
    }
    toJSON() {
      return this.content.length ? this.content.map((e) => e.toJSON()) : null;
    }
    static fromJSON(e, t) {
      if (!t) return n.empty;
      if (!Array.isArray(t)) throw new RangeError("Invalid input for Fragment.fromJSON");
      return n.fromArray(t.map(e.nodeFromJSON));
    }
    static fromArray(e) {
      if (!e.length) return n.empty;
      let t, r = 0;
      for (let i = 0; i < e.length; i++) {
        let s = e[i];
        r += s.nodeSize, i && s.isText && e[i - 1].sameMarkup(s) ? (t || (t = e.slice(0, i)), t[t.length - 1] = s.withText(t[t.length - 1].text + s.text)) : t && t.push(s);
      }
      return new n(t || e, r);
    }
    static from(e) {
      if (!e) return n.empty;
      if (e instanceof n) return e;
      if (Array.isArray(e)) return this.fromArray(e);
      if (e.attrs) return new n([e], e.nodeSize);
      throw new RangeError("Can not convert " + e + " to a Fragment" + (e.nodesBetween ? " (looks like multiple versions of prosemirror-model were loaded)" : ""));
    }
  };
  k.empty = new k([], 0);
  var fi = { index: 0, offset: 0 };
  function Rn(n43, e) {
    return fi.index = n43, fi.offset = e, fi;
  }
  function Ln(n43, e) {
    if (n43 === e) return true;
    if (!(n43 && typeof n43 == "object") || !(e && typeof e == "object")) return false;
    let t = Array.isArray(n43);
    if (Array.isArray(e) != t) return false;
    if (t) {
      if (n43.length != e.length) return false;
      for (let r = 0; r < n43.length; r++) if (!Ln(n43[r], e[r])) return false;
    } else {
      for (let r in n43) if (!(r in e) || !Ln(n43[r], e[r])) return false;
      for (let r in e) if (!(r in n43)) return false;
    }
    return true;
  }
  var F = class n2 {
    constructor(e, t) {
      this.type = e, this.attrs = t;
    }
    addToSet(e) {
      let t, r = false;
      for (let i = 0; i < e.length; i++) {
        let s = e[i];
        if (this.eq(s)) return e;
        if (this.type.excludes(s.type)) t || (t = e.slice(0, i));
        else {
          if (s.type.excludes(this.type)) return e;
          !r && s.type.rank > this.type.rank && (t || (t = e.slice(0, i)), t.push(this), r = true), t && t.push(s);
        }
      }
      return t || (t = e.slice()), r || t.push(this), t;
    }
    removeFromSet(e) {
      for (let t = 0; t < e.length; t++) if (this.eq(e[t])) return e.slice(0, t).concat(e.slice(t + 1));
      return e;
    }
    isInSet(e) {
      for (let t = 0; t < e.length; t++) if (this.eq(e[t])) return true;
      return false;
    }
    eq(e) {
      return this == e || this.type == e.type && Ln(this.attrs, e.attrs);
    }
    toJSON() {
      let e = { type: this.type.name };
      for (let t in this.attrs) {
        e.attrs = this.attrs;
        break;
      }
      return e;
    }
    static fromJSON(e, t) {
      if (!t) throw new RangeError("Invalid input for Mark.fromJSON");
      let r = e.marks[t.type];
      if (!r) throw new RangeError(`There is no mark type ${t.type} in this schema`);
      let i = r.create(t.attrs);
      return r.checkAttrs(i.attrs), i;
    }
    static sameSet(e, t) {
      if (e == t) return true;
      if (e.length != t.length) return false;
      for (let r = 0; r < e.length; r++) if (!e[r].eq(t[r])) return false;
      return true;
    }
    static setFrom(e) {
      if (!e || Array.isArray(e) && e.length == 0) return n2.none;
      if (e instanceof n2) return [e];
      let t = e.slice();
      return t.sort((r, i) => r.type.rank - i.type.rank), t;
    }
  };
  F.none = [];
  var ot = class extends Error {
  };
  var x = class n3 {
    constructor(e, t, r) {
      this.content = e, this.openStart = t, this.openEnd = r;
    }
    get size() {
      return this.content.size - this.openStart - this.openEnd;
    }
    insertAt(e, t) {
      let r = _o(this.content, e + this.openStart, t, this.openStart + 1, this.openEnd + 1);
      return r && new n3(r, this.openStart, this.openEnd);
    }
    removeBetween(e, t) {
      return new n3($o(this.content, e + this.openStart, t + this.openStart), this.openStart, this.openEnd);
    }
    eq(e) {
      return this.content.eq(e.content) && this.openStart == e.openStart && this.openEnd == e.openEnd;
    }
    toString() {
      return this.content + "(" + this.openStart + "," + this.openEnd + ")";
    }
    toJSON() {
      if (!this.content.size) return null;
      let e = { content: this.content.toJSON() };
      return this.openStart > 0 && (e.openStart = this.openStart), this.openEnd > 0 && (e.openEnd = this.openEnd), e;
    }
    static fromJSON(e, t) {
      if (!t) return n3.empty;
      let r = t.openStart || 0, i = t.openEnd || 0;
      if (typeof r != "number" || typeof i != "number") throw new RangeError("Invalid input for Slice.fromJSON");
      return new n3(k.fromJSON(e, t.content), r, i);
    }
    static maxOpen(e, t = true) {
      let r = 0, i = 0;
      for (let s = e.firstChild; s && !s.isLeaf && (t || !s.type.spec.isolating); s = s.firstChild) r++;
      for (let s = e.lastChild; s && !s.isLeaf && (t || !s.type.spec.isolating); s = s.lastChild) i++;
      return new n3(e, r, i);
    }
  };
  x.empty = new x(k.empty, 0, 0);
  function $o(n43, e, t) {
    let { index: r, offset: i } = n43.findIndex(e), s = n43.maybeChild(r), { index: o, offset: l } = n43.findIndex(t);
    if (i == e || s.isText) {
      if (l != t && !n43.child(o).isText) throw new RangeError("Removing non-flat range");
      return n43.cut(0, e).append(n43.cut(t));
    }
    if (r != o) throw new RangeError("Removing non-flat range");
    return n43.replaceChild(r, s.copy($o(s.content, e - i - 1, t - i - 1)));
  }
  function _o(n43, e, t, r, i, s) {
    let { index: o, offset: l } = n43.findIndex(e), a = n43.maybeChild(o);
    if (l == e || a.isText) return s && r <= 0 && i <= 0 && !s.canReplace(o, o, t) ? null : n43.cut(0, e).append(t).append(n43.cut(e));
    let c = _o(a.content, e - l - 1, t, o == 0 ? r - 1 : 0, o == n43.childCount - 1 ? i - 1 : 0, a);
    return c && n43.replaceChild(o, a.copy(c));
  }
  function _u(n43, e, t) {
    if (t.openStart > n43.depth) throw new ot("Inserted content deeper than insertion position");
    if (n43.depth - t.openStart != e.depth - t.openEnd) throw new ot("Inconsistent open depths");
    return Vo(n43, e, t, 0);
  }
  function Vo(n43, e, t, r) {
    let i = n43.index(r), s = n43.node(r);
    if (i == e.index(r) && r < n43.depth - t.openStart) {
      let o = Vo(n43, e, t, r + 1);
      return s.copy(s.content.replaceChild(i, o));
    } else if (t.content.size) if (!t.openStart && !t.openEnd && n43.depth == r && e.depth == r) {
      let o = n43.parent, l = o.content;
      return st(o, l.cut(0, n43.parentOffset).append(t.content).append(l.cut(e.parentOffset)));
    } else {
      let { start: o, end: l } = Vu(t, n43);
      return st(s, Wo(n43, o, l, e, r));
    }
    else return st(s, zn(n43, e, r));
  }
  function jo(n43, e) {
    if (!e.type.compatibleContent(n43.type)) throw new ot("Cannot join " + e.type.name + " onto " + n43.type.name);
  }
  function hi(n43, e, t) {
    let r = n43.node(t);
    return jo(r, e.node(t)), r;
  }
  function it(n43, e) {
    let t = e.length - 1;
    t >= 0 && n43.isText && n43.sameMarkup(e[t]) ? e[t] = n43.withText(e[t].text + n43.text) : e.push(n43);
  }
  function Ut(n43, e, t, r) {
    let i = (e || n43).node(t), s = 0, o = e ? e.index(t) : i.childCount;
    n43 && (s = n43.index(t), n43.depth > t ? s++ : n43.textOffset && (it(n43.nodeAfter, r), s++));
    for (let l = s; l < o; l++) it(i.child(l), r);
    e && e.depth == t && e.textOffset && it(e.nodeBefore, r);
  }
  function st(n43, e) {
    return n43.type.checkContent(e), n43.copy(e);
  }
  function Wo(n43, e, t, r, i) {
    let s = n43.depth > i && hi(n43, e, i + 1), o = r.depth > i && hi(t, r, i + 1), l = [];
    return Ut(null, n43, i, l), s && o && e.index(i) == t.index(i) ? (jo(s, o), it(st(s, Wo(n43, e, t, r, i + 1)), l)) : (s && it(st(s, zn(n43, e, i + 1)), l), Ut(e, t, i, l), o && it(st(o, zn(t, r, i + 1)), l)), Ut(r, null, i, l), new k(l);
  }
  function zn(n43, e, t) {
    let r = [];
    if (Ut(null, n43, t, r), n43.depth > t) {
      let i = hi(n43, e, t + 1);
      it(st(i, zn(n43, e, t + 1)), r);
    }
    return Ut(e, null, t, r), new k(r);
  }
  function Vu(n43, e) {
    let t = e.depth - n43.openStart, i = e.node(t).copy(n43.content);
    for (let s = t - 1; s >= 0; s--) i = e.node(s).copy(k.from(i));
    return { start: i.resolveNoCache(n43.openStart + t), end: i.resolveNoCache(i.content.size - n43.openEnd - t) };
  }
  var Bn = class n4 {
    constructor(e, t, r) {
      this.pos = e, this.path = t, this.parentOffset = r, this.depth = t.length / 3 - 1;
    }
    resolveDepth(e) {
      return e == null ? this.depth : e < 0 ? this.depth + e : e;
    }
    get parent() {
      return this.node(this.depth);
    }
    get doc() {
      return this.node(0);
    }
    node(e) {
      return this.path[this.resolveDepth(e) * 3];
    }
    index(e) {
      return this.path[this.resolveDepth(e) * 3 + 1];
    }
    indexAfter(e) {
      return e = this.resolveDepth(e), this.index(e) + (e == this.depth && !this.textOffset ? 0 : 1);
    }
    start(e) {
      return e = this.resolveDepth(e), e == 0 ? 0 : this.path[e * 3 - 1] + 1;
    }
    end(e) {
      return e = this.resolveDepth(e), this.start(e) + this.node(e).content.size;
    }
    before(e) {
      if (e = this.resolveDepth(e), !e) throw new RangeError("There is no position before the top-level node");
      return e == this.depth + 1 ? this.pos : this.path[e * 3 - 1];
    }
    after(e) {
      if (e = this.resolveDepth(e), !e) throw new RangeError("There is no position after the top-level node");
      return e == this.depth + 1 ? this.pos : this.path[e * 3 - 1] + this.path[e * 3].nodeSize;
    }
    get textOffset() {
      return this.pos - this.path[this.path.length - 1];
    }
    get nodeAfter() {
      let e = this.parent, t = this.index(this.depth);
      if (t == e.childCount) return null;
      let r = this.pos - this.path[this.path.length - 1], i = e.child(t);
      return r ? e.child(t).cut(r) : i;
    }
    get nodeBefore() {
      let e = this.index(this.depth), t = this.pos - this.path[this.path.length - 1];
      return t ? this.parent.child(e).cut(0, t) : e == 0 ? null : this.parent.child(e - 1);
    }
    posAtIndex(e, t) {
      t = this.resolveDepth(t);
      let r = this.path[t * 3], i = t == 0 ? 0 : this.path[t * 3 - 1] + 1;
      for (let s = 0; s < e; s++) i += r.child(s).nodeSize;
      return i;
    }
    marks() {
      let e = this.parent, t = this.index();
      if (e.content.size == 0) return F.none;
      if (this.textOffset) return e.child(t).marks;
      let r = e.maybeChild(t - 1), i = e.maybeChild(t);
      if (!r) {
        let l = r;
        r = i, i = l;
      }
      let s = r.marks;
      for (var o = 0; o < s.length; o++) s[o].type.spec.inclusive === false && (!i || !s[o].isInSet(i.marks)) && (s = s[o--].removeFromSet(s));
      return s;
    }
    marksAcross(e) {
      let t = this.parent.maybeChild(this.index());
      if (!t || !t.isInline) return null;
      let r = t.marks, i = e.parent.maybeChild(e.index());
      for (var s = 0; s < r.length; s++) r[s].type.spec.inclusive === false && (!i || !r[s].isInSet(i.marks)) && (r = r[s--].removeFromSet(r));
      return r;
    }
    sharedDepth(e) {
      for (let t = this.depth; t > 0; t--) if (this.start(t) <= e && this.end(t) >= e) return t;
      return 0;
    }
    blockRange(e = this, t) {
      if (e.pos < this.pos) return e.blockRange(this);
      for (let r = this.depth - (this.parent.inlineContent || this.pos == e.pos ? 1 : 0); r >= 0; r--) if (e.pos <= this.end(r) && (!t || t(this.node(r)))) return new lt(this, e, r);
      return null;
    }
    sameParent(e) {
      return this.pos - this.parentOffset == e.pos - e.parentOffset;
    }
    max(e) {
      return e.pos > this.pos ? e : this;
    }
    min(e) {
      return e.pos < this.pos ? e : this;
    }
    toString() {
      let e = "";
      for (let t = 1; t <= this.depth; t++) e += (e ? "/" : "") + this.node(t).type.name + "_" + this.index(t - 1);
      return e + ":" + this.parentOffset;
    }
    static resolve(e, t) {
      if (!(t >= 0 && t <= e.content.size)) throw new RangeError("Position " + t + " out of range");
      let r = [], i = 0, s = t;
      for (let o = e; ; ) {
        let { index: l, offset: a } = o.content.findIndex(s), c = s - a;
        if (r.push(o, l, i + a), !c || (o = o.child(l), o.isText)) break;
        s = c - 1, i += a + 1;
      }
      return new n4(t, r, s);
    }
    static resolveCached(e, t) {
      let r = No.get(e);
      if (r) for (let s = 0; s < r.elts.length; s++) {
        let o = r.elts[s];
        if (o.pos == t) return o;
      }
      else No.set(e, r = new pi());
      let i = r.elts[r.i] = n4.resolve(e, t);
      return r.i = (r.i + 1) % ju, i;
    }
  };
  var pi = class {
    constructor() {
      this.elts = [], this.i = 0;
    }
  };
  var ju = 12;
  var No = /* @__PURE__ */ new WeakMap();
  var lt = class {
    constructor(e, t, r) {
      this.$from = e, this.$to = t, this.depth = r;
    }
    get start() {
      return this.$from.before(this.depth + 1);
    }
    get end() {
      return this.$to.after(this.depth + 1);
    }
    get parent() {
      return this.$from.node(this.depth);
    }
    get startIndex() {
      return this.$from.index(this.depth);
    }
    get endIndex() {
      return this.$to.indexAfter(this.depth);
    }
  };
  var Wu = /* @__PURE__ */ Object.create(null);
  var fe = class n5 {
    constructor(e, t, r, i = F.none) {
      this.type = e, this.attrs = t, this.marks = i, this.content = r || k.empty;
    }
    get children() {
      return this.content.content;
    }
    get nodeSize() {
      return this.isLeaf ? 1 : 2 + this.content.size;
    }
    get childCount() {
      return this.content.childCount;
    }
    child(e) {
      return this.content.child(e);
    }
    maybeChild(e) {
      return this.content.maybeChild(e);
    }
    forEach(e) {
      this.content.forEach(e);
    }
    nodesBetween(e, t, r, i = 0) {
      this.content.nodesBetween(e, t, r, i, this);
    }
    descendants(e) {
      this.nodesBetween(0, this.content.size, e);
    }
    get textContent() {
      return this.isLeaf && this.type.spec.leafText ? this.type.spec.leafText(this) : this.textBetween(0, this.content.size, "");
    }
    textBetween(e, t, r, i) {
      return this.content.textBetween(e, t, r, i);
    }
    get firstChild() {
      return this.content.firstChild;
    }
    get lastChild() {
      return this.content.lastChild;
    }
    eq(e) {
      return this == e || this.sameMarkup(e) && this.content.eq(e.content);
    }
    sameMarkup(e) {
      return this.hasMarkup(e.type, e.attrs, e.marks);
    }
    hasMarkup(e, t, r) {
      return this.type == e && Ln(this.attrs, t || e.defaultAttrs || Wu) && F.sameSet(this.marks, r || F.none);
    }
    copy(e = null) {
      return e == this.content ? this : new n5(this.type, this.attrs, e, this.marks);
    }
    mark(e) {
      return e == this.marks ? this : new n5(this.type, this.attrs, this.content, e);
    }
    cut(e, t = this.content.size) {
      return e == 0 && t == this.content.size ? this : this.copy(this.content.cut(e, t));
    }
    slice(e, t = this.content.size, r = false) {
      if (e == t) return x.empty;
      let i = this.resolve(e), s = this.resolve(t), o = r ? 0 : i.sharedDepth(t), l = i.start(o), c = i.node(o).content.cut(i.pos - l, s.pos - l);
      return new x(c, i.depth - o, s.depth - o);
    }
    replace(e, t, r) {
      return _u(this.resolve(e), this.resolve(t), r);
    }
    nodeAt(e) {
      for (let t = this; ; ) {
        let { index: r, offset: i } = t.content.findIndex(e);
        if (t = t.maybeChild(r), !t) return null;
        if (i == e || t.isText) return t;
        e -= i + 1;
      }
    }
    childAfter(e) {
      let { index: t, offset: r } = this.content.findIndex(e);
      return { node: this.content.maybeChild(t), index: t, offset: r };
    }
    childBefore(e) {
      if (e == 0) return { node: null, index: 0, offset: 0 };
      let { index: t, offset: r } = this.content.findIndex(e);
      if (r < e) return { node: this.content.child(t), index: t, offset: r };
      let i = this.content.child(t - 1);
      return { node: i, index: t - 1, offset: r - i.nodeSize };
    }
    resolve(e) {
      return Bn.resolveCached(this, e);
    }
    resolveNoCache(e) {
      return Bn.resolve(this, e);
    }
    rangeHasMark(e, t, r) {
      let i = false;
      return t > e && this.nodesBetween(e, t, (s) => (r.isInSet(s.marks) && (i = true), !i)), i;
    }
    get isBlock() {
      return this.type.isBlock;
    }
    get isTextblock() {
      return this.type.isTextblock;
    }
    get inlineContent() {
      return this.type.inlineContent;
    }
    get isInline() {
      return this.type.isInline;
    }
    get isText() {
      return this.type.isText;
    }
    get isLeaf() {
      return this.type.isLeaf;
    }
    get isAtom() {
      return this.type.isAtom;
    }
    toString() {
      if (this.type.spec.toDebugString) return this.type.spec.toDebugString(this);
      let e = this.type.name;
      return this.content.size && (e += "(" + this.content.toStringInner() + ")"), Ko(this.marks, e);
    }
    contentMatchAt(e) {
      let t = this.type.contentMatch.matchFragment(this.content, 0, e);
      if (!t) throw new Error("Called contentMatchAt on a node with invalid content");
      return t;
    }
    canReplace(e, t, r = k.empty, i = 0, s = r.childCount) {
      let o = this.contentMatchAt(e).matchFragment(r, i, s), l = o && o.matchFragment(this.content, t);
      if (!l || !l.validEnd) return false;
      for (let a = i; a < s; a++) if (!this.type.allowsMarks(r.child(a).marks)) return false;
      return true;
    }
    canReplaceWith(e, t, r, i) {
      if (i && !this.type.allowsMarks(i)) return false;
      let s = this.contentMatchAt(e).matchType(r), o = s && s.matchFragment(this.content, t);
      return o ? o.validEnd : false;
    }
    canAppend(e) {
      return e.content.size ? this.canReplace(this.childCount, this.childCount, e.content) : this.type.compatibleContent(e.type);
    }
    check() {
      this.type.checkContent(this.content), this.type.checkAttrs(this.attrs);
      let e = F.none;
      for (let t = 0; t < this.marks.length; t++) {
        let r = this.marks[t];
        r.type.checkAttrs(r.attrs), e = r.addToSet(e);
      }
      if (!F.sameSet(e, this.marks)) throw new RangeError(`Invalid collection of marks for node ${this.type.name}: ${this.marks.map((t) => t.type.name)}`);
      this.content.forEach((t) => t.check());
    }
    toJSON() {
      let e = { type: this.type.name };
      for (let t in this.attrs) {
        e.attrs = this.attrs;
        break;
      }
      return this.content.size && (e.content = this.content.toJSON()), this.marks.length && (e.marks = this.marks.map((t) => t.toJSON())), e;
    }
    static fromJSON(e, t) {
      if (!t) throw new RangeError("Invalid input for Node.fromJSON");
      let r;
      if (t.marks) {
        if (!Array.isArray(t.marks)) throw new RangeError("Invalid mark data for Node.fromJSON");
        r = t.marks.map(e.markFromJSON);
      }
      if (t.type == "text") {
        if (typeof t.text != "string") throw new RangeError("Invalid text node in JSON");
        return e.text(t.text, r);
      }
      let i = k.fromJSON(e, t.content), s = e.nodeType(t.type).create(t.attrs, i, r);
      return s.type.checkAttrs(s.attrs), s;
    }
  };
  fe.prototype.text = void 0;
  var mi = class n6 extends fe {
    constructor(e, t, r, i) {
      if (super(e, t, null, i), !r) throw new RangeError("Empty text nodes are not allowed");
      this.text = r;
    }
    toString() {
      return this.type.spec.toDebugString ? this.type.spec.toDebugString(this) : Ko(this.marks, JSON.stringify(this.text));
    }
    get textContent() {
      return this.text;
    }
    textBetween(e, t) {
      return this.text.slice(e, t);
    }
    get nodeSize() {
      return this.text.length;
    }
    mark(e) {
      return e == this.marks ? this : new n6(this.type, this.attrs, this.text, e);
    }
    withText(e) {
      return e == this.text ? this : new n6(this.type, this.attrs, e, this.marks);
    }
    cut(e = 0, t = this.text.length) {
      return e == 0 && t == this.text.length ? this : this.withText(this.text.slice(e, t));
    }
    eq(e) {
      return this.sameMarkup(e) && this.text == e.text;
    }
    toJSON() {
      let e = super.toJSON();
      return e.text = this.text, e;
    }
  };
  function Ko(n43, e) {
    for (let t = n43.length - 1; t >= 0; t--) e = n43[t].type.name + "(" + e + ")";
    return e;
  }
  var at = class n7 {
    constructor(e) {
      this.validEnd = e, this.next = [], this.wrapCache = [];
    }
    static parse(e, t) {
      let r = new gi(e, t);
      if (r.next == null) return n7.empty;
      let i = Uo(r);
      r.next && r.err("Unexpected trailing text");
      let s = Xu(Yu(i));
      return Qu(s, r), s;
    }
    matchType(e) {
      for (let t = 0; t < this.next.length; t++) if (this.next[t].type == e) return this.next[t].next;
      return null;
    }
    matchFragment(e, t = 0, r = e.childCount) {
      let i = this;
      for (let s = t; i && s < r; s++) i = i.matchType(e.child(s).type);
      return i;
    }
    get inlineContent() {
      return this.next.length != 0 && this.next[0].type.isInline;
    }
    get defaultType() {
      for (let e = 0; e < this.next.length; e++) {
        let { type: t } = this.next[e];
        if (!(t.isText || t.hasRequiredAttrs())) return t;
      }
      return null;
    }
    compatible(e) {
      for (let t = 0; t < this.next.length; t++) for (let r = 0; r < e.next.length; r++) if (this.next[t].type == e.next[r].type) return true;
      return false;
    }
    fillBefore(e, t = false, r = 0) {
      let i = [this];
      function s(o, l) {
        let a = o.matchFragment(e, r);
        if (a && (!t || a.validEnd)) return k.from(l.map((c) => c.createAndFill()));
        for (let c = 0; c < o.next.length; c++) {
          let { type: u, next: d } = o.next[c];
          if (!(u.isText || u.hasRequiredAttrs()) && i.indexOf(d) == -1) {
            i.push(d);
            let f = s(d, l.concat(u));
            if (f) return f;
          }
        }
        return null;
      }
      return s(this, []);
    }
    findWrapping(e) {
      for (let r = 0; r < this.wrapCache.length; r += 2) if (this.wrapCache[r] == e) return this.wrapCache[r + 1];
      let t = this.computeWrapping(e);
      return this.wrapCache.push(e, t), t;
    }
    computeWrapping(e) {
      let t = /* @__PURE__ */ Object.create(null), r = [{ match: this, type: null, via: null }];
      for (; r.length; ) {
        let i = r.shift(), s = i.match;
        if (s.matchType(e)) {
          let o = [];
          for (let l = i; l.type; l = l.via) o.push(l.type);
          return o.reverse();
        }
        for (let o = 0; o < s.next.length; o++) {
          let { type: l, next: a } = s.next[o];
          !l.isLeaf && !l.hasRequiredAttrs() && !(l.name in t) && (!i.type || a.validEnd) && (r.push({ match: l.contentMatch, type: l, via: i }), t[l.name] = true);
        }
      }
      return null;
    }
    get edgeCount() {
      return this.next.length;
    }
    edge(e) {
      if (e >= this.next.length) throw new RangeError(`There's no ${e}th edge in this content match`);
      return this.next[e];
    }
    toString() {
      let e = [];
      function t(r) {
        e.push(r);
        for (let i = 0; i < r.next.length; i++) e.indexOf(r.next[i].next) == -1 && t(r.next[i].next);
      }
      return t(this), e.map((r, i) => {
        let s = i + (r.validEnd ? "*" : " ") + " ";
        for (let o = 0; o < r.next.length; o++) s += (o ? ", " : "") + r.next[o].type.name + "->" + e.indexOf(r.next[o].next);
        return s;
      }).join(`
`);
    }
  };
  at.empty = new at(true);
  var gi = class {
    constructor(e, t) {
      this.string = e, this.nodeTypes = t, this.inline = null, this.pos = 0, this.tokens = e.split(/\s*(?=\b|\W|$)/), this.tokens[this.tokens.length - 1] == "" && this.tokens.pop(), this.tokens[0] == "" && this.tokens.shift();
    }
    get next() {
      return this.tokens[this.pos];
    }
    eat(e) {
      return this.next == e && (this.pos++ || true);
    }
    err(e) {
      throw new SyntaxError(e + " (in content expression '" + this.string + "')");
    }
  };
  function Uo(n43) {
    let e = [];
    do
      e.push(Ku(n43));
    while (n43.eat("|"));
    return e.length == 1 ? e[0] : { type: "choice", exprs: e };
  }
  function Ku(n43) {
    let e = [];
    do
      e.push(Uu(n43));
    while (n43.next && n43.next != ")" && n43.next != "|");
    return e.length == 1 ? e[0] : { type: "seq", exprs: e };
  }
  function Uu(n43) {
    let e = Gu(n43);
    for (; ; ) if (n43.eat("+")) e = { type: "plus", expr: e };
    else if (n43.eat("*")) e = { type: "star", expr: e };
    else if (n43.eat("?")) e = { type: "opt", expr: e };
    else if (n43.eat("{")) e = Ju(n43, e);
    else break;
    return e;
  }
  function Oo(n43) {
    /\D/.test(n43.next) && n43.err("Expected number, got '" + n43.next + "'");
    let e = Number(n43.next);
    return n43.pos++, e;
  }
  function Ju(n43, e) {
    let t = Oo(n43), r = t;
    return n43.eat(",") && (n43.next != "}" ? r = Oo(n43) : r = -1), n43.eat("}") || n43.err("Unclosed braced range"), { type: "range", min: t, max: r, expr: e };
  }
  function qu(n43, e) {
    let t = n43.nodeTypes, r = t[e];
    if (r) return [r];
    let i = [];
    for (let s in t) {
      let o = t[s];
      o.isInGroup(e) && i.push(o);
    }
    return i.length == 0 && n43.err("No node type or group '" + e + "' found"), i;
  }
  function Gu(n43) {
    if (n43.eat("(")) {
      let e = Uo(n43);
      return n43.eat(")") || n43.err("Missing closing paren"), e;
    } else if (/\W/.test(n43.next)) n43.err("Unexpected token '" + n43.next + "'");
    else {
      let e = qu(n43, n43.next).map((t) => (n43.inline == null ? n43.inline = t.isInline : n43.inline != t.isInline && n43.err("Mixing inline and block content"), { type: "name", value: t }));
      return n43.pos++, e.length == 1 ? e[0] : { type: "choice", exprs: e };
    }
  }
  function Yu(n43) {
    let e = [[]];
    return i(s(n43, 0), t()), e;
    function t() {
      return e.push([]) - 1;
    }
    function r(o, l, a) {
      let c = { term: a, to: l };
      return e[o].push(c), c;
    }
    function i(o, l) {
      o.forEach((a) => a.to = l);
    }
    function s(o, l) {
      if (o.type == "choice") return o.exprs.reduce((a, c) => a.concat(s(c, l)), []);
      if (o.type == "seq") for (let a = 0; ; a++) {
        let c = s(o.exprs[a], l);
        if (a == o.exprs.length - 1) return c;
        i(c, l = t());
      }
      else if (o.type == "star") {
        let a = t();
        return r(l, a), i(s(o.expr, a), a), [r(a)];
      } else if (o.type == "plus") {
        let a = t();
        return i(s(o.expr, l), a), i(s(o.expr, a), a), [r(a)];
      } else {
        if (o.type == "opt") return [r(l)].concat(s(o.expr, l));
        if (o.type == "range") {
          let a = l;
          for (let c = 0; c < o.min; c++) {
            let u = t();
            i(s(o.expr, a), u), a = u;
          }
          if (o.max == -1) i(s(o.expr, a), a);
          else for (let c = o.min; c < o.max; c++) {
            let u = t();
            r(a, u), i(s(o.expr, a), u), a = u;
          }
          return [r(a)];
        } else {
          if (o.type == "name") return [r(l, void 0, o.value)];
          throw new Error("Unknown expr type");
        }
      }
    }
  }
  function Jo(n43, e) {
    return e - n43;
  }
  function Io(n43, e) {
    let t = [];
    return r(e), t.sort(Jo);
    function r(i) {
      let s = n43[i];
      if (s.length == 1 && !s[0].term) return r(s[0].to);
      t.push(i);
      for (let o = 0; o < s.length; o++) {
        let { term: l, to: a } = s[o];
        !l && t.indexOf(a) == -1 && r(a);
      }
    }
  }
  function Xu(n43) {
    let e = /* @__PURE__ */ Object.create(null);
    return t(Io(n43, 0));
    function t(r) {
      let i = [];
      r.forEach((o) => {
        n43[o].forEach(({ term: l, to: a }) => {
          if (!l) return;
          let c;
          for (let u = 0; u < i.length; u++) i[u][0] == l && (c = i[u][1]);
          Io(n43, a).forEach((u) => {
            c || i.push([l, c = []]), c.indexOf(u) == -1 && c.push(u);
          });
        });
      });
      let s = e[r.join(",")] = new at(r.indexOf(n43.length - 1) > -1);
      for (let o = 0; o < i.length; o++) {
        let l = i[o][1].sort(Jo);
        s.next.push({ type: i[o][0], next: e[l.join(",")] || t(l) });
      }
      return s;
    }
  }
  function Qu(n43, e) {
    for (let t = 0, r = [n43]; t < r.length; t++) {
      let i = r[t], s = !i.validEnd, o = [];
      for (let l = 0; l < i.next.length; l++) {
        let { type: a, next: c } = i.next[l];
        o.push(a.name), s && !(a.isText || a.hasRequiredAttrs()) && (s = false), r.indexOf(c) == -1 && r.push(c);
      }
      s && e.err("Only non-generatable nodes (" + o.join(", ") + ") in a required position (see https://prosemirror.net/docs/guide/#generatable)");
    }
  }
  function qo(n43) {
    let e = /* @__PURE__ */ Object.create(null);
    for (let t in n43) {
      let r = n43[t];
      if (!r.hasDefault) return null;
      e[t] = r.default;
    }
    return e;
  }
  function Go(n43, e) {
    let t = /* @__PURE__ */ Object.create(null);
    for (let r in n43) {
      let i = e && e[r];
      if (i === void 0) {
        let s = n43[r];
        if (s.hasDefault) i = s.default;
        else throw new RangeError("No value supplied for attribute " + r);
      }
      t[r] = i;
    }
    return t;
  }
  function Yo(n43, e, t, r) {
    for (let i in e) if (!(i in n43)) throw new RangeError(`Unsupported attribute ${i} for ${t} of type ${i}`);
    for (let i in n43) {
      let s = n43[i];
      s.validate && s.validate(e[i]);
    }
  }
  function Xo(n43, e) {
    let t = /* @__PURE__ */ Object.create(null);
    if (e) for (let r in e) t[r] = new yi(n43, r, e[r]);
    return t;
  }
  var Fn = class n8 {
    constructor(e, t, r) {
      this.name = e, this.schema = t, this.spec = r, this.markSet = null, this.groups = r.group ? r.group.split(" ") : [], this.attrs = Xo(e, r.attrs), this.defaultAttrs = qo(this.attrs), this.contentMatch = null, this.inlineContent = null, this.isBlock = !(r.inline || e == "text"), this.isText = e == "text";
    }
    get isInline() {
      return !this.isBlock;
    }
    get isTextblock() {
      return this.isBlock && this.inlineContent;
    }
    get isLeaf() {
      return this.contentMatch == at.empty;
    }
    get isAtom() {
      return this.isLeaf || !!this.spec.atom;
    }
    isInGroup(e) {
      return this.groups.indexOf(e) > -1;
    }
    get whitespace() {
      return this.spec.whitespace || (this.spec.code ? "pre" : "normal");
    }
    hasRequiredAttrs() {
      for (let e in this.attrs) if (this.attrs[e].isRequired) return true;
      return false;
    }
    compatibleContent(e) {
      return this == e || this.contentMatch.compatible(e.contentMatch);
    }
    computeAttrs(e) {
      return !e && this.defaultAttrs ? this.defaultAttrs : Go(this.attrs, e);
    }
    create(e = null, t, r) {
      if (this.isText) throw new Error("NodeType.create can't construct text nodes");
      return new fe(this, this.computeAttrs(e), k.from(t), F.setFrom(r));
    }
    createChecked(e = null, t, r) {
      return t = k.from(t), this.checkContent(t), new fe(this, this.computeAttrs(e), t, F.setFrom(r));
    }
    createAndFill(e = null, t, r) {
      if (e = this.computeAttrs(e), t = k.from(t), t.size) {
        let o = this.contentMatch.fillBefore(t);
        if (!o) return null;
        t = o.append(t);
      }
      let i = this.contentMatch.matchFragment(t), s = i && i.fillBefore(k.empty, true);
      return s ? new fe(this, e, t.append(s), F.setFrom(r)) : null;
    }
    validContent(e) {
      let t = this.contentMatch.matchFragment(e);
      if (!t || !t.validEnd) return false;
      for (let r = 0; r < e.childCount; r++) if (!this.allowsMarks(e.child(r).marks)) return false;
      return true;
    }
    checkContent(e) {
      if (!this.validContent(e)) throw new RangeError(`Invalid content for node ${this.name}: ${e.toString().slice(0, 50)}`);
    }
    checkAttrs(e) {
      Yo(this.attrs, e, "node", this.name);
    }
    allowsMarkType(e) {
      return this.markSet == null || this.markSet.indexOf(e) > -1;
    }
    allowsMarks(e) {
      if (this.markSet == null) return true;
      for (let t = 0; t < e.length; t++) if (!this.allowsMarkType(e[t].type)) return false;
      return true;
    }
    allowedMarks(e) {
      if (this.markSet == null) return e;
      let t;
      for (let r = 0; r < e.length; r++) this.allowsMarkType(e[r].type) ? t && t.push(e[r]) : t || (t = e.slice(0, r));
      return t ? t.length ? t : F.none : e;
    }
    static compile(e, t) {
      let r = /* @__PURE__ */ Object.create(null);
      e.forEach((s, o) => r[s] = new n8(s, t, o));
      let i = t.spec.topNode || "doc";
      if (!r[i]) throw new RangeError("Schema is missing its top node type ('" + i + "')");
      if (!r.text) throw new RangeError("Every schema needs a 'text' type");
      for (let s in r.text.attrs) throw new RangeError("The text node type should not have attributes");
      return r;
    }
  };
  function Zu(n43, e, t) {
    let r = t.split("|");
    return (i) => {
      let s = i === null ? "null" : typeof i;
      if (r.indexOf(s) < 0) throw new RangeError(`Expected value of type ${r} for attribute ${e} on type ${n43}, got ${s}`);
    };
  }
  var yi = class {
    constructor(e, t, r) {
      this.hasDefault = Object.prototype.hasOwnProperty.call(r, "default"), this.default = r.default, this.validate = typeof r.validate == "string" ? Zu(e, t, r.validate) : r.validate;
    }
    get isRequired() {
      return !this.hasDefault;
    }
  };
  var qt = class n9 {
    constructor(e, t, r, i) {
      this.name = e, this.rank = t, this.schema = r, this.spec = i, this.attrs = Xo(e, i.attrs), this.excluded = null;
      let s = qo(this.attrs);
      this.instance = s ? new F(this, s) : null;
    }
    create(e = null) {
      return !e && this.instance ? this.instance : new F(this, Go(this.attrs, e));
    }
    static compile(e, t) {
      let r = /* @__PURE__ */ Object.create(null), i = 0;
      return e.forEach((s, o) => r[s] = new n9(s, i++, t, o)), r;
    }
    removeFromSet(e) {
      for (var t = 0; t < e.length; t++) e[t].type == this && (e = e.slice(0, t).concat(e.slice(t + 1)), t--);
      return e;
    }
    isInSet(e) {
      for (let t = 0; t < e.length; t++) if (e[t].type == this) return e[t];
    }
    checkAttrs(e) {
      Yo(this.attrs, e, "mark", this.name);
    }
    excludes(e) {
      return this.excluded.indexOf(e) > -1;
    }
  };
  var Et = class {
    constructor(e) {
      this.linebreakReplacement = null, this.cached = /* @__PURE__ */ Object.create(null);
      let t = this.spec = {};
      for (let i in e) t[i] = e[i];
      t.nodes = di.from(e.nodes), t.marks = di.from(e.marks || {}), this.nodes = Fn.compile(this.spec.nodes, this), this.marks = qt.compile(this.spec.marks, this);
      let r = /* @__PURE__ */ Object.create(null);
      for (let i in this.nodes) {
        if (i in this.marks) throw new RangeError(i + " can not be both a node and a mark");
        let s = this.nodes[i], o = s.spec.content || "", l = s.spec.marks;
        if (s.contentMatch = r[o] || (r[o] = at.parse(o, this.nodes)), s.inlineContent = s.contentMatch.inlineContent, s.spec.linebreakReplacement) {
          if (this.linebreakReplacement) throw new RangeError("Multiple linebreak nodes defined");
          if (!s.isInline || !s.isLeaf) throw new RangeError("Linebreak replacement nodes must be inline leaf nodes");
          this.linebreakReplacement = s;
        }
        s.markSet = l == "_" ? null : l ? Ro(this, l.split(" ")) : l == "" || !s.inlineContent ? [] : null;
      }
      for (let i in this.marks) {
        let s = this.marks[i], o = s.spec.excludes;
        s.excluded = o == null ? [s] : o == "" ? [] : Ro(this, o.split(" "));
      }
      this.nodeFromJSON = (i) => fe.fromJSON(this, i), this.markFromJSON = (i) => F.fromJSON(this, i), this.topNodeType = this.nodes[this.spec.topNode || "doc"], this.cached.wrappings = /* @__PURE__ */ Object.create(null);
    }
    node(e, t = null, r, i) {
      if (typeof e == "string") e = this.nodeType(e);
      else if (e instanceof Fn) {
        if (e.schema != this) throw new RangeError("Node type from different schema used (" + e.name + ")");
      } else throw new RangeError("Invalid node type: " + e);
      return e.createChecked(t, r, i);
    }
    text(e, t) {
      let r = this.nodes.text;
      return new mi(r, r.defaultAttrs, e, F.setFrom(t));
    }
    mark(e, t) {
      return typeof e == "string" && (e = this.marks[e]), e.create(t);
    }
    nodeType(e) {
      let t = this.nodes[e];
      if (!t) throw new RangeError("Unknown node type: " + e);
      return t;
    }
  };
  function Ro(n43, e) {
    let t = [];
    for (let r = 0; r < e.length; r++) {
      let i = e[r], s = n43.marks[i], o = s;
      if (s) t.push(s);
      else for (let l in n43.marks) {
        let a = n43.marks[l];
        (i == "_" || a.spec.group && a.spec.group.split(" ").indexOf(i) > -1) && t.push(o = a);
      }
      if (!o) throw new SyntaxError("Unknown mark type: '" + e[r] + "'");
    }
    return t;
  }
  function ed(n43) {
    return n43.tag != null;
  }
  function td(n43) {
    return n43.style != null;
  }
  var ve = class n10 {
    constructor(e, t) {
      this.schema = e, this.rules = t, this.tags = [], this.styles = [];
      let r = this.matchedStyles = [];
      t.forEach((i) => {
        if (ed(i)) this.tags.push(i);
        else if (td(i)) {
          let s = /[^=]*/.exec(i.style)[0];
          r.indexOf(s) < 0 && r.push(s), this.styles.push(i);
        }
      }), this.normalizeLists = !this.tags.some((i) => {
        if (!/^(ul|ol)\b/.test(i.tag) || !i.node) return false;
        let s = e.nodes[i.node];
        return s.contentMatch.matchType(s);
      });
    }
    parse(e, t = {}) {
      let r = new Hn(this, t, false);
      return r.addAll(e, F.none, t.from, t.to), r.finish();
    }
    parseSlice(e, t = {}) {
      let r = new Hn(this, t, true);
      return r.addAll(e, F.none, t.from, t.to), x.maxOpen(r.finish());
    }
    matchTag(e, t, r) {
      for (let i = r ? this.tags.indexOf(r) + 1 : 0; i < this.tags.length; i++) {
        let s = this.tags[i];
        if (id(e, s.tag) && (s.namespace === void 0 || e.namespaceURI == s.namespace) && (!s.context || t.matchesContext(s.context))) {
          if (s.getAttrs) {
            let o = s.getAttrs(e);
            if (o === false) continue;
            s.attrs = o || void 0;
          }
          return s;
        }
      }
    }
    matchStyle(e, t, r, i) {
      for (let s = i ? this.styles.indexOf(i) + 1 : 0; s < this.styles.length; s++) {
        let o = this.styles[s], l = o.style;
        if (!(l.indexOf(e) != 0 || o.context && !r.matchesContext(o.context) || l.length > e.length && (l.charCodeAt(e.length) != 61 || l.slice(e.length + 1) != t))) {
          if (o.getAttrs) {
            let a = o.getAttrs(t);
            if (a === false) continue;
            o.attrs = a || void 0;
          }
          return o;
        }
      }
    }
    static schemaRules(e) {
      let t = [];
      function r(i) {
        let s = i.priority == null ? 50 : i.priority, o = 0;
        for (; o < t.length; o++) {
          let l = t[o];
          if ((l.priority == null ? 50 : l.priority) < s) break;
        }
        t.splice(o, 0, i);
      }
      for (let i in e.marks) {
        let s = e.marks[i].spec.parseDOM;
        s && s.forEach((o) => {
          r(o = Po(o)), o.mark || o.ignore || o.clearMark || (o.mark = i);
        });
      }
      for (let i in e.nodes) {
        let s = e.nodes[i].spec.parseDOM;
        s && s.forEach((o) => {
          r(o = Po(o)), o.node || o.ignore || o.mark || (o.node = i);
        });
      }
      return t;
    }
    static fromSchema(e) {
      return e.cached.domParser || (e.cached.domParser = new n10(e, n10.schemaRules(e)));
    }
  };
  var Qo = { address: true, article: true, aside: true, blockquote: true, canvas: true, dd: true, div: true, dl: true, fieldset: true, figcaption: true, figure: true, footer: true, form: true, h1: true, h2: true, h3: true, h4: true, h5: true, h6: true, header: true, hgroup: true, hr: true, li: true, noscript: true, ol: true, output: true, p: true, pre: true, section: true, table: true, tfoot: true, ul: true };
  var nd = { head: true, noscript: true, object: true, script: true, style: true, title: true };
  var Zo = { ol: true, ul: true };
  var Gt = 1;
  var ki = 2;
  var Jt = 4;
  function Do(n43, e, t) {
    return e != null ? (e ? Gt : 0) | (e === "full" ? ki : 0) : n43 && n43.whitespace == "pre" ? Gt | ki : t & ~Jt;
  }
  var vt = class {
    constructor(e, t, r, i, s, o) {
      this.type = e, this.attrs = t, this.marks = r, this.solid = i, this.options = o, this.content = [], this.activeMarks = F.none, this.match = s || (o & Jt ? null : e.contentMatch);
    }
    findWrapping(e) {
      if (!this.match) {
        if (!this.type) return [];
        let t = this.type.contentMatch.fillBefore(k.from(e));
        if (t) this.match = this.type.contentMatch.matchFragment(t);
        else {
          let r = this.type.contentMatch, i;
          return (i = r.findWrapping(e.type)) ? (this.match = r, i) : null;
        }
      }
      return this.match.findWrapping(e.type);
    }
    finish(e) {
      if (!(this.options & Gt)) {
        let r = this.content[this.content.length - 1], i;
        if (r && r.isText && (i = /[ \t\r\n\u000c]+$/.exec(r.text))) {
          let s = r;
          r.text.length == i[0].length ? this.content.pop() : this.content[this.content.length - 1] = s.withText(s.text.slice(0, s.text.length - i[0].length));
        }
      }
      let t = k.from(this.content);
      return !e && this.match && (t = t.append(this.match.fillBefore(k.empty, true))), this.type ? this.type.create(this.attrs, t, this.marks) : t;
    }
    inlineContext(e) {
      return this.type ? this.type.inlineContent : this.content.length ? this.content[0].isInline : e.parentNode && !Qo.hasOwnProperty(e.parentNode.nodeName.toLowerCase());
    }
  };
  var Hn = class {
    constructor(e, t, r) {
      this.parser = e, this.options = t, this.isOpen = r, this.open = 0, this.localPreserveWS = false;
      let i = t.topNode, s, o = Do(null, t.preserveWhitespace, 0) | (r ? Jt : 0);
      i ? s = new vt(i.type, i.attrs, F.none, true, t.topMatch || i.type.contentMatch, o) : r ? s = new vt(null, null, F.none, true, null, o) : s = new vt(e.schema.topNodeType, null, F.none, true, null, o), this.nodes = [s], this.find = t.findPositions, this.needsBlock = false;
    }
    get top() {
      return this.nodes[this.open];
    }
    addDOM(e, t) {
      e.nodeType == 3 ? this.addTextNode(e, t) : e.nodeType == 1 && this.addElement(e, t);
    }
    addTextNode(e, t) {
      let r = e.nodeValue, i = this.top, s = i.options & ki ? "full" : this.localPreserveWS || (i.options & Gt) > 0, { schema: o } = this.parser;
      if (s === "full" || i.inlineContext(e) || /[^ \t\r\n\u000c]/.test(r)) {
        if (s) if (s === "full") r = r.replace(/\r\n?/g, `
`);
        else if (o.linebreakReplacement && /[\r\n]/.test(r) && this.top.findWrapping(o.linebreakReplacement.create())) {
          let l = r.split(/\r?\n|\r/);
          for (let a = 0; a < l.length; a++) a && this.insertNode(o.linebreakReplacement.create(), t, true), l[a] && this.insertNode(o.text(l[a]), t, !/\S/.test(l[a]));
          r = "";
        } else r = r.replace(/\r?\n|\r/g, " ");
        else if (r = r.replace(/[ \t\r\n\u000c]+/g, " "), /^[ \t\r\n\u000c]/.test(r) && this.open == this.nodes.length - 1) {
          let l = i.content[i.content.length - 1], a = e.previousSibling;
          (!l || a && a.nodeName == "BR" || l.isText && /[ \t\r\n\u000c]$/.test(l.text)) && (r = r.slice(1));
        }
        r && this.insertNode(o.text(r), t, !/\S/.test(r)), this.findInText(e);
      } else this.findInside(e);
    }
    addElement(e, t, r) {
      let i = this.localPreserveWS, s = this.top;
      (e.tagName == "PRE" || /pre/.test(e.style && e.style.whiteSpace)) && (this.localPreserveWS = true);
      let o = e.nodeName.toLowerCase(), l;
      Zo.hasOwnProperty(o) && this.parser.normalizeLists && rd(e);
      let a = this.options.ruleFromNode && this.options.ruleFromNode(e) || (l = this.parser.matchTag(e, this, r));
      e: if (a ? a.ignore : nd.hasOwnProperty(o)) this.findInside(e), this.ignoreFallback(e, t);
      else if (!a || a.skip || a.closeParent) {
        a && a.closeParent ? this.open = Math.max(0, this.open - 1) : a && a.skip.nodeType && (e = a.skip);
        let c, u = this.needsBlock;
        if (Qo.hasOwnProperty(o)) s.content.length && s.content[0].isInline && this.open && (this.open--, s = this.top), c = true, s.type || (this.needsBlock = true);
        else if (!e.firstChild) {
          this.leafFallback(e, t);
          break e;
        }
        let d = a && a.skip ? t : this.readStyles(e, t);
        d && this.addAll(e, d), c && this.sync(s), this.needsBlock = u;
      } else {
        let c = this.readStyles(e, t);
        c && this.addElementByRule(e, a, c, a.consuming === false ? l : void 0);
      }
      this.localPreserveWS = i;
    }
    leafFallback(e, t) {
      e.nodeName == "BR" && this.top.type && this.top.type.inlineContent && this.addTextNode(e.ownerDocument.createTextNode(`
`), t);
    }
    ignoreFallback(e, t) {
      e.nodeName == "BR" && (!this.top.type || !this.top.type.inlineContent) && this.findPlace(this.parser.schema.text("-"), t, true);
    }
    readStyles(e, t) {
      let r = e.style;
      if (r && r.length) for (let i = 0; i < this.parser.matchedStyles.length; i++) {
        let s = this.parser.matchedStyles[i], o = r.getPropertyValue(s);
        if (o) for (let l = void 0; ; ) {
          let a = this.parser.matchStyle(s, o, this, l);
          if (!a) break;
          if (a.ignore) return null;
          if (a.clearMark ? t = t.filter((c) => !a.clearMark(c)) : t = t.concat(this.parser.schema.marks[a.mark].create(a.attrs)), a.consuming === false) l = a;
          else break;
        }
      }
      return t;
    }
    addElementByRule(e, t, r, i) {
      let s, o;
      if (t.node) if (o = this.parser.schema.nodes[t.node], o.isLeaf) this.insertNode(o.create(t.attrs), r, e.nodeName == "BR") || this.leafFallback(e, r);
      else {
        let a = this.enter(o, t.attrs || null, r, t.preserveWhitespace);
        a && (s = true, r = a);
      }
      else {
        let a = this.parser.schema.marks[t.mark];
        r = r.concat(a.create(t.attrs));
      }
      let l = this.top;
      if (o && o.isLeaf) this.findInside(e);
      else if (i) this.addElement(e, r, i);
      else if (t.getContent) this.findInside(e), t.getContent(e, this.parser.schema).forEach((a) => this.insertNode(a, r, false));
      else {
        let a = e;
        typeof t.contentElement == "string" ? a = e.querySelector(t.contentElement) : typeof t.contentElement == "function" ? a = t.contentElement(e) : t.contentElement && (a = t.contentElement), this.findAround(e, a, true), this.addAll(a, r), this.findAround(e, a, false);
      }
      s && this.sync(l) && this.open--;
    }
    addAll(e, t, r, i) {
      let s = r || 0;
      for (let o = r ? e.childNodes[r] : e.firstChild, l = i == null ? null : e.childNodes[i]; o != l; o = o.nextSibling, ++s) this.findAtPoint(e, s), this.addDOM(o, t);
      this.findAtPoint(e, s);
    }
    findPlace(e, t, r) {
      let i, s;
      for (let o = this.open, l = 0; o >= 0; o--) {
        let a = this.nodes[o], c = a.findWrapping(e);
        if (c && (!i || i.length > c.length + l) && (i = c, s = a, !c.length)) break;
        if (a.solid) {
          if (r) break;
          l += 2;
        }
      }
      if (!i) return null;
      this.sync(s);
      for (let o = 0; o < i.length; o++) t = this.enterInner(i[o], null, t, false);
      return t;
    }
    insertNode(e, t, r) {
      if (e.isInline && this.needsBlock && !this.top.type) {
        let s = this.textblockFromContext();
        s && (t = this.enterInner(s, null, t));
      }
      let i = this.findPlace(e, t, r);
      if (i) {
        this.closeExtra();
        let s = this.top;
        s.match && (s.match = s.match.matchType(e.type));
        let o = F.none;
        for (let l of i.concat(e.marks)) (s.type ? s.type.allowsMarkType(l.type) : Lo(l.type, e.type)) && (o = l.addToSet(o));
        return s.content.push(e.mark(o)), true;
      }
      return false;
    }
    enter(e, t, r, i) {
      let s = this.findPlace(e.create(t), r, false);
      return s && (s = this.enterInner(e, t, r, true, i)), s;
    }
    enterInner(e, t, r, i = false, s) {
      this.closeExtra();
      let o = this.top;
      o.match = o.match && o.match.matchType(e);
      let l = Do(e, s, o.options);
      o.options & Jt && o.content.length == 0 && (l |= Jt);
      let a = F.none;
      return r = r.filter((c) => (o.type ? o.type.allowsMarkType(c.type) : Lo(c.type, e)) ? (a = c.addToSet(a), false) : true), this.nodes.push(new vt(e, t, a, i, null, l)), this.open++, r;
    }
    closeExtra(e = false) {
      let t = this.nodes.length - 1;
      if (t > this.open) {
        for (; t > this.open; t--) this.nodes[t - 1].content.push(this.nodes[t].finish(e));
        this.nodes.length = this.open + 1;
      }
    }
    finish() {
      return this.open = 0, this.closeExtra(this.isOpen), this.nodes[0].finish(!!(this.isOpen || this.options.topOpen));
    }
    sync(e) {
      for (let t = this.open; t >= 0; t--) {
        if (this.nodes[t] == e) return this.open = t, true;
        this.localPreserveWS && (this.nodes[t].options |= Gt);
      }
      return false;
    }
    get currentPos() {
      this.closeExtra();
      let e = 0;
      for (let t = this.open; t >= 0; t--) {
        let r = this.nodes[t].content;
        for (let i = r.length - 1; i >= 0; i--) e += r[i].nodeSize;
        t && e++;
      }
      return e;
    }
    findAtPoint(e, t) {
      if (this.find) for (let r = 0; r < this.find.length; r++) this.find[r].node == e && this.find[r].offset == t && (this.find[r].pos = this.currentPos);
    }
    findInside(e) {
      if (this.find) for (let t = 0; t < this.find.length; t++) this.find[t].pos == null && e.nodeType == 1 && e.contains(this.find[t].node) && (this.find[t].pos = this.currentPos);
    }
    findAround(e, t, r) {
      if (e != t && this.find) for (let i = 0; i < this.find.length; i++) this.find[i].pos == null && e.nodeType == 1 && e.contains(this.find[i].node) && t.compareDocumentPosition(this.find[i].node) & (r ? 2 : 4) && (this.find[i].pos = this.currentPos);
    }
    findInText(e) {
      if (this.find) for (let t = 0; t < this.find.length; t++) this.find[t].node == e && (this.find[t].pos = this.currentPos - (e.nodeValue.length - this.find[t].offset));
    }
    matchesContext(e) {
      if (e.indexOf("|") > -1) return e.split(/\s*\|\s*/).some(this.matchesContext, this);
      let t = e.split("/"), r = this.options.context, i = !this.isOpen && (!r || r.parent.type == this.nodes[0].type), s = -(r ? r.depth + 1 : 0) + (i ? 0 : 1), o = (l, a) => {
        for (; l >= 0; l--) {
          let c = t[l];
          if (c == "") {
            if (l == t.length - 1 || l == 0) continue;
            for (; a >= s; a--) if (o(l - 1, a)) return true;
            return false;
          } else {
            let u = a > 0 || a == 0 && i ? this.nodes[a].type : r && a >= s ? r.node(a - s).type : null;
            if (!u || u.name != c && !u.isInGroup(c)) return false;
            a--;
          }
        }
        return true;
      };
      return o(t.length - 1, this.open);
    }
    textblockFromContext() {
      let e = this.options.context;
      if (e) for (let t = e.depth; t >= 0; t--) {
        let r = e.node(t).contentMatchAt(e.indexAfter(t)).defaultType;
        if (r && r.isTextblock && r.defaultAttrs) return r;
      }
      for (let t in this.parser.schema.nodes) {
        let r = this.parser.schema.nodes[t];
        if (r.isTextblock && r.defaultAttrs) return r;
      }
    }
  };
  function rd(n43) {
    for (let e = n43.firstChild, t = null; e; e = e.nextSibling) {
      let r = e.nodeType == 1 ? e.nodeName.toLowerCase() : null;
      r && Zo.hasOwnProperty(r) && t ? (t.appendChild(e), e = t) : r == "li" ? t = e : r && (t = null);
    }
  }
  function id(n43, e) {
    return (n43.matches || n43.msMatchesSelector || n43.webkitMatchesSelector || n43.mozMatchesSelector).call(n43, e);
  }
  function Po(n43) {
    let e = {};
    for (let t in n43) e[t] = n43[t];
    return e;
  }
  function Lo(n43, e) {
    let t = e.schema.nodes;
    for (let r in t) {
      let i = t[r];
      if (!i.allowsMarkType(n43)) continue;
      let s = [], o = (l) => {
        s.push(l);
        for (let a = 0; a < l.edgeCount; a++) {
          let { type: c, next: u } = l.edge(a);
          if (c == e || s.indexOf(u) < 0 && o(u)) return true;
        }
      };
      if (o(i.contentMatch)) return true;
    }
  }
  var ze = class n11 {
    constructor(e, t) {
      this.nodes = e, this.marks = t;
    }
    serializeFragment(e, t = {}, r) {
      r || (r = Dn(t).createDocumentFragment());
      let i = r, s = [];
      return e.forEach((o) => {
        if (s.length || o.marks.length) {
          let l = 0, a = 0;
          for (; l < s.length && a < o.marks.length; ) {
            let c = o.marks[a];
            if (!this.marks[c.type.name]) {
              a++;
              continue;
            }
            if (!c.eq(s[l][0]) || c.type.spec.spanning === false) break;
            l++, a++;
          }
          for (; l < s.length; ) i = s.pop()[1];
          for (; a < o.marks.length; ) {
            let c = o.marks[a++], u = this.serializeMark(c, o.isInline, t);
            u && (s.push([c, i]), i.appendChild(u.dom), i = u.contentDOM || u.dom);
          }
        }
        i.appendChild(this.serializeNodeInner(o, t));
      }), r;
    }
    serializeNodeInner(e, t) {
      if (e.isText) return Dn(t).createTextNode(e.text);
      let { dom: r, contentDOM: i } = Pn(Dn(t), this.nodes[e.type.name](e), null, e.attrs);
      if (i) {
        if (e.isLeaf) throw new RangeError("Content hole not allowed in a leaf node spec");
        this.serializeFragment(e.content, t, i);
      }
      return r;
    }
    serializeNode(e, t = {}) {
      let r = this.serializeNodeInner(e, t);
      for (let i = e.marks.length - 1; i >= 0; i--) {
        let s = this.serializeMark(e.marks[i], e.isInline, t);
        s && ((s.contentDOM || s.dom).appendChild(r), r = s.dom);
      }
      return r;
    }
    serializeMark(e, t, r = {}) {
      let i = this.marks[e.type.name];
      return i && Pn(Dn(r), i(e, t), null, e.attrs);
    }
    static renderSpec(e, t, r = null, i) {
      return typeof t == "string" ? { dom: e.createTextNode(t) } : Pn(e, t, r, i);
    }
    static fromSchema(e) {
      return e.cached.domSerializer || (e.cached.domSerializer = new n11(this.nodesFromSchema(e), this.marksFromSchema(e)));
    }
    static nodesFromSchema(e) {
      let t = zo(e.nodes);
      return t.text || (t.text = (r) => r.text), t;
    }
    static marksFromSchema(e) {
      return zo(e.marks);
    }
  };
  function zo(n43) {
    let e = {};
    for (let t in n43) {
      let r = n43[t].spec.toDOM;
      r && (e[t] = r);
    }
    return e;
  }
  function Dn(n43) {
    return n43.document || window.document;
  }
  var Bo = /* @__PURE__ */ new WeakMap();
  function sd(n43) {
    let e = Bo.get(n43);
    return e === void 0 && Bo.set(n43, e = od(n43)), e;
  }
  function od(n43) {
    let e = null;
    function t(r) {
      if (r && typeof r == "object") if (Array.isArray(r)) if (typeof r[0] == "string") e || (e = []), e.push(r);
      else for (let i = 0; i < r.length; i++) t(r[i]);
      else for (let i in r) t(r[i]);
    }
    return t(n43), e;
  }
  function Pn(n43, e, t, r) {
    if (e.nodeType == 1) return { dom: e };
    if (e.dom && e.dom.nodeType == 1) return e;
    let i = e[0], s;
    if (typeof i != "string") throw new RangeError("Invalid array passed to renderSpec");
    if (r && (s = sd(r)) && s.indexOf(e) > -1) throw new RangeError("Using an array from an attribute object as a DOM spec. This may be an attempted cross site scripting attack.");
    let o = i.indexOf(" ");
    o > 0 && (t = i.slice(0, o), i = i.slice(o + 1));
    let l, a = t ? n43.createElementNS(t, i) : n43.createElement(i), c = e[1], u = 1;
    if (c && typeof c == "object" && c.nodeType == null && !Array.isArray(c)) {
      u = 2;
      for (let d in c) if (c[d] != null) {
        let f = d.indexOf(" ");
        f > 0 ? a.setAttributeNS(d.slice(0, f), d.slice(f + 1), c[d]) : d == "style" && a.style ? a.style.cssText = c[d] : a.setAttribute(d, c[d]);
      }
    }
    for (let d = u; d < e.length; d++) {
      let f = e[d];
      if (f === 0) {
        if (d < e.length - 1 || d > u) throw new RangeError("Content hole must be the only child of its parent node");
        return { dom: a, contentDOM: a };
      } else if (typeof f == "string") a.appendChild(n43.createTextNode(f));
      else {
        let { dom: h, contentDOM: p } = Pn(n43, f, t, r);
        if (a.appendChild(h), p) {
          if (l) throw new RangeError("Multiple content holes");
          l = p;
        }
      }
    }
    return { dom: a, contentDOM: l };
  }
  var nl = 65535;
  var rl = Math.pow(2, 16);
  function ld(n43, e) {
    return n43 + e * rl;
  }
  function el(n43) {
    return n43 & nl;
  }
  function ad(n43) {
    return (n43 - (n43 & nl)) / rl;
  }
  var il = 1;
  var sl = 2;
  var $n = 4;
  var ol = 8;
  var Qt = class {
    constructor(e, t, r) {
      this.pos = e, this.delInfo = t, this.recover = r;
    }
    get deleted() {
      return (this.delInfo & ol) > 0;
    }
    get deletedBefore() {
      return (this.delInfo & (il | $n)) > 0;
    }
    get deletedAfter() {
      return (this.delInfo & (sl | $n)) > 0;
    }
    get deletedAcross() {
      return (this.delInfo & $n) > 0;
    }
  };
  var Be = class n12 {
    constructor(e, t = false) {
      if (this.ranges = e, this.inverted = t, !e.length && n12.empty) return n12.empty;
    }
    recover(e) {
      let t = 0, r = el(e);
      if (!this.inverted) for (let i = 0; i < r; i++) t += this.ranges[i * 3 + 2] - this.ranges[i * 3 + 1];
      return this.ranges[r * 3] + t + ad(e);
    }
    mapResult(e, t = 1) {
      return this._map(e, t, false);
    }
    map(e, t = 1) {
      return this._map(e, t, true);
    }
    _map(e, t, r) {
      let i = 0, s = this.inverted ? 2 : 1, o = this.inverted ? 1 : 2;
      for (let l = 0; l < this.ranges.length; l += 3) {
        let a = this.ranges[l] - (this.inverted ? i : 0);
        if (a > e) break;
        let c = this.ranges[l + s], u = this.ranges[l + o], d = a + c;
        if (e <= d) {
          let f = c ? e == a ? -1 : e == d ? 1 : t : t, h = a + i + (f < 0 ? 0 : u);
          if (r) return h;
          let p = e == (t < 0 ? a : d) ? null : ld(l / 3, e - a), m = e == a ? sl : e == d ? il : $n;
          return (t < 0 ? e != a : e != d) && (m |= ol), new Qt(h, m, p);
        }
        i += u - c;
      }
      return r ? e + i : new Qt(e + i, 0, null);
    }
    touches(e, t) {
      let r = 0, i = el(t), s = this.inverted ? 2 : 1, o = this.inverted ? 1 : 2;
      for (let l = 0; l < this.ranges.length; l += 3) {
        let a = this.ranges[l] - (this.inverted ? r : 0);
        if (a > e) break;
        let c = this.ranges[l + s], u = a + c;
        if (e <= u && l == i * 3) return true;
        r += this.ranges[l + o] - c;
      }
      return false;
    }
    forEach(e) {
      let t = this.inverted ? 2 : 1, r = this.inverted ? 1 : 2;
      for (let i = 0, s = 0; i < this.ranges.length; i += 3) {
        let o = this.ranges[i], l = o - (this.inverted ? s : 0), a = o + (this.inverted ? 0 : s), c = this.ranges[i + t], u = this.ranges[i + r];
        e(l, l + c, a, a + u), s += u - c;
      }
    }
    invert() {
      return new n12(this.ranges, !this.inverted);
    }
    toString() {
      return (this.inverted ? "-" : "") + JSON.stringify(this.ranges);
    }
    static offset(e) {
      return e == 0 ? n12.empty : new n12(e < 0 ? [0, -e, 0] : [0, 0, e]);
    }
  };
  Be.empty = new Be([]);
  var Zt = class n13 {
    constructor(e, t, r = 0, i = e ? e.length : 0) {
      this.mirror = t, this.from = r, this.to = i, this._maps = e || [], this.ownData = !(e || t);
    }
    get maps() {
      return this._maps;
    }
    slice(e = 0, t = this.maps.length) {
      return new n13(this._maps, this.mirror, e, t);
    }
    appendMap(e, t) {
      this.ownData || (this._maps = this._maps.slice(), this.mirror = this.mirror && this.mirror.slice(), this.ownData = true), this.to = this._maps.push(e), t != null && this.setMirror(this._maps.length - 1, t);
    }
    appendMapping(e) {
      for (let t = 0, r = this._maps.length; t < e._maps.length; t++) {
        let i = e.getMirror(t);
        this.appendMap(e._maps[t], i != null && i < t ? r + i : void 0);
      }
    }
    getMirror(e) {
      if (this.mirror) {
        for (let t = 0; t < this.mirror.length; t++) if (this.mirror[t] == e) return this.mirror[t + (t % 2 ? -1 : 1)];
      }
    }
    setMirror(e, t) {
      this.mirror || (this.mirror = []), this.mirror.push(e, t);
    }
    appendMappingInverted(e) {
      for (let t = e.maps.length - 1, r = this._maps.length + e._maps.length; t >= 0; t--) {
        let i = e.getMirror(t);
        this.appendMap(e._maps[t].invert(), i != null && i > t ? r - i - 1 : void 0);
      }
    }
    invert() {
      let e = new n13();
      return e.appendMappingInverted(this), e;
    }
    map(e, t = 1) {
      if (this.mirror) return this._map(e, t, true);
      for (let r = this.from; r < this.to; r++) e = this._maps[r].map(e, t);
      return e;
    }
    mapResult(e, t = 1) {
      return this._map(e, t, false);
    }
    _map(e, t, r) {
      let i = 0;
      for (let s = this.from; s < this.to; s++) {
        let o = this._maps[s], l = o.mapResult(e, t);
        if (l.recover != null) {
          let a = this.getMirror(s);
          if (a != null && a > s && a < this.to) {
            s = a, e = this._maps[a].recover(l.recover);
            continue;
          }
        }
        i |= l.delInfo, e = l.pos;
      }
      return r ? e : new Qt(e, i, null);
    }
  };
  var bi = /* @__PURE__ */ Object.create(null);
  var Y = class {
    getMap() {
      return Be.empty;
    }
    merge(e) {
      return null;
    }
    static fromJSON(e, t) {
      if (!t || !t.stepType) throw new RangeError("Invalid input for Step.fromJSON");
      let r = bi[t.stepType];
      if (!r) throw new RangeError(`No step type ${t.stepType} defined`);
      return r.fromJSON(e, t);
    }
    static jsonID(e, t) {
      if (e in bi) throw new RangeError("Duplicate use of step JSON ID " + e);
      return bi[e] = t, t.prototype.jsonID = e, t;
    }
  };
  var X = class n14 {
    constructor(e, t) {
      this.doc = e, this.failed = t;
    }
    static ok(e) {
      return new n14(e, null);
    }
    static fail(e) {
      return new n14(null, e);
    }
    static fromReplace(e, t, r, i) {
      try {
        return n14.ok(e.replace(t, r, i));
      } catch (s) {
        if (s instanceof ot) return n14.fail(s.message);
        throw s;
      }
    }
  };
  function Ci(n43, e, t) {
    let r = [];
    for (let i = 0; i < n43.childCount; i++) {
      let s = n43.child(i);
      s.content.size && (s = s.copy(Ci(s.content, e, s))), s.isInline && (s = e(s, t, i)), r.push(s);
    }
    return k.fromArray(r);
  }
  var en = class n15 extends Y {
    constructor(e, t, r) {
      super(), this.from = e, this.to = t, this.mark = r;
    }
    apply(e) {
      let t = e.slice(this.from, this.to), r = e.resolve(this.from), i = r.node(r.sharedDepth(this.to)), s = new x(Ci(t.content, (o, l) => !o.isAtom || !l.type.allowsMarkType(this.mark.type) ? o : o.mark(this.mark.addToSet(o.marks)), i), t.openStart, t.openEnd);
      return X.fromReplace(e, this.from, this.to, s);
    }
    invert() {
      return new Fe(this.from, this.to, this.mark);
    }
    map(e) {
      let t = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1);
      return t.deleted && r.deleted || t.pos >= r.pos ? null : new n15(t.pos, r.pos, this.mark);
    }
    merge(e) {
      return e instanceof n15 && e.mark.eq(this.mark) && this.from <= e.to && this.to >= e.from ? new n15(Math.min(this.from, e.from), Math.max(this.to, e.to), this.mark) : null;
    }
    toJSON() {
      return { stepType: "addMark", mark: this.mark.toJSON(), from: this.from, to: this.to };
    }
    static fromJSON(e, t) {
      if (typeof t.from != "number" || typeof t.to != "number") throw new RangeError("Invalid input for AddMarkStep.fromJSON");
      return new n15(t.from, t.to, e.markFromJSON(t.mark));
    }
  };
  Y.jsonID("addMark", en);
  var Fe = class n16 extends Y {
    constructor(e, t, r) {
      super(), this.from = e, this.to = t, this.mark = r;
    }
    apply(e) {
      let t = e.slice(this.from, this.to), r = new x(Ci(t.content, (i) => i.mark(this.mark.removeFromSet(i.marks)), e), t.openStart, t.openEnd);
      return X.fromReplace(e, this.from, this.to, r);
    }
    invert() {
      return new en(this.from, this.to, this.mark);
    }
    map(e) {
      let t = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1);
      return t.deleted && r.deleted || t.pos >= r.pos ? null : new n16(t.pos, r.pos, this.mark);
    }
    merge(e) {
      return e instanceof n16 && e.mark.eq(this.mark) && this.from <= e.to && this.to >= e.from ? new n16(Math.min(this.from, e.from), Math.max(this.to, e.to), this.mark) : null;
    }
    toJSON() {
      return { stepType: "removeMark", mark: this.mark.toJSON(), from: this.from, to: this.to };
    }
    static fromJSON(e, t) {
      if (typeof t.from != "number" || typeof t.to != "number") throw new RangeError("Invalid input for RemoveMarkStep.fromJSON");
      return new n16(t.from, t.to, e.markFromJSON(t.mark));
    }
  };
  Y.jsonID("removeMark", Fe);
  var tn = class n17 extends Y {
    constructor(e, t) {
      super(), this.pos = e, this.mark = t;
    }
    apply(e) {
      let t = e.nodeAt(this.pos);
      if (!t) return X.fail("No node at mark step's position");
      let r = t.type.create(t.attrs, null, this.mark.addToSet(t.marks));
      return X.fromReplace(e, this.pos, this.pos + 1, new x(k.from(r), 0, t.isLeaf ? 0 : 1));
    }
    invert(e) {
      let t = e.nodeAt(this.pos);
      if (t) {
        let r = this.mark.addToSet(t.marks);
        if (r.length == t.marks.length) {
          for (let i = 0; i < t.marks.length; i++) if (!t.marks[i].isInSet(r)) return new n17(this.pos, t.marks[i]);
          return new n17(this.pos, this.mark);
        }
      }
      return new At(this.pos, this.mark);
    }
    map(e) {
      let t = e.mapResult(this.pos, 1);
      return t.deletedAfter ? null : new n17(t.pos, this.mark);
    }
    toJSON() {
      return { stepType: "addNodeMark", pos: this.pos, mark: this.mark.toJSON() };
    }
    static fromJSON(e, t) {
      if (typeof t.pos != "number") throw new RangeError("Invalid input for AddNodeMarkStep.fromJSON");
      return new n17(t.pos, e.markFromJSON(t.mark));
    }
  };
  Y.jsonID("addNodeMark", tn);
  var At = class n18 extends Y {
    constructor(e, t) {
      super(), this.pos = e, this.mark = t;
    }
    apply(e) {
      let t = e.nodeAt(this.pos);
      if (!t) return X.fail("No node at mark step's position");
      let r = t.type.create(t.attrs, null, this.mark.removeFromSet(t.marks));
      return X.fromReplace(e, this.pos, this.pos + 1, new x(k.from(r), 0, t.isLeaf ? 0 : 1));
    }
    invert(e) {
      let t = e.nodeAt(this.pos);
      return !t || !this.mark.isInSet(t.marks) ? this : new tn(this.pos, this.mark);
    }
    map(e) {
      let t = e.mapResult(this.pos, 1);
      return t.deletedAfter ? null : new n18(t.pos, this.mark);
    }
    toJSON() {
      return { stepType: "removeNodeMark", pos: this.pos, mark: this.mark.toJSON() };
    }
    static fromJSON(e, t) {
      if (typeof t.pos != "number") throw new RangeError("Invalid input for RemoveNodeMarkStep.fromJSON");
      return new n18(t.pos, e.markFromJSON(t.mark));
    }
  };
  Y.jsonID("removeNodeMark", At);
  var Q = class n19 extends Y {
    constructor(e, t, r, i = false) {
      super(), this.from = e, this.to = t, this.slice = r, this.structure = i;
    }
    apply(e) {
      return this.structure && Mi(e, this.from, this.to) ? X.fail("Structure replace would overwrite content") : X.fromReplace(e, this.from, this.to, this.slice);
    }
    getMap() {
      return new Be([this.from, this.to - this.from, this.slice.size]);
    }
    invert(e) {
      return new n19(this.from, this.from + this.slice.size, e.slice(this.from, this.to));
    }
    map(e) {
      let t = e.mapResult(this.to, -1), r = this.from == this.to && n19.MAP_BIAS < 0 ? t : e.mapResult(this.from, 1);
      return r.deletedAcross && t.deletedAcross ? null : new n19(r.pos, Math.max(r.pos, t.pos), this.slice, this.structure);
    }
    merge(e) {
      if (!(e instanceof n19) || e.structure || this.structure) return null;
      if (this.from + this.slice.size == e.from && !this.slice.openEnd && !e.slice.openStart) {
        let t = this.slice.size + e.slice.size == 0 ? x.empty : new x(this.slice.content.append(e.slice.content), this.slice.openStart, e.slice.openEnd);
        return new n19(this.from, this.to + (e.to - e.from), t, this.structure);
      } else if (e.to == this.from && !this.slice.openStart && !e.slice.openEnd) {
        let t = this.slice.size + e.slice.size == 0 ? x.empty : new x(e.slice.content.append(this.slice.content), e.slice.openStart, this.slice.openEnd);
        return new n19(e.from, this.to, t, this.structure);
      } else return null;
    }
    toJSON() {
      let e = { stepType: "replace", from: this.from, to: this.to };
      return this.slice.size && (e.slice = this.slice.toJSON()), this.structure && (e.structure = true), e;
    }
    static fromJSON(e, t) {
      if (typeof t.from != "number" || typeof t.to != "number") throw new RangeError("Invalid input for ReplaceStep.fromJSON");
      return new n19(t.from, t.to, x.fromJSON(e, t.slice), !!t.structure);
    }
  };
  Q.MAP_BIAS = 1;
  Y.jsonID("replace", Q);
  var U = class n20 extends Y {
    constructor(e, t, r, i, s, o, l = false) {
      super(), this.from = e, this.to = t, this.gapFrom = r, this.gapTo = i, this.slice = s, this.insert = o, this.structure = l;
    }
    apply(e) {
      if (this.structure && (Mi(e, this.from, this.gapFrom) || Mi(e, this.gapTo, this.to))) return X.fail("Structure gap-replace would overwrite content");
      let t = e.slice(this.gapFrom, this.gapTo);
      if (t.openStart || t.openEnd) return X.fail("Gap is not a flat range");
      let r = this.slice.insertAt(this.insert, t.content);
      return r ? X.fromReplace(e, this.from, this.to, r) : X.fail("Content does not fit in gap");
    }
    getMap() {
      return new Be([this.from, this.gapFrom - this.from, this.insert, this.gapTo, this.to - this.gapTo, this.slice.size - this.insert]);
    }
    invert(e) {
      let t = this.gapTo - this.gapFrom;
      return new n20(this.from, this.from + this.slice.size + t, this.from + this.insert, this.from + this.insert + t, e.slice(this.from, this.to).removeBetween(this.gapFrom - this.from, this.gapTo - this.from), this.gapFrom - this.from, this.structure);
    }
    map(e) {
      let t = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1), i = this.from == this.gapFrom ? t.pos : e.map(this.gapFrom, -1), s = this.to == this.gapTo ? r.pos : e.map(this.gapTo, 1);
      return t.deletedAcross && r.deletedAcross || i < t.pos || s > r.pos ? null : new n20(t.pos, r.pos, i, s, this.slice, this.insert, this.structure);
    }
    toJSON() {
      let e = { stepType: "replaceAround", from: this.from, to: this.to, gapFrom: this.gapFrom, gapTo: this.gapTo, insert: this.insert };
      return this.slice.size && (e.slice = this.slice.toJSON()), this.structure && (e.structure = true), e;
    }
    static fromJSON(e, t) {
      if (typeof t.from != "number" || typeof t.to != "number" || typeof t.gapFrom != "number" || typeof t.gapTo != "number" || typeof t.insert != "number") throw new RangeError("Invalid input for ReplaceAroundStep.fromJSON");
      return new n20(t.from, t.to, t.gapFrom, t.gapTo, x.fromJSON(e, t.slice), t.insert, !!t.structure);
    }
  };
  Y.jsonID("replaceAround", U);
  function Mi(n43, e, t) {
    let r = n43.resolve(e), i = t - e, s = r.depth;
    for (; i > 0 && s > 0 && r.indexAfter(s) == r.node(s).childCount; ) s--, i--;
    if (i > 0) {
      let o = r.node(s).maybeChild(r.indexAfter(s));
      for (; i > 0; ) {
        if (!o || o.isLeaf) return true;
        o = o.firstChild, i--;
      }
    }
    return false;
  }
  function cd(n43, e, t, r) {
    let i = [], s = [], o, l;
    n43.doc.nodesBetween(e, t, (a, c, u) => {
      if (!a.isInline) return;
      let d = a.marks;
      if (!r.isInSet(d) && u.type.allowsMarkType(r.type)) {
        let f = Math.max(c, e), h = Math.min(c + a.nodeSize, t), p = r.addToSet(d);
        for (let m = 0; m < d.length; m++) d[m].isInSet(p) || (o && o.to == f && o.mark.eq(d[m]) ? o.to = h : i.push(o = new Fe(f, h, d[m])));
        l && l.to == f ? l.to = h : s.push(l = new en(f, h, r));
      }
    }), i.forEach((a) => n43.step(a)), s.forEach((a) => n43.step(a));
  }
  function ud(n43, e, t, r) {
    let i = [], s = 0;
    n43.doc.nodesBetween(e, t, (o, l) => {
      if (!o.isInline) return;
      s++;
      let a = null;
      if (r instanceof qt) {
        let c = o.marks, u;
        for (; u = r.isInSet(c); ) (a || (a = [])).push(u), c = u.removeFromSet(c);
      } else r ? r.isInSet(o.marks) && (a = [r]) : a = o.marks;
      if (a && a.length) {
        let c = Math.min(l + o.nodeSize, t);
        for (let u = 0; u < a.length; u++) {
          let d = a[u], f;
          for (let h = 0; h < i.length; h++) {
            let p = i[h];
            p.step == s - 1 && d.eq(i[h].style) && (f = p);
          }
          f ? (f.to = c, f.step = s) : i.push({ style: d, from: Math.max(l, e), to: c, step: s });
        }
      }
    }), i.forEach((o) => n43.step(new Fe(o.from, o.to, o.style)));
  }
  function Ti(n43, e, t, r = t.contentMatch, i = true) {
    let s = n43.doc.nodeAt(e), o = [], l = e + 1;
    for (let a = 0; a < s.childCount; a++) {
      let c = s.child(a), u = l + c.nodeSize, d = r.matchType(c.type);
      if (!d) o.push(new Q(l, u, x.empty));
      else {
        r = d;
        for (let f = 0; f < c.marks.length; f++) t.allowsMarkType(c.marks[f].type) || n43.step(new Fe(l, u, c.marks[f]));
        if (i && c.isText && t.whitespace != "pre") {
          let f, h = /\r?\n|\r/g, p;
          for (; f = h.exec(c.text); ) p || (p = new x(k.from(t.schema.text(" ", t.allowedMarks(c.marks))), 0, 0)), o.push(new Q(l + f.index, l + f.index + f[0].length, p));
        }
      }
      l = u;
    }
    if (!r.validEnd) {
      let a = r.fillBefore(k.empty, true);
      n43.replace(l, l, new x(a, 0, 0));
    }
    for (let a = o.length - 1; a >= 0; a--) n43.step(o[a]);
  }
  function dd(n43, e, t) {
    return (e == 0 || n43.canReplace(e, n43.childCount)) && (t == n43.childCount || n43.canReplace(0, t));
  }
  function He(n43) {
    let t = n43.parent.content.cutByIndex(n43.startIndex, n43.endIndex);
    for (let r = n43.depth, i = 0, s = 0; ; --r) {
      let o = n43.$from.node(r), l = n43.$from.index(r) + i, a = n43.$to.indexAfter(r) - s;
      if (r < n43.depth && o.canReplace(l, a, t)) return r;
      if (r == 0 || o.type.spec.isolating || !dd(o, l, a)) break;
      l && (i = 1), a < o.childCount && (s = 1);
    }
    return null;
  }
  function fd(n43, e, t) {
    let { $from: r, $to: i, depth: s } = e, o = r.before(s + 1), l = i.after(s + 1), a = o, c = l, u = k.empty, d = 0;
    for (let p = s, m = false; p > t; p--) m || r.index(p) > 0 ? (m = true, u = k.from(r.node(p).copy(u)), d++) : a--;
    let f = k.empty, h = 0;
    for (let p = s, m = false; p > t; p--) m || i.after(p + 1) < i.end(p) ? (m = true, f = k.from(i.node(p).copy(f)), h++) : c++;
    n43.step(new U(a, c, o, l, new x(u.append(f), d, h), u.size - d, true));
  }
  function It(n43, e, t = null, r = n43) {
    let i = hd(n43, e), s = i && pd(r, e);
    return s ? i.map(tl).concat({ type: e, attrs: t }).concat(s.map(tl)) : null;
  }
  function tl(n43) {
    return { type: n43, attrs: null };
  }
  function hd(n43, e) {
    let { parent: t, startIndex: r, endIndex: i } = n43, s = t.contentMatchAt(r).findWrapping(e);
    if (!s) return null;
    let o = s.length ? s[0] : e;
    return t.canReplaceWith(r, i, o) ? s : null;
  }
  function pd(n43, e) {
    let { parent: t, startIndex: r, endIndex: i } = n43, s = t.child(r), o = e.contentMatch.findWrapping(s.type);
    if (!o) return null;
    let a = (o.length ? o[o.length - 1] : e).contentMatch;
    for (let c = r; a && c < i; c++) a = a.matchType(t.child(c).type);
    return !a || !a.validEnd ? null : o;
  }
  function md(n43, e, t) {
    let r = k.empty;
    for (let o = t.length - 1; o >= 0; o--) {
      if (r.size) {
        let l = t[o].type.contentMatch.matchFragment(r);
        if (!l || !l.validEnd) throw new RangeError("Wrapper type given to Transform.wrap does not form valid content of its parent wrapper");
      }
      r = k.from(t[o].type.create(t[o].attrs, r));
    }
    let i = e.start, s = e.end;
    n43.step(new U(i, s, i, s, new x(r, 0, 0), t.length, true));
  }
  function gd(n43, e, t, r, i) {
    if (!r.isTextblock) throw new RangeError("Type given to setBlockType should be a textblock");
    let s = n43.steps.length;
    n43.doc.nodesBetween(e, t, (o, l) => {
      let a = typeof i == "function" ? i(o) : i;
      if (o.isTextblock && !o.hasMarkup(r, a) && yd(n43.doc, n43.mapping.slice(s).map(l), r)) {
        let c = null;
        if (r.schema.linebreakReplacement) {
          let h = r.whitespace == "pre", p = !!r.contentMatch.matchType(r.schema.linebreakReplacement);
          h && !p ? c = false : !h && p && (c = true);
        }
        c === false && al(n43, o, l, s), Ti(n43, n43.mapping.slice(s).map(l, 1), r, void 0, c === null);
        let u = n43.mapping.slice(s), d = u.map(l, 1), f = u.map(l + o.nodeSize, 1);
        return n43.step(new U(d, f, d + 1, f - 1, new x(k.from(r.create(a, null, o.marks)), 0, 0), 1, true)), c === true && ll(n43, o, l, s), false;
      }
    });
  }
  function ll(n43, e, t, r) {
    e.forEach((i, s) => {
      if (i.isText) {
        let o, l = /\r?\n|\r/g;
        for (; o = l.exec(i.text); ) {
          let a = n43.mapping.slice(r).map(t + 1 + s + o.index);
          n43.replaceWith(a, a + 1, e.type.schema.linebreakReplacement.create());
        }
      }
    });
  }
  function al(n43, e, t, r) {
    e.forEach((i, s) => {
      if (i.type == i.type.schema.linebreakReplacement) {
        let o = n43.mapping.slice(r).map(t + 1 + s);
        n43.replaceWith(o, o + 1, e.type.schema.text(`
`));
      }
    });
  }
  function yd(n43, e, t) {
    let r = n43.resolve(e), i = r.index();
    return r.parent.canReplaceWith(i, i + 1, t);
  }
  function kd(n43, e, t, r, i) {
    let s = n43.doc.nodeAt(e);
    if (!s) throw new RangeError("No node at given position");
    t || (t = s.type);
    let o = t.create(r, null, i || s.marks);
    if (s.isLeaf) return n43.replaceWith(e, e + s.nodeSize, o);
    if (!t.validContent(s.content)) throw new RangeError("Invalid content for node type " + t.name);
    n43.step(new U(e, e + s.nodeSize, e + 1, e + s.nodeSize - 1, new x(k.from(o), 0, 0), 1, true));
  }
  function ge(n43, e, t = 1, r) {
    let i = n43.resolve(e), s = i.depth - t, o = r && r[r.length - 1] || i.parent;
    if (s < 0 || i.parent.type.spec.isolating || !i.parent.canReplace(i.index(), i.parent.childCount) || !o.type.validContent(i.parent.content.cutByIndex(i.index(), i.parent.childCount))) return false;
    for (let c = i.depth - 1, u = t - 2; c > s; c--, u--) {
      let d = i.node(c), f = i.index(c);
      if (d.type.spec.isolating) return false;
      let h = d.content.cutByIndex(f, d.childCount), p = r && r[u + 1];
      p && (h = h.replaceChild(0, p.type.create(p.attrs)));
      let m = r && r[u] || d;
      if (!d.canReplace(f + 1, d.childCount) || !m.type.validContent(h)) return false;
    }
    let l = i.indexAfter(s), a = r && r[0];
    return i.node(s).canReplaceWith(l, l, a ? a.type : i.node(s + 1).type);
  }
  function bd(n43, e, t = 1, r) {
    let i = n43.doc.resolve(e), s = k.empty, o = k.empty;
    for (let l = i.depth, a = i.depth - t, c = t - 1; l > a; l--, c--) {
      s = k.from(i.node(l).copy(s));
      let u = r && r[c];
      o = k.from(u ? u.type.create(u.attrs, o) : i.node(l).copy(o));
    }
    n43.step(new Q(e, e, new x(s.append(o), t, t), true));
  }
  function ye(n43, e) {
    let t = n43.resolve(e), r = t.index();
    return cl(t.nodeBefore, t.nodeAfter) && t.parent.canReplace(r, r + 1);
  }
  function xd(n43, e) {
    e.content.size || n43.type.compatibleContent(e.type);
    let t = n43.contentMatchAt(n43.childCount), { linebreakReplacement: r } = n43.type.schema;
    for (let i = 0; i < e.childCount; i++) {
      let s = e.child(i), o = s.type == r ? n43.type.schema.nodes.text : s.type;
      if (t = t.matchType(o), !t || !n43.type.allowsMarks(s.marks)) return false;
    }
    return t.validEnd;
  }
  function cl(n43, e) {
    return !!(n43 && e && !n43.isLeaf && xd(n43, e));
  }
  function ct(n43, e, t = -1) {
    let r = n43.resolve(e);
    for (let i = r.depth; ; i--) {
      let s, o, l = r.index(i);
      if (i == r.depth ? (s = r.nodeBefore, o = r.nodeAfter) : t > 0 ? (s = r.node(i + 1), l++, o = r.node(i).maybeChild(l)) : (s = r.node(i).maybeChild(l - 1), o = r.node(i + 1)), s && !s.isTextblock && cl(s, o) && r.node(i).canReplace(l, l + 1)) return e;
      if (i == 0) break;
      e = t < 0 ? r.before(i) : r.after(i);
    }
  }
  function Sd(n43, e, t) {
    let r = null, { linebreakReplacement: i } = n43.doc.type.schema, s = n43.doc.resolve(e - t), o = s.node().type;
    if (i && o.inlineContent) {
      let u = o.whitespace == "pre", d = !!o.contentMatch.matchType(i);
      u && !d ? r = false : !u && d && (r = true);
    }
    let l = n43.steps.length;
    if (r === false) {
      let u = n43.doc.resolve(e + t);
      al(n43, u.node(), u.before(), l);
    }
    o.inlineContent && Ti(n43, e + t - 1, o, s.node().contentMatchAt(s.index()), r == null);
    let a = n43.mapping.slice(l), c = a.map(e - t);
    if (n43.step(new Q(c, a.map(e + t, -1), x.empty, true)), r === true) {
      let u = n43.doc.resolve(c);
      ll(n43, u.node(), u.before(), n43.steps.length);
    }
    return n43;
  }
  function Md(n43, e, t) {
    let r = n43.resolve(e);
    if (r.parent.canReplaceWith(r.index(), r.index(), t)) return e;
    if (r.parentOffset == 0) for (let i = r.depth - 1; i >= 0; i--) {
      let s = r.index(i);
      if (r.node(i).canReplaceWith(s, s, t)) return r.before(i + 1);
      if (s > 0) return null;
    }
    if (r.parentOffset == r.parent.content.size) for (let i = r.depth - 1; i >= 0; i--) {
      let s = r.indexAfter(i);
      if (r.node(i).canReplaceWith(s, s, t)) return r.after(i + 1);
      if (s < r.node(i).childCount) return null;
    }
    return null;
  }
  function jn(n43, e, t) {
    let r = n43.resolve(e);
    if (!t.content.size) return e;
    let i = t.content;
    for (let s = 0; s < t.openStart; s++) i = i.firstChild.content;
    for (let s = 1; s <= (t.openStart == 0 && t.size ? 2 : 1); s++) for (let o = r.depth; o >= 0; o--) {
      let l = o == r.depth ? 0 : r.pos <= (r.start(o + 1) + r.end(o + 1)) / 2 ? -1 : 1, a = r.index(o) + (l > 0 ? 1 : 0), c = r.node(o), u = false;
      if (s == 1) u = c.canReplace(a, a, i);
      else {
        let d = c.contentMatchAt(a).findWrapping(i.firstChild.type);
        u = d && c.canReplaceWith(a, a, d[0]);
      }
      if (u) return l == 0 ? r.pos : l < 0 ? r.before(o + 1) : r.after(o + 1);
    }
    return null;
  }
  function nn(n43, e, t = e, r = x.empty) {
    if (e == t && !r.size) return null;
    let i = n43.resolve(e), s = n43.resolve(t);
    return ul(i, s, r) ? new Q(e, t, r) : new wi(i, s, r).fit();
  }
  function ul(n43, e, t) {
    return !t.openStart && !t.openEnd && n43.start() == e.start() && n43.parent.canReplace(n43.index(), e.index(), t.content);
  }
  var wi = class {
    constructor(e, t, r) {
      this.$from = e, this.$to = t, this.unplaced = r, this.frontier = [], this.placed = k.empty;
      for (let i = 0; i <= e.depth; i++) {
        let s = e.node(i);
        this.frontier.push({ type: s.type, match: s.contentMatchAt(e.indexAfter(i)) });
      }
      for (let i = e.depth; i > 0; i--) this.placed = k.from(e.node(i).copy(this.placed));
    }
    get depth() {
      return this.frontier.length - 1;
    }
    fit() {
      for (; this.unplaced.size; ) {
        let c = this.findFittable();
        c ? this.placeNodes(c) : this.openMore() || this.dropNode();
      }
      let e = this.mustMoveInline(), t = this.placed.size - this.depth - this.$from.depth, r = this.$from, i = this.close(e < 0 ? this.$to : r.doc.resolve(e));
      if (!i) return null;
      let s = this.placed, o = r.depth, l = i.depth;
      for (; o && l && s.childCount == 1; ) s = s.firstChild.content, o--, l--;
      let a = new x(s, o, l);
      return e > -1 ? new U(r.pos, e, this.$to.pos, this.$to.end(), a, t) : a.size || r.pos != this.$to.pos ? new Q(r.pos, i.pos, a) : null;
    }
    findFittable() {
      let e = this.unplaced.openStart;
      for (let t = this.unplaced.content, r = 0, i = this.unplaced.openEnd; r < e; r++) {
        let s = t.firstChild;
        if (t.childCount > 1 && (i = 0), s.type.spec.isolating && i <= r) {
          e = r;
          break;
        }
        t = s.content;
      }
      for (let t = 1; t <= 2; t++) for (let r = t == 1 ? e : this.unplaced.openStart; r >= 0; r--) {
        let i, s = null;
        r ? (s = xi(this.unplaced.content, r - 1).firstChild, i = s.content) : i = this.unplaced.content;
        let o = i.firstChild;
        for (let l = this.depth; l >= 0; l--) {
          let { type: a, match: c } = this.frontier[l], u, d = null;
          if (t == 1 && (o ? c.matchType(o.type) || (d = c.fillBefore(k.from(o), false)) : s && a.compatibleContent(s.type))) return { sliceDepth: r, frontierDepth: l, parent: s, inject: d };
          if (t == 2 && o && (u = c.findWrapping(o.type))) return { sliceDepth: r, frontierDepth: l, parent: s, wrap: u };
          if (s && c.matchType(s.type)) break;
        }
      }
    }
    openMore() {
      let { content: e, openStart: t, openEnd: r } = this.unplaced, i = xi(e, t);
      return !i.childCount || i.firstChild.isLeaf ? false : (this.unplaced = new x(e, t + 1, Math.max(r, i.size + t >= e.size - r ? t + 1 : 0)), true);
    }
    dropNode() {
      let { content: e, openStart: t, openEnd: r } = this.unplaced, i = xi(e, t);
      if (i.childCount <= 1 && t > 0) {
        let s = e.size - t <= t + i.size;
        this.unplaced = new x(Yt(e, t - 1, 1), t - 1, s ? t - 1 : r);
      } else this.unplaced = new x(Yt(e, t, 1), t, r);
    }
    placeNodes({ sliceDepth: e, frontierDepth: t, parent: r, inject: i, wrap: s }) {
      for (; this.depth > t; ) this.closeFrontierNode();
      if (s) for (let m = 0; m < s.length; m++) this.openFrontierNode(s[m]);
      let o = this.unplaced, l = r ? r.content : o.content, a = o.openStart - e, c = 0, u = [], { match: d, type: f } = this.frontier[t];
      if (i) {
        for (let m = 0; m < i.childCount; m++) u.push(i.child(m));
        d = d.matchFragment(i);
      }
      let h = l.size + e - (o.content.size - o.openEnd);
      for (; c < l.childCount; ) {
        let m = l.child(c), g = d.matchType(m.type);
        if (!g) break;
        c++, (c > 1 || a == 0 || m.content.size) && (d = g, u.push(dl(m.mark(f.allowedMarks(m.marks)), c == 1 ? a : 0, c == l.childCount ? h : -1)));
      }
      let p = c == l.childCount;
      p || (h = -1), this.placed = Xt(this.placed, t, k.from(u)), this.frontier[t].match = d, p && h < 0 && r && r.type == this.frontier[this.depth].type && this.frontier.length > 1 && this.closeFrontierNode();
      for (let m = 0, g = l; m < h; m++) {
        let y = g.lastChild;
        this.frontier.push({ type: y.type, match: y.contentMatchAt(y.childCount) }), g = y.content;
      }
      this.unplaced = p ? e == 0 ? x.empty : new x(Yt(o.content, e - 1, 1), e - 1, h < 0 ? o.openEnd : e - 1) : new x(Yt(o.content, e, c), o.openStart, o.openEnd);
    }
    mustMoveInline() {
      if (!this.$to.parent.isTextblock) return -1;
      let e = this.frontier[this.depth], t;
      if (!e.type.isTextblock || !Si(this.$to, this.$to.depth, e.type, e.match, false) || this.$to.depth == this.depth && (t = this.findCloseLevel(this.$to)) && t.depth == this.depth) return -1;
      let { depth: r } = this.$to, i = this.$to.after(r);
      for (; r > 1 && i == this.$to.end(--r); ) ++i;
      return i;
    }
    findCloseLevel(e) {
      e: for (let t = Math.min(this.depth, e.depth); t >= 0; t--) {
        let { match: r, type: i } = this.frontier[t], s = t < e.depth && e.end(t + 1) == e.pos + (e.depth - (t + 1)), o = Si(e, t, i, r, s);
        if (o) {
          for (let l = t - 1; l >= 0; l--) {
            let { match: a, type: c } = this.frontier[l], u = Si(e, l, c, a, true);
            if (!u || u.childCount) continue e;
          }
          return { depth: t, fit: o, move: s ? e.doc.resolve(e.after(t + 1)) : e };
        }
      }
    }
    close(e) {
      let t = this.findCloseLevel(e);
      if (!t) return null;
      for (; this.depth > t.depth; ) this.closeFrontierNode();
      t.fit.childCount && (this.placed = Xt(this.placed, t.depth, t.fit)), e = t.move;
      for (let r = t.depth + 1; r <= e.depth; r++) {
        let i = e.node(r), s = i.type.contentMatch.fillBefore(i.content, true, e.index(r));
        this.openFrontierNode(i.type, i.attrs, s);
      }
      return e;
    }
    openFrontierNode(e, t = null, r) {
      let i = this.frontier[this.depth];
      i.match = i.match.matchType(e), this.placed = Xt(this.placed, this.depth, k.from(e.create(t, r))), this.frontier.push({ type: e, match: e.contentMatch });
    }
    closeFrontierNode() {
      let t = this.frontier.pop().match.fillBefore(k.empty, true);
      t.childCount && (this.placed = Xt(this.placed, this.frontier.length, t));
    }
  };
  function Yt(n43, e, t) {
    return e == 0 ? n43.cutByIndex(t, n43.childCount) : n43.replaceChild(0, n43.firstChild.copy(Yt(n43.firstChild.content, e - 1, t)));
  }
  function Xt(n43, e, t) {
    return e == 0 ? n43.append(t) : n43.replaceChild(n43.childCount - 1, n43.lastChild.copy(Xt(n43.lastChild.content, e - 1, t)));
  }
  function xi(n43, e) {
    for (let t = 0; t < e; t++) n43 = n43.firstChild.content;
    return n43;
  }
  function dl(n43, e, t) {
    if (e <= 0) return n43;
    let r = n43.content;
    return e > 1 && (r = r.replaceChild(0, dl(r.firstChild, e - 1, r.childCount == 1 ? t - 1 : 0))), e > 0 && (r = n43.type.contentMatch.fillBefore(r).append(r), t <= 0 && (r = r.append(n43.type.contentMatch.matchFragment(r).fillBefore(k.empty, true)))), n43.copy(r);
  }
  function Si(n43, e, t, r, i) {
    let s = n43.node(e), o = i ? n43.indexAfter(e) : n43.index(e);
    if (o == s.childCount && !t.compatibleContent(s.type)) return null;
    let l = r.fillBefore(s.content, true, o);
    return l && !wd(t, s.content, o) ? l : null;
  }
  function wd(n43, e, t) {
    for (let r = t; r < e.childCount; r++) if (!n43.allowsMarks(e.child(r).marks)) return true;
    return false;
  }
  function Cd(n43) {
    return n43.spec.defining || n43.spec.definingForContent;
  }
  function Td(n43, e, t, r) {
    if (!r.size) return n43.deleteRange(e, t);
    let i = n43.doc.resolve(e), s = n43.doc.resolve(t);
    if (ul(i, s, r)) return n43.step(new Q(e, t, r));
    let o = hl(i, s);
    o[o.length - 1] == 0 && o.pop();
    let l = -(i.depth + 1);
    o.unshift(l);
    for (let f = i.depth, h = i.pos - 1; f > 0; f--, h--) {
      let p = i.node(f).type.spec;
      if (p.defining || p.definingAsContext || p.isolating) break;
      o.indexOf(f) > -1 ? l = f : i.before(f) == h && o.splice(1, 0, -f);
    }
    let a = o.indexOf(l), c = [], u = r.openStart;
    for (let f = r.content, h = 0; ; h++) {
      let p = f.firstChild;
      if (c.push(p), h == r.openStart) break;
      f = p.content;
    }
    for (let f = u - 1; f >= 0; f--) {
      let h = c[f], p = Cd(h.type);
      if (p && !h.sameMarkup(i.node(Math.abs(l) - 1))) u = f;
      else if (p || !h.type.isTextblock) break;
    }
    for (let f = r.openStart; f >= 0; f--) {
      let h = (f + u + 1) % (r.openStart + 1), p = c[h];
      if (p) for (let m = 0; m < o.length; m++) {
        let g = o[(m + a) % o.length], y = true;
        g < 0 && (y = false, g = -g);
        let S = i.node(g - 1), w = i.index(g - 1);
        if (S.canReplaceWith(w, w, p.type, p.marks)) return n43.replace(i.before(g), y ? s.after(g) : t, new x(fl(r.content, 0, r.openStart, h), h, r.openEnd));
      }
    }
    let d = n43.steps.length;
    for (let f = o.length - 1; f >= 0 && (n43.replace(e, t, r), !(n43.steps.length > d)); f--) {
      let h = o[f];
      h < 0 || (e = i.before(h), t = s.after(h));
    }
  }
  function fl(n43, e, t, r, i) {
    if (e < t) {
      let s = n43.firstChild;
      n43 = n43.replaceChild(0, s.copy(fl(s.content, e + 1, t, r, s)));
    }
    if (e > r) {
      let s = i.contentMatchAt(0), o = s.fillBefore(n43).append(n43);
      n43 = o.append(s.matchFragment(o).fillBefore(k.empty, true));
    }
    return n43;
  }
  function vd(n43, e, t, r) {
    if (!r.isInline && e == t && n43.doc.resolve(e).parent.content.size) {
      let i = Md(n43.doc, e, r.type);
      i != null && (e = t = i);
    }
    n43.replaceRange(e, t, new x(k.from(r), 0, 0));
  }
  function Ed(n43, e, t) {
    let r = n43.doc.resolve(e), i = n43.doc.resolve(t);
    if (r.parent.isTextblock && i.parent.isTextblock && r.start() != i.start() && r.parentOffset == 0 && i.parentOffset == 0) {
      let o = r.sharedDepth(t), l = false;
      for (let a = r.depth; a > o; a--) r.node(a).type.spec.isolating && (l = true);
      for (let a = i.depth; a > o; a--) i.node(a).type.spec.isolating && (l = true);
      if (!l) {
        for (let a = r.depth; a > 0 && e == r.start(a); a--) e = r.before(a);
        for (let a = i.depth; a > 0 && t == i.start(a); a--) t = i.before(a);
        r = n43.doc.resolve(e), i = n43.doc.resolve(t);
      }
    }
    let s = hl(r, i);
    for (let o = 0; o < s.length; o++) {
      let l = s[o], a = o == s.length - 1;
      if (a && l == 0 || r.node(l).type.contentMatch.validEnd) return n43.delete(r.start(l), i.end(l));
      if (l > 0 && (a || r.node(l - 1).canReplace(r.index(l - 1), i.indexAfter(l - 1)))) return n43.delete(r.before(l), i.after(l));
    }
    for (let o = 1; o <= r.depth && o <= i.depth; o++) if (e - r.start(o) == r.depth - o && t > r.end(o) && i.end(o) - t != i.depth - o && r.start(o - 1) == i.start(o - 1) && r.node(o - 1).canReplace(r.index(o - 1), i.index(o - 1))) return n43.delete(r.before(o), t);
    n43.delete(e, t);
  }
  function hl(n43, e) {
    let t = [], r = Math.min(n43.depth, e.depth);
    for (let i = r; i >= 0; i--) {
      let s = n43.start(i);
      if (s < n43.pos - (n43.depth - i) || e.end(i) > e.pos + (e.depth - i) || n43.node(i).type.spec.isolating || e.node(i).type.spec.isolating) break;
      (s == e.start(i) || i == n43.depth && i == e.depth && n43.parent.inlineContent && e.parent.inlineContent && i && e.start(i - 1) == s - 1) && t.push(i);
    }
    return t;
  }
  var _n = class n21 extends Y {
    constructor(e, t, r) {
      super(), this.pos = e, this.attr = t, this.value = r;
    }
    apply(e) {
      let t = e.nodeAt(this.pos);
      if (!t) return X.fail("No node at attribute step's position");
      let r = /* @__PURE__ */ Object.create(null);
      for (let s in t.attrs) r[s] = t.attrs[s];
      r[this.attr] = this.value;
      let i = t.type.create(r, null, t.marks);
      return X.fromReplace(e, this.pos, this.pos + 1, new x(k.from(i), 0, t.isLeaf ? 0 : 1));
    }
    getMap() {
      return Be.empty;
    }
    invert(e) {
      return new n21(this.pos, this.attr, e.nodeAt(this.pos).attrs[this.attr]);
    }
    map(e) {
      let t = e.mapResult(this.pos, 1);
      return t.deletedAfter ? null : new n21(t.pos, this.attr, this.value);
    }
    toJSON() {
      return { stepType: "attr", pos: this.pos, attr: this.attr, value: this.value };
    }
    static fromJSON(e, t) {
      if (typeof t.pos != "number" || typeof t.attr != "string") throw new RangeError("Invalid input for AttrStep.fromJSON");
      return new n21(t.pos, t.attr, t.value);
    }
  };
  Y.jsonID("attr", _n);
  var Vn = class n22 extends Y {
    constructor(e, t) {
      super(), this.attr = e, this.value = t;
    }
    apply(e) {
      let t = /* @__PURE__ */ Object.create(null);
      for (let i in e.attrs) t[i] = e.attrs[i];
      t[this.attr] = this.value;
      let r = e.type.create(t, e.content, e.marks);
      return X.ok(r);
    }
    getMap() {
      return Be.empty;
    }
    invert(e) {
      return new n22(this.attr, e.attrs[this.attr]);
    }
    map(e) {
      return this;
    }
    toJSON() {
      return { stepType: "docAttr", attr: this.attr, value: this.value };
    }
    static fromJSON(e, t) {
      if (typeof t.attr != "string") throw new RangeError("Invalid input for DocAttrStep.fromJSON");
      return new n22(t.attr, t.value);
    }
  };
  Y.jsonID("docAttr", Vn);
  var Nt = class extends Error {
  };
  Nt = function n23(e) {
    let t = Error.call(this, e);
    return t.__proto__ = n23.prototype, t;
  };
  Nt.prototype = Object.create(Error.prototype);
  Nt.prototype.constructor = Nt;
  Nt.prototype.name = "TransformError";
  var Ot = class {
    constructor(e) {
      this.doc = e, this.steps = [], this.docs = [], this.mapping = new Zt();
    }
    get before() {
      return this.docs.length ? this.docs[0] : this.doc;
    }
    step(e) {
      let t = this.maybeStep(e);
      if (t.failed) throw new Nt(t.failed);
      return this;
    }
    maybeStep(e) {
      let t = e.apply(this.doc);
      return t.failed || this.addStep(e, t.doc), t;
    }
    get docChanged() {
      return this.steps.length > 0;
    }
    changedRange() {
      let e = 1e9, t = -1e9;
      for (let r = 0; r < this.mapping.maps.length; r++) {
        let i = this.mapping.maps[r];
        r && (e = i.map(e, 1), t = i.map(t, -1)), i.forEach((s, o, l, a) => {
          e = Math.min(e, l), t = Math.max(t, a);
        });
      }
      return e == 1e9 ? null : { from: e, to: t };
    }
    addStep(e, t) {
      this.docs.push(this.doc), this.steps.push(e), this.mapping.appendMap(e.getMap()), this.doc = t;
    }
    replace(e, t = e, r = x.empty) {
      let i = nn(this.doc, e, t, r);
      return i && this.step(i), this;
    }
    replaceWith(e, t, r) {
      return this.replace(e, t, new x(k.from(r), 0, 0));
    }
    delete(e, t) {
      return this.replace(e, t, x.empty);
    }
    insert(e, t) {
      return this.replaceWith(e, e, t);
    }
    replaceRange(e, t, r) {
      return Td(this, e, t, r), this;
    }
    replaceRangeWith(e, t, r) {
      return vd(this, e, t, r), this;
    }
    deleteRange(e, t) {
      return Ed(this, e, t), this;
    }
    lift(e, t) {
      return fd(this, e, t), this;
    }
    join(e, t = 1) {
      return Sd(this, e, t), this;
    }
    wrap(e, t) {
      return md(this, e, t), this;
    }
    setBlockType(e, t = e, r, i = null) {
      return gd(this, e, t, r, i), this;
    }
    setNodeMarkup(e, t, r = null, i) {
      return kd(this, e, t, r, i), this;
    }
    setNodeAttribute(e, t, r) {
      return this.step(new _n(e, t, r)), this;
    }
    setDocAttribute(e, t) {
      return this.step(new Vn(e, t)), this;
    }
    addNodeMark(e, t) {
      return this.step(new tn(e, t)), this;
    }
    removeNodeMark(e, t) {
      let r = this.doc.nodeAt(e);
      if (!r) throw new RangeError("No node at position " + e);
      if (t instanceof F) t.isInSet(r.marks) && this.step(new At(e, t));
      else {
        let i = r.marks, s, o = [];
        for (; s = t.isInSet(i); ) o.push(new At(e, s)), i = s.removeFromSet(i);
        for (let l = o.length - 1; l >= 0; l--) this.step(o[l]);
      }
      return this;
    }
    split(e, t = 1, r) {
      return bd(this, e, t, r), this;
    }
    addMark(e, t, r) {
      return cd(this, e, t, r), this;
    }
    removeMark(e, t, r) {
      return ud(this, e, t, r), this;
    }
    clearIncompatible(e, t, r) {
      return Ti(this, e, t, r), this;
    }
  };
  var vi = /* @__PURE__ */ Object.create(null);
  var N = class {
    constructor(e, t, r) {
      this.$anchor = e, this.$head = t, this.ranges = r || [new Kn(e.min(t), e.max(t))];
    }
    get anchor() {
      return this.$anchor.pos;
    }
    get head() {
      return this.$head.pos;
    }
    get from() {
      return this.$from.pos;
    }
    get to() {
      return this.$to.pos;
    }
    get $from() {
      return this.ranges[0].$from;
    }
    get $to() {
      return this.ranges[0].$to;
    }
    get empty() {
      let e = this.ranges;
      for (let t = 0; t < e.length; t++) if (e[t].$from.pos != e[t].$to.pos) return false;
      return true;
    }
    content() {
      return this.$from.doc.slice(this.from, this.to, true);
    }
    replace(e, t = x.empty) {
      let r = t.content.lastChild, i = null;
      for (let l = 0; l < t.openEnd; l++) i = r, r = r.lastChild;
      let s = e.steps.length, o = this.ranges;
      for (let l = 0; l < o.length; l++) {
        let { $from: a, $to: c } = o[l], u = e.mapping.slice(s);
        e.replaceRange(u.map(a.pos), u.map(c.pos), l ? x.empty : t), l == 0 && gl(e, s, (r ? r.isInline : i && i.isTextblock) ? -1 : 1);
      }
    }
    replaceWith(e, t) {
      let r = e.steps.length, i = this.ranges;
      for (let s = 0; s < i.length; s++) {
        let { $from: o, $to: l } = i[s], a = e.mapping.slice(r), c = a.map(o.pos), u = a.map(l.pos);
        s ? e.deleteRange(c, u) : (e.replaceRangeWith(c, u, t), gl(e, r, t.isInline ? -1 : 1));
      }
    }
    static findFrom(e, t, r = false) {
      let i = e.parent.inlineContent ? new E(e) : Rt(e.node(0), e.parent, e.pos, e.index(), t, r);
      if (i) return i;
      for (let s = e.depth - 1; s >= 0; s--) {
        let o = t < 0 ? Rt(e.node(0), e.node(s), e.before(s + 1), e.index(s), t, r) : Rt(e.node(0), e.node(s), e.after(s + 1), e.index(s) + 1, t, r);
        if (o) return o;
      }
      return null;
    }
    static near(e, t = 1) {
      return this.findFrom(e, t) || this.findFrom(e, -t) || new ae(e.node(0));
    }
    static atStart(e) {
      return Rt(e, e, 0, 0, 1) || new ae(e);
    }
    static atEnd(e) {
      return Rt(e, e, e.content.size, e.childCount, -1) || new ae(e);
    }
    static fromJSON(e, t) {
      if (!t || !t.type) throw new RangeError("Invalid input for Selection.fromJSON");
      let r = vi[t.type];
      if (!r) throw new RangeError(`No selection type ${t.type} defined`);
      return r.fromJSON(e, t);
    }
    static jsonID(e, t) {
      if (e in vi) throw new RangeError("Duplicate use of selection JSON ID " + e);
      return vi[e] = t, t.prototype.jsonID = e, t;
    }
    getBookmark() {
      return E.between(this.$anchor, this.$head).getBookmark();
    }
  };
  N.prototype.visible = true;
  var Kn = class {
    constructor(e, t) {
      this.$from = e, this.$to = t;
    }
  };
  var pl = false;
  function ml(n43) {
    !pl && !n43.parent.inlineContent && (pl = true, console.warn("TextSelection endpoint not pointing into a node with inline content (" + n43.parent.type.name + ")"));
  }
  var E = class n24 extends N {
    constructor(e, t = e) {
      ml(e), ml(t), super(e, t);
    }
    get $cursor() {
      return this.$anchor.pos == this.$head.pos ? this.$head : null;
    }
    map(e, t) {
      let r = e.resolve(t.map(this.head));
      if (!r.parent.inlineContent) return N.near(r);
      let i = e.resolve(t.map(this.anchor));
      return new n24(i.parent.inlineContent ? i : r, r);
    }
    replace(e, t = x.empty) {
      if (super.replace(e, t), t == x.empty) {
        let r = this.$from.marksAcross(this.$to);
        r && e.ensureMarks(r);
      }
    }
    eq(e) {
      return e instanceof n24 && e.anchor == this.anchor && e.head == this.head;
    }
    getBookmark() {
      return new Un(this.anchor, this.head);
    }
    toJSON() {
      return { type: "text", anchor: this.anchor, head: this.head };
    }
    static fromJSON(e, t) {
      if (typeof t.anchor != "number" || typeof t.head != "number") throw new RangeError("Invalid input for TextSelection.fromJSON");
      return new n24(e.resolve(t.anchor), e.resolve(t.head));
    }
    static create(e, t, r = t) {
      let i = e.resolve(t);
      return new this(i, r == t ? i : e.resolve(r));
    }
    static between(e, t, r) {
      let i = e.pos - t.pos;
      if ((!r || i) && (r = i >= 0 ? 1 : -1), !t.parent.inlineContent) {
        let s = N.findFrom(t, r, true) || N.findFrom(t, -r, true);
        if (s) t = s.$head;
        else return N.near(t, r);
      }
      return e.parent.inlineContent || (i == 0 ? e = t : (e = (N.findFrom(e, -r, true) || N.findFrom(e, r, true)).$anchor, e.pos < t.pos != i < 0 && (e = t))), new n24(e, t);
    }
  };
  N.jsonID("text", E);
  var Un = class n25 {
    constructor(e, t) {
      this.anchor = e, this.head = t;
    }
    map(e) {
      return new n25(e.map(this.anchor), e.map(this.head));
    }
    resolve(e) {
      return E.between(e.resolve(this.anchor), e.resolve(this.head));
    }
  };
  var C = class n26 extends N {
    constructor(e) {
      let t = e.nodeAfter, r = e.node(0).resolve(e.pos + t.nodeSize);
      super(e, r), this.node = t;
    }
    map(e, t) {
      let { deleted: r, pos: i } = t.mapResult(this.anchor), s = e.resolve(i);
      return r ? N.near(s) : new n26(s);
    }
    content() {
      return new x(k.from(this.node), 0, 0);
    }
    eq(e) {
      return e instanceof n26 && e.anchor == this.anchor;
    }
    toJSON() {
      return { type: "node", anchor: this.anchor };
    }
    getBookmark() {
      return new Ai(this.anchor);
    }
    static fromJSON(e, t) {
      if (typeof t.anchor != "number") throw new RangeError("Invalid input for NodeSelection.fromJSON");
      return new n26(e.resolve(t.anchor));
    }
    static create(e, t) {
      return new n26(e.resolve(t));
    }
    static isSelectable(e) {
      return !e.isText && e.type.spec.selectable !== false;
    }
  };
  C.prototype.visible = false;
  N.jsonID("node", C);
  var Ai = class n27 {
    constructor(e) {
      this.anchor = e;
    }
    map(e) {
      let { deleted: t, pos: r } = e.mapResult(this.anchor);
      return t ? new Un(r, r) : new n27(r);
    }
    resolve(e) {
      let t = e.resolve(this.anchor), r = t.nodeAfter;
      return r && C.isSelectable(r) ? new C(t) : N.near(t);
    }
  };
  var ae = class n28 extends N {
    constructor(e) {
      super(e.resolve(0), e.resolve(e.content.size));
    }
    replace(e, t = x.empty) {
      if (t == x.empty) {
        e.delete(0, e.doc.content.size);
        let r = N.atStart(e.doc);
        r.eq(e.selection) || e.setSelection(r);
      } else super.replace(e, t);
    }
    toJSON() {
      return { type: "all" };
    }
    static fromJSON(e) {
      return new n28(e);
    }
    map(e) {
      return new n28(e);
    }
    eq(e) {
      return e instanceof n28;
    }
    getBookmark() {
      return Ad;
    }
  };
  N.jsonID("all", ae);
  var Ad = { map() {
    return this;
  }, resolve(n43) {
    return new ae(n43);
  } };
  function Rt(n43, e, t, r, i, s = false) {
    if (e.inlineContent) return E.create(n43, t);
    for (let o = r - (i > 0 ? 0 : 1); i > 0 ? o < e.childCount : o >= 0; o += i) {
      let l = e.child(o);
      if (l.isAtom) {
        if (!s && C.isSelectable(l)) return C.create(n43, t - (i < 0 ? l.nodeSize : 0));
      } else {
        let a = Rt(n43, l, t + i, i < 0 ? l.childCount : 0, i, s);
        if (a) return a;
      }
      t += l.nodeSize * i;
    }
    return null;
  }
  function gl(n43, e, t) {
    let r = n43.steps.length - 1;
    if (r < e) return;
    let i = n43.steps[r];
    if (!(i instanceof Q || i instanceof U)) return;
    let s = n43.mapping.maps[r], o;
    s.forEach((l, a, c, u) => {
      o == null && (o = u);
    }), n43.setSelection(N.near(n43.doc.resolve(o), t));
  }
  var yl = 1;
  var Wn = 2;
  var kl = 4;
  var Ni = class extends Ot {
    constructor(e) {
      super(e.doc), this.curSelectionFor = 0, this.updated = 0, this.meta = /* @__PURE__ */ Object.create(null), this.time = Date.now(), this.curSelection = e.selection, this.storedMarks = e.storedMarks;
    }
    get selection() {
      return this.curSelectionFor < this.steps.length && (this.curSelection = this.curSelection.map(this.doc, this.mapping.slice(this.curSelectionFor)), this.curSelectionFor = this.steps.length), this.curSelection;
    }
    setSelection(e) {
      if (e.$from.doc != this.doc) throw new RangeError("Selection passed to setSelection must point at the current document");
      return this.curSelection = e, this.curSelectionFor = this.steps.length, this.updated = (this.updated | yl) & ~Wn, this.storedMarks = null, this;
    }
    get selectionSet() {
      return (this.updated & yl) > 0;
    }
    setStoredMarks(e) {
      return this.storedMarks = e, this.updated |= Wn, this;
    }
    ensureMarks(e) {
      return F.sameSet(this.storedMarks || this.selection.$from.marks(), e) || this.setStoredMarks(e), this;
    }
    addStoredMark(e) {
      return this.ensureMarks(e.addToSet(this.storedMarks || this.selection.$head.marks()));
    }
    removeStoredMark(e) {
      return this.ensureMarks(e.removeFromSet(this.storedMarks || this.selection.$head.marks()));
    }
    get storedMarksSet() {
      return (this.updated & Wn) > 0;
    }
    addStep(e, t) {
      super.addStep(e, t), this.updated = this.updated & ~Wn, this.storedMarks = null;
    }
    setTime(e) {
      return this.time = e, this;
    }
    replaceSelection(e) {
      return this.selection.replace(this, e), this;
    }
    replaceSelectionWith(e, t = true) {
      let r = this.selection;
      return t && (e = e.mark(this.storedMarks || (r.empty ? r.$from.marks() : r.$from.marksAcross(r.$to) || F.none))), r.replaceWith(this, e), this;
    }
    deleteSelection() {
      return this.selection.replace(this), this;
    }
    insertText(e, t, r) {
      let i = this.doc.type.schema;
      if (t == null) return e ? this.replaceSelectionWith(i.text(e), true) : this.deleteSelection();
      {
        if (r == null && (r = t), !e) return this.deleteRange(t, r);
        let s = this.storedMarks;
        if (!s) {
          let o = this.doc.resolve(t);
          s = r == t ? o.marks() : o.marksAcross(this.doc.resolve(r));
        }
        return this.replaceRangeWith(t, r, i.text(e, s)), !this.selection.empty && this.selection.to == t + e.length && this.setSelection(N.near(this.selection.$to)), this;
      }
    }
    setMeta(e, t) {
      return this.meta[typeof e == "string" ? e : e.key] = t, this;
    }
    getMeta(e) {
      return this.meta[typeof e == "string" ? e : e.key];
    }
    get isGeneric() {
      for (let e in this.meta) return false;
      return true;
    }
    scrollIntoView() {
      return this.updated |= kl, this;
    }
    get scrolledIntoView() {
      return (this.updated & kl) > 0;
    }
  };
  function bl(n43, e) {
    return !e || !n43 ? n43 : n43.bind(e);
  }
  var ut = class {
    constructor(e, t, r) {
      this.name = e, this.init = bl(t.init, r), this.apply = bl(t.apply, r);
    }
  };
  var Nd = [new ut("doc", { init(n43) {
    return n43.doc || n43.schema.topNodeType.createAndFill();
  }, apply(n43) {
    return n43.doc;
  } }), new ut("selection", { init(n43, e) {
    return n43.selection || N.atStart(e.doc);
  }, apply(n43) {
    return n43.selection;
  } }), new ut("storedMarks", { init(n43) {
    return n43.storedMarks || null;
  }, apply(n43, e, t, r) {
    return r.selection.$cursor ? n43.storedMarks : null;
  } }), new ut("scrollToSelection", { init() {
    return 0;
  }, apply(n43, e) {
    return n43.scrolledIntoView ? e + 1 : e;
  } })];
  var rn = class {
    constructor(e, t) {
      this.schema = e, this.plugins = [], this.pluginsByKey = /* @__PURE__ */ Object.create(null), this.fields = Nd.slice(), t && t.forEach((r) => {
        if (this.pluginsByKey[r.key]) throw new RangeError("Adding different instances of a keyed plugin (" + r.key + ")");
        this.plugins.push(r), this.pluginsByKey[r.key] = r, r.spec.state && this.fields.push(new ut(r.key, r.spec.state, r));
      });
    }
  };
  var Jn = class n29 {
    constructor(e) {
      this.config = e;
    }
    get schema() {
      return this.config.schema;
    }
    get plugins() {
      return this.config.plugins;
    }
    apply(e) {
      return this.applyTransaction(e).state;
    }
    filterTransaction(e, t = -1) {
      for (let r = 0; r < this.config.plugins.length; r++) if (r != t) {
        let i = this.config.plugins[r];
        if (i.spec.filterTransaction && !i.spec.filterTransaction.call(i, e, this)) return false;
      }
      return true;
    }
    applyTransaction(e) {
      if (!this.filterTransaction(e)) return { state: this, transactions: [] };
      let t = [e], r = this.applyInner(e), i = null;
      for (; ; ) {
        let s = false;
        for (let o = 0; o < this.config.plugins.length; o++) {
          let l = this.config.plugins[o];
          if (l.spec.appendTransaction) {
            let a = i ? i[o].n : 0, c = i ? i[o].state : this, u = a < t.length && l.spec.appendTransaction.call(l, a ? t.slice(a) : t, c, r);
            if (u && r.filterTransaction(u, o)) {
              if (u.setMeta("appendedTransaction", e), !i) {
                i = [];
                for (let d = 0; d < this.config.plugins.length; d++) i.push(d < o ? { state: r, n: t.length } : { state: this, n: 0 });
              }
              t.push(u), r = r.applyInner(u), s = true;
            }
            i && (i[o] = { state: r, n: t.length });
          }
        }
        if (!s) return { state: r, transactions: t };
      }
    }
    applyInner(e) {
      if (!e.before.eq(this.doc)) throw new RangeError("Applying a mismatched transaction");
      let t = new n29(this.config), r = this.config.fields;
      for (let i = 0; i < r.length; i++) {
        let s = r[i];
        t[s.name] = s.apply(e, this[s.name], this, t);
      }
      return t;
    }
    get tr() {
      return new Ni(this);
    }
    static create(e) {
      let t = new rn(e.doc ? e.doc.type.schema : e.schema, e.plugins), r = new n29(t);
      for (let i = 0; i < t.fields.length; i++) r[t.fields[i].name] = t.fields[i].init(e, r);
      return r;
    }
    reconfigure(e) {
      let t = new rn(this.schema, e.plugins), r = t.fields, i = new n29(t);
      for (let s = 0; s < r.length; s++) {
        let o = r[s].name;
        i[o] = this.hasOwnProperty(o) ? this[o] : r[s].init(e, i);
      }
      return i;
    }
    toJSON(e) {
      let t = { doc: this.doc.toJSON(), selection: this.selection.toJSON() };
      if (this.storedMarks && (t.storedMarks = this.storedMarks.map((r) => r.toJSON())), e && typeof e == "object") for (let r in e) {
        if (r == "doc" || r == "selection") throw new RangeError("The JSON fields `doc` and `selection` are reserved");
        let i = e[r], s = i.spec.state;
        s && s.toJSON && (t[r] = s.toJSON.call(i, this[i.key]));
      }
      return t;
    }
    static fromJSON(e, t, r) {
      if (!t) throw new RangeError("Invalid input for EditorState.fromJSON");
      if (!e.schema) throw new RangeError("Required config field 'schema' missing");
      let i = new rn(e.schema, e.plugins), s = new n29(i);
      return i.fields.forEach((o) => {
        if (o.name == "doc") s.doc = fe.fromJSON(e.schema, t.doc);
        else if (o.name == "selection") s.selection = N.fromJSON(s.doc, t.selection);
        else if (o.name == "storedMarks") t.storedMarks && (s.storedMarks = t.storedMarks.map(e.schema.markFromJSON));
        else {
          if (r) for (let l in r) {
            let a = r[l], c = a.spec.state;
            if (a.key == o.name && c && c.fromJSON && Object.prototype.hasOwnProperty.call(t, l)) {
              s[o.name] = c.fromJSON.call(a, e, t[l], s);
              return;
            }
          }
          s[o.name] = o.init(e, s);
        }
      }), s;
    }
  };
  function xl(n43, e, t) {
    for (let r in n43) {
      let i = n43[r];
      i instanceof Function ? i = i.bind(e) : r == "handleDOMEvents" && (i = xl(i, e, {})), t[r] = i;
    }
    return t;
  }
  var O = class {
    constructor(e) {
      this.spec = e, this.props = {}, e.props && xl(e.props, this, this.props), this.key = e.key ? e.key.key : Sl("plugin");
    }
    getState(e) {
      return e[this.key];
    }
  };
  var Ei = /* @__PURE__ */ Object.create(null);
  function Sl(n43) {
    return n43 in Ei ? n43 + "$" + ++Ei[n43] : (Ei[n43] = 0, n43 + "$");
  }
  var R = class {
    constructor(e = "key") {
      this.key = Sl(e);
    }
    get(e) {
      return e.config.pluginsByKey[this.key];
    }
    getState(e) {
      return e[this.key];
    }
  };
  var wl = (n43, e) => n43.selection.empty ? false : (e && e(n43.tr.deleteSelection().scrollIntoView()), true);
  function Cl(n43, e) {
    let { $cursor: t } = n43.selection;
    return !t || (e ? !e.endOfTextblock("backward", n43) : t.parentOffset > 0) ? null : t;
  }
  var Ii = (n43, e, t) => {
    let r = Cl(n43, t);
    if (!r) return false;
    let i = Di(r);
    if (!i) {
      let o = r.blockRange(), l = o && He(o);
      return l == null ? false : (e && e(n43.tr.lift(o, l).scrollIntoView()), true);
    }
    let s = i.nodeBefore;
    if (Dl(n43, i, e, -1)) return true;
    if (r.parent.content.size == 0 && (Dt(s, "end") || C.isSelectable(s))) for (let o = r.depth; ; o--) {
      let l = nn(n43.doc, r.before(o), r.after(o), x.empty);
      if (l && l.slice.size < l.to - l.from) {
        if (e) {
          let a = n43.tr.step(l);
          a.setSelection(Dt(s, "end") ? N.findFrom(a.doc.resolve(a.mapping.map(i.pos, -1)), -1) : C.create(a.doc, i.pos - s.nodeSize)), e(a.scrollIntoView());
        }
        return true;
      }
      if (o == 1 || r.node(o - 1).childCount > 1) break;
    }
    return s.isAtom && i.depth == r.depth - 1 ? (e && e(n43.tr.delete(i.pos - s.nodeSize, i.pos).scrollIntoView()), true) : false;
  };
  var Tl = (n43, e, t) => {
    let r = Cl(n43, t);
    if (!r) return false;
    let i = Di(r);
    return i ? El(n43, i, e) : false;
  };
  var vl = (n43, e, t) => {
    let r = Al(n43, t);
    if (!r) return false;
    let i = zi(r);
    return i ? El(n43, i, e) : false;
  };
  function El(n43, e, t) {
    let r = e.nodeBefore, i = r, s = e.pos - 1;
    for (; !i.isTextblock; s--) {
      if (i.type.spec.isolating) return false;
      let u = i.lastChild;
      if (!u) return false;
      i = u;
    }
    let o = e.nodeAfter, l = o, a = e.pos + 1;
    for (; !l.isTextblock; a++) {
      if (l.type.spec.isolating) return false;
      let u = l.firstChild;
      if (!u) return false;
      l = u;
    }
    let c = nn(n43.doc, s, a, x.empty);
    if (!c || c.from != s || c instanceof Q && c.slice.size >= a - s) return false;
    if (t) {
      let u = n43.tr.step(c);
      u.setSelection(E.create(u.doc, s)), t(u.scrollIntoView());
    }
    return true;
  }
  function Dt(n43, e, t = false) {
    for (let r = n43; r; r = e == "start" ? r.firstChild : r.lastChild) {
      if (r.isTextblock) return true;
      if (t && r.childCount != 1) return false;
    }
    return false;
  }
  var Ri = (n43, e, t) => {
    let { $head: r, empty: i } = n43.selection, s = r;
    if (!i) return false;
    if (r.parent.isTextblock) {
      if (t ? !t.endOfTextblock("backward", n43) : r.parentOffset > 0) return false;
      s = Di(r);
    }
    let o = s && s.nodeBefore;
    return !o || !C.isSelectable(o) ? false : (e && e(n43.tr.setSelection(C.create(n43.doc, s.pos - o.nodeSize)).scrollIntoView()), true);
  };
  function Di(n43) {
    if (!n43.parent.type.spec.isolating) for (let e = n43.depth - 1; e >= 0; e--) {
      if (n43.index(e) > 0) return n43.doc.resolve(n43.before(e + 1));
      if (n43.node(e).type.spec.isolating) break;
    }
    return null;
  }
  function Al(n43, e) {
    let { $cursor: t } = n43.selection;
    return !t || (e ? !e.endOfTextblock("forward", n43) : t.parentOffset < t.parent.content.size) ? null : t;
  }
  var Pi = (n43, e, t) => {
    let r = Al(n43, t);
    if (!r) return false;
    let i = zi(r);
    if (!i) return false;
    let s = i.nodeAfter;
    if (Dl(n43, i, e, 1)) return true;
    if (r.parent.content.size == 0 && (Dt(s, "start") || C.isSelectable(s))) {
      let o = nn(n43.doc, r.before(), r.after(), x.empty);
      if (o && o.slice.size < o.to - o.from) {
        if (e) {
          let l = n43.tr.step(o);
          l.setSelection(Dt(s, "start") ? N.findFrom(l.doc.resolve(l.mapping.map(i.pos)), 1) : C.create(l.doc, l.mapping.map(i.pos))), e(l.scrollIntoView());
        }
        return true;
      }
    }
    return s.isAtom && i.depth == r.depth - 1 ? (e && e(n43.tr.delete(i.pos, i.pos + s.nodeSize).scrollIntoView()), true) : false;
  };
  var Li = (n43, e, t) => {
    let { $head: r, empty: i } = n43.selection, s = r;
    if (!i) return false;
    if (r.parent.isTextblock) {
      if (t ? !t.endOfTextblock("forward", n43) : r.parentOffset < r.parent.content.size) return false;
      s = zi(r);
    }
    let o = s && s.nodeAfter;
    return !o || !C.isSelectable(o) ? false : (e && e(n43.tr.setSelection(C.create(n43.doc, s.pos)).scrollIntoView()), true);
  };
  function zi(n43) {
    if (!n43.parent.type.spec.isolating) for (let e = n43.depth - 1; e >= 0; e--) {
      let t = n43.node(e);
      if (n43.index(e) + 1 < t.childCount) return n43.doc.resolve(n43.after(e + 1));
      if (t.type.spec.isolating) break;
    }
    return null;
  }
  var Nl = (n43, e) => {
    let t = n43.selection, r = t instanceof C, i;
    if (r) {
      if (t.node.isTextblock || !ye(n43.doc, t.from)) return false;
      i = t.from;
    } else if (i = ct(n43.doc, t.from, -1), i == null) return false;
    if (e) {
      let s = n43.tr.join(i);
      r && s.setSelection(C.create(s.doc, i - n43.doc.resolve(i).nodeBefore.nodeSize)), e(s.scrollIntoView());
    }
    return true;
  };
  var Ol = (n43, e) => {
    let t = n43.selection, r;
    if (t instanceof C) {
      if (t.node.isTextblock || !ye(n43.doc, t.to)) return false;
      r = t.to;
    } else if (r = ct(n43.doc, t.to, 1), r == null) return false;
    return e && e(n43.tr.join(r).scrollIntoView()), true;
  };
  var Il = (n43, e) => {
    let { $from: t, $to: r } = n43.selection, i = t.blockRange(r), s = i && He(i);
    return s == null ? false : (e && e(n43.tr.lift(i, s).scrollIntoView()), true);
  };
  var Bi = (n43, e) => {
    let { $head: t, $anchor: r } = n43.selection;
    return !t.parent.type.spec.code || !t.sameParent(r) ? false : (e && e(n43.tr.insertText(`
`).scrollIntoView()), true);
  };
  function Fi(n43) {
    for (let e = 0; e < n43.edgeCount; e++) {
      let { type: t } = n43.edge(e);
      if (t.isTextblock && !t.hasRequiredAttrs()) return t;
    }
    return null;
  }
  var Hi = (n43, e) => {
    let { $head: t, $anchor: r } = n43.selection;
    if (!t.parent.type.spec.code || !t.sameParent(r)) return false;
    let i = t.node(-1), s = t.indexAfter(-1), o = Fi(i.contentMatchAt(s));
    if (!o || !i.canReplaceWith(s, s, o)) return false;
    if (e) {
      let l = t.after(), a = n43.tr.replaceWith(l, l, o.createAndFill());
      a.setSelection(N.near(a.doc.resolve(l), 1)), e(a.scrollIntoView());
    }
    return true;
  };
  var $i = (n43, e) => {
    let t = n43.selection, { $from: r, $to: i } = t;
    if (t instanceof ae || r.parent.inlineContent || i.parent.inlineContent) return false;
    let s = Fi(i.parent.contentMatchAt(i.indexAfter()));
    if (!s || !s.isTextblock) return false;
    if (e) {
      let o = (!r.parentOffset && i.index() < i.parent.childCount ? r : i).pos, l = n43.tr.insert(o, s.createAndFill());
      l.setSelection(E.create(l.doc, o + 1)), e(l.scrollIntoView());
    }
    return true;
  };
  var _i = (n43, e) => {
    let { $cursor: t } = n43.selection;
    if (!t || t.parent.content.size) return false;
    if (t.depth > 1 && t.after() != t.end(-1)) {
      let s = t.before();
      if (ge(n43.doc, s)) return e && e(n43.tr.split(s).scrollIntoView()), true;
    }
    let r = t.blockRange(), i = r && He(r);
    return i == null ? false : (e && e(n43.tr.lift(r, i).scrollIntoView()), true);
  };
  function Od(n43) {
    return (e, t) => {
      let { $from: r, $to: i } = e.selection;
      if (e.selection instanceof C && e.selection.node.isBlock) return !r.parentOffset || !ge(e.doc, r.pos) ? false : (t && t(e.tr.split(r.pos).scrollIntoView()), true);
      if (!r.depth) return false;
      let s = [], o, l, a = false, c = false;
      for (let h = r.depth; ; h--) if (r.node(h).isBlock) {
        a = r.end(h) == r.pos + (r.depth - h), c = r.start(h) == r.pos - (r.depth - h), l = Fi(r.node(h - 1).contentMatchAt(r.indexAfter(h - 1)));
        let m = n43 && n43(i.parent, a, r);
        s.unshift(m || (a && l ? { type: l } : null)), o = h;
        break;
      } else {
        if (h == 1) return false;
        s.unshift(null);
      }
      let u = e.tr;
      (e.selection instanceof E || e.selection instanceof ae) && u.deleteSelection();
      let d = u.mapping.map(r.pos), f = ge(u.doc, d, s.length, s);
      if (f || (s[0] = l ? { type: l } : null, f = ge(u.doc, d, s.length, s)), !f) return false;
      if (u.split(d, s.length, s), !a && c && r.node(o).type != l) {
        let h = u.mapping.map(r.before(o)), p = u.doc.resolve(h);
        l && r.node(o - 1).canReplaceWith(p.index(), p.index() + 1, l) && u.setNodeMarkup(u.mapping.map(r.before(o)), l);
      }
      return t && t(u.scrollIntoView()), true;
    };
  }
  var Id = Od();
  var Rl = (n43, e) => {
    let { $from: t, to: r } = n43.selection, i, s = t.sharedDepth(r);
    return s == 0 ? false : (i = t.before(s), e && e(n43.tr.setSelection(C.create(n43.doc, i))), true);
  };
  var Rd = (n43, e) => (e && e(n43.tr.setSelection(new ae(n43.doc))), true);
  function Dd(n43, e, t) {
    let r = e.nodeBefore, i = e.nodeAfter, s = e.index();
    return !r || !i || !r.type.compatibleContent(i.type) ? false : !r.content.size && e.parent.canReplace(s - 1, s) ? (t && t(n43.tr.delete(e.pos - r.nodeSize, e.pos).scrollIntoView()), true) : !e.parent.canReplace(s, s + 1) || !(i.isTextblock || ye(n43.doc, e.pos)) ? false : (t && t(n43.tr.join(e.pos).scrollIntoView()), true);
  }
  function Dl(n43, e, t, r) {
    let i = e.nodeBefore, s = e.nodeAfter, o, l, a = i.type.spec.isolating || s.type.spec.isolating;
    if (!a && Dd(n43, e, t)) return true;
    let c = !a && e.parent.canReplace(e.index(), e.index() + 1);
    if (c && (o = (l = i.contentMatchAt(i.childCount)).findWrapping(s.type)) && l.matchType(o[0] || s.type).validEnd) {
      if (t) {
        let h = e.pos + s.nodeSize, p = k.empty;
        for (let y = o.length - 1; y >= 0; y--) p = k.from(o[y].create(null, p));
        p = k.from(i.copy(p));
        let m = n43.tr.step(new U(e.pos - 1, h, e.pos, h, new x(p, 1, 0), o.length, true)), g = m.doc.resolve(h + 2 * o.length);
        g.nodeAfter && g.nodeAfter.type == i.type && ye(m.doc, g.pos) && m.join(g.pos), t(m.scrollIntoView());
      }
      return true;
    }
    let u = s.type.spec.isolating || r > 0 && a ? null : N.findFrom(e, 1), d = u && u.$from.blockRange(u.$to), f = d && He(d);
    if (f != null && f >= e.depth) return t && t(n43.tr.lift(d, f).scrollIntoView()), true;
    if (c && Dt(s, "start", true) && Dt(i, "end")) {
      let h = i, p = [];
      for (; p.push(h), !h.isTextblock; ) h = h.lastChild;
      let m = s, g = 1;
      for (; !m.isTextblock; m = m.firstChild) g++;
      if (h.canReplace(h.childCount, h.childCount, m.content)) {
        if (t) {
          let y = k.empty;
          for (let w = p.length - 1; w >= 0; w--) y = k.from(p[w].copy(y));
          let S = n43.tr.step(new U(e.pos - p.length, e.pos + s.nodeSize, e.pos + g, e.pos + s.nodeSize - g, new x(y, p.length, 0), 0, true));
          t(S.scrollIntoView());
        }
        return true;
      }
    }
    return false;
  }
  function Pl(n43) {
    return function(e, t) {
      let r = e.selection, i = n43 < 0 ? r.$from : r.$to, s = i.depth;
      for (; i.node(s).isInline; ) {
        if (!s) return false;
        s--;
      }
      return i.node(s).isTextblock ? (t && t(e.tr.setSelection(E.create(e.doc, n43 < 0 ? i.start(s) : i.end(s)))), true) : false;
    };
  }
  var Vi = Pl(-1);
  var ji = Pl(1);
  function Ll(n43, e = null) {
    return function(t, r) {
      let { $from: i, $to: s } = t.selection, o = i.blockRange(s), l = o && It(o, n43, e);
      return l ? (r && r(t.tr.wrap(o, l).scrollIntoView()), true) : false;
    };
  }
  function Wi(n43, e = null) {
    return function(t, r) {
      let i = false;
      for (let s = 0; s < t.selection.ranges.length && !i; s++) {
        let { $from: { pos: o }, $to: { pos: l } } = t.selection.ranges[s];
        t.doc.nodesBetween(o, l, (a, c) => {
          if (i) return false;
          if (!(!a.isTextblock || a.hasMarkup(n43, e))) if (a.type == n43) i = true;
          else {
            let u = t.doc.resolve(c), d = u.index();
            i = u.parent.canReplaceWith(d, d + 1, n43);
          }
        });
      }
      if (!i) return false;
      if (r) {
        let s = t.tr;
        for (let o = 0; o < t.selection.ranges.length; o++) {
          let { $from: { pos: l }, $to: { pos: a } } = t.selection.ranges[o];
          s.setBlockType(l, a, n43, e);
        }
        r(s.scrollIntoView());
      }
      return true;
    };
  }
  function Ki(...n43) {
    return function(e, t, r) {
      for (let i = 0; i < n43.length; i++) if (n43[i](e, t, r)) return true;
      return false;
    };
  }
  var Oi = Ki(wl, Ii, Ri);
  var Ml = Ki(wl, Pi, Li);
  var Ge = { Enter: Ki(Bi, $i, _i, Id), "Mod-Enter": Hi, Backspace: Oi, "Mod-Backspace": Oi, "Shift-Backspace": Oi, Delete: Ml, "Mod-Delete": Ml, "Mod-a": Rd };
  var Pd = { "Ctrl-h": Ge.Backspace, "Alt-Backspace": Ge["Mod-Backspace"], "Ctrl-d": Ge.Delete, "Ctrl-Alt-Backspace": Ge["Mod-Delete"], "Alt-Delete": Ge["Mod-Delete"], "Alt-d": Ge["Mod-Delete"], "Ctrl-a": Vi, "Ctrl-e": ji };
  for (let n43 in Ge) Pd[n43] = Ge[n43];
  var ry = typeof navigator < "u" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : typeof os < "u" && os.platform ? os.platform() == "darwin" : false;
  function zl(n43, e = null) {
    return function(t, r) {
      let { $from: i, $to: s } = t.selection, o = i.blockRange(s);
      if (!o) return false;
      let l = r ? t.tr : null;
      return Ld(l, o, n43, e) ? (r && r(l.scrollIntoView()), true) : false;
    };
  }
  function Ld(n43, e, t, r = null) {
    let i = false, s = e, o = e.$from.doc;
    if (e.depth >= 2 && e.$from.node(e.depth - 1).type.compatibleContent(t) && e.startIndex == 0) {
      if (e.$from.index(e.depth - 1) == 0) return false;
      let a = o.resolve(e.start - 2);
      s = new lt(a, a, e.depth), e.endIndex < e.parent.childCount && (e = new lt(e.$from, o.resolve(e.$to.end(e.depth)), e.depth)), i = true;
    }
    let l = It(s, t, r, e);
    return l ? (n43 && zd(n43, e, l, i, t), true) : false;
  }
  function zd(n43, e, t, r, i) {
    let s = k.empty;
    for (let u = t.length - 1; u >= 0; u--) s = k.from(t[u].type.create(t[u].attrs, s));
    n43.step(new U(e.start - (r ? 2 : 0), e.end, e.start, e.end, new x(s, 0, 0), t.length, true));
    let o = 0;
    for (let u = 0; u < t.length; u++) t[u].type == i && (o = u + 1);
    let l = t.length - o, a = e.start + t.length - (r ? 2 : 0), c = e.parent;
    for (let u = e.startIndex, d = e.endIndex, f = true; u < d; u++, f = false) !f && ge(n43.doc, a, l) && (n43.split(a, l), a += 2 * l), a += c.child(u).nodeSize;
    return n43;
  }
  function Bl(n43) {
    return function(e, t) {
      let { $from: r, $to: i } = e.selection, s = r.blockRange(i, (o) => o.childCount > 0 && o.firstChild.type == n43);
      return s ? t ? r.node(s.depth - 1).type == n43 ? Bd(e, t, n43, s) : Fd(e, t, s) : true : false;
    };
  }
  function Bd(n43, e, t, r) {
    let i = n43.tr, s = r.end, o = r.$to.end(r.depth);
    s < o && (i.step(new U(s - 1, o, s, o, new x(k.from(t.create(null, r.parent.copy())), 1, 0), 1, true)), r = new lt(i.doc.resolve(r.$from.pos), i.doc.resolve(o), r.depth));
    let l = He(r);
    if (l == null) return false;
    i.lift(r, l);
    let a = i.doc.resolve(i.mapping.map(s, -1) - 1);
    return ye(i.doc, a.pos) && a.nodeBefore.type == a.nodeAfter.type && i.join(a.pos), e(i.scrollIntoView()), true;
  }
  function Fd(n43, e, t) {
    let r = n43.tr, i = t.parent;
    for (let h = t.end, p = t.endIndex - 1, m = t.startIndex; p > m; p--) h -= i.child(p).nodeSize, r.delete(h - 1, h + 1);
    let s = r.doc.resolve(t.start), o = s.nodeAfter;
    if (r.mapping.map(t.end) != t.start + s.nodeAfter.nodeSize) return false;
    let l = t.startIndex == 0, a = t.endIndex == i.childCount, c = s.node(-1), u = s.index(-1);
    if (!c.canReplace(u + (l ? 0 : 1), u + 1, o.content.append(a ? k.empty : k.from(i)))) return false;
    let d = s.pos, f = d + o.nodeSize;
    return r.step(new U(d - (l ? 1 : 0), f + (a ? 1 : 0), d + 1, f - 1, new x((l ? k.empty : k.from(i.copy(k.empty))).append(a ? k.empty : k.from(i.copy(k.empty))), l ? 0 : 1, a ? 0 : 1), l ? 0 : 1)), e(r.scrollIntoView()), true;
  }
  function Fl(n43) {
    return function(e, t) {
      let { $from: r, $to: i } = e.selection, s = r.blockRange(i, (c) => c.childCount > 0 && c.firstChild.type == n43);
      if (!s) return false;
      let o = s.startIndex;
      if (o == 0) return false;
      let l = s.parent, a = l.child(o - 1);
      if (a.type != n43) return false;
      if (t) {
        let c = a.lastChild && a.lastChild.type == l.type, u = k.from(c ? n43.create() : null), d = new x(k.from(n43.create(null, k.from(l.type.create(null, u)))), c ? 3 : 1, 0), f = s.start, h = s.end;
        t(e.tr.step(new U(f - (c ? 3 : 1), h, f, h, d, 1, true)).scrollIntoView());
      }
      return true;
    };
  }
  var Z = function(n43) {
    for (var e = 0; ; e++) if (n43 = n43.previousSibling, !n43) return e;
  };
  var Ft = function(n43) {
    let e = n43.assignedSlot || n43.parentNode;
    return e && e.nodeType == 11 ? e.host : e;
  };
  var Xi = null;
  var _e = function(n43, e, t) {
    let r = Xi || (Xi = document.createRange());
    return r.setEnd(n43, t ?? n43.nodeValue.length), r.setStart(n43, e || 0), r;
  };
  var Hd = function() {
    Xi = null;
  };
  var yt = function(n43, e, t, r) {
    return t && (Hl(n43, e, t, r, -1) || Hl(n43, e, t, r, 1));
  };
  var $d = /^(img|br|input|textarea|hr)$/i;
  function Hl(n43, e, t, r, i) {
    for (var s; ; ) {
      if (n43 == t && e == r) return true;
      if (e == (i < 0 ? 0 : be(n43))) {
        let o = n43.parentNode;
        if (!o || o.nodeType != 1 || fn(n43) || $d.test(n43.nodeName) || n43.contentEditable == "false") return false;
        e = Z(n43) + (i < 0 ? 0 : 1), n43 = o;
      } else if (n43.nodeType == 1) {
        let o = n43.childNodes[e + (i < 0 ? -1 : 0)];
        if (o.nodeType == 1 && o.contentEditable == "false") if (!((s = o.pmViewDesc) === null || s === void 0) && s.ignoreForSelection) e += i;
        else return false;
        else n43 = o, e = i < 0 ? be(n43) : 0;
      } else return false;
    }
  }
  function be(n43) {
    return n43.nodeType == 3 ? n43.nodeValue.length : n43.childNodes.length;
  }
  function _d(n43, e) {
    for (; ; ) {
      if (n43.nodeType == 3 && e) return n43;
      if (n43.nodeType == 1 && e > 0) {
        if (n43.contentEditable == "false") return null;
        n43 = n43.childNodes[e - 1], e = be(n43);
      } else if (n43.parentNode && !fn(n43)) e = Z(n43), n43 = n43.parentNode;
      else return null;
    }
  }
  function Vd(n43, e) {
    for (; ; ) {
      if (n43.nodeType == 3 && e < n43.nodeValue.length) return n43;
      if (n43.nodeType == 1 && e < n43.childNodes.length) {
        if (n43.contentEditable == "false") return null;
        n43 = n43.childNodes[e], e = 0;
      } else if (n43.parentNode && !fn(n43)) e = Z(n43) + 1, n43 = n43.parentNode;
      else return null;
    }
  }
  function jd(n43, e, t) {
    for (let r = e == 0, i = e == be(n43); r || i; ) {
      if (n43 == t) return true;
      let s = Z(n43);
      if (n43 = n43.parentNode, !n43) return false;
      r = r && s == 0, i = i && s == be(n43);
    }
  }
  function fn(n43) {
    let e;
    for (let t = n43; t && !(e = t.pmViewDesc); t = t.parentNode) ;
    return e && e.node && e.node.isBlock && (e.dom == n43 || e.contentDOM == n43);
  }
  var ir = function(n43) {
    return n43.focusNode && yt(n43.focusNode, n43.focusOffset, n43.anchorNode, n43.anchorOffset);
  };
  function dt(n43, e) {
    let t = document.createEvent("Event");
    return t.initEvent("keydown", true, true), t.keyCode = n43, t.key = t.code = e, t;
  }
  function Wd(n43) {
    let e = n43.activeElement;
    for (; e && e.shadowRoot; ) e = e.shadowRoot.activeElement;
    return e;
  }
  function Kd(n43, e, t) {
    if (n43.caretPositionFromPoint) try {
      let r = n43.caretPositionFromPoint(e, t);
      if (r) return { node: r.offsetNode, offset: Math.min(be(r.offsetNode), r.offset) };
    } catch {
    }
    if (n43.caretRangeFromPoint) {
      let r = n43.caretRangeFromPoint(e, t);
      if (r) return { node: r.startContainer, offset: Math.min(be(r.startContainer), r.startOffset) };
    }
  }
  var Ee = typeof navigator < "u" ? navigator : null;
  var $l = typeof document < "u" ? document : null;
  var tt = Ee && Ee.userAgent || "";
  var Qi = /Edge\/(\d+)/.exec(tt);
  var ka = /MSIE \d/.exec(tt);
  var Zi = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(tt);
  var he = !!(ka || Zi || Qi);
  var Ze = ka ? document.documentMode : Zi ? +Zi[1] : Qi ? +Qi[1] : 0;
  var xe = !he && /gecko\/(\d+)/i.test(tt);
  xe && +(/Firefox\/(\d+)/.exec(tt) || [0, 0])[1];
  var es = !he && /Chrome\/(\d+)/.exec(tt);
  var ee = !!es;
  var ba = es ? +es[1] : 0;
  var se = !he && !!Ee && /Apple Computer/.test(Ee.vendor);
  var Ht = se && (/Mobile\/\w+/.test(tt) || !!Ee && Ee.maxTouchPoints > 2);
  var ke = Ht || (Ee ? /Mac/.test(Ee.platform) : false);
  var xa = Ee ? /Win/.test(Ee.platform) : false;
  var Ve = /Android \d/.test(tt);
  var hn = !!$l && "webkitFontSmoothing" in $l.documentElement.style;
  var Ud = hn ? +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0;
  function Jd(n43) {
    let e = n43.defaultView && n43.defaultView.visualViewport;
    return e ? { left: 0, right: e.width, top: 0, bottom: e.height } : { left: 0, right: n43.documentElement.clientWidth, top: 0, bottom: n43.documentElement.clientHeight };
  }
  function $e(n43, e) {
    return typeof n43 == "number" ? n43 : n43[e];
  }
  function qd(n43) {
    let e = n43.getBoundingClientRect(), t = e.width / n43.offsetWidth || 1, r = e.height / n43.offsetHeight || 1;
    return { left: e.left, right: e.left + n43.clientWidth * t, top: e.top, bottom: e.top + n43.clientHeight * r };
  }
  function _l(n43, e, t) {
    let r = n43.someProp("scrollThreshold") || 0, i = n43.someProp("scrollMargin") || 5, s = n43.dom.ownerDocument;
    for (let o = t || n43.dom; o; ) {
      if (o.nodeType != 1) {
        o = Ft(o);
        continue;
      }
      let l = o, a = l == s.body, c = a ? Jd(s) : qd(l), u = 0, d = 0;
      if (e.top < c.top + $e(r, "top") ? d = -(c.top - e.top + $e(i, "top")) : e.bottom > c.bottom - $e(r, "bottom") && (d = e.bottom - e.top > c.bottom - c.top ? e.top + $e(i, "top") - c.top : e.bottom - c.bottom + $e(i, "bottom")), e.left < c.left + $e(r, "left") ? u = -(c.left - e.left + $e(i, "left")) : e.right > c.right - $e(r, "right") && (u = e.right - c.right + $e(i, "right")), u || d) if (a) s.defaultView.scrollBy(u, d);
      else {
        let h = l.scrollLeft, p = l.scrollTop;
        d && (l.scrollTop += d), u && (l.scrollLeft += u);
        let m = l.scrollLeft - h, g = l.scrollTop - p;
        e = { left: e.left - m, top: e.top - g, right: e.right - m, bottom: e.bottom - g };
      }
      let f = a ? "fixed" : getComputedStyle(o).position;
      if (/^(fixed|sticky)$/.test(f)) break;
      o = f == "absolute" ? o.offsetParent : Ft(o);
    }
  }
  function Gd(n43) {
    let e = n43.dom.getBoundingClientRect(), t = Math.max(0, e.top), r, i;
    for (let s = (e.left + e.right) / 2, o = t + 1; o < Math.min(innerHeight, e.bottom); o += 5) {
      let l = n43.root.elementFromPoint(s, o);
      if (!l || l == n43.dom || !n43.dom.contains(l)) continue;
      let a = l.getBoundingClientRect();
      if (a.top >= t - 20) {
        r = l, i = a.top;
        break;
      }
    }
    return { refDOM: r, refTop: i, stack: Sa(n43.dom) };
  }
  function Sa(n43) {
    let e = [], t = n43.ownerDocument;
    for (let r = n43; r && (e.push({ dom: r, top: r.scrollTop, left: r.scrollLeft }), n43 != t); r = Ft(r)) ;
    return e;
  }
  function Yd({ refDOM: n43, refTop: e, stack: t }) {
    let r = n43 ? n43.getBoundingClientRect().top : 0;
    Ma(t, r == 0 ? 0 : r - e);
  }
  function Ma(n43, e) {
    for (let t = 0; t < n43.length; t++) {
      let { dom: r, top: i, left: s } = n43[t];
      r.scrollTop != i + e && (r.scrollTop = i + e), r.scrollLeft != s && (r.scrollLeft = s);
    }
  }
  var Pt = null;
  function Xd(n43) {
    if (n43.setActive) return n43.setActive();
    if (Pt) return n43.focus(Pt);
    let e = Sa(n43);
    n43.focus(Pt == null ? { get preventScroll() {
      return Pt = { preventScroll: true }, true;
    } } : void 0), Pt || (Pt = false, Ma(e, 0));
  }
  function wa(n43, e) {
    let t, r = 2e8, i, s = 0, o = e.top, l = e.top, a, c;
    for (let u = n43.firstChild, d = 0; u; u = u.nextSibling, d++) {
      let f;
      if (u.nodeType == 1) f = u.getClientRects();
      else if (u.nodeType == 3) f = _e(u).getClientRects();
      else continue;
      for (let h = 0; h < f.length; h++) {
        let p = f[h];
        if (p.top <= o && p.bottom >= l) {
          o = Math.max(p.bottom, o), l = Math.min(p.top, l);
          let m = p.left > e.left ? p.left - e.left : p.right < e.left ? e.left - p.right : 0;
          if (m < r) {
            t = u, r = m, i = m && t.nodeType == 3 ? { left: p.right < e.left ? p.right : p.left, top: e.top } : e, u.nodeType == 1 && m && (s = d + (e.left >= (p.left + p.right) / 2 ? 1 : 0));
            continue;
          }
        } else p.top > e.top && !a && p.left <= e.left && p.right >= e.left && (a = u, c = { left: Math.max(p.left, Math.min(p.right, e.left)), top: p.top });
        !t && (e.left >= p.right && e.top >= p.top || e.left >= p.left && e.top >= p.bottom) && (s = d + 1);
      }
    }
    return !t && a && (t = a, i = c, r = 0), t && t.nodeType == 3 ? Qd(t, i) : !t || r && t.nodeType == 1 ? { node: n43, offset: s } : wa(t, i);
  }
  function Qd(n43, e) {
    let t = n43.nodeValue.length, r = document.createRange(), i;
    for (let s = 0; s < t; s++) {
      r.setEnd(n43, s + 1), r.setStart(n43, s);
      let o = Ye(r, 1);
      if (o.top != o.bottom && gs(e, o)) {
        i = { node: n43, offset: s + (e.left >= (o.left + o.right) / 2 ? 1 : 0) };
        break;
      }
    }
    return r.detach(), i || { node: n43, offset: 0 };
  }
  function gs(n43, e) {
    return n43.left >= e.left - 1 && n43.left <= e.right + 1 && n43.top >= e.top - 1 && n43.top <= e.bottom + 1;
  }
  function Zd(n43, e) {
    let t = n43.parentNode;
    return t && /^li$/i.test(t.nodeName) && e.left < n43.getBoundingClientRect().left ? t : n43;
  }
  function ef(n43, e, t) {
    let { node: r, offset: i } = wa(e, t), s = -1;
    if (r.nodeType == 1 && !r.firstChild) {
      let o = r.getBoundingClientRect();
      s = o.left != o.right && t.left > (o.left + o.right) / 2 ? 1 : -1;
    }
    return n43.docView.posFromDOM(r, i, s);
  }
  function tf(n43, e, t, r) {
    let i = -1;
    for (let s = e, o = false; s != n43.dom; ) {
      let l = n43.docView.nearestDesc(s, true), a;
      if (!l) return null;
      if (l.dom.nodeType == 1 && (l.node.isBlock && l.parent || !l.contentDOM) && ((a = l.dom.getBoundingClientRect()).width || a.height) && (l.node.isBlock && l.parent && !/^T(R|BODY|HEAD|FOOT)$/.test(l.dom.nodeName) && (!o && a.left > r.left || a.top > r.top ? i = l.posBefore : (!o && a.right < r.left || a.bottom < r.top) && (i = l.posAfter), o = true), !l.contentDOM && i < 0 && !l.node.isText)) return (l.node.isBlock ? r.top < (a.top + a.bottom) / 2 : r.left < (a.left + a.right) / 2) ? l.posBefore : l.posAfter;
      s = l.dom.parentNode;
    }
    return i > -1 ? i : n43.docView.posFromDOM(e, t, -1);
  }
  function Ca(n43, e, t) {
    let r = n43.childNodes.length;
    if (r && t.top < t.bottom) for (let i = Math.max(0, Math.min(r - 1, Math.floor(r * (e.top - t.top) / (t.bottom - t.top)) - 2)), s = i; ; ) {
      let o = n43.childNodes[s];
      if (o.nodeType == 1) {
        let l = o.getClientRects();
        for (let a = 0; a < l.length; a++) {
          let c = l[a];
          if (gs(e, c)) return Ca(o, e, c);
        }
      }
      if ((s = (s + 1) % r) == i) break;
    }
    return n43;
  }
  function nf(n43, e) {
    let t = n43.dom.ownerDocument, r, i = 0, s = Kd(t, e.left, e.top);
    s && ({ node: r, offset: i } = s);
    let o = (n43.root.elementFromPoint ? n43.root : t).elementFromPoint(e.left, e.top), l;
    if (!o || !n43.dom.contains(o.nodeType != 1 ? o.parentNode : o)) {
      let c = n43.dom.getBoundingClientRect();
      if (!gs(e, c) || (o = Ca(n43.dom, e, c), !o)) return null;
    }
    if (se) for (let c = o; r && c; c = Ft(c)) c.draggable && (r = void 0);
    if (o = Zd(o, e), r) {
      if (xe && r.nodeType == 1 && (i = Math.min(i, r.childNodes.length), i < r.childNodes.length)) {
        let u = r.childNodes[i], d;
        u.nodeName == "IMG" && (d = u.getBoundingClientRect()).right <= e.left && d.bottom > e.top && i++;
      }
      let c;
      hn && i && r.nodeType == 1 && (c = r.childNodes[i - 1]).nodeType == 1 && c.contentEditable == "false" && c.getBoundingClientRect().top >= e.top && i--, r == n43.dom && i == r.childNodes.length - 1 && r.lastChild.nodeType == 1 && e.top > r.lastChild.getBoundingClientRect().bottom ? l = n43.state.doc.content.size : (i == 0 || r.nodeType != 1 || r.childNodes[i - 1].nodeName != "BR") && (l = tf(n43, r, i, e));
    }
    l == null && (l = ef(n43, o, e));
    let a = n43.docView.nearestDesc(o, true);
    return { pos: l, inside: a ? a.posAtStart - a.border : -1 };
  }
  function Vl(n43) {
    return n43.top < n43.bottom || n43.left < n43.right;
  }
  function Ye(n43, e) {
    let t = n43.getClientRects();
    if (t.length) {
      let r = t[e < 0 ? 0 : t.length - 1];
      if (Vl(r)) return r;
    }
    return Array.prototype.find.call(t, Vl) || n43.getBoundingClientRect();
  }
  var rf = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
  function Ta(n43, e, t) {
    let { node: r, offset: i, atom: s } = n43.docView.domFromPos(e, t < 0 ? -1 : 1), o = hn || xe;
    if (r.nodeType == 3) if (o && (rf.test(r.nodeValue) || (t < 0 ? !i : i == r.nodeValue.length))) {
      let a = Ye(_e(r, i, i), t);
      if (xe && i && /\s/.test(r.nodeValue[i - 1]) && i < r.nodeValue.length) {
        let c = Ye(_e(r, i - 1, i - 1), -1);
        if (c.top == a.top) {
          let u = Ye(_e(r, i, i + 1), -1);
          if (u.top != a.top) return sn(u, u.left < c.left);
        }
      }
      return a;
    } else {
      let a = i, c = i, u = t < 0 ? 1 : -1;
      return t < 0 && !i ? (c++, u = -1) : t >= 0 && i == r.nodeValue.length ? (a--, u = 1) : t < 0 ? a-- : c++, sn(Ye(_e(r, a, c), u), u < 0);
    }
    if (!n43.state.doc.resolve(e - (s || 0)).parent.inlineContent) {
      if (s == null && i && (t < 0 || i == be(r))) {
        let a = r.childNodes[i - 1];
        if (a.nodeType == 1) return Ui(a.getBoundingClientRect(), false);
      }
      if (s == null && i < be(r)) {
        let a = r.childNodes[i];
        if (a.nodeType == 1) return Ui(a.getBoundingClientRect(), true);
      }
      return Ui(r.getBoundingClientRect(), t >= 0);
    }
    if (s == null && i && (t < 0 || i == be(r))) {
      let a = r.childNodes[i - 1], c = a.nodeType == 3 ? _e(a, be(a) - (o ? 0 : 1)) : a.nodeType == 1 && (a.nodeName != "BR" || !a.nextSibling) ? a : null;
      if (c) return sn(Ye(c, 1), false);
    }
    if (s == null && i < be(r)) {
      let a = r.childNodes[i];
      for (; a.pmViewDesc && a.pmViewDesc.ignoreForCoords; ) a = a.nextSibling;
      let c = a ? a.nodeType == 3 ? _e(a, 0, o ? 0 : 1) : a.nodeType == 1 ? a : null : null;
      if (c) return sn(Ye(c, -1), true);
    }
    return sn(Ye(r.nodeType == 3 ? _e(r) : r, -t), t >= 0);
  }
  function sn(n43, e) {
    if (n43.width == 0) return n43;
    let t = e ? n43.left : n43.right;
    return { top: n43.top, bottom: n43.bottom, left: t, right: t };
  }
  function Ui(n43, e) {
    if (n43.height == 0) return n43;
    let t = e ? n43.top : n43.bottom;
    return { top: t, bottom: t, left: n43.left, right: n43.right };
  }
  function va(n43, e, t) {
    let r = n43.state, i = n43.root.activeElement;
    r != e && n43.updateState(e), i != n43.dom && n43.focus();
    try {
      return t();
    } finally {
      r != e && n43.updateState(r), i != n43.dom && i && i.focus();
    }
  }
  function sf(n43, e, t) {
    let r = e.selection, i = t == "up" ? r.$from : r.$to;
    return va(n43, e, () => {
      let { node: s } = n43.docView.domFromPos(i.pos, t == "up" ? -1 : 1);
      for (; ; ) {
        let l = n43.docView.nearestDesc(s, true);
        if (!l) break;
        if (l.node.isBlock) {
          s = l.contentDOM || l.dom;
          break;
        }
        s = l.dom.parentNode;
      }
      let o = Ta(n43, i.pos, 1);
      for (let l = s.firstChild; l; l = l.nextSibling) {
        let a;
        if (l.nodeType == 1) a = l.getClientRects();
        else if (l.nodeType == 3) a = _e(l, 0, l.nodeValue.length).getClientRects();
        else continue;
        for (let c = 0; c < a.length; c++) {
          let u = a[c];
          if (u.bottom > u.top + 1 && (t == "up" ? o.top - u.top > (u.bottom - o.top) * 2 : u.bottom - o.bottom > (o.bottom - u.top) * 2)) return false;
        }
      }
      return true;
    });
  }
  var of = /[\u0590-\u08ac]/;
  function lf(n43, e, t) {
    let { $head: r } = e.selection;
    if (!r.parent.isTextblock) return false;
    let i = r.parentOffset, s = !i, o = i == r.parent.content.size, l = n43.domSelection();
    return l ? !of.test(r.parent.textContent) || !l.modify ? t == "left" || t == "backward" ? s : o : va(n43, e, () => {
      let { focusNode: a, focusOffset: c, anchorNode: u, anchorOffset: d } = n43.domSelectionRange(), f = l.caretBidiLevel;
      l.modify("move", t, "character");
      let h = r.depth ? n43.docView.domAfterPos(r.before()) : n43.dom, { focusNode: p, focusOffset: m } = n43.domSelectionRange(), g = p && !h.contains(p.nodeType == 1 ? p : p.parentNode) || a == p && c == m;
      try {
        l.collapse(u, d), a && (a != u || c != d) && l.extend && l.extend(a, c);
      } catch {
      }
      return f != null && (l.caretBidiLevel = f), g;
    }) : r.pos == r.start() || r.pos == r.end();
  }
  var jl = null;
  var Wl = null;
  var Kl = false;
  function af(n43, e, t) {
    return jl == e && Wl == t ? Kl : (jl = e, Wl = t, Kl = t == "up" || t == "down" ? sf(n43, e, t) : lf(n43, e, t));
  }
  var Se = 0;
  var Ul = 1;
  var ft = 2;
  var Ae = 3;
  var kt = class {
    constructor(e, t, r, i) {
      this.parent = e, this.children = t, this.dom = r, this.contentDOM = i, this.dirty = Se, r.pmViewDesc = this;
    }
    matchesWidget(e) {
      return false;
    }
    matchesMark(e) {
      return false;
    }
    matchesNode(e, t, r) {
      return false;
    }
    matchesHack(e) {
      return false;
    }
    parseRule() {
      return null;
    }
    stopEvent(e) {
      return false;
    }
    get size() {
      let e = 0;
      for (let t = 0; t < this.children.length; t++) e += this.children[t].size;
      return e;
    }
    get border() {
      return 0;
    }
    destroy() {
      this.parent = void 0, this.dom.pmViewDesc == this && (this.dom.pmViewDesc = void 0);
      for (let e = 0; e < this.children.length; e++) this.children[e].destroy();
    }
    posBeforeChild(e) {
      for (let t = 0, r = this.posAtStart; ; t++) {
        let i = this.children[t];
        if (i == e) return r;
        r += i.size;
      }
    }
    get posBefore() {
      return this.parent.posBeforeChild(this);
    }
    get posAtStart() {
      return this.parent ? this.parent.posBeforeChild(this) + this.border : 0;
    }
    get posAfter() {
      return this.posBefore + this.size;
    }
    get posAtEnd() {
      return this.posAtStart + this.size - 2 * this.border;
    }
    localPosFromDOM(e, t, r) {
      if (this.contentDOM && this.contentDOM.contains(e.nodeType == 1 ? e : e.parentNode)) if (r < 0) {
        let s, o;
        if (e == this.contentDOM) s = e.childNodes[t - 1];
        else {
          for (; e.parentNode != this.contentDOM; ) e = e.parentNode;
          s = e.previousSibling;
        }
        for (; s && !((o = s.pmViewDesc) && o.parent == this); ) s = s.previousSibling;
        return s ? this.posBeforeChild(o) + o.size : this.posAtStart;
      } else {
        let s, o;
        if (e == this.contentDOM) s = e.childNodes[t];
        else {
          for (; e.parentNode != this.contentDOM; ) e = e.parentNode;
          s = e.nextSibling;
        }
        for (; s && !((o = s.pmViewDesc) && o.parent == this); ) s = s.nextSibling;
        return s ? this.posBeforeChild(o) : this.posAtEnd;
      }
      let i;
      if (e == this.dom && this.contentDOM) i = t > Z(this.contentDOM);
      else if (this.contentDOM && this.contentDOM != this.dom && this.dom.contains(this.contentDOM)) i = e.compareDocumentPosition(this.contentDOM) & 2;
      else if (this.dom.firstChild) {
        if (t == 0) for (let s = e; ; s = s.parentNode) {
          if (s == this.dom) {
            i = false;
            break;
          }
          if (s.previousSibling) break;
        }
        if (i == null && t == e.childNodes.length) for (let s = e; ; s = s.parentNode) {
          if (s == this.dom) {
            i = true;
            break;
          }
          if (s.nextSibling) break;
        }
      }
      return i ?? r > 0 ? this.posAtEnd : this.posAtStart;
    }
    nearestDesc(e, t = false) {
      for (let r = true, i = e; i; i = i.parentNode) {
        let s = this.getDesc(i), o;
        if (s && (!t || s.node)) if (r && (o = s.nodeDOM) && !(o.nodeType == 1 ? o.contains(e.nodeType == 1 ? e : e.parentNode) : o == e)) r = false;
        else return s;
      }
    }
    getDesc(e) {
      let t = e.pmViewDesc;
      for (let r = t; r; r = r.parent) if (r == this) return t;
    }
    posFromDOM(e, t, r) {
      for (let i = e; i; i = i.parentNode) {
        let s = this.getDesc(i);
        if (s) return s.localPosFromDOM(e, t, r);
      }
      return -1;
    }
    descAt(e) {
      for (let t = 0, r = 0; t < this.children.length; t++) {
        let i = this.children[t], s = r + i.size;
        if (r == e && s != r) {
          for (; !i.border && i.children.length; ) for (let o = 0; o < i.children.length; o++) {
            let l = i.children[o];
            if (l.size) {
              i = l;
              break;
            }
          }
          return i;
        }
        if (e < s) return i.descAt(e - r - i.border);
        r = s;
      }
    }
    domFromPos(e, t) {
      if (!this.contentDOM) return { node: this.dom, offset: 0, atom: e + 1 };
      let r = 0, i = 0;
      for (let s = 0; r < this.children.length; r++) {
        let o = this.children[r], l = s + o.size;
        if (l > e || o instanceof Yn) {
          i = e - s;
          break;
        }
        s = l;
      }
      if (i) return this.children[r].domFromPos(i - this.children[r].border, t);
      for (let s; r && !(s = this.children[r - 1]).size && s instanceof qn && s.side >= 0; r--) ;
      if (t <= 0) {
        let s, o = true;
        for (; s = r ? this.children[r - 1] : null, !(!s || s.dom.parentNode == this.contentDOM); r--, o = false) ;
        return s && t && o && !s.border && !s.domAtom ? s.domFromPos(s.size, t) : { node: this.contentDOM, offset: s ? Z(s.dom) + 1 : 0 };
      } else {
        let s, o = true;
        for (; s = r < this.children.length ? this.children[r] : null, !(!s || s.dom.parentNode == this.contentDOM); r++, o = false) ;
        return s && o && !s.border && !s.domAtom ? s.domFromPos(0, t) : { node: this.contentDOM, offset: s ? Z(s.dom) : this.contentDOM.childNodes.length };
      }
    }
    parseRange(e, t, r = 0) {
      if (this.children.length == 0) return { node: this.contentDOM, from: e, to: t, fromOffset: 0, toOffset: this.contentDOM.childNodes.length };
      let i = -1, s = -1;
      for (let o = r, l = 0; ; l++) {
        let a = this.children[l], c = o + a.size;
        if (i == -1 && e <= c) {
          let u = o + a.border;
          if (e >= u && t <= c - a.border && a.node && a.contentDOM && this.contentDOM.contains(a.contentDOM)) return a.parseRange(e, t, u);
          e = o;
          for (let d = l; d > 0; d--) {
            let f = this.children[d - 1];
            if (f.size && f.dom.parentNode == this.contentDOM && !f.emptyChildAt(1)) {
              i = Z(f.dom) + 1;
              break;
            }
            e -= f.size;
          }
          i == -1 && (i = 0);
        }
        if (i > -1 && (c > t || l == this.children.length - 1)) {
          t = c;
          for (let u = l + 1; u < this.children.length; u++) {
            let d = this.children[u];
            if (d.size && d.dom.parentNode == this.contentDOM && !d.emptyChildAt(-1)) {
              s = Z(d.dom);
              break;
            }
            t += d.size;
          }
          s == -1 && (s = this.contentDOM.childNodes.length);
          break;
        }
        o = c;
      }
      return { node: this.contentDOM, from: e, to: t, fromOffset: i, toOffset: s };
    }
    emptyChildAt(e) {
      if (this.border || !this.contentDOM || !this.children.length) return false;
      let t = this.children[e < 0 ? 0 : this.children.length - 1];
      return t.size == 0 || t.emptyChildAt(e);
    }
    domAfterPos(e) {
      let { node: t, offset: r } = this.domFromPos(e, 0);
      if (t.nodeType != 1 || r == t.childNodes.length) throw new RangeError("No node after pos " + e);
      return t.childNodes[r];
    }
    setSelection(e, t, r, i = false) {
      let s = Math.min(e, t), o = Math.max(e, t);
      for (let h = 0, p = 0; h < this.children.length; h++) {
        let m = this.children[h], g = p + m.size;
        if (s > p && o < g) return m.setSelection(e - p - m.border, t - p - m.border, r, i);
        p = g;
      }
      let l = this.domFromPos(e, e ? -1 : 1), a = t == e ? l : this.domFromPos(t, t ? -1 : 1), c = r.root.getSelection(), u = r.domSelectionRange(), d = false;
      if ((xe || se) && e == t) {
        let { node: h, offset: p } = l;
        if (h.nodeType == 3) {
          if (d = !!(p && h.nodeValue[p - 1] == `
`), d && p == h.nodeValue.length) for (let m = h, g; m; m = m.parentNode) {
            if (g = m.nextSibling) {
              g.nodeName == "BR" && (l = a = { node: g.parentNode, offset: Z(g) + 1 });
              break;
            }
            let y = m.pmViewDesc;
            if (y && y.node && y.node.isBlock) break;
          }
        } else {
          let m = h.childNodes[p - 1];
          d = m && (m.nodeName == "BR" || m.contentEditable == "false");
        }
      }
      if (xe && u.focusNode && u.focusNode != a.node && u.focusNode.nodeType == 1) {
        let h = u.focusNode.childNodes[u.focusOffset];
        h && h.contentEditable == "false" && (i = true);
      }
      if (!(i || d && se) && yt(l.node, l.offset, u.anchorNode, u.anchorOffset) && yt(a.node, a.offset, u.focusNode, u.focusOffset)) return;
      let f = false;
      if ((c.extend || e == t) && !(d && xe)) {
        c.collapse(l.node, l.offset);
        try {
          e != t && c.extend(a.node, a.offset), f = true;
        } catch {
        }
      }
      if (!f) {
        if (e > t) {
          let p = l;
          l = a, a = p;
        }
        let h = document.createRange();
        h.setEnd(a.node, a.offset), h.setStart(l.node, l.offset), c.removeAllRanges(), c.addRange(h);
      }
    }
    ignoreMutation(e) {
      return !this.contentDOM && e.type != "selection";
    }
    get contentLost() {
      return this.contentDOM && this.contentDOM != this.dom && !this.dom.contains(this.contentDOM);
    }
    markDirty(e, t) {
      for (let r = 0, i = 0; i < this.children.length; i++) {
        let s = this.children[i], o = r + s.size;
        if (r == o ? e <= o && t >= r : e < o && t > r) {
          let l = r + s.border, a = o - s.border;
          if (e >= l && t <= a) {
            this.dirty = e == r || t == o ? ft : Ul, e == l && t == a && (s.contentLost || s.dom.parentNode != this.contentDOM) ? s.dirty = Ae : s.markDirty(e - l, t - l);
            return;
          } else s.dirty = s.dom == s.contentDOM && s.dom.parentNode == this.contentDOM && !s.children.length ? ft : Ae;
        }
        r = o;
      }
      this.dirty = ft;
    }
    markParentsDirty() {
      let e = 1;
      for (let t = this.parent; t; t = t.parent, e++) {
        let r = e == 1 ? ft : Ul;
        t.dirty < r && (t.dirty = r);
      }
    }
    get domAtom() {
      return false;
    }
    get ignoreForCoords() {
      return false;
    }
    get ignoreForSelection() {
      return false;
    }
    isText(e) {
      return false;
    }
  };
  var qn = class extends kt {
    constructor(e, t, r, i) {
      let s, o = t.type.toDOM;
      if (typeof o == "function" && (o = o(r, () => {
        if (!s) return i;
        if (s.parent) return s.parent.posBeforeChild(s);
      })), !t.type.spec.raw) {
        if (o.nodeType != 1) {
          let l = document.createElement("span");
          l.appendChild(o), o = l;
        }
        o.contentEditable = "false", o.classList.add("ProseMirror-widget");
      }
      super(e, [], o, null), this.widget = t, this.widget = t, s = this;
    }
    matchesWidget(e) {
      return this.dirty == Se && e.type.eq(this.widget.type);
    }
    parseRule() {
      return { ignore: true };
    }
    stopEvent(e) {
      let t = this.widget.spec.stopEvent;
      return t ? t(e) : false;
    }
    ignoreMutation(e) {
      return e.type != "selection" || this.widget.spec.ignoreSelection;
    }
    destroy() {
      this.widget.type.destroy(this.dom), super.destroy();
    }
    get domAtom() {
      return true;
    }
    get ignoreForSelection() {
      return !!this.widget.type.spec.relaxedSide;
    }
    get side() {
      return this.widget.type.side;
    }
  };
  var ts = class extends kt {
    constructor(e, t, r, i) {
      super(e, [], t, null), this.textDOM = r, this.text = i;
    }
    get size() {
      return this.text.length;
    }
    localPosFromDOM(e, t) {
      return e != this.textDOM ? this.posAtStart + (t ? this.size : 0) : this.posAtStart + t;
    }
    domFromPos(e) {
      return { node: this.textDOM, offset: e };
    }
    ignoreMutation(e) {
      return e.type === "characterData" && e.target.nodeValue == e.oldValue;
    }
  };
  var $t = class n30 extends kt {
    constructor(e, t, r, i, s) {
      super(e, [], r, i), this.mark = t, this.spec = s;
    }
    static create(e, t, r, i) {
      let s = i.nodeViews[t.type.name], o = s && s(t, i, r);
      return (!o || !o.dom) && (o = ze.renderSpec(document, t.type.spec.toDOM(t, r), null, t.attrs)), new n30(e, t, o.dom, o.contentDOM || o.dom, o);
    }
    parseRule() {
      return this.dirty & Ae || this.mark.type.spec.reparseInView ? null : { mark: this.mark.type.name, attrs: this.mark.attrs, contentElement: this.contentDOM };
    }
    matchesMark(e) {
      return this.dirty != Ae && this.mark.eq(e);
    }
    markDirty(e, t) {
      if (super.markDirty(e, t), this.dirty != Se) {
        let r = this.parent;
        for (; !r.node; ) r = r.parent;
        r.dirty < this.dirty && (r.dirty = this.dirty), this.dirty = Se;
      }
    }
    slice(e, t, r) {
      let i = n30.create(this.parent, this.mark, true, r), s = this.children, o = this.size;
      t < o && (s = ss(s, t, o, r)), e > 0 && (s = ss(s, 0, e, r));
      for (let l = 0; l < s.length; l++) s[l].parent = i;
      return i.children = s, i;
    }
    ignoreMutation(e) {
      return this.spec.ignoreMutation ? this.spec.ignoreMutation(e) : super.ignoreMutation(e);
    }
    destroy() {
      this.spec.destroy && this.spec.destroy(), super.destroy();
    }
  };
  var et = class n31 extends kt {
    constructor(e, t, r, i, s, o, l, a, c) {
      super(e, [], s, o), this.node = t, this.outerDeco = r, this.innerDeco = i, this.nodeDOM = l;
    }
    static create(e, t, r, i, s, o) {
      let l = s.nodeViews[t.type.name], a, c = l && l(t, s, () => {
        if (!a) return o;
        if (a.parent) return a.parent.posBeforeChild(a);
      }, r, i), u = c && c.dom, d = c && c.contentDOM;
      if (t.isText) {
        if (!u) u = document.createTextNode(t.text);
        else if (u.nodeType != 3) throw new RangeError("Text must be rendered as a DOM text node");
      } else u || ({ dom: u, contentDOM: d } = ze.renderSpec(document, t.type.spec.toDOM(t), null, t.attrs));
      !d && !t.isText && u.nodeName != "BR" && (u.hasAttribute("contenteditable") || (u.contentEditable = "false"), t.type.spec.draggable && (u.draggable = true));
      let f = u;
      return u = Na(u, r, t), c ? a = new ns(e, t, r, i, u, d || null, f, c, s, o + 1) : t.isText ? new Gn(e, t, r, i, u, f, s) : new n31(e, t, r, i, u, d || null, f, s, o + 1);
    }
    parseRule() {
      if (this.node.type.spec.reparseInView) return null;
      let e = { node: this.node.type.name, attrs: this.node.attrs };
      if (this.node.type.whitespace == "pre" && (e.preserveWhitespace = "full"), !this.contentDOM) e.getContent = () => this.node.content;
      else if (!this.contentLost) e.contentElement = this.contentDOM;
      else {
        for (let t = this.children.length - 1; t >= 0; t--) {
          let r = this.children[t];
          if (this.dom.contains(r.dom.parentNode)) {
            e.contentElement = r.dom.parentNode;
            break;
          }
        }
        e.contentElement || (e.getContent = () => k.empty);
      }
      return e;
    }
    matchesNode(e, t, r) {
      return this.dirty == Se && e.eq(this.node) && Xn(t, this.outerDeco) && r.eq(this.innerDeco);
    }
    get size() {
      return this.node.nodeSize;
    }
    get border() {
      return this.node.isLeaf ? 0 : 1;
    }
    updateChildren(e, t) {
      let r = this.node.inlineContent, i = t, s = e.composing ? this.localCompositionInfo(e, t) : null, o = s && s.pos > -1 ? s : null, l = s && s.pos < 0, a = new is(this, o && o.node, e);
      ff(this.node, this.innerDeco, (c, u, d) => {
        c.spec.marks ? a.syncToMarks(c.spec.marks, r, e, u) : c.type.side >= 0 && !d && a.syncToMarks(u == this.node.childCount ? F.none : this.node.child(u).marks, r, e, u), a.placeWidget(c, e, i);
      }, (c, u, d, f) => {
        a.syncToMarks(c.marks, r, e, f);
        let h;
        a.findNodeMatch(c, u, d, f) || l && e.state.selection.from > i && e.state.selection.to < i + c.nodeSize && (h = a.findIndexWithChild(s.node)) > -1 && a.updateNodeAt(c, u, d, h, e) || a.updateNextNode(c, u, d, e, f, i) || a.addNode(c, u, d, e, i), i += c.nodeSize;
      }), a.syncToMarks([], r, e, 0), this.node.isTextblock && a.addTextblockHacks(), a.destroyRest(), (a.changed || this.dirty == ft) && (o && this.protectLocalComposition(e, o), Ea(this.contentDOM, this.children, e), Ht && hf(this.dom));
    }
    localCompositionInfo(e, t) {
      let { from: r, to: i } = e.state.selection;
      if (!(e.state.selection instanceof E) || r < t || i > t + this.node.content.size) return null;
      let s = e.input.compositionNode;
      if (!s || !this.dom.contains(s.parentNode)) return null;
      if (this.node.inlineContent) {
        let o = s.nodeValue, l = pf(this.node.content, o, r - t, i - t);
        return l < 0 ? null : { node: s, pos: l, text: o };
      } else return { node: s, pos: -1, text: "" };
    }
    protectLocalComposition(e, { node: t, pos: r, text: i }) {
      if (this.getDesc(t)) return;
      let s = t;
      for (; s.parentNode != this.contentDOM; s = s.parentNode) {
        for (; s.previousSibling; ) s.parentNode.removeChild(s.previousSibling);
        for (; s.nextSibling; ) s.parentNode.removeChild(s.nextSibling);
        s.pmViewDesc && (s.pmViewDesc = void 0);
      }
      let o = new ts(this, s, t, i);
      e.input.compositionNodes.push(o), this.children = ss(this.children, r, r + i.length, e, o);
    }
    update(e, t, r, i) {
      return this.dirty == Ae || !e.sameMarkup(this.node) ? false : (this.updateInner(e, t, r, i), true);
    }
    updateInner(e, t, r, i) {
      this.updateOuterDeco(t), this.node = e, this.innerDeco = r, this.contentDOM && this.updateChildren(i, this.posAtStart), this.dirty = Se;
    }
    updateOuterDeco(e) {
      if (Xn(e, this.outerDeco)) return;
      let t = this.nodeDOM.nodeType != 1, r = this.dom;
      this.dom = Aa(this.dom, this.nodeDOM, rs(this.outerDeco, this.node, t), rs(e, this.node, t)), this.dom != r && (r.pmViewDesc = void 0, this.dom.pmViewDesc = this), this.outerDeco = e;
    }
    selectNode() {
      this.nodeDOM.nodeType == 1 && (this.nodeDOM.classList.add("ProseMirror-selectednode"), (this.contentDOM || !this.node.type.spec.draggable) && (this.nodeDOM.draggable = true));
    }
    deselectNode() {
      this.nodeDOM.nodeType == 1 && (this.nodeDOM.classList.remove("ProseMirror-selectednode"), (this.contentDOM || !this.node.type.spec.draggable) && this.nodeDOM.removeAttribute("draggable"));
    }
    get domAtom() {
      return this.node.isAtom;
    }
  };
  function Jl(n43, e, t, r, i) {
    Na(r, e, n43);
    let s = new et(void 0, n43, e, t, r, r, r, i, 0);
    return s.contentDOM && s.updateChildren(i, 0), s;
  }
  var Gn = class n32 extends et {
    constructor(e, t, r, i, s, o, l) {
      super(e, t, r, i, s, null, o, l, 0);
    }
    parseRule() {
      let e = this.nodeDOM.parentNode;
      for (; e && e != this.dom && !e.pmIsDeco; ) e = e.parentNode;
      return { skip: e || true };
    }
    update(e, t, r, i) {
      return this.dirty == Ae || this.dirty != Se && !this.inParent() || !e.sameMarkup(this.node) ? false : (this.updateOuterDeco(t), (this.dirty != Se || e.text != this.node.text) && e.text != this.nodeDOM.nodeValue && (this.nodeDOM.nodeValue = e.text, i.trackWrites == this.nodeDOM && (i.trackWrites = null)), this.node = e, this.dirty = Se, true);
    }
    inParent() {
      let e = this.parent.contentDOM;
      for (let t = this.nodeDOM; t; t = t.parentNode) if (t == e) return true;
      return false;
    }
    domFromPos(e) {
      return { node: this.nodeDOM, offset: e };
    }
    localPosFromDOM(e, t, r) {
      return e == this.nodeDOM ? this.posAtStart + Math.min(t, this.node.text.length) : super.localPosFromDOM(e, t, r);
    }
    ignoreMutation(e) {
      return e.type != "characterData" && e.type != "selection";
    }
    slice(e, t, r) {
      let i = this.node.cut(e, t), s = document.createTextNode(i.text);
      return new n32(this.parent, i, this.outerDeco, this.innerDeco, s, s, r);
    }
    markDirty(e, t) {
      super.markDirty(e, t), this.dom != this.nodeDOM && (e == 0 || t == this.nodeDOM.nodeValue.length) && (this.dirty = Ae);
    }
    get domAtom() {
      return false;
    }
    isText(e) {
      return this.node.text == e;
    }
  };
  var Yn = class extends kt {
    parseRule() {
      return { ignore: true };
    }
    matchesHack(e) {
      return this.dirty == Se && this.dom.nodeName == e;
    }
    get domAtom() {
      return true;
    }
    get ignoreForCoords() {
      return this.dom.nodeName == "IMG";
    }
  };
  var ns = class extends et {
    constructor(e, t, r, i, s, o, l, a, c, u) {
      super(e, t, r, i, s, o, l, c, u), this.spec = a;
    }
    update(e, t, r, i) {
      if (this.dirty == Ae) return false;
      if (this.spec.update && (this.node.type == e.type || this.spec.multiType)) {
        let s = this.spec.update(e, t, r);
        return s && this.updateInner(e, t, r, i), s;
      } else return !this.contentDOM && !e.isLeaf ? false : super.update(e, t, r, i);
    }
    selectNode() {
      this.spec.selectNode ? this.spec.selectNode() : super.selectNode();
    }
    deselectNode() {
      this.spec.deselectNode ? this.spec.deselectNode() : super.deselectNode();
    }
    setSelection(e, t, r, i) {
      this.spec.setSelection ? this.spec.setSelection(e, t, r.root) : super.setSelection(e, t, r, i);
    }
    destroy() {
      this.spec.destroy && this.spec.destroy(), super.destroy();
    }
    stopEvent(e) {
      return this.spec.stopEvent ? this.spec.stopEvent(e) : false;
    }
    ignoreMutation(e) {
      return this.spec.ignoreMutation ? this.spec.ignoreMutation(e) : super.ignoreMutation(e);
    }
  };
  function Ea(n43, e, t) {
    let r = n43.firstChild, i = false;
    for (let s = 0; s < e.length; s++) {
      let o = e[s], l = o.dom;
      if (l.parentNode == n43) {
        for (; l != r; ) r = ql(r), i = true;
        r = r.nextSibling;
      } else i = true, n43.insertBefore(l, r);
      if (o instanceof $t) {
        let a = r ? r.previousSibling : n43.lastChild;
        Ea(o.contentDOM, o.children, t), r = a ? a.nextSibling : n43.firstChild;
      }
    }
    for (; r; ) r = ql(r), i = true;
    i && t.trackWrites == n43 && (t.trackWrites = null);
  }
  var on = function(n43) {
    n43 && (this.nodeName = n43);
  };
  on.prototype = /* @__PURE__ */ Object.create(null);
  var ht = [new on()];
  function rs(n43, e, t) {
    if (n43.length == 0) return ht;
    let r = t ? ht[0] : new on(), i = [r];
    for (let s = 0; s < n43.length; s++) {
      let o = n43[s].type.attrs;
      if (o) {
        o.nodeName && i.push(r = new on(o.nodeName));
        for (let l in o) {
          let a = o[l];
          a != null && (t && i.length == 1 && i.push(r = new on(e.isInline ? "span" : "div")), l == "class" ? r.class = (r.class ? r.class + " " : "") + a : l == "style" ? r.style = (r.style ? r.style + ";" : "") + a : l != "nodeName" && (r[l] = a));
        }
      }
    }
    return i;
  }
  function Aa(n43, e, t, r) {
    if (t == ht && r == ht) return e;
    let i = e;
    for (let s = 0; s < r.length; s++) {
      let o = r[s], l = t[s];
      if (s) {
        let a;
        l && l.nodeName == o.nodeName && i != n43 && (a = i.parentNode) && a.nodeName.toLowerCase() == o.nodeName || (a = document.createElement(o.nodeName), a.pmIsDeco = true, a.appendChild(i), l = ht[0]), i = a;
      }
      cf(i, l || ht[0], o);
    }
    return i;
  }
  function cf(n43, e, t) {
    for (let r in e) r != "class" && r != "style" && r != "nodeName" && !(r in t) && n43.removeAttribute(r);
    for (let r in t) r != "class" && r != "style" && r != "nodeName" && t[r] != e[r] && n43.setAttribute(r, t[r]);
    if (e.class != t.class) {
      let r = e.class ? e.class.split(" ").filter(Boolean) : [], i = t.class ? t.class.split(" ").filter(Boolean) : [];
      for (let s = 0; s < r.length; s++) i.indexOf(r[s]) == -1 && n43.classList.remove(r[s]);
      for (let s = 0; s < i.length; s++) r.indexOf(i[s]) == -1 && n43.classList.add(i[s]);
      n43.classList.length == 0 && n43.removeAttribute("class");
    }
    if (e.style != t.style) {
      if (e.style) {
        let r = /\s*([\w\-\xa1-\uffff]+)\s*:(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\(.*?\)|[^;])*/g, i;
        for (; i = r.exec(e.style); ) n43.style.removeProperty(i[1]);
      }
      t.style && (n43.style.cssText += t.style);
    }
  }
  function Na(n43, e, t) {
    return Aa(n43, n43, ht, rs(e, t, n43.nodeType != 1));
  }
  function Xn(n43, e) {
    if (n43.length != e.length) return false;
    for (let t = 0; t < n43.length; t++) if (!n43[t].type.eq(e[t].type)) return false;
    return true;
  }
  function ql(n43) {
    let e = n43.nextSibling;
    return n43.parentNode.removeChild(n43), e;
  }
  var is = class {
    constructor(e, t, r) {
      this.lock = t, this.view = r, this.index = 0, this.stack = [], this.changed = false, this.top = e, this.preMatch = uf(e.node.content, e);
    }
    destroyBetween(e, t) {
      if (e != t) {
        for (let r = e; r < t; r++) this.top.children[r].destroy();
        this.top.children.splice(e, t - e), this.changed = true;
      }
    }
    destroyRest() {
      this.destroyBetween(this.index, this.top.children.length);
    }
    syncToMarks(e, t, r, i) {
      let s = 0, o = this.stack.length >> 1, l = Math.min(o, e.length);
      for (; s < l && (s == o - 1 ? this.top : this.stack[s + 1 << 1]).matchesMark(e[s]) && e[s].type.spec.spanning !== false; ) s++;
      for (; s < o; ) this.destroyRest(), this.top.dirty = Se, this.index = this.stack.pop(), this.top = this.stack.pop(), o--;
      for (; o < e.length; ) {
        this.stack.push(this.top, this.index + 1);
        let a = -1, c = this.top.children.length;
        i < this.preMatch.index && (c = Math.min(this.index + 3, c));
        for (let u = this.index; u < c; u++) {
          let d = this.top.children[u];
          if (d.matchesMark(e[o]) && !this.isLocked(d.dom)) {
            a = u;
            break;
          }
        }
        if (a > -1) a > this.index && (this.changed = true, this.destroyBetween(this.index, a)), this.top = this.top.children[this.index];
        else {
          let u = $t.create(this.top, e[o], t, r);
          this.top.children.splice(this.index, 0, u), this.top = u, this.changed = true;
        }
        this.index = 0, o++;
      }
    }
    findNodeMatch(e, t, r, i) {
      let s = -1, o;
      if (i >= this.preMatch.index && (o = this.preMatch.matches[i - this.preMatch.index]).parent == this.top && o.matchesNode(e, t, r)) s = this.top.children.indexOf(o, this.index);
      else for (let l = this.index, a = Math.min(this.top.children.length, l + 5); l < a; l++) {
        let c = this.top.children[l];
        if (c.matchesNode(e, t, r) && !this.preMatch.matched.has(c)) {
          s = l;
          break;
        }
      }
      return s < 0 ? false : (this.destroyBetween(this.index, s), this.index++, true);
    }
    updateNodeAt(e, t, r, i, s) {
      let o = this.top.children[i];
      return o.dirty == Ae && o.dom == o.contentDOM && (o.dirty = ft), o.update(e, t, r, s) ? (this.destroyBetween(this.index, i), this.index++, true) : false;
    }
    findIndexWithChild(e) {
      for (; ; ) {
        let t = e.parentNode;
        if (!t) return -1;
        if (t == this.top.contentDOM) {
          let r = e.pmViewDesc;
          if (r) {
            for (let i = this.index; i < this.top.children.length; i++) if (this.top.children[i] == r) return i;
          }
          return -1;
        }
        e = t;
      }
    }
    updateNextNode(e, t, r, i, s, o) {
      for (let l = this.index; l < this.top.children.length; l++) {
        let a = this.top.children[l];
        if (a instanceof et) {
          let c = this.preMatch.matched.get(a);
          if (c != null && c != s) return false;
          let u = a.dom, d, f = this.isLocked(u) && !(e.isText && a.node && a.node.isText && a.nodeDOM.nodeValue == e.text && a.dirty != Ae && Xn(t, a.outerDeco));
          if (!f && a.update(e, t, r, i)) return this.destroyBetween(this.index, l), a.dom != u && (this.changed = true), this.index++, true;
          if (!f && (d = this.recreateWrapper(a, e, t, r, i, o))) return this.destroyBetween(this.index, l), this.top.children[this.index] = d, d.contentDOM && (d.dirty = ft, d.updateChildren(i, o + 1), d.dirty = Se), this.changed = true, this.index++, true;
          break;
        }
      }
      return false;
    }
    recreateWrapper(e, t, r, i, s, o) {
      if (e.dirty || t.isAtom || !e.children.length || !e.node.content.eq(t.content) || !Xn(r, e.outerDeco) || !i.eq(e.innerDeco)) return null;
      let l = et.create(this.top, t, r, i, s, o);
      if (l.contentDOM) {
        l.children = e.children, e.children = [];
        for (let a of l.children) a.parent = l;
      }
      return e.destroy(), l;
    }
    addNode(e, t, r, i, s) {
      let o = et.create(this.top, e, t, r, i, s);
      o.contentDOM && o.updateChildren(i, s + 1), this.top.children.splice(this.index++, 0, o), this.changed = true;
    }
    placeWidget(e, t, r) {
      let i = this.index < this.top.children.length ? this.top.children[this.index] : null;
      if (i && i.matchesWidget(e) && (e == i.widget || !i.widget.type.toDOM.parentNode)) this.index++;
      else {
        let s = new qn(this.top, e, t, r);
        this.top.children.splice(this.index++, 0, s), this.changed = true;
      }
    }
    addTextblockHacks() {
      let e = this.top.children[this.index - 1], t = this.top;
      for (; e instanceof $t; ) t = e, e = t.children[t.children.length - 1];
      (!e || !(e instanceof Gn) || /\n$/.test(e.node.text) || this.view.requiresGeckoHackNode && /\s$/.test(e.node.text)) && ((se || ee) && e && e.dom.contentEditable == "false" && this.addHackNode("IMG", t), this.addHackNode("BR", this.top));
    }
    addHackNode(e, t) {
      if (t == this.top && this.index < t.children.length && t.children[this.index].matchesHack(e)) this.index++;
      else {
        let r = document.createElement(e);
        e == "IMG" && (r.className = "ProseMirror-separator", r.alt = ""), e == "BR" && (r.className = "ProseMirror-trailingBreak");
        let i = new Yn(this.top, [], r, null);
        t != this.top ? t.children.push(i) : t.children.splice(this.index++, 0, i), this.changed = true;
      }
    }
    isLocked(e) {
      return this.lock && (e == this.lock || e.nodeType == 1 && e.contains(this.lock.parentNode));
    }
  };
  function uf(n43, e) {
    let t = e, r = t.children.length, i = n43.childCount, s = /* @__PURE__ */ new Map(), o = [];
    e: for (; i > 0; ) {
      let l;
      for (; ; ) if (r) {
        let c = t.children[r - 1];
        if (c instanceof $t) t = c, r = c.children.length;
        else {
          l = c, r--;
          break;
        }
      } else {
        if (t == e) break e;
        r = t.parent.children.indexOf(t), t = t.parent;
      }
      let a = l.node;
      if (a) {
        if (a != n43.child(i - 1)) break;
        --i, s.set(l, i), o.push(l);
      }
    }
    return { index: i, matched: s, matches: o.reverse() };
  }
  function df(n43, e) {
    return n43.type.side - e.type.side;
  }
  function ff(n43, e, t, r) {
    let i = e.locals(n43), s = 0;
    if (i.length == 0) {
      for (let c = 0; c < n43.childCount; c++) {
        let u = n43.child(c);
        r(u, i, e.forChild(s, u), c), s += u.nodeSize;
      }
      return;
    }
    let o = 0, l = [], a = null;
    for (let c = 0; ; ) {
      let u, d;
      for (; o < i.length && i[o].to == s; ) {
        let g = i[o++];
        g.widget && (u ? (d || (d = [u])).push(g) : u = g);
      }
      if (u) if (d) {
        d.sort(df);
        for (let g = 0; g < d.length; g++) t(d[g], c, !!a);
      } else t(u, c, !!a);
      let f, h;
      if (a) h = -1, f = a, a = null;
      else if (c < n43.childCount) h = c, f = n43.child(c++);
      else break;
      for (let g = 0; g < l.length; g++) l[g].to <= s && l.splice(g--, 1);
      for (; o < i.length && i[o].from <= s && i[o].to > s; ) l.push(i[o++]);
      let p = s + f.nodeSize;
      if (f.isText) {
        let g = p;
        o < i.length && i[o].from < g && (g = i[o].from);
        for (let y = 0; y < l.length; y++) l[y].to < g && (g = l[y].to);
        g < p && (a = f.cut(g - s), f = f.cut(0, g - s), p = g, h = -1);
      } else for (; o < i.length && i[o].to < p; ) o++;
      let m = f.isInline && !f.isLeaf ? l.filter((g) => !g.inline) : l.slice();
      r(f, m, e.forChild(s, f), h), s = p;
    }
  }
  function hf(n43) {
    if (n43.nodeName == "UL" || n43.nodeName == "OL") {
      let e = n43.style.cssText;
      n43.style.cssText = e + "; list-style: square !important", window.getComputedStyle(n43).listStyle, n43.style.cssText = e;
    }
  }
  function pf(n43, e, t, r) {
    for (let i = 0, s = 0; i < n43.childCount && s <= r; ) {
      let o = n43.child(i++), l = s;
      if (s += o.nodeSize, !o.isText) continue;
      let a = o.text;
      for (; i < n43.childCount; ) {
        let c = n43.child(i++);
        if (s += c.nodeSize, !c.isText) break;
        a += c.text;
      }
      if (s >= t) {
        if (s >= r && a.slice(r - e.length - l, r - l) == e) return r - e.length;
        let c = l < r ? a.lastIndexOf(e, r - l - 1) : -1;
        if (c >= 0 && c + e.length + l >= t) return l + c;
        if (t == r && a.length >= r + e.length - l && a.slice(r - l, r - l + e.length) == e) return r;
      }
    }
    return -1;
  }
  function ss(n43, e, t, r, i) {
    let s = [];
    for (let o = 0, l = 0; o < n43.length; o++) {
      let a = n43[o], c = l, u = l += a.size;
      c >= t || u <= e ? s.push(a) : (c < e && s.push(a.slice(0, e - c, r)), i && (s.push(i), i = void 0), u > t && s.push(a.slice(t - c, a.size, r)));
    }
    return s;
  }
  function ys(n43, e = null) {
    let t = n43.domSelectionRange(), r = n43.state.doc;
    if (!t.focusNode) return null;
    let i = n43.docView.nearestDesc(t.focusNode), s = i && i.size == 0, o = n43.docView.posFromDOM(t.focusNode, t.focusOffset, 1);
    if (o < 0) return null;
    let l = r.resolve(o), a, c;
    if (ir(t)) {
      for (a = o; i && !i.node; ) i = i.parent;
      let d = i.node;
      if (i && d.isAtom && C.isSelectable(d) && i.parent && !(d.isInline && jd(t.focusNode, t.focusOffset, i.dom))) {
        let f = i.posBefore;
        c = new C(o == f ? l : r.resolve(f));
      }
    } else {
      if (t instanceof n43.dom.ownerDocument.defaultView.Selection && t.rangeCount > 1) {
        let d = o, f = o;
        for (let h = 0; h < t.rangeCount; h++) {
          let p = t.getRangeAt(h);
          d = Math.min(d, n43.docView.posFromDOM(p.startContainer, p.startOffset, 1)), f = Math.max(f, n43.docView.posFromDOM(p.endContainer, p.endOffset, -1));
        }
        if (d < 0) return null;
        [a, o] = f == n43.state.selection.anchor ? [f, d] : [d, f], l = r.resolve(o);
      } else a = n43.docView.posFromDOM(t.anchorNode, t.anchorOffset, 1);
      if (a < 0) return null;
    }
    let u = r.resolve(a);
    if (!c) {
      let d = e == "pointer" || n43.state.selection.head < l.pos && !s ? 1 : -1;
      c = ks(n43, u, l, d);
    }
    return c;
  }
  function Oa(n43) {
    return n43.editable ? n43.hasFocus() : Ra(n43) && document.activeElement && document.activeElement.contains(n43.dom);
  }
  function je(n43, e = false) {
    let t = n43.state.selection;
    if (Ia(n43, t), !!Oa(n43)) {
      if (!e && n43.input.mouseDown && n43.input.mouseDown.allowDefault && ee) {
        let r = n43.domSelectionRange(), i = n43.domObserver.currentSelection;
        if (r.anchorNode && i.anchorNode && yt(r.anchorNode, r.anchorOffset, i.anchorNode, i.anchorOffset)) {
          n43.input.mouseDown.delayedSelectionSync = true, n43.domObserver.setCurSelection();
          return;
        }
      }
      if (n43.domObserver.disconnectSelection(), n43.cursorWrapper) gf(n43);
      else {
        let { anchor: r, head: i } = t, s, o;
        Gl && !(t instanceof E) && (t.$from.parent.inlineContent || (s = Yl(n43, t.from)), !t.empty && !t.$from.parent.inlineContent && (o = Yl(n43, t.to))), n43.docView.setSelection(r, i, n43, e), Gl && (s && Xl(s), o && Xl(o)), t.visible ? n43.dom.classList.remove("ProseMirror-hideselection") : (n43.dom.classList.add("ProseMirror-hideselection"), "onselectionchange" in document && mf(n43));
      }
      n43.domObserver.setCurSelection(), n43.domObserver.connectSelection();
    }
  }
  var Gl = se || ee && ba < 63;
  function Yl(n43, e) {
    let { node: t, offset: r } = n43.docView.domFromPos(e, 0), i = r < t.childNodes.length ? t.childNodes[r] : null, s = r ? t.childNodes[r - 1] : null;
    if (se && i && i.contentEditable == "false") return Ji(i);
    if ((!i || i.contentEditable == "false") && (!s || s.contentEditable == "false")) {
      if (i) return Ji(i);
      if (s) return Ji(s);
    }
  }
  function Ji(n43) {
    return n43.contentEditable = "true", se && n43.draggable && (n43.draggable = false, n43.wasDraggable = true), n43;
  }
  function Xl(n43) {
    n43.contentEditable = "false", n43.wasDraggable && (n43.draggable = true, n43.wasDraggable = null);
  }
  function mf(n43) {
    let e = n43.dom.ownerDocument;
    e.removeEventListener("selectionchange", n43.input.hideSelectionGuard);
    let t = n43.domSelectionRange(), r = t.anchorNode, i = t.anchorOffset;
    e.addEventListener("selectionchange", n43.input.hideSelectionGuard = () => {
      (t.anchorNode != r || t.anchorOffset != i) && (e.removeEventListener("selectionchange", n43.input.hideSelectionGuard), setTimeout(() => {
        (!Oa(n43) || n43.state.selection.visible) && n43.dom.classList.remove("ProseMirror-hideselection");
      }, 20));
    });
  }
  function gf(n43) {
    let e = n43.domSelection();
    if (!e) return;
    let t = n43.cursorWrapper.dom, r = t.nodeName == "IMG";
    r ? e.collapse(t.parentNode, Z(t) + 1) : e.collapse(t, 0), !r && !n43.state.selection.visible && he && Ze <= 11 && (t.disabled = true, t.disabled = false);
  }
  function Ia(n43, e) {
    if (e instanceof C) {
      let t = n43.docView.descAt(e.from);
      t != n43.lastSelectedViewDesc && (Ql(n43), t && t.selectNode(), n43.lastSelectedViewDesc = t);
    } else Ql(n43);
  }
  function Ql(n43) {
    n43.lastSelectedViewDesc && (n43.lastSelectedViewDesc.parent && n43.lastSelectedViewDesc.deselectNode(), n43.lastSelectedViewDesc = void 0);
  }
  function ks(n43, e, t, r) {
    return n43.someProp("createSelectionBetween", (i) => i(n43, e, t)) || E.between(e, t, r);
  }
  function Zl(n43) {
    return n43.editable && !n43.hasFocus() ? false : Ra(n43);
  }
  function Ra(n43) {
    let e = n43.domSelectionRange();
    if (!e.anchorNode) return false;
    try {
      return n43.dom.contains(e.anchorNode.nodeType == 3 ? e.anchorNode.parentNode : e.anchorNode) && (n43.editable || n43.dom.contains(e.focusNode.nodeType == 3 ? e.focusNode.parentNode : e.focusNode));
    } catch {
      return false;
    }
  }
  function yf(n43) {
    let e = n43.docView.domFromPos(n43.state.selection.anchor, 0), t = n43.domSelectionRange();
    return yt(e.node, e.offset, t.anchorNode, t.anchorOffset);
  }
  function ls(n43, e) {
    let { $anchor: t, $head: r } = n43.selection, i = e > 0 ? t.max(r) : t.min(r), s = i.parent.inlineContent ? i.depth ? n43.doc.resolve(e > 0 ? i.after() : i.before()) : null : i;
    return s && N.findFrom(s, e);
  }
  function Xe(n43, e) {
    return n43.dispatch(n43.state.tr.setSelection(e).scrollIntoView()), true;
  }
  function ea(n43, e, t) {
    let r = n43.state.selection;
    if (r instanceof E) if (t.indexOf("s") > -1) {
      let { $head: i } = r, s = i.textOffset ? null : e < 0 ? i.nodeBefore : i.nodeAfter;
      if (!s || s.isText || !s.isLeaf) return false;
      let o = n43.state.doc.resolve(i.pos + s.nodeSize * (e < 0 ? -1 : 1));
      return Xe(n43, new E(r.$anchor, o));
    } else if (r.empty) {
      if (n43.endOfTextblock(e > 0 ? "forward" : "backward")) {
        let i = ls(n43.state, e);
        return i && i instanceof C ? Xe(n43, i) : false;
      } else if (!(ke && t.indexOf("m") > -1)) {
        let i = r.$head, s = i.textOffset ? null : e < 0 ? i.nodeBefore : i.nodeAfter, o;
        if (!s || s.isText) return false;
        let l = e < 0 ? i.pos - s.nodeSize : i.pos;
        return s.isAtom || (o = n43.docView.descAt(l)) && !o.contentDOM ? C.isSelectable(s) ? Xe(n43, new C(e < 0 ? n43.state.doc.resolve(i.pos - s.nodeSize) : i)) : hn ? Xe(n43, new E(n43.state.doc.resolve(e < 0 ? l : l + s.nodeSize))) : false : false;
      }
    } else return false;
    else {
      if (r instanceof C && r.node.isInline) return Xe(n43, new E(e > 0 ? r.$to : r.$from));
      {
        let i = ls(n43.state, e);
        return i ? Xe(n43, i) : false;
      }
    }
  }
  function Qn(n43) {
    return n43.nodeType == 3 ? n43.nodeValue.length : n43.childNodes.length;
  }
  function ln(n43, e) {
    let t = n43.pmViewDesc;
    return t && t.size == 0 && (e < 0 || n43.nextSibling || n43.nodeName != "BR");
  }
  function Lt(n43, e) {
    return e < 0 ? kf(n43) : bf(n43);
  }
  function kf(n43) {
    let e = n43.domSelectionRange(), t = e.focusNode, r = e.focusOffset;
    if (!t) return;
    let i, s, o = false;
    for (xe && t.nodeType == 1 && r < Qn(t) && ln(t.childNodes[r], -1) && (o = true); ; ) if (r > 0) {
      if (t.nodeType != 1) break;
      {
        let l = t.childNodes[r - 1];
        if (ln(l, -1)) i = t, s = --r;
        else if (l.nodeType == 3) t = l, r = t.nodeValue.length;
        else break;
      }
    } else {
      if (Da(t)) break;
      {
        let l = t.previousSibling;
        for (; l && ln(l, -1); ) i = t.parentNode, s = Z(l), l = l.previousSibling;
        if (l) t = l, r = Qn(t);
        else {
          if (t = t.parentNode, t == n43.dom) break;
          r = 0;
        }
      }
    }
    o ? as(n43, t, r) : i && as(n43, i, s);
  }
  function bf(n43) {
    let e = n43.domSelectionRange(), t = e.focusNode, r = e.focusOffset;
    if (!t) return;
    let i = Qn(t), s, o;
    for (; ; ) if (r < i) {
      if (t.nodeType != 1) break;
      let l = t.childNodes[r];
      if (ln(l, 1)) s = t, o = ++r;
      else break;
    } else {
      if (Da(t)) break;
      {
        let l = t.nextSibling;
        for (; l && ln(l, 1); ) s = l.parentNode, o = Z(l) + 1, l = l.nextSibling;
        if (l) t = l, r = 0, i = Qn(t);
        else {
          if (t = t.parentNode, t == n43.dom) break;
          r = i = 0;
        }
      }
    }
    s && as(n43, s, o);
  }
  function Da(n43) {
    let e = n43.pmViewDesc;
    return e && e.node && e.node.isBlock;
  }
  function xf(n43, e) {
    for (; n43 && e == n43.childNodes.length && !fn(n43); ) e = Z(n43) + 1, n43 = n43.parentNode;
    for (; n43 && e < n43.childNodes.length; ) {
      let t = n43.childNodes[e];
      if (t.nodeType == 3) return t;
      if (t.nodeType == 1 && t.contentEditable == "false") break;
      n43 = t, e = 0;
    }
  }
  function Sf(n43, e) {
    for (; n43 && !e && !fn(n43); ) e = Z(n43), n43 = n43.parentNode;
    for (; n43 && e; ) {
      let t = n43.childNodes[e - 1];
      if (t.nodeType == 3) return t;
      if (t.nodeType == 1 && t.contentEditable == "false") break;
      n43 = t, e = n43.childNodes.length;
    }
  }
  function as(n43, e, t) {
    if (e.nodeType != 3) {
      let s, o;
      (o = xf(e, t)) ? (e = o, t = 0) : (s = Sf(e, t)) && (e = s, t = s.nodeValue.length);
    }
    let r = n43.domSelection();
    if (!r) return;
    if (ir(r)) {
      let s = document.createRange();
      s.setEnd(e, t), s.setStart(e, t), r.removeAllRanges(), r.addRange(s);
    } else r.extend && r.extend(e, t);
    n43.domObserver.setCurSelection();
    let { state: i } = n43;
    setTimeout(() => {
      n43.state == i && je(n43);
    }, 50);
  }
  function ta(n43, e) {
    let t = n43.state.doc.resolve(e);
    if (!(ee || xa) && t.parent.inlineContent) {
      let i = n43.coordsAtPos(e);
      if (e > t.start()) {
        let s = n43.coordsAtPos(e - 1), o = (s.top + s.bottom) / 2;
        if (o > i.top && o < i.bottom && Math.abs(s.left - i.left) > 1) return s.left < i.left ? "ltr" : "rtl";
      }
      if (e < t.end()) {
        let s = n43.coordsAtPos(e + 1), o = (s.top + s.bottom) / 2;
        if (o > i.top && o < i.bottom && Math.abs(s.left - i.left) > 1) return s.left > i.left ? "ltr" : "rtl";
      }
    }
    return getComputedStyle(n43.dom).direction == "rtl" ? "rtl" : "ltr";
  }
  function na(n43, e, t) {
    let r = n43.state.selection;
    if (r instanceof E && !r.empty || t.indexOf("s") > -1 || ke && t.indexOf("m") > -1) return false;
    let { $from: i, $to: s } = r;
    if (!i.parent.inlineContent || n43.endOfTextblock(e < 0 ? "up" : "down")) {
      let o = ls(n43.state, e);
      if (o && o instanceof C) return Xe(n43, o);
    }
    if (!i.parent.inlineContent) {
      let o = e < 0 ? i : s, l = r instanceof ae ? N.near(o, e) : N.findFrom(o, e);
      return l ? Xe(n43, l) : false;
    }
    return false;
  }
  function ra(n43, e) {
    if (!(n43.state.selection instanceof E)) return true;
    let { $head: t, $anchor: r, empty: i } = n43.state.selection;
    if (!t.sameParent(r)) return true;
    if (!i) return false;
    if (n43.endOfTextblock(e > 0 ? "forward" : "backward")) return true;
    let s = !t.textOffset && (e < 0 ? t.nodeBefore : t.nodeAfter);
    if (s && !s.isText) {
      let o = n43.state.tr;
      return e < 0 ? o.delete(t.pos - s.nodeSize, t.pos) : o.delete(t.pos, t.pos + s.nodeSize), n43.dispatch(o), true;
    }
    return false;
  }
  function ia(n43, e, t) {
    n43.domObserver.stop(), e.contentEditable = t, n43.domObserver.start();
  }
  function Mf(n43) {
    if (!se || n43.state.selection.$head.parentOffset > 0) return false;
    let { focusNode: e, focusOffset: t } = n43.domSelectionRange();
    if (e && e.nodeType == 1 && t == 0 && e.firstChild && e.firstChild.contentEditable == "false") {
      let r = e.firstChild;
      ia(n43, r, "true"), setTimeout(() => ia(n43, r, "false"), 20);
    }
    return false;
  }
  function wf(n43) {
    let e = "";
    return n43.ctrlKey && (e += "c"), n43.metaKey && (e += "m"), n43.altKey && (e += "a"), n43.shiftKey && (e += "s"), e;
  }
  function Cf(n43, e) {
    let t = e.keyCode, r = wf(e);
    if (t == 8 || ke && t == 72 && r == "c") return ra(n43, -1) || Lt(n43, -1);
    if (t == 46 && !e.shiftKey || ke && t == 68 && r == "c") return ra(n43, 1) || Lt(n43, 1);
    if (t == 13 || t == 27) return true;
    if (t == 37 || ke && t == 66 && r == "c") {
      let i = t == 37 ? ta(n43, n43.state.selection.from) == "ltr" ? -1 : 1 : -1;
      return ea(n43, i, r) || Lt(n43, i);
    } else if (t == 39 || ke && t == 70 && r == "c") {
      let i = t == 39 ? ta(n43, n43.state.selection.from) == "ltr" ? 1 : -1 : 1;
      return ea(n43, i, r) || Lt(n43, i);
    } else {
      if (t == 38 || ke && t == 80 && r == "c") return na(n43, -1, r) || Lt(n43, -1);
      if (t == 40 || ke && t == 78 && r == "c") return Mf(n43) || na(n43, 1, r) || Lt(n43, 1);
      if (r == (ke ? "m" : "c") && (t == 66 || t == 73 || t == 89 || t == 90)) return true;
    }
    return false;
  }
  function bs(n43, e) {
    n43.someProp("transformCopied", (h) => {
      e = h(e, n43);
    });
    let t = [], { content: r, openStart: i, openEnd: s } = e;
    for (; i > 1 && s > 1 && r.childCount == 1 && r.firstChild.childCount == 1; ) {
      i--, s--;
      let h = r.firstChild;
      t.push(h.type.name, h.attrs != h.type.defaultAttrs ? h.attrs : null), r = h.content;
    }
    let o = n43.someProp("clipboardSerializer") || ze.fromSchema(n43.state.schema), l = Ha(), a = l.createElement("div");
    a.appendChild(o.serializeFragment(r, { document: l }));
    let c = a.firstChild, u, d = 0;
    for (; c && c.nodeType == 1 && (u = Fa[c.nodeName.toLowerCase()]); ) {
      for (let h = u.length - 1; h >= 0; h--) {
        let p = l.createElement(u[h]);
        for (; a.firstChild; ) p.appendChild(a.firstChild);
        a.appendChild(p), d++;
      }
      c = a.firstChild;
    }
    c && c.nodeType == 1 && c.setAttribute("data-pm-slice", `${i} ${s}${d ? ` -${d}` : ""} ${JSON.stringify(t)}`);
    let f = n43.someProp("clipboardTextSerializer", (h) => h(e, n43)) || e.content.textBetween(0, e.content.size, `

`);
    return { dom: a, text: f, slice: e };
  }
  function Pa(n43, e, t, r, i) {
    let s = i.parent.type.spec.code, o, l;
    if (!t && !e) return null;
    let a = !!e && (r || s || !t);
    if (a) {
      if (n43.someProp("transformPastedText", (f) => {
        e = f(e, s || r, n43);
      }), s) return l = new x(k.from(n43.state.schema.text(e.replace(/\r\n?/g, `
`))), 0, 0), n43.someProp("transformPasted", (f) => {
        l = f(l, n43, true);
      }), l;
      let d = n43.someProp("clipboardTextParser", (f) => f(e, i, r, n43));
      if (d) l = d;
      else {
        let f = i.marks(), { schema: h } = n43.state, p = ze.fromSchema(h);
        o = document.createElement("div"), e.split(/(?:\r\n?|\n)+/).forEach((m) => {
          let g = o.appendChild(document.createElement("p"));
          m && g.appendChild(p.serializeNode(h.text(m, f)));
        });
      }
    } else n43.someProp("transformPastedHTML", (d) => {
      t = d(t, n43);
    }), o = Af(t), hn && Nf(o);
    let c = o && o.querySelector("[data-pm-slice]"), u = c && /^(\d+) (\d+)(?: -(\d+))? (.*)/.exec(c.getAttribute("data-pm-slice") || "");
    if (u && u[3]) for (let d = +u[3]; d > 0; d--) {
      let f = o.firstChild;
      for (; f && f.nodeType != 1; ) f = f.nextSibling;
      if (!f) break;
      o = f;
    }
    if (l || (l = (n43.someProp("clipboardParser") || n43.someProp("domParser") || ve.fromSchema(n43.state.schema)).parseSlice(o, { preserveWhitespace: !!(a || u), context: i, ruleFromNode(f) {
      return f.nodeName == "BR" && !f.nextSibling && f.parentNode && !Tf.test(f.parentNode.nodeName) ? { ignore: true } : null;
    } })), u) l = Of(sa(l, +u[1], +u[2]), u[4]);
    else if (l = x.maxOpen(vf(l.content, i), true), l.openStart || l.openEnd) {
      let d = 0, f = 0;
      for (let h = l.content.firstChild; d < l.openStart && !h.type.spec.isolating; d++, h = h.firstChild) ;
      for (let h = l.content.lastChild; f < l.openEnd && !h.type.spec.isolating; f++, h = h.lastChild) ;
      l = sa(l, d, f);
    }
    return n43.someProp("transformPasted", (d) => {
      l = d(l, n43, a);
    }), l;
  }
  var Tf = /^(a|abbr|acronym|b|cite|code|del|em|i|ins|kbd|label|output|q|ruby|s|samp|span|strong|sub|sup|time|u|tt|var)$/i;
  function vf(n43, e) {
    if (n43.childCount < 2) return n43;
    for (let t = e.depth; t >= 0; t--) {
      let i = e.node(t).contentMatchAt(e.index(t)), s, o = [];
      if (n43.forEach((l) => {
        if (!o) return;
        let a = i.findWrapping(l.type), c;
        if (!a) return o = null;
        if (c = o.length && s.length && za(a, s, l, o[o.length - 1], 0)) o[o.length - 1] = c;
        else {
          o.length && (o[o.length - 1] = Ba(o[o.length - 1], s.length));
          let u = La(l, a);
          o.push(u), i = i.matchType(u.type), s = a;
        }
      }), o) return k.from(o);
    }
    return n43;
  }
  function La(n43, e, t = 0) {
    for (let r = e.length - 1; r >= t; r--) n43 = e[r].create(null, k.from(n43));
    return n43;
  }
  function za(n43, e, t, r, i) {
    if (i < n43.length && i < e.length && n43[i] == e[i]) {
      let s = za(n43, e, t, r.lastChild, i + 1);
      if (s) return r.copy(r.content.replaceChild(r.childCount - 1, s));
      if (r.contentMatchAt(r.childCount).matchType(i == n43.length - 1 ? t.type : n43[i + 1])) return r.copy(r.content.append(k.from(La(t, n43, i + 1))));
    }
  }
  function Ba(n43, e) {
    if (e == 0) return n43;
    let t = n43.content.replaceChild(n43.childCount - 1, Ba(n43.lastChild, e - 1)), r = n43.contentMatchAt(n43.childCount).fillBefore(k.empty, true);
    return n43.copy(t.append(r));
  }
  function cs(n43, e, t, r, i, s) {
    let o = e < 0 ? n43.firstChild : n43.lastChild, l = o.content;
    return n43.childCount > 1 && (s = 0), i < r - 1 && (l = cs(l, e, t, r, i + 1, s)), i >= t && (l = e < 0 ? o.contentMatchAt(0).fillBefore(l, s <= i).append(l) : l.append(o.contentMatchAt(o.childCount).fillBefore(k.empty, true))), n43.replaceChild(e < 0 ? 0 : n43.childCount - 1, o.copy(l));
  }
  function sa(n43, e, t) {
    return e < n43.openStart && (n43 = new x(cs(n43.content, -1, e, n43.openStart, 0, n43.openEnd), e, n43.openEnd)), t < n43.openEnd && (n43 = new x(cs(n43.content, 1, t, n43.openEnd, 0, 0), n43.openStart, t)), n43;
  }
  var Fa = { thead: ["table"], tbody: ["table"], tfoot: ["table"], caption: ["table"], colgroup: ["table"], col: ["table", "colgroup"], tr: ["table", "tbody"], td: ["table", "tbody", "tr"], th: ["table", "tbody", "tr"] };
  var oa = null;
  function Ha() {
    return oa || (oa = document.implementation.createHTMLDocument("title"));
  }
  var qi = null;
  function Ef(n43) {
    let e = window.trustedTypes;
    return e ? (qi || (qi = e.defaultPolicy || e.createPolicy("ProseMirrorClipboard", { createHTML: (t) => t })), qi.createHTML(n43)) : n43;
  }
  function Af(n43) {
    let e = /^(\s*<meta [^>]*>)*/.exec(n43);
    e && (n43 = n43.slice(e[0].length));
    let t = Ha().createElement("div"), r = /<([a-z][^>\s]+)/i.exec(n43), i;
    if ((i = r && Fa[r[1].toLowerCase()]) && (n43 = i.map((s) => "<" + s + ">").join("") + n43 + i.map((s) => "</" + s + ">").reverse().join("")), t.innerHTML = Ef(n43), i) for (let s = 0; s < i.length; s++) t = t.querySelector(i[s]) || t;
    return t;
  }
  function Nf(n43) {
    let e = n43.querySelectorAll(ee ? "span:not([class]):not([style])" : "span.Apple-converted-space");
    for (let t = 0; t < e.length; t++) {
      let r = e[t];
      r.childNodes.length == 1 && r.textContent == "\xA0" && r.parentNode && r.parentNode.replaceChild(n43.ownerDocument.createTextNode(" "), r);
    }
  }
  function Of(n43, e) {
    if (!n43.size) return n43;
    let t = n43.content.firstChild.type.schema, r;
    try {
      r = JSON.parse(e);
    } catch {
      return n43;
    }
    let { content: i, openStart: s, openEnd: o } = n43;
    for (let l = r.length - 2; l >= 0; l -= 2) {
      let a = t.nodes[r[l]];
      if (!a || a.hasRequiredAttrs()) break;
      i = k.from(a.create(r[l + 1], i)), s++, o++;
    }
    return new x(i, s, o);
  }
  var ce = {};
  var ue = {};
  var If = { touchstart: true, touchmove: true };
  var us = class {
    constructor() {
      this.shiftKey = false, this.mouseDown = null, this.lastKeyCode = null, this.lastKeyCodeTime = 0, this.lastClick = { time: 0, x: 0, y: 0, type: "", button: 0 }, this.lastSelectionOrigin = null, this.lastSelectionTime = 0, this.lastIOSEnter = 0, this.lastIOSEnterFallbackTimeout = -1, this.lastFocus = 0, this.lastTouch = 0, this.lastChromeDelete = 0, this.composing = false, this.compositionNode = null, this.composingTimeout = -1, this.compositionNodes = [], this.compositionEndedAt = -2e8, this.compositionID = 1, this.badSafariComposition = false, this.compositionPendingChanges = 0, this.domChangeCount = 0, this.eventHandlers = /* @__PURE__ */ Object.create(null), this.hideSelectionGuard = null;
    }
  };
  function Rf(n43) {
    for (let e in ce) {
      let t = ce[e];
      n43.dom.addEventListener(e, n43.input.eventHandlers[e] = (r) => {
        Pf(n43, r) && !xs(n43, r) && (n43.editable || !(r.type in ue)) && t(n43, r);
      }, If[e] ? { passive: true } : void 0);
    }
    se && n43.dom.addEventListener("input", () => null), ds(n43);
  }
  function Qe(n43, e) {
    n43.input.lastSelectionOrigin = e, n43.input.lastSelectionTime = Date.now();
  }
  function Df(n43) {
    n43.domObserver.stop();
    for (let e in n43.input.eventHandlers) n43.dom.removeEventListener(e, n43.input.eventHandlers[e]);
    clearTimeout(n43.input.composingTimeout), clearTimeout(n43.input.lastIOSEnterFallbackTimeout);
  }
  function ds(n43) {
    n43.someProp("handleDOMEvents", (e) => {
      for (let t in e) n43.input.eventHandlers[t] || n43.dom.addEventListener(t, n43.input.eventHandlers[t] = (r) => xs(n43, r));
    });
  }
  function xs(n43, e) {
    return n43.someProp("handleDOMEvents", (t) => {
      let r = t[e.type];
      return r ? r(n43, e) || e.defaultPrevented : false;
    });
  }
  function Pf(n43, e) {
    if (!e.bubbles) return true;
    if (e.defaultPrevented) return false;
    for (let t = e.target; t != n43.dom; t = t.parentNode) if (!t || t.nodeType == 11 || t.pmViewDesc && t.pmViewDesc.stopEvent(e)) return false;
    return true;
  }
  function Lf(n43, e) {
    !xs(n43, e) && ce[e.type] && (n43.editable || !(e.type in ue)) && ce[e.type](n43, e);
  }
  ue.keydown = (n43, e) => {
    let t = e;
    if (n43.input.shiftKey = t.keyCode == 16 || t.shiftKey, !_a(n43, t) && (n43.input.lastKeyCode = t.keyCode, n43.input.lastKeyCodeTime = Date.now(), !(Ve && ee && t.keyCode == 13))) if (t.keyCode != 229 && n43.domObserver.forceFlush(), Ht && t.keyCode == 13 && !t.ctrlKey && !t.altKey && !t.metaKey) {
      let r = Date.now();
      n43.input.lastIOSEnter = r, n43.input.lastIOSEnterFallbackTimeout = setTimeout(() => {
        n43.input.lastIOSEnter == r && (n43.someProp("handleKeyDown", (i) => i(n43, dt(13, "Enter"))), n43.input.lastIOSEnter = 0);
      }, 200);
    } else n43.someProp("handleKeyDown", (r) => r(n43, t)) || Cf(n43, t) ? t.preventDefault() : Qe(n43, "key");
  };
  ue.keyup = (n43, e) => {
    e.keyCode == 16 && (n43.input.shiftKey = false);
  };
  ue.keypress = (n43, e) => {
    let t = e;
    if (_a(n43, t) || !t.charCode || t.ctrlKey && !t.altKey || ke && t.metaKey) return;
    if (n43.someProp("handleKeyPress", (i) => i(n43, t))) {
      t.preventDefault();
      return;
    }
    let r = n43.state.selection;
    if (!(r instanceof E) || !r.$from.sameParent(r.$to)) {
      let i = String.fromCharCode(t.charCode), s = () => n43.state.tr.insertText(i).scrollIntoView();
      !/[\r\n]/.test(i) && !n43.someProp("handleTextInput", (o) => o(n43, r.$from.pos, r.$to.pos, i, s)) && n43.dispatch(s()), t.preventDefault();
    }
  };
  function sr(n43) {
    return { left: n43.clientX, top: n43.clientY };
  }
  function zf(n43, e) {
    let t = e.x - n43.clientX, r = e.y - n43.clientY;
    return t * t + r * r < 100;
  }
  function Ss(n43, e, t, r, i) {
    if (r == -1) return false;
    let s = n43.state.doc.resolve(r);
    for (let o = s.depth + 1; o > 0; o--) if (n43.someProp(e, (l) => o > s.depth ? l(n43, t, s.nodeAfter, s.before(o), i, true) : l(n43, t, s.node(o), s.before(o), i, false))) return true;
    return false;
  }
  function Bt(n43, e, t) {
    if (n43.focused || n43.focus(), n43.state.selection.eq(e)) return;
    let r = n43.state.tr.setSelection(e);
    t == "pointer" && r.setMeta("pointer", true), n43.dispatch(r);
  }
  function Bf(n43, e) {
    if (e == -1) return false;
    let t = n43.state.doc.resolve(e), r = t.nodeAfter;
    return r && r.isAtom && C.isSelectable(r) ? (Bt(n43, new C(t), "pointer"), true) : false;
  }
  function Ff(n43, e) {
    if (e == -1) return false;
    let t = n43.state.selection, r, i;
    t instanceof C && (r = t.node);
    let s = n43.state.doc.resolve(e);
    for (let o = s.depth + 1; o > 0; o--) {
      let l = o > s.depth ? s.nodeAfter : s.node(o);
      if (C.isSelectable(l)) {
        r && t.$from.depth > 0 && o >= t.$from.depth && s.before(t.$from.depth + 1) == t.$from.pos ? i = s.before(t.$from.depth) : i = s.before(o);
        break;
      }
    }
    return i != null ? (Bt(n43, C.create(n43.state.doc, i), "pointer"), true) : false;
  }
  function Hf(n43, e, t, r, i) {
    return Ss(n43, "handleClickOn", e, t, r) || n43.someProp("handleClick", (s) => s(n43, e, r)) || (i ? Ff(n43, t) : Bf(n43, t));
  }
  function $f(n43, e, t, r) {
    return Ss(n43, "handleDoubleClickOn", e, t, r) || n43.someProp("handleDoubleClick", (i) => i(n43, e, r));
  }
  function _f(n43, e, t, r) {
    return Ss(n43, "handleTripleClickOn", e, t, r) || n43.someProp("handleTripleClick", (i) => i(n43, e, r)) || Vf(n43, t, r);
  }
  function Vf(n43, e, t) {
    if (t.button != 0) return false;
    let r = n43.state.doc;
    if (e == -1) return r.inlineContent ? (Bt(n43, E.create(r, 0, r.content.size), "pointer"), true) : false;
    let i = r.resolve(e);
    for (let s = i.depth + 1; s > 0; s--) {
      let o = s > i.depth ? i.nodeAfter : i.node(s), l = i.before(s);
      if (o.inlineContent) Bt(n43, E.create(r, l + 1, l + 1 + o.content.size), "pointer");
      else if (C.isSelectable(o)) Bt(n43, C.create(r, l), "pointer");
      else continue;
      return true;
    }
  }
  function Ms(n43) {
    return Zn(n43);
  }
  var $a = ke ? "metaKey" : "ctrlKey";
  ce.mousedown = (n43, e) => {
    let t = e;
    n43.input.shiftKey = t.shiftKey;
    let r = Ms(n43), i = Date.now(), s = "singleClick";
    i - n43.input.lastClick.time < 500 && zf(t, n43.input.lastClick) && !t[$a] && n43.input.lastClick.button == t.button && (n43.input.lastClick.type == "singleClick" ? s = "doubleClick" : n43.input.lastClick.type == "doubleClick" && (s = "tripleClick")), n43.input.lastClick = { time: i, x: t.clientX, y: t.clientY, type: s, button: t.button };
    let o = n43.posAtCoords(sr(t));
    o && (s == "singleClick" ? (n43.input.mouseDown && n43.input.mouseDown.done(), n43.input.mouseDown = new fs(n43, o, t, !!r)) : (s == "doubleClick" ? $f : _f)(n43, o.pos, o.inside, t) ? t.preventDefault() : Qe(n43, "pointer"));
  };
  var fs = class {
    constructor(e, t, r, i) {
      this.view = e, this.pos = t, this.event = r, this.flushed = i, this.delayedSelectionSync = false, this.mightDrag = null, this.startDoc = e.state.doc, this.selectNode = !!r[$a], this.allowDefault = r.shiftKey;
      let s, o;
      if (t.inside > -1) s = e.state.doc.nodeAt(t.inside), o = t.inside;
      else {
        let u = e.state.doc.resolve(t.pos);
        s = u.parent, o = u.depth ? u.before() : 0;
      }
      let l = i ? null : r.target, a = l ? e.docView.nearestDesc(l, true) : null;
      this.target = a && a.nodeDOM.nodeType == 1 ? a.nodeDOM : null;
      let { selection: c } = e.state;
      r.button == 0 && (s.type.spec.draggable && s.type.spec.selectable !== false || c instanceof C && c.from <= o && c.to > o) && (this.mightDrag = { node: s, pos: o, addAttr: !!(this.target && !this.target.draggable), setUneditable: !!(this.target && xe && !this.target.hasAttribute("contentEditable")) }), this.target && this.mightDrag && (this.mightDrag.addAttr || this.mightDrag.setUneditable) && (this.view.domObserver.stop(), this.mightDrag.addAttr && (this.target.draggable = true), this.mightDrag.setUneditable && setTimeout(() => {
        this.view.input.mouseDown == this && this.target.setAttribute("contentEditable", "false");
      }, 20), this.view.domObserver.start()), e.root.addEventListener("mouseup", this.up = this.up.bind(this)), e.root.addEventListener("mousemove", this.move = this.move.bind(this)), Qe(e, "pointer");
    }
    done() {
      this.view.root.removeEventListener("mouseup", this.up), this.view.root.removeEventListener("mousemove", this.move), this.mightDrag && this.target && (this.view.domObserver.stop(), this.mightDrag.addAttr && this.target.removeAttribute("draggable"), this.mightDrag.setUneditable && this.target.removeAttribute("contentEditable"), this.view.domObserver.start()), this.delayedSelectionSync && setTimeout(() => je(this.view)), this.view.input.mouseDown = null;
    }
    up(e) {
      if (this.done(), !this.view.dom.contains(e.target)) return;
      let t = this.pos;
      this.view.state.doc != this.startDoc && (t = this.view.posAtCoords(sr(e))), this.updateAllowDefault(e), this.allowDefault || !t ? Qe(this.view, "pointer") : Hf(this.view, t.pos, t.inside, e, this.selectNode) ? e.preventDefault() : e.button == 0 && (this.flushed || se && this.mightDrag && !this.mightDrag.node.isAtom || ee && !this.view.state.selection.visible && Math.min(Math.abs(t.pos - this.view.state.selection.from), Math.abs(t.pos - this.view.state.selection.to)) <= 2) ? (Bt(this.view, N.near(this.view.state.doc.resolve(t.pos)), "pointer"), e.preventDefault()) : Qe(this.view, "pointer");
    }
    move(e) {
      this.updateAllowDefault(e), Qe(this.view, "pointer"), e.buttons == 0 && this.done();
    }
    updateAllowDefault(e) {
      !this.allowDefault && (Math.abs(this.event.x - e.clientX) > 4 || Math.abs(this.event.y - e.clientY) > 4) && (this.allowDefault = true);
    }
  };
  ce.touchstart = (n43) => {
    n43.input.lastTouch = Date.now(), Ms(n43), Qe(n43, "pointer");
  };
  ce.touchmove = (n43) => {
    n43.input.lastTouch = Date.now(), Qe(n43, "pointer");
  };
  ce.contextmenu = (n43) => Ms(n43);
  function _a(n43, e) {
    return n43.composing ? true : se && Math.abs(e.timeStamp - n43.input.compositionEndedAt) < 500 ? (n43.input.compositionEndedAt = -2e8, true) : false;
  }
  var jf = Ve ? 5e3 : -1;
  ue.compositionstart = ue.compositionupdate = (n43) => {
    if (!n43.composing) {
      n43.domObserver.flush();
      let { state: e } = n43, t = e.selection.$to;
      if (e.selection instanceof E && (e.storedMarks || !t.textOffset && t.parentOffset && t.nodeBefore.marks.some((r) => r.type.spec.inclusive === false) || ee && xa && Wf(n43))) n43.markCursor = n43.state.storedMarks || t.marks(), Zn(n43, true), n43.markCursor = null;
      else if (Zn(n43, !e.selection.empty), xe && e.selection.empty && t.parentOffset && !t.textOffset && t.nodeBefore.marks.length) {
        let r = n43.domSelectionRange();
        for (let i = r.focusNode, s = r.focusOffset; i && i.nodeType == 1 && s != 0; ) {
          let o = s < 0 ? i.lastChild : i.childNodes[s - 1];
          if (!o) break;
          if (o.nodeType == 3) {
            let l = n43.domSelection();
            l && l.collapse(o, o.nodeValue.length);
            break;
          } else i = o, s = -1;
        }
      }
      n43.input.composing = true;
    }
    Va(n43, jf);
  };
  function Wf(n43) {
    let { focusNode: e, focusOffset: t } = n43.domSelectionRange();
    if (!e || e.nodeType != 1 || t >= e.childNodes.length) return false;
    let r = e.childNodes[t];
    return r.nodeType == 1 && r.contentEditable == "false";
  }
  ue.compositionend = (n43, e) => {
    n43.composing && (n43.input.composing = false, n43.input.compositionEndedAt = e.timeStamp, n43.input.compositionPendingChanges = n43.domObserver.pendingRecords().length ? n43.input.compositionID : 0, n43.input.compositionNode = null, n43.input.badSafariComposition ? n43.domObserver.forceFlush() : n43.input.compositionPendingChanges && Promise.resolve().then(() => n43.domObserver.flush()), n43.input.compositionID++, Va(n43, 20));
  };
  function Va(n43, e) {
    clearTimeout(n43.input.composingTimeout), e > -1 && (n43.input.composingTimeout = setTimeout(() => Zn(n43), e));
  }
  function ja(n43) {
    for (n43.composing && (n43.input.composing = false, n43.input.compositionEndedAt = Uf()); n43.input.compositionNodes.length > 0; ) n43.input.compositionNodes.pop().markParentsDirty();
  }
  function Kf(n43) {
    let e = n43.domSelectionRange();
    if (!e.focusNode) return null;
    let t = _d(e.focusNode, e.focusOffset), r = Vd(e.focusNode, e.focusOffset);
    if (t && r && t != r) {
      let i = r.pmViewDesc, s = n43.domObserver.lastChangedTextNode;
      if (t == s || r == s) return s;
      if (!i || !i.isText(r.nodeValue)) return r;
      if (n43.input.compositionNode == r) {
        let o = t.pmViewDesc;
        if (!(!o || !o.isText(t.nodeValue))) return r;
      }
    }
    return t || r;
  }
  function Uf() {
    let n43 = document.createEvent("Event");
    return n43.initEvent("event", true, true), n43.timeStamp;
  }
  function Zn(n43, e = false) {
    if (!(Ve && n43.domObserver.flushingSoon >= 0)) {
      if (n43.domObserver.forceFlush(), ja(n43), e || n43.docView && n43.docView.dirty) {
        let t = ys(n43), r = n43.state.selection;
        return t && !t.eq(r) ? n43.dispatch(n43.state.tr.setSelection(t)) : (n43.markCursor || e) && !r.$from.node(r.$from.sharedDepth(r.to)).inlineContent ? n43.dispatch(n43.state.tr.deleteSelection()) : n43.updateState(n43.state), true;
      }
      return false;
    }
  }
  function Jf(n43, e) {
    if (!n43.dom.parentNode) return;
    let t = n43.dom.parentNode.appendChild(document.createElement("div"));
    t.appendChild(e), t.style.cssText = "position: fixed; left: -10000px; top: 10px";
    let r = getSelection(), i = document.createRange();
    i.selectNodeContents(e), n43.dom.blur(), r.removeAllRanges(), r.addRange(i), setTimeout(() => {
      t.parentNode && t.parentNode.removeChild(t), n43.focus();
    }, 50);
  }
  var an = he && Ze < 15 || Ht && Ud < 604;
  ce.copy = ue.cut = (n43, e) => {
    let t = e, r = n43.state.selection, i = t.type == "cut";
    if (r.empty) return;
    let s = an ? null : t.clipboardData, o = r.content(), { dom: l, text: a } = bs(n43, o);
    s ? (t.preventDefault(), s.clearData(), s.setData("text/html", l.innerHTML), s.setData("text/plain", a)) : Jf(n43, l), i && n43.dispatch(n43.state.tr.deleteSelection().scrollIntoView().setMeta("uiEvent", "cut"));
  };
  function qf(n43) {
    return n43.openStart == 0 && n43.openEnd == 0 && n43.content.childCount == 1 ? n43.content.firstChild : null;
  }
  function Gf(n43, e) {
    if (!n43.dom.parentNode) return;
    let t = n43.input.shiftKey || n43.state.selection.$from.parent.type.spec.code, r = n43.dom.parentNode.appendChild(document.createElement(t ? "textarea" : "div"));
    t || (r.contentEditable = "true"), r.style.cssText = "position: fixed; left: -10000px; top: 10px", r.focus();
    let i = n43.input.shiftKey && n43.input.lastKeyCode != 45;
    setTimeout(() => {
      n43.focus(), r.parentNode && r.parentNode.removeChild(r), t ? cn(n43, r.value, null, i, e) : cn(n43, r.textContent, r.innerHTML, i, e);
    }, 50);
  }
  function cn(n43, e, t, r, i) {
    let s = Pa(n43, e, t, r, n43.state.selection.$from);
    if (n43.someProp("handlePaste", (a) => a(n43, i, s || x.empty))) return true;
    if (!s) return false;
    let o = qf(s), l = o ? n43.state.tr.replaceSelectionWith(o, r) : n43.state.tr.replaceSelection(s);
    return n43.dispatch(l.scrollIntoView().setMeta("paste", true).setMeta("uiEvent", "paste")), true;
  }
  function Wa(n43) {
    let e = n43.getData("text/plain") || n43.getData("Text");
    if (e) return e;
    let t = n43.getData("text/uri-list");
    return t ? t.replace(/\r?\n/g, " ") : "";
  }
  ue.paste = (n43, e) => {
    let t = e;
    if (n43.composing && !Ve) return;
    let r = an ? null : t.clipboardData, i = n43.input.shiftKey && n43.input.lastKeyCode != 45;
    r && cn(n43, Wa(r), r.getData("text/html"), i, t) ? t.preventDefault() : Gf(n43, t);
  };
  var er = class {
    constructor(e, t, r) {
      this.slice = e, this.move = t, this.node = r;
    }
  };
  var Yf = ke ? "altKey" : "ctrlKey";
  function Ka(n43, e) {
    let t;
    return n43.someProp("dragCopies", (r) => {
      t = t || r(e);
    }), t != null ? !t : !e[Yf];
  }
  ce.dragstart = (n43, e) => {
    let t = e, r = n43.input.mouseDown;
    if (r && r.done(), !t.dataTransfer) return;
    let i = n43.state.selection, s = i.empty ? null : n43.posAtCoords(sr(t)), o;
    if (!(s && s.pos >= i.from && s.pos <= (i instanceof C ? i.to - 1 : i.to))) {
      if (r && r.mightDrag) o = C.create(n43.state.doc, r.mightDrag.pos);
      else if (t.target && t.target.nodeType == 1) {
        let d = n43.docView.nearestDesc(t.target, true);
        d && d.node.type.spec.draggable && d != n43.docView && (o = C.create(n43.state.doc, d.posBefore));
      }
    }
    let l = (o || n43.state.selection).content(), { dom: a, text: c, slice: u } = bs(n43, l);
    (!t.dataTransfer.files.length || !ee || ba > 120) && t.dataTransfer.clearData(), t.dataTransfer.setData(an ? "Text" : "text/html", a.innerHTML), t.dataTransfer.effectAllowed = "copyMove", an || t.dataTransfer.setData("text/plain", c), n43.dragging = new er(u, Ka(n43, t), o);
  };
  ce.dragend = (n43) => {
    let e = n43.dragging;
    window.setTimeout(() => {
      n43.dragging == e && (n43.dragging = null);
    }, 50);
  };
  ue.dragover = ue.dragenter = (n43, e) => e.preventDefault();
  ue.drop = (n43, e) => {
    try {
      Xf(n43, e, n43.dragging);
    } finally {
      n43.dragging = null;
    }
  };
  function Xf(n43, e, t) {
    if (!e.dataTransfer) return;
    let r = n43.posAtCoords(sr(e));
    if (!r) return;
    let i = n43.state.doc.resolve(r.pos), s = t && t.slice;
    s ? n43.someProp("transformPasted", (h) => {
      s = h(s, n43, false);
    }) : s = Pa(n43, Wa(e.dataTransfer), an ? null : e.dataTransfer.getData("text/html"), false, i);
    let o = !!(t && Ka(n43, e));
    if (n43.someProp("handleDrop", (h) => h(n43, e, s || x.empty, o))) {
      e.preventDefault();
      return;
    }
    if (!s) return;
    e.preventDefault();
    let l = s ? jn(n43.state.doc, i.pos, s) : i.pos;
    l == null && (l = i.pos);
    let a = n43.state.tr;
    if (o) {
      let { node: h } = t;
      h ? h.replace(a) : a.deleteSelection();
    }
    let c = a.mapping.map(l), u = s.openStart == 0 && s.openEnd == 0 && s.content.childCount == 1, d = a.doc;
    if (u ? a.replaceRangeWith(c, c, s.content.firstChild) : a.replaceRange(c, c, s), a.doc.eq(d)) return;
    let f = a.doc.resolve(c);
    if (u && C.isSelectable(s.content.firstChild) && f.nodeAfter && f.nodeAfter.sameMarkup(s.content.firstChild)) a.setSelection(new C(f));
    else {
      let h = a.mapping.map(l);
      a.mapping.maps[a.mapping.maps.length - 1].forEach((p, m, g, y) => h = y), a.setSelection(ks(n43, f, a.doc.resolve(h)));
    }
    n43.focus(), n43.dispatch(a.setMeta("uiEvent", "drop"));
  }
  ce.focus = (n43) => {
    n43.input.lastFocus = Date.now(), n43.focused || (n43.domObserver.stop(), n43.dom.classList.add("ProseMirror-focused"), n43.domObserver.start(), n43.focused = true, setTimeout(() => {
      n43.docView && n43.hasFocus() && !n43.domObserver.currentSelection.eq(n43.domSelectionRange()) && je(n43);
    }, 20));
  };
  ce.blur = (n43, e) => {
    let t = e;
    n43.focused && (n43.domObserver.stop(), n43.dom.classList.remove("ProseMirror-focused"), n43.domObserver.start(), t.relatedTarget && n43.dom.contains(t.relatedTarget) && n43.domObserver.currentSelection.clear(), n43.focused = false);
  };
  ce.beforeinput = (n43, e) => {
    if (ee && Ve && e.inputType == "deleteContentBackward") {
      n43.domObserver.flushSoon();
      let { domChangeCount: r } = n43.input;
      setTimeout(() => {
        if (n43.input.domChangeCount != r || (n43.dom.blur(), n43.focus(), n43.someProp("handleKeyDown", (s) => s(n43, dt(8, "Backspace"))))) return;
        let { $cursor: i } = n43.state.selection;
        i && i.pos > 0 && n43.dispatch(n43.state.tr.delete(i.pos - 1, i.pos).scrollIntoView());
      }, 50);
    }
  };
  for (let n43 in ue) ce[n43] = ue[n43];
  function un(n43, e) {
    if (n43 == e) return true;
    for (let t in n43) if (n43[t] !== e[t]) return false;
    for (let t in e) if (!(t in n43)) return false;
    return true;
  }
  var tr = class n33 {
    constructor(e, t) {
      this.toDOM = e, this.spec = t || mt, this.side = this.spec.side || 0;
    }
    map(e, t, r, i) {
      let { pos: s, deleted: o } = e.mapResult(t.from + i, this.side < 0 ? -1 : 1);
      return o ? null : new oe(s - r, s - r, this);
    }
    valid() {
      return true;
    }
    eq(e) {
      return this == e || e instanceof n33 && (this.spec.key && this.spec.key == e.spec.key || this.toDOM == e.toDOM && un(this.spec, e.spec));
    }
    destroy(e) {
      this.spec.destroy && this.spec.destroy(e);
    }
  };
  var pt = class n34 {
    constructor(e, t) {
      this.attrs = e, this.spec = t || mt;
    }
    map(e, t, r, i) {
      let s = e.map(t.from + i, this.spec.inclusiveStart ? -1 : 1) - r, o = e.map(t.to + i, this.spec.inclusiveEnd ? 1 : -1) - r;
      return s >= o ? null : new oe(s, o, this);
    }
    valid(e, t) {
      return t.from < t.to;
    }
    eq(e) {
      return this == e || e instanceof n34 && un(this.attrs, e.attrs) && un(this.spec, e.spec);
    }
    static is(e) {
      return e.type instanceof n34;
    }
    destroy() {
    }
  };
  var hs = class n35 {
    constructor(e, t) {
      this.attrs = e, this.spec = t || mt;
    }
    map(e, t, r, i) {
      let s = e.mapResult(t.from + i, 1);
      if (s.deleted) return null;
      let o = e.mapResult(t.to + i, -1);
      return o.deleted || o.pos <= s.pos ? null : new oe(s.pos - r, o.pos - r, this);
    }
    valid(e, t) {
      let { index: r, offset: i } = e.content.findIndex(t.from), s;
      return i == t.from && !(s = e.child(r)).isText && i + s.nodeSize == t.to;
    }
    eq(e) {
      return this == e || e instanceof n35 && un(this.attrs, e.attrs) && un(this.spec, e.spec);
    }
    destroy() {
    }
  };
  var oe = class n36 {
    constructor(e, t, r) {
      this.from = e, this.to = t, this.type = r;
    }
    copy(e, t) {
      return new n36(e, t, this.type);
    }
    eq(e, t = 0) {
      return this.type.eq(e.type) && this.from + t == e.from && this.to + t == e.to;
    }
    map(e, t, r) {
      return this.type.map(e, this, t, r);
    }
    static widget(e, t, r) {
      return new n36(e, e, new tr(t, r));
    }
    static inline(e, t, r, i) {
      return new n36(e, t, new pt(r, i));
    }
    static node(e, t, r, i) {
      return new n36(e, t, new hs(r, i));
    }
    get spec() {
      return this.type.spec;
    }
    get inline() {
      return this.type instanceof pt;
    }
    get widget() {
      return this.type instanceof tr;
    }
  };
  var zt = [];
  var mt = {};
  var K = class n37 {
    constructor(e, t) {
      this.local = e.length ? e : zt, this.children = t.length ? t : zt;
    }
    static create(e, t) {
      return t.length ? rr(t, e, 0, mt) : ie;
    }
    find(e, t, r) {
      let i = [];
      return this.findInner(e ?? 0, t ?? 1e9, i, 0, r), i;
    }
    findInner(e, t, r, i, s) {
      for (let o = 0; o < this.local.length; o++) {
        let l = this.local[o];
        l.from <= t && l.to >= e && (!s || s(l.spec)) && r.push(l.copy(l.from + i, l.to + i));
      }
      for (let o = 0; o < this.children.length; o += 3) if (this.children[o] < t && this.children[o + 1] > e) {
        let l = this.children[o] + 1;
        this.children[o + 2].findInner(e - l, t - l, r, i + l, s);
      }
    }
    map(e, t, r) {
      return this == ie || e.maps.length == 0 ? this : this.mapInner(e, t, 0, 0, r || mt);
    }
    mapInner(e, t, r, i, s) {
      let o;
      for (let l = 0; l < this.local.length; l++) {
        let a = this.local[l].map(e, r, i);
        a && a.type.valid(t, a) ? (o || (o = [])).push(a) : s.onRemove && s.onRemove(this.local[l].spec);
      }
      return this.children.length ? Qf(this.children, o || [], e, t, r, i, s) : o ? new n37(o.sort(gt), zt) : ie;
    }
    add(e, t) {
      return t.length ? this == ie ? n37.create(e, t) : this.addInner(e, t, 0) : this;
    }
    addInner(e, t, r) {
      let i, s = 0;
      e.forEach((l, a) => {
        let c = a + r, u;
        if (u = Ja(t, l, c)) {
          for (i || (i = this.children.slice()); s < i.length && i[s] < a; ) s += 3;
          i[s] == a ? i[s + 2] = i[s + 2].addInner(l, u, c + 1) : i.splice(s, 0, a, a + l.nodeSize, rr(u, l, c + 1, mt)), s += 3;
        }
      });
      let o = Ua(s ? qa(t) : t, -r);
      for (let l = 0; l < o.length; l++) o[l].type.valid(e, o[l]) || o.splice(l--, 1);
      return new n37(o.length ? this.local.concat(o).sort(gt) : this.local, i || this.children);
    }
    remove(e) {
      return e.length == 0 || this == ie ? this : this.removeInner(e, 0);
    }
    removeInner(e, t) {
      let r = this.children, i = this.local;
      for (let s = 0; s < r.length; s += 3) {
        let o, l = r[s] + t, a = r[s + 1] + t;
        for (let u = 0, d; u < e.length; u++) (d = e[u]) && d.from > l && d.to < a && (e[u] = null, (o || (o = [])).push(d));
        if (!o) continue;
        r == this.children && (r = this.children.slice());
        let c = r[s + 2].removeInner(o, l + 1);
        c != ie ? r[s + 2] = c : (r.splice(s, 3), s -= 3);
      }
      if (i.length) {
        for (let s = 0, o; s < e.length; s++) if (o = e[s]) for (let l = 0; l < i.length; l++) i[l].eq(o, t) && (i == this.local && (i = this.local.slice()), i.splice(l--, 1));
      }
      return r == this.children && i == this.local ? this : i.length || r.length ? new n37(i, r) : ie;
    }
    forChild(e, t) {
      if (this == ie) return this;
      if (t.isLeaf) return n37.empty;
      let r, i;
      for (let l = 0; l < this.children.length; l += 3) if (this.children[l] >= e) {
        this.children[l] == e && (r = this.children[l + 2]);
        break;
      }
      let s = e + 1, o = s + t.content.size;
      for (let l = 0; l < this.local.length; l++) {
        let a = this.local[l];
        if (a.from < o && a.to > s && a.type instanceof pt) {
          let c = Math.max(s, a.from) - s, u = Math.min(o, a.to) - s;
          c < u && (i || (i = [])).push(a.copy(c, u));
        }
      }
      if (i) {
        let l = new n37(i.sort(gt), zt);
        return r ? new nr([l, r]) : l;
      }
      return r || ie;
    }
    eq(e) {
      if (this == e) return true;
      if (!(e instanceof n37) || this.local.length != e.local.length || this.children.length != e.children.length) return false;
      for (let t = 0; t < this.local.length; t++) if (!this.local[t].eq(e.local[t])) return false;
      for (let t = 0; t < this.children.length; t += 3) if (this.children[t] != e.children[t] || this.children[t + 1] != e.children[t + 1] || !this.children[t + 2].eq(e.children[t + 2])) return false;
      return true;
    }
    locals(e) {
      return ws(this.localsInner(e));
    }
    localsInner(e) {
      if (this == ie) return zt;
      if (e.inlineContent || !this.local.some(pt.is)) return this.local;
      let t = [];
      for (let r = 0; r < this.local.length; r++) this.local[r].type instanceof pt || t.push(this.local[r]);
      return t;
    }
    forEachSet(e) {
      e(this);
    }
  };
  K.empty = new K([], []);
  K.removeOverlap = ws;
  var ie = K.empty;
  var nr = class n38 {
    constructor(e) {
      this.members = e;
    }
    map(e, t) {
      let r = this.members.map((i) => i.map(e, t, mt));
      return n38.from(r);
    }
    forChild(e, t) {
      if (t.isLeaf) return K.empty;
      let r = [];
      for (let i = 0; i < this.members.length; i++) {
        let s = this.members[i].forChild(e, t);
        s != ie && (s instanceof n38 ? r = r.concat(s.members) : r.push(s));
      }
      return n38.from(r);
    }
    eq(e) {
      if (!(e instanceof n38) || e.members.length != this.members.length) return false;
      for (let t = 0; t < this.members.length; t++) if (!this.members[t].eq(e.members[t])) return false;
      return true;
    }
    locals(e) {
      let t, r = true;
      for (let i = 0; i < this.members.length; i++) {
        let s = this.members[i].localsInner(e);
        if (s.length) if (!t) t = s;
        else {
          r && (t = t.slice(), r = false);
          for (let o = 0; o < s.length; o++) t.push(s[o]);
        }
      }
      return t ? ws(r ? t : t.sort(gt)) : zt;
    }
    static from(e) {
      switch (e.length) {
        case 0:
          return ie;
        case 1:
          return e[0];
        default:
          return new n38(e.every((t) => t instanceof K) ? e : e.reduce((t, r) => t.concat(r instanceof K ? r : r.members), []));
      }
    }
    forEachSet(e) {
      for (let t = 0; t < this.members.length; t++) this.members[t].forEachSet(e);
    }
  };
  function Qf(n43, e, t, r, i, s, o) {
    let l = n43.slice();
    for (let c = 0, u = s; c < t.maps.length; c++) {
      let d = 0;
      t.maps[c].forEach((f, h, p, m) => {
        let g = m - p - (h - f);
        for (let y = 0; y < l.length; y += 3) {
          let S = l[y + 1];
          if (S < 0 || f > S + u - d) continue;
          let w = l[y] + u - d;
          h >= w ? l[y + 1] = f <= w ? -2 : -1 : f >= u && g && (l[y] += g, l[y + 1] += g);
        }
        d += g;
      }), u = t.maps[c].map(u, -1);
    }
    let a = false;
    for (let c = 0; c < l.length; c += 3) if (l[c + 1] < 0) {
      if (l[c + 1] == -2) {
        a = true, l[c + 1] = -1;
        continue;
      }
      let u = t.map(n43[c] + s), d = u - i;
      if (d < 0 || d >= r.content.size) {
        a = true;
        continue;
      }
      let f = t.map(n43[c + 1] + s, -1), h = f - i, { index: p, offset: m } = r.content.findIndex(d), g = r.maybeChild(p);
      if (g && m == d && m + g.nodeSize == h) {
        let y = l[c + 2].mapInner(t, g, u + 1, n43[c] + s + 1, o);
        y != ie ? (l[c] = d, l[c + 1] = h, l[c + 2] = y) : (l[c + 1] = -2, a = true);
      } else a = true;
    }
    if (a) {
      let c = Zf(l, n43, e, t, i, s, o), u = rr(c, r, 0, o);
      e = u.local;
      for (let d = 0; d < l.length; d += 3) l[d + 1] < 0 && (l.splice(d, 3), d -= 3);
      for (let d = 0, f = 0; d < u.children.length; d += 3) {
        let h = u.children[d];
        for (; f < l.length && l[f] < h; ) f += 3;
        l.splice(f, 0, u.children[d], u.children[d + 1], u.children[d + 2]);
      }
    }
    return new K(e.sort(gt), l);
  }
  function Ua(n43, e) {
    if (!e || !n43.length) return n43;
    let t = [];
    for (let r = 0; r < n43.length; r++) {
      let i = n43[r];
      t.push(new oe(i.from + e, i.to + e, i.type));
    }
    return t;
  }
  function Zf(n43, e, t, r, i, s, o) {
    function l(a, c) {
      for (let u = 0; u < a.local.length; u++) {
        let d = a.local[u].map(r, i, c);
        d ? t.push(d) : o.onRemove && o.onRemove(a.local[u].spec);
      }
      for (let u = 0; u < a.children.length; u += 3) l(a.children[u + 2], a.children[u] + c + 1);
    }
    for (let a = 0; a < n43.length; a += 3) n43[a + 1] == -1 && l(n43[a + 2], e[a] + s + 1);
    return t;
  }
  function Ja(n43, e, t) {
    if (e.isLeaf) return null;
    let r = t + e.nodeSize, i = null;
    for (let s = 0, o; s < n43.length; s++) (o = n43[s]) && o.from > t && o.to < r && ((i || (i = [])).push(o), n43[s] = null);
    return i;
  }
  function qa(n43) {
    let e = [];
    for (let t = 0; t < n43.length; t++) n43[t] != null && e.push(n43[t]);
    return e;
  }
  function rr(n43, e, t, r) {
    let i = [], s = false;
    e.forEach((l, a) => {
      let c = Ja(n43, l, a + t);
      if (c) {
        s = true;
        let u = rr(c, l, t + a + 1, r);
        u != ie && i.push(a, a + l.nodeSize, u);
      }
    });
    let o = Ua(s ? qa(n43) : n43, -t).sort(gt);
    for (let l = 0; l < o.length; l++) o[l].type.valid(e, o[l]) || (r.onRemove && r.onRemove(o[l].spec), o.splice(l--, 1));
    return o.length || i.length ? new K(o, i) : ie;
  }
  function gt(n43, e) {
    return n43.from - e.from || n43.to - e.to;
  }
  function ws(n43) {
    let e = n43;
    for (let t = 0; t < e.length - 1; t++) {
      let r = e[t];
      if (r.from != r.to) for (let i = t + 1; i < e.length; i++) {
        let s = e[i];
        if (s.from == r.from) {
          s.to != r.to && (e == n43 && (e = n43.slice()), e[i] = s.copy(s.from, r.to), la(e, i + 1, s.copy(r.to, s.to)));
          continue;
        } else {
          s.from < r.to && (e == n43 && (e = n43.slice()), e[t] = r.copy(r.from, s.from), la(e, i, r.copy(s.from, r.to)));
          break;
        }
      }
    }
    return e;
  }
  function la(n43, e, t) {
    for (; e < n43.length && gt(t, n43[e]) > 0; ) e++;
    n43.splice(e, 0, t);
  }
  function Gi(n43) {
    let e = [];
    return n43.someProp("decorations", (t) => {
      let r = t(n43.state);
      r && r != ie && e.push(r);
    }), n43.cursorWrapper && e.push(K.create(n43.state.doc, [n43.cursorWrapper.deco])), nr.from(e);
  }
  var eh = { childList: true, characterData: true, characterDataOldValue: true, attributes: true, attributeOldValue: true, subtree: true };
  var th = he && Ze <= 11;
  var ps = class {
    constructor() {
      this.anchorNode = null, this.anchorOffset = 0, this.focusNode = null, this.focusOffset = 0;
    }
    set(e) {
      this.anchorNode = e.anchorNode, this.anchorOffset = e.anchorOffset, this.focusNode = e.focusNode, this.focusOffset = e.focusOffset;
    }
    clear() {
      this.anchorNode = this.focusNode = null;
    }
    eq(e) {
      return e.anchorNode == this.anchorNode && e.anchorOffset == this.anchorOffset && e.focusNode == this.focusNode && e.focusOffset == this.focusOffset;
    }
  };
  var ms = class {
    constructor(e, t) {
      this.view = e, this.handleDOMChange = t, this.queue = [], this.flushingSoon = -1, this.observer = null, this.currentSelection = new ps(), this.onCharData = null, this.suppressingSelectionUpdates = false, this.lastChangedTextNode = null, this.observer = window.MutationObserver && new window.MutationObserver((r) => {
        for (let i = 0; i < r.length; i++) this.queue.push(r[i]);
        he && Ze <= 11 && r.some((i) => i.type == "childList" && i.removedNodes.length || i.type == "characterData" && i.oldValue.length > i.target.nodeValue.length) ? this.flushSoon() : se && e.composing && r.some((i) => i.type == "childList" && i.target.nodeName == "TR") ? (e.input.badSafariComposition = true, this.flushSoon()) : this.flush();
      }), th && (this.onCharData = (r) => {
        this.queue.push({ target: r.target, type: "characterData", oldValue: r.prevValue }), this.flushSoon();
      }), this.onSelectionChange = this.onSelectionChange.bind(this);
    }
    flushSoon() {
      this.flushingSoon < 0 && (this.flushingSoon = window.setTimeout(() => {
        this.flushingSoon = -1, this.flush();
      }, 20));
    }
    forceFlush() {
      this.flushingSoon > -1 && (window.clearTimeout(this.flushingSoon), this.flushingSoon = -1, this.flush());
    }
    start() {
      this.observer && (this.observer.takeRecords(), this.observer.observe(this.view.dom, eh)), this.onCharData && this.view.dom.addEventListener("DOMCharacterDataModified", this.onCharData), this.connectSelection();
    }
    stop() {
      if (this.observer) {
        let e = this.observer.takeRecords();
        if (e.length) {
          for (let t = 0; t < e.length; t++) this.queue.push(e[t]);
          window.setTimeout(() => this.flush(), 20);
        }
        this.observer.disconnect();
      }
      this.onCharData && this.view.dom.removeEventListener("DOMCharacterDataModified", this.onCharData), this.disconnectSelection();
    }
    connectSelection() {
      this.view.dom.ownerDocument.addEventListener("selectionchange", this.onSelectionChange);
    }
    disconnectSelection() {
      this.view.dom.ownerDocument.removeEventListener("selectionchange", this.onSelectionChange);
    }
    suppressSelectionUpdates() {
      this.suppressingSelectionUpdates = true, setTimeout(() => this.suppressingSelectionUpdates = false, 50);
    }
    onSelectionChange() {
      if (Zl(this.view)) {
        if (this.suppressingSelectionUpdates) return je(this.view);
        if (he && Ze <= 11 && !this.view.state.selection.empty) {
          let e = this.view.domSelectionRange();
          if (e.focusNode && yt(e.focusNode, e.focusOffset, e.anchorNode, e.anchorOffset)) return this.flushSoon();
        }
        this.flush();
      }
    }
    setCurSelection() {
      this.currentSelection.set(this.view.domSelectionRange());
    }
    ignoreSelectionChange(e) {
      if (!e.focusNode) return true;
      let t = /* @__PURE__ */ new Set(), r;
      for (let s = e.focusNode; s; s = Ft(s)) t.add(s);
      for (let s = e.anchorNode; s; s = Ft(s)) if (t.has(s)) {
        r = s;
        break;
      }
      let i = r && this.view.docView.nearestDesc(r);
      if (i && i.ignoreMutation({ type: "selection", target: r.nodeType == 3 ? r.parentNode : r })) return this.setCurSelection(), true;
    }
    pendingRecords() {
      if (this.observer) for (let e of this.observer.takeRecords()) this.queue.push(e);
      return this.queue;
    }
    flush() {
      let { view: e } = this;
      if (!e.docView || this.flushingSoon > -1) return;
      let t = this.pendingRecords();
      t.length && (this.queue = []);
      let r = e.domSelectionRange(), i = !this.suppressingSelectionUpdates && !this.currentSelection.eq(r) && Zl(e) && !this.ignoreSelectionChange(r), s = -1, o = -1, l = false, a = [];
      if (e.editable) for (let u = 0; u < t.length; u++) {
        let d = this.registerMutation(t[u], a);
        d && (s = s < 0 ? d.from : Math.min(d.from, s), o = o < 0 ? d.to : Math.max(d.to, o), d.typeOver && (l = true));
      }
      if (a.some((u) => u.nodeName == "BR") && (e.input.lastKeyCode == 8 || e.input.lastKeyCode == 46)) {
        for (let u of a) if (u.nodeName == "BR" && u.parentNode) {
          let d = u.nextSibling;
          for (; d && d.nodeType == 1; ) {
            if (d.contentEditable == "false") {
              u.parentNode.removeChild(u);
              break;
            }
            d = d.firstChild;
          }
        }
      } else if (xe && a.length) {
        let u = a.filter((d) => d.nodeName == "BR");
        if (u.length == 2) {
          let [d, f] = u;
          d.parentNode && d.parentNode.parentNode == f.parentNode ? f.remove() : d.remove();
        } else {
          let { focusNode: d } = this.currentSelection;
          for (let f of u) {
            let h = f.parentNode;
            h && h.nodeName == "LI" && (!d || ih(e, d) != h) && f.remove();
          }
        }
      }
      let c = null;
      s < 0 && i && e.input.lastFocus > Date.now() - 200 && Math.max(e.input.lastTouch, e.input.lastClick.time) < Date.now() - 300 && ir(r) && (c = ys(e)) && c.eq(N.near(e.state.doc.resolve(0), 1)) ? (e.input.lastFocus = 0, je(e), this.currentSelection.set(r), e.scrollToSelection()) : (s > -1 || i) && (s > -1 && (e.docView.markDirty(s, o), nh(e)), e.input.badSafariComposition && (e.input.badSafariComposition = false, sh(e, a)), this.handleDOMChange(s, o, l, a), e.docView && e.docView.dirty ? e.updateState(e.state) : this.currentSelection.eq(r) || je(e), this.currentSelection.set(r));
    }
    registerMutation(e, t) {
      if (t.indexOf(e.target) > -1) return null;
      let r = this.view.docView.nearestDesc(e.target);
      if (e.type == "attributes" && (r == this.view.docView || e.attributeName == "contenteditable" || e.attributeName == "style" && !e.oldValue && !e.target.getAttribute("style")) || !r || r.ignoreMutation(e)) return null;
      if (e.type == "childList") {
        for (let u = 0; u < e.addedNodes.length; u++) {
          let d = e.addedNodes[u];
          t.push(d), d.nodeType == 3 && (this.lastChangedTextNode = d);
        }
        if (r.contentDOM && r.contentDOM != r.dom && !r.contentDOM.contains(e.target)) return { from: r.posBefore, to: r.posAfter };
        let i = e.previousSibling, s = e.nextSibling;
        if (he && Ze <= 11 && e.addedNodes.length) for (let u = 0; u < e.addedNodes.length; u++) {
          let { previousSibling: d, nextSibling: f } = e.addedNodes[u];
          (!d || Array.prototype.indexOf.call(e.addedNodes, d) < 0) && (i = d), (!f || Array.prototype.indexOf.call(e.addedNodes, f) < 0) && (s = f);
        }
        let o = i && i.parentNode == e.target ? Z(i) + 1 : 0, l = r.localPosFromDOM(e.target, o, -1), a = s && s.parentNode == e.target ? Z(s) : e.target.childNodes.length, c = r.localPosFromDOM(e.target, a, 1);
        return { from: l, to: c };
      } else return e.type == "attributes" ? { from: r.posAtStart - r.border, to: r.posAtEnd + r.border } : (this.lastChangedTextNode = e.target, { from: r.posAtStart, to: r.posAtEnd, typeOver: e.target.nodeValue == e.oldValue });
    }
  };
  var aa = /* @__PURE__ */ new WeakMap();
  var ca = false;
  function nh(n43) {
    if (!aa.has(n43) && (aa.set(n43, null), ["normal", "nowrap", "pre-line"].indexOf(getComputedStyle(n43.dom).whiteSpace) !== -1)) {
      if (n43.requiresGeckoHackNode = xe, ca) return;
      console.warn("ProseMirror expects the CSS white-space property to be set, preferably to 'pre-wrap'. It is recommended to load style/prosemirror.css from the prosemirror-view package."), ca = true;
    }
  }
  function ua(n43, e) {
    let t = e.startContainer, r = e.startOffset, i = e.endContainer, s = e.endOffset, o = n43.domAtPos(n43.state.selection.anchor);
    return yt(o.node, o.offset, i, s) && ([t, r, i, s] = [i, s, t, r]), { anchorNode: t, anchorOffset: r, focusNode: i, focusOffset: s };
  }
  function rh(n43, e) {
    if (e.getComposedRanges) {
      let i = e.getComposedRanges(n43.root)[0];
      if (i) return ua(n43, i);
    }
    let t;
    function r(i) {
      i.preventDefault(), i.stopImmediatePropagation(), t = i.getTargetRanges()[0];
    }
    return n43.dom.addEventListener("beforeinput", r, true), document.execCommand("indent"), n43.dom.removeEventListener("beforeinput", r, true), t ? ua(n43, t) : null;
  }
  function ih(n43, e) {
    for (let t = e.parentNode; t && t != n43.dom; t = t.parentNode) {
      let r = n43.docView.nearestDesc(t, true);
      if (r && r.node.isBlock) return t;
    }
    return null;
  }
  function sh(n43, e) {
    var t;
    let { focusNode: r, focusOffset: i } = n43.domSelectionRange();
    for (let s of e) if (((t = s.parentNode) === null || t === void 0 ? void 0 : t.nodeName) == "TR") {
      let o = s.nextSibling;
      for (; o && o.nodeName != "TD" && o.nodeName != "TH"; ) o = o.nextSibling;
      if (o) {
        let l = o;
        for (; ; ) {
          let a = l.firstChild;
          if (!a || a.nodeType != 1 || a.contentEditable == "false" || /^(BR|IMG)$/.test(a.nodeName)) break;
          l = a;
        }
        l.insertBefore(s, l.firstChild), r == s && n43.domSelection().collapse(s, i);
      } else s.parentNode.removeChild(s);
    }
  }
  function oh(n43, e, t) {
    let { node: r, fromOffset: i, toOffset: s, from: o, to: l } = n43.docView.parseRange(e, t), a = n43.domSelectionRange(), c, u = a.anchorNode;
    if (u && n43.dom.contains(u.nodeType == 1 ? u : u.parentNode) && (c = [{ node: u, offset: a.anchorOffset }], ir(a) || c.push({ node: a.focusNode, offset: a.focusOffset })), ee && n43.input.lastKeyCode === 8) for (let g = s; g > i; g--) {
      let y = r.childNodes[g - 1], S = y.pmViewDesc;
      if (y.nodeName == "BR" && !S) {
        s = g;
        break;
      }
      if (!S || S.size) break;
    }
    let d = n43.state.doc, f = n43.someProp("domParser") || ve.fromSchema(n43.state.schema), h = d.resolve(o), p = null, m = f.parse(r, { topNode: h.parent, topMatch: h.parent.contentMatchAt(h.index()), topOpen: true, from: i, to: s, preserveWhitespace: h.parent.type.whitespace == "pre" ? "full" : true, findPositions: c, ruleFromNode: lh, context: h });
    if (c && c[0].pos != null) {
      let g = c[0].pos, y = c[1] && c[1].pos;
      y == null && (y = g), p = { anchor: g + o, head: y + o };
    }
    return { doc: m, sel: p, from: o, to: l };
  }
  function lh(n43) {
    let e = n43.pmViewDesc;
    if (e) return e.parseRule();
    if (n43.nodeName == "BR" && n43.parentNode) {
      if (se && /^(ul|ol)$/i.test(n43.parentNode.nodeName)) {
        let t = document.createElement("div");
        return t.appendChild(document.createElement("li")), { skip: t };
      } else if (n43.parentNode.lastChild == n43 || se && /^(tr|table)$/i.test(n43.parentNode.nodeName)) return { ignore: true };
    } else if (n43.nodeName == "IMG" && n43.getAttribute("mark-placeholder")) return { ignore: true };
    return null;
  }
  var ah = /^(a|abbr|acronym|b|bd[io]|big|br|button|cite|code|data(list)?|del|dfn|em|i|img|ins|kbd|label|map|mark|meter|output|q|ruby|s|samp|small|span|strong|su[bp]|time|u|tt|var)$/i;
  function ch(n43, e, t, r, i) {
    let s = n43.input.compositionPendingChanges || (n43.composing ? n43.input.compositionID : 0);
    if (n43.input.compositionPendingChanges = 0, e < 0) {
      let v = n43.input.lastSelectionTime > Date.now() - 50 ? n43.input.lastSelectionOrigin : null, L = ys(n43, v);
      if (L && !n43.state.selection.eq(L)) {
        if (ee && Ve && n43.input.lastKeyCode === 13 && Date.now() - 100 < n43.input.lastKeyCodeTime && n43.someProp("handleKeyDown", (q) => q(n43, dt(13, "Enter")))) return;
        let z = n43.state.tr.setSelection(L);
        v == "pointer" ? z.setMeta("pointer", true) : v == "key" && z.scrollIntoView(), s && z.setMeta("composition", s), n43.dispatch(z);
      }
      return;
    }
    let o = n43.state.doc.resolve(e), l = o.sharedDepth(t);
    e = o.before(l + 1), t = n43.state.doc.resolve(t).after(l + 1);
    let a = n43.state.selection, c = oh(n43, e, t), u = n43.state.doc, d = u.slice(c.from, c.to), f, h;
    n43.input.lastKeyCode === 8 && Date.now() - 100 < n43.input.lastKeyCodeTime ? (f = n43.state.selection.to, h = "end") : (f = n43.state.selection.from, h = "start"), n43.input.lastKeyCode = null;
    let p = fh(d.content, c.doc.content, c.from, f, h);
    if (p && n43.input.domChangeCount++, (Ht && n43.input.lastIOSEnter > Date.now() - 225 || Ve) && i.some((v) => v.nodeType == 1 && !ah.test(v.nodeName)) && (!p || p.endA >= p.endB) && n43.someProp("handleKeyDown", (v) => v(n43, dt(13, "Enter")))) {
      n43.input.lastIOSEnter = 0;
      return;
    }
    if (!p) if (r && a instanceof E && !a.empty && a.$head.sameParent(a.$anchor) && !n43.composing && !(c.sel && c.sel.anchor != c.sel.head)) p = { start: a.from, endA: a.to, endB: a.to };
    else {
      if (c.sel) {
        let v = da(n43, n43.state.doc, c.sel);
        if (v && !v.eq(n43.state.selection)) {
          let L = n43.state.tr.setSelection(v);
          s && L.setMeta("composition", s), n43.dispatch(L);
        }
      }
      return;
    }
    n43.state.selection.from < n43.state.selection.to && p.start == p.endB && n43.state.selection instanceof E && (p.start > n43.state.selection.from && p.start <= n43.state.selection.from + 2 && n43.state.selection.from >= c.from ? p.start = n43.state.selection.from : p.endA < n43.state.selection.to && p.endA >= n43.state.selection.to - 2 && n43.state.selection.to <= c.to && (p.endB += n43.state.selection.to - p.endA, p.endA = n43.state.selection.to)), he && Ze <= 11 && p.endB == p.start + 1 && p.endA == p.start && p.start > c.from && c.doc.textBetween(p.start - c.from - 1, p.start - c.from + 1) == " \xA0" && (p.start--, p.endA--, p.endB--);
    let m = c.doc.resolveNoCache(p.start - c.from), g = c.doc.resolveNoCache(p.endB - c.from), y = u.resolve(p.start), S = m.sameParent(g) && m.parent.inlineContent && y.end() >= p.endA;
    if ((Ht && n43.input.lastIOSEnter > Date.now() - 225 && (!S || i.some((v) => v.nodeName == "DIV" || v.nodeName == "P")) || !S && m.pos < c.doc.content.size && (!m.sameParent(g) || !m.parent.inlineContent) && m.pos < g.pos && !/\S/.test(c.doc.textBetween(m.pos, g.pos, "", ""))) && n43.someProp("handleKeyDown", (v) => v(n43, dt(13, "Enter")))) {
      n43.input.lastIOSEnter = 0;
      return;
    }
    if (n43.state.selection.anchor > p.start && dh(u, p.start, p.endA, m, g) && n43.someProp("handleKeyDown", (v) => v(n43, dt(8, "Backspace")))) {
      Ve && ee && n43.domObserver.suppressSelectionUpdates();
      return;
    }
    ee && p.endB == p.start && (n43.input.lastChromeDelete = Date.now()), Ve && !S && m.start() != g.start() && g.parentOffset == 0 && m.depth == g.depth && c.sel && c.sel.anchor == c.sel.head && c.sel.head == p.endA && (p.endB -= 2, g = c.doc.resolveNoCache(p.endB - c.from), setTimeout(() => {
      n43.someProp("handleKeyDown", function(v) {
        return v(n43, dt(13, "Enter"));
      });
    }, 20));
    let w = p.start, M = p.endA, A = (v) => {
      let L = v || n43.state.tr.replace(w, M, c.doc.slice(p.start - c.from, p.endB - c.from));
      if (c.sel) {
        let z = da(n43, L.doc, c.sel);
        z && !(ee && n43.composing && z.empty && (p.start != p.endB || n43.input.lastChromeDelete < Date.now() - 100) && (z.head == w || z.head == L.mapping.map(M) - 1) || he && z.empty && z.head == w) && L.setSelection(z);
      }
      return s && L.setMeta("composition", s), L.scrollIntoView();
    }, I;
    if (S) if (m.pos == g.pos) {
      he && Ze <= 11 && m.parentOffset == 0 && (n43.domObserver.suppressSelectionUpdates(), setTimeout(() => je(n43), 20));
      let v = A(n43.state.tr.delete(w, M)), L = u.resolve(p.start).marksAcross(u.resolve(p.endA));
      L && v.ensureMarks(L), n43.dispatch(v);
    } else if (p.endA == p.endB && (I = uh(m.parent.content.cut(m.parentOffset, g.parentOffset), y.parent.content.cut(y.parentOffset, p.endA - y.start())))) {
      let v = A(n43.state.tr);
      I.type == "add" ? v.addMark(w, M, I.mark) : v.removeMark(w, M, I.mark), n43.dispatch(v);
    } else if (m.parent.child(m.index()).isText && m.index() == g.index() - (g.textOffset ? 0 : 1)) {
      let v = m.parent.textBetween(m.parentOffset, g.parentOffset), L = () => A(n43.state.tr.insertText(v, w, M));
      n43.someProp("handleTextInput", (z) => z(n43, w, M, v, L)) || n43.dispatch(L());
    } else n43.dispatch(A());
    else n43.dispatch(A());
  }
  function da(n43, e, t) {
    return Math.max(t.anchor, t.head) > e.content.size ? null : ks(n43, e.resolve(t.anchor), e.resolve(t.head));
  }
  function uh(n43, e) {
    let t = n43.firstChild.marks, r = e.firstChild.marks, i = t, s = r, o, l, a;
    for (let u = 0; u < r.length; u++) i = r[u].removeFromSet(i);
    for (let u = 0; u < t.length; u++) s = t[u].removeFromSet(s);
    if (i.length == 1 && s.length == 0) l = i[0], o = "add", a = (u) => u.mark(l.addToSet(u.marks));
    else if (i.length == 0 && s.length == 1) l = s[0], o = "remove", a = (u) => u.mark(l.removeFromSet(u.marks));
    else return null;
    let c = [];
    for (let u = 0; u < e.childCount; u++) c.push(a(e.child(u)));
    if (k.from(c).eq(n43)) return { mark: l, type: o };
  }
  function dh(n43, e, t, r, i) {
    if (t - e <= i.pos - r.pos || Yi(r, true, false) < i.pos) return false;
    let s = n43.resolve(e);
    if (!r.parent.isTextblock) {
      let l = s.nodeAfter;
      return l != null && t == e + l.nodeSize;
    }
    if (s.parentOffset < s.parent.content.size || !s.parent.isTextblock) return false;
    let o = n43.resolve(Yi(s, true, true));
    return !o.parent.isTextblock || o.pos > t || Yi(o, true, false) < t ? false : r.parent.content.cut(r.parentOffset).eq(o.parent.content);
  }
  function Yi(n43, e, t) {
    let r = n43.depth, i = e ? n43.end() : n43.pos;
    for (; r > 0 && (e || n43.indexAfter(r) == n43.node(r).childCount); ) r--, i++, e = false;
    if (t) {
      let s = n43.node(r).maybeChild(n43.indexAfter(r));
      for (; s && !s.isLeaf; ) s = s.firstChild, i++;
    }
    return i;
  }
  function fh(n43, e, t, r, i) {
    let s = n43.findDiffStart(e, t);
    if (s == null) return null;
    let { a: o, b: l } = n43.findDiffEnd(e, t + n43.size, t + e.size);
    if (i == "end") {
      let a = Math.max(0, s - Math.min(o, l));
      r -= o + a - s;
    }
    if (o < s && n43.size < e.size) {
      let a = r <= s && r >= o ? s - r : 0;
      s -= a, s && s < e.size && fa(e.textBetween(s - 1, s + 1)) && (s += a ? 1 : -1), l = s + (l - o), o = s;
    } else if (l < s) {
      let a = r <= s && r >= l ? s - r : 0;
      s -= a, s && s < n43.size && fa(n43.textBetween(s - 1, s + 1)) && (s += a ? 1 : -1), o = s + (o - l), l = s;
    }
    return { start: s, endA: o, endB: l };
  }
  function fa(n43) {
    if (n43.length != 2) return false;
    let e = n43.charCodeAt(0), t = n43.charCodeAt(1);
    return e >= 56320 && e <= 57343 && t >= 55296 && t <= 56319;
  }
  var dn = class {
    constructor(e, t) {
      this._root = null, this.focused = false, this.trackWrites = null, this.mounted = false, this.markCursor = null, this.cursorWrapper = null, this.lastSelectedViewDesc = void 0, this.input = new us(), this.prevDirectPlugins = [], this.pluginViews = [], this.requiresGeckoHackNode = false, this.dragging = null, this._props = t, this.state = t.state, this.directPlugins = t.plugins || [], this.directPlugins.forEach(ya), this.dispatch = this.dispatch.bind(this), this.dom = e && e.mount || document.createElement("div"), e && (e.appendChild ? e.appendChild(this.dom) : typeof e == "function" ? e(this.dom) : e.mount && (this.mounted = true)), this.editable = ma(this), pa(this), this.nodeViews = ga(this), this.docView = Jl(this.state.doc, ha(this), Gi(this), this.dom, this), this.domObserver = new ms(this, (r, i, s, o) => ch(this, r, i, s, o)), this.domObserver.start(), Rf(this), this.updatePluginViews();
    }
    get composing() {
      return this.input.composing;
    }
    get props() {
      if (this._props.state != this.state) {
        let e = this._props;
        this._props = {};
        for (let t in e) this._props[t] = e[t];
        this._props.state = this.state;
      }
      return this._props;
    }
    update(e) {
      e.handleDOMEvents != this._props.handleDOMEvents && ds(this);
      let t = this._props;
      this._props = e, e.plugins && (e.plugins.forEach(ya), this.directPlugins = e.plugins), this.updateStateInner(e.state, t);
    }
    setProps(e) {
      let t = {};
      for (let r in this._props) t[r] = this._props[r];
      t.state = this.state;
      for (let r in e) t[r] = e[r];
      this.update(t);
    }
    updateState(e) {
      this.updateStateInner(e, this._props);
    }
    updateStateInner(e, t) {
      var r;
      let i = this.state, s = false, o = false;
      e.storedMarks && this.composing && (ja(this), o = true), this.state = e;
      let l = i.plugins != e.plugins || this._props.plugins != t.plugins;
      if (l || this._props.plugins != t.plugins || this._props.nodeViews != t.nodeViews) {
        let h = ga(this);
        ph(h, this.nodeViews) && (this.nodeViews = h, s = true);
      }
      (l || t.handleDOMEvents != this._props.handleDOMEvents) && ds(this), this.editable = ma(this), pa(this);
      let a = Gi(this), c = ha(this), u = i.plugins != e.plugins && !i.doc.eq(e.doc) ? "reset" : e.scrollToSelection > i.scrollToSelection ? "to selection" : "preserve", d = s || !this.docView.matchesNode(e.doc, c, a);
      (d || !e.selection.eq(i.selection)) && (o = true);
      let f = u == "preserve" && o && this.dom.style.overflowAnchor == null && Gd(this);
      if (o) {
        this.domObserver.stop();
        let h = d && (he || ee) && !this.composing && !i.selection.empty && !e.selection.empty && hh(i.selection, e.selection);
        if (d) {
          let p = ee ? this.trackWrites = this.domSelectionRange().focusNode : null;
          this.composing && (this.input.compositionNode = Kf(this)), (s || !this.docView.update(e.doc, c, a, this)) && (this.docView.updateOuterDeco(c), this.docView.destroy(), this.docView = Jl(e.doc, c, a, this.dom, this)), p && (!this.trackWrites || !this.dom.contains(this.trackWrites)) && (h = true);
        }
        h || !(this.input.mouseDown && this.domObserver.currentSelection.eq(this.domSelectionRange()) && yf(this)) ? je(this, h) : (Ia(this, e.selection), this.domObserver.setCurSelection()), this.domObserver.start();
      }
      this.updatePluginViews(i), !((r = this.dragging) === null || r === void 0) && r.node && !i.doc.eq(e.doc) && this.updateDraggedNode(this.dragging, i), u == "reset" ? this.dom.scrollTop = 0 : u == "to selection" ? this.scrollToSelection() : f && Yd(f);
    }
    scrollToSelection() {
      let e = this.domSelectionRange().focusNode;
      if (!(!e || !this.dom.contains(e.nodeType == 1 ? e : e.parentNode))) {
        if (!this.someProp("handleScrollToSelection", (t) => t(this))) if (this.state.selection instanceof C) {
          let t = this.docView.domAfterPos(this.state.selection.from);
          t.nodeType == 1 && _l(this, t.getBoundingClientRect(), e);
        } else _l(this, this.coordsAtPos(this.state.selection.head, 1), e);
      }
    }
    destroyPluginViews() {
      let e;
      for (; e = this.pluginViews.pop(); ) e.destroy && e.destroy();
    }
    updatePluginViews(e) {
      if (!e || e.plugins != this.state.plugins || this.directPlugins != this.prevDirectPlugins) {
        this.prevDirectPlugins = this.directPlugins, this.destroyPluginViews();
        for (let t = 0; t < this.directPlugins.length; t++) {
          let r = this.directPlugins[t];
          r.spec.view && this.pluginViews.push(r.spec.view(this));
        }
        for (let t = 0; t < this.state.plugins.length; t++) {
          let r = this.state.plugins[t];
          r.spec.view && this.pluginViews.push(r.spec.view(this));
        }
      } else for (let t = 0; t < this.pluginViews.length; t++) {
        let r = this.pluginViews[t];
        r.update && r.update(this, e);
      }
    }
    updateDraggedNode(e, t) {
      let r = e.node, i = -1;
      if (r.from < this.state.doc.content.size && this.state.doc.nodeAt(r.from) == r.node) i = r.from;
      else {
        let s = r.from + (this.state.doc.content.size - t.doc.content.size);
        (s > 0 && s < this.state.doc.content.size && this.state.doc.nodeAt(s)) == r.node && (i = s);
      }
      this.dragging = new er(e.slice, e.move, i < 0 ? void 0 : C.create(this.state.doc, i));
    }
    someProp(e, t) {
      let r = this._props && this._props[e], i;
      if (r != null && (i = t ? t(r) : r)) return i;
      for (let o = 0; o < this.directPlugins.length; o++) {
        let l = this.directPlugins[o].props[e];
        if (l != null && (i = t ? t(l) : l)) return i;
      }
      let s = this.state.plugins;
      if (s) for (let o = 0; o < s.length; o++) {
        let l = s[o].props[e];
        if (l != null && (i = t ? t(l) : l)) return i;
      }
    }
    hasFocus() {
      if (he) {
        let e = this.root.activeElement;
        if (e == this.dom) return true;
        if (!e || !this.dom.contains(e)) return false;
        for (; e && this.dom != e && this.dom.contains(e); ) {
          if (e.contentEditable == "false") return false;
          e = e.parentElement;
        }
        return true;
      }
      return this.root.activeElement == this.dom;
    }
    focus() {
      this.domObserver.stop(), this.editable && Xd(this.dom), je(this), this.domObserver.start();
    }
    get root() {
      let e = this._root;
      if (e == null) {
        for (let t = this.dom.parentNode; t; t = t.parentNode) if (t.nodeType == 9 || t.nodeType == 11 && t.host) return t.getSelection || (Object.getPrototypeOf(t).getSelection = () => t.ownerDocument.getSelection()), this._root = t;
      }
      return e || document;
    }
    updateRoot() {
      this._root = null;
    }
    posAtCoords(e) {
      return nf(this, e);
    }
    coordsAtPos(e, t = 1) {
      return Ta(this, e, t);
    }
    domAtPos(e, t = 0) {
      return this.docView.domFromPos(e, t);
    }
    nodeDOM(e) {
      let t = this.docView.descAt(e);
      return t ? t.nodeDOM : null;
    }
    posAtDOM(e, t, r = -1) {
      let i = this.docView.posFromDOM(e, t, r);
      if (i == null) throw new RangeError("DOM position not inside the editor");
      return i;
    }
    endOfTextblock(e, t) {
      return af(this, t || this.state, e);
    }
    pasteHTML(e, t) {
      return cn(this, "", e, false, t || new ClipboardEvent("paste"));
    }
    pasteText(e, t) {
      return cn(this, e, null, true, t || new ClipboardEvent("paste"));
    }
    serializeForClipboard(e) {
      return bs(this, e);
    }
    destroy() {
      this.docView && (Df(this), this.destroyPluginViews(), this.mounted ? (this.docView.update(this.state.doc, [], Gi(this), this), this.dom.textContent = "") : this.dom.parentNode && this.dom.parentNode.removeChild(this.dom), this.docView.destroy(), this.docView = null, Hd());
    }
    get isDestroyed() {
      return this.docView == null;
    }
    dispatchEvent(e) {
      return Lf(this, e);
    }
    domSelectionRange() {
      let e = this.domSelection();
      return e ? se && this.root.nodeType === 11 && Wd(this.dom.ownerDocument) == this.dom && rh(this, e) || e : { focusNode: null, focusOffset: 0, anchorNode: null, anchorOffset: 0 };
    }
    domSelection() {
      return this.root.getSelection();
    }
  };
  dn.prototype.dispatch = function(n43) {
    let e = this._props.dispatchTransaction;
    e ? e.call(this, n43) : this.updateState(this.state.apply(n43));
  };
  function ha(n43) {
    let e = /* @__PURE__ */ Object.create(null);
    return e.class = "ProseMirror", e.contenteditable = String(n43.editable), n43.someProp("attributes", (t) => {
      if (typeof t == "function" && (t = t(n43.state)), t) for (let r in t) r == "class" ? e.class += " " + t[r] : r == "style" ? e.style = (e.style ? e.style + ";" : "") + t[r] : !e[r] && r != "contenteditable" && r != "nodeName" && (e[r] = String(t[r]));
    }), e.translate || (e.translate = "no"), [oe.node(0, n43.state.doc.content.size, e)];
  }
  function pa(n43) {
    if (n43.markCursor) {
      let e = document.createElement("img");
      e.className = "ProseMirror-separator", e.setAttribute("mark-placeholder", "true"), e.setAttribute("alt", ""), n43.cursorWrapper = { dom: e, deco: oe.widget(n43.state.selection.from, e, { raw: true, marks: n43.markCursor }) };
    } else n43.cursorWrapper = null;
  }
  function ma(n43) {
    return !n43.someProp("editable", (e) => e(n43.state) === false);
  }
  function hh(n43, e) {
    let t = Math.min(n43.$anchor.sharedDepth(n43.head), e.$anchor.sharedDepth(e.head));
    return n43.$anchor.start(t) != e.$anchor.start(t);
  }
  function ga(n43) {
    let e = /* @__PURE__ */ Object.create(null);
    function t(r) {
      for (let i in r) Object.prototype.hasOwnProperty.call(e, i) || (e[i] = r[i]);
    }
    return n43.someProp("nodeViews", t), n43.someProp("markViews", t), e;
  }
  function ph(n43, e) {
    let t = 0, r = 0;
    for (let i in n43) {
      if (n43[i] != e[i]) return true;
      t++;
    }
    for (let i in e) r++;
    return t != r;
  }
  function ya(n43) {
    if (n43.spec.state || n43.spec.filterTransaction || n43.spec.appendTransaction) throw new RangeError("Plugins passed directly to the view must not have a state component");
  }
  var We = { 8: "Backspace", 9: "Tab", 10: "Enter", 12: "NumLock", 13: "Enter", 16: "Shift", 17: "Control", 18: "Alt", 20: "CapsLock", 27: "Escape", 32: " ", 33: "PageUp", 34: "PageDown", 35: "End", 36: "Home", 37: "ArrowLeft", 38: "ArrowUp", 39: "ArrowRight", 40: "ArrowDown", 44: "PrintScreen", 45: "Insert", 46: "Delete", 59: ";", 61: "=", 91: "Meta", 92: "Meta", 106: "*", 107: "+", 108: ",", 109: "-", 110: ".", 111: "/", 144: "NumLock", 145: "ScrollLock", 160: "Shift", 161: "Shift", 162: "Control", 163: "Control", 164: "Alt", 165: "Alt", 173: "-", 186: ";", 187: "=", 188: ",", 189: "-", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\", 221: "]", 222: "'" };
  var lr = { 48: ")", 49: "!", 50: "@", 51: "#", 52: "$", 53: "%", 54: "^", 55: "&", 56: "*", 57: "(", 59: ":", 61: "+", 173: "_", 186: ":", 187: "+", 188: "<", 189: "_", 190: ">", 191: "?", 192: "~", 219: "{", 220: "|", 221: "}", 222: '"' };
  var mh = typeof navigator < "u" && /Mac/.test(navigator.platform);
  var gh = typeof navigator < "u" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
  for (J = 0; J < 10; J++) We[48 + J] = We[96 + J] = String(J);
  var J;
  for (J = 1; J <= 24; J++) We[J + 111] = "F" + J;
  var J;
  for (J = 65; J <= 90; J++) We[J] = String.fromCharCode(J + 32), lr[J] = String.fromCharCode(J);
  var J;
  for (or in We) lr.hasOwnProperty(or) || (lr[or] = We[or]);
  var or;
  function Ga(n43) {
    var e = mh && n43.metaKey && n43.shiftKey && !n43.ctrlKey && !n43.altKey || gh && n43.shiftKey && n43.key && n43.key.length == 1 || n43.key == "Unidentified", t = !e && n43.key || (n43.shiftKey ? lr : We)[n43.keyCode] || n43.key || "Unidentified";
    return t == "Esc" && (t = "Escape"), t == "Del" && (t = "Delete"), t == "Left" && (t = "ArrowLeft"), t == "Up" && (t = "ArrowUp"), t == "Right" && (t = "ArrowRight"), t == "Down" && (t = "ArrowDown"), t;
  }
  var yh = typeof navigator < "u" && /Mac|iP(hone|[oa]d)/.test(navigator.platform);
  var kh = typeof navigator < "u" && /Win/.test(navigator.platform);
  function bh(n43) {
    let e = n43.split(/-(?!$)/), t = e[e.length - 1];
    t == "Space" && (t = " ");
    let r, i, s, o;
    for (let l = 0; l < e.length - 1; l++) {
      let a = e[l];
      if (/^(cmd|meta|m)$/i.test(a)) o = true;
      else if (/^a(lt)?$/i.test(a)) r = true;
      else if (/^(c|ctrl|control)$/i.test(a)) i = true;
      else if (/^s(hift)?$/i.test(a)) s = true;
      else if (/^mod$/i.test(a)) yh ? o = true : i = true;
      else throw new Error("Unrecognized modifier name: " + a);
    }
    return r && (t = "Alt-" + t), i && (t = "Ctrl-" + t), o && (t = "Meta-" + t), s && (t = "Shift-" + t), t;
  }
  function xh(n43) {
    let e = /* @__PURE__ */ Object.create(null);
    for (let t in n43) e[bh(t)] = n43[t];
    return e;
  }
  function Cs(n43, e, t = true) {
    return e.altKey && (n43 = "Alt-" + n43), e.ctrlKey && (n43 = "Ctrl-" + n43), e.metaKey && (n43 = "Meta-" + n43), t && e.shiftKey && (n43 = "Shift-" + n43), n43;
  }
  function Ya(n43) {
    return new O({ props: { handleKeyDown: Ts(n43) } });
  }
  function Ts(n43) {
    let e = xh(n43);
    return function(t, r) {
      let i = Ga(r), s, o = e[Cs(i, r)];
      if (o && o(t.state, t.dispatch, t)) return true;
      if (i.length == 1 && i != " ") {
        if (r.shiftKey) {
          let l = e[Cs(i, r, false)];
          if (l && l(t.state, t.dispatch, t)) return true;
        }
        if ((r.altKey || r.metaKey || r.ctrlKey) && !(kh && r.ctrlKey && r.altKey) && (s = We[r.keyCode]) && s != i) {
          let l = e[Cs(s, r)];
          if (l && l(t.state, t.dispatch, t)) return true;
        }
      }
      return false;
    };
  }
  var Sh = Object.defineProperty;
  var Is = (n43, e) => {
    for (var t in e) Sh(n43, t, { get: e[t], enumerable: true });
  };
  function mr(n43) {
    let { state: e, transaction: t } = n43, { selection: r } = t, { doc: i } = t, { storedMarks: s } = t;
    return { ...e, apply: e.apply.bind(e), applyTransaction: e.applyTransaction.bind(e), plugins: e.plugins, schema: e.schema, reconfigure: e.reconfigure.bind(e), toJSON: e.toJSON.bind(e), get storedMarks() {
      return s;
    }, get selection() {
      return r;
    }, get doc() {
      return i;
    }, get tr() {
      return r = t.selection, i = t.doc, s = t.storedMarks, t;
    } };
  }
  var gr = class {
    constructor(n43) {
      this.editor = n43.editor, this.rawCommands = this.editor.extensionManager.commands, this.customState = n43.state;
    }
    get hasCustomState() {
      return !!this.customState;
    }
    get state() {
      return this.customState || this.editor.state;
    }
    get commands() {
      let { rawCommands: n43, editor: e, state: t } = this, { view: r } = e, { tr: i } = t, s = this.buildProps(i);
      return Object.fromEntries(Object.entries(n43).map(([o, l]) => [o, (...c) => {
        let u = l(...c)(s);
        return !i.getMeta("preventDispatch") && !this.hasCustomState && r.dispatch(i), u;
      }]));
    }
    get chain() {
      return () => this.createChain();
    }
    get can() {
      return () => this.createCan();
    }
    createChain(n43, e = true) {
      let { rawCommands: t, editor: r, state: i } = this, { view: s } = r, o = [], l = !!n43, a = n43 || i.tr, c = () => (!l && e && !a.getMeta("preventDispatch") && !this.hasCustomState && s.dispatch(a), o.every((d) => d === true)), u = { ...Object.fromEntries(Object.entries(t).map(([d, f]) => [d, (...p) => {
        let m = this.buildProps(a, e), g = f(...p)(m);
        return o.push(g), u;
      }])), run: c };
      return u;
    }
    createCan(n43) {
      let { rawCommands: e, state: t } = this, r = false, i = n43 || t.tr, s = this.buildProps(i, r);
      return { ...Object.fromEntries(Object.entries(e).map(([l, a]) => [l, (...c) => a(...c)({ ...s, dispatch: void 0 })])), chain: () => this.createChain(i, r) };
    }
    buildProps(n43, e = true) {
      let { rawCommands: t, editor: r, state: i } = this, { view: s } = r, o = { tr: n43, editor: r, view: s, state: mr({ state: i, transaction: n43 }), dispatch: e ? () => {
      } : void 0, chain: () => this.createChain(n43, e), can: () => this.createCan(n43), get commands() {
        return Object.fromEntries(Object.entries(t).map(([l, a]) => [l, (...c) => a(...c)(o)]));
      } };
      return o;
    }
  };
  var lc = {};
  Is(lc, { blur: () => Mh, clearContent: () => wh, clearNodes: () => Ch, command: () => Th, createParagraphNear: () => vh, cut: () => Eh, deleteCurrentNode: () => Ah, deleteNode: () => Nh, deleteRange: () => Oh, deleteSelection: () => Dh, enter: () => Ph, exitCode: () => Lh, extendMarkRange: () => zh, first: () => Bh, focus: () => Hh, forEach: () => $h, insertContent: () => _h, insertContentAt: () => Wh, joinBackward: () => Jh, joinDown: () => Uh, joinForward: () => qh, joinItemBackward: () => Gh, joinItemForward: () => Yh, joinTextblockBackward: () => Xh, joinTextblockForward: () => Qh, joinUp: () => Kh, keyboardShortcut: () => ep, lift: () => tp, liftEmptyBlock: () => np, liftListItem: () => rp, newlineInCode: () => ip, resetAttributes: () => sp, scrollIntoView: () => op, selectAll: () => lp, selectNodeBackward: () => ap, selectNodeForward: () => cp, selectParentNode: () => up, selectTextblockEnd: () => dp, selectTextblockStart: () => fp, setContent: () => hp, setMark: () => Op, setMeta: () => Ip, setNode: () => Rp, setNodeSelection: () => Dp, setTextDirection: () => Pp, setTextSelection: () => Lp, sinkListItem: () => zp, splitBlock: () => Bp, splitListItem: () => Fp, toggleList: () => $p, toggleMark: () => _p, toggleNode: () => Vp, toggleWrap: () => jp, undoInputRule: () => Wp, unsetAllMarks: () => Kp, unsetMark: () => Up, unsetTextDirection: () => Jp, updateAttributes: () => qp, wrapIn: () => Gp, wrapInList: () => Yp });
  var Mh = () => ({ editor: n43, view: e }) => (requestAnimationFrame(() => {
    var t;
    n43.isDestroyed || (e.dom.blur(), (t = window?.getSelection()) == null || t.removeAllRanges());
  }), true);
  var wh = (n43 = true) => ({ commands: e }) => e.setContent("", { emitUpdate: n43 });
  var Ch = () => ({ state: n43, tr: e, dispatch: t }) => {
    let { selection: r } = e, { ranges: i } = r;
    return t && i.forEach(({ $from: s, $to: o }) => {
      n43.doc.nodesBetween(s.pos, o.pos, (l, a) => {
        if (l.type.isText) return;
        let { doc: c, mapping: u } = e, d = c.resolve(u.map(a)), f = c.resolve(u.map(a + l.nodeSize)), h = d.blockRange(f);
        if (!h) return;
        let p = He(h);
        if (l.type.isTextblock) {
          let { defaultType: m } = d.parent.contentMatchAt(d.index());
          e.setNodeMarkup(h.start, m);
        }
        (p || p === 0) && e.lift(h, p);
      });
    }), true;
  };
  var Th = (n43) => (e) => n43(e);
  var vh = () => ({ state: n43, dispatch: e }) => $i(n43, e);
  var Eh = (n43, e) => ({ editor: t, tr: r }) => {
    let { state: i } = t, s = i.doc.slice(n43.from, n43.to);
    r.deleteRange(n43.from, n43.to);
    let o = r.mapping.map(e);
    return r.insert(o, s.content), r.setSelection(new E(r.doc.resolve(Math.max(o - 1, 0)))), true;
  };
  var Ah = () => ({ tr: n43, dispatch: e }) => {
    let { selection: t } = n43, r = t.$anchor.node();
    if (r.content.size > 0) return false;
    let i = n43.selection.$anchor;
    for (let s = i.depth; s > 0; s -= 1) if (i.node(s).type === r.type) {
      if (e) {
        let l = i.before(s), a = i.after(s);
        n43.delete(l, a).scrollIntoView();
      }
      return true;
    }
    return false;
  };
  function V(n43, e) {
    if (typeof n43 == "string") {
      if (!e.nodes[n43]) throw Error(`There is no node type named '${n43}'. Maybe you forgot to add the extension?`);
      return e.nodes[n43];
    }
    return n43;
  }
  var Nh = (n43) => ({ tr: e, state: t, dispatch: r }) => {
    let i = V(n43, t.schema), s = e.selection.$anchor;
    for (let o = s.depth; o > 0; o -= 1) if (s.node(o).type === i) {
      if (r) {
        let a = s.before(o), c = s.after(o);
        e.delete(a, c).scrollIntoView();
      }
      return true;
    }
    return false;
  };
  var Oh = (n43) => ({ tr: e, dispatch: t }) => {
    let { from: r, to: i } = n43;
    return t && e.delete(r, i), true;
  };
  var Ih = (n43) => n43.content ? /^text(\*|\+)/.test(n43.content) : false;
  var Xa = (n43, e, t) => {
    if (!n43.parent.isInline || t === "left" && n43.pos > n43.start() || t === "right" && n43.pos < n43.end()) return n43.pos;
    let r = e.nodes[n43.parent.type.name].spec;
    return Ih(r) ? t === "left" ? n43.start() - 1 : n43.end() + 1 : n43.pos;
  };
  var Rh = (n43, e, t) => {
    let r = Xa(n43, t, "left"), i = Xa(e, t, "right");
    return { from: r, to: i };
  };
  var Dh = () => ({ state: n43, dispatch: e }) => {
    let { $from: t, $to: r } = n43.selection;
    if (n43.selection.empty) return false;
    let { from: i, to: s } = Rh(t, r, n43.schema);
    return e && (n43.tr.deleteRange(i, s).scrollIntoView(), e(n43.tr)), true;
  };
  var Ph = () => ({ commands: n43 }) => n43.keyboardShortcut("Enter");
  var Lh = () => ({ state: n43, dispatch: e }) => Hi(n43, e);
  function Rs(n43) {
    return Object.prototype.toString.call(n43) === "[object RegExp]";
  }
  function hr(n43, e, t = { strict: true }) {
    let r = Object.keys(e);
    return r.length ? r.every((i) => t.strict ? e[i] === n43[i] : Rs(e[i]) ? e[i].test(n43[i]) : e[i] === n43[i]) : true;
  }
  function ac(n43, e, t = {}) {
    return n43.find((r) => r.type === e && hr(Object.fromEntries(Object.keys(t).map((i) => [i, r.attrs[i]])), t));
  }
  function Qa(n43, e, t = {}) {
    return !!ac(n43, e, t);
  }
  function Ds(n43, e, t) {
    if (!n43 || !e) return;
    let r = n43.parent.childAfter(n43.parentOffset);
    if ((!r.node || !r.node.marks.some((c) => c.type === e)) && (r = n43.parent.childBefore(n43.parentOffset)), !r.node || !r.node.marks.some((c) => c.type === e)) return;
    if (!t) {
      let c = r.node.marks.find((u) => u.type === e);
      c && (t = c.attrs);
    }
    if (!ac([...r.node.marks], e, t)) return;
    let s = r.index, o = n43.start() + r.offset, l = s + 1, a = o + r.node.nodeSize;
    for (; s > 0 && Qa([...n43.parent.child(s - 1).marks], e, t); ) s -= 1, o -= n43.parent.child(s).nodeSize;
    for (; l < n43.parent.childCount && Qa([...n43.parent.child(l).marks], e, t); ) a += n43.parent.child(l).nodeSize, l += 1;
    return { from: o, to: a };
  }
  function Ke(n43, e) {
    if (typeof n43 == "string") {
      if (!e.marks[n43]) throw Error(`There is no mark type named '${n43}'. Maybe you forgot to add the extension?`);
      return e.marks[n43];
    }
    return n43;
  }
  var zh = (n43, e) => ({ tr: t, state: r, dispatch: i }) => {
    let s = Ke(n43, r.schema), { doc: o, selection: l } = t, { $from: a, from: c, to: u } = l;
    if (i) {
      let d = Ds(a, s, e);
      if (d && d.from <= c && d.to >= u) {
        let f = E.create(o, d.from, d.to);
        t.setSelection(f);
      }
    }
    return true;
  };
  var Bh = (n43) => (e) => {
    let t = typeof n43 == "function" ? n43(e) : n43;
    for (let r = 0; r < t.length; r += 1) if (t[r](e)) return true;
    return false;
  };
  function cc(n43) {
    return n43 instanceof E;
  }
  function bt(n43 = 0, e = 0, t = 0) {
    return Math.min(Math.max(n43, e), t);
  }
  function uc(n43, e = null) {
    if (!e) return null;
    let t = N.atStart(n43), r = N.atEnd(n43);
    if (e === "start" || e === true) return t;
    if (e === "end") return r;
    let i = t.from, s = r.to;
    return e === "all" ? E.create(n43, bt(0, i, s), bt(n43.content.size, i, s)) : E.create(n43, bt(e, i, s), bt(e, i, s));
  }
  function Za() {
    return navigator.platform === "Android" || /android/i.test(navigator.userAgent);
  }
  function pr() {
    return ["iPad Simulator", "iPhone Simulator", "iPod Simulator", "iPad", "iPhone", "iPod"].includes(navigator.platform) || navigator.userAgent.includes("Mac") && "ontouchend" in document;
  }
  function Fh() {
    return typeof navigator < "u" ? /^((?!chrome|android).)*safari/i.test(navigator.userAgent) : false;
  }
  var Hh = (n43 = null, e = {}) => ({ editor: t, view: r, tr: i, dispatch: s }) => {
    e = { scrollIntoView: true, ...e };
    let o = () => {
      (pr() || Za()) && r.dom.focus(), Fh() && !pr() && !Za() && r.dom.focus({ preventScroll: true }), requestAnimationFrame(() => {
        t.isDestroyed || (r.focus(), e?.scrollIntoView && t.commands.scrollIntoView());
      });
    };
    try {
      if (r.hasFocus() && n43 === null || n43 === false) return true;
    } catch {
      return false;
    }
    if (s && n43 === null && !cc(t.state.selection)) return o(), true;
    let l = uc(i.doc, n43) || t.state.selection, a = t.state.selection.eq(l);
    return s && (a || i.setSelection(l), a && i.storedMarks && i.setStoredMarks(i.storedMarks), o()), true;
  };
  var $h = (n43, e) => (t) => n43.every((r, i) => e(r, { ...t, index: i }));
  var _h = (n43, e) => ({ tr: t, commands: r }) => r.insertContentAt({ from: t.selection.from, to: t.selection.to }, n43, e);
  var dc = (n43) => {
    let e = n43.childNodes;
    for (let t = e.length - 1; t >= 0; t -= 1) {
      let r = e[t];
      r.nodeType === 3 && r.nodeValue && /^(\n\s\s|\n)$/.test(r.nodeValue) ? n43.removeChild(r) : r.nodeType === 1 && dc(r);
    }
    return n43;
  };
  function ar(n43) {
    if (typeof window > "u") throw new Error("[tiptap error]: there is no window object available, so this function cannot be used");
    let e = `<body>${n43}</body>`, t = new window.DOMParser().parseFromString(e, "text/html").body;
    return dc(t);
  }
  function yn(n43, e, t) {
    if (n43 instanceof fe || n43 instanceof k) return n43;
    t = { slice: true, parseOptions: {}, ...t };
    let r = typeof n43 == "object" && n43 !== null, i = typeof n43 == "string";
    if (r) try {
      if (Array.isArray(n43) && n43.length > 0) return k.fromArray(n43.map((l) => e.nodeFromJSON(l)));
      let o = e.nodeFromJSON(n43);
      return t.errorOnInvalidContent && o.check(), o;
    } catch (s) {
      if (t.errorOnInvalidContent) throw new Error("[tiptap error]: Invalid JSON content", { cause: s });
      return console.warn("[tiptap warn]: Invalid content.", "Passed value:", n43, "Error:", s), yn("", e, t);
    }
    if (i) {
      if (t.errorOnInvalidContent) {
        let o = false, l = "", a = new Et({ topNode: e.spec.topNode, marks: e.spec.marks, nodes: e.spec.nodes.append({ __tiptap__private__unknown__catch__all__node: { content: "inline*", group: "block", parseDOM: [{ tag: "*", getAttrs: (c) => (o = true, l = typeof c == "string" ? c : c.outerHTML, null) }] } }) });
        if (t.slice ? ve.fromSchema(a).parseSlice(ar(n43), t.parseOptions) : ve.fromSchema(a).parse(ar(n43), t.parseOptions), t.errorOnInvalidContent && o) throw new Error("[tiptap error]: Invalid HTML content", { cause: new Error(`Invalid element found: ${l}`) });
      }
      let s = ve.fromSchema(e);
      return t.slice ? s.parseSlice(ar(n43), t.parseOptions).content : s.parse(ar(n43), t.parseOptions);
    }
    return yn("", e, t);
  }
  function Vh(n43, e, t) {
    let r = n43.steps.length - 1;
    if (r < e) return;
    let i = n43.steps[r];
    if (!(i instanceof Q || i instanceof U)) return;
    let s = n43.mapping.maps[r], o = 0;
    s.forEach((l, a, c, u) => {
      o === 0 && (o = u);
    }), n43.setSelection(N.near(n43.doc.resolve(o), t));
  }
  var jh = (n43) => !("type" in n43);
  var Wh = (n43, e, t) => ({ tr: r, dispatch: i, editor: s }) => {
    var o;
    if (i) {
      t = { parseOptions: s.options.parseOptions, updateSelection: true, applyInputRules: false, applyPasteRules: false, ...t };
      let l, a = (g) => {
        s.emit("contentError", { editor: s, error: g, disableCollaboration: () => {
          "collaboration" in s.storage && typeof s.storage.collaboration == "object" && s.storage.collaboration && (s.storage.collaboration.isDisabled = true);
        } });
      }, c = { preserveWhitespace: "full", ...t.parseOptions };
      if (!t.errorOnInvalidContent && !s.options.enableContentCheck && s.options.emitContentError) try {
        yn(e, s.schema, { parseOptions: c, errorOnInvalidContent: true });
      } catch (g) {
        a(g);
      }
      try {
        l = yn(e, s.schema, { parseOptions: c, errorOnInvalidContent: (o = t.errorOnInvalidContent) != null ? o : s.options.enableContentCheck });
      } catch (g) {
        return a(g), false;
      }
      let { from: u, to: d } = typeof n43 == "number" ? { from: n43, to: n43 } : { from: n43.from, to: n43.to }, f = true, h = true;
      if ((jh(l) ? l : [l]).forEach((g) => {
        g.check(), f = f ? g.isText && g.marks.length === 0 : false, h = h ? g.isBlock : false;
      }), u === d && h) {
        let { parent: g } = r.doc.resolve(u);
        g.isTextblock && !g.type.spec.code && !g.childCount && (u -= 1, d += 1);
      }
      let m;
      if (f) {
        if (Array.isArray(e)) m = e.map((g) => g.text || "").join("");
        else if (e instanceof k) {
          let g = "";
          e.forEach((y) => {
            y.text && (g += y.text);
          }), m = g;
        } else typeof e == "object" && e && e.text ? m = e.text : m = e;
        r.insertText(m, u, d);
      } else {
        m = l;
        let g = r.doc.resolve(u), y = g.node(), S = g.parentOffset === 0, w = y.isText || y.isTextblock, M = y.content.size > 0;
        S && w && M && h && (u = Math.max(0, u - 1)), r.replaceWith(u, d, m);
      }
      t.updateSelection && Vh(r, r.steps.length - 1, -1), t.applyInputRules && r.setMeta("applyInputRules", { from: u, text: m }), t.applyPasteRules && r.setMeta("applyPasteRules", { from: u, text: m });
    }
    return true;
  };
  var Kh = () => ({ state: n43, dispatch: e }) => Nl(n43, e);
  var Uh = () => ({ state: n43, dispatch: e }) => Ol(n43, e);
  var Jh = () => ({ state: n43, dispatch: e }) => Ii(n43, e);
  var qh = () => ({ state: n43, dispatch: e }) => Pi(n43, e);
  var Gh = () => ({ state: n43, dispatch: e, tr: t }) => {
    try {
      let r = ct(n43.doc, n43.selection.$from.pos, -1);
      return r == null ? false : (t.join(r, 2), e && e(t), true);
    } catch {
      return false;
    }
  };
  var Yh = () => ({ state: n43, dispatch: e, tr: t }) => {
    try {
      let r = ct(n43.doc, n43.selection.$from.pos, 1);
      return r == null ? false : (t.join(r, 2), e && e(t), true);
    } catch {
      return false;
    }
  };
  var Xh = () => ({ state: n43, dispatch: e }) => Tl(n43, e);
  var Qh = () => ({ state: n43, dispatch: e }) => vl(n43, e);
  function fc() {
    return typeof navigator < "u" ? /Mac/.test(navigator.platform) : false;
  }
  function Zh(n43) {
    let e = n43.split(/-(?!$)/), t = e[e.length - 1];
    t === "Space" && (t = " ");
    let r, i, s, o;
    for (let l = 0; l < e.length - 1; l += 1) {
      let a = e[l];
      if (/^(cmd|meta|m)$/i.test(a)) o = true;
      else if (/^a(lt)?$/i.test(a)) r = true;
      else if (/^(c|ctrl|control)$/i.test(a)) i = true;
      else if (/^s(hift)?$/i.test(a)) s = true;
      else if (/^mod$/i.test(a)) pr() || fc() ? o = true : i = true;
      else throw new Error(`Unrecognized modifier name: ${a}`);
    }
    return r && (t = `Alt-${t}`), i && (t = `Ctrl-${t}`), o && (t = `Meta-${t}`), s && (t = `Shift-${t}`), t;
  }
  var ep = (n43) => ({ editor: e, view: t, tr: r, dispatch: i }) => {
    let s = Zh(n43).split(/-(?!$)/), o = s.find((c) => !["Alt", "Ctrl", "Meta", "Shift"].includes(c)), l = new KeyboardEvent("keydown", { key: o === "Space" ? " " : o, altKey: s.includes("Alt"), ctrlKey: s.includes("Ctrl"), metaKey: s.includes("Meta"), shiftKey: s.includes("Shift"), bubbles: true, cancelable: true }), a = e.captureTransaction(() => {
      t.someProp("handleKeyDown", (c) => c(t, l));
    });
    return a?.steps.forEach((c) => {
      let u = c.map(r.mapping);
      u && i && r.maybeStep(u);
    }), true;
  };
  function Ne(n43, e, t = {}) {
    let { from: r, to: i, empty: s } = n43.selection, o = e ? V(e, n43.schema) : null, l = [];
    n43.doc.nodesBetween(r, i, (d, f) => {
      if (d.isText) return;
      let h = Math.max(r, f), p = Math.min(i, f + d.nodeSize);
      l.push({ node: d, from: h, to: p });
    });
    let a = i - r, c = l.filter((d) => o ? o.name === d.node.type.name : true).filter((d) => hr(d.node.attrs, t, { strict: false }));
    return s ? !!c.length : c.reduce((d, f) => d + f.to - f.from, 0) >= a;
  }
  var tp = (n43, e = {}) => ({ state: t, dispatch: r }) => {
    let i = V(n43, t.schema);
    return Ne(t, i, e) ? Il(t, r) : false;
  };
  var np = () => ({ state: n43, dispatch: e }) => _i(n43, e);
  var rp = (n43) => ({ state: e, dispatch: t }) => {
    let r = V(n43, e.schema);
    return Bl(r)(e, t);
  };
  var ip = () => ({ state: n43, dispatch: e }) => Bi(n43, e);
  function yr(n43, e) {
    return e.nodes[n43] ? "node" : e.marks[n43] ? "mark" : null;
  }
  function ec(n43, e) {
    let t = typeof e == "string" ? [e] : e;
    return Object.keys(n43).reduce((r, i) => (t.includes(i) || (r[i] = n43[i]), r), {});
  }
  var sp = (n43, e) => ({ tr: t, state: r, dispatch: i }) => {
    let s = null, o = null, l = yr(typeof n43 == "string" ? n43 : n43.name, r.schema);
    if (!l) return false;
    l === "node" && (s = V(n43, r.schema)), l === "mark" && (o = Ke(n43, r.schema));
    let a = false;
    return t.selection.ranges.forEach((c) => {
      r.doc.nodesBetween(c.$from.pos, c.$to.pos, (u, d) => {
        s && s === u.type && (a = true, i && t.setNodeMarkup(d, void 0, ec(u.attrs, e))), o && u.marks.length && u.marks.forEach((f) => {
          o === f.type && (a = true, i && t.addMark(d, d + u.nodeSize, o.create(ec(f.attrs, e))));
        });
      });
    }), a;
  };
  var op = () => ({ tr: n43, dispatch: e }) => (e && n43.scrollIntoView(), true);
  var lp = () => ({ tr: n43, dispatch: e }) => {
    if (e) {
      let t = new ae(n43.doc);
      n43.setSelection(t);
    }
    return true;
  };
  var ap = () => ({ state: n43, dispatch: e }) => Ri(n43, e);
  var cp = () => ({ state: n43, dispatch: e }) => Li(n43, e);
  var up = () => ({ state: n43, dispatch: e }) => Rl(n43, e);
  var dp = () => ({ state: n43, dispatch: e }) => ji(n43, e);
  var fp = () => ({ state: n43, dispatch: e }) => Vi(n43, e);
  function Ns(n43, e, t = {}, r = {}) {
    return yn(n43, e, { slice: false, parseOptions: t, errorOnInvalidContent: r.errorOnInvalidContent });
  }
  var hp = (n43, { errorOnInvalidContent: e, emitUpdate: t = true, parseOptions: r = {} } = {}) => ({ editor: i, tr: s, dispatch: o, commands: l }) => {
    let { doc: a } = s;
    if (r.preserveWhitespace !== "full") {
      let c = Ns(n43, i.schema, r, { errorOnInvalidContent: e ?? i.options.enableContentCheck });
      return o && s.replaceWith(0, a.content.size, c).setMeta("preventUpdate", !t), true;
    }
    return o && s.setMeta("preventUpdate", !t), l.insertContentAt({ from: 0, to: a.content.size }, n43, { parseOptions: r, errorOnInvalidContent: e ?? i.options.enableContentCheck });
  };
  function hc(n43, e) {
    let t = Ke(e, n43.schema), { from: r, to: i, empty: s } = n43.selection, o = [];
    s ? (n43.storedMarks && o.push(...n43.storedMarks), o.push(...n43.selection.$head.marks())) : n43.doc.nodesBetween(r, i, (a) => {
      o.push(...a.marks);
    });
    let l = o.find((a) => a.type.name === t.name);
    return l ? { ...l.attrs } : {};
  }
  function Ps(n43, e) {
    let t = new Ot(n43);
    return e.forEach((r) => {
      r.steps.forEach((i) => {
        t.step(i);
      });
    }), t;
  }
  function pp(n43) {
    for (let e = 0; e < n43.edgeCount; e += 1) {
      let { type: t } = n43.edge(e);
      if (t.isTextblock && !t.hasRequiredAttrs()) return t;
    }
    return null;
  }
  function pc(n43, e, t) {
    let r = [];
    return n43.nodesBetween(e.from, e.to, (i, s) => {
      t(i) && r.push({ node: i, pos: s });
    }), r;
  }
  function mp(n43, e) {
    for (let t = n43.depth; t > 0; t -= 1) {
      let r = n43.node(t);
      if (e(r)) return { pos: t > 0 ? n43.before(t) : 0, start: n43.start(t), depth: t, node: r };
    }
  }
  function kr(n43) {
    return (e) => mp(e.$from, n43);
  }
  function T(n43, e, t) {
    return n43.config[e] === void 0 && n43.parent ? T(n43.parent, e, t) : typeof n43.config[e] == "function" ? n43.config[e].bind({ ...t, parent: n43.parent ? T(n43.parent, e, t) : null }) : n43.config[e];
  }
  function Ls(n43) {
    return n43.map((e) => {
      let t = { name: e.name, options: e.options, storage: e.storage }, r = T(e, "addExtensions", t);
      return r ? [e, ...Ls(r())] : e;
    }).flat(10);
  }
  function zs(n43, e) {
    let t = ze.fromSchema(e).serializeFragment(n43), i = document.implementation.createHTMLDocument().createElement("div");
    return i.appendChild(t), i.innerHTML;
  }
  function mc(n43) {
    return typeof n43 == "function";
  }
  function H(n43, e = void 0, ...t) {
    return mc(n43) ? e ? n43.bind(e)(...t) : n43(...t) : n43;
  }
  function gp(n43 = {}) {
    return Object.keys(n43).length === 0 && n43.constructor === Object;
  }
  function _t(n43) {
    let e = n43.filter((i) => i.type === "extension"), t = n43.filter((i) => i.type === "node"), r = n43.filter((i) => i.type === "mark");
    return { baseExtensions: e, nodeExtensions: t, markExtensions: r };
  }
  function gc(n43) {
    let e = [], { nodeExtensions: t, markExtensions: r } = _t(n43), i = [...t, ...r], s = { default: null, validate: void 0, rendered: true, renderHTML: null, parseHTML: null, keepOnSplit: true, isRequired: false }, o = t.filter((c) => c.name !== "text").map((c) => c.name), l = r.map((c) => c.name), a = [...o, ...l];
    return n43.forEach((c) => {
      let u = { name: c.name, options: c.options, storage: c.storage, extensions: i }, d = T(c, "addGlobalAttributes", u);
      if (!d) return;
      d().forEach((h) => {
        let p;
        Array.isArray(h.types) ? p = h.types : h.types === "*" ? p = a : h.types === "nodes" ? p = o : h.types === "marks" ? p = l : p = [], p.forEach((m) => {
          Object.entries(h.attributes).forEach(([g, y]) => {
            e.push({ type: m, name: g, attribute: { ...s, ...y } });
          });
        });
      });
    }), i.forEach((c) => {
      let u = { name: c.name, options: c.options, storage: c.storage }, d = T(c, "addAttributes", u);
      if (!d) return;
      let f = d();
      Object.entries(f).forEach(([h, p]) => {
        let m = { ...s, ...p };
        typeof m?.default == "function" && (m.default = m.default()), m?.isRequired && m?.default === void 0 && delete m.default, e.push({ type: c.name, name: h, attribute: m });
      });
    }), e;
  }
  function yp(n43) {
    let e = [], t = "", r = false, i = false, s = 0, o = n43.length;
    for (let l = 0; l < o; l += 1) {
      let a = n43[l];
      if (a === "'" && !i) {
        r = !r, t += a;
        continue;
      }
      if (a === '"' && !r) {
        i = !i, t += a;
        continue;
      }
      if (!r && !i) {
        if (a === "(") {
          s += 1, t += a;
          continue;
        }
        if (a === ")" && s > 0) {
          s -= 1, t += a;
          continue;
        }
        if (a === ";" && s === 0) {
          e.push(t), t = "";
          continue;
        }
      }
      t += a;
    }
    return t && e.push(t), e;
  }
  function tc(n43) {
    let e = [], t = yp(n43 || ""), r = t.length;
    for (let i = 0; i < r; i += 1) {
      let s = t[i], o = s.indexOf(":");
      if (o === -1) continue;
      let l = s.slice(0, o).trim(), a = s.slice(o + 1).trim();
      l && a && e.push([l, a]);
    }
    return e;
  }
  function D(...n43) {
    return n43.filter((e) => !!e).reduce((e, t) => {
      let r = { ...e };
      return Object.entries(t).forEach(([i, s]) => {
        if (!r[i]) {
          r[i] = s;
          return;
        }
        if (i === "class") {
          let l = s ? String(s).split(" ") : [], a = r[i] ? r[i].split(" ") : [], c = l.filter((u) => !a.includes(u));
          r[i] = [...a, ...c].join(" ");
        } else if (i === "style") {
          let l = new Map([...tc(r[i]), ...tc(s)]);
          r[i] = Array.from(l.entries()).map(([a, c]) => `${a}: ${c}`).join("; ");
        } else r[i] = s;
      }), r;
    }, {});
  }
  function Vt(n43, e) {
    return e.filter((t) => t.type === n43.type.name).filter((t) => t.attribute.rendered).map((t) => t.attribute.renderHTML ? t.attribute.renderHTML(n43.attrs) || {} : { [t.name]: n43.attrs[t.name] }).reduce((t, r) => D(t, r), {});
  }
  function kp(n43) {
    return typeof n43 != "string" ? n43 : n43.match(/^[+-]?(?:\d*\.)?\d+$/) ? Number(n43) : n43 === "true" ? true : n43 === "false" ? false : n43;
  }
  function nc(n43, e) {
    return "style" in n43 ? n43 : { ...n43, getAttrs: (t) => {
      let r = n43.getAttrs ? n43.getAttrs(t) : n43.attrs;
      if (r === false) return false;
      let i = e.reduce((s, o) => {
        let l = o.attribute.parseHTML ? o.attribute.parseHTML(t) : kp(t.getAttribute(o.name));
        return l == null ? s : { ...s, [o.name]: l };
      }, {});
      return { ...r, ...i };
    } };
  }
  function rc(n43) {
    return Object.fromEntries(Object.entries(n43).filter(([e, t]) => e === "attrs" && gp(t) ? false : t != null));
  }
  function ic(n43) {
    var e, t;
    let r = {};
    return !((e = n43?.attribute) != null && e.isRequired) && "default" in (n43?.attribute || {}) && (r.default = n43.attribute.default), ((t = n43?.attribute) == null ? void 0 : t.validate) !== void 0 && (r.validate = n43.attribute.validate), [n43.name, r];
  }
  function bp(n43, e) {
    var t;
    let r = gc(n43), { nodeExtensions: i, markExtensions: s } = _t(n43), o = (t = i.find((c) => T(c, "topNode"))) == null ? void 0 : t.name, l = Object.fromEntries(i.map((c) => {
      let u = r.filter((y) => y.type === c.name), d = { name: c.name, options: c.options, storage: c.storage, editor: e }, f = n43.reduce((y, S) => {
        let w = T(S, "extendNodeSchema", d);
        return { ...y, ...w ? w(c) : {} };
      }, {}), h = rc({ ...f, content: H(T(c, "content", d)), marks: H(T(c, "marks", d)), group: H(T(c, "group", d)), inline: H(T(c, "inline", d)), atom: H(T(c, "atom", d)), selectable: H(T(c, "selectable", d)), draggable: H(T(c, "draggable", d)), code: H(T(c, "code", d)), whitespace: H(T(c, "whitespace", d)), linebreakReplacement: H(T(c, "linebreakReplacement", d)), defining: H(T(c, "defining", d)), isolating: H(T(c, "isolating", d)), attrs: Object.fromEntries(u.map(ic)) }), p = H(T(c, "parseHTML", d));
      p && (h.parseDOM = p.map((y) => nc(y, u)));
      let m = T(c, "renderHTML", d);
      m && (h.toDOM = (y) => m({ node: y, HTMLAttributes: Vt(y, u) }));
      let g = T(c, "renderText", d);
      return g && (h.toText = g), [c.name, h];
    })), a = Object.fromEntries(s.map((c) => {
      let u = r.filter((g) => g.type === c.name), d = { name: c.name, options: c.options, storage: c.storage, editor: e }, f = n43.reduce((g, y) => {
        let S = T(y, "extendMarkSchema", d);
        return { ...g, ...S ? S(c) : {} };
      }, {}), h = rc({ ...f, inclusive: H(T(c, "inclusive", d)), excludes: H(T(c, "excludes", d)), group: H(T(c, "group", d)), spanning: H(T(c, "spanning", d)), code: H(T(c, "code", d)), attrs: Object.fromEntries(u.map(ic)) }), p = H(T(c, "parseHTML", d));
      p && (h.parseDOM = p.map((g) => nc(g, u)));
      let m = T(c, "renderHTML", d);
      return m && (h.toDOM = (g) => m({ mark: g, HTMLAttributes: Vt(g, u) })), [c.name, h];
    }));
    return new Et({ topNode: o, nodes: l, marks: a });
  }
  function xp(n43) {
    let e = n43.filter((t, r) => n43.indexOf(t) !== r);
    return Array.from(new Set(e));
  }
  function gn(n43) {
    return n43.sort((t, r) => {
      let i = T(t, "priority") || 100, s = T(r, "priority") || 100;
      return i > s ? -1 : i < s ? 1 : 0;
    });
  }
  function yc(n43) {
    let e = gn(Ls(n43)), t = xp(e.map((r) => r.name));
    return t.length && console.warn(`[tiptap warn]: Duplicate extension names found: [${t.map((r) => `'${r}'`).join(", ")}]. This can lead to issues.`), e;
  }
  function kc(n43, e, t) {
    let { from: r, to: i } = e, { blockSeparator: s = `

`, textSerializers: o = {} } = t || {}, l = "";
    return n43.nodesBetween(r, i, (a, c, u, d) => {
      var f;
      a.isBlock && c > r && (l += s);
      let h = o?.[a.type.name];
      if (h) return u && (l += h({ node: a, pos: c, parent: u, index: d, range: e })), false;
      a.isText && (l += (f = a?.text) == null ? void 0 : f.slice(Math.max(r, c) - c, i - c));
    }), l;
  }
  function Sp(n43, e) {
    let t = { from: 0, to: n43.content.size };
    return kc(n43, t, e);
  }
  function bc(n43) {
    return Object.fromEntries(Object.entries(n43.nodes).filter(([, e]) => e.spec.toText).map(([e, t]) => [e, t.spec.toText]));
  }
  function Mp(n43, e) {
    let t = V(e, n43.schema), { from: r, to: i } = n43.selection, s = [];
    n43.doc.nodesBetween(r, i, (l) => {
      s.push(l);
    });
    let o = s.reverse().find((l) => l.type.name === t.name);
    return o ? { ...o.attrs } : {};
  }
  function Bs(n43, e) {
    let t = yr(typeof e == "string" ? e : e.name, n43.schema);
    return t === "node" ? Mp(n43, e) : t === "mark" ? hc(n43, e) : {};
  }
  function wp(n43, e = JSON.stringify) {
    let t = {};
    return n43.filter((r) => {
      let i = e(r);
      return Object.prototype.hasOwnProperty.call(t, i) ? false : t[i] = true;
    });
  }
  function Cp(n43) {
    let e = wp(n43);
    return e.length === 1 ? e : e.filter((t, r) => !e.filter((s, o) => o !== r).some((s) => t.oldRange.from >= s.oldRange.from && t.oldRange.to <= s.oldRange.to && t.newRange.from >= s.newRange.from && t.newRange.to <= s.newRange.to));
  }
  function Fs(n43) {
    let { mapping: e, steps: t } = n43, r = [];
    return e.maps.forEach((i, s) => {
      let o = [];
      if (i.ranges.length) i.forEach((l, a) => {
        o.push({ from: l, to: a });
      });
      else {
        let { from: l, to: a } = t[s];
        if (l === void 0 || a === void 0) return;
        o.push({ from: l, to: a });
      }
      o.forEach(({ from: l, to: a }) => {
        let c = e.slice(s).map(l, -1), u = e.slice(s).map(a), d = e.invert().map(c, -1), f = e.invert().map(u);
        r.push({ oldRange: { from: d, to: f }, newRange: { from: c, to: u } });
      });
    }), Cp(r);
  }
  function br(n43, e, t) {
    let r = [];
    return n43 === e ? t.resolve(n43).marks().forEach((i) => {
      let s = t.resolve(n43), o = Ds(s, i.type);
      o && r.push({ mark: i, ...o });
    }) : t.nodesBetween(n43, e, (i, s) => {
      !i || i?.nodeSize === void 0 || r.push(...i.marks.map((o) => ({ from: s, to: s + i.nodeSize, mark: o })));
    }), r;
  }
  var xc = (n43, e, t, r = 20) => {
    let i = n43.doc.resolve(t), s = r, o = null;
    for (; s > 0 && o === null; ) {
      let l = i.node(s);
      l?.type.name === e ? o = l : s -= 1;
    }
    return [o, s];
  };
  function pn(n43, e) {
    return e.nodes[n43] || e.marks[n43] || null;
  }
  function fr(n43, e, t) {
    return Object.fromEntries(Object.entries(t).filter(([r]) => {
      let i = n43.find((s) => s.type === e && s.name === r);
      return i ? i.attribute.keepOnSplit : false;
    }));
  }
  var Tp = (n43, e = 500) => {
    let t = "", r = n43.parentOffset;
    return n43.parent.nodesBetween(Math.max(0, r - e), r, (i, s, o, l) => {
      var a, c;
      let u = ((c = (a = i.type.spec).toText) == null ? void 0 : c.call(a, { node: i, pos: s, parent: o, index: l })) || i.textContent || "%leaf%";
      t += i.isAtom && !i.isText ? u : u.slice(0, Math.max(0, r - s));
    }), t;
  };
  function Os(n43, e, t = {}) {
    let { empty: r, ranges: i } = n43.selection, s = e ? Ke(e, n43.schema) : null;
    if (r) return !!(n43.storedMarks || n43.selection.$from.marks()).filter((d) => s ? s.name === d.type.name : true).find((d) => hr(d.attrs, t, { strict: false }));
    let o = 0, l = [];
    if (i.forEach(({ $from: d, $to: f }) => {
      let h = d.pos, p = f.pos;
      n43.doc.nodesBetween(h, p, (m, g) => {
        if (s && m.inlineContent && !m.type.allowsMarkType(s)) return false;
        if (!m.isText && !m.marks.length) return;
        let y = Math.max(h, g), S = Math.min(p, g + m.nodeSize), w = S - y;
        o += w, l.push(...m.marks.map((M) => ({ mark: M, from: y, to: S })));
      });
    }), o === 0) return false;
    let a = l.filter((d) => s ? s.name === d.mark.type.name : true).filter((d) => hr(d.mark.attrs, t, { strict: false })).reduce((d, f) => d + f.to - f.from, 0), c = l.filter((d) => s ? d.mark.type !== s && d.mark.type.excludes(s) : true).reduce((d, f) => d + f.to - f.from, 0);
    return (a > 0 ? a + c : a) >= o;
  }
  function vp(n43, e, t = {}) {
    if (!e) return Ne(n43, null, t) || Os(n43, null, t);
    let r = yr(e, n43.schema);
    return r === "node" ? Ne(n43, e, t) : r === "mark" ? Os(n43, e, t) : false;
  }
  var Sc = (n43, e) => {
    let { $from: t, $to: r, $anchor: i } = n43.selection;
    if (e) {
      let s = kr((l) => l.type.name === e)(n43.selection);
      if (!s) return false;
      let o = n43.doc.resolve(s.pos + 1);
      return i.pos + 1 === o.end();
    }
    return !(r.parentOffset < r.parent.nodeSize - 2 || t.pos !== r.pos);
  };
  var Mc = (n43) => {
    let { $from: e, $to: t } = n43.selection;
    return !(e.parentOffset > 0 || e.pos !== t.pos);
  };
  function sc(n43, e) {
    return Array.isArray(e) ? e.some((t) => (typeof t == "string" ? t : t.name) === n43.name) : e;
  }
  function vs(n43, e) {
    let { nodeExtensions: t } = _t(e), r = t.find((o) => o.name === n43);
    if (!r) return false;
    let i = { name: r.name, options: r.options, storage: r.storage }, s = H(T(r, "group", i));
    return typeof s != "string" ? false : s.split(" ").includes("list");
  }
  function jt(n43, { checkChildren: e = true, ignoreWhitespace: t = false } = {}) {
    var r;
    if (t) {
      if (n43.type.name === "hardBreak") return true;
      if (n43.isText) return !/\S/.test((r = n43.text) != null ? r : "");
    }
    if (n43.isText) return !n43.text;
    if (n43.isAtom || n43.isLeaf) return false;
    if (n43.content.childCount === 0) return true;
    if (e) {
      let i = true;
      return n43.content.forEach((s) => {
        i !== false && (jt(s, { ignoreWhitespace: t, checkChildren: e }) || (i = false));
      }), i;
    }
    return false;
  }
  function xr(n43) {
    return n43 instanceof C;
  }
  var wc = class Cc {
    constructor(e) {
      this.position = e;
    }
    static fromJSON(e) {
      return new Cc(e.position);
    }
    toJSON() {
      return { position: this.position };
    }
  };
  function Ep(n43, e) {
    let t = e.mapping.mapResult(n43.position);
    return { position: new wc(t.pos), mapResult: t };
  }
  function Ap(n43) {
    return new wc(n43);
  }
  function Np(n43, e, t) {
    var r;
    let { selection: i } = e, s = null;
    if (cc(i) && (s = i.$cursor), s) {
      let l = (r = n43.storedMarks) != null ? r : s.marks();
      return s.parent.type.allowsMarkType(t) && (!!t.isInSet(l) || !l.some((c) => c.type.excludes(t)));
    }
    let { ranges: o } = i;
    return o.some(({ $from: l, $to: a }) => {
      let c = l.depth === 0 ? n43.doc.inlineContent && n43.doc.type.allowsMarkType(t) : false;
      return n43.doc.nodesBetween(l.pos, a.pos, (u, d, f) => {
        if (c) return false;
        if (u.isInline) {
          let h = !f || f.type.allowsMarkType(t), p = !!t.isInSet(u.marks) || !u.marks.some((m) => m.type.excludes(t));
          c = h && p;
        }
        return !c;
      }), c;
    });
  }
  var Op = (n43, e = {}) => ({ tr: t, state: r, dispatch: i }) => {
    let { selection: s } = t, { empty: o, ranges: l } = s, a = Ke(n43, r.schema);
    if (i) if (o) {
      let c = hc(r, a);
      t.addStoredMark(a.create({ ...c, ...e }));
    } else l.forEach((c) => {
      let u = c.$from.pos, d = c.$to.pos;
      r.doc.nodesBetween(u, d, (f, h) => {
        let p = Math.max(h, u), m = Math.min(h + f.nodeSize, d);
        f.marks.find((y) => y.type === a) ? f.marks.forEach((y) => {
          a === y.type && t.addMark(p, m, a.create({ ...y.attrs, ...e }));
        }) : t.addMark(p, m, a.create(e));
      });
    });
    return Np(r, t, a);
  };
  var Ip = (n43, e) => ({ tr: t }) => (t.setMeta(n43, e), true);
  var Rp = (n43, e = {}) => ({ state: t, dispatch: r, chain: i }) => {
    let s = V(n43, t.schema), o;
    return t.selection.$anchor.sameParent(t.selection.$head) && (o = t.selection.$anchor.parent.attrs), s.isTextblock ? i().command(({ commands: l }) => Wi(s, { ...o, ...e })(t) ? true : l.clearNodes()).command(({ state: l }) => Wi(s, { ...o, ...e })(l, r)).run() : (console.warn('[tiptap warn]: Currently "setNode()" only supports text block nodes.'), false);
  };
  var Dp = (n43) => ({ tr: e, dispatch: t }) => {
    if (t) {
      let { doc: r } = e, i = bt(n43, 0, r.content.size), s = C.create(r, i);
      e.setSelection(s);
    }
    return true;
  };
  var Pp = (n43, e) => ({ tr: t, state: r, dispatch: i }) => {
    let { selection: s } = r, o, l;
    return typeof e == "number" ? (o = e, l = e) : e && "from" in e && "to" in e ? (o = e.from, l = e.to) : (o = s.from, l = s.to), i && t.doc.nodesBetween(o, l, (a, c) => {
      a.isText || t.setNodeMarkup(c, void 0, { ...a.attrs, dir: n43 });
    }), true;
  };
  var Lp = (n43) => ({ tr: e, dispatch: t }) => {
    if (t) {
      let { doc: r } = e, { from: i, to: s } = typeof n43 == "number" ? { from: n43, to: n43 } : n43, o = E.atStart(r).from, l = E.atEnd(r).to, a = bt(i, o, l), c = bt(s, o, l), u = E.create(r, a, c);
      e.setSelection(u);
    }
    return true;
  };
  var zp = (n43) => ({ state: e, dispatch: t }) => {
    let r = V(n43, e.schema);
    return Fl(r)(e, t);
  };
  function oc(n43, e) {
    let t = n43.storedMarks || n43.selection.$to.parentOffset && n43.selection.$from.marks();
    if (t) {
      let r = t.filter((i) => e?.includes(i.type.name));
      n43.tr.ensureMarks(r);
    }
  }
  var Bp = ({ keepMarks: n43 = true } = {}) => ({ tr: e, state: t, dispatch: r, editor: i }) => {
    let { selection: s, doc: o } = e, { $from: l, $to: a } = s, c = i.extensionManager.attributes, u = fr(c, l.node().type.name, l.node().attrs);
    if (s instanceof C && s.node.isBlock) return !l.parentOffset || !ge(o, l.pos) ? false : (r && (n43 && oc(t, i.extensionManager.splittableMarks), e.split(l.pos).scrollIntoView()), true);
    if (!l.parent.isBlock) return false;
    let d = a.parentOffset === a.parent.content.size, f = l.depth === 0 ? void 0 : pp(l.node(-1).contentMatchAt(l.indexAfter(-1))), h = d && f ? [{ type: f, attrs: u }] : void 0, p = ge(e.doc, e.mapping.map(l.pos), 1, h);
    if (!h && !p && ge(e.doc, e.mapping.map(l.pos), 1, f ? [{ type: f }] : void 0) && (p = true, h = f ? [{ type: f, attrs: u }] : void 0), r) {
      if (p && (s instanceof E && e.deleteSelection(), e.split(e.mapping.map(l.pos), 1, h), f && !d && !l.parentOffset && l.parent.type !== f)) {
        let m = e.mapping.map(l.before()), g = e.doc.resolve(m);
        l.node(-1).canReplaceWith(g.index(), g.index() + 1, f) && e.setNodeMarkup(e.mapping.map(l.before()), f);
      }
      n43 && oc(t, i.extensionManager.splittableMarks), e.scrollIntoView();
    }
    return p;
  };
  var Fp = (n43, e = {}) => ({ tr: t, state: r, dispatch: i, editor: s }) => {
    var o;
    let l = V(n43, r.schema), { $from: a, $to: c } = r.selection, u = r.selection.node;
    if (u && u.isBlock || a.depth < 2 || !a.sameParent(c)) return false;
    let d = a.node(-1);
    if (d.type !== l) return false;
    let f = s.extensionManager.attributes;
    if (a.parent.content.size === 0 && a.node(-1).childCount === a.indexAfter(-1)) {
      if (a.depth === 2 || a.node(-3).type !== l || a.index(-2) !== a.node(-2).childCount - 1) return false;
      if (i) {
        let y = k.empty, S = a.index(-1) ? 1 : a.index(-2) ? 2 : 3;
        for (let L = a.depth - S; L >= a.depth - 3; L -= 1) y = k.from(a.node(L).copy(y));
        let w = a.indexAfter(-1) < a.node(-2).childCount ? 1 : a.indexAfter(-2) < a.node(-3).childCount ? 2 : 3, M = { ...fr(f, a.node().type.name, a.node().attrs), ...e }, A = ((o = l.contentMatch.defaultType) == null ? void 0 : o.createAndFill(M)) || void 0;
        y = y.append(k.from(l.createAndFill(null, A) || void 0));
        let I = a.before(a.depth - (S - 1));
        t.replace(I, a.after(-w), new x(y, 4 - S, 0));
        let v = -1;
        t.doc.nodesBetween(I, t.doc.content.size, (L, z) => {
          if (v > -1) return false;
          L.isTextblock && L.content.size === 0 && (v = z + 1);
        }), v > -1 && t.setSelection(E.near(t.doc.resolve(v))), t.scrollIntoView();
      }
      return true;
    }
    let h = c.pos === a.end() ? d.contentMatchAt(0).defaultType : null, p = { ...fr(f, d.type.name, d.attrs), ...e }, m = { ...fr(f, a.node().type.name, a.node().attrs), ...e };
    t.delete(a.pos, c.pos);
    let g = h ? [{ type: l, attrs: p }, { type: h, attrs: m }] : [{ type: l, attrs: p }];
    if (!ge(t.doc, a.pos, 2)) return false;
    if (i) {
      let { selection: y, storedMarks: S } = r, { splittableMarks: w } = s.extensionManager, M = S || y.$to.parentOffset && y.$from.marks();
      if (t.split(a.pos, 2, g).scrollIntoView(), !M || !i) return true;
      let A = M.filter((I) => w.includes(I.type.name));
      t.ensureMarks(A);
    }
    return true;
  };
  var Es = (n43, e) => {
    let t = kr((o) => o.type === e)(n43.selection);
    if (!t) return true;
    let r = n43.doc.resolve(Math.max(0, t.pos - 1)).before(t.depth);
    if (r === void 0) return true;
    let i = n43.doc.nodeAt(r);
    return t.node.type === i?.type && ye(n43.doc, t.pos) && n43.join(t.pos), true;
  };
  var As = (n43, e) => {
    let t = kr((o) => o.type === e)(n43.selection);
    if (!t) return true;
    let r = n43.doc.resolve(t.start).after(t.depth);
    if (r === void 0) return true;
    let i = n43.doc.nodeAt(r);
    return t.node.type === i?.type && ye(n43.doc, r) && n43.join(r), true;
  };
  function Hp(n43) {
    let e = n43.doc, t = e.firstChild;
    if (!t) return null;
    let r = e.resolve(1), i = e.resolve(t.nodeSize - 1);
    return E.between(r, i);
  }
  var $p = (n43, e, t, r = {}) => ({ editor: i, tr: s, state: o, dispatch: l, chain: a, commands: c, can: u }) => {
    let { extensions: d, splittableMarks: f } = i.extensionManager, h = V(n43, o.schema), p = V(e, o.schema), { selection: m, storedMarks: g } = o, { $from: y, $to: S } = m, w = y.blockRange(S), M = g || m.$to.parentOffset && m.$from.marks();
    if (!w) return false;
    let A = kr((ne) => vs(ne.type.name, d))(m), I = m.from === 0 && m.to === o.doc.content.size, v = o.doc.content.content, L = v.length === 1 ? v[0] : null, z = I && L && vs(L.type.name, d) ? { node: L, pos: 0, depth: 0 } : null, q = A ?? z, Le = !!A && w.depth >= 1 && w.depth - A.depth <= 1, Te = !!z;
    if ((Le || Te) && q) {
      if (q.node.type === h) return I && Te ? a().command(({ tr: ne, dispatch: G }) => {
        let W = Hp(ne);
        return W ? (ne.setSelection(W), G && G(ne), true) : false;
      }).liftListItem(p).run() : c.liftListItem(p);
      if (vs(q.node.type.name, d) && h.validContent(q.node.content)) return a().command(() => (s.setNodeMarkup(q.pos, h), true)).command(() => Es(s, h)).command(() => As(s, h)).run();
    }
    return !t || !M || !l ? a().command(() => u().wrapInList(h, r) ? true : c.clearNodes()).wrapInList(h, r).command(() => Es(s, h)).command(() => As(s, h)).run() : a().command(() => {
      let ne = u().wrapInList(h, r), G = M.filter((W) => f.includes(W.type.name));
      return s.ensureMarks(G), ne ? true : c.clearNodes();
    }).wrapInList(h, r).command(() => Es(s, h)).command(() => As(s, h)).run();
  };
  var _p = (n43, e = {}, t = {}) => ({ state: r, commands: i }) => {
    let { extendEmptyMarkRange: s = false } = t, o = Ke(n43, r.schema);
    return Os(r, o, e) ? i.unsetMark(o, { extendEmptyMarkRange: s }) : i.setMark(o, e);
  };
  var Vp = (n43, e, t = {}) => ({ state: r, commands: i }) => {
    let s = V(n43, r.schema), o = V(e, r.schema), l = Ne(r, s, t), a;
    return r.selection.$anchor.sameParent(r.selection.$head) && (a = r.selection.$anchor.parent.attrs), l ? i.setNode(o, a) : i.setNode(s, { ...a, ...t });
  };
  var jp = (n43, e = {}) => ({ state: t, commands: r }) => {
    let i = V(n43, t.schema);
    return Ne(t, i, e) ? r.lift(i) : r.wrapIn(i, e);
  };
  var Wp = () => ({ state: n43, dispatch: e }) => {
    let t = n43.plugins;
    for (let r = 0; r < t.length; r += 1) {
      let i = t[r], s;
      if (i.spec.isInputRules && (s = i.getState(n43))) {
        if (e) {
          let o = n43.tr, l = s.transform;
          for (let a = l.steps.length - 1; a >= 0; a -= 1) o.step(l.steps[a].invert(l.docs[a]));
          if (s.text) {
            let a = o.doc.resolve(s.from).marks();
            o.replaceWith(s.from, s.to, n43.schema.text(s.text, a));
          } else o.delete(s.from, s.to);
        }
        return true;
      }
    }
    return false;
  };
  var Kp = () => ({ tr: n43, dispatch: e }) => {
    let { selection: t } = n43, { empty: r, ranges: i } = t;
    return r || e && i.forEach((s) => {
      n43.removeMark(s.$from.pos, s.$to.pos);
    }), true;
  };
  var Up = (n43, e = {}) => ({ tr: t, state: r, dispatch: i }) => {
    var s;
    let { extendEmptyMarkRange: o = false } = e, { selection: l } = t, a = Ke(n43, r.schema), { $from: c, empty: u, ranges: d } = l;
    if (!i) return true;
    if (u && o) {
      let { from: f, to: h } = l, p = (s = c.marks().find((g) => g.type === a)) == null ? void 0 : s.attrs, m = Ds(c, a, p);
      m && (f = m.from, h = m.to), t.removeMark(f, h, a);
    } else d.forEach((f) => {
      t.removeMark(f.$from.pos, f.$to.pos, a);
    });
    return t.removeStoredMark(a), true;
  };
  var Jp = (n43) => ({ tr: e, state: t, dispatch: r }) => {
    let { selection: i } = t, s, o;
    return typeof n43 == "number" ? (s = n43, o = n43) : n43 && "from" in n43 && "to" in n43 ? (s = n43.from, o = n43.to) : (s = i.from, o = i.to), r && e.doc.nodesBetween(s, o, (l, a) => {
      if (l.isText) return;
      let c = { ...l.attrs };
      delete c.dir, e.setNodeMarkup(a, void 0, c);
    }), true;
  };
  var qp = (n43, e = {}) => ({ tr: t, state: r, dispatch: i }) => {
    let s = null, o = null, l = yr(typeof n43 == "string" ? n43 : n43.name, r.schema);
    if (!l) return false;
    l === "node" && (s = V(n43, r.schema)), l === "mark" && (o = Ke(n43, r.schema));
    let a = false;
    return t.selection.ranges.forEach((c) => {
      let u = c.$from.pos, d = c.$to.pos, f, h, p, m;
      t.selection.empty ? r.doc.nodesBetween(u, d, (g, y) => {
        s && s === g.type && (a = true, p = Math.max(y, u), m = Math.min(y + g.nodeSize, d), f = y, h = g);
      }) : r.doc.nodesBetween(u, d, (g, y) => {
        y < u && s && s === g.type && (a = true, p = Math.max(y, u), m = Math.min(y + g.nodeSize, d), f = y, h = g), y >= u && y <= d && (s && s === g.type && (a = true, i && t.setNodeMarkup(y, void 0, { ...g.attrs, ...e })), o && g.marks.length && g.marks.forEach((S) => {
          if (o === S.type && (a = true, i)) {
            let w = Math.max(y, u), M = Math.min(y + g.nodeSize, d);
            t.addMark(w, M, o.create({ ...S.attrs, ...e }));
          }
        }));
      }), h && (f !== void 0 && i && t.setNodeMarkup(f, void 0, { ...h.attrs, ...e }), o && h.marks.length && h.marks.forEach((g) => {
        o === g.type && i && t.addMark(p, m, o.create({ ...g.attrs, ...e }));
      }));
    }), a;
  };
  var Gp = (n43, e = {}) => ({ state: t, dispatch: r }) => {
    let i = V(n43, t.schema);
    return Ll(i, e)(t, r);
  };
  var Yp = (n43, e = {}) => ({ state: t, dispatch: r }) => {
    let i = V(n43, t.schema);
    return zl(i, e)(t, r);
  };
  var Xp = class {
    constructor() {
      this.callbacks = {};
    }
    on(n43, e) {
      return this.callbacks[n43] || (this.callbacks[n43] = []), this.callbacks[n43].push(e), this;
    }
    emit(n43, ...e) {
      let t = this.callbacks[n43];
      return t && t.forEach((r) => r.apply(this, e)), this;
    }
    off(n43, e) {
      let t = this.callbacks[n43];
      return t && (e ? this.callbacks[n43] = t.filter((r) => r !== e) : delete this.callbacks[n43]), this;
    }
    once(n43, e) {
      let t = (...r) => {
        this.off(n43, t), e.apply(this, r);
      };
      return this.on(n43, t);
    }
    removeAllListeners() {
      this.callbacks = {};
    }
  };
  var Sr = class {
    constructor(n43) {
      var e;
      this.find = n43.find, this.handler = n43.handler, this.undoable = (e = n43.undoable) != null ? e : true;
    }
  };
  var Qp = (n43, e) => {
    if (Rs(e)) return e.exec(n43);
    let t = e(n43);
    if (!t) return null;
    let r = [t.text];
    return r.index = t.index, r.input = n43, r.data = t.data, t.replaceWith && (t.text.includes(t.replaceWith) || console.warn('[tiptap warn]: "inputRuleMatch.replaceWith" must be part of "inputRuleMatch.text".'), r.push(t.replaceWith)), r;
  };
  function cr(n43) {
    var e;
    let { editor: t, from: r, to: i, text: s, rules: o, plugin: l } = n43, { view: a } = t;
    if (a.composing) return false;
    let c = a.state.doc.resolve(r);
    if (c.parent.type.spec.code || (e = c.nodeBefore || c.nodeAfter) != null && e.marks.find((f) => f.type.spec.code)) return false;
    let u = false, d = Tp(c) + s;
    return o.forEach((f) => {
      if (u) return;
      let h = Qp(d, f.find);
      if (!h) return;
      let p = a.state.tr, m = mr({ state: a.state, transaction: p }), g = { from: r - (h[0].length - s.length), to: i }, { commands: y, chain: S, can: w } = new gr({ editor: t, state: m });
      f.handler({ state: m, range: g, match: h, commands: y, chain: S, can: w }) === null || !p.steps.length || (f.undoable && p.setMeta(l, { transform: p, from: r, to: i, text: s }), a.dispatch(p), u = true);
    }), u;
  }
  function Zp(n43) {
    let { editor: e, rules: t } = n43, r = new O({ state: { init() {
      return null;
    }, apply(i, s, o) {
      let l = i.getMeta(r);
      if (l) return l;
      let a = i.getMeta("applyInputRules");
      return a && setTimeout(() => {
        let { text: u } = a;
        typeof u == "string" ? u = u : u = zs(k.from(u), o.schema);
        let { from: d } = a, f = d + u.length;
        cr({ editor: e, from: d, to: f, text: u, rules: t, plugin: r });
      }), i.selectionSet || i.docChanged ? null : s;
    } }, props: { handleTextInput(i, s, o, l) {
      return cr({ editor: e, from: s, to: o, text: l, rules: t, plugin: r });
    }, handleDOMEvents: { compositionend: (i) => (setTimeout(() => {
      let { $cursor: s } = i.state.selection;
      s && cr({ editor: e, from: s.pos, to: s.pos, text: "", rules: t, plugin: r });
    }), false) }, handleKeyDown(i, s) {
      if (s.key !== "Enter") return false;
      let { $cursor: o } = i.state.selection;
      return o ? cr({ editor: e, from: o.pos, to: o.pos, text: `
`, rules: t, plugin: r }) : false;
    } }, isInputRules: true });
    return r;
  }
  function em(n43) {
    return Object.prototype.toString.call(n43).slice(8, -1);
  }
  function ur(n43) {
    return em(n43) !== "Object" ? false : n43.constructor === Object && Object.getPrototypeOf(n43) === Object.prototype;
  }
  function Tc(n43, e) {
    let t = { ...n43 };
    return ur(n43) && ur(e) && Object.keys(e).forEach((r) => {
      ur(e[r]) && ur(n43[r]) ? t[r] = Tc(n43[r], e[r]) : t[r] = e[r];
    }), t;
  }
  var Hs = class {
    constructor(n43 = {}) {
      this.type = "extendable", this.parent = null, this.child = null, this.name = "", this.config = { name: this.name }, this.config = { ...this.config, ...n43 }, this.name = this.config.name;
    }
    get options() {
      return { ...H(T(this, "addOptions", { name: this.name })) || {} };
    }
    get storage() {
      return { ...H(T(this, "addStorage", { name: this.name, options: this.options })) || {} };
    }
    configure(n43 = {}) {
      let e = this.extend({ ...this.config, addOptions: () => Tc(this.options, n43) });
      return e.name = this.name, e.parent = this.parent, this.child = null, e;
    }
    extend(n43 = {}) {
      let e = new this.constructor({ ...this.config, ...n43 });
      return e.parent = this, this.child = e, e.name = "name" in n43 ? n43.name : e.parent.name, e;
    }
  };
  var de = class vc extends Hs {
    constructor() {
      super(...arguments), this.type = "mark";
    }
    static create(e = {}) {
      let t = typeof e == "function" ? e() : e;
      return new vc(t);
    }
    static handleExit({ editor: e, mark: t }) {
      let { tr: r } = e.state, i = e.state.selection.$from;
      if (i.pos === i.end()) {
        let o = i.marks();
        if (!!!o.find((c) => c?.type.name === t.name)) return false;
        let a = o.find((c) => c?.type.name === t.name);
        return a && r.removeStoredMark(a), r.insertText(" ", i.pos), e.view.dispatch(r), true;
      }
      return false;
    }
    configure(e) {
      return super.configure(e);
    }
    extend(e) {
      let t = typeof e == "function" ? e() : e;
      return super.extend(t);
    }
  };
  function tm(n43) {
    return typeof n43 == "number";
  }
  var nm = class {
    constructor(n43) {
      this.find = n43.find, this.handler = n43.handler;
    }
  };
  var rm = (n43, e, t) => {
    if (Rs(e)) return [...n43.matchAll(e)];
    let r = e(n43, t);
    return r ? r.map((i) => {
      let s = [i.text];
      return s.index = i.index, s.input = n43, s.data = i.data, i.replaceWith && (i.text.includes(i.replaceWith) || console.warn('[tiptap warn]: "pasteRuleMatch.replaceWith" must be part of "pasteRuleMatch.text".'), s.push(i.replaceWith)), s;
    }) : [];
  };
  function im(n43) {
    let { editor: e, state: t, from: r, to: i, rule: s, pasteEvent: o, dropEvent: l } = n43, { commands: a, chain: c, can: u } = new gr({ editor: e, state: t }), d = [];
    return t.doc.nodesBetween(r, i, (h, p) => {
      var m, g, y, S, w;
      if ((g = (m = h.type) == null ? void 0 : m.spec) != null && g.code || !(h.isText || h.isTextblock || h.isInline)) return;
      let M = (w = (S = (y = h.content) == null ? void 0 : y.size) != null ? S : h.nodeSize) != null ? w : 0, A = Math.max(r, p), I = Math.min(i, p + M);
      if (A >= I) return;
      let v = h.isText ? h.text || "" : h.textBetween(A - p, I - p, void 0, "\uFFFC");
      rm(v, s.find, o).forEach((z) => {
        if (z.index === void 0) return;
        let q = A + z.index + 1, Le = q + z[0].length, Te = { from: t.tr.mapping.map(q), to: t.tr.mapping.map(Le) }, ne = s.handler({ state: t, range: Te, match: z, commands: a, chain: c, can: u, pasteEvent: o, dropEvent: l });
        d.push(ne);
      });
    }), d.every((h) => h !== null);
  }
  var dr = null;
  var sm = (n43) => {
    var e;
    let t = new ClipboardEvent("paste", { clipboardData: new DataTransfer() });
    return (e = t.clipboardData) == null || e.setData("text/html", n43), t;
  };
  function om(n43) {
    let { editor: e, rules: t } = n43, r = null, i = false, s = false, o = typeof ClipboardEvent < "u" ? new ClipboardEvent("paste") : null, l;
    try {
      l = typeof DragEvent < "u" ? new DragEvent("drop") : null;
    } catch {
      l = null;
    }
    let a = ({ state: u, from: d, to: f, rule: h, pasteEvt: p }) => {
      let m = u.tr, g = mr({ state: u, transaction: m });
      if (!(!im({ editor: e, state: g, from: Math.max(d - 1, 0), to: f.b - 1, rule: h, pasteEvent: p, dropEvent: l }) || !m.steps.length)) {
        try {
          l = typeof DragEvent < "u" ? new DragEvent("drop") : null;
        } catch {
          l = null;
        }
        return o = typeof ClipboardEvent < "u" ? new ClipboardEvent("paste") : null, m;
      }
    };
    return t.map((u) => new O({ view(d) {
      let f = (p) => {
        var m;
        r = (m = d.dom.parentElement) != null && m.contains(p.target) ? d.dom.parentElement : null, r && (dr = e);
      }, h = () => {
        dr && (dr = null);
      };
      return window.addEventListener("dragstart", f), window.addEventListener("dragend", h), { destroy() {
        window.removeEventListener("dragstart", f), window.removeEventListener("dragend", h);
      } };
    }, props: { handleDOMEvents: { drop: (d, f) => {
      if (s = r === d.dom.parentElement, l = f, !s) {
        let h = dr;
        h?.isEditable && setTimeout(() => {
          let p = h.state.selection;
          p && h.commands.deleteRange({ from: p.from, to: p.to });
        }, 10);
      }
      return false;
    }, paste: (d, f) => {
      var h;
      let p = (h = f.clipboardData) == null ? void 0 : h.getData("text/html");
      return o = f, i = !!p?.includes("data-pm-slice"), false;
    } } }, appendTransaction: (d, f, h) => {
      let p = d[0], m = p.getMeta("uiEvent") === "paste" && !i, g = p.getMeta("uiEvent") === "drop" && !s, y = p.getMeta("applyPasteRules"), S = !!y;
      if (!m && !g && !S) return;
      if (S) {
        let { text: A } = y;
        typeof A == "string" ? A = A : A = zs(k.from(A), h.schema);
        let { from: I } = y, v = I + A.length, L = sm(A);
        return a({ rule: u, state: h, from: I, to: { b: v }, pasteEvt: L });
      }
      let w = f.doc.content.findDiffStart(h.doc.content), M = f.doc.content.findDiffEnd(h.doc.content);
      if (!(!tm(w) || !M || w === M.b)) return a({ rule: u, state: h, from: w, to: M, pasteEvt: o });
    } }));
  }
  var Mr = class {
    constructor(n43, e) {
      this.splittableMarks = [], this.editor = e, this.baseExtensions = n43, this.extensions = yc(n43), this.schema = bp(this.extensions, e), this.setupExtensions();
    }
    get commands() {
      return this.extensions.reduce((n43, e) => {
        let t = { name: e.name, options: e.options, storage: this.editor.extensionStorage[e.name], editor: this.editor, type: pn(e.name, this.schema) }, r = T(e, "addCommands", t);
        return r ? { ...n43, ...r() } : n43;
      }, {});
    }
    get plugins() {
      let { editor: n43 } = this;
      return gn([...this.extensions].reverse()).flatMap((r) => {
        let i = { name: r.name, options: r.options, storage: this.editor.extensionStorage[r.name], editor: n43, type: pn(r.name, this.schema) }, s = [], o = T(r, "addKeyboardShortcuts", i), l = {};
        if (r.type === "mark" && T(r, "exitable", i) && (l.ArrowRight = () => de.handleExit({ editor: n43, mark: r })), o) {
          let f = Object.fromEntries(Object.entries(o()).map(([h, p]) => [h, () => p({ editor: n43 })]));
          l = { ...l, ...f };
        }
        let a = Ya(l);
        s.push(a);
        let c = T(r, "addInputRules", i);
        if (sc(r, n43.options.enableInputRules) && c) {
          let f = c();
          if (f && f.length) {
            let h = Zp({ editor: n43, rules: f }), p = Array.isArray(h) ? h : [h];
            s.push(...p);
          }
        }
        let u = T(r, "addPasteRules", i);
        if (sc(r, n43.options.enablePasteRules) && u) {
          let f = u();
          if (f && f.length) {
            let h = om({ editor: n43, rules: f });
            s.push(...h);
          }
        }
        let d = T(r, "addProseMirrorPlugins", i);
        if (d) {
          let f = d();
          s.push(...f);
        }
        return s;
      });
    }
    get attributes() {
      return gc(this.extensions);
    }
    get nodeViews() {
      let { editor: n43 } = this, { nodeExtensions: e } = _t(this.extensions);
      return Object.fromEntries(e.filter((t) => !!T(t, "addNodeView")).map((t) => {
        let r = this.attributes.filter((a) => a.type === t.name), i = { name: t.name, options: t.options, storage: this.editor.extensionStorage[t.name], editor: n43, type: V(t.name, this.schema) }, s = T(t, "addNodeView", i);
        if (!s) return [];
        let o = s();
        if (!o) return [];
        let l = (a, c, u, d, f) => {
          let h = Vt(a, r);
          return o({ node: a, view: c, getPos: u, decorations: d, innerDecorations: f, editor: n43, extension: t, HTMLAttributes: h });
        };
        return [t.name, l];
      }));
    }
    dispatchTransaction(n43) {
      let { editor: e } = this;
      return gn([...this.extensions].reverse()).reduceRight((r, i) => {
        let s = { name: i.name, options: i.options, storage: this.editor.extensionStorage[i.name], editor: e, type: pn(i.name, this.schema) }, o = T(i, "dispatchTransaction", s);
        return o ? (l) => {
          o.call(s, { transaction: l, next: r });
        } : r;
      }, n43);
    }
    transformPastedHTML(n43) {
      let { editor: e } = this;
      return gn([...this.extensions]).reduce((r, i) => {
        let s = { name: i.name, options: i.options, storage: this.editor.extensionStorage[i.name], editor: e, type: pn(i.name, this.schema) }, o = T(i, "transformPastedHTML", s);
        return o ? (l, a) => {
          let c = r(l, a);
          return o.call(s, c);
        } : r;
      }, n43 || ((r) => r));
    }
    get markViews() {
      let { editor: n43 } = this, { markExtensions: e } = _t(this.extensions);
      return Object.fromEntries(e.filter((t) => !!T(t, "addMarkView")).map((t) => {
        let r = this.attributes.filter((l) => l.type === t.name), i = { name: t.name, options: t.options, storage: this.editor.extensionStorage[t.name], editor: n43, type: Ke(t.name, this.schema) }, s = T(t, "addMarkView", i);
        if (!s) return [];
        let o = (l, a, c) => {
          let u = Vt(l, r);
          return s()({ mark: l, view: a, inline: c, editor: n43, extension: t, HTMLAttributes: u, updateAttributes: (d) => {
            km(l, n43, d);
          } });
        };
        return [t.name, o];
      }));
    }
    destroy() {
      this.extensions.forEach((n43) => {
        let e = n43;
        for (; e.parent; ) {
          let t = e.parent;
          t.child === e && (t.child = null), e = t;
        }
      }), this.extensions = [], this.baseExtensions = [], this.schema = null, this.editor = null;
    }
    setupExtensions() {
      let n43 = this.extensions;
      this.editor.extensionStorage = Object.fromEntries(n43.map((e) => [e.name, e.storage])), n43.forEach((e) => {
        var t;
        let r = { name: e.name, options: e.options, storage: this.editor.extensionStorage[e.name], editor: this.editor, type: pn(e.name, this.schema) };
        e.type === "mark" && ((t = H(T(e, "keepOnSplit", r))) == null || t) && this.splittableMarks.push(e.name);
        let i = T(e, "onBeforeCreate", r), s = T(e, "onCreate", r), o = T(e, "onUpdate", r), l = T(e, "onSelectionUpdate", r), a = T(e, "onTransaction", r), c = T(e, "onFocus", r), u = T(e, "onBlur", r), d = T(e, "onDestroy", r);
        i && this.editor.on("beforeCreate", i), s && this.editor.on("create", s), o && this.editor.on("update", o), l && this.editor.on("selectionUpdate", l), a && this.editor.on("transaction", a), c && this.editor.on("focus", c), u && this.editor.on("blur", u), d && this.editor.on("destroy", d);
      });
    }
  };
  Mr.resolve = yc;
  Mr.sort = gn;
  Mr.flatten = Ls;
  var lm = {};
  Is(lm, { ClipboardTextSerializer: () => Ac, Commands: () => Nc, Delete: () => Oc, Drop: () => Ic, Editable: () => Rc, FocusEvents: () => Pc, Keymap: () => Lc, Paste: () => zc, Tabindex: () => Bc, TextDirection: () => Fc, focusEventsPluginKey: () => Dc });
  var B = class Ec extends Hs {
    constructor() {
      super(...arguments), this.type = "extension";
    }
    static create(e = {}) {
      let t = typeof e == "function" ? e() : e;
      return new Ec(t);
    }
    configure(e) {
      return super.configure(e);
    }
    extend(e) {
      let t = typeof e == "function" ? e() : e;
      return super.extend(t);
    }
  };
  var Ac = B.create({ name: "clipboardTextSerializer", addOptions() {
    return { blockSeparator: void 0 };
  }, addProseMirrorPlugins() {
    return [new O({ key: new R("clipboardTextSerializer"), props: { clipboardTextSerializer: () => {
      let { editor: n43 } = this, { state: e, schema: t } = n43, { doc: r, selection: i } = e, { ranges: s } = i, o = Math.min(...s.map((u) => u.$from.pos)), l = Math.max(...s.map((u) => u.$to.pos)), a = bc(t);
      return kc(r, { from: o, to: l }, { ...this.options.blockSeparator !== void 0 ? { blockSeparator: this.options.blockSeparator } : {}, textSerializers: a });
    } } })];
  } });
  var Nc = B.create({ name: "commands", addCommands() {
    return { ...lc };
  } });
  var Oc = B.create({ name: "delete", onUpdate({ transaction: n43, appendedTransactions: e }) {
    var t, r, i;
    let s = () => {
      var o, l, a, c;
      if ((c = (a = (l = (o = this.editor.options.coreExtensionOptions) == null ? void 0 : o.delete) == null ? void 0 : l.filterTransaction) == null ? void 0 : a.call(l, n43)) != null ? c : n43.getMeta("y-sync$")) return;
      let u = Ps(n43.before, [n43, ...e]);
      Fs(u).forEach((h) => {
        u.mapping.mapResult(h.oldRange.from).deletedAfter && u.mapping.mapResult(h.oldRange.to).deletedBefore && u.before.nodesBetween(h.oldRange.from, h.oldRange.to, (p, m) => {
          let g = m + p.nodeSize - 2, y = h.oldRange.from <= m && g <= h.oldRange.to;
          this.editor.emit("delete", { type: "node", node: p, from: m, to: g, newFrom: u.mapping.map(m), newTo: u.mapping.map(g), deletedRange: h.oldRange, newRange: h.newRange, partial: !y, editor: this.editor, transaction: n43, combinedTransform: u });
        });
      });
      let f = u.mapping;
      u.steps.forEach((h, p) => {
        var m, g;
        if (h instanceof Fe) {
          let y = f.slice(p).map(h.from, -1), S = f.slice(p).map(h.to), w = f.invert().map(y, -1), M = f.invert().map(S), A = y > 0 ? (m = u.doc.nodeAt(y - 1)) == null ? void 0 : m.marks.some((v) => v.eq(h.mark)) : false, I = (g = u.doc.nodeAt(S)) == null ? void 0 : g.marks.some((v) => v.eq(h.mark));
          this.editor.emit("delete", { type: "mark", mark: h.mark, from: h.from, to: h.to, deletedRange: { from: w, to: M }, newRange: { from: y, to: S }, partial: !!(I || A), editor: this.editor, transaction: n43, combinedTransform: u });
        }
      });
    };
    (i = (r = (t = this.editor.options.coreExtensionOptions) == null ? void 0 : t.delete) == null ? void 0 : r.async) == null || i ? setTimeout(s, 0) : s();
  } });
  var Ic = B.create({ name: "drop", addProseMirrorPlugins() {
    return [new O({ key: new R("tiptapDrop"), props: { handleDrop: (n43, e, t, r) => {
      this.editor.emit("drop", { editor: this.editor, event: e, slice: t, moved: r });
    } } })];
  } });
  var Rc = B.create({ name: "editable", addProseMirrorPlugins() {
    return [new O({ key: new R("editable"), props: { editable: () => this.editor.options.editable } })];
  } });
  var Dc = new R("focusEvents");
  var Pc = B.create({ name: "focusEvents", addProseMirrorPlugins() {
    let { editor: n43 } = this;
    return [new O({ key: Dc, props: { handleDOMEvents: { focus: (e, t) => {
      n43.isFocused = true;
      let r = n43.state.tr.setMeta("focus", { event: t }).setMeta("addToHistory", false);
      return e.dispatch(r), false;
    }, blur: (e, t) => {
      n43.isFocused = false;
      let r = n43.state.tr.setMeta("blur", { event: t }).setMeta("addToHistory", false);
      return e.dispatch(r), false;
    } } } })];
  } });
  var Lc = B.create({ name: "keymap", addKeyboardShortcuts() {
    let n43 = () => this.editor.commands.first(({ commands: o }) => [() => o.undoInputRule(), () => o.command(({ tr: l }) => {
      let { selection: a, doc: c } = l, { empty: u, $anchor: d } = a, { pos: f, parent: h } = d, p = d.parent.isTextblock && f > 0 ? l.doc.resolve(f - 1) : d, m = p.parent.type.spec.isolating, g = d.pos - d.parentOffset, y = m && p.parent.childCount === 1 ? g === d.pos : N.atStart(c).from === f;
      return !u || !h.type.isTextblock || h.textContent.length || !y || y && d.parent.type.name === "paragraph" ? false : o.clearNodes();
    }), () => o.deleteSelection(), () => o.joinBackward(), () => o.selectNodeBackward()]), e = () => this.editor.commands.first(({ commands: o }) => [() => o.deleteSelection(), () => o.deleteCurrentNode(), () => o.joinForward(), () => o.selectNodeForward()]), r = { Enter: () => this.editor.commands.first(({ commands: o }) => [() => o.newlineInCode(), () => o.createParagraphNear(), () => o.liftEmptyBlock(), () => o.splitBlock()]), "Mod-Enter": () => this.editor.commands.exitCode(), Backspace: n43, "Mod-Backspace": n43, "Shift-Backspace": n43, Delete: e, "Mod-Delete": e, "Mod-a": () => this.editor.commands.selectAll() }, i = { ...r }, s = { ...r, "Ctrl-h": n43, "Alt-Backspace": n43, "Ctrl-d": e, "Ctrl-Alt-Backspace": e, "Alt-Delete": e, "Alt-d": e, "Ctrl-a": () => this.editor.commands.selectTextblockStart(), "Ctrl-e": () => this.editor.commands.selectTextblockEnd() };
    return pr() || fc() ? s : i;
  }, addProseMirrorPlugins() {
    return [new O({ key: new R("clearDocument"), appendTransaction: (n43, e, t) => {
      if (n43.some((m) => m.getMeta("composition"))) return;
      let r = n43.some((m) => m.docChanged) && !e.doc.eq(t.doc), i = n43.some((m) => m.getMeta("preventClearDocument"));
      if (!r || i) return;
      let { empty: s, from: o, to: l } = e.selection, a = N.atStart(e.doc).from, c = N.atEnd(e.doc).to;
      if (s || !(o === a && l === c) || !jt(t.doc)) return;
      let f = t.tr, h = mr({ state: t, transaction: f }), { commands: p } = new gr({ editor: this.editor, state: h });
      if (p.clearNodes(), !!f.steps.length) return f;
    } })];
  } });
  var zc = B.create({ name: "paste", addProseMirrorPlugins() {
    return [new O({ key: new R("tiptapPaste"), props: { handlePaste: (n43, e, t) => {
      this.editor.emit("paste", { editor: this.editor, event: e, slice: t });
    } } })];
  } });
  var Bc = B.create({ name: "tabindex", addOptions() {
    return { value: void 0 };
  }, addProseMirrorPlugins() {
    return [new O({ key: new R("tabindex"), props: { attributes: () => {
      var n43;
      return !this.editor.isEditable && this.options.value === void 0 ? {} : { tabindex: (n43 = this.options.value) != null ? n43 : "0" };
    } } })];
  } });
  var Fc = B.create({ name: "textDirection", addOptions() {
    return { direction: void 0 };
  }, addGlobalAttributes() {
    if (!this.options.direction) return [];
    let { nodeExtensions: n43 } = _t(this.extensions);
    return [{ types: n43.filter((e) => e.name !== "text").map((e) => e.name), attributes: { dir: { default: this.options.direction, parseHTML: (e) => {
      let t = e.getAttribute("dir");
      return t && (t === "ltr" || t === "rtl" || t === "auto") ? t : this.options.direction;
    }, renderHTML: (e) => e.dir ? { dir: e.dir } : {} } } }];
  }, addProseMirrorPlugins() {
    return [new O({ key: new R("textDirection"), props: { attributes: () => {
      let n43 = this.options.direction;
      return n43 ? { dir: n43 } : {};
    } } })];
  } });
  var am = class mn {
    constructor(e, t, r = false, i = null) {
      this.currentNode = null, this.actualDepth = null, this.isBlock = r, this.resolvedPos = e, this.editor = t, this.currentNode = i;
    }
    get name() {
      return this.node.type.name;
    }
    get node() {
      return this.currentNode || this.resolvedPos.node();
    }
    get element() {
      return this.editor.view.domAtPos(this.pos).node;
    }
    get depth() {
      var e;
      return (e = this.actualDepth) != null ? e : this.resolvedPos.depth;
    }
    get pos() {
      return this.resolvedPos.pos;
    }
    get content() {
      return this.node.content;
    }
    set content(e) {
      let t = this.from, r = this.to;
      if (this.isBlock) {
        if (this.content.size === 0) {
          console.error(`You can\u2019t set content on a block node. Tried to set content on ${this.name} at ${this.pos}`);
          return;
        }
        t = this.from + 1, r = this.to - 1;
      }
      this.editor.commands.insertContentAt({ from: t, to: r }, e);
    }
    get attributes() {
      return this.node.attrs;
    }
    get textContent() {
      return this.node.textContent;
    }
    get size() {
      return this.node.nodeSize;
    }
    get from() {
      return this.isBlock ? this.pos : this.resolvedPos.start(this.resolvedPos.depth);
    }
    get range() {
      return { from: this.from, to: this.to };
    }
    get to() {
      return this.isBlock ? this.pos + this.size : this.resolvedPos.end(this.resolvedPos.depth) + (this.node.isText ? 0 : 1);
    }
    get parent() {
      if (this.depth === 0) return null;
      let e = this.resolvedPos.start(this.resolvedPos.depth - 1), t = this.resolvedPos.doc.resolve(e);
      return new mn(t, this.editor);
    }
    get before() {
      let e = this.resolvedPos.doc.resolve(this.from - (this.isBlock ? 1 : 2));
      return e.depth !== this.depth && (e = this.resolvedPos.doc.resolve(this.from - 3)), new mn(e, this.editor);
    }
    get after() {
      let e = this.resolvedPos.doc.resolve(this.to + (this.isBlock ? 2 : 1));
      return e.depth !== this.depth && (e = this.resolvedPos.doc.resolve(this.to + 3)), new mn(e, this.editor);
    }
    get children() {
      let e = [];
      return this.node.content.forEach((t, r) => {
        let i = t.isBlock && !t.isTextblock, s = t.isAtom && !t.isText, o = t.isInline, l = this.pos + r + (s ? 0 : 1);
        if (l < 0 || l > this.resolvedPos.doc.nodeSize - 2) return;
        let a = this.resolvedPos.doc.resolve(l);
        if (!i && !o && a.depth <= this.depth) return;
        let c = new mn(a, this.editor, i, i || o ? t : null);
        i && (c.actualDepth = this.depth + 1), e.push(c);
      }), e;
    }
    get firstChild() {
      return this.children[0] || null;
    }
    get lastChild() {
      let e = this.children;
      return e[e.length - 1] || null;
    }
    closest(e, t = {}) {
      let r = null, i = this.parent;
      for (; i && !r; ) {
        if (i.node.type.name === e) if (Object.keys(t).length > 0) {
          let s = i.node.attrs, o = Object.keys(t);
          for (let l = 0; l < o.length; l += 1) {
            let a = o[l];
            if (s[a] !== t[a]) break;
          }
        } else r = i;
        i = i.parent;
      }
      return r;
    }
    querySelector(e, t = {}) {
      return this.querySelectorAll(e, t, true)[0] || null;
    }
    querySelectorAll(e, t = {}, r = false) {
      let i = [];
      if (!this.children || this.children.length === 0) return i;
      let s = Object.keys(t);
      return this.children.forEach((o) => {
        r && i.length > 0 || (o.node.type.name === e && s.every((a) => t[a] === o.node.attrs[a]) && i.push(o), !(r && i.length > 0) && (i = i.concat(o.querySelectorAll(e, t, r))));
      }), i;
    }
    setAttribute(e) {
      let { tr: t } = this.editor.state;
      t.setNodeMarkup(this.from, void 0, { ...this.node.attrs, ...e }), this.editor.view.dispatch(t);
    }
  };
  var cm = `.ProseMirror {
  position: relative;
}

.ProseMirror {
  word-wrap: break-word;
  white-space: pre-wrap;
  white-space: break-spaces;
  -webkit-font-variant-ligatures: none;
  font-variant-ligatures: none;
  font-feature-settings: "liga" 0; /* the above doesn't seem to work in Edge */
}

.ProseMirror [contenteditable="false"] {
  white-space: normal;
}

.ProseMirror [contenteditable="false"] [contenteditable="true"] {
  white-space: pre-wrap;
}

.ProseMirror pre {
  white-space: pre-wrap;
}

img.ProseMirror-separator {
  display: inline !important;
  border: none !important;
  margin: 0 !important;
  width: 0 !important;
  height: 0 !important;
}

.ProseMirror-gapcursor {
  display: none;
  pointer-events: none;
  position: absolute;
  margin: 0;
}

.ProseMirror-gapcursor:after {
  content: "";
  display: block;
  position: absolute;
  top: -2px;
  width: 20px;
  border-top: 1px solid black;
  animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;
}

@keyframes ProseMirror-cursor-blink {
  to {
    visibility: hidden;
  }
}

.ProseMirror-hideselection *::selection {
  background: transparent;
}

.ProseMirror-hideselection *::-moz-selection {
  background: transparent;
}

.ProseMirror-hideselection * {
  caret-color: transparent;
}

.ProseMirror-focused .ProseMirror-gapcursor {
  display: block;
}`;
  function um(n43, e, t) {
    let r = document.querySelector(`style[data-tiptap-style${t ? `-${t}` : ""}]`);
    if (r !== null) return r;
    let i = document.createElement("style");
    return e && i.setAttribute("nonce", e), i.setAttribute(`data-tiptap-style${t ? `-${t}` : ""}`, ""), i.innerHTML = n43, document.getElementsByTagName("head")[0].appendChild(i), i;
  }
  var dm = class extends Xp {
    constructor(n43 = {}) {
      super(), this.css = null, this.className = "tiptap", this.editorView = null, this.isFocused = false, this.destroyed = false, this.isInitialized = false, this.extensionStorage = {}, this.instanceId = Math.random().toString(36).slice(2, 9), this.options = { element: typeof document < "u" ? document.createElement("div") : null, content: "", injectCSS: true, injectNonce: void 0, extensions: [], autofocus: false, editable: true, textDirection: void 0, editorProps: {}, parseOptions: {}, coreExtensionOptions: {}, enableInputRules: true, enablePasteRules: true, enableCoreExtensions: true, enableContentCheck: false, emitContentError: false, onBeforeCreate: () => null, onCreate: () => null, onMount: () => null, onUnmount: () => null, onUpdate: () => null, onSelectionUpdate: () => null, onTransaction: () => null, onFocus: () => null, onBlur: () => null, onDestroy: () => null, onContentError: ({ error: r }) => {
        throw r;
      }, onPaste: () => null, onDrop: () => null, onDelete: () => null, enableExtensionDispatchTransaction: true }, this.isCapturingTransaction = false, this.capturedTransaction = null, this.utils = { getUpdatedPosition: Ep, createMappablePosition: Ap }, this.setOptions(n43), this.createExtensionManager(), this.createCommandManager(), this.createSchema(), this.on("beforeCreate", this.options.onBeforeCreate), this.emit("beforeCreate", { editor: this }), this.on("mount", this.options.onMount), this.on("unmount", this.options.onUnmount), this.on("contentError", this.options.onContentError), this.on("create", this.options.onCreate), this.on("update", this.options.onUpdate), this.on("selectionUpdate", this.options.onSelectionUpdate), this.on("transaction", this.options.onTransaction), this.on("focus", this.options.onFocus), this.on("blur", this.options.onBlur), this.on("destroy", this.options.onDestroy), this.on("drop", ({ event: r, slice: i, moved: s }) => this.options.onDrop(r, i, s)), this.on("paste", ({ event: r, slice: i }) => this.options.onPaste(r, i)), this.on("delete", this.options.onDelete);
      let e = this.createDoc(), t = uc(e, this.options.autofocus);
      this.editorState = Jn.create({ doc: e, schema: this.schema, selection: t || void 0 }), this.options.element && this.mount(this.options.element);
    }
    mount(n43) {
      if (typeof document > "u") throw new Error("[tiptap error]: The editor cannot be mounted because there is no 'document' defined in this environment.");
      this.createView(n43), this.emit("mount", { editor: this }), this.css && !document.head.contains(this.css) && document.head.appendChild(this.css), window.setTimeout(() => {
        this.isDestroyed || (this.options.autofocus !== false && this.options.autofocus !== null && this.commands.focus(this.options.autofocus), this.emit("create", { editor: this }), this.isInitialized = true);
      }, 0);
    }
    unmount() {
      if (this.editorView) {
        let n43 = this.editorView.dom;
        n43?.editor && delete n43.editor, this.editorView.destroy();
      }
      if (this.editorView = null, this.isInitialized = false, this.css && !document.querySelectorAll(`.${this.className}`).length) try {
        typeof this.css.remove == "function" ? this.css.remove() : this.css.parentNode && this.css.parentNode.removeChild(this.css);
      } catch (n43) {
        console.warn("Failed to remove CSS element:", n43);
      }
      this.css = null, this.emit("unmount", { editor: this });
    }
    get storage() {
      return this.extensionStorage;
    }
    get commands() {
      return this.commandManager.commands;
    }
    chain() {
      return this.commandManager.chain();
    }
    can() {
      return this.commandManager.can();
    }
    injectCSS() {
      this.options.injectCSS && typeof document < "u" && (this.css = um(cm, this.options.injectNonce));
    }
    setOptions(n43 = {}) {
      this.options = { ...this.options, ...n43 }, !(!this.editorView || !this.state || this.isDestroyed) && (this.options.editorProps && this.view.setProps(this.options.editorProps), this.view.updateState(this.state));
    }
    setEditable(n43, e = true) {
      this.setOptions({ editable: n43 }), e && this.emit("update", { editor: this, transaction: this.state.tr, appendedTransactions: [] });
    }
    get isEditable() {
      return this.options.editable && this.view && this.view.editable;
    }
    get view() {
      return this.editorView ? this.editorView : new Proxy({ state: this.editorState, updateState: (n43) => {
        this.editorState = n43;
      }, dispatch: (n43) => {
        this.dispatchTransaction(n43);
      }, composing: false, dragging: null, editable: true, isDestroyed: false }, { get: (n43, e) => {
        if (this.editorView) return this.editorView[e];
        if (e === "state") return this.editorState;
        if (e in n43) return Reflect.get(n43, e);
        throw new Error(`[tiptap error]: The editor view is not available. Cannot access view['${e}']. The editor may not be mounted yet.`);
      } });
    }
    get state() {
      return this.editorView && (this.editorState = this.view.state), this.editorState;
    }
    registerPlugin(n43, e) {
      let t = mc(e) ? e(n43, [...this.state.plugins]) : [...this.state.plugins, n43], r = this.state.reconfigure({ plugins: t });
      return this.view.updateState(r), r;
    }
    unregisterPlugin(n43) {
      if (this.isDestroyed) return;
      let e = this.state.plugins, t = e;
      if ([].concat(n43).forEach((i) => {
        let s = typeof i == "string" ? `${i}$` : i.key;
        t = t.filter((o) => !o.key.startsWith(s));
      }), e.length === t.length) return;
      let r = this.state.reconfigure({ plugins: t });
      return this.view.updateState(r), r;
    }
    createExtensionManager() {
      var n43, e, t, r;
      let s = [...this.options.enableCoreExtensions ? [Rc, Ac.configure({ blockSeparator: (e = (n43 = this.options.coreExtensionOptions) == null ? void 0 : n43.clipboardTextSerializer) == null ? void 0 : e.blockSeparator }), Nc, Pc, Lc, Bc.configure({ value: (r = (t = this.options.coreExtensionOptions) == null ? void 0 : t.tabindex) == null ? void 0 : r.value }), Ic, zc, Oc, Fc.configure({ direction: this.options.textDirection })].filter((o) => typeof this.options.enableCoreExtensions == "object" ? this.options.enableCoreExtensions[o.name] !== false : true) : [], ...this.options.extensions].filter((o) => ["extension", "node", "mark"].includes(o?.type));
      this.extensionManager = new Mr(s, this);
    }
    createCommandManager() {
      this.commandManager = new gr({ editor: this });
    }
    createSchema() {
      this.schema = this.extensionManager.schema;
    }
    createDoc() {
      let n43;
      try {
        n43 = Ns(this.options.content, this.schema, this.options.parseOptions, { errorOnInvalidContent: this.options.enableContentCheck });
      } catch (e) {
        if (!(e instanceof Error) || !["[tiptap error]: Invalid JSON content", "[tiptap error]: Invalid HTML content"].includes(e.message)) throw e;
        this.emit("contentError", { editor: this, error: e, disableCollaboration: () => {
          "collaboration" in this.storage && typeof this.storage.collaboration == "object" && this.storage.collaboration && (this.storage.collaboration.isDisabled = true), this.options.extensions = this.options.extensions.filter((t) => t.name !== "collaboration"), this.createExtensionManager();
        } }), n43 = Ns(this.options.content, this.schema, this.options.parseOptions, { errorOnInvalidContent: false });
      }
      return n43;
    }
    createView(n43) {
      let { editorProps: e, enableExtensionDispatchTransaction: t } = this.options, r = e.dispatchTransaction || this.dispatchTransaction.bind(this), i = t ? this.extensionManager.dispatchTransaction(r) : r, s = e.transformPastedHTML, o = this.extensionManager.transformPastedHTML(s);
      this.editorView = new dn(n43, { ...e, attributes: { role: "textbox", ...e?.attributes }, dispatchTransaction: i, transformPastedHTML: o, state: this.editorState, markViews: this.extensionManager.markViews, nodeViews: this.extensionManager.nodeViews });
      let l = this.state.reconfigure({ plugins: this.extensionManager.plugins });
      this.view.updateState(l), this.prependClass(), this.injectCSS();
      let a = this.view.dom;
      a.editor = this;
    }
    createNodeViews() {
      this.view.isDestroyed || this.view.setProps({ markViews: this.extensionManager.markViews, nodeViews: this.extensionManager.nodeViews });
    }
    prependClass() {
      this.view.dom.className = `${this.className} ${this.view.dom.className}`;
    }
    captureTransaction(n43) {
      this.isCapturingTransaction = true, n43(), this.isCapturingTransaction = false;
      let e = this.capturedTransaction;
      return this.capturedTransaction = null, e;
    }
    dispatchTransaction(n43) {
      if (this.view.isDestroyed) return;
      if (this.isCapturingTransaction) {
        if (!this.capturedTransaction) {
          this.capturedTransaction = n43;
          return;
        }
        n43.steps.forEach((c) => {
          var u;
          return (u = this.capturedTransaction) == null ? void 0 : u.step(c);
        });
        return;
      }
      let { state: e, transactions: t } = this.state.applyTransaction(n43), r = !this.state.selection.eq(e.selection), i = t.includes(n43), s = this.state;
      if (this.emit("beforeTransaction", { editor: this, transaction: n43, nextState: e }), !i) return;
      this.view.updateState(e), this.emit("transaction", { editor: this, transaction: n43, appendedTransactions: t.slice(1) }), r && this.emit("selectionUpdate", { editor: this, transaction: n43 });
      let o = t.findLast((c) => c.getMeta("focus") || c.getMeta("blur")), l = o?.getMeta("focus"), a = o?.getMeta("blur");
      l && this.emit("focus", { editor: this, event: l.event, transaction: o }), a && this.emit("blur", { editor: this, event: a.event, transaction: o }), !(n43.getMeta("preventUpdate") || !t.some((c) => c.docChanged) || s.doc.eq(e.doc)) && this.emit("update", { editor: this, transaction: n43, appendedTransactions: t.slice(1) });
    }
    getAttributes(n43) {
      return Bs(this.state, n43);
    }
    isActive(n43, e) {
      let t = typeof n43 == "string" ? n43 : null, r = typeof n43 == "string" ? e : n43;
      return vp(this.state, t, r);
    }
    getJSON() {
      return this.state.doc.toJSON();
    }
    getHTML() {
      return zs(this.state.doc.content, this.schema);
    }
    getText(n43) {
      let { blockSeparator: e = `

`, textSerializers: t = {} } = n43 || {};
      return Sp(this.state.doc, { blockSeparator: e, textSerializers: { ...bc(this.schema), ...t } });
    }
    get isEmpty() {
      return jt(this.state.doc);
    }
    destroy() {
      this.destroyed || (this.destroyed = true, this.emit("destroy"), this.unmount(), this.removeAllListeners(), this.extensionManager.destroy(), this.extensionManager = null, this.schema = null, this.commandManager = null, this.extensionStorage = {});
    }
    get isDestroyed() {
      var n43, e;
      return (e = (n43 = this.editorView) == null ? void 0 : n43.isDestroyed) != null ? e : true;
    }
    $node(n43, e) {
      var t;
      return ((t = this.$doc) == null ? void 0 : t.querySelector(n43, e)) || null;
    }
    $nodes(n43, e) {
      var t;
      return ((t = this.$doc) == null ? void 0 : t.querySelectorAll(n43, e)) || null;
    }
    $pos(n43) {
      let e = this.state.doc.resolve(n43), t = n43 > 0 && e.nodeAfter && !e.nodeAfter.isText ? e.nodeAfter : null;
      return new am(e, this, false, t);
    }
    get $doc() {
      return this.$pos(0);
    }
  };
  function Me(n43) {
    return new Sr({ find: n43.find, handler: ({ state: e, range: t, match: r }) => {
      let i = H(n43.getAttributes, void 0, r);
      if (i === false || i === null) return null;
      let { tr: s } = e, o = r[r.length - 1], l = r[0];
      if (o) {
        let a = l.search(/\S/), c = t.from + l.indexOf(o), u = c + o.length;
        if (br(t.from, t.to, e.doc).filter((h) => h.mark.type.excluded.find((m) => m === n43.type && m !== h.mark.type)).filter((h) => h.to > c).length) return null;
        u < t.to && s.delete(u, t.to), c > t.from && s.delete(t.from + a, c);
        let f = t.from + a + o.length;
        s.addMark(t.from + a, f, n43.type.create(i || {})), s.removeStoredMark(n43.type);
      }
    }, undoable: n43.undoable });
  }
  function Hc(n43) {
    return new Sr({ find: n43.find, handler: ({ state: e, range: t, match: r }) => {
      let i = H(n43.getAttributes, void 0, r) || {}, { tr: s } = e, o = t.from, l = t.to, a = n43.type.create(i);
      if (r[1]) {
        let c = r[0].lastIndexOf(r[1]), u = o + c;
        u > l ? u = l : l = u + r[1].length;
        let d = r[0][r[0].length - 1];
        s.insertText(d, o + r[0].length - 1), s.replaceWith(u, l, a);
      } else if (r[0]) {
        let c = n43.type.isInline ? o : o - 1;
        s.insert(c, n43.type.create(i)).delete(s.mapping.map(o), s.mapping.map(l));
      }
      s.scrollIntoView();
    }, undoable: n43.undoable });
  }
  function kn(n43) {
    return new Sr({ find: n43.find, handler: ({ state: e, range: t, match: r }) => {
      let i = e.doc.resolve(t.from), s = H(n43.getAttributes, void 0, r) || {};
      if (!i.node(-1).canReplaceWith(i.index(-1), i.indexAfter(-1), n43.type)) return null;
      e.tr.delete(t.from, t.to).setBlockType(t.from, t.from, n43.type, s);
    }, undoable: n43.undoable });
  }
  function Oe(n43) {
    return new Sr({ find: n43.find, handler: ({ state: e, range: t, match: r, chain: i }) => {
      let s = H(n43.getAttributes, void 0, r) || {}, o = e.tr.delete(t.from, t.to), a = o.doc.resolve(t.from).blockRange(), c = a && It(a, n43.type, s);
      if (!c) return null;
      if (o.wrap(a, c), n43.keepMarks && n43.editor) {
        let { selection: d, storedMarks: f } = e, { splittableMarks: h } = n43.editor.extensionManager, p = f || d.$to.parentOffset && d.$from.marks();
        if (p) {
          let m = p.filter((g) => h.includes(g.type.name));
          o.ensureMarks(m);
        }
      }
      if (n43.keepAttributes) {
        let d = n43.type.name === "bulletList" || n43.type.name === "orderedList" ? "listItem" : "taskList";
        i().updateAttributes(d, s).run();
      }
      let u = o.doc.resolve(t.from - 1).nodeBefore;
      u && u.type === n43.type && ye(o.doc, t.from - 1) && (!n43.joinPredicate || n43.joinPredicate(r, u)) && o.join(t.from - 1);
    }, undoable: n43.undoable });
  }
  function $c(n43, e) {
    let { selection: t } = n43, { $from: r } = t;
    if (t instanceof C) {
      let s = r.index();
      return r.parent.canReplaceWith(s, s + 1, e);
    }
    let i = r.depth;
    for (; i >= 0; ) {
      let s = r.index(i);
      if (r.node(i).contentMatchAt(s).matchType(e)) return true;
      i -= 1;
    }
    return false;
  }
  function _c(n43, e) {
    let t = n43.getAttribute("style");
    if (!t) return null;
    let r = t.split(";").map((s) => s.trim()).filter(Boolean), i = e.toLowerCase();
    for (let s = r.length - 1; s >= 0; s -= 1) {
      let o = r[s], l = o.indexOf(":");
      if (l === -1) continue;
      if (o.slice(0, l).trim().toLowerCase() === i) return o.slice(l + 1).trim();
    }
    return null;
  }
  var fm = {};
  Is(fm, { createAtomBlockMarkdownSpec: () => hm, createBlockMarkdownSpec: () => pm, createInlineMarkdownSpec: () => ym, parseAttributes: () => $s, parseIndentedBlocks: () => wr, renderNestedMarkdownContent: () => bn, serializeAttributes: () => _s });
  function $s(n43) {
    if (!n43?.trim()) return {};
    let e = {}, t = [], r = n43.replace(/["']([^"']*)["']/g, (c) => (t.push(c), `__QUOTED_${t.length - 1}__`)), i = r.match(/(?:^|\s)\.([a-zA-Z][\w-]*)/g);
    if (i) {
      let c = i.map((u) => u.trim().slice(1));
      e.class = c.join(" ");
    }
    let s = r.match(/(?:^|\s)#([a-zA-Z][\w-]*)/);
    s && (e.id = s[1]);
    let o = /([a-zA-Z][\w-]*)\s*=\s*(__QUOTED_\d+__)/g;
    Array.from(r.matchAll(o)).forEach(([, c, u]) => {
      var d;
      let f = parseInt(((d = u.match(/__QUOTED_(\d+)__/)) == null ? void 0 : d[1]) || "0", 10), h = t[f];
      h && (e[c] = h.slice(1, -1));
    });
    let a = r.replace(/(?:^|\s)\.([a-zA-Z][\w-]*)/g, "").replace(/(?:^|\s)#([a-zA-Z][\w-]*)/g, "").replace(/([a-zA-Z][\w-]*)\s*=\s*__QUOTED_\d+__/g, "").trim();
    return a && a.split(/\s+/).filter(Boolean).forEach((u) => {
      u.match(/^[a-zA-Z][\w-]*$/) && (e[u] = true);
    }), e;
  }
  function _s(n43) {
    if (!n43 || Object.keys(n43).length === 0) return "";
    let e = [];
    return n43.class && String(n43.class).split(/\s+/).filter(Boolean).forEach((r) => e.push(`.${r}`)), n43.id && e.push(`#${n43.id}`), Object.entries(n43).forEach(([t, r]) => {
      t === "class" || t === "id" || (r === true ? e.push(t) : r !== false && r != null && e.push(`${t}="${String(r)}"`));
    }), e.join(" ");
  }
  function hm(n43) {
    let { nodeName: e, name: t, parseAttributes: r = $s, serializeAttributes: i = _s, defaultAttributes: s = {}, requiredAttributes: o = [], allowedAttributes: l } = n43, a = t || e, c = (u) => {
      if (!l) return u;
      let d = {};
      return l.forEach((f) => {
        f in u && (d[f] = u[f]);
      }), d;
    };
    return { parseMarkdown: (u, d) => {
      let f = { ...s, ...u.attributes };
      return d.createNode(e, f, []);
    }, markdownTokenizer: { name: e, level: "block", start(u) {
      var d;
      let f = new RegExp(`^:::${a}(?:\\s|$)`, "m"), h = (d = u.match(f)) == null ? void 0 : d.index;
      return h !== void 0 ? h : -1;
    }, tokenize(u, d, f) {
      let h = new RegExp(`^:::${a}(?:\\s+\\{([^}]*)\\})?\\s*:::(?:\\n|$)`), p = u.match(h);
      if (!p) return;
      let m = p[1] || "", g = r(m);
      if (!o.find((S) => !(S in g))) return { type: e, raw: p[0], attributes: g };
    } }, renderMarkdown: (u) => {
      let d = c(u.attrs || {}), f = i(d), h = f ? ` {${f}}` : "";
      return `:::${a}${h} :::`;
    } };
  }
  function pm(n43) {
    let { nodeName: e, name: t, getContent: r, parseAttributes: i = $s, serializeAttributes: s = _s, defaultAttributes: o = {}, content: l = "block", allowedAttributes: a } = n43, c = t || e, u = (d) => {
      if (!a) return d;
      let f = {};
      return a.forEach((h) => {
        h in d && (f[h] = d[h]);
      }), f;
    };
    return { parseMarkdown: (d, f) => {
      let h;
      if (r) {
        let m = r(d);
        h = typeof m == "string" ? [{ type: "text", text: m }] : m;
      } else l === "block" ? h = f.parseChildren(d.tokens || []) : h = f.parseInline(d.tokens || []);
      let p = { ...o, ...d.attributes };
      return f.createNode(e, p, h);
    }, markdownTokenizer: { name: e, level: "block", start(d) {
      var f;
      let h = new RegExp(`^:::${c}`, "m"), p = (f = d.match(h)) == null ? void 0 : f.index;
      return p !== void 0 ? p : -1;
    }, tokenize(d, f, h) {
      var p;
      let m = new RegExp(`^:::${c}(?:\\s+\\{([^}]*)\\})?\\s*\\n`), g = d.match(m);
      if (!g) return;
      let [y, S = ""] = g, w = i(S), M = 1, A = y.length, I = "", v = /^:::([\w-]*)(\s.*)?/gm, L = d.slice(A);
      for (v.lastIndex = 0; ; ) {
        let z = v.exec(L);
        if (z === null) break;
        let q = z.index, Le = z[1];
        if (!((p = z[2]) != null && p.endsWith(":::"))) {
          if (Le) M += 1;
          else if (M -= 1, M === 0) {
            let Te = L.slice(0, q);
            I = Te.trim();
            let ne = d.slice(0, A + q + z[0].length), G = [];
            if (I) if (l === "block") for (G = h.blockTokens(Te), G.forEach((W) => {
              W.text && (!W.tokens || W.tokens.length === 0) && (W.tokens = h.inlineTokens(W.text));
            }); G.length > 0; ) {
              let W = G[G.length - 1];
              if (W.type === "paragraph" && (!W.text || W.text.trim() === "")) G.pop();
              else break;
            }
            else G = h.inlineTokens(I);
            return { type: e, raw: ne, attributes: w, content: I, tokens: G };
          }
        }
      }
    } }, renderMarkdown: (d, f) => {
      let h = u(d.attrs || {}), p = s(h), m = p ? ` {${p}}` : "", g = f.renderChildren(d.content || [], `

`);
      return `:::${c}${m}

${g}

:::`;
    } };
  }
  function mm(n43) {
    if (!n43.trim()) return {};
    let e = {}, t = /(\w+)=(?:"([^"]*)"|'([^']*)')/g, r = t.exec(n43);
    for (; r !== null; ) {
      let [, i, s, o] = r;
      e[i] = s || o, r = t.exec(n43);
    }
    return e;
  }
  function gm(n43) {
    return Object.entries(n43).filter(([, e]) => e != null).map(([e, t]) => `${e}="${t}"`).join(" ");
  }
  function ym(n43) {
    let { nodeName: e, name: t, getContent: r, parseAttributes: i = mm, serializeAttributes: s = gm, defaultAttributes: o = {}, selfClosing: l = false, allowedAttributes: a } = n43, c = t || e, u = (f) => {
      if (!a) return f;
      let h = {};
      return a.forEach((p) => {
        let m = typeof p == "string" ? p : p.name, g = typeof p == "string" ? void 0 : p.skipIfDefault;
        if (m in f) {
          let y = f[m];
          if (g !== void 0 && y === g) return;
          h[m] = y;
        }
      }), h;
    }, d = c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return { parseMarkdown: (f, h) => {
      let p = { ...o, ...f.attributes };
      if (l) return h.createNode(e, p);
      let m = r ? r(f) : f.content || "";
      return m ? h.createNode(e, p, [h.createTextNode(m)]) : h.createNode(e, p, []);
    }, markdownTokenizer: { name: e, level: "inline", start(f) {
      let h = l ? new RegExp(`\\[${d}\\s*[^\\]]*\\]`) : new RegExp(`\\[${d}\\s*[^\\]]*\\][\\s\\S]*?\\[\\/${d}\\]`), p = f.match(h), m = p?.index;
      return m !== void 0 ? m : -1;
    }, tokenize(f, h, p) {
      let m = l ? new RegExp(`^\\[${d}\\s*([^\\]]*)\\]`) : new RegExp(`^\\[${d}\\s*([^\\]]*)\\]([\\s\\S]*?)\\[\\/${d}\\]`), g = f.match(m);
      if (!g) return;
      let y = "", S = "";
      if (l) {
        let [, M] = g;
        S = M;
      } else {
        let [, M, A] = g;
        S = M, y = A || "";
      }
      let w = i(S.trim());
      return { type: e, raw: g[0], content: y.trim(), attributes: w };
    } }, renderMarkdown: (f) => {
      let h = "";
      r ? h = r(f) : f.content && f.content.length > 0 && (h = f.content.filter((y) => y.type === "text").map((y) => y.text).join(""));
      let p = u(f.attrs || {}), m = s(p), g = m ? ` ${m}` : "";
      return l ? `[${c}${g}]` : `[${c}${g}]${h}[/${c}]`;
    } };
  }
  function wr(n43, e, t) {
    var r, i, s, o;
    let l = n43.split(`
`), a = [], c = "", u = 0, d = e.baseIndentSize || 2;
    for (; u < l.length; ) {
      let f = l[u], h = f.match(e.itemPattern);
      if (!h) {
        if (a.length > 0) break;
        if (f.trim() === "") {
          u += 1, c = `${c}${f}
`;
          continue;
        } else return;
      }
      let p = e.extractItemData(h), { indentLevel: m, mainContent: g } = p;
      c = `${c}${f}
`;
      let y = [g];
      for (u += 1; u < l.length; ) {
        let A = l[u];
        if (A.trim() === "") {
          let v = l.slice(u + 1).findIndex((q) => q.trim() !== "");
          if (v === -1) break;
          if ((((i = (r = l[u + 1 + v].match(/^(\s*)/)) == null ? void 0 : r[1]) == null ? void 0 : i.length) || 0) > m) {
            y.push(A), c = `${c}${A}
`, u += 1;
            continue;
          } else break;
        }
        if ((((o = (s = A.match(/^(\s*)/)) == null ? void 0 : s[1]) == null ? void 0 : o.length) || 0) > m) y.push(A), c = `${c}${A}
`, u += 1;
        else break;
      }
      let S, w = y.slice(1);
      if (w.length > 0) {
        let A = w.map((I) => I.slice(m + d)).join(`
`);
        A.trim() && (e.customNestedParser ? S = e.customNestedParser(A) : S = t.blockTokens(A));
      }
      let M = e.createToken(p, S);
      a.push(M);
    }
    if (a.length !== 0) return { items: a, raw: c };
  }
  function bn(n43, e, t, r) {
    if (!n43 || !Array.isArray(n43.content)) return "";
    let i = typeof t == "function" ? t(r) : t, [s, ...o] = n43.content, l = e.renderChildren([s]), a = `${i}${l}`;
    return o && o.length > 0 && o.forEach((c, u) => {
      var d, f;
      let h = (f = (d = e.renderChild) == null ? void 0 : d.call(e, c, u + 1)) != null ? f : e.renderChildren([c]);
      if (h != null) {
        let p = h.split(`
`).map((m) => m ? e.indent(m) : e.indent("")).join(`
`);
        a += c.type === "paragraph" ? `

${p}` : `
${p}`;
      }
    }), a;
  }
  function km(n43, e, t = {}) {
    let { state: r } = e, { doc: i, tr: s } = r, o = n43;
    i.descendants((l, a) => {
      let c = s.mapping.map(a), u = s.mapping.map(a) + l.nodeSize, d = null;
      if (l.marks.forEach((h) => {
        if (h !== o) return false;
        d = h;
      }), !d) return;
      let f = false;
      if (Object.keys(t).forEach((h) => {
        t[h] !== d.attrs[h] && (f = true);
      }), f) {
        let h = n43.type.create({ ...n43.attrs, ...t });
        s.removeMark(c, u, n43.type), s.addMark(c, u, h);
      }
    }), s.docChanged && e.view.dispatch(s);
  }
  var $ = class Vc extends Hs {
    constructor() {
      super(...arguments), this.type = "node";
    }
    static create(e = {}) {
      let t = typeof e == "function" ? e() : e;
      return new Vc(t);
    }
    configure(e) {
      return super.configure(e);
    }
    extend(e) {
      let t = typeof e == "function" ? e() : e;
      return super.extend(t);
    }
  };
  function pe(n43) {
    return new nm({ find: n43.find, handler: ({ state: e, range: t, match: r, pasteEvent: i }) => {
      let s = H(n43.getAttributes, void 0, r, i);
      if (s === false || s === null) return null;
      let { tr: o } = e, l = r[r.length - 1], a = r[0], c = t.to;
      if (l) {
        let u = a.search(/\S/), d = t.from + a.indexOf(l), f = d + l.length;
        if (br(t.from, t.to, e.doc).filter((m) => m.mark.type.excluded.find((y) => y === n43.type && y !== m.mark.type)).filter((m) => m.to > d).length) return null;
        f < t.to && o.delete(f, t.to), d > t.from && o.delete(t.from + u, d), c = t.from + u + l.length, o.addMark(t.from + u, c, n43.type.create(s || {})), r.index !== void 0 && r.input !== void 0 && r.index + r[0].length >= r.input.length || o.removeStoredMark(n43.type);
      }
    } });
  }
  var Wt = (n43, e) => {
    if (n43 === "slot") return 0;
    if (n43 instanceof Function) return n43(e);
    let { children: t, ...r } = e ?? {};
    if (n43 === "svg") throw new Error("SVG elements are not supported in the JSX syntax, use the array syntax instead");
    return [n43, r, t];
  };
  var bm = /^\s*>\s$/;
  var jc = $.create({ name: "blockquote", addOptions() {
    return { HTMLAttributes: {} };
  }, content: "block+", group: "block", defining: true, parseHTML() {
    return [{ tag: "blockquote" }];
  }, renderHTML({ HTMLAttributes: n43 }) {
    return Wt("blockquote", { ...D(this.options.HTMLAttributes, n43), children: Wt("slot", {}) });
  }, parseMarkdown: (n43, e) => {
    var t;
    let r = (t = e.parseBlockChildren) != null ? t : e.parseChildren;
    return e.createNode("blockquote", void 0, r(n43.tokens || []));
  }, renderMarkdown: (n43, e) => {
    if (!n43.content) return "";
    let t = ">", r = [];
    return n43.content.forEach((i, s) => {
      var o, l;
      let u = ((l = (o = e.renderChild) == null ? void 0 : o.call(e, i, s)) != null ? l : e.renderChildren([i])).split(`
`).map((d) => d.trim() === "" ? t : `${t} ${d}`);
      r.push(u.join(`
`));
    }), r.join(`
${t}
`);
  }, addCommands() {
    return { setBlockquote: () => ({ commands: n43 }) => n43.wrapIn(this.name), toggleBlockquote: () => ({ commands: n43 }) => n43.toggleWrap(this.name), unsetBlockquote: () => ({ commands: n43 }) => n43.lift(this.name) };
  }, addKeyboardShortcuts() {
    return { "Mod-Shift-b": () => this.editor.commands.toggleBlockquote() };
  }, addInputRules() {
    return [Oe({ find: bm, type: this.type })];
  } });
  var xm = /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))$/;
  var Sm = /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))/g;
  var Mm = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))$/;
  var wm = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))/g;
  var Wc = de.create({ name: "bold", addOptions() {
    return { HTMLAttributes: {} };
  }, parseHTML() {
    return [{ tag: "strong" }, { tag: "b", getAttrs: (n43) => n43.style.fontWeight !== "normal" && null }, { style: "font-weight=400", clearMark: (n43) => n43.type.name === this.name }, { style: "font-weight", getAttrs: (n43) => /^(bold(er)?|[5-9]\d{2,})$/.test(n43) && null }];
  }, renderHTML({ HTMLAttributes: n43 }) {
    return Wt("strong", { ...D(this.options.HTMLAttributes, n43), children: Wt("slot", {}) });
  }, markdownTokenName: "strong", parseMarkdown: (n43, e) => e.applyMark("bold", e.parseInline(n43.tokens || [])), markdownOptions: { htmlReopen: { open: "<strong>", close: "</strong>" } }, renderMarkdown: (n43, e) => `**${e.renderChildren(n43)}**`, addCommands() {
    return { setBold: () => ({ commands: n43 }) => n43.setMark(this.name), toggleBold: () => ({ commands: n43 }) => n43.toggleMark(this.name), unsetBold: () => ({ commands: n43 }) => n43.unsetMark(this.name) };
  }, addKeyboardShortcuts() {
    return { "Mod-b": () => this.editor.commands.toggleBold(), "Mod-B": () => this.editor.commands.toggleBold() };
  }, addInputRules() {
    return [Me({ find: xm, type: this.type }), Me({ find: Mm, type: this.type })];
  }, addPasteRules() {
    return [pe({ find: Sm, type: this.type }), pe({ find: wm, type: this.type })];
  } });
  var Cm = /(^|[^`])`([^`]+)`(?!`)$/;
  var Tm = /(^|[^`])`([^`]+)`(?!`)/g;
  var Kc = de.create({ name: "code", addOptions() {
    return { HTMLAttributes: {} };
  }, excludes: "_", code: true, exitable: true, parseHTML() {
    return [{ tag: "code" }];
  }, renderHTML({ HTMLAttributes: n43 }) {
    return ["code", D(this.options.HTMLAttributes, n43), 0];
  }, markdownTokenName: "codespan", parseMarkdown: (n43, e) => e.applyMark("code", [{ type: "text", text: n43.text || "" }]), renderMarkdown: (n43, e) => n43.content ? `\`${e.renderChildren(n43.content)}\`` : "", addCommands() {
    return { setCode: () => ({ commands: n43 }) => n43.setMark(this.name), toggleCode: () => ({ commands: n43 }) => n43.toggleMark(this.name), unsetCode: () => ({ commands: n43 }) => n43.unsetMark(this.name) };
  }, addKeyboardShortcuts() {
    return { "Mod-e": () => this.editor.commands.toggleCode() };
  }, addInputRules() {
    return [Me({ find: Cm, type: this.type })];
  }, addPasteRules() {
    return [pe({ find: Tm, type: this.type })];
  } });
  var Vs = 4;
  var vm = /^```([a-z]+)?[\s\n]$/;
  var Em = /^~~~([a-z]+)?[\s\n]$/;
  var Uc = $.create({ name: "codeBlock", addOptions() {
    return { languageClassPrefix: "language-", exitOnTripleEnter: true, exitOnArrowDown: true, defaultLanguage: null, enableTabIndentation: false, tabSize: Vs, HTMLAttributes: {} };
  }, content: "text*", marks: "", group: "block", code: true, defining: true, addAttributes() {
    return { language: { default: this.options.defaultLanguage, parseHTML: (n43) => {
      var e;
      let { languageClassPrefix: t } = this.options;
      if (!t) return null;
      let s = [...((e = n43.firstElementChild) == null ? void 0 : e.classList) || []].filter((o) => o.startsWith(t)).map((o) => o.replace(t, ""))[0];
      return s || null;
    }, rendered: false } };
  }, parseHTML() {
    return [{ tag: "pre", preserveWhitespace: "full" }];
  }, renderHTML({ node: n43, HTMLAttributes: e }) {
    return ["pre", D(this.options.HTMLAttributes, e), ["code", { class: n43.attrs.language ? this.options.languageClassPrefix + n43.attrs.language : null }, 0]];
  }, markdownTokenName: "code", parseMarkdown: (n43, e) => {
    var t, r;
    return ((t = n43.raw) == null ? void 0 : t.startsWith("```")) === false && ((r = n43.raw) == null ? void 0 : r.startsWith("~~~")) === false && n43.codeBlockStyle !== "indented" ? [] : e.createNode("codeBlock", { language: n43.lang || null }, n43.text ? [e.createTextNode(n43.text)] : []);
  }, renderMarkdown: (n43, e) => {
    var t;
    let r = "", i = ((t = n43.attrs) == null ? void 0 : t.language) || "";
    return n43.content ? r = [`\`\`\`${i}`, e.renderChildren(n43.content), "```"].join(`
`) : r = `\`\`\`${i}

\`\`\``, r;
  }, addCommands() {
    return { setCodeBlock: (n43) => ({ commands: e }) => e.setNode(this.name, n43), toggleCodeBlock: (n43) => ({ commands: e }) => e.toggleNode(this.name, "paragraph", n43) };
  }, addKeyboardShortcuts() {
    return { "Mod-Alt-c": () => this.editor.commands.toggleCodeBlock(), Backspace: () => {
      let { empty: n43, $anchor: e } = this.editor.state.selection, t = e.pos === 1;
      return !n43 || e.parent.type.name !== this.name ? false : t || !e.parent.textContent.length ? this.editor.commands.clearNodes() : false;
    }, Tab: ({ editor: n43 }) => {
      var e;
      if (!this.options.enableTabIndentation) return false;
      let t = (e = this.options.tabSize) != null ? e : Vs, { state: r } = n43, { selection: i } = r, { $from: s, empty: o } = i;
      if (s.parent.type !== this.type) return false;
      let l = " ".repeat(t);
      return o ? n43.commands.insertContent(l) : n43.commands.command(({ tr: a }) => {
        let { from: c, to: u } = i, h = r.doc.textBetween(c, u, `
`, `
`).split(`
`).map((p) => l + p).join(`
`);
        return a.replaceWith(c, u, r.schema.text(h)), true;
      });
    }, "Shift-Tab": ({ editor: n43 }) => {
      var e;
      if (!this.options.enableTabIndentation) return false;
      let t = (e = this.options.tabSize) != null ? e : Vs, { state: r } = n43, { selection: i } = r, { $from: s, empty: o } = i;
      return s.parent.type !== this.type ? false : o ? n43.commands.command(({ tr: l }) => {
        var a;
        let { pos: c } = s, u = s.start(), d = s.end(), h = r.doc.textBetween(u, d, `
`, `
`).split(`
`), p = 0, m = 0, g = c - u;
        for (let I = 0; I < h.length; I += 1) {
          if (m + h[I].length >= g) {
            p = I;
            break;
          }
          m += h[I].length + 1;
        }
        let S = ((a = h[p].match(/^ */)) == null ? void 0 : a[0]) || "", w = Math.min(S.length, t);
        if (w === 0) return true;
        let M = u;
        for (let I = 0; I < p; I += 1) M += h[I].length + 1;
        return l.delete(M, M + w), c - M <= w && l.setSelection(E.create(l.doc, M)), true;
      }) : n43.commands.command(({ tr: l }) => {
        let { from: a, to: c } = i, f = r.doc.textBetween(a, c, `
`, `
`).split(`
`).map((h) => {
          var p;
          let m = ((p = h.match(/^ */)) == null ? void 0 : p[0]) || "", g = Math.min(m.length, t);
          return h.slice(g);
        }).join(`
`);
        return l.replaceWith(a, c, r.schema.text(f)), true;
      });
    }, Enter: ({ editor: n43 }) => {
      if (!this.options.exitOnTripleEnter) return false;
      let { state: e } = n43, { selection: t } = e, { $from: r, empty: i } = t;
      if (!i || r.parent.type !== this.type) return false;
      let s = r.parentOffset === r.parent.nodeSize - 2, o = r.parent.textContent.endsWith(`

`);
      return !s || !o ? false : n43.chain().command(({ tr: l }) => (l.delete(r.pos - 2, r.pos), true)).exitCode().run();
    }, ArrowDown: ({ editor: n43 }) => {
      if (!this.options.exitOnArrowDown) return false;
      let { state: e } = n43, { selection: t, doc: r } = e, { $from: i, empty: s } = t;
      if (!s || i.parent.type !== this.type || !(i.parentOffset === i.parent.nodeSize - 2)) return false;
      let l = i.after();
      return l === void 0 ? false : r.nodeAt(l) ? n43.commands.command(({ tr: c }) => (c.setSelection(N.near(r.resolve(l))), true)) : n43.commands.exitCode();
    } };
  }, addInputRules() {
    return [kn({ find: vm, type: this.type, getAttributes: (n43) => ({ language: n43[1] }) }), kn({ find: Em, type: this.type, getAttributes: (n43) => ({ language: n43[1] }) })];
  }, addProseMirrorPlugins() {
    return [new O({ key: new R("codeBlockVSCodeHandler"), props: { handlePaste: (n43, e) => {
      if (!e.clipboardData || this.editor.isActive(this.type.name)) return false;
      let t = e.clipboardData.getData("text/plain"), r = e.clipboardData.getData("vscode-editor-data"), i = r ? JSON.parse(r) : void 0, s = i?.mode;
      if (!t || !s) return false;
      let { tr: o, schema: l } = n43.state, a = l.text(t.replace(/\r\n?/g, `
`));
      return o.replaceSelectionWith(this.type.create({ language: s }, a)), o.selection.$from.parent.type !== this.type && o.setSelection(E.near(o.doc.resolve(Math.max(0, o.selection.from - 2)))), o.setMeta("paste", true), n43.dispatch(o), true;
    } } })];
  } });
  var Jc = $.create({ name: "doc", topNode: true, content: "block+", renderMarkdown: (n43, e) => n43.content ? e.renderChildren(n43.content, `

`) : "" });
  var qc = $.create({ name: "hardBreak", markdownTokenName: "br", addOptions() {
    return { keepMarks: true, HTMLAttributes: {} };
  }, inline: true, group: "inline", selectable: false, linebreakReplacement: true, parseHTML() {
    return [{ tag: "br" }];
  }, renderHTML({ HTMLAttributes: n43 }) {
    return ["br", D(this.options.HTMLAttributes, n43)];
  }, renderText() {
    return `
`;
  }, renderMarkdown: () => `  
`, parseMarkdown: () => ({ type: "hardBreak" }), addCommands() {
    return { setHardBreak: () => ({ commands: n43, chain: e, state: t, editor: r }) => n43.first([() => n43.exitCode(), () => n43.command(() => {
      let { selection: i, storedMarks: s } = t;
      if (i.$from.parent.type.spec.isolating) return false;
      let { keepMarks: o } = this.options, { splittableMarks: l } = r.extensionManager, a = s || i.$to.parentOffset && i.$from.marks();
      return e().insertContent({ type: this.name }).command(({ tr: c, dispatch: u }) => {
        if (u && a && o) {
          let d = a.filter((f) => l.includes(f.type.name));
          c.ensureMarks(d);
        }
        return true;
      }).run();
    })]) };
  }, addKeyboardShortcuts() {
    return { "Mod-Enter": () => this.editor.commands.setHardBreak(), "Shift-Enter": () => this.editor.commands.setHardBreak() };
  } });
  var Gc = $.create({ name: "heading", addOptions() {
    return { levels: [1, 2, 3, 4, 5, 6], HTMLAttributes: {} };
  }, content: "inline*", group: "block", defining: true, addAttributes() {
    return { level: { default: 1, rendered: false } };
  }, parseHTML() {
    return this.options.levels.map((n43) => ({ tag: `h${n43}`, attrs: { level: n43 } }));
  }, renderHTML({ node: n43, HTMLAttributes: e }) {
    return [`h${this.options.levels.includes(n43.attrs.level) ? n43.attrs.level : this.options.levels[0]}`, D(this.options.HTMLAttributes, e), 0];
  }, parseMarkdown: (n43, e) => e.createNode("heading", { level: n43.depth || 1 }, e.parseInline(n43.tokens || [])), renderMarkdown: (n43, e) => {
    var t;
    let r = (t = n43.attrs) != null && t.level ? parseInt(n43.attrs.level, 10) : 1, i = "#".repeat(r);
    return n43.content ? `${i} ${e.renderChildren(n43.content)}` : "";
  }, addCommands() {
    return { setHeading: (n43) => ({ commands: e }) => this.options.levels.includes(n43.level) ? e.setNode(this.name, n43) : false, toggleHeading: (n43) => ({ commands: e }) => this.options.levels.includes(n43.level) ? e.toggleNode(this.name, "paragraph", n43) : false };
  }, addKeyboardShortcuts() {
    return this.options.levels.reduce((n43, e) => ({ ...n43, [`Mod-Alt-${e}`]: () => this.editor.commands.toggleHeading({ level: e }) }), {});
  }, addInputRules() {
    return this.options.levels.map((n43) => kn({ find: new RegExp(`^(#{${Math.min(...this.options.levels)},${n43}})\\s$`), type: this.type, getAttributes: { level: n43 } }));
  } });
  var Yc = $.create({ name: "horizontalRule", addOptions() {
    return { HTMLAttributes: {}, nextNodeType: "paragraph" };
  }, group: "block", parseHTML() {
    return [{ tag: "hr" }];
  }, renderHTML({ HTMLAttributes: n43 }) {
    return ["hr", D(this.options.HTMLAttributes, n43)];
  }, markdownTokenName: "hr", parseMarkdown: (n43, e) => e.createNode("horizontalRule"), renderMarkdown: () => "---", addCommands() {
    return { setHorizontalRule: () => ({ chain: n43, state: e }) => {
      if (!$c(e, e.schema.nodes[this.name])) return false;
      let { selection: t } = e, { $to: r } = t, i = n43();
      return xr(t) ? i.insertContentAt(r.pos, { type: this.name }) : i.insertContent({ type: this.name }), i.command(({ state: s, tr: o, dispatch: l }) => {
        if (l) {
          let { $to: a } = o.selection, c = a.end();
          if (a.nodeAfter) a.nodeAfter.isTextblock ? o.setSelection(E.create(o.doc, a.pos + 1)) : a.nodeAfter.isBlock ? o.setSelection(C.create(o.doc, a.pos)) : o.setSelection(E.create(o.doc, a.pos));
          else {
            let u = s.schema.nodes[this.options.nextNodeType] || a.parent.type.contentMatch.defaultType, d = u?.create();
            d && (o.insert(c, d), o.setSelection(E.create(o.doc, c + 1)));
          }
          o.scrollIntoView();
        }
        return true;
      }).run();
    } };
  }, addInputRules() {
    return [Hc({ find: /^(?:---|—-|___\s|\*\*\*\s)$/, type: this.type })];
  } });
  var Am = /(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))$/;
  var Nm = /(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))/g;
  var Om = /(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))$/;
  var Im = /(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))/g;
  var Xc = de.create({ name: "italic", addOptions() {
    return { HTMLAttributes: {} };
  }, parseHTML() {
    return [{ tag: "em" }, { tag: "i", getAttrs: (n43) => n43.style.fontStyle !== "normal" && null }, { style: "font-style=normal", clearMark: (n43) => n43.type.name === this.name }, { style: "font-style=italic" }];
  }, renderHTML({ HTMLAttributes: n43 }) {
    return ["em", D(this.options.HTMLAttributes, n43), 0];
  }, addCommands() {
    return { setItalic: () => ({ commands: n43 }) => n43.setMark(this.name), toggleItalic: () => ({ commands: n43 }) => n43.toggleMark(this.name), unsetItalic: () => ({ commands: n43 }) => n43.unsetMark(this.name) };
  }, markdownTokenName: "em", parseMarkdown: (n43, e) => e.applyMark("italic", e.parseInline(n43.tokens || [])), markdownOptions: { htmlReopen: { open: "<em>", close: "</em>" } }, renderMarkdown: (n43, e) => `*${e.renderChildren(n43)}*`, addKeyboardShortcuts() {
    return { "Mod-i": () => this.editor.commands.toggleItalic(), "Mod-I": () => this.editor.commands.toggleItalic() };
  }, addInputRules() {
    return [Me({ find: Am, type: this.type }), Me({ find: Om, type: this.type })];
  }, addPasteRules() {
    return [pe({ find: Nm, type: this.type }), pe({ find: Im, type: this.type })];
  } });
  var Rm = "aaa1rp3bb0ott3vie4c1le2ogado5udhabi7c0ademy5centure6ountant0s9o1tor4d0s1ult4e0g1ro2tna4f0l1rica5g0akhan5ency5i0g1rbus3force5tel5kdn3l0ibaba4pay4lfinanz6state5y2sace3tom5m0azon4ericanexpress7family11x2fam3ica3sterdam8nalytics7droid5quan4z2o0l2partments8p0le4q0uarelle8r0ab1mco4chi3my2pa2t0e3s0da2ia2sociates9t0hleta5torney7u0ction5di0ble3o3spost5thor3o0s4w0s2x0a2z0ure5ba0by2idu3namex4d1k2r0celona5laycard4s5efoot5gains6seball5ketball8uhaus5yern5b0c1t1va3cg1n2d1e0ats2uty4er2rlin4st0buy5t2f1g1h0arti5i0ble3d1ke2ng0o3o1z2j1lack0friday9ockbuster8g1omberg7ue3m0s1w2n0pparibas9o0ats3ehringer8fa2m1nd2o0k0ing5sch2tik2on4t1utique6x2r0adesco6idgestone9oadway5ker3ther5ussels7s1t1uild0ers6siness6y1zz3v1w1y1z0h3ca0b1fe2l0l1vinklein9m0era3p2non3petown5ital0one8r0avan4ds2e0er0s4s2sa1e1h1ino4t0ering5holic7ba1n1re3c1d1enter4o1rn3f0a1d2g1h0anel2nel4rity4se2t2eap3intai5ristmas6ome4urch5i0priani6rcle4sco3tadel4i0c2y3k1l0aims4eaning6ick2nic1que6othing5ud3ub0med6m1n1o0ach3des3ffee4llege4ogne5m0mbank4unity6pany2re3uter5sec4ndos3struction8ulting7tact3ractors9oking4l1p2rsica5untry4pon0s4rses6pa2r0edit0card4union9icket5own3s1uise0s6u0isinella9v1w1x1y0mru3ou3z2dad1nce3ta1e1ing3sun4y2clk3ds2e0al0er2s3gree4livery5l1oitte5ta3mocrat6ntal2ist5si0gn4v2hl2iamonds6et2gital5rect0ory7scount3ver5h2y2j1k1m1np2o0cs1tor4g1mains5t1wnload7rive4tv2ubai3pont4rban5vag2r2z2earth3t2c0o2deka3u0cation8e1g1mail3erck5nergy4gineer0ing9terprises10pson4quipment8r0icsson6ni3s0q1tate5t1u0rovision8s2vents5xchange6pert3osed4ress5traspace10fage2il1rwinds6th3mily4n0s2rm0ers5shion4t3edex3edback6rrari3ero6i0delity5o2lm2nal1nce1ial7re0stone6mdale6sh0ing5t0ness6j1k1lickr3ghts4r2orist4wers5y2m1o0o0d1tball6rd1ex2sale4um3undation8x2r0ee1senius7l1ogans4ntier7tr2ujitsu5n0d2rniture7tbol5yi3ga0l0lery3o1up4me0s3p1rden4y2b0iz3d0n2e0a1nt0ing5orge5f1g0ee3h1i0ft0s3ves2ing5l0ass3e1obal2o4m0ail3bh2o1x2n1odaddy5ld0point6f2odyear5g0le4p1t1v2p1q1r0ainger5phics5tis4een3ipe3ocery4up4s1t1u0cci3ge2ide2tars5ru3w1y2hair2mburg5ngout5us3bo2dfc0bank7ealth0care8lp1sinki6re1mes5iphop4samitsu7tachi5v2k0t2m1n1ockey4ldings5iday5medepot5goods5s0ense7nda3rse3spital5t0ing5t0els3mail5use3w2r1sbc3t1u0ghes5yatt3undai7ibm2cbc2e1u2d1e0ee3fm2kano4l1m0amat4db2mo0bilien9n0c1dustries8finiti5o2g1k1stitute6urance4e4t0ernational10uit4vestments10o1piranga7q1r0ish4s0maili5t0anbul7t0au2v3jaguar4va3cb2e0ep2tzt3welry6io2ll2m0p2nj2o0bs1urg4t1y2p0morgan6rs3uegos4niper7kaufen5ddi3e0rryhotels6properties14fh2g1h1i0a1ds2m1ndle4tchen5wi3m1n1oeln3matsu5sher5p0mg2n2r0d1ed3uokgroup8w1y0oto4z2la0caixa5mborghini8er3nd0rover6xess5salle5t0ino3robe5w0yer5b1c1ds2ease3clerc5frak4gal2o2xus4gbt3i0dl2fe0insurance9style7ghting6ke2lly3mited4o2ncoln4k2ve1ing5k1lc1p2oan0s3cker3us3l1ndon4tte1o3ve3pl0financial11r1s1t0d0a3u0ndbeck6xe1ury5v1y2ma0drid4if1son4keup4n0agement7go3p1rket0ing3s4riott5shalls7ttel5ba2c0kinsey7d1e0d0ia3et2lbourne7me1orial6n0u2rck0msd7g1h1iami3crosoft7l1ni1t2t0subishi9k1l0b1s2m0a2n1o0bi0le4da2e1i1m1nash3ey2ster5rmon3tgage6scow4to0rcycles9v0ie4p1q1r1s0d2t0n1r2u0seum3ic4v1w1x1y1z2na0b1goya4me2vy3ba2c1e0c1t0bank4flix4work5ustar5w0s2xt0direct7us4f0l2g0o2hk2i0co2ke1on3nja3ssan1y5l1o0kia3rton4w0ruz3tv4p1r0a1w2tt2u1yc2z2obi1server7ffice5kinawa6layan0group9lo3m0ega4ne1g1l0ine5oo2pen3racle3nge4g0anic5igins6saka4tsuka4t2vh3pa0ge2nasonic7ris2s1tners4s1y3y2ccw3e0t2f0izer5g1h0armacy6d1ilips5one2to0graphy6s4ysio5ics1tet2ures6d1n0g1k2oneer5zza4k1l0ace2y0station9umbing5s3m1n0c2ohl2ker3litie5rn2st3r0axi3ess3ime3o0d0uctions8f1gressive8mo2perties3y5tection8u0dential9s1t1ub2w0c2y2qa1pon3uebec3st5racing4dio4e0ad1lestate6tor2y4cipes5d0umbrella9hab3ise0n3t2liance6n0t0als5pair3ort3ublican8st0aurant8view0s5xroth6ich0ardli6oh3l1o1p2o0cks3deo3gers4om3s0vp3u0gby3hr2n2w0e2yukyu6sa0arland6fe0ty4kura4le1on3msclub4ung5ndvik0coromant12ofi4p1rl2s1ve2xo3b0i1s2c0b1haeffler7midt4olarships8ol3ule3warz5ience5ot3d1e0arch3t2cure1ity6ek2lect4ner3rvices6ven3w1x0y3fr2g1h0angrila6rp3ell3ia1ksha5oes2p0ping5uji3w3i0lk2na1gles5te3j1k0i0n2y0pe4l0ing4m0art3ile4n0cf3o0ccer3ial4ftbank4ware6hu2lar2utions7ng1y2y2pa0ce3ort2t3r0l2s1t0ada2ples4r1tebank4farm7c0group6ockholm6rage3e3ream4udio2y3yle4u0cks3pplies3y2ort5rf1gery5zuki5v1watch4iss4x1y0dney4stems6z2tab1ipei4lk2obao4rget4tamotors6r2too4x0i3c0i2d0k2eam2ch0nology8l1masek5nnis4va3f1g1h0d1eater2re6iaa2ckets5enda4ps2res2ol4j0maxx4x2k0maxx5l1m0all4n1o0day3kyo3ols3p1ray3shiba5tal3urs3wn2yota3s3r0ade1ing4ining5vel0ers0insurance16ust3v2t1ube2i1nes3shu4v0s2w1z2ua1bank3s2g1k1nicom3versity8o2ol2ps2s1y1z2va0cations7na1guard7c1e0gas3ntures6risign5m\xF6gensberater2ung14sicherung10t2g1i0ajes4deo3g1king4llas4n1p1rgin4sa1ion4va1o3laanderen9n1odka3lvo3te1ing3o2yage5u2wales2mart4ter4ng0gou5tch0es6eather0channel12bcam3er2site5d0ding5ibo2r3f1hoswho6ien2ki2lliamhill9n0dows4e1ners6me2oodside6rk0s2ld3w2s1tc1f3xbox3erox4ihuan4n2xx2yz3yachts4hoo3maxun5ndex5e1odobashi7ga2kohama6u0tube6t1un3za0ppos4ra3ero3ip2m1one3uerich6w2";
  var Dm = "\u03B5\u03BB1\u03C52\u0431\u04331\u0435\u043B3\u0434\u0435\u0442\u04384\u0435\u044E2\u043A\u0430\u0442\u043E\u043B\u0438\u043A6\u043E\u043C3\u043C\u043A\u04342\u043E\u043D1\u0441\u043A\u0432\u04306\u043E\u043D\u043B\u0430\u0439\u043D5\u0440\u04333\u0440\u0443\u04412\u04442\u0441\u0430\u0439\u04423\u0440\u04313\u0443\u043A\u04403\u049B\u0430\u04373\u0570\u0561\u05753\u05D9\u05E9\u05E8\u05D0\u05DC5\u05E7\u05D5\u05DD3\u0627\u0628\u0648\u0638\u0628\u064A5\u0631\u0627\u0645\u0643\u06485\u0644\u0627\u0631\u062F\u06464\u0628\u062D\u0631\u064A\u06465\u062C\u0632\u0627\u0626\u06315\u0633\u0639\u0648\u062F\u064A\u06296\u0639\u0644\u064A\u0627\u06465\u0645\u063A\u0631\u06285\u0645\u0627\u0631\u0627\u062A5\u06CC\u0631\u0627\u06465\u0628\u0627\u0631\u062A2\u0632\u0627\u06314\u064A\u062A\u06433\u06BE\u0627\u0631\u062A5\u062A\u0648\u0646\u06334\u0633\u0648\u062F\u0627\u06463\u0631\u064A\u06295\u0634\u0628\u0643\u06294\u0639\u0631\u0627\u06422\u06282\u0645\u0627\u06464\u0641\u0644\u0633\u0637\u064A\u06466\u0642\u0637\u06313\u0643\u0627\u062B\u0648\u0644\u064A\u06436\u0648\u06453\u0645\u0635\u06312\u0644\u064A\u0633\u064A\u06275\u0648\u0631\u064A\u062A\u0627\u0646\u064A\u06277\u0642\u06394\u0647\u0645\u0631\u0627\u06475\u067E\u0627\u06A9\u0633\u062A\u0627\u06467\u0680\u0627\u0631\u062A4\u0915\u0949\u092E3\u0928\u0947\u091F3\u092D\u093E\u0930\u09240\u092E\u094D3\u094B\u09245\u0938\u0902\u0917\u0920\u09285\u09AC\u09BE\u0982\u09B2\u09BE5\u09AD\u09BE\u09B0\u09A42\u09F0\u09A44\u0A2D\u0A3E\u0A30\u0A244\u0AAD\u0ABE\u0AB0\u0AA44\u0B2D\u0B3E\u0B30\u0B244\u0B87\u0BA8\u0BCD\u0BA4\u0BBF\u0BAF\u0BBE6\u0BB2\u0B99\u0BCD\u0B95\u0BC86\u0B9A\u0BBF\u0B99\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0BC2\u0BB0\u0BCD11\u0C2D\u0C3E\u0C30\u0C24\u0C4D5\u0CAD\u0CBE\u0CB0\u0CA44\u0D2D\u0D3E\u0D30\u0D24\u0D025\u0DBD\u0D82\u0D9A\u0DCF4\u0E04\u0E2D\u0E213\u0E44\u0E17\u0E223\u0EA5\u0EB2\u0EA73\u10D2\u10D42\u307F\u3093\u306A3\u30A2\u30DE\u30BE\u30F34\u30AF\u30E9\u30A6\u30C94\u30B0\u30FC\u30B0\u30EB4\u30B3\u30E02\u30B9\u30C8\u30A23\u30BB\u30FC\u30EB3\u30D5\u30A1\u30C3\u30B7\u30E7\u30F36\u30DD\u30A4\u30F3\u30C84\u4E16\u754C2\u4E2D\u4FE11\u56FD1\u570B1\u6587\u7F513\u4E9A\u9A6C\u900A3\u4F01\u4E1A2\u4F5B\u5C712\u4FE1\u606F2\u5065\u5EB72\u516B\u53662\u516C\u53F81\u76CA2\u53F0\u6E7E1\u70632\u5546\u57CE1\u5E971\u68072\u5609\u91CC0\u5927\u9152\u5E975\u5728\u7EBF2\u5927\u62FF2\u5929\u4E3B\u65593\u5A31\u4E502\u5BB6\u96FB2\u5E7F\u4E1C2\u5FAE\u535A2\u6148\u55842\u6211\u7231\u4F603\u624B\u673A2\u62DB\u80582\u653F\u52A11\u5E9C2\u65B0\u52A0\u57612\u95FB2\u65F6\u5C1A2\u66F8\u7C4D2\u673A\u67842\u6DE1\u9A6C\u95213\u6E38\u620F2\u6FB3\u95802\u70B9\u770B2\u79FB\u52A82\u7EC4\u7EC7\u673A\u67844\u7F51\u57401\u5E971\u7AD91\u7EDC2\u8054\u901A2\u8C37\u6B4C2\u8D2D\u72692\u901A\u8CA92\u96C6\u56E22\u96FB\u8A0A\u76C8\u79D14\u98DE\u5229\u6D663\u98DF\u54C12\u9910\u53852\u9999\u683C\u91CC\u62C93\u6E2F2\uB2F7\uB1371\uCEF42\uC0BC\uC1312\uD55C\uAD6D2";
  var Gs = "numeric";
  var Ys = "ascii";
  var Xs = "alpha";
  var Mn = "asciinumeric";
  var Sn = "alphanumeric";
  var Qs = "domain";
  var ru = "emoji";
  var Pm = "scheme";
  var Lm = "slashscheme";
  var js = "whitespace";
  function zm(n43, e) {
    return n43 in e || (e[n43] = []), e[n43];
  }
  function xt(n43, e, t) {
    e[Gs] && (e[Mn] = true, e[Sn] = true), e[Ys] && (e[Mn] = true, e[Xs] = true), e[Mn] && (e[Sn] = true), e[Xs] && (e[Sn] = true), e[Sn] && (e[Qs] = true), e[ru] && (e[Qs] = true);
    for (let r in e) {
      let i = zm(r, t);
      i.indexOf(n43) < 0 && i.push(n43);
    }
  }
  function Bm(n43, e) {
    let t = {};
    for (let r in e) e[r].indexOf(n43) >= 0 && (t[r] = true);
    return t;
  }
  function me(n43 = null) {
    this.j = {}, this.jr = [], this.jd = null, this.t = n43;
  }
  me.groups = {};
  me.prototype = { accepts() {
    return !!this.t;
  }, go(n43) {
    let e = this, t = e.j[n43];
    if (t) return t;
    for (let r = 0; r < e.jr.length; r++) {
      let i = e.jr[r][0], s = e.jr[r][1];
      if (s && i.test(n43)) return s;
    }
    return e.jd;
  }, has(n43, e = false) {
    return e ? n43 in this.j : !!this.go(n43);
  }, ta(n43, e, t, r) {
    for (let i = 0; i < n43.length; i++) this.tt(n43[i], e, t, r);
  }, tr(n43, e, t, r) {
    r = r || me.groups;
    let i;
    return e && e.j ? i = e : (i = new me(e), t && r && xt(e, t, r)), this.jr.push([n43, i]), i;
  }, ts(n43, e, t, r) {
    let i = this, s = n43.length;
    if (!s) return i;
    for (let o = 0; o < s - 1; o++) i = i.tt(n43[o]);
    return i.tt(n43[s - 1], e, t, r);
  }, tt(n43, e, t, r) {
    r = r || me.groups;
    let i = this;
    if (e && e.j) return i.j[n43] = e, e;
    let s = e, o, l = i.go(n43);
    if (l ? (o = new me(), Object.assign(o.j, l.j), o.jr.push.apply(o.jr, l.jr), o.jd = l.jd, o.t = l.t) : o = new me(), s) {
      if (r) if (o.t && typeof o.t == "string") {
        let a = Object.assign(Bm(o.t, r), t);
        xt(s, a, r);
      } else t && xt(s, t, r);
      o.t = s;
    }
    return i.j[n43] = o, o;
  } };
  var P = (n43, e, t, r, i) => n43.ta(e, t, r, i);
  var j = (n43, e, t, r, i) => n43.tr(e, t, r, i);
  var Qc = (n43, e, t, r, i) => n43.ts(e, t, r, i);
  var b = (n43, e, t, r, i) => n43.tt(e, t, r, i);
  var qe = "WORD";
  var Zs = "UWORD";
  var iu = "ASCIINUMERICAL";
  var su = "ALPHANUMERICAL";
  var An = "LOCALHOST";
  var eo = "TLD";
  var to = "UTLD";
  var Er = "SCHEME";
  var Kt = "SLASH_SCHEME";
  var ro = "NUM";
  var no = "WS";
  var io = "NL";
  var wn = "OPENBRACE";
  var Cn = "CLOSEBRACE";
  var Ar = "OPENBRACKET";
  var Nr = "CLOSEBRACKET";
  var Or = "OPENPAREN";
  var Ir = "CLOSEPAREN";
  var Rr = "OPENANGLEBRACKET";
  var Dr = "CLOSEANGLEBRACKET";
  var Pr = "FULLWIDTHLEFTPAREN";
  var Lr = "FULLWIDTHRIGHTPAREN";
  var zr = "LEFTCORNERBRACKET";
  var Br = "RIGHTCORNERBRACKET";
  var Fr = "LEFTWHITECORNERBRACKET";
  var Hr = "RIGHTWHITECORNERBRACKET";
  var $r = "FULLWIDTHLESSTHAN";
  var _r = "FULLWIDTHGREATERTHAN";
  var Vr = "AMPERSAND";
  var jr = "APOSTROPHE";
  var Wr = "ASTERISK";
  var rt = "AT";
  var Kr = "BACKSLASH";
  var Ur = "BACKTICK";
  var Jr = "CARET";
  var St = "COLON";
  var so = "COMMA";
  var qr = "DOLLAR";
  var Ie = "DOT";
  var Gr = "EQUALS";
  var oo = "EXCLAMATION";
  var Ce = "HYPHEN";
  var Tn = "PERCENT";
  var Yr = "PIPE";
  var Xr = "PLUS";
  var Qr = "POUND";
  var vn = "QUERY";
  var lo = "QUOTE";
  var ou = "FULLWIDTHMIDDLEDOT";
  var ao = "SEMI";
  var Re = "SLASH";
  var En = "TILDE";
  var Zr = "UNDERSCORE";
  var lu = "EMOJI";
  var ei = "SYM";
  var au = Object.freeze({ __proto__: null, ALPHANUMERICAL: su, AMPERSAND: Vr, APOSTROPHE: jr, ASCIINUMERICAL: iu, ASTERISK: Wr, AT: rt, BACKSLASH: Kr, BACKTICK: Ur, CARET: Jr, CLOSEANGLEBRACKET: Dr, CLOSEBRACE: Cn, CLOSEBRACKET: Nr, CLOSEPAREN: Ir, COLON: St, COMMA: so, DOLLAR: qr, DOT: Ie, EMOJI: lu, EQUALS: Gr, EXCLAMATION: oo, FULLWIDTHGREATERTHAN: _r, FULLWIDTHLEFTPAREN: Pr, FULLWIDTHLESSTHAN: $r, FULLWIDTHMIDDLEDOT: ou, FULLWIDTHRIGHTPAREN: Lr, HYPHEN: Ce, LEFTCORNERBRACKET: zr, LEFTWHITECORNERBRACKET: Fr, LOCALHOST: An, NL: io, NUM: ro, OPENANGLEBRACKET: Rr, OPENBRACE: wn, OPENBRACKET: Ar, OPENPAREN: Or, PERCENT: Tn, PIPE: Yr, PLUS: Xr, POUND: Qr, QUERY: vn, QUOTE: lo, RIGHTCORNERBRACKET: Br, RIGHTWHITECORNERBRACKET: Hr, SCHEME: Er, SEMI: ao, SLASH: Re, SLASH_SCHEME: Kt, SYM: ei, TILDE: En, TLD: eo, UNDERSCORE: Zr, UTLD: to, UWORD: Zs, WORD: qe, WS: no });
  var Ue = /[a-z]/;
  var xn = /\p{L}/u;
  var Ws = /\p{Emoji}/u;
  var Je = /\d/;
  var Ks = /\s/;
  var Zc = "\r";
  var Us = `
`;
  var Fm = "\uFE0F";
  var Hm = "\u200D";
  var Js = "\uFFFC";
  var Cr = null;
  var Tr = null;
  function $m(n43 = []) {
    let e = {};
    me.groups = e;
    let t = new me();
    Cr == null && (Cr = eu(Rm)), Tr == null && (Tr = eu(Dm)), b(t, "'", jr), b(t, "{", wn), b(t, "}", Cn), b(t, "[", Ar), b(t, "]", Nr), b(t, "(", Or), b(t, ")", Ir), b(t, "<", Rr), b(t, ">", Dr), b(t, "\uFF08", Pr), b(t, "\uFF09", Lr), b(t, "\u300C", zr), b(t, "\u300D", Br), b(t, "\u300E", Fr), b(t, "\u300F", Hr), b(t, "\uFF1C", $r), b(t, "\uFF1E", _r), b(t, "&", Vr), b(t, "*", Wr), b(t, "@", rt), b(t, "`", Ur), b(t, "^", Jr), b(t, ":", St), b(t, ",", so), b(t, "$", qr), b(t, ".", Ie), b(t, "=", Gr), b(t, "!", oo), b(t, "-", Ce), b(t, "%", Tn), b(t, "|", Yr), b(t, "+", Xr), b(t, "#", Qr), b(t, "?", vn), b(t, '"', lo), b(t, "/", Re), b(t, ";", ao), b(t, "~", En), b(t, "_", Zr), b(t, "\\", Kr), b(t, "\u30FB", ou);
    let r = j(t, Je, ro, { [Gs]: true });
    j(r, Je, r);
    let i = j(r, Ue, iu, { [Mn]: true }), s = j(r, xn, su, { [Sn]: true }), o = j(t, Ue, qe, { [Ys]: true });
    j(o, Je, i), j(o, Ue, o), j(i, Je, i), j(i, Ue, i);
    let l = j(t, xn, Zs, { [Xs]: true });
    j(l, Ue), j(l, Je, s), j(l, xn, l), j(s, Je, s), j(s, Ue), j(s, xn, s);
    let a = b(t, Us, io, { [js]: true }), c = b(t, Zc, no, { [js]: true }), u = j(t, Ks, no, { [js]: true });
    b(t, Js, u), b(c, Us, a), b(c, Js, u), j(c, Ks, u), b(u, Zc), b(u, Us), j(u, Ks, u), b(u, Js, u);
    let d = j(t, Ws, lu, { [ru]: true });
    b(d, "#"), j(d, Ws, d), b(d, Fm, d);
    let f = b(d, Hm);
    b(f, "#"), j(f, Ws, d);
    let h = [[Ue, o], [Je, i]], p = [[Ue, null], [xn, l], [Je, s]];
    for (let m = 0; m < Cr.length; m++) nt(t, Cr[m], eo, qe, h);
    for (let m = 0; m < Tr.length; m++) nt(t, Tr[m], to, Zs, p);
    xt(eo, { tld: true, ascii: true }, e), xt(to, { utld: true, alpha: true }, e), nt(t, "file", Er, qe, h), nt(t, "mailto", Er, qe, h), nt(t, "http", Kt, qe, h), nt(t, "https", Kt, qe, h), nt(t, "ftp", Kt, qe, h), nt(t, "ftps", Kt, qe, h), xt(Er, { scheme: true, ascii: true }, e), xt(Kt, { slashscheme: true, ascii: true }, e), n43 = n43.sort((m, g) => m[0] > g[0] ? 1 : -1);
    for (let m = 0; m < n43.length; m++) {
      let g = n43[m][0], S = n43[m][1] ? { [Pm]: true } : { [Lm]: true };
      g.indexOf("-") >= 0 ? S[Qs] = true : Ue.test(g) ? Je.test(g) ? S[Mn] = true : S[Ys] = true : S[Gs] = true, Qc(t, g, g, S);
    }
    return Qc(t, "localhost", An, { ascii: true }), t.jd = new me(ei), { start: t, tokens: Object.assign({ groups: e }, au) };
  }
  function cu(n43, e) {
    let t = _m(e.replace(/[A-Z]/g, (l) => l.toLowerCase())), r = t.length, i = [], s = 0, o = 0;
    for (; o < r; ) {
      let l = n43, a = null, c = 0, u = null, d = -1, f = -1;
      for (; o < r && (a = l.go(t[o])); ) l = a, l.accepts() ? (d = 0, f = 0, u = l) : d >= 0 && (d += t[o].length, f++), c += t[o].length, s += t[o].length, o++;
      s -= d, o -= f, c -= d, i.push({ t: u.t, v: e.slice(s - c, s), s: s - c, e: s });
    }
    return i;
  }
  function _m(n43) {
    let e = [], t = n43.length, r = 0;
    for (; r < t; ) {
      let i = n43.charCodeAt(r), s, o = i < 55296 || i > 56319 || r + 1 === t || (s = n43.charCodeAt(r + 1)) < 56320 || s > 57343 ? n43[r] : n43.slice(r, r + 2);
      e.push(o), r += o.length;
    }
    return e;
  }
  function nt(n43, e, t, r, i) {
    let s, o = e.length;
    for (let l = 0; l < o - 1; l++) {
      let a = e[l];
      n43.j[a] ? s = n43.j[a] : (s = new me(r), s.jr = i.slice(), n43.j[a] = s), n43 = s;
    }
    return s = new me(t), s.jr = i.slice(), n43.j[e[o - 1]] = s, s;
  }
  function eu(n43) {
    let e = [], t = [], r = 0, i = "0123456789";
    for (; r < n43.length; ) {
      let s = 0;
      for (; i.indexOf(n43[r + s]) >= 0; ) s++;
      if (s > 0) {
        e.push(t.join(""));
        for (let o = parseInt(n43.substring(r, r + s), 10); o > 0; o--) t.pop();
        r += s;
      } else t.push(n43[r]), r++;
    }
    return e;
  }
  var Nn = { defaultProtocol: "http", events: null, format: tu, formatHref: tu, nl2br: false, tagName: "a", target: null, rel: null, validate: true, truncate: 1 / 0, className: null, attributes: null, ignoreTags: [], render: null };
  function co(n43, e = null) {
    let t = Object.assign({}, Nn);
    n43 && (t = Object.assign(t, n43 instanceof co ? n43.o : n43));
    let r = t.ignoreTags, i = [];
    for (let s = 0; s < r.length; s++) i.push(r[s].toUpperCase());
    this.o = t, e && (this.defaultRender = e), this.ignoreTags = i;
  }
  co.prototype = { o: Nn, ignoreTags: [], defaultRender(n43) {
    return n43;
  }, check(n43) {
    return this.get("validate", n43.toString(), n43);
  }, get(n43, e, t) {
    let r = e != null, i = this.o[n43];
    return i && (typeof i == "object" ? (i = t.t in i ? i[t.t] : Nn[n43], typeof i == "function" && r && (i = i(e, t))) : typeof i == "function" && r && (i = i(e, t.t, t)), i);
  }, getObj(n43, e, t) {
    let r = this.o[n43];
    return typeof r == "function" && e != null && (r = r(e, t.t, t)), r;
  }, render(n43) {
    let e = n43.render(this);
    return (this.get("render", null, n43) || this.defaultRender)(e, n43.t, n43);
  } };
  function tu(n43) {
    return n43;
  }
  function uu(n43, e) {
    this.t = "token", this.v = n43, this.tk = e;
  }
  uu.prototype = { isLink: false, toString() {
    return this.v;
  }, toHref(n43) {
    return this.toString();
  }, toFormattedString(n43) {
    let e = this.toString(), t = n43.get("truncate", e, this), r = n43.get("format", e, this);
    return t && r.length > t ? r.substring(0, t) + "\u2026" : r;
  }, toFormattedHref(n43) {
    return n43.get("formatHref", this.toHref(n43.get("defaultProtocol")), this);
  }, startIndex() {
    return this.tk[0].s;
  }, endIndex() {
    return this.tk[this.tk.length - 1].e;
  }, toObject(n43 = Nn.defaultProtocol) {
    return { type: this.t, value: this.toString(), isLink: this.isLink, href: this.toHref(n43), start: this.startIndex(), end: this.endIndex() };
  }, toFormattedObject(n43) {
    return { type: this.t, value: this.toFormattedString(n43), isLink: this.isLink, href: this.toFormattedHref(n43), start: this.startIndex(), end: this.endIndex() };
  }, validate(n43) {
    return n43.get("validate", this.toString(), this);
  }, render(n43) {
    let e = this, t = this.toHref(n43.get("defaultProtocol")), r = n43.get("formatHref", t, this), i = n43.get("tagName", t, e), s = this.toFormattedString(n43), o = {}, l = n43.get("className", t, e), a = n43.get("target", t, e), c = n43.get("rel", t, e), u = n43.getObj("attributes", t, e), d = n43.getObj("events", t, e);
    return o.href = r, l && (o.class = l), a && (o.target = a), c && (o.rel = c), u && Object.assign(o, u), { tagName: i, attributes: o, content: s, eventListeners: d };
  } };
  function ti(n43, e) {
    class t extends uu {
      constructor(i, s) {
        super(i, s), this.t = n43;
      }
    }
    for (let r in e) t.prototype[r] = e[r];
    return t.t = n43, t;
  }
  var Vm = ti("email", { isLink: true, toHref() {
    return "mailto:" + this.toString();
  } });
  var nu = ti("text");
  var jm = ti("nl");
  var vr = ti("url", { isLink: true, toHref(n43 = Nn.defaultProtocol) {
    return this.hasProtocol() ? this.v : `${n43}://${this.v}`;
  }, hasProtocol() {
    let n43 = this.tk;
    return n43.length >= 2 && n43[0].t !== An && n43[1].t === St;
  } });
  var we = (n43) => new me(n43);
  function Wm({ groups: n43 }) {
    let e = n43.domain.concat([Vr, Wr, rt, Kr, Ur, Jr, qr, Gr, Ce, ro, Tn, Yr, Xr, Qr, Re, ei, En, Zr]), t = [jr, St, so, Ie, oo, Tn, vn, lo, ao, Rr, Dr, wn, Cn, Nr, Ar, Or, Ir, Pr, Lr, zr, Br, Fr, Hr, $r, _r], r = [Vr, jr, Wr, Kr, Ur, Jr, qr, Gr, Ce, wn, Cn, Tn, Yr, Xr, Qr, vn, Re, ei, En, Zr], i = we(), s = b(i, En);
    P(s, r, s), P(s, n43.domain, s);
    let o = we(), l = we(), a = we();
    P(i, n43.domain, o), P(i, n43.scheme, l), P(i, n43.slashscheme, a), P(o, r, s), P(o, n43.domain, o);
    let c = b(o, rt);
    b(s, rt, c), b(l, rt, c), b(a, rt, c);
    let u = b(s, Ie);
    P(u, r, s), P(u, n43.domain, s);
    let d = we();
    P(c, n43.domain, d), P(d, n43.domain, d);
    let f = b(d, Ie);
    P(f, n43.domain, d);
    let h = we(Vm);
    P(f, n43.tld, h), P(f, n43.utld, h), b(c, An, h);
    let p = b(d, Ce);
    b(p, Ce, p), P(p, n43.domain, d), P(h, n43.domain, d), b(h, Ie, f), b(h, Ce, p);
    let m = b(o, Ce), g = b(o, Ie);
    b(m, Ce, m), P(m, n43.domain, o), P(g, r, s), P(g, n43.domain, o);
    let y = we(vr);
    P(g, n43.tld, y), P(g, n43.utld, y), P(y, n43.domain, o), P(y, r, s), b(y, Ie, g), b(y, Ce, m), b(y, rt, c);
    let S = b(y, St), w = we(vr);
    P(S, n43.numeric, w);
    let M = we(vr), A = we();
    P(M, e, M), P(M, t, A), P(A, e, M), P(A, t, A), b(y, Re, M), b(w, Re, M);
    let I = b(l, St), v = b(a, St), L = b(v, Re), z = b(L, Re);
    P(l, n43.domain, o), b(l, Ie, g), b(l, Ce, m), P(a, n43.domain, o), b(a, Ie, g), b(a, Ce, m), P(I, n43.domain, M), b(I, Re, M), b(I, vn, M), P(z, n43.domain, M), P(z, e, M), b(z, Re, M);
    let q = [[wn, Cn], [Ar, Nr], [Or, Ir], [Rr, Dr], [Pr, Lr], [zr, Br], [Fr, Hr], [$r, _r]];
    for (let Le = 0; Le < q.length; Le++) {
      let [Te, ne] = q[Le], G = b(M, Te);
      b(A, Te, G);
      let W = we(vr);
      P(G, e, W);
      let Tt = we();
      P(G, t, Tt), b(G, ne, M), P(W, e, W), P(W, t, Tt), P(Tt, e, W), P(Tt, t, Tt), b(W, ne, M), b(Tt, ne, M);
    }
    return b(i, An, y), b(i, io, jm), { start: i, tokens: au };
  }
  function Km(n43, e, t) {
    let r = t.length, i = 0, s = [], o = [];
    for (; i < r; ) {
      let l = n43, a = null, c = null, u = 0, d = null, f = -1;
      for (; i < r && !(a = l.go(t[i].t)); ) o.push(t[i++]);
      for (; i < r && (c = a || l.go(t[i].t)); ) a = null, l = c, l.accepts() ? (f = 0, d = l) : f >= 0 && f++, i++, u++;
      if (f < 0) i -= u, i < r && (o.push(t[i]), i++);
      else {
        o.length > 0 && (s.push(qs(nu, e, o)), o = []), i -= f, u -= f;
        let h = d.t, p = t.slice(i - u, i);
        s.push(qs(h, e, p));
      }
    }
    return o.length > 0 && s.push(qs(nu, e, o)), s;
  }
  function qs(n43, e, t) {
    let r = t[0].s, i = t[t.length - 1].e, s = e.slice(r, i);
    return new n43(s, t);
  }
  var Um = typeof console < "u" && console && console.warn || (() => {
  });
  var Jm = "until manual call of linkify.init(). Register all schemes and plugins before invoking linkify the first time.";
  var _ = { scanner: null, parser: null, tokenQueue: [], pluginQueue: [], customSchemes: [], initialized: false };
  function du() {
    return me.groups = {}, _.scanner = null, _.parser = null, _.tokenQueue = [], _.pluginQueue = [], _.customSchemes = [], _.initialized = false, _;
  }
  function uo(n43, e = false) {
    if (_.initialized && Um(`linkifyjs: already initialized - will not register custom scheme "${n43}" ${Jm}`), !/^[0-9a-z]+(-[0-9a-z]+)*$/.test(n43)) throw new Error(`linkifyjs: incorrect scheme format.
1. Must only contain digits, lowercase ASCII letters or "-"
2. Cannot start or end with "-"
3. "-" cannot repeat`);
    _.customSchemes.push([n43, e]);
  }
  function qm() {
    _.scanner = $m(_.customSchemes);
    for (let n43 = 0; n43 < _.tokenQueue.length; n43++) _.tokenQueue[n43][1]({ scanner: _.scanner });
    _.parser = Wm(_.scanner.tokens);
    for (let n43 = 0; n43 < _.pluginQueue.length; n43++) _.pluginQueue[n43][1]({ scanner: _.scanner, parser: _.parser });
    return _.initialized = true, _;
  }
  function ni(n43) {
    return _.initialized || qm(), Km(_.parser.start, n43, cu(_.scanner.start, n43));
  }
  ni.scan = cu;
  function ri(n43, e = null, t = null) {
    if (e && typeof e == "object") {
      if (t) throw Error(`linkifyjs: Invalid link type ${e}; must be a string`);
      t = e, e = null;
    }
    let r = new co(t), i = ni(n43), s = [];
    for (let o = 0; o < i.length; o++) {
      let l = i[o];
      l.isLink && (!e || l.t === e) && r.check(l) && s.push(l.toFormattedObject(r));
    }
    return s;
  }
  var fo = "[\0- \xA0\u1680\u180E\u2000-\u2029\u205F\u3000]";
  var Gm = new RegExp(fo);
  var Ym = new RegExp(`${fo}$`);
  var Xm = new RegExp(fo, "g");
  function Qm(n43) {
    return n43.length === 1 ? n43[0].isLink : n43.length === 3 && n43[1].isLink ? ["()", "[]"].includes(n43[0].value + n43[2].value) : false;
  }
  function Zm(n43) {
    return new O({ key: new R("autolink"), appendTransaction: (e, t, r) => {
      let i = e.some((c) => c.docChanged) && !t.doc.eq(r.doc), s = e.some((c) => c.getMeta("preventAutolink"));
      if (!i || s) return;
      let { tr: o } = r, l = Ps(t.doc, [...e]);
      if (Fs(l).forEach(({ newRange: c }) => {
        let u = pc(r.doc, c, (h) => h.isTextblock), d, f;
        if (u.length > 1) d = u[0], f = r.doc.textBetween(d.pos, d.pos + d.node.nodeSize, void 0, " ");
        else if (u.length) {
          let h = r.doc.textBetween(c.from, c.to, " ", " ");
          if (!Ym.test(h)) return;
          d = u[0], f = r.doc.textBetween(d.pos, c.to, void 0, " ");
        }
        if (d && f) {
          let h = f.split(Gm).filter(Boolean);
          if (h.length <= 0) return false;
          let p = h[h.length - 1], m = d.pos + f.lastIndexOf(p);
          if (!p) return false;
          let g = ni(p).map((y) => y.toObject(n43.defaultProtocol));
          if (!Qm(g)) return false;
          g.filter((y) => y.isLink).map((y) => ({ ...y, from: m + y.start + 1, to: m + y.end + 1 })).filter((y) => r.schema.marks.code ? !r.doc.rangeHasMark(y.from, y.to, r.schema.marks.code) : true).filter((y) => n43.validate(y.value)).filter((y) => n43.shouldAutoLink(y.value)).forEach((y) => {
            br(y.from, y.to, r.doc).some((S) => S.mark.type === n43.type) || o.addMark(y.from, y.to, n43.type.create({ href: y.href }));
          });
        }
      }), !!o.steps.length) return o;
    } });
  }
  function eg(n43) {
    return new O({ key: new R("handleClickLink"), props: { handleClick: (e, t, r) => {
      var i, s;
      if (r.button !== 0 || !e.editable) return false;
      let o = null;
      if (r.target instanceof HTMLAnchorElement) o = r.target;
      else {
        let a = r.target;
        if (!a) return false;
        let c = n43.editor.view.dom;
        o = a.closest("a"), o && !c.contains(o) && (o = null);
      }
      if (!o) return false;
      let l = false;
      if (n43.enableClickSelection && (l = n43.editor.commands.extendMarkRange(n43.type.name)), n43.openOnClick) {
        let a = Bs(e.state, n43.type.name), c = (i = o.href) != null ? i : a.href, u = (s = o.target) != null ? s : a.target;
        c && (window.open(c, u), l = true);
      }
      return l;
    } } });
  }
  function tg(n43) {
    return new O({ key: new R("handlePasteLink"), props: { handlePaste: (e, t, r) => {
      let { shouldAutoLink: i } = n43, { state: s } = e, { selection: o } = s, { empty: l } = o;
      if (l) return false;
      let a = "";
      r.content.forEach((u) => {
        a += u.textContent;
      });
      let c = ri(a, { defaultProtocol: n43.defaultProtocol }).find((u) => u.isLink && u.value === a);
      return !a || !c || i !== void 0 && !i(c.value) ? false : n43.editor.commands.setMark(n43.type, { href: c.href });
    } } });
  }
  function Mt(n43, e) {
    let t = ["http", "https", "ftp", "ftps", "mailto", "tel", "callto", "sms", "cid", "xmpp"];
    return e && e.forEach((r) => {
      let i = typeof r == "string" ? r : r.scheme;
      i && t.push(i);
    }), !n43 || n43.replace(Xm, "").match(new RegExp(`^(?:(?:${t.join("|")}):|[^a-z]|[a-z0-9+.-]+(?:[^a-z+.-:]|$))`, "i"));
  }
  var fu = de.create({ name: "link", priority: 1e3, keepOnSplit: false, exitable: true, onCreate() {
    this.options.validate && !this.options.shouldAutoLink && (this.options.shouldAutoLink = this.options.validate, console.warn("The `validate` option is deprecated. Rename to the `shouldAutoLink` option instead.")), this.options.protocols.forEach((n43) => {
      if (typeof n43 == "string") {
        uo(n43);
        return;
      }
      uo(n43.scheme, n43.optionalSlashes);
    });
  }, onDestroy() {
    du();
  }, inclusive() {
    return this.options.autolink;
  }, addOptions() {
    return { openOnClick: true, enableClickSelection: false, linkOnPaste: true, autolink: true, protocols: [], defaultProtocol: "http", HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow", class: null }, isAllowedUri: (n43, e) => !!Mt(n43, e.protocols), validate: (n43) => !!n43, shouldAutoLink: (n43) => {
      let e = /^[a-z][a-z0-9+.-]*:\/\//i.test(n43), t = /^[a-z][a-z0-9+.-]*:/i.test(n43);
      if (e || t && !n43.includes("@")) return true;
      let i = (n43.includes("@") ? n43.split("@").pop() : n43).split(/[/?#:]/)[0];
      return !(/^\d{1,3}(\.\d{1,3}){3}$/.test(i) || !/\./.test(i));
    } };
  }, addAttributes() {
    return { href: { default: null, parseHTML(n43) {
      return n43.getAttribute("href");
    } }, target: { default: this.options.HTMLAttributes.target }, rel: { default: this.options.HTMLAttributes.rel }, class: { default: this.options.HTMLAttributes.class }, title: { default: null } };
  }, parseHTML() {
    return [{ tag: "a[href]", getAttrs: (n43) => {
      let e = n43.getAttribute("href");
      return !e || !this.options.isAllowedUri(e, { defaultValidate: (t) => !!Mt(t, this.options.protocols), protocols: this.options.protocols, defaultProtocol: this.options.defaultProtocol }) ? false : null;
    } }];
  }, renderHTML({ HTMLAttributes: n43 }) {
    return this.options.isAllowedUri(n43.href, { defaultValidate: (e) => !!Mt(e, this.options.protocols), protocols: this.options.protocols, defaultProtocol: this.options.defaultProtocol }) ? ["a", D(this.options.HTMLAttributes, n43), 0] : ["a", D(this.options.HTMLAttributes, { ...n43, href: "" }), 0];
  }, markdownTokenName: "link", parseMarkdown: (n43, e) => e.applyMark("link", e.parseInline(n43.tokens || []), { href: n43.href, title: n43.title || null }), renderMarkdown: (n43, e) => {
    var t, r, i, s;
    let o = (r = (t = n43.attrs) == null ? void 0 : t.href) != null ? r : "", l = (s = (i = n43.attrs) == null ? void 0 : i.title) != null ? s : "", a = e.renderChildren(n43);
    return l ? `[${a}](${o} "${l}")` : `[${a}](${o})`;
  }, addCommands() {
    return { setLink: (n43) => ({ chain: e }) => {
      let { href: t } = n43;
      return this.options.isAllowedUri(t, { defaultValidate: (r) => !!Mt(r, this.options.protocols), protocols: this.options.protocols, defaultProtocol: this.options.defaultProtocol }) ? e().setMark(this.name, n43).setMeta("preventAutolink", true).run() : false;
    }, toggleLink: (n43) => ({ chain: e }) => {
      let { href: t } = n43 || {};
      return t && !this.options.isAllowedUri(t, { defaultValidate: (r) => !!Mt(r, this.options.protocols), protocols: this.options.protocols, defaultProtocol: this.options.defaultProtocol }) ? false : e().toggleMark(this.name, n43, { extendEmptyMarkRange: true }).setMeta("preventAutolink", true).run();
    }, unsetLink: () => ({ chain: n43 }) => n43().unsetMark(this.name, { extendEmptyMarkRange: true }).setMeta("preventAutolink", true).run() };
  }, addPasteRules() {
    return [pe({ find: (n43) => {
      let e = [];
      if (n43) {
        let { protocols: t, defaultProtocol: r } = this.options, i = ri(n43).filter((s) => s.isLink && this.options.isAllowedUri(s.value, { defaultValidate: (o) => !!Mt(o, t), protocols: t, defaultProtocol: r }));
        i.length && i.forEach((s) => {
          this.options.shouldAutoLink(s.value) && e.push({ text: s.value, data: { href: s.href }, index: s.start });
        });
      }
      return e;
    }, type: this.type, getAttributes: (n43) => {
      var e;
      return { href: (e = n43.data) == null ? void 0 : e.href };
    } })];
  }, addProseMirrorPlugins() {
    let n43 = [], { protocols: e, defaultProtocol: t } = this.options;
    return this.options.autolink && n43.push(Zm({ type: this.type, defaultProtocol: this.options.defaultProtocol, validate: (r) => this.options.isAllowedUri(r, { defaultValidate: (i) => !!Mt(i, e), protocols: e, defaultProtocol: t }), shouldAutoLink: this.options.shouldAutoLink })), n43.push(eg({ type: this.type, editor: this.editor, openOnClick: this.options.openOnClick === "whenNotEditable" ? true : this.options.openOnClick, enableClickSelection: this.options.enableClickSelection })), this.options.linkOnPaste && n43.push(tg({ editor: this.editor, defaultProtocol: this.options.defaultProtocol, type: this.type, shouldAutoLink: this.options.shouldAutoLink })), n43;
  } });
  var ng = Object.defineProperty;
  var rg = (n43, e) => {
    for (var t in e) ng(n43, t, { get: e[t], enumerable: true });
  };
  var ig = "listItem";
  var hu = "textStyle";
  var pu = /^\s*([-+*])\s$/;
  var mo = $.create({ name: "bulletList", addOptions() {
    return { itemTypeName: "listItem", HTMLAttributes: {}, keepMarks: false, keepAttributes: false };
  }, group: "block list", content() {
    return `${this.options.itemTypeName}+`;
  }, parseHTML() {
    return [{ tag: "ul" }];
  }, renderHTML({ HTMLAttributes: n43 }) {
    return ["ul", D(this.options.HTMLAttributes, n43), 0];
  }, markdownTokenName: "list", parseMarkdown: (n43, e) => n43.type !== "list" || n43.ordered ? [] : { type: "bulletList", content: n43.items ? e.parseChildren(n43.items) : [] }, renderMarkdown: (n43, e) => n43.content ? e.renderChildren(n43.content, `
`) : "", markdownOptions: { indentsContent: true }, addCommands() {
    return { toggleBulletList: () => ({ commands: n43, chain: e }) => this.options.keepAttributes ? e().toggleList(this.name, this.options.itemTypeName, this.options.keepMarks).updateAttributes(ig, this.editor.getAttributes(hu)).run() : n43.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks) };
  }, addKeyboardShortcuts() {
    return { "Mod-Shift-8": () => this.editor.commands.toggleBulletList() };
  }, addInputRules() {
    let n43 = Oe({ find: pu, type: this.type });
    return (this.options.keepMarks || this.options.keepAttributes) && (n43 = Oe({ find: pu, type: this.type, keepMarks: this.options.keepMarks, keepAttributes: this.options.keepAttributes, getAttributes: () => this.editor.getAttributes(hu), editor: this.editor })), [n43];
  } });
  function sg(n43) {
    var e, t;
    let r = (e = n43.tokens) == null ? void 0 : e[0];
    return !!(n43.text && ((t = n43.tokens) == null ? void 0 : t.length) === 1 && r?.type === "list" && r.ordered && r.raw === n43.text);
  }
  function og(n43, e) {
    return e.tokenizeInline ? e.parseInline(e.tokenizeInline(n43)) : e.parseInline([{ type: "text", raw: n43, text: n43 }]);
  }
  var go = $.create({ name: "listItem", addOptions() {
    return { HTMLAttributes: {}, bulletListTypeName: "bulletList", orderedListTypeName: "orderedList" };
  }, content: "paragraph block*", defining: true, parseHTML() {
    return [{ tag: "li" }];
  }, renderHTML({ HTMLAttributes: n43 }) {
    return ["li", D(this.options.HTMLAttributes, n43), 0];
  }, markdownTokenName: "list_item", parseMarkdown: (n43, e) => {
    var t;
    if (n43.type !== "list_item") return [];
    let r = (t = e.parseBlockChildren) != null ? t : e.parseChildren, i = [];
    if (n43.tokens && n43.tokens.length > 0) {
      if (sg(n43)) return { type: "listItem", content: [{ type: "paragraph", content: og(n43.text || "", e) }] };
      if (n43.tokens.some((o) => o.type === "paragraph")) i = r(n43.tokens);
      else {
        let o = n43.tokens[0];
        if (o && o.type === "text" && o.tokens && o.tokens.length > 0) {
          if (i = [{ type: "paragraph", content: e.parseInline(o.tokens) }], n43.tokens.length > 1) {
            let a = n43.tokens.slice(1), c = r(a);
            i.push(...c);
          }
        } else i = r(n43.tokens);
      }
    }
    return i.length === 0 && (i = [{ type: "paragraph", content: [] }]), { type: "listItem", content: i };
  }, renderMarkdown: (n43, e, t) => bn(n43, e, (r) => {
    var i, s;
    return r.parentType === "bulletList" ? "- " : r.parentType === "orderedList" ? `${(((s = (i = r.meta) == null ? void 0 : i.parentAttrs) == null ? void 0 : s.start) || 1) + r.index}. ` : "- ";
  }, t), addKeyboardShortcuts() {
    return { Enter: () => this.editor.commands.splitListItem(this.name), Tab: () => this.editor.commands.sinkListItem(this.name), "Shift-Tab": () => this.editor.commands.liftListItem(this.name) };
  } });
  var lg = {};
  rg(lg, { findListItemPos: () => On, getNextListDepth: () => yo, handleBackspace: () => ho, handleDelete: () => po, hasListBefore: () => ku, hasListItemAfter: () => ag, hasListItemBefore: () => bu, listItemHasSubList: () => xu, nextListIsDeeper: () => Su, nextListIsHigher: () => Mu });
  var On = (n43, e) => {
    let { $from: t } = e.selection, r = V(n43, e.schema), i = null, s = t.depth, o = t.pos, l = null;
    for (; s > 0 && l === null; ) i = t.node(s), i.type === r ? l = s : (s -= 1, o -= 1);
    return l === null ? null : { $pos: e.doc.resolve(o), depth: l };
  };
  var yo = (n43, e) => {
    let t = On(n43, e);
    if (!t) return false;
    let [, r] = xc(e, n43, t.$pos.pos + 4);
    return r;
  };
  var ku = (n43, e, t) => {
    let { $anchor: r } = n43.selection, i = Math.max(0, r.pos - 2), s = n43.doc.resolve(i).node();
    return !(!s || !t.includes(s.type.name));
  };
  var bu = (n43, e) => {
    var t;
    let { $anchor: r } = e.selection, i = e.doc.resolve(r.pos - 2);
    return !(i.index() === 0 || ((t = i.nodeBefore) == null ? void 0 : t.type.name) !== n43);
  };
  var xu = (n43, e, t) => {
    if (!t) return false;
    let r = V(n43, e.schema), i = false;
    return t.descendants((s) => {
      s.type === r && (i = true);
    }), i;
  };
  var ho = (n43, e, t) => {
    if (n43.commands.undoInputRule()) return true;
    if (n43.state.selection.from !== n43.state.selection.to) return false;
    if (!Ne(n43.state, e) && ku(n43.state, e, t)) {
      let { $anchor: l } = n43.state.selection, a = n43.state.doc.resolve(l.before() - 1), c = [];
      a.node().descendants((f, h) => {
        f.type.name === e && c.push({ node: f, pos: h });
      });
      let u = c.at(-1);
      if (!u) return false;
      let d = n43.state.doc.resolve(a.start() + u.pos + 1);
      return n43.chain().cut({ from: l.start() - 1, to: l.end() + 1 }, d.end()).joinForward().run();
    }
    if (!Ne(n43.state, e) || !Mc(n43.state)) return false;
    let r = On(e, n43.state);
    if (!r) return false;
    let s = n43.state.doc.resolve(r.$pos.pos - 2).node(r.depth), o = xu(e, n43.state, s);
    return bu(e, n43.state) && !o ? n43.commands.joinItemBackward() : n43.chain().liftListItem(e).run();
  };
  var Su = (n43, e) => {
    let t = yo(n43, e), r = On(n43, e);
    return !r || !t ? false : t > r.depth;
  };
  var Mu = (n43, e) => {
    let t = yo(n43, e), r = On(n43, e);
    return !r || !t ? false : t < r.depth;
  };
  var po = (n43, e) => {
    if (!Ne(n43.state, e) || !Sc(n43.state, e)) return false;
    let { selection: t } = n43.state, { $from: r, $to: i } = t;
    return !t.empty && r.sameParent(i) ? false : Su(e, n43.state) ? n43.chain().focus(n43.state.selection.from + 4).lift(e).joinBackward().run() : Mu(e, n43.state) ? n43.chain().joinForward().joinBackward().run() : n43.commands.joinItemForward();
  };
  var ag = (n43, e) => {
    var t;
    let { $anchor: r } = e.selection, i = e.doc.resolve(r.pos - r.parentOffset - 2);
    return !(i.index() === i.parent.childCount - 1 || ((t = i.nodeAfter) == null ? void 0 : t.type.name) !== n43);
  };
  var ko = B.create({ name: "listKeymap", addOptions() {
    return { listTypes: [{ itemName: "listItem", wrapperNames: ["bulletList", "orderedList"] }, { itemName: "taskItem", wrapperNames: ["taskList"] }] };
  }, addKeyboardShortcuts() {
    return { Delete: ({ editor: n43 }) => {
      let e = false;
      return this.options.listTypes.forEach(({ itemName: t }) => {
        n43.state.schema.nodes[t] !== void 0 && po(n43, t) && (e = true);
      }), e;
    }, "Mod-Delete": ({ editor: n43 }) => {
      let e = false;
      return this.options.listTypes.forEach(({ itemName: t }) => {
        n43.state.schema.nodes[t] !== void 0 && po(n43, t) && (e = true);
      }), e;
    }, Backspace: ({ editor: n43 }) => {
      let e = false;
      return this.options.listTypes.forEach(({ itemName: t, wrapperNames: r }) => {
        n43.state.schema.nodes[t] !== void 0 && ho(n43, t, r) && (e = true);
      }), e;
    }, "Mod-Backspace": ({ editor: n43 }) => {
      let e = false;
      return this.options.listTypes.forEach(({ itemName: t, wrapperNames: r }) => {
        n43.state.schema.nodes[t] !== void 0 && ho(n43, t, r) && (e = true);
      }), e;
    } };
  } });
  var mu = /^(\s*)(\d+)\.\s+(.*)$/;
  var cg = /^\s/;
  function ug(n43) {
    let e = n43.trimStart();
    return /^[-+*]\s+/.test(e) || /^\d+\.\s+/.test(e) || /^>\s?/.test(e) || /^```/.test(e) || /^~~~/.test(e);
  }
  function dg(n43) {
    let e = [], t = [], r = false;
    return n43.forEach((i) => {
      if (r) {
        t.push(i);
        return;
      }
      if (i.trim() === "") {
        r = true, t.push(i);
        return;
      }
      if (e.length > 0 && ug(i)) {
        r = true, t.push(i);
        return;
      }
      e.push(i);
    }), { paragraphLines: e, blockLines: t };
  }
  function fg(n43) {
    let e = [], t = 0, r = 0;
    for (; t < n43.length; ) {
      let i = n43[t], s = i.match(mu);
      if (!s) break;
      let [, o, l, a] = s, c = o.length, u = [a], d = t + 1, f = [i], h = false;
      for (; d < n43.length; ) {
        let p = n43[d];
        if (p.match(mu)) break;
        if (p.trim() === "") f.push(p), u.push(""), h = true, d += 1;
        else if (p.match(cg)) f.push(p), u.push(p.slice(c + 2)), d += 1;
        else {
          if (h) break;
          f.push(p), u.push(p), d += 1;
        }
      }
      e.push({ indent: c, number: parseInt(l, 10), content: u.join(`
`).trim(), contentLines: u, raw: f.join(`
`) }), r = d, t = d;
    }
    return [e, r];
  }
  function wu(n43, e, t) {
    let r = [], i = 0;
    for (; i < n43.length; ) {
      let s = n43[i];
      if (s.indent === e) {
        let { paragraphLines: o, blockLines: l } = dg(s.contentLines), a = o.join(`
`).trim(), c = [];
        a && c.push({ type: "paragraph", raw: a, tokens: t.inlineTokens(a) });
        let u = l.join(`
`).trim();
        if (u) {
          let h = t.blockTokens(u);
          c.push(...h);
        }
        let d = i + 1, f = [];
        for (; d < n43.length && n43[d].indent > e; ) f.push(n43[d]), d += 1;
        if (f.length > 0) {
          let h = Math.min(...f.map((m) => m.indent)), p = wu(f, h, t);
          c.push({ type: "list", ordered: true, start: f[0].number, items: p, raw: f.map((m) => m.raw).join(`
`) });
        }
        r.push({ type: "list_item", raw: s.raw, tokens: c }), i = d;
      } else i += 1;
    }
    return r;
  }
  function hg(n43, e) {
    return n43.map((t) => {
      if (t.type !== "list_item") return e.parseChildren([t])[0];
      let r = [];
      return t.tokens && t.tokens.length > 0 && t.tokens.forEach((i) => {
        if (i.type === "paragraph" || i.type === "list" || i.type === "blockquote" || i.type === "code") r.push(...e.parseChildren([i]));
        else if (i.type === "text" && i.tokens) {
          let s = e.parseChildren([i]);
          r.push({ type: "paragraph", content: s });
        } else {
          let s = e.parseChildren([i]);
          s.length > 0 && r.push(...s);
        }
      }), { type: "listItem", content: r };
    });
  }
  var pg = "listItem";
  var gu = "textStyle";
  var yu = /^(\d+)\.\s$/;
  var bo = $.create({ name: "orderedList", addOptions() {
    return { itemTypeName: "listItem", HTMLAttributes: {}, keepMarks: false, keepAttributes: false };
  }, group: "block list", content() {
    return `${this.options.itemTypeName}+`;
  }, addAttributes() {
    return { start: { default: 1, parseHTML: (n43) => n43.hasAttribute("start") ? parseInt(n43.getAttribute("start") || "", 10) : 1 }, type: { default: null, parseHTML: (n43) => n43.getAttribute("type") } };
  }, parseHTML() {
    return [{ tag: "ol" }];
  }, renderHTML({ HTMLAttributes: n43 }) {
    let { start: e, ...t } = n43;
    return e === 1 ? ["ol", D(this.options.HTMLAttributes, t), 0] : ["ol", D(this.options.HTMLAttributes, n43), 0];
  }, markdownTokenName: "list", parseMarkdown: (n43, e) => {
    if (n43.type !== "list" || !n43.ordered) return [];
    let t = n43.start || 1, r = n43.items ? hg(n43.items, e) : [];
    return t !== 1 ? { type: "orderedList", attrs: { start: t }, content: r } : { type: "orderedList", content: r };
  }, renderMarkdown: (n43, e) => n43.content ? e.renderChildren(n43.content, `
`) : "", markdownTokenizer: { name: "orderedList", level: "block", start: (n43) => {
    let e = n43.match(/^(\s*)(\d+)\.\s+/), t = e?.index;
    return t !== void 0 ? t : -1;
  }, tokenize: (n43, e, t) => {
    var r;
    let i = n43.split(`
`), [s, o] = fg(i);
    if (s.length === 0) return;
    let l = wu(s, 0, t);
    return l.length === 0 ? void 0 : { type: "list", ordered: true, start: ((r = s[0]) == null ? void 0 : r.number) || 1, items: l, raw: i.slice(0, o).join(`
`) };
  } }, markdownOptions: { indentsContent: true }, addCommands() {
    return { toggleOrderedList: () => ({ commands: n43, chain: e }) => this.options.keepAttributes ? e().toggleList(this.name, this.options.itemTypeName, this.options.keepMarks).updateAttributes(pg, this.editor.getAttributes(gu)).run() : n43.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks) };
  }, addKeyboardShortcuts() {
    return { "Mod-Shift-7": () => this.editor.commands.toggleOrderedList() };
  }, addInputRules() {
    let n43 = Oe({ find: yu, type: this.type, getAttributes: (e) => ({ start: +e[1] }), joinPredicate: (e, t) => t.childCount + t.attrs.start === +e[1] });
    return (this.options.keepMarks || this.options.keepAttributes) && (n43 = Oe({ find: yu, type: this.type, keepMarks: this.options.keepMarks, keepAttributes: this.options.keepAttributes, getAttributes: (e) => ({ start: +e[1], ...this.editor.getAttributes(gu) }), joinPredicate: (e, t) => t.childCount + t.attrs.start === +e[1], editor: this.editor })), [n43];
  } });
  var mg = /^\s*(\[([( |x])?\])\s$/;
  var ii = $.create({ name: "taskItem", addOptions() {
    return { nested: false, HTMLAttributes: {}, taskListTypeName: "taskList", a11y: void 0 };
  }, content() {
    return this.options.nested ? "paragraph block*" : "paragraph+";
  }, defining: true, addAttributes() {
    return { checked: { default: false, keepOnSplit: false, parseHTML: (n43) => {
      let e = n43.getAttribute("data-checked");
      return e === "" || e === "true";
    }, renderHTML: (n43) => ({ "data-checked": n43.checked }) } };
  }, parseHTML() {
    return [{ tag: `li[data-type="${this.name}"]`, priority: 51 }];
  }, renderHTML({ node: n43, HTMLAttributes: e }) {
    return ["li", D(this.options.HTMLAttributes, e, { "data-type": this.name }), ["label", ["input", { type: "checkbox", checked: n43.attrs.checked ? "checked" : null }], ["span"]], ["div", 0]];
  }, parseMarkdown: (n43, e) => {
    let t = [];
    if (n43.tokens && n43.tokens.length > 0 ? t.push(e.createNode("paragraph", {}, e.parseInline(n43.tokens))) : n43.text ? t.push(e.createNode("paragraph", {}, [e.createNode("text", { text: n43.text })])) : t.push(e.createNode("paragraph", {}, [])), n43.nestedTokens && n43.nestedTokens.length > 0) {
      let r = e.parseChildren(n43.nestedTokens);
      t.push(...r);
    }
    return e.createNode("taskItem", { checked: n43.checked || false }, t);
  }, renderMarkdown: (n43, e) => {
    var t;
    let i = `- [${(t = n43.attrs) != null && t.checked ? "x" : " "}] `;
    return bn(n43, e, i);
  }, addKeyboardShortcuts() {
    let n43 = { Enter: () => this.editor.commands.splitListItem(this.name), "Shift-Tab": () => this.editor.commands.liftListItem(this.name) };
    return this.options.nested ? { ...n43, Tab: () => this.editor.commands.sinkListItem(this.name) } : n43;
  }, addNodeView() {
    return ({ node: n43, HTMLAttributes: e, getPos: t, editor: r }) => {
      let i = document.createElement("li"), s = document.createElement("label"), o = document.createElement("span"), l = document.createElement("input"), a = document.createElement("div"), c = (d) => {
        var f, h;
        l.ariaLabel = ((h = (f = this.options.a11y) == null ? void 0 : f.checkboxLabel) == null ? void 0 : h.call(f, d, l.checked)) || `Task item checkbox for ${d.textContent || "empty task item"}`;
      };
      c(n43), s.contentEditable = "false", l.type = "checkbox", l.addEventListener("mousedown", (d) => d.preventDefault()), l.addEventListener("change", (d) => {
        if (!r.isEditable && !this.options.onReadOnlyChecked) {
          l.checked = !l.checked;
          return;
        }
        let { checked: f } = d.target;
        r.isEditable && typeof t == "function" && r.chain().focus(void 0, { scrollIntoView: false }).command(({ tr: h }) => {
          let p = t();
          if (typeof p != "number") return false;
          let m = h.doc.nodeAt(p);
          return h.setNodeMarkup(p, void 0, { ...m?.attrs, checked: f }), true;
        }).run(), !r.isEditable && this.options.onReadOnlyChecked && (this.options.onReadOnlyChecked(n43, f) || (l.checked = !l.checked));
      }), Object.entries(this.options.HTMLAttributes).forEach(([d, f]) => {
        i.setAttribute(d, f);
      }), i.dataset.checked = n43.attrs.checked, l.checked = n43.attrs.checked, s.append(l, o), i.append(s, a), Object.entries(e).forEach(([d, f]) => {
        i.setAttribute(d, f);
      });
      let u = new Set(Object.keys(e));
      return { dom: i, contentDOM: a, update: (d) => {
        if (d.type !== this.type) return false;
        i.dataset.checked = d.attrs.checked, l.checked = d.attrs.checked, c(d);
        let f = r.extensionManager.attributes, h = Vt(d, f), p = new Set(Object.keys(h)), m = this.options.HTMLAttributes;
        return u.forEach((g) => {
          p.has(g) || (g in m ? i.setAttribute(g, m[g]) : i.removeAttribute(g));
        }), Object.entries(h).forEach(([g, y]) => {
          y == null ? g in m ? i.setAttribute(g, m[g]) : i.removeAttribute(g) : i.setAttribute(g, y);
        }), u = p, true;
      } };
    };
  }, addInputRules() {
    return [Oe({ find: mg, type: this.type, getAttributes: (n43) => ({ checked: n43[n43.length - 1] === "x" }) })];
  } });
  var si = $.create({ name: "taskList", addOptions() {
    return { itemTypeName: "taskItem", HTMLAttributes: {} };
  }, group: "block list", content() {
    return `${this.options.itemTypeName}+`;
  }, parseHTML() {
    return [{ tag: `ul[data-type="${this.name}"]`, priority: 51 }];
  }, renderHTML({ HTMLAttributes: n43 }) {
    return ["ul", D(this.options.HTMLAttributes, n43, { "data-type": this.name }), 0];
  }, parseMarkdown: (n43, e) => e.createNode("taskList", {}, e.parseChildren(n43.items || [])), renderMarkdown: (n43, e) => n43.content ? e.renderChildren(n43.content, `
`) : "", markdownTokenizer: { name: "taskList", level: "block", start(n43) {
    var e;
    let t = (e = n43.match(/^\s*[-+*]\s+\[([ xX])\]\s+/)) == null ? void 0 : e.index;
    return t !== void 0 ? t : -1;
  }, tokenize(n43, e, t) {
    let r = (s) => {
      let o = wr(s, { itemPattern: /^(\s*)([-+*])\s+\[([ xX])\]\s+(.*)$/, extractItemData: (l) => ({ indentLevel: l[1].length, mainContent: l[4], checked: l[3].toLowerCase() === "x" }), createToken: (l, a) => ({ type: "taskItem", raw: "", mainContent: l.mainContent, indentLevel: l.indentLevel, checked: l.checked, text: l.mainContent, tokens: t.inlineTokens(l.mainContent), nestedTokens: a }), customNestedParser: r }, t);
      return o ? [{ type: "taskList", raw: o.raw, items: o.items }] : t.blockTokens(s);
    }, i = wr(n43, { itemPattern: /^(\s*)([-+*])\s+\[([ xX])\]\s+(.*)$/, extractItemData: (s) => ({ indentLevel: s[1].length, mainContent: s[4], checked: s[3].toLowerCase() === "x" }), createToken: (s, o) => ({ type: "taskItem", raw: "", mainContent: s.mainContent, indentLevel: s.indentLevel, checked: s.checked, text: s.mainContent, tokens: t.inlineTokens(s.mainContent), nestedTokens: o }), customNestedParser: r }, t);
    if (i) return { type: "taskList", raw: i.raw, items: i.items };
  } }, markdownOptions: { indentsContent: true }, addCommands() {
    return { toggleTaskList: () => ({ commands: n43 }) => n43.toggleList(this.name, this.options.itemTypeName) };
  }, addKeyboardShortcuts() {
    return { "Mod-Shift-9": () => this.editor.commands.toggleTaskList() };
  } });
  var Hk = B.create({ name: "listKit", addExtensions() {
    let n43 = [];
    return this.options.bulletList !== false && n43.push(mo.configure(this.options.bulletList)), this.options.listItem !== false && n43.push(go.configure(this.options.listItem)), this.options.listKeymap !== false && n43.push(ko.configure(this.options.listKeymap)), this.options.orderedList !== false && n43.push(bo.configure(this.options.orderedList)), this.options.taskItem !== false && n43.push(ii.configure(this.options.taskItem)), this.options.taskList !== false && n43.push(si.configure(this.options.taskList)), n43;
  } });
  var oi = "&nbsp;";
  var xo = "\xA0";
  var Cu = $.create({ name: "paragraph", priority: 1e3, addOptions() {
    return { HTMLAttributes: {} };
  }, group: "block", content: "inline*", parseHTML() {
    return [{ tag: "p" }];
  }, renderHTML({ HTMLAttributes: n43 }) {
    return ["p", D(this.options.HTMLAttributes, n43), 0];
  }, parseMarkdown: (n43, e) => {
    let t = n43.tokens || [];
    if (t.length === 1 && t[0].type === "image") return e.parseChildren([t[0]]);
    let r = e.parseInline(t);
    return t.length === 1 && t[0].type === "text" && (t[0].raw === oi || t[0].text === oi || t[0].raw === xo || t[0].text === xo) && r.length === 1 && r[0].type === "text" && (r[0].text === oi || r[0].text === xo) ? e.createNode("paragraph", void 0, []) : e.createNode("paragraph", void 0, r);
  }, renderMarkdown: (n43, e, t) => {
    var r, i;
    if (!n43) return "";
    let s = Array.isArray(n43.content) ? n43.content : [];
    if (s.length === 0) {
      let o = Array.isArray((r = t?.previousNode) == null ? void 0 : r.content) ? t.previousNode.content : [];
      return ((i = t?.previousNode) == null ? void 0 : i.type) === "paragraph" && o.length === 0 ? oi : "";
    }
    return e.renderChildren(s);
  }, addCommands() {
    return { setParagraph: () => ({ commands: n43 }) => n43.setNode(this.name) };
  }, addKeyboardShortcuts() {
    return { "Mod-Alt-0": () => this.editor.commands.setParagraph() };
  } });
  var gg = /(?:^|\s)(~~(?!\s+~~)((?:[^~]+))~~(?!\s+~~))$/;
  var yg = /(?:^|\s)(~~(?!\s+~~)((?:[^~]+))~~(?!\s+~~))/g;
  var Tu = de.create({ name: "strike", addOptions() {
    return { HTMLAttributes: {} };
  }, parseHTML() {
    return [{ tag: "s" }, { tag: "del" }, { tag: "strike" }, { style: "text-decoration", consuming: false, getAttrs: (n43) => n43.includes("line-through") ? {} : false }];
  }, renderHTML({ HTMLAttributes: n43 }) {
    return ["s", D(this.options.HTMLAttributes, n43), 0];
  }, markdownTokenName: "del", parseMarkdown: (n43, e) => e.applyMark("strike", e.parseInline(n43.tokens || [])), renderMarkdown: (n43, e) => `~~${e.renderChildren(n43)}~~`, addCommands() {
    return { setStrike: () => ({ commands: n43 }) => n43.setMark(this.name), toggleStrike: () => ({ commands: n43 }) => n43.toggleMark(this.name), unsetStrike: () => ({ commands: n43 }) => n43.unsetMark(this.name) };
  }, addKeyboardShortcuts() {
    return { "Mod-Shift-s": () => this.editor.commands.toggleStrike() };
  }, addInputRules() {
    return [Me({ find: gg, type: this.type })];
  }, addPasteRules() {
    return [pe({ find: yg, type: this.type })];
  } });
  var vu = $.create({ name: "text", group: "inline", parseMarkdown: (n43) => ({ type: "text", text: n43.text || "" }), renderMarkdown: (n43) => n43.text || "" });
  var So = de.create({ name: "underline", addOptions() {
    return { HTMLAttributes: {} };
  }, parseHTML() {
    return [{ tag: "u" }, { style: "text-decoration", consuming: false, getAttrs: (n43) => n43.includes("underline") ? {} : false }];
  }, renderHTML({ HTMLAttributes: n43 }) {
    return ["u", D(this.options.HTMLAttributes, n43), 0];
  }, parseMarkdown(n43, e) {
    return e.applyMark(this.name || "underline", e.parseInline(n43.tokens || []));
  }, renderMarkdown(n43, e) {
    return `++${e.renderChildren(n43)}++`;
  }, markdownTokenizer: { name: "underline", level: "inline", start(n43) {
    return n43.indexOf("++");
  }, tokenize(n43, e, t) {
    let i = /^(\+\+)([\s\S]+?)(\+\+)/.exec(n43);
    if (!i) return;
    let s = i[2].trim();
    return { type: "underline", raw: i[0], text: s, tokens: t.inlineTokens(s) };
  } }, addCommands() {
    return { setUnderline: () => ({ commands: n43 }) => n43.setMark(this.name), toggleUnderline: () => ({ commands: n43 }) => n43.toggleMark(this.name), unsetUnderline: () => ({ commands: n43 }) => n43.unsetMark(this.name) };
  }, addKeyboardShortcuts() {
    return { "Mod-u": () => this.editor.commands.toggleUnderline(), "Mod-U": () => this.editor.commands.toggleUnderline() };
  } });
  function Eu(n43 = {}) {
    return new O({ view(e) {
      return new Mo(e, n43);
    } });
  }
  var Mo = class {
    constructor(e, t) {
      var r;
      this.editorView = e, this.cursorPos = null, this.element = null, this.timeout = -1, this.width = (r = t.width) !== null && r !== void 0 ? r : 1, this.color = t.color === false ? void 0 : t.color || "black", this.class = t.class, this.handlers = ["dragover", "dragend", "drop", "dragleave"].map((i) => {
        let s = (o) => {
          this[i](o);
        };
        return e.dom.addEventListener(i, s), { name: i, handler: s };
      });
    }
    destroy() {
      this.handlers.forEach(({ name: e, handler: t }) => this.editorView.dom.removeEventListener(e, t));
    }
    update(e, t) {
      this.cursorPos != null && t.doc != e.state.doc && (this.cursorPos > e.state.doc.content.size ? this.setCursor(null) : this.updateOverlay());
    }
    setCursor(e) {
      e != this.cursorPos && (this.cursorPos = e, e == null ? (this.element.parentNode.removeChild(this.element), this.element = null) : this.updateOverlay());
    }
    updateOverlay() {
      let e = this.editorView.state.doc.resolve(this.cursorPos), t = !e.parent.inlineContent, r, i = this.editorView.dom, s = i.getBoundingClientRect(), o = s.width / i.offsetWidth, l = s.height / i.offsetHeight;
      if (t) {
        let d = e.nodeBefore, f = e.nodeAfter;
        if (d || f) {
          let h = this.editorView.nodeDOM(this.cursorPos - (d ? d.nodeSize : 0));
          if (h) {
            let p = h.getBoundingClientRect(), m = d ? p.bottom : p.top;
            d && f && (m = (m + this.editorView.nodeDOM(this.cursorPos).getBoundingClientRect().top) / 2);
            let g = this.width / 2 * l;
            r = { left: p.left, right: p.right, top: m - g, bottom: m + g };
          }
        }
      }
      if (!r) {
        let d = this.editorView.coordsAtPos(this.cursorPos), f = this.width / 2 * o;
        r = { left: d.left - f, right: d.left + f, top: d.top, bottom: d.bottom };
      }
      let a = this.editorView.dom.offsetParent;
      this.element || (this.element = a.appendChild(document.createElement("div")), this.class && (this.element.className = this.class), this.element.style.cssText = "position: absolute; z-index: 50; pointer-events: none;", this.color && (this.element.style.backgroundColor = this.color)), this.element.classList.toggle("prosemirror-dropcursor-block", t), this.element.classList.toggle("prosemirror-dropcursor-inline", !t);
      let c, u;
      if (!a || a == document.body && getComputedStyle(a).position == "static") c = -pageXOffset, u = -pageYOffset;
      else {
        let d = a.getBoundingClientRect(), f = d.width / a.offsetWidth, h = d.height / a.offsetHeight;
        c = d.left - a.scrollLeft * f, u = d.top - a.scrollTop * h;
      }
      this.element.style.left = (r.left - c) / o + "px", this.element.style.top = (r.top - u) / l + "px", this.element.style.width = (r.right - r.left) / o + "px", this.element.style.height = (r.bottom - r.top) / l + "px";
    }
    scheduleRemoval(e) {
      clearTimeout(this.timeout), this.timeout = setTimeout(() => this.setCursor(null), e);
    }
    dragover(e) {
      if (!this.editorView.editable) return;
      let t = this.editorView.posAtCoords({ left: e.clientX, top: e.clientY }), r = t && t.inside >= 0 && this.editorView.state.doc.nodeAt(t.inside), i = r && r.type.spec.disableDropCursor, s = typeof i == "function" ? i(this.editorView, t, e) : i;
      if (t && !s) {
        let o = t.pos;
        if (this.editorView.dragging && this.editorView.dragging.slice) {
          let l = jn(this.editorView.state.doc, o, this.editorView.dragging.slice);
          l != null && (o = l);
        }
        this.setCursor(o), this.scheduleRemoval(5e3);
      }
    }
    dragend() {
      this.scheduleRemoval(20);
    }
    drop() {
      this.scheduleRemoval(20);
    }
    dragleave(e) {
      this.editorView.dom.contains(e.relatedTarget) || this.setCursor(null);
    }
  };
  var le = class n39 extends N {
    constructor(e) {
      super(e, e);
    }
    map(e, t) {
      let r = e.resolve(t.map(this.head));
      return n39.valid(r) ? new n39(r) : N.near(r);
    }
    content() {
      return x.empty;
    }
    eq(e) {
      return e instanceof n39 && e.head == this.head;
    }
    toJSON() {
      return { type: "gapcursor", pos: this.head };
    }
    static fromJSON(e, t) {
      if (typeof t.pos != "number") throw new RangeError("Invalid input for GapCursor.fromJSON");
      return new n39(e.resolve(t.pos));
    }
    getBookmark() {
      return new wo(this.anchor);
    }
    static valid(e) {
      let t = e.parent;
      if (t.inlineContent || !kg(e) || !bg(e)) return false;
      let r = t.type.spec.allowGapCursor;
      if (r != null) return r;
      let i = t.contentMatchAt(e.index()).defaultType;
      return i && i.isTextblock;
    }
    static findGapCursorFrom(e, t, r = false) {
      e: for (; ; ) {
        if (!r && n39.valid(e)) return e;
        let i = e.pos, s = null;
        for (let o = e.depth; ; o--) {
          let l = e.node(o);
          if (t > 0 ? e.indexAfter(o) < l.childCount : e.index(o) > 0) {
            s = l.child(t > 0 ? e.indexAfter(o) : e.index(o) - 1);
            break;
          } else if (o == 0) return null;
          i += t;
          let a = e.doc.resolve(i);
          if (n39.valid(a)) return a;
        }
        for (; ; ) {
          let o = t > 0 ? s.firstChild : s.lastChild;
          if (!o) {
            if (s.isAtom && !s.isText && !C.isSelectable(s)) {
              e = e.doc.resolve(i + s.nodeSize * t), r = false;
              continue e;
            }
            break;
          }
          s = o, i += t;
          let l = e.doc.resolve(i);
          if (n39.valid(l)) return l;
        }
        return null;
      }
    }
  };
  le.prototype.visible = false;
  le.findFrom = le.findGapCursorFrom;
  N.jsonID("gapcursor", le);
  var wo = class n40 {
    constructor(e) {
      this.pos = e;
    }
    map(e) {
      return new n40(e.map(this.pos));
    }
    resolve(e) {
      let t = e.resolve(this.pos);
      return le.valid(t) ? new le(t) : N.near(t);
    }
  };
  function Au(n43) {
    return n43.isAtom || n43.spec.isolating || n43.spec.createGapCursor;
  }
  function kg(n43) {
    for (let e = n43.depth; e >= 0; e--) {
      let t = n43.index(e), r = n43.node(e);
      if (t == 0) {
        if (r.type.spec.isolating) return true;
        continue;
      }
      for (let i = r.child(t - 1); ; i = i.lastChild) {
        if (i.childCount == 0 && !i.inlineContent || Au(i.type)) return true;
        if (i.inlineContent) return false;
      }
    }
    return true;
  }
  function bg(n43) {
    for (let e = n43.depth; e >= 0; e--) {
      let t = n43.indexAfter(e), r = n43.node(e);
      if (t == r.childCount) {
        if (r.type.spec.isolating) return true;
        continue;
      }
      for (let i = r.child(t); ; i = i.firstChild) {
        if (i.childCount == 0 && !i.inlineContent || Au(i.type)) return true;
        if (i.inlineContent) return false;
      }
    }
    return true;
  }
  function Nu() {
    return new O({ props: { decorations: wg, createSelectionBetween(n43, e, t) {
      return e.pos == t.pos && le.valid(t) ? new le(t) : null;
    }, handleClick: Sg, handleKeyDown: xg, handleDOMEvents: { beforeinput: Mg } } });
  }
  var xg = Ts({ ArrowLeft: li("horiz", -1), ArrowRight: li("horiz", 1), ArrowUp: li("vert", -1), ArrowDown: li("vert", 1) });
  function li(n43, e) {
    let t = n43 == "vert" ? e > 0 ? "down" : "up" : e > 0 ? "right" : "left";
    return function(r, i, s) {
      let o = r.selection, l = e > 0 ? o.$to : o.$from, a = o.empty;
      if (o instanceof E) {
        if (!s.endOfTextblock(t) || l.depth == 0) return false;
        a = false, l = r.doc.resolve(e > 0 ? l.after() : l.before());
      }
      let c = le.findGapCursorFrom(l, e, a);
      return c ? (i && i(r.tr.setSelection(new le(c))), true) : false;
    };
  }
  function Sg(n43, e, t) {
    if (!n43 || !n43.editable) return false;
    let r = n43.state.doc.resolve(e);
    if (!le.valid(r)) return false;
    let i = n43.posAtCoords({ left: t.clientX, top: t.clientY });
    return i && i.inside > -1 && C.isSelectable(n43.state.doc.nodeAt(i.inside)) ? false : (n43.dispatch(n43.state.tr.setSelection(new le(r))), true);
  }
  function Mg(n43, e) {
    if (e.inputType != "insertCompositionText" || !(n43.state.selection instanceof le)) return false;
    let { $from: t } = n43.state.selection, r = t.parent.contentMatchAt(t.index()).findWrapping(n43.state.schema.nodes.text);
    if (!r) return false;
    let i = k.empty;
    for (let o = r.length - 1; o >= 0; o--) i = k.from(r[o].createAndFill(null, i));
    let s = n43.state.tr.replace(t.pos, t.pos, new x(i, 0, 0));
    return s.setSelection(E.near(s.doc.resolve(t.pos + 1))), n43.dispatch(s), false;
  }
  function wg(n43) {
    if (!(n43.selection instanceof le)) return null;
    let e = document.createElement("div");
    return e.className = "ProseMirror-gapcursor", K.create(n43.doc, [oe.widget(n43.selection.head, e, { key: "gapcursor" })]);
  }
  var ai = 200;
  var te = function() {
  };
  te.prototype.append = function(e) {
    return e.length ? (e = te.from(e), !this.length && e || e.length < ai && this.leafAppend(e) || this.length < ai && e.leafPrepend(this) || this.appendInner(e)) : this;
  };
  te.prototype.prepend = function(e) {
    return e.length ? te.from(e).append(this) : this;
  };
  te.prototype.appendInner = function(e) {
    return new Cg(this, e);
  };
  te.prototype.slice = function(e, t) {
    return e === void 0 && (e = 0), t === void 0 && (t = this.length), e >= t ? te.empty : this.sliceInner(Math.max(0, e), Math.min(this.length, t));
  };
  te.prototype.get = function(e) {
    if (!(e < 0 || e >= this.length)) return this.getInner(e);
  };
  te.prototype.forEach = function(e, t, r) {
    t === void 0 && (t = 0), r === void 0 && (r = this.length), t <= r ? this.forEachInner(e, t, r, 0) : this.forEachInvertedInner(e, t, r, 0);
  };
  te.prototype.map = function(e, t, r) {
    t === void 0 && (t = 0), r === void 0 && (r = this.length);
    var i = [];
    return this.forEach(function(s, o) {
      return i.push(e(s, o));
    }, t, r), i;
  };
  te.from = function(e) {
    return e instanceof te ? e : e && e.length ? new Ou(e) : te.empty;
  };
  var Ou = (function(n43) {
    function e(r) {
      n43.call(this), this.values = r;
    }
    n43 && (e.__proto__ = n43), e.prototype = Object.create(n43 && n43.prototype), e.prototype.constructor = e;
    var t = { length: { configurable: true }, depth: { configurable: true } };
    return e.prototype.flatten = function() {
      return this.values;
    }, e.prototype.sliceInner = function(i, s) {
      return i == 0 && s == this.length ? this : new e(this.values.slice(i, s));
    }, e.prototype.getInner = function(i) {
      return this.values[i];
    }, e.prototype.forEachInner = function(i, s, o, l) {
      for (var a = s; a < o; a++) if (i(this.values[a], l + a) === false) return false;
    }, e.prototype.forEachInvertedInner = function(i, s, o, l) {
      for (var a = s - 1; a >= o; a--) if (i(this.values[a], l + a) === false) return false;
    }, e.prototype.leafAppend = function(i) {
      if (this.length + i.length <= ai) return new e(this.values.concat(i.flatten()));
    }, e.prototype.leafPrepend = function(i) {
      if (this.length + i.length <= ai) return new e(i.flatten().concat(this.values));
    }, t.length.get = function() {
      return this.values.length;
    }, t.depth.get = function() {
      return 0;
    }, Object.defineProperties(e.prototype, t), e;
  })(te);
  te.empty = new Ou([]);
  var Cg = (function(n43) {
    function e(t, r) {
      n43.call(this), this.left = t, this.right = r, this.length = t.length + r.length, this.depth = Math.max(t.depth, r.depth) + 1;
    }
    return n43 && (e.__proto__ = n43), e.prototype = Object.create(n43 && n43.prototype), e.prototype.constructor = e, e.prototype.flatten = function() {
      return this.left.flatten().concat(this.right.flatten());
    }, e.prototype.getInner = function(r) {
      return r < this.left.length ? this.left.get(r) : this.right.get(r - this.left.length);
    }, e.prototype.forEachInner = function(r, i, s, o) {
      var l = this.left.length;
      if (i < l && this.left.forEachInner(r, i, Math.min(s, l), o) === false || s > l && this.right.forEachInner(r, Math.max(i - l, 0), Math.min(this.length, s) - l, o + l) === false) return false;
    }, e.prototype.forEachInvertedInner = function(r, i, s, o) {
      var l = this.left.length;
      if (i > l && this.right.forEachInvertedInner(r, i - l, Math.max(s, l) - l, o + l) === false || s < l && this.left.forEachInvertedInner(r, Math.min(i, l), s, o) === false) return false;
    }, e.prototype.sliceInner = function(r, i) {
      if (r == 0 && i == this.length) return this;
      var s = this.left.length;
      return i <= s ? this.left.slice(r, i) : r >= s ? this.right.slice(r - s, i - s) : this.left.slice(r, s).append(this.right.slice(0, i - s));
    }, e.prototype.leafAppend = function(r) {
      var i = this.right.leafAppend(r);
      if (i) return new e(this.left, i);
    }, e.prototype.leafPrepend = function(r) {
      var i = this.left.leafPrepend(r);
      if (i) return new e(i, this.right);
    }, e.prototype.appendInner = function(r) {
      return this.left.depth >= Math.max(this.right.depth, r.depth) + 1 ? new e(this.left, new e(this.right, r)) : new e(this, r);
    }, e;
  })(te);
  var Co = te;
  var Tg = 500;
  var Ct = class n41 {
    constructor(e, t) {
      this.items = e, this.eventCount = t;
    }
    popEvent(e, t) {
      if (this.eventCount == 0) return null;
      let r = this.items.length;
      for (; ; r--) if (this.items.get(r - 1).selection) {
        --r;
        break;
      }
      let i, s;
      t && (i = this.remapping(r, this.items.length), s = i.maps.length);
      let o = e.tr, l, a, c = [], u = [];
      return this.items.forEach((d, f) => {
        if (!d.step) {
          i || (i = this.remapping(r, f + 1), s = i.maps.length), s--, u.push(d);
          return;
        }
        if (i) {
          u.push(new De(d.map));
          let h = d.step.map(i.slice(s)), p;
          h && o.maybeStep(h).doc && (p = o.mapping.maps[o.mapping.maps.length - 1], c.push(new De(p, void 0, void 0, c.length + u.length))), s--, p && i.appendMap(p, s);
        } else o.maybeStep(d.step);
        if (d.selection) return l = i ? d.selection.map(i.slice(s)) : d.selection, a = new n41(this.items.slice(0, r).append(u.reverse().concat(c)), this.eventCount - 1), false;
      }, this.items.length, 0), { remaining: a, transform: o, selection: l };
    }
    addTransform(e, t, r, i) {
      let s = [], o = this.eventCount, l = this.items, a = !i && l.length ? l.get(l.length - 1) : null;
      for (let u = 0; u < e.steps.length; u++) {
        let d = e.steps[u].invert(e.docs[u]), f = new De(e.mapping.maps[u], d, t), h;
        (h = a && a.merge(f)) && (f = h, u ? s.pop() : l = l.slice(0, l.length - 1)), s.push(f), t && (o++, t = void 0), i || (a = f);
      }
      let c = o - r.depth;
      return c > Eg && (l = vg(l, c), o -= c), new n41(l.append(s), o);
    }
    remapping(e, t) {
      let r = new Zt();
      return this.items.forEach((i, s) => {
        let o = i.mirrorOffset != null && s - i.mirrorOffset >= e ? r.maps.length - i.mirrorOffset : void 0;
        r.appendMap(i.map, o);
      }, e, t), r;
    }
    addMaps(e) {
      return this.eventCount == 0 ? this : new n41(this.items.append(e.map((t) => new De(t))), this.eventCount);
    }
    rebased(e, t) {
      if (!this.eventCount) return this;
      let r = [], i = Math.max(0, this.items.length - t), s = e.mapping, o = e.steps.length, l = this.eventCount;
      this.items.forEach((f) => {
        f.selection && l--;
      }, i);
      let a = t;
      this.items.forEach((f) => {
        let h = s.getMirror(--a);
        if (h == null) return;
        o = Math.min(o, h);
        let p = s.maps[h];
        if (f.step) {
          let m = e.steps[h].invert(e.docs[h]), g = f.selection && f.selection.map(s.slice(a + 1, h));
          g && l++, r.push(new De(p, m, g));
        } else r.push(new De(p));
      }, i);
      let c = [];
      for (let f = t; f < o; f++) c.push(new De(s.maps[f]));
      let u = this.items.slice(0, i).append(c).append(r), d = new n41(u, l);
      return d.emptyItemCount() > Tg && (d = d.compress(this.items.length - r.length)), d;
    }
    emptyItemCount() {
      let e = 0;
      return this.items.forEach((t) => {
        t.step || e++;
      }), e;
    }
    compress(e = this.items.length) {
      let t = this.remapping(0, e), r = t.maps.length, i = [], s = 0;
      return this.items.forEach((o, l) => {
        if (l >= e) i.push(o), o.selection && s++;
        else if (o.step) {
          let a = o.step.map(t.slice(r)), c = a && a.getMap();
          if (r--, c && t.appendMap(c, r), a) {
            let u = o.selection && o.selection.map(t.slice(r));
            u && s++;
            let d = new De(c.invert(), a, u), f, h = i.length - 1;
            (f = i.length && i[h].merge(d)) ? i[h] = f : i.push(d);
          }
        } else o.map && r--;
      }, this.items.length, 0), new n41(Co.from(i.reverse()), s);
    }
  };
  Ct.empty = new Ct(Co.empty, 0);
  function vg(n43, e) {
    let t;
    return n43.forEach((r, i) => {
      if (r.selection && e-- == 0) return t = i, false;
    }), n43.slice(t);
  }
  var De = class n42 {
    constructor(e, t, r, i) {
      this.map = e, this.step = t, this.selection = r, this.mirrorOffset = i;
    }
    merge(e) {
      if (this.step && e.step && !e.selection) {
        let t = e.step.merge(this.step);
        if (t) return new n42(t.getMap().invert(), t, this.selection);
      }
    }
  };
  var Pe = class {
    constructor(e, t, r, i, s) {
      this.done = e, this.undone = t, this.prevRanges = r, this.prevTime = i, this.prevComposition = s;
    }
  };
  var Eg = 20;
  function Ag(n43, e, t, r) {
    let i = t.getMeta(wt), s;
    if (i) return i.historyState;
    t.getMeta(Ig) && (n43 = new Pe(n43.done, n43.undone, null, 0, -1));
    let o = t.getMeta("appendedTransaction");
    if (t.steps.length == 0) return n43;
    if (o && o.getMeta(wt)) return o.getMeta(wt).redo ? new Pe(n43.done.addTransform(t, void 0, r, ci(e)), n43.undone, Iu(t.mapping.maps), n43.prevTime, n43.prevComposition) : new Pe(n43.done, n43.undone.addTransform(t, void 0, r, ci(e)), null, n43.prevTime, n43.prevComposition);
    if (t.getMeta("addToHistory") !== false && !(o && o.getMeta("addToHistory") === false)) {
      let l = t.getMeta("composition"), a = n43.prevTime == 0 || !o && n43.prevComposition != l && (n43.prevTime < (t.time || 0) - r.newGroupDelay || !Ng(t, n43.prevRanges)), c = o ? To(n43.prevRanges, t.mapping) : Iu(t.mapping.maps);
      return new Pe(n43.done.addTransform(t, a ? e.selection.getBookmark() : void 0, r, ci(e)), Ct.empty, c, t.time, l ?? n43.prevComposition);
    } else return (s = t.getMeta("rebased")) ? new Pe(n43.done.rebased(t, s), n43.undone.rebased(t, s), To(n43.prevRanges, t.mapping), n43.prevTime, n43.prevComposition) : new Pe(n43.done.addMaps(t.mapping.maps), n43.undone.addMaps(t.mapping.maps), To(n43.prevRanges, t.mapping), n43.prevTime, n43.prevComposition);
  }
  function Ng(n43, e) {
    if (!e) return false;
    if (!n43.docChanged) return true;
    let t = false;
    return n43.mapping.maps[0].forEach((r, i) => {
      for (let s = 0; s < e.length; s += 2) r <= e[s + 1] && i >= e[s] && (t = true);
    }), t;
  }
  function Iu(n43) {
    let e = [];
    for (let t = n43.length - 1; t >= 0 && e.length == 0; t--) n43[t].forEach((r, i, s, o) => e.push(s, o));
    return e;
  }
  function To(n43, e) {
    if (!n43) return null;
    let t = [];
    for (let r = 0; r < n43.length; r += 2) {
      let i = e.map(n43[r], 1), s = e.map(n43[r + 1], -1);
      i <= s && t.push(i, s);
    }
    return t;
  }
  function Og(n43, e, t) {
    let r = ci(e), i = wt.get(e).spec.config, s = (t ? n43.undone : n43.done).popEvent(e, r);
    if (!s) return null;
    let o = s.selection.resolve(s.transform.doc), l = (t ? n43.done : n43.undone).addTransform(s.transform, e.selection.getBookmark(), i, r), a = new Pe(t ? l : s.remaining, t ? s.remaining : l, null, 0, -1);
    return s.transform.setSelection(o).setMeta(wt, { redo: t, historyState: a });
  }
  var vo = false;
  var Ru = null;
  function ci(n43) {
    let e = n43.plugins;
    if (Ru != e) {
      vo = false, Ru = e;
      for (let t = 0; t < e.length; t++) if (e[t].spec.historyPreserveItems) {
        vo = true;
        break;
      }
    }
    return vo;
  }
  var wt = new R("history");
  var Ig = new R("closeHistory");
  function Du(n43 = {}) {
    return n43 = { depth: n43.depth || 100, newGroupDelay: n43.newGroupDelay || 500 }, new O({ key: wt, state: { init() {
      return new Pe(Ct.empty, Ct.empty, null, 0, -1);
    }, apply(e, t, r) {
      return Ag(t, r, e, n43);
    } }, config: n43, props: { handleDOMEvents: { beforeinput(e, t) {
      let r = t.inputType, i = r == "historyUndo" ? Eo : r == "historyRedo" ? Ao : null;
      return !i || !e.editable ? false : (t.preventDefault(), i(e.state, e.dispatch));
    } } } });
  }
  function ui(n43, e) {
    return (t, r) => {
      let i = wt.getState(t);
      if (!i || (n43 ? i.undone : i.done).eventCount == 0) return false;
      if (r) {
        let s = Og(i, t, n43);
        s && r(e ? s.scrollIntoView() : s);
      }
      return true;
    };
  }
  var Eo = ui(false, true);
  var Ao = ui(true, true);
  var db = ui(false, false);
  var fb = ui(true, false);
  var kb = B.create({ name: "characterCount", addOptions() {
    return { limit: null, autoTrim: true, mode: "textSize", textCounter: (n43) => n43.length, wordCounter: (n43) => n43.split(" ").filter((e) => e !== "").length };
  }, addStorage() {
    return { characters: () => 0, words: () => 0 };
  }, onBeforeCreate() {
    this.storage.characters = (n43) => {
      let e = n43?.node || this.editor.state.doc;
      if ((n43?.mode || this.options.mode) === "textSize") {
        let r = e.textBetween(0, e.content.size, void 0, " ");
        return this.options.textCounter(r);
      }
      return e.nodeSize;
    }, this.storage.words = (n43) => {
      let e = n43?.node || this.editor.state.doc, t = e.textBetween(0, e.content.size, " ", " ");
      return this.options.wordCounter(t);
    };
  }, addProseMirrorPlugins() {
    let n43 = false;
    return [new O({ key: new R("characterCount"), appendTransaction: (e, t, r) => {
      if (n43) return;
      let i = this.options.limit, s = this.options.autoTrim;
      if (i == null || i === 0 || s === false) {
        n43 = true;
        return;
      }
      let o = this.storage.characters({ node: r.doc });
      if (o > i) {
        let l = o - i, a = 0, c = l;
        console.warn(`[CharacterCount] Initial content exceeded limit of ${i} characters. Content was automatically trimmed.`);
        let u = r.tr.deleteRange(a, c);
        return n43 = true, u;
      }
      n43 = true;
    }, filterTransaction: (e, t) => {
      let r = this.options.limit;
      if (!e.docChanged || r === 0 || r === null || r === void 0) return true;
      let i = this.storage.characters({ node: t.doc }), s = this.storage.characters({ node: e.doc });
      if (s <= r || i > r && s > r && s <= i) return true;
      if (i > r && s > r && s > i || !e.getMeta("paste")) return false;
      let l = e.selection.$head.pos, a = s - r, c = l - a, u = l;
      return e.deleteRange(c, u), !(this.storage.characters({ node: e.doc }) > r);
    } })];
  } });
  var Bu = B.create({ name: "dropCursor", addOptions() {
    return { color: "currentColor", width: 1, class: void 0 };
  }, addProseMirrorPlugins() {
    return [Eu(this.options)];
  } });
  var Cb = B.create({ name: "focus", addOptions() {
    return { className: "has-focus", mode: "all" };
  }, addProseMirrorPlugins() {
    return [new O({ key: new R("focus"), props: { decorations: ({ doc: n43, selection: e }) => {
      let { isEditable: t, isFocused: r } = this.editor, { anchor: i } = e, s = [];
      if (!t || !r) return K.create(n43, []);
      let o = 0;
      this.options.mode === "deepest" && n43.descendants((a, c) => {
        if (a.isText) return;
        if (!(i >= c && i <= c + a.nodeSize - 1)) return false;
        o += 1;
      });
      let l = 0;
      return n43.descendants((a, c) => {
        if (a.isText || !(i >= c && i <= c + a.nodeSize - 1)) return false;
        if (l += 1, this.options.mode === "deepest" && o - l > 0 || this.options.mode === "shallowest" && l > 1) return this.options.mode === "deepest";
        s.push(oe.node(c, c + a.nodeSize, { class: this.options.className }));
      }), K.create(n43, s);
    } } })];
  } });
  var Fu = B.create({ name: "gapCursor", addProseMirrorPlugins() {
    return [Nu()];
  }, extendNodeSchema(n43) {
    var e;
    let t = { name: n43.name, options: n43.options, storage: n43.storage };
    return { allowGapCursor: (e = H(T(n43, "allowGapCursor", t))) != null ? e : null };
  } });
  function Pu(n43) {
    let { editor: e, placeholder: t, dataAttribute: r, pos: i, node: s, isEmptyDoc: o, hasAnchor: l, classes: { emptyNode: a, emptyEditor: c } } = n43, u = [a];
    return o && u.push(c), oe.node(i, i + s.nodeSize, { class: u.join(" "), [r]: typeof t == "function" ? t({ editor: e, node: s, pos: i, hasAnchor: l }) : t });
  }
  function Rg(n43) {
    let e = getComputedStyle(n43), t = `${e.overflow} ${e.overflowY} ${e.overflowX}`;
    return /auto|scroll|overlay/.test(t);
  }
  function Dg(n43) {
    let e = n43;
    for (; e; ) {
      if (Rg(e)) return e;
      let t = e.parentElement;
      if (!t) {
        let r = e.getRootNode();
        if (r instanceof ShadowRoot) {
          e = r.host;
          continue;
        }
        return window;
      }
      e = t;
    }
    return window;
  }
  function Pg(n43) {
    return n43 === window ? { top: 0, bottom: window.innerHeight } : n43.getBoundingClientRect();
  }
  function Lg({ doc: n43, view: e, scrollContainer: t }) {
    let r = e.dom.getBoundingClientRect(), i = t ? Pg(t) : { top: 0, bottom: window.innerHeight }, s = Math.max(r.top, i.top), o = Math.min(r.bottom, i.bottom);
    if (s >= o) return { top: 0, bottom: n43.content.size };
    let a = getComputedStyle(e.dom).direction === "rtl" ? Math.max(r.right - 2, r.left + 2) : r.left + 2, c = e.posAtCoords({ left: a, top: s + 2 }), u = e.posAtCoords({ left: a, top: o - 2 });
    return { top: c ? c.pos : 0, bottom: u ? u.pos : n43.content.size };
  }
  function zg(n43, e) {
    let t = null;
    return { call: ((...s) => {
      t || (n43(...s), t = setTimeout(() => {
        t = null;
      }, e));
    }), cancel: () => {
      t && (clearTimeout(t), t = null);
    } };
  }
  var Lu = "placeholder";
  function Bg(n43) {
    return n43.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "").replace(/^[0-9-]+/, "").replace(/^-+/, "").toLowerCase();
  }
  var In = new R("tiptap__placeholder");
  var Ib = B.create({ name: "placeholder", addOptions() {
    return { emptyEditorClass: "is-editor-empty", emptyNodeClass: "is-empty", dataAttribute: Lu, placeholder: "Write something \u2026", showOnlyWhenEditable: true, showOnlyCurrent: true, includeChildren: false };
  }, addProseMirrorPlugins() {
    let n43 = this.options.dataAttribute ? `data-${Bg(this.options.dataAttribute)}` : `data-${Lu}`;
    return [new O({ state: { init() {
      return { topPos: null, bottomPos: null };
    }, apply(e, t) {
      let r = e.getMeta(In);
      return r?.positions ? { topPos: r.positions.top, bottomPos: r.positions.bottom } : e.docChanged ? { topPos: t.topPos !== null ? e.mapping.map(t.topPos) : null, bottomPos: t.bottomPos !== null ? e.mapping.map(t.bottomPos) : null } : t;
    } }, key: In, view(e) {
      let t = Dg(e.dom), r = () => {
        let l = Lg({ view: e, doc: e.state.doc, scrollContainer: t }), a = In.getState(e.state);
        if (a.topPos === l.top && a.bottomPos === l.bottom) return;
        let c = e.state.tr.setMeta(In, { positions: l }).setMeta("tiptap__viewportUpdate", true);
        e.dispatch(c);
      }, { call: i, cancel: s } = zg(r, 250), o = t;
      return o.addEventListener("scroll", i, { passive: true }), r(), { update(l, a) {
        e.state.doc.content.size !== a.doc.content.size && r();
      }, destroy: () => {
        s(), o.removeEventListener("scroll", i);
      } };
    }, props: { decorations: ({ doc: e, selection: t }) => {
      var r, i;
      if (!(this.editor.isEditable || !this.options.showOnlyWhenEditable)) return null;
      let { anchor: o } = t, l = [], a = this.editor.isEmpty;
      if (this.options.showOnlyCurrent && !this.options.includeChildren) {
        let u = e.resolve(o);
        if (u.depth > 0) {
          let d = u.node(1), f = u.before(1);
          if (d.type.isTextblock && jt(d)) {
            let h = o >= f && o <= f + d.nodeSize, p = Pu({ node: d, dataAttribute: n43, hasAnchor: h, placeholder: this.options.placeholder, classes: { emptyEditor: this.options.emptyEditorClass, emptyNode: this.options.emptyNodeClass }, editor: this.editor, isEmptyDoc: a, pos: u.before(1) });
            l.push(p);
          }
        }
      } else {
        let u = In.getState(this.editor.state), d = (r = u.topPos) != null ? r : 0, f = (i = u.bottomPos) != null ? i : e.content.size;
        e.nodesBetween(d, f, (h, p) => {
          let m = o >= p && o <= p + h.nodeSize, g = !h.isLeaf && jt(h);
          if (!h.type.isTextblock) return this.options.includeChildren;
          if ((m || !this.options.showOnlyCurrent) && g) {
            let y = Pu({ classes: { emptyEditor: this.options.emptyEditorClass, emptyNode: this.options.emptyNodeClass }, editor: this.editor, isEmptyDoc: a, dataAttribute: n43, hasAnchor: m, placeholder: this.options.placeholder, node: h, pos: p });
            l.push(y);
          }
          return this.options.includeChildren;
        });
      }
      return K.create(e, l);
    } } })];
  } });
  var Lb = B.create({ name: "selection", addOptions() {
    return { className: "selection" };
  }, addProseMirrorPlugins() {
    let { editor: n43, options: e } = this;
    return [new O({ key: new R("selection"), props: { decorations(t) {
      return t.selection.empty || n43.isFocused || !n43.isEditable || xr(t.selection) || n43.view.dragging ? null : K.create(t.doc, [oe.inline(t.selection.from, t.selection.to, { class: e.className })]);
    } } })];
  } });
  var Fg = "skipTrailingNode";
  function zu({ types: n43, node: e }) {
    return e && Array.isArray(n43) && n43.includes(e.type) || e?.type === n43;
  }
  var Hu = B.create({ name: "trailingNode", addOptions() {
    return { node: void 0, notAfter: [] };
  }, addProseMirrorPlugins() {
    var n43;
    let e = new R(this.name), t = this.options.node || ((n43 = this.editor.schema.topNodeType.contentMatch.defaultType) == null ? void 0 : n43.name) || "paragraph", r = Object.entries(this.editor.schema.nodes).map(([, i]) => i).filter((i) => (this.options.notAfter || []).concat(t).includes(i.name));
    return [new O({ key: e, appendTransaction: (i, s, o) => {
      let { doc: l, tr: a, schema: c } = o, u = e.getState(o), d = l.content.size, f = c.nodes[t];
      if (!i.some((h) => h.getMeta(Fg)) && u) return a.insert(d, f.create());
    }, state: { init: (i, s) => {
      let o = s.tr.doc.lastChild;
      return !zu({ node: o, types: r });
    }, apply: (i, s) => {
      if (!i.docChanged || i.getMeta("__uniqueIDTransaction")) return s;
      let o = i.doc.lastChild;
      return !zu({ node: o, types: r });
    } } })];
  } });
  var $u = B.create({ name: "undoRedo", addOptions() {
    return { depth: 100, newGroupDelay: 500 };
  }, addCommands() {
    return { undo: () => ({ state: n43, dispatch: e }) => Eo(n43, e), redo: () => ({ state: n43, dispatch: e }) => Ao(n43, e) };
  }, addProseMirrorPlugins() {
    return [Du(this.options)];
  }, addKeyboardShortcuts() {
    return { "Mod-z": () => this.editor.commands.undo(), "Shift-Mod-z": () => this.editor.commands.redo(), "Mod-y": () => this.editor.commands.redo(), "Mod-\u044F": () => this.editor.commands.undo(), "Shift-Mod-\u044F": () => this.editor.commands.redo() };
  } });
  var Hg = B.create({ name: "starterKit", addExtensions() {
    var n43, e, t, r;
    let i = [];
    return this.options.bold !== false && i.push(Wc.configure(this.options.bold)), this.options.blockquote !== false && i.push(jc.configure(this.options.blockquote)), this.options.bulletList !== false && i.push(mo.configure(this.options.bulletList)), this.options.code !== false && i.push(Kc.configure(this.options.code)), this.options.codeBlock !== false && i.push(Uc.configure(this.options.codeBlock)), this.options.document !== false && i.push(Jc.configure(this.options.document)), this.options.dropcursor !== false && i.push(Bu.configure(this.options.dropcursor)), this.options.gapcursor !== false && i.push(Fu.configure(this.options.gapcursor)), this.options.hardBreak !== false && i.push(qc.configure(this.options.hardBreak)), this.options.heading !== false && i.push(Gc.configure(this.options.heading)), this.options.undoRedo !== false && i.push($u.configure(this.options.undoRedo)), this.options.horizontalRule !== false && i.push(Yc.configure(this.options.horizontalRule)), this.options.italic !== false && i.push(Xc.configure(this.options.italic)), this.options.listItem !== false && i.push(go.configure(this.options.listItem)), this.options.listKeymap !== false && i.push(ko.configure((n43 = this.options) == null ? void 0 : n43.listKeymap)), this.options.link !== false && i.push(fu.configure((e = this.options) == null ? void 0 : e.link)), this.options.orderedList !== false && i.push(bo.configure(this.options.orderedList)), this.options.paragraph !== false && i.push(Cu.configure(this.options.paragraph)), this.options.strike !== false && i.push(Tu.configure(this.options.strike)), this.options.text !== false && i.push(vu.configure(this.options.text)), this.options.underline !== false && i.push(So.configure((t = this.options) == null ? void 0 : t.underline)), this.options.trailingNode !== false && i.push(Hu.configure((r = this.options) == null ? void 0 : r.trailingNode)), i;
  } });
  var $g = /(?:^|\s)(==(?!\s+==)((?:[^=]+))==(?!\s+==))$/;
  var _g = /(?:^|\s)(==(?!\s+==)((?:[^=]+))==(?!\s+==))/g;
  var Vg = de.create({ name: "highlight", addOptions() {
    return { multicolor: false, HTMLAttributes: {} };
  }, addAttributes() {
    return this.options.multicolor ? { color: { default: null, parseHTML: (n43) => n43.getAttribute("data-color") || _c(n43, "background-color") || n43.style.backgroundColor, renderHTML: (n43) => n43.color ? { "data-color": n43.color, style: `background-color: ${n43.color}; color: inherit` } : {} } } : {};
  }, parseHTML() {
    return [{ tag: "mark" }];
  }, renderHTML({ HTMLAttributes: n43 }) {
    return ["mark", D(this.options.HTMLAttributes, n43), 0];
  }, renderMarkdown: (n43, e) => `==${e.renderChildren(n43)}==`, parseMarkdown: (n43, e) => e.applyMark("highlight", e.parseInline(n43.tokens || [])), markdownTokenizer: { name: "highlight", level: "inline", start: (n43) => n43.indexOf("=="), tokenize(n43, e, t) {
    let i = /^(==)([^=]+)(==)/.exec(n43);
    if (i) {
      let s = i[2].trim(), o = t.inlineTokens(s);
      return { type: "highlight", raw: i[0], text: s, tokens: o };
    }
  } }, addCommands() {
    return { setHighlight: (n43) => ({ commands: e }) => e.setMark(this.name, n43), toggleHighlight: (n43) => ({ commands: e }) => e.toggleMark(this.name, n43), unsetHighlight: () => ({ commands: n43 }) => n43.unsetMark(this.name) };
  }, addKeyboardShortcuts() {
    return { "Mod-Shift-h": () => this.editor.commands.toggleHighlight() };
  }, addInputRules() {
    return [Me({ find: $g, type: this.type })];
  }, addPasteRules() {
    return [pe({ find: _g, type: this.type })];
  } });

  // dev/js/editor.js
  var editor = null;
  var onChangeCallback = null;
  function initEditor({ onChange } = {}) {
    onChangeCallback = onChange;
    editor = new dm({
      element: document.getElementById("editor"),
      extensions: [
        Hg.configure({ heading: { levels: [1, 2, 3] } }),
        So,
        Vg.configure({ multicolor: false }),
        si,
        ii.configure({ nested: true })
      ],
      content: "",
      autofocus: false,
      editorProps: {
        attributes: { spellcheck: "true", "data-placeholder": "Comece a digitar suas notas..." }
      },
      onUpdate: ({ editor: e }) => {
        if (onChangeCallback) onChangeCallback(serializeToMarkdown(e));
      }
    });
    setupKeyboardShortcuts();
    return editor;
  }
  function setupKeyboardShortcuts() {
    document.getElementById("editor").addEventListener("keydown", (e) => {
      if (!editor) return;
      if (e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          editor.commands.liftListItem("listItem") || editor.commands.liftListItem("taskItem");
        } else {
          const sunk = editor.commands.sinkListItem("listItem") || editor.commands.sinkListItem("taskItem");
          if (!sunk) editor.commands.insertContent("  ");
        }
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      switch (e.key.toLowerCase()) {
        case "b":
          e.preventDefault();
          e.stopPropagation();
          editor.commands.toggleBold();
          return;
        case "i":
          e.preventDefault();
          e.stopPropagation();
          editor.commands.toggleItalic();
          return;
        case "u":
          e.preventDefault();
          e.stopPropagation();
          editor.commands.toggleUnderline();
          return;
      }
      if (e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        e.stopPropagation();
        editor.commands.toggleHighlight();
      }
    }, true);
  }
  function focusEditor() {
    editor?.commands.focus("end");
  }
  function focusAtCoords(clientX, clientY) {
    if (!editor) return;
    const view = editor.view;
    const rect = view.dom.getBoundingClientRect();
    if (clientY < rect.top) {
      editor.commands.focus("start");
      return;
    }
    if (clientY > rect.bottom) {
      editor.commands.focus("end");
      return;
    }
    const clampedX = Math.max(rect.left + 2, Math.min(rect.right - 2, clientX));
    const posResult = view.posAtCoords({ left: clampedX, top: clientY });
    if (posResult) {
      editor.commands.setTextSelection(posResult.pos);
      editor.commands.focus();
    } else {
      editor.commands.focus("end");
    }
  }
  function clearEditor() {
    editor?.commands.clearContent();
  }
  function getMarkdown() {
    return editor ? serializeToMarkdown(editor) : "";
  }
  function setContent(content) {
    if (!editor) return;
    editor.commands.setContent(
      typeof content === "string" ? markdownToTiptap(content) : content,
      false
    );
  }
  function serializeToMarkdown(ed2) {
    return nodesToMd(ed2.getJSON().content || []);
  }
  function nodesToMd(nodes) {
    return nodes.map(nodeToMd).join("");
  }
  function nodeToMd(node) {
    switch (node.type) {
      case "paragraph":
        return inlineToMd(node.content) ? inlineToMd(node.content) + "\n\n" : "\n";
      case "heading":
        return "#".repeat(node.attrs?.level || 1) + " " + inlineToMd(node.content) + "\n\n";
      case "bulletList":
        return (node.content || []).map((li2) => listItemToMd(li2, "-", 0)).join("") + "\n";
      case "orderedList":
        return (node.content || []).map((li2, i) => listItemToMd(li2, `${i + 1}.`, 0)).join("") + "\n";
      case "taskList":
        return (node.content || []).map((li2) => taskItemToMd(li2, 0)).join("") + "\n";
      case "blockquote":
        return nodesToMd(node.content || []).trimEnd().split("\n").map((l) => "> " + l).join("\n") + "\n\n";
      case "codeBlock":
        return "```" + (node.attrs?.language || "") + "\n" + (node.content || []).map((n43) => n43.text || "").join("") + "\n```\n\n";
      case "horizontalRule":
        return "---\n\n";
      case "hardBreak":
        return "  \n";
      default:
        return "";
    }
  }
  function listItemToMd(li2, marker, indent) {
    const prefix = "  ".repeat(indent);
    return (li2.content || []).map((child) => {
      if (child.type === "paragraph") return prefix + marker + " " + inlineToMd(child.content) + "\n";
      if (child.type === "bulletList") return (child.content || []).map((s) => listItemToMd(s, "-", indent + 1)).join("");
      if (child.type === "orderedList") return (child.content || []).map((s, i) => listItemToMd(s, `${i + 1}.`, indent + 1)).join("");
      if (child.type === "taskList") return (child.content || []).map((s) => taskItemToMd(s, indent + 1)).join("");
      return "";
    }).join("");
  }
  function taskItemToMd(li2, indent) {
    const prefix = "  ".repeat(indent);
    const checked = li2.attrs?.checked ? "x" : " ";
    return (li2.content || []).filter((c) => c.type === "paragraph").map((c) => prefix + `- [${checked}] ` + inlineToMd(c.content) + "\n").join("") || prefix + `- [${checked}] 
`;
  }
  function inlineToMd(nodes) {
    return (nodes || []).map((n43) => {
      if (n43.type === "hardBreak") return "  \n";
      if (n43.type !== "text") return "";
      let t = n43.text || "";
      for (const m of n43.marks || []) {
        if (m.type === "bold") t = `**${t}**`;
        if (m.type === "italic") t = `*${t}*`;
        if (m.type === "underline") t = `<u>${t}</u>`;
        if (m.type === "highlight") t = `==${t}==`;
        if (m.type === "code") t = `\`${t}\``;
        if (m.type === "strike") t = `~~${t}~~`;
        if (m.type === "link") t = `[${t}](${m.attrs?.href || ""})`;
      }
      return t;
    }).join("");
  }
  function markdownToTiptap(md2) {
    if (!md2?.trim()) return "";
    const lines = md2.split("\n");
    const content = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const hm2 = line.match(/^(#{1,3})\s+(.+)/);
      if (hm2) {
        content.push({ type: "heading", attrs: { level: hm2[1].length }, content: parseInline(hm2[2]) });
        i++;
        continue;
      }
      if (line.startsWith("```")) {
        const r = collectCode(lines, i);
        content.push(r.node);
        i = r.next;
        continue;
      }
      if (/^---+$/.test(line.trim())) {
        content.push({ type: "horizontalRule" });
        i++;
        continue;
      }
      if (/^(\s*)- \[([ xX])\]/.test(line)) {
        const r = collectTaskList(lines, i);
        content.push({ type: "taskList", content: r.items });
        i = r.next;
        continue;
      }
      if (/^(\s*)[-*] /.test(line)) {
        const r = collectBulletList(lines, i);
        content.push({ type: "bulletList", content: r.items });
        i = r.next;
        continue;
      }
      if (/^(\s*)\d+\. /.test(line)) {
        const r = collectOrderedList(lines, i);
        content.push({ type: "orderedList", content: r.items });
        i = r.next;
        continue;
      }
      if (line.startsWith("> ")) {
        const r = collectBlockquote(lines, i);
        content.push(r.node);
        i = r.next;
        continue;
      }
      if (!line.trim()) {
        i++;
        continue;
      }
      const paraLines = [];
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
        paraLines.push(lines[i]);
        i++;
      }
      if (paraLines.length) content.push({ type: "paragraph", content: parseInline(paraLines.join(" ")) });
    }
    return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
  }
  function isBlockStart(l) {
    return /^#{1,3}\s/.test(l) || /^[-*]\s/.test(l) || /^\d+\.\s/.test(l) || l.startsWith("```") || l.startsWith("> ") || /^---+$/.test(l.trim()) || /^- \[[ xX]\]/.test(l);
  }
  function collectCode(lines, start) {
    const lang = lines[start].slice(3).trim();
    let i = start + 1;
    const code = [];
    while (i < lines.length && !lines[i].startsWith("```")) {
      code.push(lines[i]);
      i++;
    }
    return { node: { type: "codeBlock", attrs: { language: lang }, content: [{ type: "text", text: code.join("\n") }] }, next: i + 1 };
  }
  function collectTaskList(lines, start) {
    const items = [];
    let i = start;
    while (i < lines.length) {
      const m = lines[i].match(/^(\s*)- \[([ xX])\] (.*)$/);
      if (!m) break;
      items.push({ type: "taskItem", attrs: { checked: m[2].toLowerCase() === "x" }, content: [{ type: "paragraph", content: parseInline(m[3]) }] });
      i++;
    }
    return { items, next: i };
  }
  function collectBulletList(lines, start) {
    const items = [];
    let i = start;
    while (i < lines.length) {
      const m = lines[i].match(/^(\s*)[-*] (.+)/);
      if (!m) break;
      items.push({ type: "listItem", content: [{ type: "paragraph", content: parseInline(m[2]) }] });
      i++;
    }
    return { items, next: i };
  }
  function collectOrderedList(lines, start) {
    const items = [];
    let i = start;
    while (i < lines.length) {
      const m = lines[i].match(/^(\s*)\d+\. (.+)/);
      if (!m) break;
      items.push({ type: "listItem", content: [{ type: "paragraph", content: parseInline(m[2]) }] });
      i++;
    }
    return { items, next: i };
  }
  function collectBlockquote(lines, start) {
    const bq = [];
    let i = start;
    while (i < lines.length && lines[i].startsWith("> ")) {
      bq.push(lines[i].slice(2));
      i++;
    }
    return { node: { type: "blockquote", content: [{ type: "paragraph", content: parseInline(bq.join(" ")) }] }, next: i };
  }
  function parseInline(text) {
    if (!text) return [];
    const nodes = [];
    const re2 = /(\*\*(.+?)\*\*|\*(.+?)\*|<u>(.+?)<\/u>|==(.+?)==|`(.+?)`)/g;
    let last = 0, m;
    while ((m = re2.exec(text)) !== null) {
      if (m.index > last) nodes.push({ type: "text", text: text.slice(last, m.index) });
      if (m[2] !== void 0) nodes.push({ type: "text", text: m[2], marks: [{ type: "bold" }] });
      else if (m[3] !== void 0) nodes.push({ type: "text", text: m[3], marks: [{ type: "italic" }] });
      else if (m[4] !== void 0) nodes.push({ type: "text", text: m[4], marks: [{ type: "underline" }] });
      else if (m[5] !== void 0) nodes.push({ type: "text", text: m[5], marks: [{ type: "highlight" }] });
      else if (m[6] !== void 0) nodes.push({ type: "text", text: m[6], marks: [{ type: "code" }] });
      last = m.index + m[0].length;
    }
    if (last < text.length) nodes.push({ type: "text", text: text.slice(last) });
    return nodes.length ? nodes : [{ type: "text", text }];
  }

  // dev/js/groq.js
  var KEY_STORAGE = "notesai-groq-key";
  var CHUNK_MS = 5 * 60 * 1e3;
  var mediaStream = null;
  var displayStream = null;
  var audioCtx = null;
  var captureStream = null;
  var mediaRecorder = null;
  var chunks = [];
  var chunkTimer = null;
  var segmentCb = null;
  var txState = "idle";
  function saveGroqKey(key) {
    localStorage.setItem(KEY_STORAGE, key);
  }
  function getGroqKey() {
    return localStorage.getItem(KEY_STORAGE) || "";
  }
  function hasGroqKey() {
    return !!getGroqKey();
  }
  function getTranscriptionState() {
    return txState;
  }
  async function startTranscription({ onSegment, onError, onWarning }) {
    if (txState !== "idle") return;
    if (!hasGroqKey()) {
      onError("NO_KEY");
      return;
    }
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      onError(err.name === "NotAllowedError" ? "PERMISSION_DENIED" : "MEDIA_ERROR");
      return;
    }
    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      displayStream.getVideoTracks().forEach((t) => t.stop());
      const audioTracks = displayStream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioCtx = new AudioContext();
        const dest = audioCtx.createMediaStreamDestination();
        audioCtx.createMediaStreamSource(mediaStream).connect(dest);
        audioCtx.createMediaStreamSource(new MediaStream(audioTracks)).connect(dest);
        captureStream = dest.stream;
      } else {
        onWarning?.("NO_SYSTEM_AUDIO");
        captureStream = mediaStream;
      }
    } catch (err) {
      releaseStream();
      onError(err.name === "NotAllowedError" || err.name === "AbortError" ? "DISPLAY_DENIED" : "MEDIA_ERROR");
      return;
    }
    segmentCb = onSegment;
    txState = "recording";
    beginSegment();
  }
  function pauseTranscription() {
    if (txState !== "recording") return;
    txState = "paused";
    clearTimeout(chunkTimer);
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.ondataavailable = () => {
      };
      mediaRecorder.onstop = () => {
        chunks = [];
      };
      mediaRecorder.stop();
    } else {
      chunks = [];
    }
  }
  function resumeTranscription({ onSegment }) {
    if (txState !== "paused") return;
    segmentCb = onSegment;
    txState = "recording";
    beginSegment();
  }
  function stopTranscription() {
    if (txState === "idle") return Promise.resolve();
    clearTimeout(chunkTimer);
    const cb = segmentCb;
    txState = "idle";
    segmentCb = null;
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      chunks = [];
      releaseStream();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      mediaRecorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunks.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const type = mediaRecorder.mimeType;
        const pending = [...chunks];
        chunks = [];
        releaseStream();
        if (!pending.length || !cb) {
          resolve();
          return;
        }
        try {
          const text = await transcribeBlob(new Blob(pending, { type }), type);
          if (text?.trim()) cb(text.trim());
        } catch {
          cb("[trecho n\xE3o transcrito]");
        }
        resolve();
      };
      mediaRecorder.stop();
    });
  }
  function beginSegment() {
    chunks = [];
    const mimeType = getSupportedMimeType();
    try {
      mediaRecorder = new MediaRecorder(captureStream, mimeType ? { mimeType } : {});
    } catch {
      mediaRecorder = new MediaRecorder(captureStream);
    }
    mediaRecorder.ondataavailable = (e) => {
      if (e.data?.size > 0) chunks.push(e.data);
    };
    mediaRecorder.onstop = () => flushSegment(mediaRecorder.mimeType || mimeType);
    mediaRecorder.start();
    chunkTimer = setTimeout(rotateSegment, CHUNK_MS);
  }
  function rotateSegment() {
    if (txState !== "recording" || !mediaRecorder || mediaRecorder.state !== "recording") return;
    mediaRecorder.stop();
    setTimeout(() => {
      if (txState === "recording") beginSegment();
    }, 200);
  }
  async function flushSegment(mimeType) {
    const cb = segmentCb;
    if (!chunks.length || !cb) {
      chunks = [];
      return;
    }
    const blob = new Blob(chunks, { type: mimeType });
    chunks = [];
    try {
      const text = await transcribeBlob(blob, mimeType);
      if (text?.trim()) cb(text.trim());
    } catch {
      cb("[trecho n\xE3o transcrito]");
    }
  }
  async function transcribeBlob(blob, mimeType) {
    const key = getGroqKey();
    const ext = mimeType?.includes("mp4") ? "mp4" : mimeType?.includes("ogg") ? "ogg" : "webm";
    const form = new FormData();
    form.append("file", blob, `audio.${ext}`);
    form.append("model", "whisper-large-v3");
    form.append("language", "pt");
    form.append("response_format", "text");
    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }
  function getSupportedMimeType() {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4"
    ];
    return types.find((t) => MediaRecorder.isTypeSupported(t)) || "";
  }
  function releaseStream() {
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }
    if (displayStream) {
      displayStream.getTracks().forEach((t) => t.stop());
      displayStream = null;
    }
    if (audioCtx) {
      audioCtx.close().catch(() => {
      });
      audioCtx = null;
    }
    captureStream = null;
  }
  async function refineNotes({ meetingName, objective, userNotes, transcription }) {
    const key = getGroqKey();
    if (!key) throw new Error("NO_KEY");
    const prompt = `Voc\xEA \xE9 um assistente especializado em s\xEDntese de reuni\xF5es corporativas em portugu\xEAs brasileiro.

Sua tarefa \xE9 gerar notas estruturadas de reuni\xE3o a partir de dois insumos:
1. ANOTA\xC7\xD5ES DO USU\xC1RIO \u2014 fragmentos escritos manualmente durante a reuni\xE3o. Mesmo que curtos, incompletos ou em formato de bullet picado, representam o julgamento do usu\xE1rio sobre o que foi relevante. Trate-os como sinal de alta prioridade: todo ponto anotado pelo usu\xE1rio DEVE aparecer no output, expandido com contexto da transcri\xE7\xE3o quando dispon\xEDvel.
2. TRANSCRI\xC7\xC3O \u2014 registro do \xE1udio da reuni\xE3o. Use como contexto complementar para enriquecer, detalhar e preencher lacunas das anota\xE7\xF5es do usu\xE1rio.

Se apenas a transcri\xE7\xE3o estiver dispon\xEDvel (sem anota\xE7\xF5es), gere as notas integralmente a partir dela.

---

CONTEXTO DA REUNI\xC3O:
- Nome: ${meetingName}
- Objetivo: ${objective}

ANOTA\xC7\xD5ES DO USU\xC1RIO:
${userNotes?.trim() || "(nenhuma anota\xE7\xE3o)"}

TRANSCRI\xC7\xC3O:
${transcription?.trim() || "(nenhuma transcri\xE7\xE3o)"}

---

Gere o output obrigatoriamente nas 4 se\xE7\xF5es abaixo, na ordem apresentada. Se uma se\xE7\xE3o n\xE3o tiver conte\xFAdo identific\xE1vel, mantenha o cabe\xE7alho e escreva apenas: "Nenhum item identificado."

## Resumo executivo
S\xEDntese objetiva da reuni\xE3o em 3 a 5 frases. Cubra o contexto geral, o que foi tratado e o estado ao final. Tom neutro, terceira pessoa.

## Decis\xF5es tomadas
Liste apenas decis\xF5es concretas tomadas durante a reuni\xE3o. Use bullets. Se uma decis\xE3o tiver respons\xE1vel identific\xE1vel, inclua. Se n\xE3o, omita o campo de respons\xE1vel.
Exemplo de formato: "- Aprovada a migra\xE7\xE3o do m\xF3dulo X para o ambiente de produ\xE7\xE3o."

## Pr\xF3ximos passos
Liste a\xE7\xF5es com respons\xE1vel e prazo, quando identific\xE1veis. Use o formato:
"- [Respons\xE1vel] far\xE1 [a\xE7\xE3o] at\xE9 [prazo]."
Quando o respons\xE1vel n\xE3o for identific\xE1vel, use o placeholder [Respons\xE1vel].
Quando o prazo n\xE3o for identific\xE1vel, use o placeholder [prazo].
Exemplo: "- [Respons\xE1vel] enviar\xE1 an\xE1lise de casos afetados at\xE9 [prazo]."

## Pontos em aberto
Liste quest\xF5es, d\xFAvidas ou t\xF3picos que ficaram sem resolu\xE7\xE3o ou que precisam de acompanhamento. Use bullets. Se nenhum ponto em aberto for identificado, escreva: "Nenhum item identificado."

---

REGRAS DE QUALIDADE:
- Idioma: portugu\xEAs brasileiro em todo o output, incluindo os cabe\xE7alhos.
- Tom: neutro, terceira pessoa. N\xE3o use "eu", "voc\xEA" ou "n\xF3s".
- Tamanho: compacto. O output completo deve caber em meia p\xE1gina. Seja direto; elimine redund\xE2ncias.
- Nunca invente informa\xE7\xF5es que n\xE3o estejam nas anota\xE7\xF5es ou na transcri\xE7\xE3o.
- Nunca omita um ponto que foi anotado pelo usu\xE1rio, mesmo que pare\xE7a trivial.
- N\xE3o inclua introdu\xE7\xF5es, sauda\xE7\xF5es ou explica\xE7\xF5es sobre o que voc\xEA fez. Retorne apenas as 4 se\xE7\xF5es.`;
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2048
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  }

  // dev/js/app.js
  var meetings = /* @__PURE__ */ new Map();
  var lastSavedContent = /* @__PURE__ */ new Map();
  var transcriptionSegments = /* @__PURE__ */ new Map();
  var autoSaveTimer = null;
  var renameDebounce = null;
  var contextItem = null;
  var createSubfolderIn = null;
  var currentDragData = null;
  var activeTxTabId = null;
  async function init() {
    applyTheme(localStorage.getItem("notesai-theme") || "light");
    await initStorage();
    setupThemeToggle();
    setupModals();
    setupFolderColorPicker();
    initTabs({ onSwitch: handleTabSwitch, onClose: handleTabClose, onNew: () => createMeeting() });
    initEditor({ onChange: () => {
    } });
    setupMeetingHeader();
    setupBottomBar();
    setupSidebar();
    setupSidebarResize();
    setupEditorWrapClick();
    document.addEventListener("dragend", () => {
      currentDragData = null;
    });
    const setupDone = localStorage.getItem("notesai-setup-done");
    if (!setupDone) {
      showModal("onboarding");
      return;
    }
    const restored = await restoreRootFolder();
    if (!restored) {
      const folderName = getRootFolderName();
      if (folderName) {
        document.getElementById("reauth-folder-name").textContent = folderName;
        showModal("reauth");
      } else {
        showModal("onboarding");
      }
    } else {
      await afterFolderSelected();
    }
  }
  async function afterFolderSelected() {
    await refreshDirectoryTree();
    await restoreTabState();
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.getElementById("theme-icon").textContent = theme === "dark" ? "\u{1F319}" : "\u2600\uFE0F";
    localStorage.setItem("notesai-theme", theme);
  }
  function setupThemeToggle() {
    document.getElementById("btn-theme-toggle").addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme");
      applyTheme(cur === "dark" ? "light" : "dark");
    });
  }
  function showModal(name) {
    document.getElementById("modal-overlay").classList.remove("hidden");
    document.getElementById("modal-overlay").querySelectorAll(".modal").forEach((m) => m.classList.add("hidden"));
    document.getElementById(`modal-${name}`)?.classList.remove("hidden");
  }
  function hideModal() {
    document.getElementById("modal-overlay").classList.add("hidden");
    document.getElementById("modal-overlay").querySelectorAll(".modal").forEach((m) => m.classList.add("hidden"));
  }
  function setupModals() {
    const goToStep2 = () => {
      const key = document.getElementById("input-groq-key").value.trim();
      if (key) saveGroqKey(key);
      document.getElementById("input-groq-key").value = "";
      document.getElementById("onboarding-step-1").classList.add("hidden");
      document.getElementById("onboarding-step-2").classList.remove("hidden");
      document.querySelectorAll(".step-dot").forEach((d, i) => d.classList.toggle("active", i === 1));
    };
    document.getElementById("btn-onboarding-next").addEventListener("click", goToStep2);
    document.getElementById("btn-onboarding-skip-groq").addEventListener("click", goToStep2);
    document.getElementById("input-groq-key").addEventListener("keydown", (e) => {
      if (e.key === "Enter") goToStep2();
    });
    document.getElementById("btn-select-folder").addEventListener("click", async () => {
      const handle = await requestRootFolder();
      if (handle) {
        hideModal();
        await afterFolderSelected();
      }
    });
    document.getElementById("btn-reauth-folder").addEventListener("click", async () => {
      const handle = await requestRootFolder();
      if (handle) {
        hideModal();
        await afterFolderSelected();
      }
    });
    document.getElementById("btn-new-folder-cancel").addEventListener("click", () => {
      createSubfolderIn = null;
      hideModal();
    });
    document.getElementById("btn-new-folder-confirm").addEventListener("click", handleCreateFolder);
    document.getElementById("input-folder-name").addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleCreateFolder();
    });
    document.getElementById("btn-item-actions-cancel").addEventListener("click", () => {
      contextItem = null;
      hideModal();
    });
    document.getElementById("btn-action-rename").addEventListener("click", () => {
      if (!contextItem) return;
      const current = contextItem.kind === "file" ? contextItem.filename.replace(/\.(md|txt)$/, "").replace(/_/g, " ").replace(/^\d{4}-\d{2}-\d{2}_/, "") : contextItem.name;
      document.getElementById("rename-item-title").textContent = contextItem.kind === "file" ? "Renomear arquivo" : "Renomear pasta";
      document.getElementById("input-rename-value").value = current;
      showModal("rename-item");
      setTimeout(() => {
        const inp = document.getElementById("input-rename-value");
        inp.focus();
        inp.select();
      }, 100);
    });
    document.getElementById("btn-action-subfolder").addEventListener("click", () => {
      if (!contextItem || contextItem.kind !== "folder") return;
      createSubfolderIn = contextItem;
      document.getElementById("new-folder-title").textContent = `Nova subpasta em "${contextItem.name}"`;
      document.getElementById("input-folder-name").value = "";
      document.querySelectorAll("#folder-color-picker .color-swatch").forEach((s, i) => s.classList.toggle("selected", i === 0));
      showModal("new-folder");
      setTimeout(() => document.getElementById("input-folder-name").focus(), 100);
    });
    document.getElementById("btn-action-delete").addEventListener("click", () => {
      if (!contextItem) return;
      const isFile = contextItem.kind === "file";
      const label = isFile ? `"${contextItem.filename}"` : `a pasta "${contextItem.name}" e todo o seu conte\xFAdo`;
      document.getElementById("modal-confirm-title").textContent = isFile ? "Excluir arquivo" : "Excluir pasta";
      document.getElementById("modal-confirm-desc").textContent = `Deseja excluir ${label}? Esta a\xE7\xE3o n\xE3o pode ser desfeita.`;
      const okBtn = document.getElementById("btn-confirm-ok");
      okBtn.textContent = "Excluir";
      okBtn.className = "btn btn-danger";
      const doDelete = async () => {
        okBtn.removeEventListener("click", doDelete);
        await executeDeleteItem();
      };
      okBtn.addEventListener("click", doDelete);
      document.getElementById("btn-confirm-cancel").addEventListener("click", () => {
        okBtn.removeEventListener("click", doDelete);
      }, { once: true });
      showModal("confirm");
    });
    document.getElementById("btn-rename-cancel").addEventListener("click", () => {
      contextItem = null;
      hideModal();
    });
    document.getElementById("btn-rename-confirm").addEventListener("click", executeRenameItem);
    document.getElementById("input-rename-value").addEventListener("keydown", (e) => {
      if (e.key === "Enter") executeRenameItem();
    });
    document.getElementById("btn-confirm-cancel").addEventListener("click", hideModal);
    document.getElementById("btn-shortcuts-close").addEventListener("click", hideModal);
    document.getElementById("btn-shortcuts-help").addEventListener("click", () => showModal("shortcuts"));
  }
  function setupFolderColorPicker() {
    document.getElementById("folder-color-picker").addEventListener("click", (e) => {
      const swatch = e.target.closest(".color-swatch");
      if (!swatch) return;
      document.querySelectorAll("#folder-color-picker .color-swatch").forEach((s) => s.classList.remove("selected"));
      swatch.classList.add("selected");
    });
  }
  function getSelectedFolderColor() {
    return document.querySelector("#folder-color-picker .color-swatch.selected")?.dataset.color || "#6b7280";
  }
  function formatMeetingDate(date) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }
  async function createMeeting(folderPath = null) {
    if (getTabCount() >= 8) return;
    const now = /* @__PURE__ */ new Date();
    const hh2 = now.getHours().toString().padStart(2, "0");
    const mm2 = now.getMinutes().toString().padStart(2, "0");
    const dd2 = now.getDate().toString().padStart(2, "0");
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const year = now.getFullYear();
    const id2 = `meeting-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const defaultName = `Reuni\xE3o em ${dd2}/${month}/${year} \xE0s ${hh2}:${mm2}`;
    const folder = folderPath || "";
    const rawFilename = buildDefaultFilename(now);
    const relativePath = folder ? `${folder}/${rawFilename}` : rawFilename;
    const filename = await resolveUniqueFilename(relativePath);
    const meeting = { id: id2, name: defaultName, objective: "", filename, createdAt: now, folder, isDefaultName: true };
    meetings.set(id2, meeting);
    if (hasRootFolder()) {
      const initial = buildMdContent(meeting, "");
      await writeFile(filename, initial).catch(console.error);
      lastSavedContent.set(id2, initial);
      await refreshDirectoryTree();
    } else {
      const initial = buildMdContent(meeting, "");
      await idbSave(id2, { content: initial, filename });
      lastSavedContent.set(id2, initial);
    }
    addTab({ id: id2, name: defaultName });
    loadMeetingIntoHeader(id2);
    clearEditor();
    setTimeout(() => focusEditor(), 50);
    startAutoSave();
    persistTabState();
    return id2;
  }
  function buildMdContent(meeting, editorMd) {
    const lines = [
      `# ${meeting.name}`,
      `**Data:** ${formatMeetingDate(meeting.createdAt)}`
    ];
    if (meeting.objective) lines.push(`**Objetivo:** ${meeting.objective}`);
    lines.push("", "---", "", editorMd || "");
    return lines.join("\n").trimEnd() + "\n";
  }
  function persistTabState() {
    try {
      const state = getAllTabs().map((t) => {
        const m = meetings.get(t.id);
        return { filename: m?.filename || "", name: t.name };
      }).filter((s) => s.filename);
      const activeMeeting = meetings.get(getActiveTabId());
      localStorage.setItem("notesai-tab-state", JSON.stringify({
        tabs: state,
        activeFilename: activeMeeting?.filename || ""
      }));
    } catch {
    }
  }
  async function restoreTabState() {
    try {
      const raw = localStorage.getItem("notesai-tab-state");
      if (!raw) return false;
      const { tabs: saved, activeFilename } = JSON.parse(raw);
      if (!Array.isArray(saved) || saved.length === 0) return false;
      let activeId = null;
      let restoredCount = 0;
      for (const s of saved) {
        if (!s.filename) continue;
        try {
          const content = await readFile(s.filename);
          const id2 = `meeting-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const nameLine = content.split("\n").find((l) => l.startsWith("# "));
          const name = nameLine ? nameLine.slice(2).trim() : s.name || s.filename;
          const objLine = content.split("\n").find((l) => l.startsWith("**Objetivo:**"));
          const objective = objLine ? objLine.replace("**Objetivo:**", "").trim() : "";
          const parts = s.filename.split("/");
          const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : "";
          const meeting = { id: id2, name, objective, filename: s.filename, createdAt: /* @__PURE__ */ new Date(), folder, isDefaultName: false };
          meetings.set(id2, meeting);
          lastSavedContent.set(id2, content);
          addTab({ id: id2, name });
          restoredCount++;
          if (s.filename === activeFilename) activeId = id2;
        } catch {
        }
      }
      if (restoredCount === 0) return false;
      const targetId = activeId || meetings.keys().next().value;
      setActiveTab(targetId);
      await handleTabSwitch(targetId);
      return true;
    } catch {
      return false;
    }
  }
  function setupMeetingHeader() {
    const nameInput = document.getElementById("meeting-name-input");
    const objInput = document.getElementById("meeting-objective-input");
    nameInput.addEventListener("input", () => {
      const tabId = getActiveTabId();
      if (!tabId) return;
      const name = nameInput.value || "Nova reuni\xE3o";
      const meeting = meetings.get(tabId);
      if (!meeting) return;
      meeting.name = name;
      meeting.isDefaultName = false;
      updateTabName(tabId, name);
      updateMeetingData(tabId, { name });
      scheduleRename(tabId, meeting);
    });
    objInput.addEventListener("input", () => {
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
    document.getElementById("meeting-name-input").value = meeting.name;
    document.getElementById("meeting-date-display").textContent = formatMeetingDate(meeting.createdAt);
    document.getElementById("meeting-objective-input").value = meeting.objective || "";
    updateFinishButton();
  }
  function updateFinishButton() {
    const meeting = meetings.get(getActiveTabId());
    const btn = document.getElementById("btn-finish-notes");
    if (meeting?.finalized) {
      btn.disabled = true;
      btn.textContent = "\u2705 Conclu\xEDdo";
      btn.title = "Notas j\xE1 finalizadas";
      return;
    }
    const has = !!meeting?.objective?.trim();
    btn.disabled = !has;
    btn.textContent = "Finalizar notas";
    btn.title = has ? "Finalizar e refinar notas com IA" : "Preencha o objetivo da reuni\xE3o para finalizar";
  }
  function scheduleRename(tabId, meeting) {
    if (renameDebounce) clearTimeout(renameDebounce);
    renameDebounce = setTimeout(async () => {
      if (!hasRootFolder()) return;
      const newFilename = buildFilename(meeting.createdAt, meeting.name);
      const folder = meeting.folder || "";
      const newRelative = folder ? `${folder}/${newFilename}` : newFilename;
      if (newRelative === meeting.filename) return;
      try {
        const resolved = await resolveUniqueFilename(newRelative);
        await renameFile(meeting.filename, resolved);
        meeting.filename = resolved;
        lastSavedContent.delete(tabId);
        await refreshDirectoryTree();
        persistTabState();
      } catch (err) {
        console.error("Rename failed:", err);
      }
    }, 1e3);
  }
  function startAutoSave() {
    stopAutoSave();
    autoSaveTimer = setInterval(() => {
      const tabId = getActiveTabId();
      if (tabId) saveMeeting(tabId);
    }, 3e4);
  }
  function stopAutoSave() {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
      autoSaveTimer = null;
    }
  }
  async function saveMeeting(tabId) {
    const meeting = meetings.get(tabId);
    if (!meeting) return;
    const md2 = getMarkdown();
    const content = buildMdContent(meeting, md2);
    if (lastSavedContent.get(tabId) === content) return;
    if (hasRootFolder()) {
      try {
        await writeFile(meeting.filename, content);
        lastSavedContent.set(tabId, content);
        showAutosaveIndicator();
      } catch (err) {
        if (err.name === "NotFoundError") showFileNotFoundWarning(tabId, meeting, content);
        else await idbSave(tabId, { content, filename: meeting.filename });
      }
    } else {
      await idbSave(tabId, { content, filename: meeting.filename });
      lastSavedContent.set(tabId, content);
    }
  }
  function showAutosaveIndicator() {
    const el2 = document.getElementById("autosave-indicator");
    el2.classList.add("visible");
    setTimeout(() => el2.classList.remove("visible"), 2e3);
  }
  function showFileNotFoundWarning(tabId, meeting, content) {
    document.getElementById("modal-confirm-title").textContent = "Arquivo n\xE3o encontrado";
    document.getElementById("modal-confirm-desc").textContent = `"${meeting.filename}" n\xE3o foi encontrado. Deseja recriar?`;
    const okBtn = document.getElementById("btn-confirm-ok");
    okBtn.textContent = "Recriar";
    okBtn.className = "btn btn-primary";
    const recreate = async () => {
      await writeFile(meeting.filename, content).catch(console.error);
      lastSavedContent.set(tabId, content);
      hideModal();
      okBtn.removeEventListener("click", recreate);
      okBtn.textContent = "Confirmar";
      okBtn.className = "btn btn-danger";
    };
    okBtn.addEventListener("click", recreate);
    document.getElementById("btn-confirm-cancel").addEventListener("click", () => {
      okBtn.removeEventListener("click", recreate);
      okBtn.textContent = "Confirmar";
      okBtn.className = "btn btn-danger";
    }, { once: true });
    showModal("confirm");
  }
  async function handleTabSwitch(tabId) {
    if (tabId === null) {
      clearEditor();
      stopAutoSave();
      return;
    }
    const meeting = meetings.get(tabId);
    if (!meeting) return;
    loadMeetingIntoHeader(tabId);
    let fileContent = "";
    if (hasRootFolder()) {
      try {
        fileContent = await readFile(meeting.filename);
      } catch {
        const d = await idbLoad(tabId);
        if (d) fileContent = d.content;
      }
    } else {
      const d = await idbLoad(tabId);
      if (d) fileContent = d.content;
    }
    setContent(stripHeader(fileContent));
    setTimeout(() => focusEditor(), 50);
    startAutoSave();
    persistTabState();
    updateTranscriptionUI(tabId);
  }
  function handleTabClose(tabId) {
    if (tabId === activeTxTabId) {
      stopTranscription();
      activeTxTabId = null;
    }
    transcriptionSegments.delete(tabId);
    saveMeeting(tabId).catch(console.error);
    meetings.delete(tabId);
    lastSavedContent.delete(tabId);
    setTimeout(persistTabState, 0);
    return true;
  }
  function stripHeader(content) {
    if (!content?.trim()) return "";
    const lines = content.split("\n");
    let i = 0;
    if (lines[i]?.startsWith("# ")) i++;
    while (i < lines.length && (lines[i]?.startsWith("**") || lines[i] === "")) i++;
    if (lines[i] === "---") i++;
    while (i < lines.length && lines[i] === "") i++;
    return lines.slice(i).join("\n").trim();
  }
  function setupBottomBar() {
    document.getElementById("btn-finish-notes").addEventListener("click", handleFinishNotes);
    document.getElementById("btn-transcription").addEventListener("click", handleTranscriptionClick);
  }
  async function handleFinishNotes() {
    const tabId = getActiveTabId();
    if (!tabId) return;
    const meeting = meetings.get(tabId);
    if (!meeting?.objective?.trim()) return;
    const btn = document.getElementById("btn-finish-notes");
    btn.disabled = true;
    btn.textContent = "\u2728 Compilando...";
    if (tabId === activeTxTabId) {
      const stopDone = stopTranscription();
      activeTxTabId = null;
      updateTranscriptionUI(tabId);
      await Promise.race([stopDone, new Promise((r) => setTimeout(r, 1e4))]);
    }
    const userNotes = getMarkdown();
    const transcription = getTabTranscription(tabId);
    try {
      const refined = await refineNotes({
        meetingName: meeting.name,
        objective: meeting.objective,
        userNotes,
        transcription
      });
      const combined = userNotes.trimEnd() + "\n\n---\n\n" + refined;
      setContent(combined);
      meeting.finalized = true;
      await saveMeeting(tabId);
      btn.textContent = "\u2705 Conclu\xEDdo";
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "Finalizar notas";
      const msg = err.message?.includes("NO_KEY") ? "Chave Groq ausente. Configure nas op\xE7\xF5es." : "Erro ao refinar notas. Tente novamente.";
      showTranscriptionError(msg);
    }
  }
  async function handleTranscriptionClick() {
    const tabId = getActiveTabId();
    if (!tabId) return;
    const state = getTranscriptionState();
    if (state === "idle") {
      if (activeTxTabId && activeTxTabId !== tabId) {
        showTranscriptionError("Outra reuni\xE3o j\xE1 est\xE1 sendo gravada.");
        return;
      }
      if (!hasGroqKey()) {
        showTranscriptionError("Chave Groq ausente. Configure nas op\xE7\xF5es de onboarding.");
        return;
      }
      await startTranscription({
        onSegment: (text) => {
          const segs = transcriptionSegments.get(tabId) || [];
          segs.push(text);
          transcriptionSegments.set(tabId, segs);
        },
        onError: (code) => {
          activeTxTabId = null;
          if (code === "PERMISSION_DENIED") {
            showTranscriptionError("Microfone bloqueado. Continue com anota\xE7\xF5es manuais.");
          } else if (code === "NO_KEY") {
            showTranscriptionError("Chave API inv\xE1lida. Verifique nas configura\xE7\xF5es.");
          } else if (code === "DISPLAY_DENIED") {
            showTranscriptionError('Compartilhe a tela e ative "Compartilhar \xE1udio do sistema" para gravar.');
          } else {
            showTranscriptionError("N\xE3o foi poss\xEDvel iniciar a grava\xE7\xE3o.");
          }
          updateTranscriptionUI(tabId);
        },
        onWarning: (code) => {
          if (code === "NO_SYSTEM_AUDIO") {
            showTranscriptionError("\xC1udio do sistema n\xE3o detectado \u2014 gravando somente microfone.");
          }
        }
      });
      if (getTranscriptionState() === "recording") {
        activeTxTabId = tabId;
      }
    } else if (state === "recording") {
      pauseTranscription();
    } else if (state === "paused") {
      resumeTranscription({
        onSegment: (text) => {
          const segs = transcriptionSegments.get(activeTxTabId) || [];
          segs.push(text);
          transcriptionSegments.set(activeTxTabId, segs);
        }
      });
    }
    updateTranscriptionUI(tabId);
  }
  function getTabTranscription(tabId) {
    return (transcriptionSegments.get(tabId) || []).join("\n\n");
  }
  function updateTranscriptionUI(tabId) {
    const btn = document.getElementById("btn-transcription");
    const indicator = document.getElementById("transcription-indicator");
    const pulseEl = document.getElementById("tx-pulse");
    const statusEl = document.getElementById("tx-status-text");
    if (!btn || !indicator) return;
    const state = getTranscriptionState();
    const isOwner = tabId === activeTxTabId;
    const otherOwner = activeTxTabId && !isOwner;
    btn.classList.remove("recording", "paused");
    btn.disabled = false;
    if (state === "recording" && isOwner) {
      btn.textContent = "\u23F8 Pausar";
      btn.classList.add("recording");
      indicator.classList.remove("hidden", "paused");
      pulseEl.style.display = "";
      statusEl.textContent = "Transcrevendo...";
    } else if (state === "paused" && isOwner) {
      btn.textContent = "\u25B6 Retomar";
      btn.classList.add("paused");
      indicator.classList.remove("hidden");
      indicator.classList.add("paused");
      pulseEl.style.display = "none";
      statusEl.textContent = "Pausado";
    } else {
      btn.textContent = "\u{1F399} REC";
      btn.disabled = !!otherOwner;
      indicator.classList.add("hidden");
      indicator.classList.remove("paused");
    }
    const txState2 = getTranscriptionState();
    setTabRecording(txState2 !== "idle" ? activeTxTabId : null, txState2);
    updateSidebarRecDot();
  }
  function updateSidebarRecDot() {
    document.querySelectorAll(".sidebar-file .rec-dot").forEach((d) => {
      d.classList.add("hidden");
      d.classList.remove("paused");
    });
    if (!activeTxTabId) return;
    const txState2 = getTranscriptionState();
    if (txState2 === "idle") return;
    const recMeeting = meetings.get(activeTxTabId);
    if (!recMeeting?.filename) return;
    const recPath = recMeeting.folder ? `${recMeeting.folder}/${recMeeting.filename}` : recMeeting.filename;
    const fileEl = document.querySelector(`.sidebar-file[data-path="${CSS.escape(recPath)}"]`);
    if (!fileEl) return;
    const dot = fileEl.querySelector(".rec-dot");
    if (!dot) return;
    dot.classList.remove("hidden");
    if (txState2 === "paused") dot.classList.add("paused");
  }
  function showTranscriptionError(msg) {
    const area = document.getElementById("status-area");
    const el2 = document.createElement("span");
    el2.className = "tx-error-msg";
    el2.textContent = msg;
    area.prepend(el2);
    setTimeout(() => el2.remove(), 4e3);
  }
  function setupEditorWrapClick() {
    const wrap = document.getElementById("editor-wrap");
    let downX = 0, downY = 0;
    wrap.addEventListener("mousedown", (e) => {
      downX = e.clientX;
      downY = e.clientY;
    });
    wrap.addEventListener("click", (e) => {
      if (!getActiveTabId()) return;
      if (Math.abs(e.clientX - downX) > 4 || Math.abs(e.clientY - downY) > 4) return;
      focusAtCoords(e.clientX, e.clientY);
    });
  }
  function setupSidebar() {
    document.getElementById("btn-new-folder").addEventListener("click", () => {
      createSubfolderIn = null;
      document.getElementById("new-folder-title").textContent = "Nova pasta";
      document.getElementById("input-folder-name").value = "";
      document.querySelectorAll("#folder-color-picker .color-swatch").forEach((s, i) => s.classList.toggle("selected", i === 0));
      showModal("new-folder");
      setTimeout(() => document.getElementById("input-folder-name").focus(), 100);
    });
    setupRootDropZone(document.getElementById("directory-tree"));
  }
  async function handleCreateFolder() {
    const name = document.getElementById("input-folder-name").value.trim();
    if (!name || !hasRootFolder()) {
      createSubfolderIn = null;
      hideModal();
      return;
    }
    try {
      if (createSubfolderIn) {
        const existingEntries = await listDirectory(createSubfolderIn.handle);
        const subCount = existingEntries.filter((e) => e.kind === "directory").length;
        if (subCount >= MAX_SUBFOLDERS) {
          alert(`Esta pasta j\xE1 cont\xE9m ${MAX_SUBFOLDERS} subpastas. N\xE3o \xE9 poss\xEDvel adicionar mais.`);
          createSubfolderIn = null;
          hideModal();
          return;
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
    } catch (err) {
      console.error("Create folder failed:", err);
      createSubfolderIn = null;
      hideModal();
    }
  }
  function setupSidebarResize() {
    const sidebar = document.getElementById("sidebar");
    const handle = document.getElementById("sidebar-resize-handle");
    let dragging = false, startX = 0, startW = 0;
    handle.addEventListener("mousedown", (e) => {
      dragging = true;
      startX = e.clientX;
      startW = sidebar.offsetWidth;
      handle.classList.add("dragging");
      document.body.style.cssText += ";cursor:col-resize;user-select:none";
      e.preventDefault();
    });
    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const min = window.innerWidth * 0.15;
      const max = window.innerWidth * 0.4;
      const w = Math.max(min, Math.min(max, startW + (e.clientX - startX)));
      sidebar.style.width = w + "px";
      sidebar.style.minWidth = w + "px";
    });
    document.addEventListener("mouseup", () => {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    });
  }
  async function refreshDirectoryTree() {
    if (!hasRootFolder()) return;
    const tree = document.getElementById("directory-tree");
    tree.innerHTML = "";
    try {
      const cfg = await loadConfig();
      const entries = await listDirectory();
      const activeMeeting = meetings.get(getActiveTabId());
      for (const entry of entries) {
        if (entry.kind === "directory") {
          const color = cfg.folderColors?.[entry.name] || "#6b7280";
          tree.appendChild(await createFolderElement(
            entry.name,
            color,
            entry.handle,
            cfg,
            activeMeeting,
            0,
            "",
            getRootHandle()
          ));
        } else {
          tree.appendChild(createFileElement(entry.name, "", activeMeeting));
        }
      }
      updateSidebarRecDot();
    } catch (err) {
      console.error("Directory refresh failed:", err);
    }
  }
  function setupRootDropZone(tree) {
    tree.addEventListener("dragover", (e) => {
      if (e.target.closest(".sidebar-item")) return;
      const lastChild = tree.lastElementChild;
      if (lastChild) {
        const rect = lastChild.getBoundingClientRect();
        if (e.clientY <= rect.bottom) {
          tree.classList.remove("drag-over-root");
          return;
        }
      }
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      tree.classList.add("drag-over-root");
    });
    tree.addEventListener("dragleave", (e) => {
      if (!tree.contains(e.relatedTarget)) tree.classList.remove("drag-over-root");
    });
    tree.addEventListener("drop", (e) => {
      if (e.target.closest(".sidebar-item")) return;
      e.preventDefault();
      tree.classList.remove("drag-over-root");
      if (currentDragData) handleDropToRoot(currentDragData);
    });
  }
  async function createFolderElement(name, color, handle, cfg, activeMeeting, depth, parentPath, ownParentHandle) {
    const wrapper = document.createElement("div");
    const folderRow = document.createElement("div");
    folderRow.className = "sidebar-item sidebar-folder";
    folderRow.style.paddingLeft = `${12 + depth * 14}px`;
    folderRow.dataset.folder = name;
    const toggle = document.createElement("span");
    toggle.className = "sidebar-toggle";
    toggle.textContent = "\u25BE";
    const dragHandle = document.createElement("span");
    dragHandle.className = "folder-drag-handle";
    dragHandle.setAttribute("draggable", "true");
    dragHandle.title = "Arrastar para mover pasta";
    dragHandle.addEventListener("dragstart", (e) => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = "move";
      currentDragData = { kind: "folder", name, depth, parentPath, parentHandle: ownParentHandle };
      e.dataTransfer.setData("text/plain", JSON.stringify({ kind: "folder", name, depth, parentPath }));
    });
    const dot = document.createElement("span");
    dot.className = "folder-color-dot";
    dot.style.background = color;
    const icon = document.createElement("span");
    icon.className = "folder-icon";
    icon.textContent = "\u{1F4C1}";
    dragHandle.append(dot, icon);
    const nameEl = document.createElement("span");
    nameEl.className = "sidebar-item-name";
    nameEl.textContent = name;
    const menuBtn = document.createElement("button");
    menuBtn.className = "sidebar-item-menu";
    menuBtn.textContent = "\u205D";
    menuBtn.title = "A\xE7\xF5es";
    menuBtn.setAttribute("aria-label", "A\xE7\xF5es da pasta");
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const fullPath2 = parentPath ? `${parentPath}/${name}` : name;
      contextItem = { kind: "folder", name, handle, parentHandle: ownParentHandle || getRootHandle(), depth, parentPath, fullPath: fullPath2 };
      document.getElementById("item-actions-title").textContent = `\u{1F4C1} ${name}`;
      document.getElementById("btn-action-subfolder").style.display = depth < MAX_FOLDER_DEPTH ? "" : "none";
      showModal("item-actions");
    });
    folderRow.append(toggle, dragHandle, nameEl, menuBtn);
    const children = document.createElement("div");
    children.className = "folder-children";
    const entries = await listDirectory(handle).catch(() => []);
    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    const folderStateMap = JSON.parse(localStorage.getItem("notesai-folder-state") || "{}");
    if (folderStateMap[fullPath]) folderRow.classList.add("collapsed");
    const subfolderCount = entries.filter((e) => e.kind === "directory").length;
    folderRow.dataset.subfolderCount = subfolderCount;
    for (const entry of entries) {
      if (entry.kind === "file") {
        children.appendChild(createFileElement(entry.name, fullPath, activeMeeting, depth + 1));
      } else if (entry.kind === "directory" && depth < MAX_FOLDER_DEPTH) {
        const subColor = cfg.folderColors?.[`${fullPath}/${entry.name}`] || cfg.folderColors?.[entry.name] || "#6b7280";
        children.appendChild(await createFolderElement(
          entry.name,
          subColor,
          entry.handle,
          cfg,
          activeMeeting,
          depth + 1,
          fullPath,
          handle
        ));
      }
    }
    folderRow.addEventListener("click", (e) => {
      if (menuBtn.contains(e.target) || dragHandle.contains(e.target)) return;
      folderRow.classList.toggle("collapsed");
      const state = JSON.parse(localStorage.getItem("notesai-folder-state") || "{}");
      state[fullPath] = folderRow.classList.contains("collapsed");
      localStorage.setItem("notesai-folder-state", JSON.stringify(state));
    });
    folderRow.addEventListener("dragover", (e) => {
      e.stopPropagation();
      const isFolderDrag = currentDragData?.kind === "folder";
      if (isFolderDrag) {
        const count = parseInt(folderRow.dataset.subfolderCount || "0");
        const srcFullPath = currentDragData.parentPath ? `${currentDragData.parentPath}/${currentDragData.name}` : currentDragData.name;
        const isSelf = srcFullPath === fullPath;
        const isDescendant = fullPath.startsWith(srcFullPath + "/");
        if (count >= MAX_SUBFOLDERS || isSelf || isDescendant || depth >= MAX_FOLDER_DEPTH) {
          folderRow.classList.add("drag-forbidden");
          folderRow.classList.remove("drag-over");
          return;
        }
      }
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      folderRow.classList.add("drag-over");
      folderRow.classList.remove("drag-forbidden");
    });
    folderRow.addEventListener("dragleave", () => {
      folderRow.classList.remove("drag-over", "drag-forbidden");
    });
    folderRow.addEventListener("drop", (e) => {
      e.stopPropagation();
      e.preventDefault();
      folderRow.classList.remove("drag-over", "drag-forbidden");
      let data;
      try {
        data = JSON.parse(e.dataTransfer.getData("text/plain"));
      } catch {
        return;
      }
      if (data.kind === "folder") {
        const srcFullPath = data.parentPath ? `${data.parentPath}/${data.name}` : data.name;
        if (srcFullPath !== fullPath) handleFolderDrop(data.name, fullPath, handle);
      } else {
        handleFileDrop(data, fullPath);
      }
    });
    wrapper.append(folderRow, children);
    return wrapper;
  }
  function createFileElement(filename, folder, activeMeeting, depth = 0) {
    const ext = filename.endsWith(".txt") ? " .txt" : "";
    const displayName = filename.replace(/^\d{4}-\d{2}-\d{2}_/, "").replace(/_/g, " ").replace(/\.(md|txt)$/, "") + ext;
    const el2 = document.createElement("div");
    el2.className = "sidebar-item sidebar-file";
    el2.style.paddingLeft = `${28 + depth * 14}px`;
    el2.dataset.filename = filename;
    el2.dataset.folder = folder;
    el2.dataset.path = folder ? `${folder}/${filename}` : filename;
    el2.title = displayName;
    const recDot = document.createElement("span");
    recDot.className = "rec-dot hidden";
    const nameEl = document.createElement("span");
    nameEl.className = "sidebar-item-name";
    nameEl.textContent = displayName;
    const menuBtn = document.createElement("button");
    menuBtn.className = "sidebar-item-menu";
    menuBtn.textContent = "\u205D";
    menuBtn.title = "A\xE7\xF5es";
    menuBtn.setAttribute("aria-label", "A\xE7\xF5es do arquivo");
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      contextItem = { kind: "file", filename, folder, relativePath: folder ? `${folder}/${filename}` : filename };
      document.getElementById("item-actions-title").textContent = `\u{1F4C4} ${displayName}`;
      document.getElementById("btn-action-subfolder").style.display = "none";
      showModal("item-actions");
    });
    el2.appendChild(recDot);
    el2.appendChild(nameEl);
    el2.appendChild(menuBtn);
    const relativePath = folder ? `${folder}/${filename}` : filename;
    if (activeMeeting?.filename === relativePath) el2.classList.add("active");
    el2.setAttribute("draggable", "true");
    el2.addEventListener("dragstart", (e) => {
      e.stopPropagation();
      currentDragData = { kind: "file", filename, folder };
      e.dataTransfer.setData("text/plain", JSON.stringify({ kind: "file", filename, folder }));
    });
    el2.addEventListener("click", (e) => {
      if (menuBtn.contains(e.target)) return;
      openMeetingFile(filename, folder);
    });
    return el2;
  }
  async function executeRenameItem() {
    const newName = document.getElementById("input-rename-value").value.trim();
    if (!newName || !contextItem) {
      hideModal();
      return;
    }
    if (contextItem.kind === "file") {
      const ext = contextItem.filename.endsWith(".txt") ? ".txt" : ".md";
      const sanitized = newName.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_");
      const newFilename = `${sanitized}${ext}`;
      const folder = contextItem.folder || "";
      const newRelative = folder ? `${folder}/${newFilename}` : newFilename;
      try {
        const resolved = await resolveUniqueFilename(newRelative);
        await renameFile(contextItem.relativePath, resolved);
        for (const [id2, m] of meetings.entries()) {
          if (m.filename === contextItem.relativePath) {
            m.filename = resolved;
            updateTabName(id2, newName);
            updateMeetingData(id2, { name: newName });
            if (id2 === getActiveTabId()) loadMeetingIntoHeader(id2);
          }
        }
        persistTabState();
      } catch (err) {
        console.error("File rename failed:", err);
      }
    } else if (contextItem.kind === "folder") {
      try {
        await renameFolder(contextItem.name, newName, contextItem.parentHandle);
        for (const [id2, m] of meetings.entries()) {
          if (m.folder === contextItem.fullPath || m.folder.startsWith(contextItem.fullPath + "/")) {
            m.folder = m.folder.replace(contextItem.fullPath, newName);
            m.filename = m.filename.replace(contextItem.fullPath + "/", newName + "/");
            if (id2 === getActiveTabId()) loadMeetingIntoHeader(id2);
          }
        }
        persistTabState();
      } catch (err) {
        console.error("Folder rename failed:", err);
      }
    }
    contextItem = null;
    hideModal();
    await refreshDirectoryTree();
  }
  async function executeDeleteItem() {
    if (!contextItem) {
      hideModal();
      return;
    }
    if (contextItem.kind === "file") {
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
      } catch (err) {
        console.error("Delete file failed:", err);
      }
    } else if (contextItem.kind === "folder") {
      try {
        await deleteDirectory(contextItem.name, contextItem.parentHandle);
        for (const [tabId, m] of [...meetings.entries()]) {
          if (m.folder === contextItem.fullPath || m.folder.startsWith(contextItem.fullPath + "/") || m.filename.startsWith(contextItem.fullPath + "/")) {
            meetings.delete(tabId);
            lastSavedContent.delete(tabId);
            closeTab(tabId);
          }
        }
      } catch (err) {
        console.error("Delete folder failed:", err);
      }
    }
    contextItem = null;
    hideModal();
    await refreshDirectoryTree();
    persistTabState();
  }
  async function handleFolderDrop(srcName, destFullPath, destHandle) {
    const srcParentPath = currentDragData?.parentPath || "";
    const srcFullPath = srcParentPath ? `${srcParentPath}/${srcName}` : srcName;
    if (srcFullPath === destFullPath || destFullPath.startsWith(srcFullPath + "/")) return;
    try {
      const srcParentHandle = currentDragData?.parentHandle || getRootHandle();
      await moveFolderBetweenDirs(srcName, srcParentHandle, destHandle, srcParentPath, destFullPath);
      const newBase = `${destFullPath}/${srcName}`;
      for (const [id2, m] of meetings.entries()) {
        if (m.folder === srcFullPath || m.folder.startsWith(srcFullPath + "/")) {
          const newFolder = m.folder === srcFullPath ? newBase : m.folder.replace(srcFullPath, newBase);
          const newFilename = m.filename.replace(m.folder, newFolder);
          m.folder = newFolder;
          m.filename = newFilename;
          if (id2 === getActiveTabId()) loadMeetingIntoHeader(id2);
        }
      }
      persistTabState();
      await refreshDirectoryTree();
    } catch (err) {
      if (err.message === "MAX_SUBFOLDERS") {
        alert("Esta pasta j\xE1 cont\xE9m 3 subpastas. N\xE3o \xE9 poss\xEDvel mover para dentro dela.");
      } else {
        console.error("Move folder failed:", err);
      }
    }
  }
  async function handleDropToRoot(data) {
    if (!data) return;
    if (data.kind === "file") {
      if (!data.folder) return;
      const srcPath = `${data.folder}/${data.filename}`;
      const destPath = data.filename;
      try {
        await renameFile(srcPath, destPath);
        for (const [, m] of meetings.entries()) {
          if (m.filename === srcPath) {
            m.filename = destPath;
            m.folder = "";
          }
        }
        persistTabState();
        await refreshDirectoryTree();
      } catch (err) {
        console.error("Move file to root failed:", err);
      }
    } else if (data.kind === "folder" && data.depth > 0) {
      try {
        await moveFolderBetweenDirs(data.name, currentDragData?.parentHandle || getRootHandle(), getRootHandle(), data.parentPath || "", "");
        for (const [id2, m] of meetings.entries()) {
          if (m.folder === data.name || m.folder.startsWith(data.name + "/") || m.folder === `${data.parentPath}/${data.name}` || m.folder.startsWith(`${data.parentPath}/${data.name}/`)) {
            const oldBase = data.parentPath ? `${data.parentPath}/${data.name}` : data.name;
            const newBase = data.name;
            m.folder = m.folder.replace(oldBase, newBase);
            m.filename = m.filename.replace(oldBase + "/", newBase + "/");
            if (id2 === getActiveTabId()) loadMeetingIntoHeader(id2);
          }
        }
        persistTabState();
        await refreshDirectoryTree();
      } catch (err) {
        console.error("Move folder to root failed:", err);
      }
    }
  }
  async function handleFileDrop(data, targetFolder) {
    const { filename, folder: src } = data;
    const srcPath = src ? `${src}/${filename}` : filename;
    const destPath = `${targetFolder}/${filename}`;
    if (srcPath === destPath) return;
    try {
      await renameFile(srcPath, destPath);
      for (const [, m] of meetings.entries()) {
        if (m.filename === srcPath) {
          m.filename = destPath;
          m.folder = targetFolder;
        }
      }
      persistTabState();
      await refreshDirectoryTree();
    } catch (err) {
      console.error("Move file failed:", err);
    }
  }
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
      alert("Limite de 8 abas atingido. Feche uma aba para abrir este arquivo.");
      return;
    }
    try {
      const content = await readFile(relativePath);
      const id2 = `meeting-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const nameLine = content.split("\n").find((l) => l.startsWith("# "));
      const name = nameLine ? nameLine.slice(2).trim() : filename.replace(/\.(md|txt)$/, "").replace(/_/g, " ");
      const objLine = content.split("\n").find((l) => l.startsWith("**Objetivo:**"));
      const objective = objLine ? objLine.replace("**Objetivo:**", "").trim() : "";
      const meeting = { id: id2, name, objective, filename: relativePath, createdAt: /* @__PURE__ */ new Date(), folder, isDefaultName: false };
      meetings.set(id2, meeting);
      lastSavedContent.set(id2, content);
      addTab({ id: id2, name });
      await handleTabSwitch(id2);
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideModal();
      document.activeElement?.blur();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      const tabId = getActiveTabId();
      if (tabId) saveMeeting(tabId);
    }
  });
  document.getElementById("editor-wrap")?.addEventListener("blur", () => {
    const tabId = getActiveTabId();
    if (tabId) saveMeeting(tabId).catch(console.error);
  }, true);
  init().catch((err) => console.error("NotesAI init failed:", err));
  return __toCommonJS(app_exports);
})();
