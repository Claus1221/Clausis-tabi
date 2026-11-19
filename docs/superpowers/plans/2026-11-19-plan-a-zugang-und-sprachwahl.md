# Plan A: Nutzer freischalten und Sprachwahl – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Admin schaltet Nutzer in der App frei, die Datenbank setzt das durch, und jede Person wählt Japanisch oder Nepali mit getrenntem Lernstand (Nepali zunächst als leere Hülle).

**Architecture:** Freigabeliste als Firestore-Sammlung `allowed/{email}`, geprüft in `firestore.rules` und in `AuthGate`. Zwischen `AuthGate` und den Apps sitzt ein neues `LangGate`, das die Sprache aus `users/{uid}/meta/profile` liest und `TabiApp` oder `ne/NepaliApp` lazy lädt. `useProgress` bekommt einen Sprach-Parameter, der nur den Dokumentpfad wählt.

**Tech Stack:** React 18, Vite 5, Firebase 12 (Auth + Firestore), Vitest (Umgebung `node`, nur reine Logik testbar).

**Spec:** `docs/superpowers/specs/2026-11-19-mehrnutzer-und-nepali-design.md` (§5, §6, Kopfzeile aus §7). Folgeplan: `2026-11-19-plan-b-nepali-zweig.md`.

## Global Constraints

- `users/{uid}` bleibt der Japanisch-Lernstand. Kein Umzug, kein Umschreiben vorhandener Dokumente.
- Die Japanisch-App verhält sich nach jedem Task wie vorher. `npm test` und `npm run build` sind nach jedem Task grün.
- Admin-Adresse: `clausalbers@gmail.com`. Dokument-ID in `allowed` = E-Mail in Kleinbuchstaben.
- Regeln verlangen `sign_in_provider == 'google.com'`, **nicht** `email_verified`.
- Firestore-Regeln werden nie automatisch eingespielt. Der Plan liefert Datei und Anleitung; Claus veröffentlicht von Hand.
- Schichtenregel aus `ARCHITECTURE.md` §1 gilt. Kommentare deutsch, erklären das Warum. Farben/Schrift über `theme.js`. JSX nur in `.jsx`.
- Tests liegen neben der Datei (`*.test.js`) und dürfen nichts importieren, das `window`/`navigator` anfasst.
- Commit-Nachrichten deutsch im Stil des Verlaufs (ein Satz, was sich für Nutzer ändert).
- `ARCHITECTURE.md` wird im selben Task mitgepflegt, der die Struktur ändert.

## Review Focus

1. Adresse mit Großbuchstaben oder Leerzeichen wird freigeschaltet → muss als Kleinbuchstaben-ID landen und beim Login passen (Test in Task 1).
2. Erster Start ohne Netz und ohne Cache → „Keine Verbindung“, nicht „Kein Zugang“ (Test in Task 1).
3. Person wird entfernt, während die App offen ist → „Kein Zugang“ statt leerem Lernstand (Task 5, Handprüfung).
4. Profil enthält unbekannte Sprache oder `ne`, obwohl Nepali für diese Person noch gesperrt ist → Rückfall statt weißem Bildschirm (Test in Task 6).
5. Sprachwechsel bei offener App → kein Lernstand der anderen Sprache sichtbar oder beschreibbar, auch nicht für einen Moment (Test in Task 7 + Handprüfung in Task 9).

## Dateiübersicht

