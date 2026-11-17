---
owns:
  - sw.js
  - .github/**
status: current
---

# Deployment

## Targets

GitHub Pages, published by the `Pages` GitHub Actions workflow (`.github/workflows/pages.yml`; the repo's Pages source is set to "GitHub Actions"). The public URL is in `docs/docsic.json` (`release.url`). The repo is public, so its source is readable by anyone, but only the app files are on the site.

## Build

No compile step. The workflow's build job runs the fast check (`node scripts/check.mjs`), copies an explicit list of app files (`index.html`, `app.js`, `styles.css`, `sw.js`, `content.json`, `manifest.webmanifest`, `icons/`) into `_site/` and uploads it; docs, scripts and repo tooling are not published. A merge to `main` is the release: the deploy job publishes that artifact and the site updates within a minute or two. A manual run (`workflow_dispatch`) redeploys main.

A new file the app loads must be added to that copy step. The fast check fails when a file `sw.js` precaches is missing from it.

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

The `Pages` workflow is the only CI. On a pull request it runs the build job (check + site artifact) without deploying, so a broken check shows on the PR. On `main` it builds and deploys; a deploy in progress is never cancelled by a newer push.

[Back to Architecture](architecture.md)
