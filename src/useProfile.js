import { useEffect, useRef, useState } from 'react'
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { LANGS, initialLang, profilePath } from './lib/lang'
import { isDeniedError } from './useProgress'

// Lokaler Dev-Bypass (kein uid): Sprache aus ?lang=ne, sonst Japanisch. Es wird
// nichts gespeichert, setLang wirkt nur im Speicher.
function devLang() {
  const wanted = new URLSearchParams(window.location.search).get('lang')
  return Object.prototype.hasOwnProperty.call(LANGS, wanted) ? wanted : 'ja'
}

// Welche Sprache lernt diese Person gerade? Quelle: Profildokument
// users/{uid}/meta/profile ({ lang }). Fehlt es, entscheidet initialLang anhand
// des Japanisch-Lernstands (users/{uid}).
//
// Grundsatz: Wer schon lernt, sieht die Auswahl nie – auch nicht, weil ein Lesen
// langsam ist oder scheitert. Solange etwas aussteht: loading. Scheitert das
// Profil-Lesen, geht es ohne Profil weiter; scheitert die Existenzprüfung,
// gilt "hat Japanisch" (sicherer Standard: Japanisch statt Auswahl).
//
// Geschrieben wird nur bei einer ausdrücklichen Wahl (setLang) – der stille
// Standard für Bestandsnutzer wird NICHT gespeichert.
export function useProfile(uid, isAdmin, onDenied) {
  // Alles trägt die uid, zu der es gehört: so greift beim Nutzerwechsel nie ein
  // Rest des Vorgängers (gleiche Idee wie progressView in useProgress).
  const [profile, setProfile] = useState(null)   // { uid, lang }
  const [hasJa, setHasJa] = useState(null)       // { uid, value }
  const [choice, setChoice] = useState(null)     // { uid, lang } – ausdrückliche Wahl, sofort wirksam
  const [devChoice, setDevChoice] = useState(null)
  const [error, setError] = useState(null)

  // Neuester Callback in einer Ref (AuthGate erzeugt ihn bei jedem Render neu).
  const onDeniedRef = useRef(onDenied)
  onDeniedRef.current = onDenied
  const deniedRef = useRef(false)
  useEffect(() => { deniedRef.current = false }, [uid])
  const handleDenied = (err) => {
    if (!isDeniedError(err) || deniedRef.current) return
    deniedRef.current = true
    onDeniedRef.current?.()
  }

  useEffect(() => {
    setError(null)
    if (!uid || !db) return
    return onSnapshot(
      doc(db, ...profilePath(uid)),
      snap => setProfile({ uid, lang: snap.exists() ? snap.data().lang ?? null : null }),
      // Ohne lesbares Profil weiter wie ohne Profil, nie ewig "lädt".
      err => { setProfile({ uid, lang: null }); handleDenied(err) },
    )
  }, [uid])

  // Einmalig: gibt es schon einen Japanisch-Lernstand?
  useEffect(() => {
    if (!uid || !db) return
    let cancelled = false
    getDoc(doc(db, 'users', uid))
      .then(snap => { if (!cancelled) setHasJa({ uid, value: snap.exists() }) })
      .catch(err => {
        if (cancelled) return
        setHasJa({ uid, value: true })
        handleDenied(err)
      })
    return () => { cancelled = true }
  }, [uid])

  const setLang = async (lang) => {
    if (!Object.prototype.hasOwnProperty.call(LANGS, lang)) return
    if (!uid || !db) { setDevChoice(lang); return }
    setError(null)
    setChoice({ uid, lang }) // optimistisch: Wechsel ist sofort sichtbar
    try {
      await setDoc(doc(db, ...profilePath(uid)), { lang }, { merge: true })
    } catch (err) {
      setError('Die Sprachwahl konnte nicht gespeichert werden.')
      handleDenied(err)
    }
  }

  if (!uid) return { lang: devChoice || devLang(), loading: false, setLang, error: null }
  if (choice && choice.uid === uid) return { lang: choice.lang, loading: false, setLang, error }
  const ready = profile && profile.uid === uid && hasJa && hasJa.uid === uid
  if (!ready) return { lang: null, loading: true, setLang, error }
  const lang = initialLang({ profileLang: profile.lang, hasJaProgress: hasJa.value, isAdmin })
  return { lang, loading: false, setLang, error }
}
