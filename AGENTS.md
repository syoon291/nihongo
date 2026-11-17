# Nihongo Ears

Start at `docs/architecture.md` - it indexes every doc. Exact commands (the fast check, the dev server) are in `.claude/test-manifest.json`; release facts are in `docs/docsic.json`. Never copy them here.

## Gotchas

- Content item ids in `content.json` are progress keys on every learner's device: never rename or reuse one.
- The `ja` field is what the voice reads and is never shown; keep it in kana, and keep all visible Japanese in romaji.
- A merge to `main` is a live deploy (GitHub Pages, public repo).
