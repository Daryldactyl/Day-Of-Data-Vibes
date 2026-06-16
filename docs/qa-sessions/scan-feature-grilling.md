# Q&A Session — Scan Feature Grilling

**Skill:** `/grill-with-docs`
**Scope:** The Vendor Scan feature — tap a camera button → open the camera → scan attendee Badges (QR) → gather Leads.
**Outcome docs:** `CONTEXT.md`, `docs/adr/0001-vcard-badge-payload.md`, `docs/adr/0002-dedupe-leads-by-email.md`

This file is the raw record of the grilling: the questions asked, the answers given, and — for the questions we didn't have time to walk through live — the recommended answers we agreed to adopt wholesale. Nothing here is lost even though the decisions also live (summarized) in CONTEXT.md and the ADRs.

---

## Questions asked & answered live

### Q1 — QR payload format
**Asked:** When the scanner decodes a QR, what payload format should it expect to parse into a Lead? The spec (§9) listed this as an open ambiguity (plain `Name <email>` vs vCard vs JSON), but the repo already de-facto chose vCard: `scripts/generate-badges.ts` mints badges with `encodeVCard()` and `parseVCard()` is the only tested parser.

**Recommendation given:** Ratify **vCard 3.0 only** (no tolerant fallback). One tested module generates and reads Badges so they can't drift; vCard is a real standard (phone native cameras can read it as a contact); a fallback would only add untested parsing paths for inputs that never occur, since every Badge at the event is one we generate.

**Answer:** "Yes I agree." → vCard 3.0 only. Recorded as **ADR-0001**.

---

### Q2 — The scan loop: continuous vs one-and-done, and the "same badge in frame" problem
**Asked:** The spec describes the happy path but leaves the loop shape unstated. `qr-scanner` decodes ~25 frames/sec, so a badge held in view fires `onDecode` dozens of times. §6 ("duplicates acceptable") is about a Vendor *intentionally* scanning someone 3× = 3 rows; it is NOT meant to turn one badge in frame into 40 Leads. Options:
- **(A)** Continuous scanning with a per-scan guard — camera stays open, suppress repeats until the badge leaves frame / a cooldown passes.
- **(B)** One-and-done — each Scan tap captures one badge, then closes.

**Recommendation given:** **(A)** — matches "scan badges all day" / a line at the booth; the guard is exactly the real behavior worth getting right.

**Answer:** "A is killer lets do it." → Continuous scanning with a guard.

---

### Q3 — The guard contract and the intentional re-scan gesture
**Asked:** Precise rule for when the next Lead is allowed, using `qr-scanner`'s `onDecode` and `onDecodeError("No QR code found")` signals:
- **(A)** Leaves-frame gate — refuse the next Lead until an empty frame is seen; one presentation = one Lead; re-scanning the same person means pulling the badge out of frame and re-presenting it.
- **(B)** Time cooldown — ignore decodes for ~2s; risks silent double-save if the badge is still in frame when the cooldown ends.

**Recommendation given:** **(A)** leaves-frame gate; the only way to record the same Attendee twice is to re-present the badge (no on-screen "scan again" button).

**Answer:** The user changed direction here — chose a new **Option C: full de-duplication.** "We never want the same person twice, so if they have been scanned before we just ignore them."

**Important conflict surfaced:** this directly contradicts the written spec — §5 lists "De-duplication" under **Won't have (v1)** ("if a vendor scans someone 3×, that's 3 rows — fine for now") and §6 says "Duplicates are acceptable." Flagged as a deliberate reversal, not silent drift.

---

### Q3b — Dedup identity key & duplicate feedback (follow-on from the Option C reversal)
**Asked:** If we never allow the same person twice, what counts as "the same person," and what does the Vendor see on a repeat scan?
- Identity key: **normalized email** (lowercased + trimmed) — the real unique identity of a Lead — vs name+email (redundant, brittle to stray spaces).
- Feedback: a **distinct "Already saved: Jane Doe"** confirmation vs silent ignore. (Silent ignore makes the Vendor think the scanner is broken and keep jabbing at the badge.)

