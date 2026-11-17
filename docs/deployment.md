---
owns:
  - sw.js
  - .github/**
status: current
---

# Deployment

## Targets

GitHub Pages, from the `main` branch, repo root (the classic "deploy from a branch" build, no workflow file). The public URL is in `docs/docsic.json` (`release.url`). The repo is public, and so is everything in it once it lands on `main`.

## Build

None. Pages publishes the files as they are. A merge to `main` is the release: GitHub runs its own "pages build and deployment" job, and the site updates within a minute or two.

## How updates reach learners

The service worker (`sw.js`) caches the app shell on install and then serves every same-origin GET **network first**, refreshing the cache from each response and falling back to the cache only when offline. So:

- An installed app picks up new code and phrases the next time it opens online; no cache-name bump is needed for ordinary changes.
- Offline, it serves the last cached copy; any unknown path falls back to `index.html`.
- Changing the cache name (`CACHE` in `sw.js`) makes the next activation delete every older cache. Do that only when old cached files must be dropped, for example after removing or renaming a shell file.

`content.json` is also fetched with `no-cache` by the app itself, so phrase changes are never held back by the HTTP cache.

Learner progress is in each device's `localStorage` and is untouched by deploys. A change to the saved state's shape must keep reading older saves (the loader merges saved state over defaults).

## Environment

No env vars, secrets or backend.

## CI/CD

No CI of its own. The Pages build is the only job on `main`. Run the fast check from `.claude/test-manifest.json` before pushing.

[Back to Architecture](architecture.md)
