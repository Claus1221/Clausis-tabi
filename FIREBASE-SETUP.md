# Firebase einrichten (Google-Login + Lernerfolg speichern)

Diese Schritte machst **du** einmal in der Firebase-Console mit deinem **privaten**
Google-Konto. Claude wird **nicht** mit Firebase verbunden – du trägst nur die
fertigen Werte in `src/firebase.js` ein. Danach läuft alles automatisch.

Dauer: ~10 Minuten.

---

## 1. Firebase-Projekt anlegen

1. Öffne **https://console.firebase.google.com** und melde dich mit deinem
   **privaten** Google-Konto an.
2. **„Projekt hinzufügen"** → Name z. B. `tabi` → weiter.
3. Google Analytics kannst du **deaktivieren** (nicht nötig) → **Projekt erstellen**.

## 2. Web-App registrieren & Config holen

1. Im Projekt auf das **Web-Symbol `</>`** klicken („App hinzufügen").
2. Spitzname z. B. `tabi-web` → **App registrieren** (Hosting-Haken NICHT nötig).
3. Es erscheint ein Code-Block `const firebaseConfig = { … }`.
   Kopiere die **6 Werte** (apiKey, authDomain, projectId, storageBucket,
   messagingSenderId, appId).
4. Trage sie in **`src/firebase.js`** ein (ersetze die `HIER_EINFUEGEN`-Werte).

> Diese Werte sind **keine Geheimnisse** – sie dürfen öffentlich im Repo stehen.

## 3. Google-Anmeldung aktivieren

1. Linke Leiste → **Build → Authentication** → **„Los geht's"**.
2. Tab **„Sign-in method"** → **Google** auswählen → **Aktivieren**.
3. „Support-E-Mail" wählen → **Speichern**.

## 4. Deine Domain erlauben

1. Authentication → **Settings** → **Authorized domains**.
2. **„Domain hinzufügen"** → `claus1221.github.io` eintragen → speichern.
   (`localhost` ist für lokale Tests schon erlaubt.)

## 5. Firestore-Datenbank anlegen

1. Linke Leiste → **Build → Firestore Database** → **„Datenbank erstellen"**.
2. Modus: **Im Produktionsmodus starten** → weiter.
3. Standort: z. B. **eur3 (europe-west)** → **Aktivieren**.

## 6. Sicherheitsregeln setzen

1. Firestore → Tab **„Regeln"**.
2. Den kompletten Inhalt der Datei **`firestore.rules`** (im Projekt) dort
   einfügen → **Veröffentlichen**.

Damit kann jeder nur seine **eigenen** Daten lesen/schreiben.

## 7. (Optional, empfohlen) Nur dein Konto zulassen

In **`src/firebase.js`** beim Feld `ALLOWED_EMAILS` deine Gmail-Adresse eintragen:

```js
export const ALLOWED_EMAILS = [
  'deine-email@gmail.com',
]
```

Dann dürfen andere Google-Konten sich zwar einloggen, sehen aber nur
„Kein Zugang". Leer lassen = jedes Google-Konto darf rein (jeder mit eigenen Daten).

## 8. Deployen & testen

Aus dem Projektverzeichnis (`C:\clausis-tabi`):

```
git add -A
git commit -m "Firebase-Konfiguration eingetragen"
git push
```

Nach ~1–2 Min auf https://claus1221.github.io/Clausis-tabi/ :
Du solltest jetzt den **„Mit Google anmelden"**-Bildschirm sehen. Nach der
Anmeldung erscheint die App; abgeschlossene Lektionen werden gespeichert und
tauchen auf jedem Gerät wieder auf.

---

### Hinweis
Solange in `src/firebase.js` noch `HIER_EINFUEGEN` steht, zeigt die App den
Hinweis „Firebase noch nicht konfiguriert" – das ist normal.
