const form = document.querySelector('#chat-form');
const input = document.querySelector('#message');
const log = document.querySelector('#messages');
const statusLine = document.querySelector('#status');
const send = document.querySelector('#send');
const clear = document.querySelector('#clear');
const retry = document.querySelector('#retry');
retry.addEventListener('click', () => form.requestSubmit());
let history = [];
let busy = false;
let sent = 0;
let era = '1999';
const eraToggle = document.querySelector('#era-toggle');
const eraCopy = [
  ['.topline span:first-child', '★ WELCOME TO THE WORLD WIDE WEB ★', 'CONNECTED TO THE FUTURE'],
  ['.topline span:last-child', 'FRIDAY, SEPTEMBER 24, 1999', 'SEPTEMBER 24, 2030'],
  ['h1', 'RetroChat™', 'NeoChat / 2030'],
  ['.brand p', 'The future can wait. Let’s talk.', 'The future is here. Explore a new dimension of conversation.'],
  ['.badge', '100% NOSTALGIA · 0% FUTURE', 'NEXT GENERATION / 2030'],
  ['.nav-right', '● 56K MODEM CLUB', '● NEURAL NETWORK / ONLINE'],
  ['.ticker', '✦ Your friendly corner of the web. Worth tying up the phone line. It’s 1999.', 'WELCOME TO 2030 / New ideas. New possibilities. Same curiosity.'],
  ['.stats span:nth-child(1) b', 'Internet cafe', 'Digital universe'],
  ['.stats span:nth-child(2) b', '1999', '2030'],
  ['.stats span:nth-child(3) b', '56 kbps', 'Hyperconnected'],
  ['.ad b', 'Best viewed with a cup of tea.', 'The next big idea starts with a conversation.'],
  ['.ad small', 'No cookies. Just biscuits.', 'Bring your curiosity to the future.'],
  ['.titlebar span:first-child', '▣ RetroChat.exe — chat room', '✧ NEOCHAT / TIME PORTAL'],
  ['.room small', "Connecting from 1999...", 'Online in a 2030 scenario'],
  ['.date', '──────── SEPTEMBER 24, 1999 ────────', 'SEPTEMBER 24, 2030 / NEW SESSION'],
  ['footer>div>b', 'WHEN THE INTERNET WAS SLOWER AND CONVERSATIONS LASTED LONGER.', 'LET’S IMAGINE THE FUTURE TOGETHER.'],
  ['footer p', '© 1999 RetroChat • A Python + FastAPI learning project. RetroBot roleplays 1999 and may make mistakes.', '© 2030 NeoChat • A Python + FastAPI learning project. 2030 is a fictional scenario; future details are speculative.'],
  ['.counter small', 'Best viewed in 800 × 600', 'Designed for the next era'],
  ['.taskbar>span', '▣ RetroChat.exe', '✧ NeoChat / 2030'],
];
const topics = [...document.querySelectorAll('[data-prompt]')];
const retroTopics = topics.map(button => [button.textContent, button.dataset.prompt]);
const modernTopics = [
  ['✧ Life in 2030', 'What do you imagine a day in 2030 could look like?'],
  ['◈ Artificial intelligence', 'What might we do with AI in a fictional 2030?'],
  ['⌘ Let’s code', 'Can you suggest a project for learning Python?'],
  ['↗ Tomorrow’s world', 'What might future cities look like?'],
];
const soundButton = document.querySelector('#sound-toggle');
const compareForm = document.querySelector('#compare-form');
const compareButton = document.querySelector('#compare-send');
const compareInput = document.querySelector('#compare-input');
const saveNote = document.querySelector('#save-note');
const STORAGE_KEY = 'retrochat.sessions.v1';
const sessions = {'1999': {messages: [], draft: ''}, '2030': {messages: [], draft: ''}};
let soundEnabled = false;
let audio;
let failedUser = null;
let failedBot = null;
let comparing = false;
let travelling = false;
let storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (saved && typeof saved === 'object') {
    for (const year of ['1999', '2030']) {
      const entries = saved[year]?.messages;
      if (Array.isArray(entries)) {
        const valid = entries.slice(-100).filter((m, i) => m && m.role === (i % 2 ? 'model' : 'user') && typeof m.text === 'string' && m.text.trim());
        if (valid.length % 2 === 0 && valid.every((m, i) => m.role === (i % 2 ? 'model' : 'user'))) {
          sessions[year].messages = valid.map(m => ({role: m.role, text: m.text.slice(0, 4000)}));
        }
      }
      sessions[year].draft = typeof saved[year]?.draft === 'string' ? saved[year].draft.slice(0, 4000) : '';
    }
    era = saved.era === '2030' ? '2030' : '1999';
    soundEnabled = saved.sound === true;
  }
} catch { storageAvailable = false; }

