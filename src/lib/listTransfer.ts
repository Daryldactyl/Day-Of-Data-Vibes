import { addLead, type Lead } from './leads'

/** Default Leads per QR code (tunable; see PRD / ADR-0004). Slice 14's density
 *  decision: 8–10 Leads/chunk so the codes stay scannable by a real receiver
 *  camera at the enlarged sender QR size — confirmed on real phones. */
export const DEFAULT_CHUNK_SIZE = 9

/** One scanned QR's decoded contents. */
export interface ListChunk {
  transferId: string
  index: number
  total: number
  leads: Lead[]
}

/** Split `leads` into ceil(N/chunkSize) chunks; one payload STRING per QR code,
 *  in order. `transferId` + `chunkSize` are passed in (no hidden id/clock). */
export function encodeListChunks(
  leads: Lead[],
  transferId: string,
  chunkSize: number,
): string[] {
  const total = Math.ceil(leads.length / chunkSize)
  const codes: string[] = []
  for (let index = 0; index < total; index++) {
    const slice = leads.slice(index * chunkSize, index * chunkSize + chunkSize)
    codes.push(
      JSON.stringify({
        dod: 'leads',
        v: 1,
        id: transferId,
        i: index,
        m: total,
        leads: slice,
      }),
    )
  }
  return codes
}

/** Parse one scanned QR string back into a ListChunk, or null if it isn't a
 *  list payload (a vCard Badge or arbitrary junk → null). Guarded JSON.parse +
 *  marker check keeps the badge/non-badge boundary sharp (ADR-0001). */
export function decodeChunk(text: string): ListChunk | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const obj = parsed as Record<string, unknown>
  if (obj.dod !== 'leads') return null
  // Marked, but structurally malformed → not a usable chunk. Guarding here keeps
  // reassembleChunks total-/index-safe and the boundary a clean null.
  if (
    typeof obj.id !== 'string' ||
    typeof obj.i !== 'number' ||
    typeof obj.m !== 'number' ||
    !Array.isArray(obj.leads)
  ) {
    return null
  }
  return {
    transferId: obj.id,
    index: obj.i,
    total: obj.m,
    leads: obj.leads as Lead[],
  }
}

/** Reassemble scanned chunks. The FIRST chunk's transferId is the active
 *  transfer; foreign-id chunks are ignored. Idempotent by index, tolerant of
 *  out-of-order arrival. `missing` = indices not yet present; `complete` when
 *  all `total` indices are in; `leads` = chunks concatenated in index order. */
export function reassembleChunks(chunks: ListChunk[]): {
  have: number
  total: number
  missing: number[]
  complete: boolean
  leads: Lead[]
} {
  // Nothing scanned yet: a transfer with no chunks is not complete (total is
  // unknown, so complete must be false — not the vacuous missing.length===0).
  if (chunks.length === 0) {
    return { have: 0, total: 0, missing: [], complete: false, leads: [] }
  }
  const active = chunks[0]
  const transferId = active.transferId
  const total = active.total

  const byIndex = new Map<number, ListChunk>()
  for (const chunk of chunks) {
    if (chunk.transferId !== transferId) continue
    if (!byIndex.has(chunk.index)) byIndex.set(chunk.index, chunk)
  }

  const missing: number[] = []
  for (let i = 0; i < total; i++) {
    if (!byIndex.has(i)) missing.push(i)
  }

  const have = byIndex.size
  const complete = missing.length === 0

  const leads: Lead[] = []
  for (let i = 0; i < total; i++) {
    const chunk = byIndex.get(i)
    if (chunk) leads.push(...chunk.leads)
  }

  return { have, total, missing, complete, leads }
}

/** Fold each incoming Lead through `addLead` (ADR-0002): dedupe by normalized
 *  email (existing wins), append genuinely-new Leads WITH THEIR OWN scannedAt
 *  (not "now"), non-destructive. Returns the merged list and added/skipped counts. */
export function mergeLeads(
  existing: Lead[],
  incoming: Lead[],
): { merged: Lead[]; added: number; skipped: number } {
  let merged = existing
  let added = 0
  let skipped = 0
  for (const lead of incoming) {
    const result = addLead(merged, lead, lead.scannedAt)
    merged = result.leads
    if (result.status === 'saved') added++
    else skipped++
  }
  return { merged, added, skipped }
}
