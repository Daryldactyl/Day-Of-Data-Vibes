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

> These ambiguities are *intentional* — they're what the live `/grill-with-docs` session will resolve into the app's own `CONTEXT.md`, then `/to-prd`, then `/to-issues`. A **second round** of features — requested *after* the first build shipped — is captured in **§10**.

---

## 10. Round two — features requested after the first working build

> Everything above (§1–§9) is the original brief: what we opened the live build from. Everything in this section came **after** — once the app was working and we put it in front of the Day of Data organizers. Seeing it run generated concrete new asks. We fold them into the same spec, with their origin recorded, so the grilling sessions that plan them aren't a mystery to anyone following along: this is normal, healthy product evolution — a client's appetite sharpens once they can hold the real thing. Each item below runs through the *same* `/grill-with-docs` → `/to-prd` → `/to-issues` loop as the originals.

**Source:** feedback from **Andy** (organizing committee) after using the first working app — *"I scanned the sample QR codes and was able to export the corresponding CSV… I'm going to show this to everyone else."* Two requests, plus one idea we deliberately declined.

### 10.1 Raffle *(should-have — wanted before the event)*
A third action on Home — **Scan · Export · Raffle** — for running the booth's prize draw from the app itself. Tapping **Raffle** randomly highlights one collected **Lead** as the winner; tapping again re-rolls to a possibly-different winner; repeat as often as you like. Local to the phone, no server, no new data — it just picks from the Leads already collected.

*Deliberate ambiguities to grill (don't pre-answer):*
- **Reveal style:** highlight the winner's **row in the Leads list**, or a dedicated full-screen "winner" reveal?
- **Re-roll semantics:** each press an independent random pick **with replacement** (the same person can win twice — matching "a possibly different record")? Should it avoid an *immediate* repeat?
- **Suspense:** instant highlight, or a brief slot-machine cycle before it lands?
- **Placement & edges:** third button; disabled at 0 Leads (a 1-Lead list always wins); **read-only** — Raffle never removes or alters a Lead.

### 10.2 Share / merge a teammate's list *(should-have — stretch)*
Multiple staff often work one sponsor table, each scanning on their own phone. Today each phone keeps its own list (fine — they can export separately and combine later). This feature lets one phone **import another phone's Leads and merge them**, matching and **de-duplicating by email** the same way a single phone already does — so a table can finish with one combined list (and one fair raffle over it). **Peer-to-peer, no central database** — the data moves device-to-device and stays local.

*Deliberate ambiguities to grill (don't pre-answer):*
- **Transport (the key fork):** a **file / share-sheet import** (Phone A shares its list via AirDrop/Messages → Phone B imports — any size, lowest effort, reuses Export's share sheet) vs a **single QR** the other phone scans (elegant and on-brand, but capped to a small list by QR capacity and needs a second scan mode — the scanner today only accepts vCard badges) vs a **chunked/animated QR** (any size, more effort).
- **Merge rules:** de-dupe by **normalized email** (reuse the existing dedup rule); on same-email/different-name keep the existing record; keep the earliest scan time. **One-way import, non-destructive** (merge, never delete).
- **Privacy:** sharing Attendee contacts phone-to-phone among the same booth's staff is consensual and mild — note it consciously; crucially it adds **no central store**.

### 10.3 Deliberately declined — a central shared database *(won't have)*
Andy also floated a central database of names so every phone at a table sees one shared list. **Declined for now** (likely indefinitely): it means a server plus the **PII responsibilities** of storing attendee contacts centrally — exactly what the URL-first, local-only design exists to avoid. §10.2's peer-to-peer merge is the chosen alternative: it solves the same multi-phone need *without* the central store. Recorded here so the "why not just a database?" question has a standing answer.

### 10.4 Consolidate throughout the day — active vs archived Leads *(should-have)*
**Source:** Once the basic Merge (§10.2) shipped, its small per-code chunks made it natural to consolidate *incrementally* — hand off a batch to a teammate now and then, not in one end-of-day dump. The Vendor's follow-on ask, grilled into the design below.

When a Vendor hands a batch of Leads to a teammate, those Leads should leave the Vendor's working list so they aren't shown, exported, raffled, or re-shared again — **while preserving the hard rule that an Attendee already scanned can never be re-scanned**, even after being handed off. Resolved (see **`docs/adr/0005-active-archived-lead-lifecycle.md`** and the **ADR-0002 revision**):

- A Vendor's Leads are either **active** (on Home; the only Leads Export, Raffle, and a Merge handoff act on) or **archived** (handed off, hidden, but retained).
- **Dedup spans active ∪ archived** for both Scan and import — so an archived Attendee still can't be re-captured.
- **Archiving is a deliberate, reversible action** (the Vendor explicitly archives the active list *after* confirming the handoff landed — chunked QR has no delivery confirmation, so auto-archiving could silently lose Leads).
- **Restore** brings *all* archived Leads back to active in one non-destructive move (to re-share to a different teammate, or recover a missed handoff).
- **No data-wipe** in this round — Restore only *moves* Leads, never deletes (consistent with §5's "no delete in v1").
