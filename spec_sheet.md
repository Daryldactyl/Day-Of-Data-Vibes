# Spec Sheet — Day of Data / SQL Saturday "Vendor App"

> This is the "client brief" we open the live build from. It's written the way a real client hands you a spec — clear on intent, deliberately leaving room for us to grill, sharpen language, and make engineering decisions. Source of truth: the Day of Data organizing committee (Andy) conversation, June 4.
> We will feed this into `/grill-with-docs` → `/to-prd` → `/to-issues` live.

## 1. The problem (in the client's words)
At Day of Data / SQL Saturday, vendors collect attendee contact info with **paper raffle tickets**: attendees print tickets with their name + email and hand them to vendors at booths. It's lossy — people forget to print them, forget to bring them, or never signed up — so we hand-label and lose contacts. We want to replace the paper with a phone app: an attendee wears a **QR badge**, a vendor **scans** it, and at the end the vendor has a **list they can email to their sales/recruiting team**.

## 2. Who uses it
- **Vendor** (primary user) — a booth operator. Opens the app on their phone, scans attendee badges all day, exports the list at the end. ~10 vendors.
- **Attendee** — a conference-goer wearing a QR badge encoding their name + email. ~400 attendees. (Attendees don't really *use* the app; they're *scanned*.)

## 3. What it is
A **mobile web app** — opened from a **URL** in the phone's browser on **iPhone and Android**. **No app-store publishing.** (Heads-up surfaced in build prep: on iOS the camera only works in the browser tab, *not* in an installed/home-screen app, so we keep it URL-first rather than a forced standalone PWA.)

## 4. Core flow (vendor)
1. Open the app → **Home**: shows the vendor's running **Lead** count + list, a **Scan** button, and an **Export** button.
2. Tap **Scan** → camera opens → point at an attendee's **Badge** (QR).
3. App reads the badge (name + email), **appends a Lead** (name, email, timestamp), shows a **confirmation** ("Saved: Jane Doe").
4. Repeat all day.
5. Tap **Export** → app builds a **CSV** of all Leads → vendor **downloads it** (or it opens their mail client pre-filled) → vendor sends it onward.

## 5. Features
**Must have (v1):**
- Scan a QR badge and read name + email from it.
- Append each scan to a locally-stored list of Leads (name, email, timestamp).
- Confirmation after each scan.
- Home screen showing the Leads collected so far (count + list).
- Export to CSV via a user-triggered button (download, and/or `mailto:`).

**Should have (if time):**
- "Badge Generator" view: type a name + email → get a QR badge to display/print (lets attendees self-serve, and makes our demo self-contained).
- Day of Data / SQL Saturday branding (logo, colors from dayofdatabr.org).
- Installable PWA (add-to-home-screen, works offline for scanning).

**Won't have (v1 — explicitly out of scope):**
- Central database / accounts / login (everything is local to the vendor's phone).
- De-duplication (if a vendor scans someone 3×, that's 3 rows — fine for now).
- A delete button (too easy to fumble and wipe data — defer).
- Background/automatic emailing.

## 6. Hard constraints (verified with Copilot in the meeting)
- **HTTPS only** (camera + PWA require it).
- **No silent or background email** — export must be a deliberate **button press** (download the CSV, or open the mail client via `mailto:`).
- **Can't write to the file system directly** — build the CSV **in browser memory** and trigger a download.
- **Storage is local** (localStorage) — no server, no central store.
- Duplicates are acceptable; no delete in v1.

## 7. Glossary (ubiquitous language — keep code + UI consistent with this)
- **Attendee** — conference-goer who wears a Badge.
- **Vendor** — booth operator; the app's primary user.
- **Badge** — a QR code encoding an Attendee's name + email.
- **Scan** — a Vendor capturing a Badge with the camera.
- **Lead** (= Contact) — a captured Attendee record (name, email, timestamp) in a Vendor's list.
- **Export** — user-triggered CSV download / `mailto:` of a Vendor's Leads.
- **Badge Generator** *(should-have)* — view that mints a Badge QR from a name + email.

## 8. Success looks like
A vendor can, on their own phone with no install friction: scan several attendee badges, see them accumulate, and walk away with a CSV they can email to their team — at a real HTTPS URL we can hand to vendors before July 18.

## 9. Deliberate ambiguities for us to grill (don't pre-answer)
- QR payload format: plain "Name <email>" vs vCard vs JSON? (affects scanner + generator)
- Export shape: CSV download vs `mailto:` body vs both? what columns?
- Does the Vendor enter their own name/company once (to label the export), or is the export anonymous?
- Camera/QR library choice and how we keep it minimal.
- What "installable PWA / offline" actually needs to include for v1.

> These ambiguities are *intentional* — they're what the live `/grill-with-docs` session will resolve into the app's own `CONTEXT.md`, then `/to-prd`, then `/to-issues`.
