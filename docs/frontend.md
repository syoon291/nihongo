---
owns:
  - app.js
  - content.json
status: current
---

# Frontend

The whole app is `app.js`, rendered into the one `<main id="view">` element of `index.html`. There are no URL routes: the bottom bar switches between five sections (plus the Practice screen, opened from Learn), and each re-renders the view from current state.

## Sections

| Tab | What it does |
|-----|--------------|
| Home | Greeting by time of day, due count, a "Learn next" button for the first unfinished batch, stats (due today, learned, new today), speaking-phrase progress bar, a 7-day activity chart, and the Settings & backup panel |
| Learn | Batch list with progress and a speak/listen tag; listen batches also have a Practice button, and a Listening practice card below the list starts a session of up to 15 learned listen words (needs at least 2). Inside a batch: each new card plays its audio, the learner says it twice, then adds it to review or skips. A finished batch can be browsed again without adding cards |
| Practice (from Learn) | Listening practice for listen words. The word plays, the learner picks its meaning from four choices (distractors from the same batch first, then any listen word). Right turns green, a wrong pick red, the romaji appears, and a wrong pick replays the word; a missed word comes back once at the end. Never touches review cards; each pick counts as activity (`practiced`). Without a Japanese voice the romaji shows up front instead. The Learn tab stays highlighted |
| Review | Due cards in random order. Direction is a setting: *Hear → meaning* (audio first), *Meaning → say it* (English first, audio after reveal), or *Mix*. Grades Again / Hard / Good / Easy, each showing its next interval. Again puts the card back at the end of the session |
| Speak | Shadowing. Pick "my learned phrases" (up to 15, shuffled) or any speak batch. Each phrase plays, then a "your turn" bar runs for about 1.6x the phrase's spoken length, then the learner rates it Again / Close / Nailed it |
| Real life | Word catcher (romaji guess, optional meaning and note; can be added to review), "Used it today" list of learned speak phrases with an optional note, and a recent-use log |

The header's streak pill and the Review tab's due badge update on every render.

## State

One object, saved as JSON in `localStorage` under the key `nihongo.v1` after every change:

| Field | Shape | Meaning |
|-------|-------|---------|
| `cards` | id → `{ reps, ease, interval, due, lapses, learnedAt }` | One entry per card in review. Ids are content item ids, or `c-<id>` for a caught word |
| `activity` | day → `{ reviews, learned, spoken, used, practiced }` | Daily counters; drive the streak and the weekly chart |
| `used` | `[{ id, day, note }]` | Real-life use log |
| `catches` | `[{ id, romaji, english, note, day, inReview }]` | Caught words; `id` is a timestamp |
| `settings` | `{ newPerDay, direction, rate, voice }` | Defaults: 20 per day, `listen`, rate 0.9, automatic voice |

Loading merges saved state over a blank one, so new fields get defaults without a migration. Dates are local-time `YYYY-MM-DD` strings. The streak counts consecutive active days and does not break until a whole day passes with no activity.

Transient per-tab state (the current queue, position, phase) lives in a `session` variable and is dropped on every tab switch.

## Spaced repetition

SM-2 style, in `schedule()`. Grades map to 1 (again), 3 (hard), 4 (good), 5 (easy). Again resets reps and makes the card due today. A first pass sets 1 day (3 on easy); a second pass 2 / 4 / 6 days by grade; after that the interval grows by the card's ease (x1.2 on hard, ease x1.3 on easy). Ease starts at 2.5 and never drops below 1.3.

## Content

`content.json` holds `batches`, each `{ id, title, list, items }`. `list` is `speak` (phrases to say on demand) or `listen` (words to recognize). Each item is `{ id, romaji, english, ja }`:

- `romaji` and `english` are what the learner sees.
- `ja` (kana) is never displayed. It is only what the voice reads, because text-to-speech cannot pronounce romaji correctly.
- Ids must be unique and must never change: progress is stored by id, so renaming one silently orphans that card's history.

To add material, add items to a batch or add a new batch. The fast check (`.claude/test-manifest.json`) catches duplicate ids, a missing field and a bad `list` value.

Romaji conventions in the content: vowels are always *a i u e o*; a doubled consonant (*chotto*, *matte*) is a short pause; a macron (*ō*, *ū*) is a long vowel.

`content.json` is fetched with `no-cache` on every start, so a content change reaches learners on their next open while online.

## Audio

`speak()` wraps `speechSynthesis` with `lang = ja-JP`. Voice choice: the one picked in Settings, else the first Japanese voice whose name suggests quality (premium, enhanced, Kyoko, O-ren, Google), else any Japanese voice. Speed comes from Settings (slow 0.7, natural 0.9, fast 1). iOS Safari sometimes never fires the end event, so each utterance also resolves after a timeout estimated from its length. Caught words have no `ja` and therefore no audio.

On iPhone a better voice comes from Settings → Accessibility → Spoken Content → Voices → Japanese; the app's Settings panel says so when it finds no Japanese voice.

## Backup

Export downloads `nihongo-backup-<date>.json` as `{ app, exported, state }`. Import accepts that file (or a bare state object with `cards`), confirms, and replaces this device's progress. Reset erases everything after a confirm.

## API integration

None. The only network request the app makes is for `content.json` (and the app files themselves).

[Back to Architecture](architecture.md)
