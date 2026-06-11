# Leads are de-duplicated by email

The spec listed de-duplication under "Won't have (v1)" — "if a vendor scans someone 3×, that's 3 rows — fine for now." During the grilling session we reversed this: a Vendor's list now holds **at most one Lead per Attendee, keyed by normalized (lowercased, trimmed) email**. Re-scanning an Attendee already in the list is ignored (and surfaces a distinct "Already saved" confirmation rather than silence, so the Vendor knows the scan registered).

Why the reversal: the desired output is a clean contact list to hand a sales team, where duplicate rows are noise, not signal. Dedup also subsumes the "same badge held in frame fires ~25×/sec" problem — repeat decodes of an already-saved badge are ignored for free, so no separate in-frame guard is needed for correctness.

Recorded because it directly contradicts a written spec decision; without this note a future reader would see the spec say "duplicates are fine" and the code dedup, and assume one of them is a bug. Dedup is scoped per Vendor device (no central store), so two Vendors independently scanning the same Attendee is expected and fine.
