# HANDOFF — June 10 Vibe-Coding Meetup prep

> You are resuming work after a session restart. **Read this first**, then the docs it points to.
> You're in the app repo: `~/Desktop/Code/vibe_coding_june10/app/`. The broader prep lives one level up in `~/Desktop/Code/vibe_coding_june10/` (referenced below as `../`).
> Date context: built 2026-06-09; **the meetup is tomorrow, 2026-06-10, 5:30–7:00pm.**

## What this event is (1 paragraph)
A **live Claude Code demo of the professional AI-engineering workflow** (smart-zone vs dumb-zone thesis, Matt Pocock style) for the BR User Groups at Jones Creek Library. Daryl drives Claude Code projected; the audience watches. The workflow shown: **`spec_sheet` → `/grill-with-docs` → `/to-prd` → `/to-issues` → plan-mode build → Playwright-MCP QA**, bracketed by concept slides and a tooling segment. The **QR Vendor App** (this repo) is the *vehicle*; the **goal is to teach the process, not to finish the app.** Full detail: `../CONTEXT.md`.

## Read these (don't duplicate — they hold the detail)
- `../CONTEXT.md` — locked decisions (D1–D12), glossary, decision-narration script, build-list progress
- `../run_of_show.md` — minute-by-minute with 🎙️ narration beats, fallbacks, live command cheat-sheet
- `../spec_sheet.md` — the "client brief" opened to start the live build (also committed here at `./spec_sheet.md`)
- `../PRD.md`, `../issues/` (README + 01–07), `../docs/adr/0001-url-first-not-installable-pwa.md`
- `../slides/index.html` (deck; press **N** for notes) + `../slides/speaker-notes.html` (synced second-screen)
- `../HOW_TO_RUN.md` — run commands (app, slides, Playwright) · `../bare-app-preview.png` — starting-point screenshot
- This repo's `README.md` (run/camera/deploy notes) and git log (3 commits)

## Current state
**DONE & committed/built:** slides + synced speaker-notes; scaffold app (Vite+React+TS, TDD'd vCard helper — `src/lib/vcard.ts`, 5 passing tests); sample badges (`./sample-badges/` + `npm run badges`); Playwright MCP (`./.mcp.json`, chromium pre-downloaded); all planning docs.

**REMAINING (HITL — Daryl's machine, help him execute):**
1. **Issue 06 — full dry-run:** run `../run_of_show.md` end-to-end on the projector laptop; time each segment; trigger each fallback once (wifi off, scan fail, grill drags, slice unfinished).
2. **Verify a badge scans on his phone** (the one thing not testable in the build session) — open `./sample-badges/index.html`, scan with phone camera (vCard → "Add Contact") and via the app.
3. **Issue 07 — day-of pre-flight** smoke test (checklist in `../run_of_show.md` / `../issues/07-*`).
- Skills (`grill-with-docs`/`to-prd`/`to-issues` from github.com/mattpocock/skills) **and** the MCP are **pre-installed by Daryl**; he'll *explain* the setup live, not install live (slide 9 note already reflects this).

## Exact run commands
```bash
# App (live-build starting point)
cd ~/Desktop/Code/vibe_coding_june10/app
npm run dev        # http://localhost:5173  (localhost = secure context → laptop webcam scans)
npm test           # vCard helper, 5 passing
npm run badges     # regenerate sample vCard badges → ./sample-badges/
npm run build      # typecheck + production build ;  deploy: npx vercel

# Slides + synced second-screen notes (serve so BroadcastChannel syncs; file:// won't)
cd ~/Desktop/Code/vibe_coding_june10/slides && python3 -m http.server 8080
#   presentation → http://localhost:8080/      (drag to projector / share this window)
#   speaker notes → http://localhost:8080/speaker-notes.html   (your screen only)

# Playwright MCP: run Claude Code inside app/, then /mcp to confirm "playwright"
```

## Key locked decisions (don't relitigate)
- **Tool:** Claude Code, projected, Daryl drives. **App type:** mobile web app at a **URL**, NOT an installable PWA (iOS standalone camera bug — ADR 0001).
- **Stack:** Vite + React + TS · `qr-scanner` · `qrcode` · localStorage · Vercel.
- **Badge payload = vCard** (native-camera-readable = a live fallback). Scan/list/Export are built **live**; first slice = Scan → name → append Lead → list, then Playwright QA. Export = stretch; Badge Generator/branding/deploy = "night shift."

## Suggested skills (for the resumed session)
- **`/verify`** or **`/run`** — to drive the app and confirm the scan slice during the dry-run.
- **`/grill-with-docs`**, **`/to-prd`**, **`/to-issues`** — these are what Daryl demos live; rehearse against `./spec_sheet.md`.
- **`/tdd`** — if building the scan slice ahead of time or hardening anything (vCard helper was built this way).
- **`/diagnose`** — if the dry-run surfaces a bug (chase to root cause; don't assume).

## Guardrails / preferences carried over
- Never assume; **chase bugs to root cause**. Build with TDD where there's logic.
- **Client-naming policy:** in anything public, alias clients by field of business; **obney.ai, grain, orc are public/nameable.**

## Also completed earlier this session (reference only — NOT active work)
- Self-profile dossier: `~/Desktop/Resume/profile_notes/` (`00`–`09` + `DELIVERABLE_SQLSaturday_BR_precon.md`).
- Updated master resume: `~/Desktop/Resume/tailored_resumes/2026-06-04_updated/`.
- **SQL Saturday BR pre-con (July 17) bio + abstract delivered** (separate event from this meetup).
- Persistent memory updated (user, the two events, profile-notes pointer).
