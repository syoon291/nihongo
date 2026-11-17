---
owns:
  - index.html
  - manifest.webmanifest
status: current
---

# Nihongo Ears - Architecture

## Overview

Nihongo Ears is a personal Japanese speaking and listening trainer: an installable, offline-capable web app (PWA) built for a phone. Everything the learner sees is romaji; audio comes from the browser's own Japanese text-to-speech voice. Phrases ship in a JSON file, and every bit of progress is kept in the browser on the device. There is no server, no account and no build step: the repo is the website.

## System Overview

| Surface | Path | Role |
|---------|------|------|
| Page shell | `index.html` | Header (streak pill), the single `<main>` view the app renders into, the five-tab bottom bar, PWA meta tags |
| App logic | `app.js` | Loads phrases, keeps progress, schedules reviews, drives the voice, renders every section. See [frontend.md](frontend.md) |
| Phrase content | `content.json` | Batches of phrases; the only file to edit to add material. See [frontend.md](frontend.md#content) |
| Styles | `styles.css` | Color tokens (light + dark), layout, components. See [design-system.md](design-system.md) |
| Offline + install | `sw.js`, `manifest.webmanifest`, `icons/` | Service worker caches the app for offline use; the manifest and icons make it installable. See [deployment.md](deployment.md) |
| Repo check | `scripts/check.mjs` | Fast sanity check (scripts parse, content well formed, offline file list complete). Not served to users in any meaningful way |

How they relate: `index.html` loads `styles.css` and `app.js` (as a module). On start, `app.js` fetches `content.json`, reads saved progress from `localStorage`, renders the Home tab, and registers `sw.js` when served over https. Everything after that happens in the browser.

## Repository Layout

```text
.
├── index.html             page shell + PWA meta
├── app.js                 the whole app (state, scheduling, audio, views, events)
├── content.json           phrase batches
├── styles.css             design tokens + components
├── sw.js                  service worker (offline cache)
├── manifest.webmanifest   install metadata
├── icons/                 app icons (svg + png sizes)
├── scripts/check.mjs      fast repo check
├── docs/                  this documentation
├── AGENTS.md              agent orientation (CLAUDE.md links to it)
└── README.md              public face
```

## Tech Stack

- Plain HTML, CSS and JavaScript (ES modules), no framework, no dependencies, no bundler.
- Web Speech API (`speechSynthesis`) for Japanese audio.
- `localStorage` for all user data; JSON export/import for backup.
- Service worker + web app manifest for offline use and "Add to Home Screen".
- GitHub Pages for hosting.

## Doc Index

| Doc | Scope |
|-----|-------|
| [Frontend](frontend.md) | Sections, state shape, content format, audio, spaced repetition, backup |
| [Design System](design-system.md) | Color tokens, type, components, voice of the copy |
| [Local Development](local-dev.md) | Running it locally, checking changes, gotchas (exact commands: `.claude/test-manifest.json`) |
| [Deployment](deployment.md) | GitHub Pages, the service worker cache, release behavior |
| [docsic.json](docsic.json) | Machine-read release facts (not a document) |
| [gate.json](gate.json) | Docs-gate config: files no doc needs to follow (not a document) |
| [plans/](plans/) | Dated history and plans; `done` ones are a record, not current truth (e.g. how the app was built) |

## Current Scope

A single learner on a single device: learn batches card by card, review with spaced repetition, shadow phrases out loud, log phrases used in real life, and catch new words heard in the wild.

## Limitations

- Progress never leaves the device unless the learner exports it; clearing site data or switching phones loses it without a backup.
- Audio quality depends entirely on the voices the device has installed; there are no recorded native audio files.
- Romaji hides pitch accent; the app relies on the learner copying the audio.
- No automated UI tests and no CI; the fast check catches broken scripts and malformed content only.
