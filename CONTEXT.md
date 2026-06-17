# Day of Data — Vendor App

A mobile web app a Vendor opens at their booth to Scan attendee Badges, collect Leads, and Export them as a CSV. Everything is local to the Vendor's phone.

## Language

**Attendee**:
A conference-goer who wears a Badge. Attendees are scanned; they don't use the app.

**Vendor**:
A booth operator — the app's primary user. Scans Badges all day, exports the list at the end.
_Avoid_: User (too generic — say Vendor or Attendee).

**Badge**:
A QR code encoding an Attendee's name and email, worn by the Attendee.

**Scan**:
A Vendor capturing a Badge with the phone camera. One successful Scan reads a Badge and yields a Lead.

**Lead**:
A captured Attendee record — name, email, and the timestamp of the Scan — in a Vendor's list. Synonymous with the contact a Vendor walks away with. A Vendor's list holds at most one Lead per Attendee, identified by email (normalized); re-scanning an Attendee already in the list does not add a row.
_Avoid_: Contact (use Lead in code and UI).

**Export**:
A Vendor-triggered build of a CSV file of all Leads, downloaded to the Vendor's device. Always a deliberate button press, never automatic.

**Badge Generator** _(should-have)_:
A view that mints a Badge QR from a typed name + email, so Attendees can self-serve and the demo is self-contained.

**Raffle** _(should-have)_:
A Vendor-triggered draw that picks one collected Lead at random as the prize winner. Ephemeral and non-destructive — each draw is an independent, uniformly-random pick over the Vendor's current Leads, re-rollable as often as the Vendor likes, and never adds, removes, or reorders a Lead.

**Merge** _(should-have)_:
Combining another Vendor's collected Leads into your own list, so several phones at one booth can finish with one combined list. One Vendor imports a teammate's Leads and they are de-duplicated by email the same way a single list already is (existing Leads win; new ones are added with their original scan time). Peer-to-peer and on-device — no central store — and non-destructive (import only ever adds).
