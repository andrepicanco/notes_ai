// ── Groq API — Phase 2: Whisper transcription ─────────────

const KEY_STORAGE = 'notesai-groq-key';
const CHUNK_MS    = 5 * 60 * 1000; // 5 min per segment

let mediaStream   = null;  // microphone
let displayStream = null;  // screen share (system audio source)
let audioCtx      = null;  // AudioContext used to mix mic + system
let captureStream = null;  // stream actually fed to MediaRecorder
let mediaRecorder = null;
let chunks        = [];
let chunkTimer    = null;
let segmentCb     = null;
let txState       = 'idle'; // 'idle' | 'recording' | 'paused'

// ── Key management ─────────────────────────────────────────

export function saveGroqKey(key) { localStorage.setItem(KEY_STORAGE, key); }
export function getGroqKey()     { return localStorage.getItem(KEY_STORAGE) || ''; }
export function hasGroqKey()     { return !!getGroqKey(); }
export function clearGroqKey()   { localStorage.removeItem(KEY_STORAGE); }

// ── State ──────────────────────────────────────────────────

export function getTranscriptionState() { return txState; }

// ── Start ──────────────────────────────────────────────────

export async function startTranscription({ onSegment, onError, onWarning }) {
  if (txState !== 'idle') return;
  if (!hasGroqKey()) { onError('NO_KEY'); return; }

  // Step 1 — microphone
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    onError(err.name === 'NotAllowedError' ? 'PERMISSION_DENIED' : 'MEDIA_ERROR');
    return;
  }

  // Step 2 — system audio via screen share (user must enable "Share system audio")
  try {
    displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    displayStream.getVideoTracks().forEach(t => t.stop()); // video not needed

    const audioTracks = displayStream.getAudioTracks();
    if (audioTracks.length > 0) {
      audioCtx = new AudioContext();
      const dest   = audioCtx.createMediaStreamDestination();
      audioCtx.createMediaStreamSource(mediaStream).connect(dest);
      audioCtx.createMediaStreamSource(new MediaStream(audioTracks)).connect(dest);
      captureStream = dest.stream;
    } else {
      // Screen shared but audio not enabled
      onWarning?.('NO_SYSTEM_AUDIO');
      captureStream = mediaStream;
    }
  } catch (err) {
    // User cancelled the screen-share dialog → abort recording entirely
    releaseStream();
    onError(err.name === 'NotAllowedError' || err.name === 'AbortError'
      ? 'DISPLAY_DENIED' : 'MEDIA_ERROR');
    return;
  }

  segmentCb = onSegment;
  txState   = 'recording';
  beginSegment();
}

// ── Pause (discards current partial chunk) ─────────────────

export function pauseTranscription() {
  if (txState !== 'recording') return;
  txState = 'paused';
  clearTimeout(chunkTimer);
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.ondataavailable = () => {};
    mediaRecorder.onstop          = () => { chunks = []; };
    mediaRecorder.stop();
  } else {
    chunks = [];
  }
}

// ── Resume (starts a fresh chunk) ─────────────────────────

export function resumeTranscription({ onSegment }) {
  if (txState !== 'paused') return;
  segmentCb = onSegment;
  txState   = 'recording';
  beginSegment();
}

// ── Stop (transcribes final partial chunk, releases mic) ───
// Returns a Promise that resolves once the final chunk is transcribed (or immediately
// if nothing was recording). Callers that need the final segment should await this.