| Datei | Neu/Ändern | Aufgabe |
|---|---|---|
| `src/lib/access.js` (+ Test) | neu | Reine Zugangslogik: Adressen normalisieren, Zustand bestimmen |
| `firestore.rules`, `FIREBASE-SETUP.md` | ändern | Regeln, Umstellungs-Reihenfolge, Playground-Prüfliste |
| `src/firebase.js` | ändern | `ADMIN_EMAILS` ersetzt `ALLOWED_EMAILS` |
| `src/AuthGate.jsx` | ändern | Zugang aus Firestore, `isAdmin`, `recheckAccess` |
| `src/accessStore.js` | neu | Firestore-Zugriffe auf `allowed` |
| `src/screens/adminUsers.jsx` | neu | Abschnitt „Nutzer verwalten“ |
| `src/screens/settings.jsx` | ändern | bindet `AdminUsers` und „Sprache wechseln“ ein |
| `src/lib/lang.js` (+ Test) | neu | Sprachen, Pfade, Startsprache |
| `src/useProgress.js` (+ Test) | ändern | Sprach-Parameter, `onDenied` |
| `src/useProfile.js`, `src/LangGate.jsx` | neu | Profil laden, Auswahl, App laden |
| `src/ne/NepaliApp.jsx` | neu | Hülle des Nepali-Zweigs |
| `src/main.jsx`, `src/TabiApp.jsx`, `src/theme.js`, `src/index.css` | ändern | Einhängen, Schrift |

---

### Task 1: Zugangslogik

**Files:**
- Create: `src/lib/access.js`, `src/lib/access.test.js`

**Interfaces:**
- Produces:
  - `normalizeEmail(s: string): string` – trimmt, Kleinbuchstaben.
  - `isValidEmail(s: string): boolean` – genau ein `@`, links und rechts nicht leer, rechts mit Punkt, keine Leerzeichen, kein `/`.
  - `isAdminEmail(email: string, admins: string[]): boolean`
  - `accessState({ email, admins, docExists, errorCode }): 'admin' | 'allowed' | 'denied' | 'offline'`

- [ ] **Step 1: Failing Tests schreiben**

```js
import { describe, it, expect } from 'vitest'
import { normalizeEmail, isValidEmail, isAdminEmail, accessState } from './access.js'
const ADMINS = ['clausalbers@gmail.com']

describe('normalizeEmail / isValidEmail', () => {
  it('trimmt und schreibt klein', () => expect(normalizeEmail('  Jonas.M@Gmail.com ')).toBe('jonas.m@gmail.com'))
  it('lehnt Unbrauchbares ab', () => {
    for (const s of ['', 'jonas', 'a@b', 'a b@c.de', '@c.de', 'a@', 'a/b@c.de']) expect(isValidEmail(s)).toBe(false)
    expect(isValidEmail('balkonien4ever@web.de')).toBe(true)
  })
})
describe('accessState', () => {
  it('Admin kommt ohne Eintrag rein, auch bei Großschreibung', () =>
    expect(accessState({ email: 'ClausAlbers@gmail.com', admins: ADMINS, docExists: false })).toBe('admin'))
  it('Eintrag vorhanden → allowed', () =>
    expect(accessState({ email: 'x@web.de', admins: ADMINS, docExists: true })).toBe('allowed'))
  it('kein Eintrag → denied', () =>
    expect(accessState({ email: 'x@web.de', admins: ADMINS, docExists: false })).toBe('denied'))
  it('Regel verweigert → denied', () =>
    expect(accessState({ email: 'x@web.de', admins: ADMINS, errorCode: 'permission-denied' })).toBe('denied'))
  it('ohne Netz und ohne Cache → offline, nicht denied', () =>
    expect(accessState({ email: 'x@web.de', admins: ADMINS, errorCode: 'unavailable' })).toBe('offline'))
  it('fehlende Adresse → denied', () =>
    expect(accessState({ email: '', admins: ADMINS, docExists: true })).toBe('denied'))
})
```

- [ ] **Step 2:** `npx vitest run src/lib/access.test.js` → FAIL (Modul fehlt).
- [ ] **Step 3:** `src/lib/access.js` mit den vier Funktionen umsetzen. Jeder `errorCode` außer `permission-denied` zählt als `offline`.
- [ ] **Step 4:** `npx vitest run src/lib/access.test.js` → PASS.
- [ ] **Step 5:** Commit: `Zugangslogik: Adressen normalisieren, Zustand bestimmen`

---

### Task 2: Firestore-Regeln und Umstellungs-Anleitung

**Files:**
- Modify: `firestore.rules` (ganz ersetzen), `FIREBASE-SETUP.md` (Abschnitte 6 und 7 ersetzen, neuer Abschnitt „Umstellung auf die Freigabeliste“)

