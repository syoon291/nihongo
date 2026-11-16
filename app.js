// Nihongo Ears: a personal Japanese speaking & listening trainer.
// Everything lives in this browser (localStorage). No accounts, no server.

const KEY = "nihongo.v1";
const $view = document.getElementById("view");

// ------------------------------------------------------------------ dates
const pad = (n) => String(n).padStart(2, "0");
const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (key, n) => { const [y, m, d] = key.split("-").map(Number); return dayKey(new Date(y, m - 1, d + n)); };
const today = () => dayKey();

// ------------------------------------------------------------------ state
const blank = () => ({
  cards: {},        // id -> { reps, ease, interval, due, lapses, learnedAt }
  activity: {},     // day -> { reviews, learned, spoken, used }
  used: [],         // { id, day, note }
  catches: [],      // { id, romaji, english, note, day, inReview }
  settings: { newPerDay: 20, direction: "listen", rate: 0.9, voice: "" },
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const s = JSON.parse(raw);
    const b = blank();
    return { ...b, ...s, settings: { ...b.settings, ...(s.settings || {}) } };
  } catch { return blank(); }
}
let state = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { toast("Couldn't save. Is private browsing on?"); }
}
function bump(field, n = 1) {
  const d = today();
  const a = (state.activity[d] ||= { reviews: 0, learned: 0, spoken: 0, used: 0 });
  a[field] = (a[field] || 0) + n;
}

// ------------------------------------------------------------------ content
let batches = [];
let items = new Map(); // id -> item (with batch info)

async function loadContent() {
  const res = await fetch("content.json", { cache: "no-cache" });
  const data = await res.json();
  batches = data.batches;
  for (const b of batches) for (const it of b.items) items.set(it.id, { ...it, batch: b.id, list: b.list });
}
function itemOf(id) {
  if (items.has(id)) return items.get(id);
  const c = state.catches.find((x) => `c-${x.id}` === id);
  return c ? { id, romaji: c.romaji, english: c.english || "(your own word)", ja: "", batch: "catch", list: "listen", note: c.note } : null;
}

// ------------------------------------------------------------------ audio
let jaVoice = null;
function pickVoice() {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith("ja"));
  jaVoice = voices.find((v) => v.name === state.settings.voice) || voices.find((v) => /premium|enhanced|kyoko|o-ren|google/i.test(v.name)) || voices[0] || null;
  return voices;
}
if ("speechSynthesis" in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = () => { pickVoice(); };
}
function speak(item, { rate } = {}) {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window) || !item?.ja) { resolve(false); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(item.ja);
    u.lang = "ja-JP";
    if (jaVoice) u.voice = jaVoice;
    u.rate = rate ?? state.settings.rate;
    // iOS Safari sometimes never fires onend: give up waiting after a generous estimate.
    let settled = false;
    const done = (ok) => { if (!settled) { settled = true; clearTimeout(guard); resolve(ok); } };
    const guard = setTimeout(() => done(true), 2500 + item.ja.length * 450 / u.rate);
    u.onend = () => done(true);
    u.onerror = () => done(false);
    speechSynthesis.speak(u);
  });
}