function persist() {
  if (!busy) sessions[era].draft = input.value;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({...sessions, era, sound: soundEnabled}));
    storageAvailable = true;
  } catch { storageAvailable = false; }
  saveNote.textContent = storageAvailable ? '✓ Chats are saved separately for each era in this browser. Clear chat only removes the current era.' : 'Storage is unavailable in this browser. Chats will last while this tab stays open.';
}

function playSound(kind) {
  if (!soundEnabled) return;
  try {
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) return;
    audio ||= new AudioEngine();
    void audio.resume().catch(() => {});
    const retro = era === '1999';
    const notes = kind === 'portal' ? (retro ? [1600, 800, 1200, 400] : [330, 494, 660, 988]) : kind === 'key' ? [retro ? 800 : 460] : [retro ? 1000 : 660, retro ? 700 : 880];
    notes.forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const start = audio.currentTime + index * .085;
      const duration = kind === 'key' ? .025 : .08;
      oscillator.type = retro ? 'square' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(kind === 'key' ? .012 : .035, start + .008);
      gain.gain.exponentialRampToValueAtTime(.001, start + duration);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(start); oscillator.stop(start + duration);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  } catch { /* Chat remains usable if audio is unavailable. */ }
}
function updateSound() {
  soundButton.textContent = soundEnabled ? '♫ Sound: on' : 'Sound: off';
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
}
soundButton.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  updateSound(); playSound('message'); persist();
});

function addMessage(text, role, error = false) {
  const article = document.createElement('article');
  article.className = `message ${role}${error ? ' error' : ''}`;
  const name = document.createElement('div');
  name.className = 'sender';
  name.textContent = role === 'user' ? 'GUEST_001' : 'RETROBOT';
  const time = document.createElement('time');
  time.textContent = new Date().toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});
  name.append(time);
  const p = document.createElement('p');
  p.textContent = text;
  article.append(name, p); log.append(article);
  log.scrollTop = log.scrollHeight;
  return article;
}
function renderEra() {
  const modern = era === '2030';
  document.body.classList.toggle('modern', modern);
  eraToggle.setAttribute('aria-pressed', String(modern));
  eraToggle.textContent = modern ? '↶ Back to 1999' : 'Modernize ↗ 2030';
  document.querySelector('#era-label').textContent = modern ? 'TIME PORTAL · 2030' : 'TIME CAPSULE · 1999';
  document.title = modern ? 'NeoChat • 2030' : 'RetroChat • 1999';
  eraCopy.forEach(([selector, retro, future]) => { document.querySelector(selector).textContent = modern ? future : retro; });
  topics.forEach((button, index) => {
    const [label, prompt] = (modern ? modernTopics : retroTopics)[index];
    button.textContent = label; button.dataset.prompt = prompt;
  });
  history = sessions[era].messages;
  sent = history.length / 2;
  input.value = sessions[era].draft;
  log.replaceChildren(); retry.hidden = true;
  failedUser = failedBot = null;
  addMessage(modern ? 'Welcome to 2030! ✧ A new era, new ideas. What shall we explore today?' : 'Hey, web traveler! Winamp is playing and my tea is ready. What shall we talk about in 1999?', 'bot');
  history.forEach(m => addMessage(m.text, m.role === 'model' ? 'bot' : 'user'));
  document.querySelector('#count').textContent = `${sent} messages sent`;
  statusLine.textContent = history.length ? `✓ ${era} chat restored.` : `✦ ${era} mode is ready to chat.`;
  document.querySelector('.window-foot span:last-child').textContent = modern ? '2030 scenario / speculation' : '1999 era check enabled';
}
function setBusy(value) {
  busy = value;
  send.disabled = clear.disabled = eraToggle.disabled = compareButton.disabled = value || comparing;
  input.readOnly = value;
  log.setAttribute('aria-busy', String(value));
}
eraToggle.addEventListener('click', async () => {
  if (busy || comparing || travelling) return;
  travelling = true; eraToggle.disabled = true;
  persist();
  const next = era === '1999' ? '2030' : '1999';
  const portal = document.querySelector('#time-portal');
  document.querySelector('#portal-year').textContent = next;
  portal.hidden = false;
  playSound('portal');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  await new Promise(resolve => setTimeout(resolve, reduced ? 0 : 480));
  era = next; renderEra(); persist();
  await new Promise(resolve => setTimeout(resolve, reduced ? 0 : 320));
  portal.hidden = true; travelling = false; eraToggle.disabled = false;
});

