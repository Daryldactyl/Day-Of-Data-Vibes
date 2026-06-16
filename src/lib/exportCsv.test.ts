import { describe, it, expect, vi } from 'vitest'
import { toCsv, exportFilename, buildCsvFile, shareOrDownload } from './exportCsv'
import type { Lead } from './leads'

describe('toCsv', () => {
  it('emits a header row plus one data row for a single Lead', () => {
    const leads: Lead[] = [
      { name: 'Ada Lovelace', email: 'ada@dayofdata.example', scannedAt: '2026-06-16T10:00:00.000Z' },
    ]
    expect(toCsv(leads)).toBe(
      'Name,Email,Scanned At\r\nAda Lovelace,ada@dayofdata.example,2026-06-16T10:00:00.000Z',
    )
  })

  it('emits one record per Lead in array (scan) order, CRLF-separated', () => {
    const leads: Lead[] = [
      { name: 'Ada Lovelace', email: 'ada@dayofdata.example', scannedAt: '2026-06-16T10:00:00.000Z' },
      { name: 'Alan Turing', email: 'alan@dayofdata.example', scannedAt: '2026-06-16T10:05:00.000Z' },
    ]
    expect(toCsv(leads)).toBe(
      'Name,Email,Scanned At\r\n' +
        'Ada Lovelace,ada@dayofdata.example,2026-06-16T10:00:00.000Z\r\n' +
        'Alan Turing,alan@dayofdata.example,2026-06-16T10:05:00.000Z',
    )
  })

  it('quotes a field containing a comma (RFC-4180)', () => {
    const leads: Lead[] = [
      { name: 'Lovelace, Ada', email: 'ada@dayofdata.example', scannedAt: '2026-06-16T10:00:00.000Z' },
    ]
    expect(toCsv(leads)).toBe(
      'Name,Email,Scanned At\r\n"Lovelace, Ada",ada@dayofdata.example,2026-06-16T10:00:00.000Z',
    )
  })

  it('quotes a field containing a double-quote and doubles the inner quote', () => {
    const leads: Lead[] = [
      { name: 'Ada "Ace" Lovelace', email: 'ada@dayofdata.example', scannedAt: '2026-06-16T10:00:00.000Z' },
    ]
    expect(toCsv(leads)).toBe(
      'Name,Email,Scanned At\r\n"Ada ""Ace"" Lovelace",ada@dayofdata.example,2026-06-16T10:00:00.000Z',
    )
  })

  it('quotes a field containing a newline', () => {
    const leads: Lead[] = [
      { name: 'Ada\nLovelace', email: 'ada@dayofdata.example', scannedAt: '2026-06-16T10:00:00.000Z' },
    ]
    expect(toCsv(leads)).toBe(
      'Name,Email,Scanned At\r\n"Ada\nLovelace",ada@dayofdata.example,2026-06-16T10:00:00.000Z',
    )
  })

  it('emits the header row only for an empty Leads list', () => {
    expect(toCsv([])).toBe('Name,Email,Scanned At')
  })
})

describe('exportFilename', () => {
  it('builds day-of-data-leads-YYYY-MM-DD.csv from the given date', () => {
    expect(exportFilename(new Date('2026-07-18T09:00:00'))).toBe(
      'day-of-data-leads-2026-07-18.csv',
    )
  })
})

describe('shareOrDownload', () => {
  const file = new File(['x'], 'day-of-data-leads-2026-06-16.csv', { type: 'text/csv' })

  it('shares the File when canShare is true; does not download', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const download = vi.fn()
    await shareOrDownload(file, { canShare: () => true, share, download })
    expect(share).toHaveBeenCalledTimes(1)
    expect(share).toHaveBeenCalledWith(file)
    expect(download).not.toHaveBeenCalled()
  })

  it('downloads the File when canShare is false; does not share', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const download = vi.fn()
    await shareOrDownload(file, { canShare: () => false, share, download })
    expect(download).toHaveBeenCalledTimes(1)
    expect(download).toHaveBeenCalledWith(file)
    expect(share).not.toHaveBeenCalled()
  })

  it('resolves quietly when the Vendor cancels the share (AbortError); does not download', async () => {
    const share = vi.fn().mockRejectedValue(
      new DOMException('The user aborted a request.', 'AbortError'),
    )
    const download = vi.fn()
    await expect(
      shareOrDownload(file, { canShare: () => true, share, download }),
    ).resolves.toBeUndefined()
    expect(download).not.toHaveBeenCalled()
  })

  it('falls back to download when share fails with a non-abort error', async () => {
    const share = vi.fn().mockRejectedValue(new Error('share unavailable'))
    const download = vi.fn()
    await expect(
      shareOrDownload(file, { canShare: () => true, share, download }),
    ).resolves.toBeUndefined()
    expect(download).toHaveBeenCalledTimes(1)
    expect(download).toHaveBeenCalledWith(file)
  })

  it('shares the File built by buildCsvFile, carrying its name and text/csv type', async () => {
    const leads: Lead[] = [
      { name: 'Ada Lovelace', email: 'ada@dayofdata.example', scannedAt: '2026-06-16T10:00:00.000Z' },
    ]
    const csv = buildCsvFile(leads, new Date('2026-06-16T10:00:00'))
    const share = vi.fn().mockResolvedValue(undefined)
    await shareOrDownload(csv, { canShare: () => true, share, download: vi.fn() })
    const shared = share.mock.calls[0][0] as File
    expect(shared.name).toBe('day-of-data-leads-2026-06-16.csv')
    expect(shared.type).toBe('text/csv')
  })
})

describe('buildCsvFile', () => {
  it('assembles a text/csv File named for the date, BOM-prefixed', async () => {
    const leads: Lead[] = [
      { name: 'José Núñez', email: 'jose@dayofdata.example', scannedAt: '2026-07-18T09:00:00.000Z' },
    ]
    const file = buildCsvFile(leads, new Date('2026-07-18T09:00:00'))
    expect(file.name).toBe('day-of-data-leads-2026-07-18.csv')
    expect(file.type).toBe('text/csv')
    // The UTF-8 BOM must be the first 3 bytes (EF BB BF) so Excel reads
    // accented names correctly. (Blob.text() decodes the BOM away, so assert
    // the raw bytes.)
    const bytes = new Uint8Array(await file.arrayBuffer())
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf])
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes)
    expect(text).toBe('﻿' + toCsv(leads))
  })
})