- [ ] **Step 1: `firestore.rules` ersetzen durch**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Nur Google-Anmeldung zählt. Bewusst NICHT email_verified: ungeprüft, ob das
    // bei Google-Konten mit fremder Domain (web.de) gesetzt ist → Aussperr-Gefahr.
    function viaGoogle() {
      return request.auth != null
        && request.auth.token.firebase.sign_in_provider == 'google.com'
        && 'email' in request.auth.token;
    }
    function email() { return request.auth.token.email.lower(); }
    function isAdmin() { return viaGoogle() && email() == 'clausalbers@gmail.com'; }
    function isAllowed() {
      return isAdmin()
        || (viaGoogle() && exists(/databases/$(database)/documents/allowed/$(email())));
    }

    // Freigabeliste: Dokument-ID = E-Mail in Kleinbuchstaben.
    match /allowed/{addr} {
      allow get: if isAdmin() || (viaGoogle() && email() == addr);
      allow list, write: if isAdmin();
    }

    // Lernstand: users/{uid} (Japanisch) und alles darunter (langs/ne, meta/profile).
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId && isAllowed();
    }
  }
}
```

- [ ] **Step 2: `FIREBASE-SETUP.md` ergänzen.** Neuer Abschnitt mit genau dieser Reihenfolge und dem Hinweis „Reihenfolge einhalten, sonst wird die zweite Person ausgesperrt“:
  0. Regeln in der Console mit der bisherigen Fassung von `firestore.rules` vergleichen (der alte Text wird dafür in die Anleitung kopiert). Bei Abweichung stoppen.
  1. In der Console Sammlung `allowed` anlegen, Dokument-ID `balkonien4ever@web.de`, Feld `addedAt` (String, heutiges Datum).
  2. Neue Regeln im Regel-Playground prüfen (Tabelle unten), noch nicht veröffentlichen.
  3. Veröffentlichen.
  4. Erst danach die neue App deployen.

  Playground-Prüfliste als Tabelle (Anmeldung simulieren mit Anbieter `google.com`):

  | Wer | Vorgang | Pfad | Erwartet |
  |---|---|---|---|
  | Admin | get, update | `users/<Admin-UID>` | erlaubt |
  | balkonien4ever@web.de | get, update | `users/<ihre UID>` | erlaubt |
  | balkonien4ever@web.de | get | `users/<Admin-UID>` | verweigert |
  | fremd@gmail.com | get, create | `users/<eigene UID>` | verweigert |
  | Admin | create | `users/<Admin-UID>/langs/ne` | erlaubt |
  | Admin | create | `users/<Admin-UID>/meta/profile` | erlaubt |
  | Admin | list, create, delete | `allowed/...` | erlaubt |
  | balkonien4ever@web.de | get | `allowed/balkonien4ever@web.de` | erlaubt |
  | balkonien4ever@web.de | list, create | `allowed/...` | verweigert |
  | fremd@gmail.com | get | `allowed/fremd@gmail.com` | erlaubt (leer) |

  Abschnitt 7 („Nur dein Konto zulassen“) ersetzen durch: Freischalten geschieht in der App unter Einstellungen → Nutzer verwalten.

- [ ] **Step 3:** Klammern/Semikolons der Regeldatei gegenlesen; `npm test` → PASS (unverändert).
- [ ] **Step 4:** Commit: `Firestore-Regeln: Freigabeliste wird von der Datenbank durchgesetzt`

---

### Task 3: AuthGate liest die Freigabe aus Firestore

**Files:**
- Modify: `src/firebase.js` (`ALLOWED_EMAILS` → `ADMIN_EMAILS = ['clausalbers@gmail.com']`, Kommentar anpassen)
- Modify: `src/AuthGate.jsx`

**Interfaces:**
- Consumes: `accessState`, `normalizeEmail` aus Task 1.
- Produces: `useAuth()` liefert `{ user, logout, isAdmin: boolean, recheckAccess: () => void }`. Im `DEV_BYPASS`: `{ user: null, logout, isAdmin: false, recheckAccess: () => {} }`.

- [ ] **Step 1:** In `AuthGate` nach dem Login `getDoc(doc(db, 'allowed', normalizeEmail(user.email)))` ausführen; Ergebnis bzw. `err.code` durch `accessState` schicken. Zustand `access: 'checking' | 'admin' | 'allowed' | 'denied' | 'offline'`. Beim Admin die Abfrage überspringen.
- [ ] **Step 2:** Anzeige: `checking` → `Splash „Lädt…“`; `denied` → vorhandener `NoAccessScreen`; `offline` → neuer `OfflineScreen` mit Text „Keine Verbindung. Für die erste Anmeldung auf diesem Gerät wird einmal Internet gebraucht.“ und Knopf „Erneut versuchen“ (ruft `recheckAccess`).
- [ ] **Step 3:** `recheckAccess` wiederholt die Abfrage für den aktuellen Nutzer. `isAllowed` und der Import von `ALLOWED_EMAILS` entfallen.
- [ ] **Step 4: Prüfen.** `npm test` und `npm run build` → grün. `grep -rn ALLOWED_EMAILS src` → keine Treffer. `npm run dev`, `http://localhost:5173/Clausis-tabi/?dev` → App erscheint wie vorher.
- [ ] **Step 5:** `ARCHITECTURE.md` §2 (Zeilen zu `AuthGate.jsx`, `firebase.js`, neue Zeile `lib/access.js`) anpassen.
- [ ] **Step 6:** Commit: `Anmeldung prüft die Freigabeliste in der Datenbank statt im Code`