Also noted: dedup **subsumes** the in-frame-storm problem from Q2/Q3 — repeat decodes of an already-saved badge are ignored for free, so no separate leaves-frame guard is needed for correctness.

**Recommendation given:** Dedup by **normalized email**, scoped to this Vendor's phone, with a **distinct "already saved"** confirmation (not silence).

**Answer:** "Yes I have indeed changed my mind and I agree with your recommendation." → Recorded as **ADR-0002**; `CONTEXT.md` Lead definition updated with the uniqueness rule.

---

### Q4 — Screen topology and how the Vendor exits the camera
**Asked:** What is "the camera" as a screen, and how do you leave it? Options ranged over full-screen overlay vs a dedicated `/scan` route vs an inline embedded camera on Home.

**Recommendation given:**
- **Full-screen camera overlay** toggled by a `scanning` state flag (no router — this is a single-screen app; keeps it URL-first per the PWA constraint).
- An explicit **Done / ✕ button** that calls `qr-scanner.stop()` (releases camera + battery) and returns to the Leads list. Camera stays open across many scans until Done.
- A small **live "N leads" counter** on the camera screen, with confirmation **toasts** over the video.

**Answer:** The user opted to fast-forward: "move forward with all your recommendations on the rest of the questions." → Topology recommendation **adopted as-is.**

---

## Questions not asked live — recommendations adopted wholesale

The user chose to accept the recommended answer to every remaining branch so we could move to implementation. These were never debated live; they are the recommendations of record. They are behavioral/UI choices that are cheap to reverse, so none warranted an ADR.

### Q5 — Per-scan confirmation behavior
**Recommendation (adopted):** Non-blocking toast, ~1.5–2s, auto-dismiss, camera keeps running underneath. Green **"Saved: Jane Doe"** for a new Lead; visually distinct **"Already saved: Jane Doe"** for a dedup hit. Never a modal that blocks the next scan.

### Q6 — Error & edge-case handling on the camera screen
**Recommendation (adopted):**
- **Camera permission denied** → a calm explanatory message with a Retry / how-to-enable hint, not a crash or blank screen.
- **No camera available** (`QrScanner.hasCamera()` false) → a clear "no camera found" message.
- **QR that isn't a badge** (`parseVCard` returns `null`) → a brief "Not a badge" hint, and keep scanning — don't save anything, don't stop the camera.

### Q7 — Camera selection & transport
**Recommendation (adopted):** Prefer the rear camera (`preferredCamera: 'environment'`). Camera/PWA require **HTTPS** (spec §6) — served in the field via the existing `npm run share` Cloudflare tunnel; `localhost` is fine for dev.

### Q8 — Persistence & the Lead data shape
**Recommendation (adopted):**
- `Lead = { name: string, email: string, scannedAt: string /* ISO timestamp */ }`.
- Written to **`localStorage` immediately on each successful scan**, so a reload or dead battery mid-day loses nothing.
- The **dedup index is rebuilt from stored Leads on load**, so dedup survives a refresh.
- Storage is local to the Vendor's device — no server, no central store (spec §6). Two Vendors independently scanning the same Attendee is expected and fine.

---

## Net decisions (summary)

| # | Decision | Where recorded |
|---|----------|----------------|
| 1 | vCard 3.0 only payload | ADR-0001 |
| 2 | Continuous scanning, camera stays open across a line | this file |
| 3 | Dedup by normalized email; repeat scans ignored | ADR-0002, CONTEXT.md |
| 4 | Full-screen camera overlay via `scanning` state; Done button stops camera; live counter + toasts | this file |
| 5 | Non-blocking auto-dismiss toasts; distinct "Saved" vs "Already saved" | this file |
| 6 | Graceful permission-denied / no-camera / not-a-badge handling | this file |
| 7 | Rear camera preferred; HTTPS via tunnel | this file |
| 8 | `Lead = { name, email, scannedAt }`; persist to localStorage on each scan; rebuild dedup index on load | this file |

**Next step:** build the scan logic test-first (`/tdd`) — start with a pure `addLead(leads, contact, scannedAt)` that enforces email dedup — then wire the camera UI on top. (`parseVCard` is already covered by tests.)
