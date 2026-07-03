# 🎉 Breaktime Arcade

> [中文说明](README.zh-CN.md) · A web-based **collection of quick party games** for the classroom, get-togethers and team building. Runs on computers, phones and tablets — playable on a single device or across a whole room.
> First title: **Who's Undercover?**

The experience is modelled on **Kahoot**: the host runs the game from a computer connected to a projector (the "god view" and control desk), while everyone else joins on their own device. **Your computer is always the admin/projector end — whether the authoritative state lives on your laptop or in the cloud.**

---

## ✨ What it is

- Built for **classroom icebreakers, parties, small-group activities, team building and English-lesson interaction**.
- The host opens a room on a computer, projects a **large room code + QR code**, and players scan to join.
- Also supports **passing one device around a group (Pass & Play)** — works offline.
- Phase one ships **British English only**; a small language switcher is reserved in the top-right corner, with Chinese to follow.

---

## 🎮 Games

| Game | Status | Players / Length |
|---|---|---|
| **Who's Undercover?** | ✅ In development (first title) | 3–24 players / 5–10 min |
| Last Card (original UNO-style) | 🔒 Coming soon | 2–8 players |
| Draw & Guess | 🔒 Coming soon | — |
| Charades | 🔒 Coming soon | — |
| Two Truths and a Lie | 🔒 Coming soon | — |
| Quick Categories | 🔒 Coming soon | — |

The home page presents everything as a collection; unfinished games show **Coming soon**.

---

## 🕹️ Modes

- **Host a Live Room** — the presenter runs the game from a computer; players join on their own devices (LAN / public, see Networking below).
- **Pass & Play** — one group shares a single device and takes turns viewing their word. Works offline; the most reliable fallback.
- **Presenter Demo** — a projector-only walkthrough of the rules that hands out no real secret information.
- **Auto-Simulate** — one person, god view: the real rule engine plus bots play a whole round automatically (play / pause / step / speed) — handy for rehearsing or explaining the flow.

### Live Room — how you're playing

Setup asks *"How are you playing?"* and maps your answer onto the room underneath — small groups never have to think in "groups × players":

- **Individuals** — everyone plays as themselves in one game (3–24 players); find the one undercover. Each player is labelled by their own name.
- **Teams vs teams** — split into teams; each team shares a word and speaks/votes as one unit (first vote locks); find the undercover team.
- **Parallel groups** — each group plays its own separate game at the same time; every group finds its own undercover.

In **Teams vs teams** and **Parallel groups**, players **pick their own team** on joining (or tap *Assign me* to auto-balance) and can **change team until the game starts**.

### Live host controls (no need to restart the room)

- Adjust the **number of undercovers**, toggle **Mr White**, change **word pack** and **timers** — applied on the next round.
- **Resize** the room (team/group count and size) on the fly — never shrinking below groups that already have players in them.
- **Remove a player** from the roster; add players any time by having them scan the code.

---

## 🎨 Design direction

The overall feel is **bright, lively and classroom-friendly, in the spirit of Kahoot** — but kept balanced: **neither too plain nor too flashy.**

**Visuals**
- Large rounded corners, big buttons, high-contrast colour blocks — legible from the back of the room on a projector.
- A restrained primary + accent palette, with light gradients and subtle depth (shadows / lift), not piled-on decoration.
- Four fixed group colours carried throughout (so groups read at a glance on the projector):
  - `Group A` red · `Group B` blue · `Group C` yellow · `Group D` green — further groups (E … X, up to 24) fall back to violet shades.
- Clear typography, generous whitespace, obvious information hierarchy.

**Motion (used sparingly)**
- Short and purposeful: ~250–350 ms — enter/exit transitions, a gentle pulse on the current speaker, a tick on vote submission, a soft pulse in the final 10 seconds of a timer.
- Bigger moments may celebrate: winner confetti, a card flip on the identity reveal, a 3-2-1 start countdown.
- **Avoid**: constant movement, full-screen effects, loud sound, and any animation that could linger over a secret word.
- Respect the system `prefers-reduced-motion`, offer a `Reduce motion` toggle; sound is low by default and can be muted.

**Performance**
- Must stay smooth on low-end phones; animation never blocks the game or slows the class down.

---

## 🔒 Secret-information safety (Who's Undercover?)

- Secret words / roles are **sent point-to-point to the relevant player only** — never broadcast, never shown on the projector.
- The host's Projector View defaults to a **safe mode**: it shows only phase, progress, headcount and public results.
- `Reveal answers` lives on the host's private panel, is off by default, and is kept separate from the Projector View.
- Pass & Play clears the screen immediately after viewing behind a privacy mask; refreshing or navigating back never re-shows the previous player's word.

---

## 🧱 Tech stack

- **Front end**: Vue 3 + `<script setup>` + TypeScript 5.x + Vite + Pinia + Vue Router (+ PWA offline)
- **Back end**: Node.js + Express + Socket.IO (in-memory rooms; no database in v1)
- **Shared**: a `shared` package holds the **pure game-logic engine** (roles / order / voting / outcome), reused by both Pass & Play and Online
- **Workspace**: pnpm workspaces monorepo

> See [breaktime-arcade-tech-plan.md](breaktime-arcade-tech-plan.md) (technical plan) and [breaktime-arcade-project-plan-v2.md](breaktime-arcade-project-plan-v2.md) (product plan).

### Structure (planned)
```
packages/
  shared/    # pure TS: types + event protocol + game rules + word packs
  client/    # Vue front end
  server/    # Socket.IO back end
```

---

## 🌐 Networking (planned — not the current focus)

> This is **later work**. The current priority is building the game itself.

- **LAN**: run the server natively on the laptop; players join over the same Wi-Fi by QR code.
- **Tunnel (public, recommended)**: a Cloudflare tunnel exposes the local server to the internet, **sharing the same room as LAN → switching never drops the game**.
- **Cloud (public)**: Docker-deployed to Render/Railway as a standalone insurance for "the whole laptop goes down". It is a **separate room** — the upside is it survives your laptop losing power or network; the trade-off is that falling back from Cloud to LAN means a different server and a different room, so joined players must rejoin.
- **The computer is the admin in every mode**: the Host Dashboard / Projector View are just clients carrying a `hostToken`, connecting to whichever server is currently authoritative (laptop or cloud) — still showing full class state and controlling the game.
- **Connectivity switch**: an `Auto | Public | LAN` toggle on the Host Dashboard with auto-detection; the projector only updates its QR code.

---

## 🗺️ Status & priorities

**Current focus** → build the Who's Undercover? game itself + basic animation + the right visual style.

- **P0 (first)**: collection home page → rule engine (pure logic) → Pass & Play → word packs → basic animation / timer feedback
- **P1**: Online Room (LAN + Tunnel + Cloud), Host Dashboard, Projector View, connectivity switch, reconnection, PWA
- **P2**: Chinese UI + Chinese word packs, Mr White, more games, multi-round scoring

See "§7 Development order & task breakdown" in the technical plan for the detailed breakdown.

---

## 🚀 Local development

```bash
pnpm install          # install all workspace dependencies
pnpm dev              # client (Vite, http://localhost:5173) + server, with hot reload
pnpm test             # rule-engine unit tests (vitest)
pnpm typecheck        # tsc / vue-tsc across all packages
pnpm build            # production client build → packages/client/dist
pnpm start            # serve the built app (default port 3000; override with PORT=…)
```

Or with Docker (production build, single container):

```bash
docker compose up --build    # http://localhost:3000
```

> The server reads `PORT` from the environment — handy if port 3000 is taken by another project.