---

### Task 4: Nutzer verwalten

**Files:**
- Create: `src/accessStore.js`, `src/screens/adminUsers.jsx`
- Modify: `src/screens/settings.jsx` (am Ende der Liste, nur wenn `useAuth().isAdmin`)

**Interfaces:**
- Consumes: `normalizeEmail`, `isValidEmail`, `isAdminEmail` (Task 1); `useAuth().isAdmin` (Task 3); `Card`, `Btn` aus `components/ui.jsx`.
- Produces:
  - `watchAllowed(onList: (rows: {email, name, addedAt}[]) => void, onError: (msg: string) => void): () => void` – `onSnapshot` auf `allowed`, nach `email` sortiert.
  - `addAllowed(email: string, name: string): Promise<void>` – `setDoc(doc(db,'allowed', normalizeEmail(email)), { name: name.trim(), addedAt: localDate() })`.
  - `removeAllowed(email: string): Promise<void>` – `deleteDoc`.
  - `AdminUsers` (default-Export von `adminUsers.jsx`).

- [ ] **Step 1:** `accessStore.js` mit den drei Funktionen. Liegt wie `useProgress.js` in der Wurzel, weil es Firestore anfasst.
- [ ] **Step 2:** `AdminUsers` nach der Skizze in Spec §5: Liste mit „Entfernen“, darunter Felder E-Mail und Name, Knopf „Freischalten“. Verhalten:
  - ungültige Adresse → Hinweis „Das ist keine gültige E-Mail-Adresse.“, kein Schreibvorgang
  - Admin-Adresse → Hinweis „Diese Adresse ist Admin und braucht keinen Eintrag.“
  - schon vorhanden → Hinweis „Schon freigeschaltet.“
  - Entfernen fragt per `window.confirm`: „Zugang für {email} sperren? Der Lernstand bleibt erhalten.“
  - Schreibfehler werden im Abschnitt angezeigt, nicht verschluckt
  - unter der Liste der Satz: „Die Person meldet sich mit genau diesem Google-Konto an.“
- [ ] **Step 3:** In `settings.jsx` einbinden; für Nicht-Admins wird nichts gerendert und kein Listener gestartet.
- [ ] **Step 4: Prüfen.** `npm test`, `npm run build` → grün. Handprüfung durch Claus nach der Regel-Umstellung (in den Task-Bericht schreiben, dass sie aussteht): Adresse mit Großbuchstaben eintragen → erscheint klein geschrieben; entfernen → verschwindet.
- [ ] **Step 5:** `ARCHITECTURE.md` §2 ergänzen (`accessStore.js`, `screens/adminUsers.jsx`).
- [ ] **Step 6:** Commit: `Einstellungen: Admin kann Nutzer freischalten und sperren`

