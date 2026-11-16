# Nihongo Ears

A personal Japanese **speaking and listening** trainer. Romaji only, audio first, built for a phone.

**Open it:** https://syoon291.github.io/nihongo/ — then "Add to Home Screen" to install it like an app. It works offline after the first visit.

## What it does

| Section | What it's for |
| --- | --- |
| **Home** | Streak, cards due today, words learned, speaking-phrase progress, a 7-day activity chart, settings and backup |
| **Learn** | Go through a batch card by card: hear it, say it twice, add it to review |
| **Review** | Spaced repetition (SM-2 style). *Hear → meaning* by default, or *meaning → say it*, or a mix |
| **Speak** | Shadowing: the phrase plays, a "your turn" bar gives you time to repeat it out loud, then you rate yourself |
| **Real life** | Log phrases you actually used on people, and catch words you hear in the wild to review later |

## How it's built

- Plain HTML, CSS and JavaScript. No build step, no backend, no account.
- Phrases live in [`content.json`](content.json): batches of items with `romaji`, `english` and `ja`. The `ja` (kana) field is never shown; it only tells the Japanese voice how to pronounce the phrase, because text-to-speech can't read romaji correctly.
- Audio is the browser's built-in Japanese voice (Web Speech API). On iPhone, download a better one: **Settings → Accessibility → Spoken Content → Voices → Japanese**.
- Progress is saved in this browser only (`localStorage`). Use **Home → Settings & backup → Export** now and then; **Import** restores it on a new phone.
- `sw.js` caches the app for offline use; `manifest.webmanifest` makes it installable.

## Romaji rules used

- Vowels are always *a i u e o* (ah, ee, oo, eh, oh).
- A doubled consonant (*chotto*, *matte*) is a tiny pause.
- A macron (*ō*, *ū*) is a long vowel: *Arigatō*, *Daijōbu*.
- Romaji hides pitch and rhythm, so always copy the audio.

## Adding phrases

Add items to a batch in `content.json` (or a new batch with `"list": "speak"` or `"listen"`). Keep each `id` unique and never change an existing one: progress is stored by id.

## Ideas for later

Recorded native audio files, streak reminders, more batches, an optional kana toggle.
