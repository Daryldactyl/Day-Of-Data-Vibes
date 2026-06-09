/**
 * Generate sample attendee Badge QR codes (vCard payload) for the live demo.
 * Reuses the SAME tested encoder the scanner will parse (src/lib/vcard.ts),
 * and round-trips each badge through parseVCard before writing it.
 *
 *   npm run badges
 */
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'
import { encodeVCard, parseVCard } from '../src/lib/vcard'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'sample-badges')
mkdirSync(outDir, { recursive: true })

const attendees = [
  { name: 'Ada Lovelace', email: 'ada@dayofdata.example' },
  { name: 'Grace Hopper', email: 'grace@dayofdata.example' },
  { name: 'Alan Turing', email: 'alan@dayofdata.example' },
]

for (const attendee of attendees) {
  const vcard = encodeVCard(attendee)
  const parsed = parseVCard(vcard)
  if (!parsed || parsed.name !== attendee.name || parsed.email !== attendee.email) {
    throw new Error(`Round-trip failed for ${attendee.name} — badge would not parse`)
  }
  const slug = attendee.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const file = join(outDir, `badge-${slug}.png`)
  await QRCode.toFile(file, vcard, { width: 512, margin: 2 })
  console.log(`wrote ${file}`)
}
console.log(`done — ${attendees.length} badges`)