---

### Task 5: Gesperrt bei offener App

**Files:**
- Modify: `src/useProgress.js` (Fehler-Callback von `onSnapshot`, `safeWrite`), `src/TabiApp.jsx`

**Interfaces:**
- Consumes: `useAuth().recheckAccess` (Task 3).
- Produces: `useProgress(uid, lang, { onDenied })` – drittes Argument optional. `onDenied()` wird aufgerufen, wenn Lesen oder Schreiben mit `permission-denied` scheitert. (Der Parameter `lang` kommt in Task 7; hier schon die Signatur `useProgress(uid, lang = 'ja', opts = {})` anlegen und `lang` noch nicht verwenden.)

- [ ] **Step 1:** In `useProgress` beim Snapshot-Fehler und im `catch` von `safeWrite` `err.code === 'permission-denied'` erkennen und `opts.onDenied?.()` rufen. Sonstiges Verhalten unverändert.
- [ ] **Step 2:** `TabiApp` übergibt `{ onDenied: recheckAccess }`.
- [ ] **Step 3:** `npm test`, `npm run build` → grün.
- [ ] **Step 4:** Commit: `Wer gesperrt wird, sieht „Kein Zugang“ statt eines leeren Lernstands`

---

### Task 6: Sprachlogik

**Files:**
- Create: `src/lib/lang.js`, `src/lib/lang.test.js`

**Interfaces:**
- Produces:
  - `LANGS = { ja: { id:'ja', name:'Japanisch', app:'Tabi', glyph:'旅', sub:'Japan-Reise' }, ne: { id:'ne', name:'Nepali', app:'Yatra', glyph:'यात्रा', sub:'Nepal-Reise' } }`
  - `NE_PUBLIC = false` – Nepali-Kachel für alle sichtbar (Plan B stellt auf `true`).
  - `selectableLangs(isAdmin: boolean): string[]`
  - `progressPath(uid: string, lang: string): string[]` – Segmente für `doc(db, ...segmente)`.
  - `profilePath(uid: string): string[]`
  - `initialLang({ profileLang, hasJaProgress, isAdmin }): 'ja' | 'ne' | null` – `null` = Auswahl zeigen.

- [ ] **Step 1: Failing Tests**

```js
import { describe, it, expect } from 'vitest'
import { selectableLangs, progressPath, profilePath, initialLang, NE_PUBLIC } from './lang.js'

describe('Pfade', () => {
  it('Japanisch bleibt im Wurzeldokument', () => expect(progressPath('u1', 'ja')).toEqual(['users', 'u1']))
  it('Nepali liegt darunter', () => expect(progressPath('u1', 'ne')).toEqual(['users', 'u1', 'langs', 'ne']))
  it('unbekannte Sprache wirft', () => expect(() => progressPath('u1', 'xx')).toThrow())
  it('Profil', () => expect(profilePath('u1')).toEqual(['users', 'u1', 'meta', 'profile']))
})
describe('selectableLangs', () => {
  it('Admin sieht beide', () => expect(selectableLangs(true)).toEqual(['ja', 'ne']))
  it('andere sehen Nepali erst nach Freigabe', () =>
    expect(selectableLangs(false)).toEqual(NE_PUBLIC ? ['ja', 'ne'] : ['ja']))
})
describe('initialLang', () => {
  it('gespeicherte Wahl gilt', () => expect(initialLang({ profileLang: 'ne', hasJaProgress: true, isAdmin: true })).toBe('ne'))
  it('Bestandsnutzer ohne Profil → ja, ohne Frage', () => expect(initialLang({ profileLang: null, hasJaProgress: true, isAdmin: false })).toBe('ja'))
  it('neu, mehrere Sprachen wählbar → Auswahl', () => expect(initialLang({ profileLang: null, hasJaProgress: false, isAdmin: true })).toBe(null))
  it('neu, nur eine Sprache wählbar → diese', () => {
    if (!NE_PUBLIC) expect(initialLang({ profileLang: null, hasJaProgress: false, isAdmin: false })).toBe('ja')
  })
  it('unbekannter Profilwert zählt als kein Profil', () => expect(initialLang({ profileLang: 'xx', hasJaProgress: true, isAdmin: false })).toBe('ja'))
  it('ne im Profil, aber für diese Person gesperrt → ja', () => {
    if (!NE_PUBLIC) expect(initialLang({ profileLang: 'ne', hasJaProgress: false, isAdmin: false })).toBe('ja')
  })
})
```

