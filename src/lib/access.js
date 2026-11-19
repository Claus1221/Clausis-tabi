// Zugangslogik fuer die Anmeldung: reine Funktionen ohne Firebase oder React,
// damit sie ohne Browser testbar sind und am Login-Gate nur noch zusammengesetzt werden.

// Adressen werden immer klein geschrieben, weil E-Mail-Adressen in der Praxis
// unterschiedlich gross eingegeben werden, die Dokument-ID in `allowed` aber fest ist.
export function normalizeEmail(s) {
  return String(s ?? '').trim().toLowerCase()
}

// Bewusst grob gehalten: Ziel ist nur, offensichtliche Tippfehler vor dem Speichern
// abzufangen. Die eigentliche Pruefung passiert durch die Freigabeliste.
export function isValidEmail(s) {
  if (typeof s !== 'string') return false
  const parts = s.split('@')
  if (parts.length !== 2) return false
  const [left, right] = parts
  if (!left || !right) return false
  if (!right.includes('.')) return false
  if (/\s/.test(s) || s.includes('/')) return false
  return true
}

export function isAdminEmail(email, admins) {
  const e = normalizeEmail(email)
  if (!e || !Array.isArray(admins)) return false
  return admins.some((a) => normalizeEmail(a) === e)
}

// Reihenfolge ist Absicht: Admin kommt vor dem Netz-Fehler, damit der Betreiber
// auch offline hereinkommt. Ein verweigerter Zugriff ist ein echtes "nein";
// jeder andere Fehler heisst nur, dass gerade nicht geprueft werden kann.
export function accessState({ email, admins, docExists, errorCode }) {
  const e = normalizeEmail(email)
  if (!e) return 'denied'
  if (isAdminEmail(e, admins)) return 'admin'
  if (errorCode === 'permission-denied') return 'denied'
  if (errorCode) return 'offline'
  return docExists ? 'allowed' : 'denied'
}

// Das Pruef-Ergebnis gehoert einem Nutzer (uid). Wechselt der Nutzer direkt
// (z. B. Abmelden und Anmelden in einem anderen Tab), darf das Ergebnis des
// Vorgaengers keinen Moment lang fuer den Neuen gelten: dann gilt "checking".
export function effectiveAccess(access, uid) {
  if (!access || !uid || access.uid !== uid) return 'checking'
  return access.state
}

// Bremse gegen eine Endlosschleife: Bekäme ein freigegebener Nutzer dauerhaft
// permission-denied auf sein Fortschrittsdokument, würde die automatische
// Neupruefung die App immer wieder neu aufbauen. Hoechstens eine pro Pause.
export function mayRecheck(lastAt, now, minGapMs = 30000) {
  return lastAt == null || now - lastAt >= minGapMs
}
