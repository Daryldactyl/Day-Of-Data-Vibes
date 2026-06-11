# Badges encode contact data as vCard 3.0

The spec left the Badge QR payload open (plain `Name <email>` vs vCard vs JSON). We chose **vCard 3.0**, parsed by `parseVCard()` in `src/lib/vcard.ts`, and the scanner accepts vCard only — anything else is rejected as "not a badge."

Why: a single tested module (`encodeVCard`/`parseVCard`) both generates and reads Badges, so the Badge Generator and Scanner can't drift; vCard is a real interchange standard, so a Badge can even be read by a phone's native camera as a contact. JSON was rejected as bespoke with no upside for two fields; a tolerant "also accept plain text/bare email" fallback was rejected because every Badge at the event is one we generate, so the fallback would only add untested parsing paths for inputs that never occur.

Reversing this is costly once Badges are printed and distributed (~400 attendees), so it's recorded here deliberately.