- [ ] **Step 2:** `npx vitest run src/lib/lang.test.js` → FAIL.
- [ ] **Step 3:** `src/lib/lang.js` umsetzen.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Commit: `Sprachlogik: Pfade je Sprache und Startsprache`

---

### Task 7: Lernstand je Sprache

**Files:**
- Modify: `src/useProgress.js`, `src/useProgress.test.js`

**Interfaces:**
- Consumes: `progressPath` (Task 6).
- Produces: `useProgress(uid, lang = 'ja', opts = {})` liest und schreibt `doc(db, ...progressPath(uid, lang))`. Exportiert zusätzlich `DEFAULT_PROGRESS` (das bisherige `DEFAULT`) und `emptyProgress(settings)` – das Objekt, das `reset()` schreibt.

- [ ] **Step 1: Failing Test** in `useProgress.test.js`:

```js
import { emptyProgress, DEFAULT_PROGRESS } from './useProgress.js'
describe('emptyProgress', () => {
  it('setzt jedes Lernstand-Feld zurück und behält nur die Einstellungen', () => {
    const e = emptyProgress({ options: 4 })
    expect(Object.keys(e).sort()).toEqual(Object.keys(DEFAULT_PROGRESS).sort())
    expect(e.settings).toEqual({ options: 4 })
    expect(e.srs).toEqual({}); expect(e.completedLessons).toEqual([])
  })
})
```

- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** Umsetzen: `ref()` und der Listener nutzen `progressPath`. Der Effekt hängt an `[uid, lang]` und setzt beim Wechsel **sofort** `progress` auf `DEFAULT_PROGRESS` und `loading` auf `true`, bevor der neue Snapshot kommt – sonst ist für einen Moment der Stand der anderen Sprache sichtbar und beschreibbar. `reset()` schreibt `emptyProgress(progress.settings || {})`.
- [ ] **Step 4:** `npm test` → PASS (alle bisherigen Tests unverändert grün).
- [ ] **Step 5:** `ARCHITECTURE.md` §2/§3 (useProgress, Datenmodell `langs/ne`, `meta/profile`) anpassen.
- [ ] **Step 6:** Commit: `Lernstand wird je Sprache getrennt gespeichert`

---

### Task 8: Profil, Sprachwahl und Nepali-Hülle

**Files:**
- Create: `src/useProfile.js`, `src/LangGate.jsx`, `src/ne/NepaliApp.jsx`
- Modify: `src/main.jsx`, `src/theme.js`, `src/index.css`

**Interfaces:**
- Consumes: `LANGS`, `selectableLangs`, `initialLang`, `profilePath`, `progressPath` (Task 6); `useAuth()` (Task 3); `useProgress(uid, 'ne', { onDenied })` (Task 7).
- Produces:
  - `useProfile(uid, isAdmin): { lang: 'ja'|'ne'|null, loading: boolean, setLang(lang): Promise<void> }` – liest das Profil per `onSnapshot`; fehlt es, prüft es einmalig per `getDoc`, ob `users/{uid}` existiert, und wendet `initialLang` an. `setLang` schreibt `{ lang }` mit `merge`.
  - `useLang(): { lang, setLang, langs: string[] }` (Context aus `LangGate.jsx`).
  - `LangGate` (benannter Export) – ohne Kinder; lädt `TabiApp` bzw. `ne/NepaliApp` per `React.lazy`.
  - `NE` in `theme.js`: `"'Noto Sans Devanagari', 'Kohinoor Devanagari', 'Nirmala UI', sans-serif"`.

