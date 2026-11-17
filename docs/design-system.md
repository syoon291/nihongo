---
owns:
  - styles.css
  - icons/**
status: current
---

# Design System

Warm paper and ink with a single red accent, built for one-handed use on a phone. All values are CSS custom properties on `:root` in `styles.css`; components use the tokens, never raw colors.

## Color tokens

| Token | Role |
|-------|------|
| `--bg` | Page background (warm off-white; near-black brown in dark mode) |
| `--surface`, `--surface-2` | Cards; secondary fills (segmented controls, progress tracks) |
| `--ink`, `--muted` | Primary text; secondary text and hints |
| `--line` | Borders and dividers |
| `--accent`, `--accent-ink`, `--accent-soft` | Primary buttons, the streak pill, the "Again" grade, destructive actions; text on accent; soft accent fills |
| `--good` | Success: "in review" / "used" tags, the "your turn" state in shadowing |
| `--warn` | Reserved for warnings; defined in both schemes but not used by any component yet |

Dark mode follows the system (`prefers-color-scheme: dark`), redefining the same tokens. `index.html` sets a matching `theme-color` for each scheme, and `manifest.webmanifest` uses the light background.

Shape and depth: `--radius` for cards and buttons, `--shadow` for raised surfaces, `--tabs-h` for the bottom bar height (safe-area insets are added on top).

## Components

- **Card** (`.card`), with `.flash` for the big study card (romaji large, English under it, a hint line) and `.empty` for end-of-session and empty states.
- **Buttons** (`.btn`): `.primary`, `.ghost`, `.sm`, `.block` (full width). Grade rows (`.grades`) are an equal-width grid.
- **Play button** (`.play`): the round audio control on study cards.
- **Lists** (`.list`, `.batch-btn`) with a trailing `.tag` (`.good` variant).
- **Segmented control** (`.seg`) for review direction; `aria-pressed` marks the choice.
- **Progress** (`.progress`), weekly bars (`.bars`), the shadowing turn bar (`.turn`, animated over `--dur`).
- **Toast** (`.toast`): short status messages, gone after about two seconds.
- **Bottom tabs** (`.tabs`): icon + label, `aria-current="page"` on the active one, a numeric badge on Review.

## Icons

`icons/icon.svg` is the source; the PNGs (180 for the iOS home screen, 192 and 512 for the manifest, 512 also as maskable) are exports of it.

## Voice of the copy

Short, encouraging, second person ("A few minutes now keeps them sticky", "Nice work using it for real"). Japanese appears in romaji only, including greetings (Ohayō, Konnichiwa, Konbanwa). No kana or kanji anywhere in the interface.

[Back to Architecture](architecture.md)
