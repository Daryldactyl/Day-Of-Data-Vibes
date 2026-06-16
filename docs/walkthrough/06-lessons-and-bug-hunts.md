# 06 · Lessons & bug hunts

← [Journey 3 — Badge Generator](05-feature-badge-generator.md) · [Back to the index](index.md)

---

The clean parts of a build teach you the method. The bugs teach you the *disciplines*. Two hunts from this app
are worth keeping — both are really one lesson seen twice: **Playwright (or any automated check) is necessary
but not sufficient, and you must chase a symptom to its actual root cause instead of trusting the first
explanation.**

## Bug hunt #1 — the camera error that lied

During Scan QA, a denied camera permission showed the wrong message: **"No camera found"** — even though a
camera was plainly there. A band-aid would have been to reword the message. The discipline
([`working-agreements.md`](../working-agreements.md): *"chase every bug to its root cause… no 'probably'"*) said
otherwise.

The root cause was in the library. `qr-scanner`'s `start()` **swallows every `getUserMedia` error and re-throws
a single string, `"Camera not found."`** — so a *permission denial* and a *missing camera* arrive at our code
looking identical. The fix wasn't cosmetic: a `diagnoseCamera()` probe re-runs `getUserMedia` after a failure
to recover the *real* `DOMException` (`NotAllowedError` vs `NotFoundError`) and show the right message with the
right remedy. (See [Slice 3 — graceful failures](../issues/0003-graceful-failures.md).)

The kicker: the original unit test *passed*, because it fed the code a synthetic `NotAllowedError` the real
library never actually emits. **The unit test confirmed a fiction; the live QA found the truth.** That's the
whole argument for doing both.

A gentler cousin showed up later: the "Saved: Jane" confirmation flickered instantly to "Already saved" because
a held Badge re-decodes every frame. The fix — a pure `isFreshScan` that counts a held Badge once and only says
"Already saved" on a genuine re-presentation — came straight from a Vendor noticing the jank. Real use surfaces
what no test thought to assert.

## The Export UUID bug

This is the best lesson in the build, because the investigation was **wrong before it was right**, and being
honest about that is the point.

**The symptom.** On a desktop, tapping **Export** downloaded a file named like a random UUID with **no
extension** — useless; you can't open it in Excel.

**Layer one — a real design bug.** The hunt did *not* start by guessing. It reproduced the failure and measured
one fact: on this desktop, `navigator.canShare({ files })` returns **`true`**. That single measurement cracked
it. The Export hand-off ([ADR-0003](../adr/0003-export-csv-web-share.md), the share-sheet decision from the
[Export grill](../qa-sessions/export-feature-grilling.md)) keyed the share-vs-download choice on `canShare` —
but **`canShare` is a *capability*, not a *device*.** Desktop Chrome/Edge/Safari all answer `true`, so a desktop
Vendor was being routed into the *mobile* share flow, whose desktop implementation writes a UUID temp file. The
correct rule, recorded as the **[ADR-0003 Revision](../adr/0003-export-csv-web-share.md)** and built in
[Slice 7](../issues/0007-export-desktop-download-fix.md): **share only on a confirmed mobile device; download on
desktop and as the universal fallback — and let any uncertainty fail *toward* download,** because a download
produces a correct `.csv` everywhere. Investigation notes:
[export-download-bug-investigation.md](../qa-sessions/export-download-bug-investigation.md).

**Layer two — the symptom was partly the *test harness itself*.** After the fix shipped, the Vendor said they
*still* saw a UUID file. Re-investigating, two harness facts came out:

1. The "UUID file" they were looking at was being produced **inside the Playwright automation browser**, which
   stores every download as a GUID-named temp file — `download.suggestedFilename()` was correctly
   `day-of-data-leads-….csv`, but the file *on disk* was a GUID. The symptom was the *automation browser's
   storage*, not the app.
2. An earlier "desktop" re-test had been **silently running as a fake iPhone**, because Playwright's
   `addInitScript` (used to spoof a UA in a previous step) **persists across navigations** in the shared
   browser context. The polluted re-test "confirmed" a bug that wasn't there.

The honest reckoning, recorded at the time: the desktop fix was a *genuine* improvement (desktop should
download, not pop a share sheet), but the original "UUID" symptom had been **over-attributed** — chased partway
down the wrong well. What finally closed it wasn't another headless check; it was the Vendor opening their *own*
Chrome and confirming a real `day-of-data-leads-….csv` landed in their real Downloads, plus the share sheet
working on a **real phone**.

### What to take from it

- **Measure one fact before theorizing.** `canShare === true` on desktop was the whole key; it was *measured*,
  not assumed.
- **Capability ≠ context.** "The browser *can* do X" rarely means "X is the right thing here."
- **Your test harness is part of the system under test.** A persisted init-script and a GUID download path both
  *looked* like app bugs. Automation can manufacture symptoms; trust real-device confirmation for the last mile.
- **Say what you got wrong.** The record notes the over-attribution plainly. Faithful reporting — including of
  your own mis-steps — is a discipline, not an apology.

---

That's the build: a bare shell turned into a deployed app through one repeatable loop, with the bumps left
visible on purpose. Go run the loop on your own idea — start at **[the index](index.md)**, or open
[`slides/index.html`](../../slides/index.html) and give the talk.