async function streamAnswer(messages, year, onDelta, onMeta = () => {}) {
  const response = await fetch('/api/chat/stream', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({messages, era: year}), signal: AbortSignal.timeout(95000),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Could not send your message.');
  }
  if (!response.body) throw new Error('Your browser does not support response streaming.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', answer = '', doneEvent = false;
  const consume = line => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.type === 'error') throw new Error(event.message);
    if (event.type === 'meta') onMeta(event);
    if (event.type === 'delta') { answer += event.text; onDelta(answer); }
    if (event.type === 'done') doneEvent = true;
  };
  try {
    while (true) {
      const {value, done} = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), {stream: !done});
      const lines = buffer.split('\n'); buffer = lines.pop();
      lines.forEach(consume);
      if (done) { if (buffer.trim()) consume(buffer); break; }
    }
    if (!doneEvent || !answer.trim()) throw new Error('The response was incomplete. Please retry.');
    return answer.trim();
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text || busy || comparing || travelling) return;
  failedUser?.remove(); failedBot?.remove(); failedUser = failedBot = null;
  setBusy(true); retry.hidden = true;
  const userNode = addMessage(text, 'user');
  input.value = ''; playSound('message');
  sessions[era].draft = text;
  // Failed or incomplete replies are never added to conversation history.
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({...sessions, era, sound: soundEnabled})); } catch {}
  statusLine.textContent = era === '2030' ? '✧ Connecting…' : '◌ Dialing in… Don’t pick up the phone!';
  const botNode = addMessage('', 'bot');
  botNode.classList.add('streaming');
  const messages = [...history.slice(-28), {role: 'user', text}];
  try {
    const answer = await streamAnswer(messages, era, answer => {
      botNode.querySelector('p').textContent = answer;
      log.scrollTop = log.scrollHeight;
      statusLine.textContent = '✦ Receiving response…';
    }, meta => {
      document.querySelector('.window-foot span:last-child').textContent = `${meta.model}${meta.fallback ? ' / alternate connection' : ''}`;
    });
    history = [...history, {role: 'user', text}, {role: 'model', text: answer.slice(0, 4000)}].slice(-100);
    sessions[era].messages = history;
    sessions[era].draft = '';
    sent = history.length / 2;
    document.querySelector('#count').textContent = `${sent} messages sent`;
    statusLine.textContent = era === '2030' ? '✧ Ready for your next idea.' : '✦ Message received. The line is still ours!';
    playSound('message'); persist();
  } catch (error) {
    botNode.classList.add('error');
    botNode.querySelector('p').textContent = error.name === 'TimeoutError' ? 'The connection timed out. Please retry.' : error.message === 'Failed to fetch' ? 'Cannot reach the server. Check your connection and retry.' : error.message;
    input.value = text; persist();
    failedUser = userNode; failedBot = botNode;
    retry.hidden = false;
    statusLine.textContent = '⚠ Response incomplete. Your message is preserved.';
  } finally {
    botNode.classList.remove('streaming');
    setBusy(false); input.focus();
  }
});
input.addEventListener('input', persist);
input.addEventListener('keydown', event => {
  if (event.key.length === 1 && !event.repeat) playSound('key');
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault(); form.requestSubmit();
  }
});
clear.addEventListener('click', () => {
  if (busy || comparing) return;
  sessions[era] = {messages: [], draft: ''};
  renderEra(); persist();
  statusLine.textContent = `✦ Only your ${era} chat was cleared.`;
  input.focus();
});
topics.forEach(button => button.addEventListener('click', () => {
  if (busy || comparing || travelling) return;
  input.value = button.dataset.prompt; form.requestSubmit();
}));
compareForm.addEventListener('submit', async event => {
  event.preventDefault();
  const question = compareInput.value.trim();
  if (!question || busy || comparing || travelling) return;
  comparing = true; setBusy(false); compareInput.readOnly = true;
  document.querySelector('#compare-results').hidden = false;
  const compareStatus = document.querySelector('#compare-status');
  compareStatus.textContent = 'Connecting to both eras…';
  playSound('message');
  const results = await Promise.allSettled(['1999', '2030'].map(async year => {
    const target = document.querySelector(`#answer-${year}`);
    target.classList.remove('compare-error'); target.textContent = 'Connecting…';
    try {
      await streamAnswer([{role: 'user', text: question}], year, answer => { target.textContent = answer; });
    } catch (error) {
      target.textContent = error.name === 'TimeoutError' ? 'Connection timed out. Try comparing again.' : error.message;
      target.classList.add('compare-error'); throw error;
    }
  }));
  const success = results.filter(r => r.status === 'fulfilled').length;
  compareStatus.textContent = success === 2 ? '✓ Both eras replied. The 2030 response is a fictional scenario.' : `${success}/2 eras replied. You can retry the same question.`;
  comparing = false; setBusy(false); compareInput.readOnly = false;
  if (success) playSound('message');
});
renderEra(); updateSound(); persist();
fetch('/api/status').then(r => r.json()).then(data => {
  document.querySelector('#connection').textContent = data.configured ? '● Online' : '○ API key required';
}).catch(() => { document.querySelector('#connection').textContent = '○ Server unreachable'; });