// ------------------------------------------------------------------ spaced repetition (SM-2 style)
// grade: 1 again, 3 hard, 4 good, 5 easy
function schedule(card, grade) {
  const c = { ...card };
  if (grade < 3) {
    c.reps = 0; c.interval = 0; c.lapses = (c.lapses || 0) + 1;
    c.due = today(); // seen again this session
  } else {
    if (c.reps === 0) c.interval = grade === 5 ? 3 : 1;
    else if (c.reps === 1) c.interval = grade === 3 ? 2 : grade === 5 ? 6 : 4;
    else c.interval = Math.max(1, Math.round(c.interval * (grade === 3 ? 1.2 : grade === 5 ? c.ease * 1.3 : c.ease)));
    c.reps += 1;
    c.due = addDays(today(), c.interval);
  }
  c.ease = Math.max(1.3, c.ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
  return c;
}
const newCard = () => ({ reps: 0, ease: 2.5, interval: 0, due: today(), lapses: 0, learnedAt: today() });
const dueIds = () => Object.entries(state.cards).filter(([id, c]) => c.due <= today() && itemOf(id)).map(([id]) => id);
const learnedToday = () => state.activity[today()]?.learned || 0;

function streak() {
  let n = 0, d = today();
  const active = (k) => { const a = state.activity[k]; return a && (a.reviews || a.learned || a.spoken || a.used); };
  if (!active(d)) d = addDays(d, -1); // today not started yet doesn't break the streak
  while (active(d)) { n++; d = addDays(d, -1); }
  return n;
}

// ------------------------------------------------------------------ helpers
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const PLAY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>`;
function toast(msg) {
  document.querySelector(".toast")?.remove();
  const t = Object.assign(document.createElement("div"), { className: "toast", textContent: msg, role: "status" });
  document.body.append(t);
  setTimeout(() => t.remove(), 2200);
}
function batchProgress(b) {
  const n = b.items.filter((it) => state.cards[it.id]).length;
  return { n, total: b.items.length, done: n === b.items.length };
}
const nextBatch = () => batches.find((b) => !batchProgress(b).done);

function updateChrome() {
  const s = streak();
  const pill = document.getElementById("streak-pill");
  pill.textContent = `🔥 ${s} day${s === 1 ? "" : "s"}`;
  pill.classList.toggle("on", s > 0);
  const due = dueIds().length;
  const badge = document.getElementById("due-badge");
  badge.hidden = due === 0;
  badge.textContent = due > 99 ? "99+" : due;
}

// ------------------------------------------------------------------ router
let tab = "home";
let session = null; // per-tab transient state
function go(next, opts = {}) {
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  clearTimeout(speakTimer);
  tab = next; session = opts.session ?? null;
  for (const b of document.querySelectorAll(".tabs button")) b.setAttribute("aria-current", b.dataset.tab === tab ? "page" : "false");
  render();
  window.scrollTo(0, 0);
}
function render() {
  updateChrome();
  const views = { home: viewHome, learn: viewLearn, review: viewReview, speak: viewSpeak, life: viewLife };
  $view.innerHTML = views[tab]();
}

// ------------------------------------------------------------------ HOME
function viewHome() {
  const total = items.size;
  const learned = Object.keys(state.cards).filter((id) => items.has(id)).length;
  const due = dueIds().length;
  const nb = nextBatch();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6));
  const counts = days.map((d) => { const a = state.activity[d] || {}; return (a.reviews || 0) + (a.learned || 0) + (a.spoken || 0); });
  const max = Math.max(5, ...counts);
  const dow = (k) => ["S", "M", "T", "W", "T", "F", "S"][new Date(k + "T12:00:00").getDay()];
  const speakTotal = [...items.values()].filter((i) => i.list === "speak").length;
  const speakLearned = [...items.values()].filter((i) => i.list === "speak" && state.cards[i.id]).length;

  return `
  <h2>${greeting()}</h2>
  <p class="sub">${due ? `${due} card${due === 1 ? "" : "s"} waiting. A few minutes now keeps them sticky.` : learned ? "All caught up. Learn a few new ones or shadow out loud." : "Start with the first batch: survival phrases you can use today."}</p>

  <div class="stack">
    ${due ? `<button class="btn primary block" data-go="review">Review ${due} due</button>` : ""}
    ${nb ? `<button class="btn ${due ? "" : "primary"} block" data-learn="${nb.id}">Learn next: ${esc(nb.title)}</button>` : `<div class="card center"><b>Every batch learned.</b><div class="muted small">Catch new words in Real life and add them to review.</div></div>`}

    <div class="stats">
      <div class="stat"><b>${due}</b><span>due today</span></div>
      <div class="stat"><b>${learned}<small class="muted" style="font-size:15px">/${total}</small></b><span>learned</span></div>
      <div class="stat"><b>${learnedToday()}</b><span>new today</span></div>
    </div>

    <div class="card">
      <div class="row"><b>Speaking phrases</b><span class="spacer"></span><span class="muted small">${speakLearned}/${speakTotal}</span></div>
      <div class="progress" style="margin-top:10px"><i style="width:${speakTotal ? (speakLearned / speakTotal) * 100 : 0}%"></i></div>
    </div>

    <div class="card">
      <div class="row"><b>This week</b><span class="spacer"></span><span class="muted small">cards + reps</span></div>
      <div class="bars" role="img" aria-label="Activity over the last 7 days: ${counts.join(", ")}">
        ${days.map((d, i) => `<div class="bar ${d === today() ? "today" : ""}" title="${d}: ${counts[i]}"><i class="${counts[i] ? "" : "zero"}" style="height:${Math.max(3, (counts[i] / max) * 100)}%"></i><small>${dow(d)}</small></div>`).join("")}
      </div>
    </div>

    ${settingsHTML()}
  </div>`;
}
function greeting() {
  const h = new Date().getHours();
  return h < 11 ? "Ohayō!" : h < 18 ? "Konnichiwa!" : "Konbanwa!";
}
function settingsHTML() {
  const s = state.settings;
  const voices = "speechSynthesis" in window ? pickVoice() : [];
  return `
  <details class="card">
    <summary>Settings & backup</summary>
    <div class="stack" style="margin-top:14px">
      <div>
        <label>Review direction</label>
        <div class="seg" role="group" aria-label="Review direction">
          ${[["listen", "Hear → meaning"], ["speak", "Meaning → say it"], ["mix", "Mix"]].map(([v, t]) => `<button data-set-dir="${v}" aria-pressed="${s.direction === v}">${t}</button>`).join("")}
        </div>
      </div>
      <div class="row">
        <div style="flex:1"><label for="npd">New cards per day</label><input id="npd" type="number" min="1" max="100" value="${s.newPerDay}" data-set="newPerDay"></div>
        <div style="flex:1"><label for="rate">Voice speed</label>
          <select id="rate" data-set="rate">${[[0.7, "Slow"], [0.9, "Natural"], [1, "Fast"]].map(([v, t]) => `<option value="${v}" ${Number(s.rate) === v ? "selected" : ""}>${t}</option>`).join("")}</select></div>
      </div>
      <div>
        <label for="voice">Japanese voice</label>
        ${voices.length
          ? `<select id="voice" data-set="voice"><option value="">Automatic</option>${voices.map((v) => `<option ${v.name === s.voice ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select>`
          : `<p class="small muted" style="margin:0">No Japanese voice found in this browser. On iPhone: Settings → Accessibility → Spoken Content → Voices → Japanese.</p>`}
        <button class="btn sm" style="margin-top:8px" data-test-voice>Test voice</button>
      </div>
      <div class="row wrap-row">
        <button class="btn sm" data-export>Export backup</button>
        <label class="btn sm" style="margin:0">Import backup<input type="file" accept="application/json" data-import hidden></label>
        <span class="spacer"></span>
        <button class="btn sm ghost" data-reset style="color:var(--accent)">Reset all</button>
      </div>
      <p class="small muted" style="margin:0">Progress is saved only on this device. Export now and then to keep a copy.</p>
    </div>
  </details>`;
}

// ------------------------------------------------------------------ LEARN
function viewLearn() {
  if (session?.batch) return viewLearnCard();
  const left = Math.max(0, state.settings.newPerDay - learnedToday());
  return `
  <h2>Learn</h2>
  <p class="sub">${left ? `${left} new card${left === 1 ? "" : "s"} left in today's goal.` : "Today's new-card goal is done. Extra is fine, but reviews matter more."} Speak batches are phrases to say; listen batches are words to recognize.</p>
  <ul class="list">
    ${batches.map((b) => { const p = batchProgress(b); return `
      <li><button class="batch-btn" data-learn="${b.id}">
        <span class="t"><b>${esc(b.title)}</b><span>${p.n}/${p.total} learned</span></span>
        <span class="tag ${b.list === "speak" ? "good" : ""}">${b.list}</span>
      </button></li>`; }).join("")}
  </ul>`;
}
function startLearn(batchId) {
  const b = batches.find((x) => x.id === batchId);
  const fresh = b.items.filter((it) => !state.cards[it.id]).map((it) => it.id);
  const queue = fresh.length ? fresh : b.items.map((it) => it.id); // a finished batch can be browsed again
  go("learn", { session: { batch: b.id, queue, i: 0, browsing: !fresh.length } });
  speak(itemOf(queue[0]));
}
function viewLearnCard() {
  const { batch, queue, i, browsing } = session;
  const b = batches.find((x) => x.id === batch);
  if (i >= queue.length) {
    return `<div class="card empty"><b>Batch done 🎉</b>${browsing ? "Nothing new here." : `${queue.length} card${queue.length === 1 ? "" : "s"} added to review.`}
      <div class="stack" style="margin-top:16px"><button class="btn primary block" data-go="review">Review them now</button><button class="btn block" data-go="learn">Back to batches</button></div></div>`;
  }
  const it = itemOf(queue[i]);
  return `
  <div class="row"><button class="btn sm ghost" data-go="learn">← Batches</button><span class="spacer"></span><span class="muted small">${esc(b.title)} · ${i + 1}/${queue.length}</span></div>
  <div class="card flash" style="margin-top:10px">
    <button class="play" data-play="${it.id}" aria-label="Play audio">${PLAY}</button>
    <div class="romaji">${esc(it.romaji)}</div>
    <div class="english">${esc(it.english)}</div>
    <div class="hint">Say it out loud twice after the audio.</div>
  </div>
  <div class="stack" style="margin-top:12px">
    ${browsing
      ? `<button class="btn primary block" data-learn-next>Next</button>`
      : `<button class="btn primary block" data-learn-add>Got it → add to review</button><button class="btn block ghost" data-learn-skip>Skip for now</button>`}
  </div>`;
}

// ------------------------------------------------------------------ REVIEW
function viewReview() {
  if (!session?.queue) {
    const q = dueIds().sort(() => Math.random() - 0.5);
    session = { queue: q, i: 0, revealed: false, done: 0, dir: null };
  }
  const { queue, i, revealed } = session;
  if (i >= queue.length) {
    const more = dueIds().length;
    return `<div class="card empty"><b>${session.done ? `Nice: ${session.done} review${session.done === 1 ? "" : "s"} done` : "Nothing due"}</b>
      ${more ? `${more} card${more === 1 ? "" : "s"} you missed are back for another pass.` : "Come back tomorrow, or learn something new."}
      <div class="stack" style="margin-top:16px">${more ? `<button class="btn primary block" data-review-again>Go again</button>` : ""}<button class="btn block" data-go="${nextBatch() ? "learn" : "speak"}">${nextBatch() ? "Learn new cards" : "Shadow out loud"}</button></div></div>`;
  }
  const id = queue[i];
  const it = itemOf(id);
  const s = state.settings.direction;
  const dir = session.dir ||= (s === "mix" ? (Math.random() < 0.5 ? "listen" : "speak") : s);
  const listenFront = dir === "listen" && it.ja;
  const front = listenFront
    ? `<button class="play" data-play="${id}" aria-label="Play audio">${PLAY}</button><div class="hint">What does it mean?</div>`
    : `<div class="english" style="font-size:24px;color:var(--ink)">${esc(it.english)}</div><div class="hint">Say it in Japanese, out loud.</div>`;
  const back = `
    <div class="romaji">${esc(it.romaji)}</div>
    <div class="english">${esc(it.english)}</div>
    ${it.ja ? `<button class="play sm" style="margin:6px auto 0" data-play="${id}" aria-label="Play audio">${PLAY}</button>` : `<div class="hint">No audio for your own words</div>`}`;
  const c = state.cards[id];
  const preview = (g) => { const n = schedule(c, g); return g < 3 ? "again" : n.interval === 1 ? "1 day" : `${n.interval} days`; };
  return `
  <div class="counter">${i + 1} of ${queue.length}</div>
  <div class="card flash">${revealed ? back : front}</div>
  <div style="margin-top:12px">
    ${revealed
      ? `<div class="grades">
          <button class="btn again" data-grade="1">Again<small>${preview(1)}</small></button>
          <button class="btn" data-grade="3">Hard<small>${preview(3)}</small></button>
          <button class="btn" data-grade="4">Good<small>${preview(4)}</small></button>
          <button class="btn" data-grade="5">Easy<small>${preview(5)}</small></button>
        </div>`
      : `<button class="btn primary block" data-reveal>Show answer</button>`}
  </div>`;
}

// ------------------------------------------------------------------ SPEAK (shadowing)
let speakTimer = null;
function viewSpeak() {
  if (!session?.queue) {
    const learnedSpeak = [...items.values()].filter((it) => it.list === "speak" && state.cards[it.id]);
    return `
    <h2>Shadowing</h2>
    <p class="sub">Hear a phrase, then say it right away. Copy the rhythm and the melody, not just the sounds.</p>
    <div class="stack">
      <button class="btn primary block" data-shadow="learned" ${learnedSpeak.length ? "" : "disabled"}>Shadow my learned phrases (${learnedSpeak.length})</button>
      ${learnedSpeak.length ? "" : `<p class="small muted center" style="margin:0">Learn a speak batch first, or pick one below.</p>`}
      <h3>Or a batch</h3>
      <ul class="list">${batches.filter((b) => b.list === "speak").map((b) => `<li><button class="batch-btn" data-shadow="${b.id}"><span class="t"><b>${esc(b.title)}</b><span>${b.items.length} phrases</span></span><span class="tag">play</span></button></li>`).join("")}</ul>
    </div>`;
  }
  const { queue, i, phase } = session;
  if (i >= queue.length) {
    return `<div class="card empty"><b>Session done 🗣️</b>${session.nailed} nailed, ${session.close} close, ${session.again} to redo.
      <div class="stack" style="margin-top:16px"><button class="btn primary block" data-shadow-restart>Again</button><button class="btn block" data-go="speak">Pick another set</button></div></div>`;
  }
  const it = itemOf(queue[i]);
  const statusText = { listen: "Listen…", turn: "Your turn: say it now", rate: "How did that go?" }[phase] || "";
  return `
  <div class="row"><button class="btn sm ghost" data-go="speak">← Sets</button><span class="spacer"></span><span class="muted small">${i + 1}/${queue.length}</span></div>
  <div class="card flash" style="margin-top:10px">
    <div class="romaji">${esc(it.romaji)}</div>
    <div class="english">${esc(it.english)}</div>
    <div class="status" style="color:${phase === "turn" ? "var(--good)" : "var(--muted)"}">${statusText}</div>
    <div class="turn ${phase === "turn" ? "run" : ""}" style="--dur:${session.dur}ms"><i style="${phase === "rate" ? "width:100%" : ""}"></i></div>
  </div>
  <div class="stack" style="margin-top:12px">
    ${phase === "rate"
      ? `<div class="grades" style="grid-template-columns:repeat(3,1fr)">
           <button class="btn again" data-shadow-rate="again">Again</button>
           <button class="btn" data-shadow-rate="close">Close</button>
           <button class="btn" data-shadow-rate="nailed">Nailed it</button></div>
         <button class="btn block ghost" data-shadow-replay>Hear it again</button>`
      : `<button class="btn block ghost" data-shadow-skip>Skip</button>`}
  </div>`;
}
function startShadow(source) {
  const ids = source === "learned"
    ? [...items.values()].filter((it) => it.list === "speak" && state.cards[it.id]).map((it) => it.id).sort(() => Math.random() - 0.5).slice(0, 15)
    : batches.find((b) => b.id === source).items.map((it) => it.id);
  go("speak", { session: { source, queue: ids, i: 0, phase: "listen", dur: 3000, nailed: 0, close: 0, again: 0 } });
  runShadow();
}
async function runShadow() {
  const s = session;
  if (!s || tab !== "speak" || s.i >= s.queue.length) return;
  const it = itemOf(s.queue[s.i]);
  s.phase = "listen"; render();
  const t0 = performance.now();
  const ok = await speak(it);
  if (session !== s) return; // left the screen mid-phrase
  const said = ok ? performance.now() - t0 : it.romaji.length * 110;
  s.dur = Math.round(Math.min(9000, Math.max(1800, said * 1.6 + 600)));
  s.phase = "turn"; render();
  speakTimer = setTimeout(() => { if (session === s) { s.phase = "rate"; render(); } }, s.dur);
}

// ------------------------------------------------------------------ REAL LIFE (log + word catcher)
function viewLife() {
  const learnedSpeak = [...items.values()].filter((it) => it.list === "speak" && state.cards[it.id]);
  const usedToday = new Set(state.used.filter((u) => u.day === today()).map((u) => u.id));
  const recent = [...state.used].reverse().slice(0, 8);
  return `
  <h2>Real life</h2>
  <p class="sub">Tap a phrase when you use it on a real person. Catch words you hear so they don't slip away.</p>

  <h3>Word catcher</h3>
  <form class="card stack" data-catch>
    <div><label for="c-r">What you heard (romaji, best guess)</label><input id="c-r" type="text" name="romaji" required autocomplete="off" autocapitalize="none" placeholder="e.g. shōganai"></div>
    <div><label for="c-e">Meaning (if you know it)</label><input id="c-e" type="text" name="english" autocomplete="off" placeholder="e.g. it can't be helped"></div>
    <div><label for="c-n">Where / note</label><input id="c-n" type="text" name="note" autocomplete="off" placeholder="e.g. coworker said it 3x at lunch"></div>
    <button class="btn primary block" type="submit">Catch it</button>
  </form>
  ${state.catches.length ? `<ul class="list" style="margin-top:12px">${[...state.catches].reverse().map((c) => `
    <li><span class="t"><b>${esc(c.romaji)}</b><span>${esc(c.english || "meaning?")}${c.note ? ` · ${esc(c.note)}` : ""}</span></span>
      ${c.inReview ? `<span class="tag good">in review</span>` : `<button class="btn sm" data-catch-review="${c.id}">Review it</button>`}
      <button class="btn sm ghost" data-catch-del="${c.id}" aria-label="Delete ${esc(c.romaji)}">✕</button></li>`).join("")}</ul>` : ""}

  <h3>Used it today</h3>
  ${learnedSpeak.length ? `<ul class="list">${learnedSpeak.map((it) => `
    <li><span class="t"><b>${esc(it.romaji)}</b><span>${esc(it.english)}</span></span>
      ${usedToday.has(it.id) ? `<span class="tag good">used ✓</span>` : `<button class="btn sm" data-used="${it.id}">Used it</button>`}</li>`).join("")}</ul>`
    : `<div class="card empty"><b>No phrases yet</b>Learn a speak batch, then come back after you try one out.</div>`}

  ${recent.length ? `<h3>Recent</h3><ul class="list">${recent.map((u) => { const it = itemOf(u.id); return it ? `<li><span class="t"><b>${esc(it.romaji)}</b><span>${u.day}${u.note ? ` · ${esc(u.note)}` : ""}</span></span></li>` : ""; }).join("")}</ul>` : ""}`;
}

// ------------------------------------------------------------------ events
document.querySelector(".tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-tab]");
  if (b) go(b.dataset.tab);
});

$view.addEventListener("click", (e) => {
  const t = e.target.closest("button, [data-go]");
  if (!t) return;
  const d = t.dataset;

  if (d.go) return go(d.go);
  if (d.play) return speak(itemOf(d.play));
  if (d.learn) return startLearn(d.learn);

  if ("learnAdd" in d || "learnSkip" in d || "learnNext" in d) {
    const id = session.queue[session.i];
    if ("learnAdd" in d && !state.cards[id]) { state.cards[id] = newCard(); bump("learned"); save(); }
    session.i++; render();
    if (session.i < session.queue.length) speak(itemOf(session.queue[session.i]));
    return;
  }

  if ("reveal" in d) {
    session.revealed = true; render();
    const it = itemOf(session.queue[session.i]);
    if (session.dir === "speak" || !it.ja) speak(it); // hear the answer after saying it
    return;
  }
  if (d.grade) {
    const id = session.queue[session.i];
    const g = Number(d.grade);
    state.cards[id] = schedule(state.cards[id], g);
    bump("reviews"); save();
    if (g < 3) session.queue.push(id); // see it again before the session ends
    else session.done++;
    session.i++; session.revealed = false; session.dir = null;
    render();
    const nextId = session.queue[session.i];
    const ni = nextId && itemOf(nextId);
    if (ni && state.settings.direction === "listen") speak(ni);
    return;
  }
  if ("reviewAgain" in d) return go("review");

  if (d.shadow) return startShadow(d.shadow);
  if ("shadowRestart" in d) return startShadow(session.source);
  if ("shadowReplay" in d) { session.phase = "listen"; return runShadow(); }
  if ("shadowSkip" in d) {
    clearTimeout(speakTimer);
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    session.i++;
    if (session.i >= session.queue.length) return render();
    return runShadow();
  }
  if (d.shadowRate) {
    session[d.shadowRate]++;
    bump("spoken"); save();
    if (d.shadowRate === "again") session.queue.push(session.queue[session.i]);
    session.i++;
    if (session.i >= session.queue.length) return render();
    return runShadow();
  }

  if (d.used) {
    const note = prompt("Any note? (optional, e.g. who / where)") ?? "";
    state.used.push({ id: d.used, day: today(), note: note.trim() });
    bump("used"); save(); render(); toast("Logged. Nice work using it for real.");
    return;
  }
  if (d.catchReview) {
    const c = state.catches.find((x) => String(x.id) === d.catchReview);
    if (c) { c.inReview = true; state.cards[`c-${c.id}`] = newCard(); save(); render(); toast("Added to review."); }
    return;
  }
  if (d.catchDel) {
    if (!confirm("Delete this word?")) return;
    state.catches = state.catches.filter((x) => String(x.id) !== d.catchDel);
    delete state.cards[`c-${d.catchDel}`];
    save(); render(); return;
  }

  if (d.setDir) { state.settings.direction = d.setDir; save(); render(); return; }
  if ("testVoice" in d) { speak({ ja: "こんにちは。にほんご、がんばって！" }).then((ok) => { if (!ok) toast("No Japanese voice played. See the tip above."); }); return; }
  if ("export" in d) return exportBackup();
  if ("reset" in d) {
    if (!confirm("Erase all progress on this device? Export a backup first if you want to keep it.")) return;
    state = blank(); save(); go("home"); toast("Reset."); return;
  }
});

$view.addEventListener("change", (e) => {
  const el = e.target;
  if (el.dataset.set) {
    const k = el.dataset.set;
    state.settings[k] = k === "voice" ? el.value : Number(el.value) || blank().settings[k];
    if (k === "newPerDay") state.settings.newPerDay = Math.min(100, Math.max(1, Math.round(state.settings.newPerDay)));
    if (k === "voice") pickVoice();
    save(); updateChrome();
  }
  if ("import" in el.dataset && el.files[0]) importBackup(el.files[0]);
});

$view.addEventListener("submit", (e) => {
  const f = e.target.closest("form[data-catch]");
  if (!f) return;
  e.preventDefault();
  const data = Object.fromEntries(new FormData(f));
  const romaji = String(data.romaji || "").trim();
  if (!romaji) return;
  state.catches.push({ id: Date.now(), romaji, english: String(data.english || "").trim(), note: String(data.note || "").trim(), day: today(), inReview: false });
  save(); render(); toast("Caught. Add it to review once you know the meaning.");
});

// ------------------------------------------------------------------ backup
function exportBackup() {
  const blob = new Blob([JSON.stringify({ app: "nihongo-ears", exported: new Date().toISOString(), state }, null, 2)], { type: "application/json" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `nihongo-backup-${today()}.json` });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
async function importBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    const s = data.state || data;
    if (!s || typeof s !== "object" || typeof s.cards !== "object") throw new Error("not a backup");
    if (!confirm("Replace the progress on this device with this backup?")) return;
    const b = blank();
    state = { ...b, ...s, settings: { ...b.settings, ...(s.settings || {}) } };
    save(); go("home"); toast("Backup restored.");
  } catch { toast("That file isn't a Nihongo Ears backup."); }
}

// ------------------------------------------------------------------ start
(async function start() {
  try { await loadContent(); }
  catch { $view.innerHTML = `<div class="card empty"><b>Couldn't load the phrases</b>Check your connection and reload.</div>`; return; }
  go("home");
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
