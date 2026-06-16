# 01 · Ideation & the spec

← [Back to the index](index.md) · Next: [The repeatable loop →](02-the-repeatable-loop.md)

---

## The pain, in the client's words

The idea didn't start as a feature list. It started as a problem, captured from a real conversation with the
event's organizing committee and written up as a one-page brief: [`spec_sheet.md`](../../spec_sheet.md).

> At Day of Data / SQL Saturday, vendors collect attendee contact info with **paper raffle tickets**…
> It's lossy — people forget to print them, forget to bring them, or never signed up — so we hand-label and
> lose contacts. We want to replace the paper with a phone app: an attendee wears a **QR badge**, a vendor
> **scans** it, and at the end the vendor has a **list they can email to their sales/recruiting team.**

That's the whole product: **Scan → Lead → Export.** Two actors (Vendor, Attendee), one daily loop.

## Why the spec deliberately leaves gaps

A good brief for AI-assisted building is *clear on intent but honest about what's undecided.* The spec ends
with a section titled **"Deliberate ambiguities for us to grill (don't pre-answer)"**:

> - QR payload format: plain `Name <email>` vs vCard vs JSON?
> - Export shape: CSV download vs `mailto:` body vs both? what columns?
> - Does the Vendor enter their own name/company once (to label the export), or is the export anonymous?
> - …

Those gaps are *intentional*. They're the raw material for the **grilling** step — the questions that get
resolved into the app's own glossary and decision records, not guessed at by the model. (You'll watch every
one of those three get answered in the journeys that follow.)

## The constraints that shaped everything

A few hard constraints came out of the same prep and quietly steer the whole architecture:

- **URL-first, not an installed app.** On iOS the camera only works in a Safari *tab*, not a home-screen PWA —
  so the app stays a browser-tab web app. (This single constraint reappears in three different decisions.)
- **No server, no accounts.** Everything is local to the Vendor's phone (`localStorage`). 10 vendors scanning
  the same attendee independently is fine.
- **HTTPS only** (camera requires it) and **export is always a deliberate button press** (no silent email).

## The shared language

Before any code, the grilling produced a glossary — [`CONTEXT.md`](../../CONTEXT.md) — and those exact words
became the names in the code and UI. **Lead**, never "Contact." **Badge**, never "QR thing." When the human and
the AI use the same word for the same concept, the AI stops drifting. This is the cheapest, highest-leverage
discipline in the whole method.

## The starting shell

To avoid spending the live hour on scaffolding, the repo started as a bare shell: the topbar, an empty state,
the glossary in the footer — and, crucially, the *one piece of real logic already written and tested* (reading
a contact off a QR, in `src/lib/vcard.ts`). Everything else — Scan, the Leads list, Export, the Badge Generator
— got built live, on top.

![The starting shell](images/00-starting-shell.png)

*This is `git` commit `73c30f2` — the app before any feature. Compare it to the screenshots that close each of
the next chapters.*

---

Next: **[02 · The repeatable loop →](02-the-repeatable-loop.md)** — the method that turned this shell into a
shipped app, one slice at a time.
