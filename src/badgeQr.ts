import QRCode from 'qrcode'

/** Minimal slice of QR generation the Badge Generator drives — small enough
 *  that a test can supply a fake (see `makeQrDataUrl` prop) without a real
 *  canvas, mirroring `createScanner` in scanner.ts. */
export type MakeQrDataUrl = (text: string) => Promise<string>

/** The real generator: a vCard string → a PNG data URL, large + high-contrast
 *  for another phone's camera to read. */
export const defaultMakeQrDataUrl: MakeQrDataUrl = (text) =>
  QRCode.toDataURL(text, { width: 320, margin: 2 })