- [ ] **Step 1:** `useProfile.js` umsetzen. Im Dev-Bypass (kein `uid`) kommt die Sprache aus dem URL-Parameter `lang` (Standard `ja`), `setLang` wirkt nur im Speicher.
- [ ] **Step 2:** `LangGate.jsx`: `loading` → „Lädt…“; `lang === null` → Auswahlbildschirm nach Skizze in Spec §6 (Überschrift „Was möchtest du lernen?“, je Sprache eine Kachel mit `glyph`, `name`, „{app} · {sub}“; nur `selectableLangs(isAdmin)`); sonst die App in `Suspense`. `key={lang}` an der App, damit beim Wechsel nichts aus der anderen Sprache im Speicher bleibt.
- [ ] **Step 3:** `main.jsx`: `<AuthGate><LangGate /></AuthGate>`.
- [ ] **Step 4:** `index.css`: Noto Sans Devanagari (400, 500, 700) über dieselbe Google-Fonts-Einbindung wie Noto Sans JP laden. `theme.js`: `NE` exportieren.
- [ ] **Step 5:** `ne/NepaliApp.jsx`: Kopfzeile wie `TabiApp`, aber Siegel-Glyphe `य`, Titel „Yatra“, Unterzeile „यात्रा · Nepali für Reisende“; Level aus `computeStats(progress)`; Knöpfe „Sprache wechseln“ (öffnet dieselbe Auswahl) und „Abmelden“. Inhalt: eine `Card` „Der Nepali-Kurs ist im Aufbau.“ Stellt `ProgressCtx` mit `useProgress(uid, 'ne', { onDenied: recheckAccess })` bereit, damit Plan B direkt aufsetzt.
- [ ] **Step 6: Prüfen.** `npm test`, `npm run build` → grün; im Build-Log gibt es einen eigenen Chunk für `NepaliApp`. `npm run dev`: `?dev` → Japanisch wie vorher; `?dev&lang=ne` → Yatra-Hülle, Devanagari wird in Noto Sans Devanagari dargestellt (in den DevTools am Element prüfen).
- [ ] **Step 7:** `ARCHITECTURE.md` §1 (Schichtenbild: `AuthGate → LangGate → TabiApp | ne/NepaliApp`), §2 (neue Dateien, Verzeichnis `ne/`, Importregel aus Spec §7) anpassen.
- [ ] **Step 8:** Commit: `Sprachwahl nach dem Login, Nepali als leere Hülle`

---

### Task 9: Sprache in den Einstellungen wechseln

**Files:**
- Modify: `src/screens/settings.jsx`, `src/LangGate.jsx`

**Interfaces:**
- Consumes: `useLang()` (Task 8), `LANGS`.

- [ ] **Step 1:** In `settings.jsx` oben eine `Card` „Sprache“: zeigt die aktuelle Sprache und je weiterer wählbarer Sprache einen Knopf „Zu {name} wechseln“. Ist nur eine Sprache wählbar, wird die Karte nicht gezeigt. Text darunter: „Dein Lernstand bleibt für jede Sprache erhalten.“
- [ ] **Step 2:** `NepaliApp`-Knopf „Sprache wechseln“ ruft dieselbe `setLang`.
- [ ] **Step 3: Prüfen.** `npm test`, `npm run build` → grün. Handprüfung mit `?dev`: wechseln hin und zurück; nach dem Wechsel zeigt die Kopfzeile sofort das Level der neuen Sprache (im Dev-Bypass 1), nie kurz das alte.
- [ ] **Step 4:** Commit: `Einstellungen: Sprache wechseln`

---

## Abschluss (durch Claus)

1. Umstellung nach `FIREBASE-SETUP.md` in der vorgegebenen Reihenfolge.
2. Nach dem Deploy: mit dem Admin-Konto anmelden → Japanisch-Stand unverändert; Einstellungen → Freund eintragen.
3. Zweite Person bitten, sich einmal anzumelden → ihr Stand ist unverändert.
