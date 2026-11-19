import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from './firebase.js'
import { normalizeEmail } from './lib/access.js'
import { localDate } from './useProgress.js'

// ─── Freigabeliste (Firestore-Sammlung `allowed`) ────────────────────────────
// Dokument-ID = E-Mail in Kleinbuchstaben; die Firestore-Regeln lassen nur den
// Admin schreiben. Liegt wie useProgress.js in der Wurzel, weil es Firestore anfasst.

// Hört live auf die Liste, sortiert nach E-Mail. Gibt die Abmelde-Funktion zurück.
export function watchAllowed(onList, onError) {
  return onSnapshot(
    collection(db, 'allowed'),
    snap => {
      const rows = snap.docs.map(d => ({ email: d.id, name: d.data().name || '', addedAt: d.data().addedAt || '' }))
      rows.sort((a, b) => a.email.localeCompare(b.email))
      onList(rows)
    },
    err => onError(err.message || String(err)),
  )
}

export function addAllowed(email, name) {
  return setDoc(doc(db, 'allowed', normalizeEmail(email)), { name: name.trim(), addedAt: localDate() })
}

export function removeAllowed(email) {
  return deleteDoc(doc(db, 'allowed', normalizeEmail(email)))
}