export function stopTranscription() {
  if (txState === 'idle') return Promise.resolve();
  clearTimeout(chunkTimer);
  const cb  = segmentCb;
  txState   = 'idle';
  segmentCb = null;

  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    chunks = [];
    releaseStream();
    return Promise.resolve();
  }

  return new Promise(resolve => {
    mediaRecorder.ondataavailable = e => { if (e.data?.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = async () => {
      const type    = mediaRecorder.mimeType;
      const pending = [...chunks];
      chunks = [];
      releaseStream();
      if (!pending.length || !cb) { resolve(); return; }
      try {
        const text = await transcribeBlob(new Blob(pending, { type }), type);
        if (text?.trim()) cb(text.trim());
      } catch {
        cb('[trecho não transcrito]');
      }
      resolve();
    };
    mediaRecorder.stop();
  });
}

// ── Internal ───────────────────────────────────────────────

function beginSegment() {
  chunks = [];
  const mimeType = getSupportedMimeType();
  try {
    mediaRecorder = new MediaRecorder(captureStream, mimeType ? { mimeType } : {});
  } catch {
    mediaRecorder = new MediaRecorder(captureStream);
  }
  mediaRecorder.ondataavailable = e => { if (e.data?.size > 0) chunks.push(e.data); };
  mediaRecorder.onstop = () => flushSegment(mediaRecorder.mimeType || mimeType);
  mediaRecorder.start();
  chunkTimer = setTimeout(rotateSegment, CHUNK_MS);
}

function rotateSegment() {
  if (txState !== 'recording' || !mediaRecorder || mediaRecorder.state !== 'recording') return;
  mediaRecorder.stop(); // fires onstop → flushSegment → Whisper API
  setTimeout(() => { if (txState === 'recording') beginSegment(); }, 200);
}

async function flushSegment(mimeType) {
  const cb = segmentCb;
  if (!chunks.length || !cb) { chunks = []; return; }
  const blob = new Blob(chunks, { type: mimeType });
  chunks = [];
  try {
    const text = await transcribeBlob(blob, mimeType);
    if (text?.trim()) cb(text.trim());
  } catch {
    cb('[trecho não transcrito]');
  }
}

async function transcribeBlob(blob, mimeType) {
  const key = getGroqKey();
  const ext  = mimeType?.includes('mp4') ? 'mp4'
             : mimeType?.includes('ogg') ? 'ogg'
             : 'webm';
  const form = new FormData();
  form.append('file', blob, `audio.${ext}`);
  form.append('model', 'whisper-large-v3');
  form.append('language', 'pt');
  form.append('response_format', 'text');
  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method:  'POST',
    headers: { Authorization: `Bearer ${key}` },
    body:    form,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
}

function releaseStream() {
  if (mediaStream)   { mediaStream.getTracks().forEach(t => t.stop());   mediaStream   = null; }
  if (displayStream) { displayStream.getTracks().forEach(t => t.stop()); displayStream = null; }
  if (audioCtx)      { audioCtx.close().catch(() => {});                 audioCtx      = null; }
  captureStream = null;
}

// ── Phase 3: LLM note refinement ──────────────────────────

export async function refineNotes({ meetingName, objective, userNotes, transcription }) {
  const key = getGroqKey();
  if (!key) throw new Error('NO_KEY');

  const prompt =
`Você é um assistente especializado em síntese de reuniões corporativas em português brasileiro.

Sua tarefa é gerar notas estruturadas de reunião a partir de dois insumos:
1. ANOTAÇÕES DO USUÁRIO — fragmentos escritos manualmente durante a reunião. Mesmo que curtos, incompletos ou em formato de bullet picado, representam o julgamento do usuário sobre o que foi relevante. Trate-os como sinal de alta prioridade: todo ponto anotado pelo usuário DEVE aparecer no output, expandido com contexto da transcrição quando disponível.
2. TRANSCRIÇÃO — registro do áudio da reunião. Use como contexto complementar para enriquecer, detalhar e preencher lacunas das anotações do usuário.

Se apenas a transcrição estiver disponível (sem anotações), gere as notas integralmente a partir dela.

---

CONTEXTO DA REUNIÃO:
- Nome: ${meetingName}
- Objetivo: ${objective}

ANOTAÇÕES DO USUÁRIO:
${userNotes?.trim() || '(nenhuma anotação)'}

TRANSCRIÇÃO:
${transcription?.trim() || '(nenhuma transcrição)'}

---

Gere o output obrigatoriamente nas 4 seções abaixo, na ordem apresentada. Se uma seção não tiver conteúdo identificável, mantenha o cabeçalho e escreva apenas: "Nenhum item identificado."

## Resumo executivo
Síntese objetiva da reunião em 3 a 5 frases. Cubra o contexto geral, o que foi tratado e o estado ao final. Tom neutro, terceira pessoa.

## Decisões tomadas
Liste apenas decisões concretas tomadas durante a reunião. Use bullets. Se uma decisão tiver responsável identificável, inclua. Se não, omita o campo de responsável.
Exemplo de formato: "- Aprovada a migração do módulo X para o ambiente de produção."

## Próximos passos
Liste ações com responsável e prazo, quando identificáveis. Use o formato:
"- [Responsável] fará [ação] até [prazo]."
Quando o responsável não for identificável, use o placeholder [Responsável].
Quando o prazo não for identificável, use o placeholder [prazo].
Exemplo: "- [Responsável] enviará análise de casos afetados até [prazo]."

## Pontos em aberto
Liste questões, dúvidas ou tópicos que ficaram sem resolução ou que precisam de acompanhamento. Use bullets. Se nenhum ponto em aberto for identificado, escreva: "Nenhum item identificado."

---

REGRAS DE QUALIDADE:
- Idioma: português brasileiro em todo o output, incluindo os cabeçalhos.
- Tom: neutro, terceira pessoa. Não use "eu", "você" ou "nós".
- Tamanho: compacto. O output completo deve caber em meia página. Seja direto; elimine redundâncias.
- Nunca invente informações que não estejam nas anotações ou na transcrição.
- Nunca omita um ponto que foi anotado pelo usuário, mesmo que pareça trivial.
- Não inclua introduções, saudações ou explicações sobre o que você fez. Retorne apenas as 4 seções.`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:  'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      messages:    [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens:  2048,
    }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}
