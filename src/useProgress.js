import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from './firebase'

// Standard-Fortschritt, falls noch nichts gespeichert ist.
const DEFAULT = {
  completedLessons: [], // IDs abgeschlossener Lektionen, z.B. ['l1','l2']
}

// Lädt den Fortschritt des Nutzers live aus Firestore (users/{uid}) und
// gibt eine update()-Funktion zurück, die Änderungen wieder speichert.
// Schreibt sich automatisch zwischen allen Geräten synchron.
export function useProgress(uid) {
  const [progress, setProgress] = useState(DEFAULT)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid || !db) { setLoading(false); return }
    const ref = doc(db, 'users', uid)
    const unsub = onSnapshot(
      ref,
      snap => {
        setProgress(snap.exists() ? { ...DEFAULT, ...snap.data() } : DEFAULT)
        setLoading(false)
      },
      () => setLoading(false), // bei Fehler (z.B. Regeln) nicht hängen bleiben
    )
    return unsub
  }, [uid])

  // patch wird mit dem vorhandenen Dokument zusammengeführt (merge).
  const update = async (patch) => {
    if (!uid || !db) return
    await setDoc(doc(db, 'users', uid), patch, { merge: true })
  }

  return { progress, update, loading }
}
