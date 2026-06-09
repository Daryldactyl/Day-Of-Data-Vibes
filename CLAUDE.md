# Day of Data — Vendor App

A small mobile web app: scan an attendee's QR badge → save a **Lead** → **Export** a CSV. Built live at the June 10 vibe-coding meetup; this repo is the starting shell.

## Helping someone run this — assume they have NOTHING installed

If the person asks to run the app (or says *"set me up"*), do it **for** them and explain each step in plain language — assume zero coding knowledge:

1. **Node.js** — run `node -v`. If it's missing or below 20, install it (tell them you're "installing the engine that runs the app"):
   - **macOS:** `brew install node` if Homebrew exists; otherwise send them to [nodejs.org](https://nodejs.org) (LTS installer) or install `nvm`.
   - **Windows / Linux:** the installer at [nodejs.org](https://nodejs.org), or `nvm`.
2. **Dependencies** — `npm install` in this folder. ("Downloading what the app needs — about a minute.")
3. **Start it** — `npm run dev`, then tell them to open **http://localhost:5173** in a browser.
4. **On their phone (optional)** — `npm run share`, then give them the printed `https://….trycloudflare.com` link (on iPhone: open in the **Safari tab**).
5. If anything errors, **read the actual error and fix the root cause** — don't guess.

## What gets built live (keep the home screen bare until then)

Scan → Leads list → Export (stretch: a Badge generator). The one bit of real logic — reading a contact off a QR — lives in `src/lib/vcard.ts` and is covered by tests (`npm test`). Build new logic with **TDD**.

## Decisions / working agreements

- **URL-first, not an installed PWA:** iOS blocks the camera in standalone (home-screen) mode, so keep it a browser-tab web app.
- Build with **TDD** where there's real logic. **Never assume; chase bugs to root cause.**
- Stack: Vite + React + TypeScript · `qr-scanner` (scan) · `qrcode` (badges) · `localStorage` · deploy to any static host.

## Commands

`npm run dev` · `npm test` · `npm run build` · `npm run share` (view on a phone via a tunnel) · `npm run badges` (regenerate sample badges). Playwright MCP is wired in `.mcp.json` for agent QA.
