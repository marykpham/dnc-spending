// Newest filing number this browser has already looked at, used to flag what is new since the last visit.
const KEY = 'dnc-seen-filing'

export function readSeen(): number | undefined {
  try {
    const n = Number(localStorage.getItem(KEY))
    return n > 0 ? n : undefined
  } catch {
    return undefined
  }
}

export function writeSeen(file: number) {
  try {
    localStorage.setItem(KEY, String(file))
  } catch {
    /* storage can be blocked; the badges just won't persist */
  }
}

/** What was stored when the page loaded, so "new" survives switching tabs within one visit. */
export const seenAtLoad = readSeen()
