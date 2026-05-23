import {
  Editor,
  Extension,
  StarterKit,
  Underline,
  Highlight,
  TaskList,
  TaskItem,
} from '../libs/tiptap.min.js';

let editor = null;
let onChangeCallback = null;

// ── Init ───────────────────────────────────────────────────

export function initEditor({ onChange } = {}) {
  onChangeCallback = onChange;
  editor = new Editor({
    element: document.getElementById('editor'),
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Highlight.configure({ multicolor: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: '',
    autofocus: false,
    editorProps: {
      attributes: { spellcheck: 'true', 'data-placeholder': 'Comece a digitar suas notas...' },
    },
    onUpdate: ({ editor: e }) => {
      if (onChangeCallback) onChangeCallback(serializeToMarkdown(e));
    },
  });
  setupKeyboardShortcuts();
  return editor;
}

// Explicit capture-phase handlers ensure Ctrl+B/I/U/Shift+H work reliably in IIFE bundle
function setupKeyboardShortcuts() {
  document.getElementById('editor').addEventListener('keydown', e => {
    if (!editor) return;
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    switch (e.key.toLowerCase()) {
      case 'b': e.preventDefault(); e.stopPropagation(); editor.commands.toggleBold();      return;
      case 'i': e.preventDefault(); e.stopPropagation(); editor.commands.toggleItalic();    return;
      case 'u': e.preventDefault(); e.stopPropagation(); editor.commands.toggleUnderline(); return;
    }
    if (e.shiftKey && e.key.toLowerCase() === 'h') {
      e.preventDefault(); e.stopPropagation(); editor.commands.toggleHighlight();
    }
  }, true);
}

// ── Public API ─────────────────────────────────────────────

export function focusEditor()   { editor?.commands.focus('end'); }
export function clearEditor()   { editor?.commands.clearContent(); }
export function destroyEditor() { editor?.destroy(); editor = null; }
export function isEditorEmpty() { return !editor?.getText().trim(); }
export function getMarkdown()   { return editor ? serializeToMarkdown(editor) : ''; }

export function setContent(content) {
  if (!editor) return;
  editor.commands.setContent(
    typeof content === 'string' ? markdownToTiptap(content) : content,
    false
  );
}

// ── Markdown serializer ────────────────────────────────────

function serializeToMarkdown(ed) { return nodesToMd(ed.getJSON().content || []); }
function nodesToMd(nodes)        { return nodes.map(nodeToMd).join(''); }

function nodeToMd(node) {
  switch (node.type) {
    case 'paragraph':      return inlineToMd(node.content) ? inlineToMd(node.content) + '\n\n' : '\n';
    case 'heading':        return '#'.repeat(node.attrs?.level || 1) + ' ' + inlineToMd(node.content) + '\n\n';
    case 'bulletList':     return (node.content || []).map(li => listItemToMd(li, '-', 0)).join('') + '\n';
    case 'orderedList':    return (node.content || []).map((li, i) => listItemToMd(li, `${i + 1}.`, 0)).join('') + '\n';
    case 'taskList':       return (node.content || []).map(li => taskItemToMd(li, 0)).join('') + '\n';
    case 'blockquote':     return nodesToMd(node.content || []).trimEnd().split('\n').map(l => '> ' + l).join('\n') + '\n\n';
    case 'codeBlock':      return '```' + (node.attrs?.language || '') + '\n' + (node.content || []).map(n => n.text || '').join('') + '\n```\n\n';
    case 'horizontalRule': return '---\n\n';
    case 'hardBreak':      return '  \n';
    default:               return '';
  }
}

function listItemToMd(li, marker, indent) {
  const prefix = '  '.repeat(indent);
  return (li.content || []).map(child => {
    if (child.type === 'paragraph')   return prefix + marker + ' ' + inlineToMd(child.content) + '\n';
    if (child.type === 'bulletList')  return (child.content || []).map(s => listItemToMd(s, '-', indent + 1)).join('');
    if (child.type === 'orderedList') return (child.content || []).map((s, i) => listItemToMd(s, `${i + 1}.`, indent + 1)).join('');
    if (child.type === 'taskList')    return (child.content || []).map(s => taskItemToMd(s, indent + 1)).join('');
    return '';
  }).join('');
}

function taskItemToMd(li, indent) {
  const prefix  = '  '.repeat(indent);
  const checked = li.attrs?.checked ? 'x' : ' ';
  return (li.content || []).filter(c => c.type === 'paragraph')
    .map(c => prefix + `- [${checked}] ` + inlineToMd(c.content) + '\n').join('')
    || prefix + `- [${checked}] \n`;
}

function inlineToMd(nodes) {
  return (nodes || []).map(n => {
    if (n.type === 'hardBreak') return '  \n';
    if (n.type !== 'text') return '';
    let t = n.text || '';
    for (const m of (n.marks || [])) {
      if (m.type === 'bold')      t = `**${t}**`;
      if (m.type === 'italic')    t = `*${t}*`;
      if (m.type === 'underline') t = `<u>${t}</u>`;
      if (m.type === 'highlight') t = `==${t}==`;
      if (m.type === 'code')      t = `\`${t}\``;
      if (m.type === 'strike')    t = `~~${t}~~`;
      if (m.type === 'link')      t = `[${t}](${m.attrs?.href || ''})`;
    }
    return t;
  }).join('');
}

// ── Markdown → Tiptap ──────────────────────────────────────

function markdownToTiptap(md) {
  if (!md?.trim()) return '';
  const lines = md.split('\n');
  const content = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const hm = line.match(/^(#{1,3})\s+(.+)/);
    if (hm) { content.push({ type: 'heading', attrs: { level: hm[1].length }, content: parseInline(hm[2]) }); i++; continue; }
    if (line.startsWith('```'))            { const r = collectCode(lines, i);         content.push(r.node); i = r.next; continue; }
    if (/^---+$/.test(line.trim()))        { content.push({ type: 'horizontalRule' }); i++; continue; }
    if (/^(\s*)- \[([ xX])\]/.test(line)) { const r = collectTaskList(lines, i);    content.push({ type: 'taskList',    content: r.items }); i = r.next; continue; }
    if (/^(\s*)[-*] /.test(line))          { const r = collectBulletList(lines, i);  content.push({ type: 'bulletList',  content: r.items }); i = r.next; continue; }
    if (/^(\s*)\d+\. /.test(line))         { const r = collectOrderedList(lines, i); content.push({ type: 'orderedList', content: r.items }); i = r.next; continue; }
    if (line.startsWith('> '))             { const r = collectBlockquote(lines, i);  content.push(r.node); i = r.next; continue; }
    if (!line.trim()) { i++; continue; }
    const paraLines = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) { paraLines.push(lines[i]); i++; }
    if (paraLines.length) content.push({ type: 'paragraph', content: parseInline(paraLines.join(' ')) });
  }
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
}

function isBlockStart(l) {
  return /^#{1,3}\s/.test(l) || /^[-*]\s/.test(l) || /^\d+\.\s/.test(l) ||
    l.startsWith('```') || l.startsWith('> ') || /^---+$/.test(l.trim()) || /^- \[[ xX]\]/.test(l);
}
function collectCode(lines, start) {
  const lang = lines[start].slice(3).trim(); let i = start + 1; const code = [];
  while (i < lines.length && !lines[i].startsWith('```')) { code.push(lines[i]); i++; }
  return { node: { type: 'codeBlock', attrs: { language: lang }, content: [{ type: 'text', text: code.join('\n') }] }, next: i + 1 };
}
function collectTaskList(lines, start) {
  const items = []; let i = start;
  while (i < lines.length) {
    const m = lines[i].match(/^(\s*)- \[([ xX])\] (.*)$/);
    if (!m) break;
    items.push({ type: 'taskItem', attrs: { checked: m[2].toLowerCase() === 'x' }, content: [{ type: 'paragraph', content: parseInline(m[3]) }] });
    i++;
  }
  return { items, next: i };
}
function collectBulletList(lines, start) {
  const items = []; let i = start;
  while (i < lines.length) {
    const m = lines[i].match(/^(\s*)[-*] (.+)/);
    if (!m) break;
    items.push({ type: 'listItem', content: [{ type: 'paragraph', content: parseInline(m[2]) }] });
    i++;
  }
  return { items, next: i };
}
function collectOrderedList(lines, start) {
  const items = []; let i = start;
  while (i < lines.length) {
    const m = lines[i].match(/^(\s*)\d+\. (.+)/);
    if (!m) break;
    items.push({ type: 'listItem', content: [{ type: 'paragraph', content: parseInline(m[2]) }] });
    i++;
  }
  return { items, next: i };
}
function collectBlockquote(lines, start) {
  const bq = []; let i = start;
  while (i < lines.length && lines[i].startsWith('> ')) { bq.push(lines[i].slice(2)); i++; }
  return { node: { type: 'blockquote', content: [{ type: 'paragraph', content: parseInline(bq.join(' ')) }] }, next: i };
}
function parseInline(text) {
  if (!text) return [];
  const nodes = []; const re = /(\*\*(.+?)\*\*|\*(.+?)\*|<u>(.+?)<\/u>|==(.+?)==|`(.+?)`)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push({ type: 'text', text: text.slice(last, m.index) });
    if      (m[2] !== undefined) nodes.push({ type: 'text', text: m[2], marks: [{ type: 'bold' }] });
    else if (m[3] !== undefined) nodes.push({ type: 'text', text: m[3], marks: [{ type: 'italic' }] });
    else if (m[4] !== undefined) nodes.push({ type: 'text', text: m[4], marks: [{ type: 'underline' }] });
    else if (m[5] !== undefined) nodes.push({ type: 'text', text: m[5], marks: [{ type: 'highlight' }] });
    else if (m[6] !== undefined) nodes.push({ type: 'text', text: m[6], marks: [{ type: 'code' }] });
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push({ type: 'text', text: text.slice(last) });
  return nodes.length ? nodes : [{ type: 'text', text }];
}
