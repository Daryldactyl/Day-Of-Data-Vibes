# Day of Data — Vendor App

A tiny phone web app that **scans attendee QR badges and exports the leads** — the app we build together at the June 10 vibe-coding meetup. What's here is the starting shell; we add the fun parts (scan, leads list, export) **live**.

---

## ▶ Run it — even if you've never coded (the easy way)

You don't need to know git, React, or anything. Let **Claude Code** do the whole setup for you:

1. **Install Claude Code** → [claude.com/claude-code](https://claude.com/claude-code) (one install).
2. **Open Claude Code in this folder.**
3. Type: **"set me up and run the app."**

Claude will install anything that's missing (even Node.js), install the app, start it, and tell you the link to open. That's it.

---

## Run it — the manual way

First, install **Node.js 20 or newer** (one time): [nodejs.org](https://nodejs.org) → download the **LTS** installer and run it.

Then, in this folder:

```bash
npm install     # downloads what the app needs (takes a minute, first time only)
npm run dev     # starts it → open http://localhost:5173 in your browser
```

> One-liner: `npm start` does both of the above.

## 📱 See it on your phone

```bash
npm run share   # prints a https://….trycloudflare.com link
```

Open that link on your phone. On **iPhone, open it in the Safari tab** (not "Add to Home Screen") — the camera only works in the tab.

## Run the tests

```bash
npm test
```

---

## What's in here

| | |
|---|---|
| `src/` | the app — React + Vite + TypeScript |
| `src/lib/vcard.ts` | the one piece of real logic (read a name + email off a QR), with tests |
| `spec_sheet.md` | the one-page brief we build from |
| `sample-badges/` | sample QR badges to scan (open `sample-badges/index.html`) |

## Good to know

- It's a **web app you open at a URL** — not an app-store app.
- On **iPhone the camera only works in the Safari tab**, so we keep it URL-first (not an installed app).
- The **Scan / leads list / Export** features get built **live** at the meetup — the home screen is intentionally bare to start.
