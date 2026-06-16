import type { Lead } from './leads'

/** Build the CSV text for `leads`: a `Name,Email,Scanned At` header row
 *  followed by one record per Lead in array (scan) order. Pure — no BOM,
 *  no clock. The BOM is prepended at the file boundary (see buildCsvFile). */
function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** The download filename for an Export: `day-of-data-leads-YYYY-MM-DD.csv`.
 *  The date is passed in (no hidden clock — the clock lives at the boundary,
 *  like `scannedAt`). Uses local calendar date. */
export function exportFilename(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `day-of-data-leads-${yyyy}-${mm}-${dd}.csv`
}

export function toCsv(leads: Lead[]): string {
  const header = 'Name,Email,Scanned At'
  const rows = leads.map((lead) =>
    [lead.name, lead.email, lead.scannedAt].map(csvField).join(','),
  )
  return [header, ...rows].join('\r\n')
}

/** UTF-8 byte-order mark — prepended at the file boundary (not in `toCsv`) so
 *  Excel opens accented names (José, Nguyễn) correctly. */
const BOM = '﻿'

/** Assemble the downloadable CSV File: pure CSV text with the BOM prepended
 *  here at the boundary, named for the export date, typed `text/csv`. */
export function buildCsvFile(leads: Lead[], date: Date): File {
  return new File([BOM + toCsv(leads)], exportFilename(date), { type: 'text/csv' })
}

/** Trigger a browser download of `file` via an object-URL + anchor click. The
 *  actual download is QA'd live (Playwright), not unit-asserted. */
export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = file.name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Defer the revoke past the click: an immediate, synchronous revoke can
  // truncate the download on Safari/Firefox (the browser may still be reading
  // the object URL). Download is now the primary desktop path (ADR-0003
  // Revision 2026-06-16), so this matters.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Minimal navigator shape `isMobileDevice` reads — injected so the predicate
 *  is unit-testable against UA fixtures without a real navigator. */
export interface NavLike {
  userAgent: string
  // `mobile` is the User-Agent Client Hints signal. The DOM lib's
  // `NavigatorUAData` type does not (yet) declare it, so accept any extra
  // properties and read `mobile` defensively — keeps `navigator` assignable.
  userAgentData?: { mobile?: boolean } & Record<string, unknown>
}

/** Conservative "is this a phone?" predicate (ADR-0003 Revision 2026-06-16).
 *  True only for Android Chromium (`userAgentData.mobile === true`) or an
 *  iPhone/iPod UA. macOS, Windows, Linux, iPad, and Android tablets all → false
 *  (→ download). Uncertainty fails toward download. */
export function isMobileDevice(nav: NavLike): boolean {
  return nav.userAgentData?.mobile === true || /iPhone|iPod/i.test(nav.userAgent)
}

/** Injectable share/download capabilities so the hand-off decision is unit-
 *  testable without a real share sheet (mirrors the createScanner/diagnoseCamera
 *  injection pattern). */
export interface ShareCaps {
  isMobile: () => boolean
  canShare: (file: File) => boolean
  share: (file: File) => Promise<void>
  download: (file: File) => void
}

/** Hand off the CSV File: open the native share sheet ONLY on a confirmed mobile
 *  device that can share files; otherwise download (ADR-0003 Revision 2026-06-16).
 *  `canShare` is a capability, not a device — desktop reports it `true` but must
 *  download. Uncertainty fails toward download. */
export async function shareOrDownload(file: File, caps: ShareCaps): Promise<void> {
  if (caps.isMobile() && caps.canShare(file)) {
    try {
      await caps.share(file)
    } catch (err) {
      // The Vendor cancelled the share sheet — resolve quietly, no fallback.
      if (err instanceof DOMException && err.name === 'AbortError') return
      // Any other share failure: fall back to download so the Vendor still gets
      // the CSV (ADR-0003).
      caps.download(file)
    }
    return
  }
  caps.download(file)
}

/** The real Export: build the CSV File (clock lives here, at the boundary) and
 *  hand it off — the native share sheet when supported, else a download
 *  (ADR-0003, via `shareOrDownload`). This is the single hand-off seam. */
export async function defaultExportLeads(leads: Lead[]): Promise<void> {
  const file = buildCsvFile(leads, new Date())
  await shareOrDownload(file, {
    isMobile: () => isMobileDevice(navigator),
    canShare: (f) => !!navigator.canShare && navigator.canShare({ files: [f] }),
    share: (f) => navigator.share({ files: [f] }),
    download: downloadFile,
  })
}
