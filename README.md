# PlayGround

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://omgithub.com).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://omgithub.com/adjjvmorii26-png/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/adjjvmorii26-png/PlayGround)

- 🎮 [Open the project](https://omgithub.com/adjjvmorii26-png/PlayGround).
- ✨ [Remix this project](https://omgithub.com/?remix=adjjvmorii26-png%2FPlayGround).
- 💻 [Explore the source](https://github.com/adjjvmorii26-png/PlayGround).
- 🛠️ [Check build runs](https://github.com/adjjvmorii26-png/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/adjjvmorii26-png/PlayGround/issues).
- 👤 [Explore the creator's projects](https://omgithub.com/adjjvmorii26-png).
- 🌍 [Create with OMGithub](https://omgithub.com).
<!-- omgithub:readme:end -->

## Court Relay

A single-page site for a community-run basketball server revival. Everything is
static: no build step, no framework, no runtime network requests.

### Files

| Path | Purpose |
| --- | --- |
| `index.html` | The whole page: hero, server status, setup guide, features, leaderboard, Discord, FAQ, footer. |
| `styles.css` | Design system (tokens in `:root`), layout, responsive breakpoints, reduced-motion handling. |
| `app.js` | Progressive enhancement: mobile menu, scroll reveals and count-ups, tabbed setup guide, leaderboard filter, clipboard buttons, simulated status polling. |
| `assets/fonts/` | Self-hosted latin subsets of Barlow Condensed, Inter and JetBrains Mono plus the generated `fonts.css`. |
| `scripts/fetch-fonts.py` | Re-downloads those font files if the families or weights change. |
| `Agents.md` | Notes for agents working on this repo (process lifecycle, browser capture). |

### Run it locally

```sh
python3 -m http.server 3000
# then open http://localhost:3000
```

Any static file server works; opening `index.html` directly from disk also works
because there are no module imports or remote assets.

### Validate

```sh
npx --yes html-validate index.html   # markup, ARIA and landmark rules (.htmlvalidate.json)
npx --yes csstree-validator styles.css
node --check app.js
```

### Conventions

- Vanilla ES2020 and plain CSS with custom properties — no dependencies, no bundler.
- Behaviour lives in one IIFE in `app.js`; each block no-ops when its markup is missing.
- Motion respects `prefers-reduced-motion`; content is never hidden behind an animation.
- Keep tab, accordion and menu widgets keyboard operable and ARIA-consistent.
- Keep the page free of third-party network calls and of any trademarked game,
  league or team names.

### Licensing and attribution

- Fonts are licensed under the SIL Open Font License 1.1 (Barlow Condensed © Jeremy
  Tribby, Inter © The Inter Project Authors, JetBrains Mono © JetBrains s.r.o.).
- Court Relay is an unofficial fan project. It is not affiliated with, endorsed by,
  or sponsored by any game publisher, league, or team. All game titles, trademarks,
  and assets remain the property of their respective owners.

## Other projects in this repository

Each project lives on its own branch. Status reflects the audit done alongside the
Court Relay work.

| Project | Branch | What it is | Last fix |
| --- | --- | --- | --- |
| Loom & You — Pocket Dream Archipelago | `opencode-checkpoints/1`–`5` | three.js dream-island explorer with a co-dream chat UI (cp5 is the latest). | Audited clean. Still imports three.js from unpkg and, in cp4/cp5, Google Fonts from a CDN — self-hosting both would match this branch. |
| GHOST HULL — MIRA Repair | `opencode-checkpoints/8`, `12` | First-person station repair sim. | Fixed two fatal bugs: a CSS hex literal inside JS (module-wide `SyntaxError`) and a `<div>` passed to `WebGLRenderer`. The game now boots. |
| HALCYON DRIFT | `opencode-checkpoints/9` | Free-roam space flight, modular ES modules with vendored three.js and a graceful no-WebGL screen. | Stopped hiding the sound/photo/guide buttons behind `aria-hidden`; named the touch-control group. |
| Atelier | `opencode-checkpoints/10` | React 18 + TypeScript + Express/socket.io shared code space with a sandboxed runner. | Runner test no longer depends on Node's TAP reporter; `npm test` (11/11), `tsc --noEmit` and `vite build` are green. |
| ECHO-7 — A Co-Pilot Escape Room | `opencode-checkpoints/11`, `14` | three.js escape room with a co-pilot assistant. | Modal `<header>`s no longer create unnamed banner landmarks; inventory and constellation panels got proper roles/names. |
| — (no files) | `opencode-checkpoints/6`, `7` | Empty snapshots (`.gitignore` + workflow only). | Nothing to fix. |

Open follow-ups across the game branches: vendor `three.js` locally instead of
importing from unpkg, self-host the Google Fonts, and show a "WebGL required"
message instead of throwing on devices without WebGL (Halcyon already does it).

