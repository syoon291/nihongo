# Nihongo Ears

A personal Japanese **speaking and listening** trainer: romaji only, audio first, built for a phone. It lives at https://syoon291.github.io/nihongo/ ("Add to Home Screen" installs it; it works offline after the first visit).

## What it does

- Learn phrase batches card by card: hear each one, say it out loud, add it to review.
- Review with spaced repetition, either hearing the Japanese and recalling the meaning or seeing the meaning and saying it.
- Shadow phrases out loud with a timed "your turn" prompt, then rate yourself.
- Log phrases you actually used on people, and catch words you hear in the wild to review later.
- Track a daily streak and a week of activity.
- Keep everything on your device, with export and import for backup.

## Surfaces and stack

- **Web app (PWA)**: plain HTML, CSS and JavaScript, the browser's Japanese speech voice for audio, `localStorage` for progress, a service worker for offline use. No build step, no backend, no account. Hosted on GitHub Pages.

## Next

- [Architecture](docs/architecture.md): how it is built, and the index of every doc
- [Local development](docs/local-dev.md): running and checking it locally
- [Deployment](docs/deployment.md): how a change reaches the live site and installed apps
