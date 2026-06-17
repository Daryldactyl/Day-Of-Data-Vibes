import QRCode from 'qrcode'

/** Minimal slice of QR generation the Badge Generator drives — small enough
 *  that a test can supply a fake (see `makeQrDataUrl` prop) without a real
 *  canvas, mirroring `createScanner` in scanner.ts. */
export type MakeQrDataUrl = (text: string) => Promise<string>

/** The real generator: a vCard string → a PNG data URL, large + high-contrast
 *  for another phone's camera to read. */
export const defaultMakeQrDataUrl: MakeQrDataUrl = (text) =>
  QRCode.toDataURL(text, { width: 320, margin: 2 })

/** A higher-resolution generator for Merge list chunks. A list chunk packs many
 *  Leads into one QR, so it has far more modules than a 2-field badge; rendered
 *  at 320px those modules get tiny and a receiver camera struggles. Render it
 *  large (Slice 14 density decision — ~640–720px) so each module spans plenty of
 *  pixels. Distinct from the badge generator's 320px, which is unchanged. */
export const defaultMakeListQrDataUrl: MakeQrDataUrl = (text) =>
  QRCode.toDataURL(text, { width: 680, margin: 2 })
