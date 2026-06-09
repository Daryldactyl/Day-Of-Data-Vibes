# Day of Data — Vendor App (scaffold)

Starting shell for the **June 10 vibe-coding meetup**. We build the rest live from here:
**Scan an attendee's vCard QR badge → append a Lead → export CSV.**

## Run
```bash
npm install
npm run dev      # http://localhost:5173  (localhost is a secure context → camera works on the laptop)
npm test         # vitest (the vCard helper is TDD-covered)
npm run build    # typecheck + production build
```

## Camera / HTTPS notes (important — read before demoing)
- The camera needs a **secure context**. `localhost` counts as secure, so scanning works on the **laptop** in dev (use the laptop webcam on a printed badge).
- On a **phone**, use the deployed **Vercel HTTPS URL**. A phone hitting the laptop's LAN IP over plain `http` is **not** secure → the camera is blocked.
- **iOS:** open the app in the Safari **tab**, *not* an installed / "Add to Home Screen" app — Apple blocks the camera in standalone PWA mode. See [`../docs/adr/0001-url-first-not-installable-pwa.md`](../docs/adr/0001-url-first-not-installable-pwa.md).

## Deploy (Vercel)
`npx vercel` (or import the repo at vercel.com). Framework auto-detects as **Vite**; build `npm run build`, output `dist/`.

## What's already wired in
- `src/lib/vcard.ts` — **tested** vCard encode/parse, shared by sample-badge generation and the live scanner.
- `qr-scanner` + `qrcode` installed (not yet used in the UI — that's the live build).
- `spec_sheet.md` committed at repo root, so `/grill-with-docs` can read it live.
