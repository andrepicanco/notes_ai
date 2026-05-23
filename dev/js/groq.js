// ── Groq API stub (Phase 1) ────────────────────────────────
// Full implementation in Phase 2 (Whisper) and Phase 3 (LLM refinement)

const KEY_STORAGE = 'notesai-groq-key';

export function saveGroqKey(key) {
  localStorage.setItem(KEY_STORAGE, key);
}

export function getGroqKey() {
  return localStorage.getItem(KEY_STORAGE) || '';
}

export function hasGroqKey() {
  return !!getGroqKey();
}

export function clearGroqKey() {
  localStorage.removeItem(KEY_STORAGE);
}

// Phase 3 placeholder
export async function refineNotes({ meetingName, objective, userNotes, transcription }) {
  throw new Error('Refinamento de notas disponível na Fase 3.');
}

// Phase 2 placeholder
export function startTranscription(onChunk) {
  throw new Error('Transcrição disponível na Fase 2.');
}

export function stopTranscription() {}
