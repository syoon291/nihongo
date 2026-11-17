---
status: done
created: 2026-11-17
covers: 2026-11-16 to 2026-11-17 (commits 3068b99 to cc56942)
---

# How Nihongo Ears was built

A record of how the app came to be: the brief, the decisions, and the steps from an empty folder to a live, deployed app. History, not current truth. For how the app works now, start at [architecture.md](../architecture.md).

## The brief (owner, 2026-11-16)

The owner is a beginner who lives in Tokyo and hears Japanese every day. The goal: get better at **speaking and listening within about six months**, with no reading, writing or kanji. They study by memorizing by ear, translating to English in their head, and replying in broken but understandable Japanese. The spec was written in an earlier chat and pasted into the build session. Its main points:

- **Romaji only** for now (kana later as an optional toggle). Romaji rules: vowels always a/i/u/e/o, a double consonant is a tiny pause, a macron is a long vowel. Always pair it with audio, because romaji hides pitch and rhythm.
- **Two lists**:
  - A *listening* list of about 1,000 spoken words, plus fillers, reactions and casual contractions (-teru, -jan, -chatta), aimed at recognition.
  - A *speaking* list of 150-200 ready-made phrases, aimed at instant recall.
- **Chunks over single words**, audio-first cards (hear it, then recall the meaning), and shadowing out loud.
- **A daily routine** of 45-60 minutes: about 20 new cards plus reviews, 10 minutes of shadowing, and using phrases on real people.
- **Seed content**: four phrase batches (survival, reactions, questions, daily situations: konbini, restaurant, train, greetings), the core verbs, and the particles, question words, fillers and casual words for the listening list.
- **Stack**: a static web app on GitHub Pages with no backend, progress in `localStorage` with JSON export/import, an installable offline PWA, browser text-to-speech for audio (recorded audio later), and content in one JSON file.
- **Six modules**: Dashboard, Learn, Review (SM-2 style spaced repetition), Speak (shadowing), Real-life log, Word catcher.
- **Constraints**: mobile first, simple, no accounts, free hosting.

## Decisions

| Decision | Why |
|---|---|
| Plain HTML/CSS/JS, no framework or build step | The spec allowed plain JS or React + Vite. With no build, the repo *is* the site: nothing to install, and Pages serves it as is |
| Its own public repo, `syoon291/nihongo`, served at `/nihongo/` under the owner's GitHub Pages site | Keeps the app separate from the personal site while sharing its domain |
| Web Speech API (`speechSynthesis`, a `ja-JP` voice) for all audio | Free, offline once the device has a voice; recorded audio can replace it later without changing the content format |
| All progress in `localStorage`, with a JSON backup | No server or account, as the spec asked. The cost: clearing site data loses progress unless it was exported |
| SM-2 style scheduling with four grades (Again / Hard / Good / Easy) | The standard spaced-repetition method, small enough to keep in one function (`schedule()`) |
| Review direction as a setting (hear → meaning, meaning → say it, or mix) | Covers both lists' goals: recognition for listening, recall for speaking |
| Content as batches tagged `list: "speak"` or `"listen"` | One file to edit for new material; the tag decides which practice each batch gets |

## Timeline

### 1. First build (2026-11-16, one session, commit `3068b99`)
- The same session also revamped the owner's GitHub Pages site. The site links the app, and the old workout planner moved to `/workout/`.
- Built all six modules as five tabs: Home (streak, cards due, progress, 7-day chart, settings and backup), Learn, Review, Speak, and Real life (the usage log plus the word catcher).
- Wrote `content.json` from the seed batches. It has since grown to 9 batches and 85 items (4 speak, 5 listen).
- Added the service worker (`sw.js`), the web manifest and icons, so the app installs from Share → Add to Home Screen and works offline after the first visit.
- Checked it in a phone-sized browser with screenshots, fixed what that turned up, and published it. Pages served the repo root as a legacy branch build.

### 2. Onboarding to the project-docs standard (2026-11-17, PR #1)
Run as Falcon task t5 "rey", the first parallel run on the new agent stack.
- Added `docs/` (this hub plus frontend, design-system, local-dev and deployment), `AGENTS.md` (with `CLAUDE.md` linking to it), and `.claude/test-manifest.json`.
- Added `scripts/check.mjs`, the fast check: the scripts parse, `content.json` is well formed, and every file the service worker caches exists.
- **Caught during the work:** `docsic init` treated `content.json` as a captured payload and moved it into `docs/reference/`, which would have broken the live app (the app fetches it, and the service worker caches it). It was moved back. `docsic init` also titled the docs after the worktree folder. Both are recorded as a docsic gotcha for a fix upstream.
- No app files changed.

### 3. Listening practice mode and an Actions deploy (2026-11-17, PR #2)
Run as Falcon task t6 "finn", started automatically once PR #1 landed.
- **Practice mode** for listen batches:
  - A word plays, and the learner picks its meaning from four choices, with distractors from the same batch first.
  - A miss replays the word and comes back once at the end of the round.
  - Practice never touches the review schedule, but counts toward the streak (`activity.practiced`).
  - It opens from a Practice button on each listen batch, or from "practice my learned words" (up to 15).
- **Deploy**: `.github/workflows/pages.yml` replaced the legacy branch build.
  - PRs run the check and build the site without deploying.
  - A push to `main` deploys only the app files, so `docs/`, `scripts/` and the README stopped being public.
  - The Pages source was switched to "GitHub Actions" *before* landing, so the first deploy worked.
- Verified in a real browser (light and dark) before shipping. The owner approved the visible change.
- After merge: both deploy jobs succeeded, and the live site served practice mode.

## What worked, and what to repeat

- **The spec did the heavy lifting.** A pasted brief with goals, constraints, seed content and build phases let the first session build the whole app in one pass.
- **Content separate from code.** Adding material is a `content.json` edit, which `scripts/check.mjs` validates.
- **Small PRs through the agent stack.** Docs and features went through separate tasks, chained so the second started from the first's merged result.
- **Check what actually ships.** The service worker's file list, the deploy workflow's file list and `index.html`'s references must agree. The check script and the PR #2 review both test this.

## Known gaps at the end of this history

- No unit or browser tests in CI, only the fast check.
- Audio depends on the device's installed Japanese voice.
- The `--warn` color token is defined but unused. A browser test once saw an answered-state oddity on practice question 2 that couldn't be reproduced.
