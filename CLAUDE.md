# Day of Data — Vendor App

Scaffold + vehicle for the **June 10 vibe-coding meetup** (a live Claude Code demo of the
spec → grill → PRD → issues → build → Playwright-QA workflow).

**If you are resuming prior work, read [`HANDOFF.md`](./HANDOFF.md) first.**
Broader prep docs are one level up in `../`: `CONTEXT.md`, `run_of_show.md`, `spec_sheet.md`,
`PRD.md`, `issues/`, `docs/adr/`, `slides/`, `HOW_TO_RUN.md`.

## Working agreements
- Build with **TDD** where there's logic (the vCard helper in `src/lib/vcard.ts` was — 5 tests).
- **Never assume; chase bugs to root cause.**
- The **Scan / leads-list / Export** features are built **live at the meetup** — keep the home bare until then.
- App is **URL-first, not an installable PWA** (iOS standalone camera bug — see `../docs/adr/0001-url-first-not-installable-pwa.md`). Badge payload = **vCard**.

## Run
`npm run dev` (→ localhost:5173, camera works on localhost) · `npm test` · `npm run badges` · `npm run build`.
Playwright MCP is wired in `.mcp.json` (`/mcp` to confirm).
