---
owns:
  - scripts/**
  - .claude/test-manifest.json
status: current
---

# Local Development

## Prerequisites

- Any static file server. The manifest's dev server uses Python 3's built-in one.
- Node 18 or newer, only for the fast check.
- A browser with a Japanese speech voice to hear audio (desktop Safari and Chrome have one; on iPhone install one under Settings → Accessibility → Spoken Content → Voices).

Nothing to install: no packages, no build, no env files.

## Setup

Clone and serve the repo root. Opening `index.html` straight from disk does not work, because the app fetches `content.json` and module scripts need an http origin.

## Environment Variables

None.

## Running

Start the static server from `.claude/test-manifest.json` (`devServer`) and open its base URL. Progress you make is saved in that browser for that origin, so a different port starts with empty progress; use Export / Import in Settings to carry it over.

To try it on a phone, serve on your machine and open the machine's LAN address from the phone, or push and use the live site (see [deployment.md](deployment.md)).

## Testing

The fast check (`stacks` in `.claude/test-manifest.json`) confirms that `app.js` and `sw.js` parse, that `content.json` is well formed (every item has `id`, `romaji`, `english`, `ja`; ids unique; `list` is `speak` or `listen`), that every file the service worker precaches exists, and that the Pages workflow's site copy step includes each of them. Run it after any change; CI (`.github/workflows/pages.yml`) runs the same check on every pull request, so the manifest marks the stack `"ci": "pr"`.

There are no UI tests. A change to what a section shows needs a look in a browser.

## Gotchas

- **The service worker never runs locally.** It registers only over https, so offline behavior and caching can be checked only on the live site.
- **Never rename or reuse an item id in `content.json`.** Progress is keyed by id; a renamed id orphans every learner's history for that card.
- **New files the app needs offline go in the `SHELL` list in `sw.js`**, or the installed app breaks offline when it needs them. The fast check flags entries that point at missing files, not files left out.
- A headless browser usually has no Japanese voice: the app stays silent and the Settings panel shows the install hint. That is expected, not a bug.

[Back to Architecture](architecture.md)
