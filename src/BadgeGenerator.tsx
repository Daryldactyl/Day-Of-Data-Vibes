import { useState } from 'react'
import { badgeFilename, cleanBadgeField, isValidBadgeInput } from './lib/badge'
import { encodeVCard } from './lib/vcard'
import { defaultMakeQrDataUrl, type MakeQrDataUrl } from './badgeQr'

interface BadgeGeneratorProps {
  onDone: () => void
  makeQrDataUrl?: MakeQrDataUrl
  print?: () => void
}

/** Full-screen Badge Generator: type an Attendee's name + email, Generate, and
 *  a Badge (QR vCard) renders on screen with the name beneath it. */
export function BadgeGenerator({
  onDone,
  makeQrDataUrl = defaultMakeQrDataUrl,
  print = () => window.print(),
}: BadgeGeneratorProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [badge, setBadge] = useState<{ url: string; name: string } | null>(null)

  const valid = isValidBadgeInput(name, email)

  async function generate() {
    const cleanName = cleanBadgeField(name)
    const cleanEmail = cleanBadgeField(email)
    const vcard = encodeVCard({ name: cleanName, email: cleanEmail })
    const url = await makeQrDataUrl(vcard)
    setBadge({ url, name: cleanName })
  }

  return (
    <div className="badge-overlay" data-testid="badge-overlay">
      <div className="badge-hud">
        <span className="badge-title">Make a badge</span>
        <button className="badge-done" type="button" onClick={onDone}>
          Done
        </button>
      </div>

      <div className="badge-form">
        <label className="badge-field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="badge-field">
          <span>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <button className="badge-generate" type="button" disabled={!valid} onClick={generate}>
          Generate
        </button>

        {!valid ? <p className="badge-hint">Enter a name and email to make a badge</p> : null}

        {badge ? (
          <div className="badge-result">
            <img className="badge-qr" src={badge.url} alt="Attendee badge QR code" />
            <p className="badge-name" data-testid="badge-name">
              {badge.name}
            </p>
            <div className="badge-actions">
              <a className="badge-download" href={badge.url} download={badgeFilename(badge.name)}>
                Download
              </a>
              <button className="badge-print" type="button" onClick={print}>
                Print
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
