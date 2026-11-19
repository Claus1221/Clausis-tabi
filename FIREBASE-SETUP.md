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

Damit kann jeder nur seine **eigenen** Daten lesen/schreiben – und nur, wenn
seine Adresse freigegeben ist (siehe Abschnitt „Umstellung auf die Freigabeliste"
weiter unten). Wenn du die Regeln schon einmal von Hand gesetzt hast und jetzt
auf die neue Fassung umstellst, folge dort der Reihenfolge, nicht diesem Abschnitt.

## 7. Weitere Personen freischalten

Das geschieht **in der App** unter **Einstellungen → Nutzer verwalten**.
Dort trägst du die Google-Adresse der Person ein. In `src/firebase.js` musst du
dafür nichts mehr ändern.

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

## Umstellung auf die Freigabeliste

Die neuen Regeln lassen nur noch Konten herein, die in der Sammlung `allowed`
stehen (außer dir als Admin). Weil du die Regeln von Hand in der Console setzt,
kommt es auf die **Reihenfolge** an.

> **Reihenfolge einhalten, sonst wird die zweite Person ausgesperrt.**
>
> **Bis Schritt 3 erledigt ist, nichts nach `main` pushen oder mergen.**
> `.github/workflows/deploy.yml` deployt bei jedem Push auf `main` sofort. Käme
> die neue App vor den neuen Regeln online, zeigt sie der zweiten Person
> „Kein Zugang", weil die alten Regeln die Freigabeliste nicht kennen.

**Schritt 0 – Prüfen, was in der Console steht.**
Öffne Firestore → **Regeln** und vergleiche den Text dort mit der bisherigen
Fassung von `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Jeder eingeloggte Nutzer darf NUR sein eigenes Dokument lesen/schreiben.
    // users/{uid} ist an die Google-Konto-ID gebunden — niemand sieht fremde Daten.
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Es zählen nur inhaltliche Unterschiede: Leerzeilen, Einrückung und Kommentare
spielen keine Rolle. Weicht der Text in der Console inhaltlich ab (andere Regeln,
zusätzliche Zeilen), **hör hier auf** und frag nach, bevor du etwas änderst.

**Schritt 1 – Freigabeliste anlegen.**
1. Firestore → Tab **„Daten"** → **„Sammlung starten"**.
2. Sammlungs-ID: `allowed`.
3. Dokument-ID: `balkonien4ever@web.de` (alles klein geschrieben).
4. Feld: Name `addedAt`, Typ **string**, Wert = das heutige Datum (z. B. `2026-11-19`).
5. **Speichern.**

**Schritt 2 – Neue Regeln prüfen, noch nicht veröffentlichen.**
1. Tab **„Regeln"** → den kompletten neuen Inhalt von `firestore.rules` einfügen.
2. **Nicht** auf „Veröffentlichen" klicken, sondern auf **„Regel-Playground"**.
3. Anmeldung simulieren: **Authentifiziert** einschalten, Anbieter `google.com`,
   die E-Mail der jeweiligen Zeile eintragen und die UID der Person.
   Die UIDs findest du in der Firebase-Console unter Authentication → Nutzer,
   Spalte „Nutzer-UID". Für fremd@gmail.com genügt eine ausgedachte UID.
4. Alle Zeilen der Tabelle durchgehen:

| Wer | Vorgang | Pfad | Erwartet |
|---|---|---|---|
| Admin | get, update | `users/<Admin-UID>` | erlaubt |
| balkonien4ever@web.de | get, update | `users/<ihre UID>` | erlaubt |
| balkonien4ever@web.de | get | `users/<Admin-UID>` | verweigert |
| balkonien4ever@web.de, Anbieter `password` (nicht `google.com`) | get | `users/<ihre UID>` | verweigert |
| balkonien4ever@web.de | get, create | `users/<ihre UID>/meta/profile` | erlaubt |
| fremd@gmail.com | get, create | `users/<eigene UID>` | verweigert |
| Admin | create | `users/<Admin-UID>/langs/ne` | erlaubt |
| Admin | create | `users/<Admin-UID>/meta/profile` | erlaubt |
| Admin | list | `allowed` | erlaubt |
| Admin | create, delete | `allowed/test@example.com` | erlaubt |
| balkonien4ever@web.de | get | `allowed/balkonien4ever@web.de` | erlaubt |
| balkonien4ever@web.de | list | `allowed` | verweigert |
| balkonien4ever@web.de | create | `allowed/test@example.com` | verweigert |
| fremd@gmail.com | get | `allowed/fremd@gmail.com` | erlaubt (leer) |

Stimmt auch nur eine Zeile nicht, **nicht veröffentlichen** und nachfragen.

**Schritt 3 – Veröffentlichen.**
Tab **„Regeln"** → **Veröffentlichen**.

**Schritt 4 – Erst danach die neue App deployen** (wie in Abschnitt 8).
Diesen Branch erst nach Schritt 3 nach `main` mergen – jeder Push auf `main`
deployt sofort.

**Schritt 5 – Nach dem Deploy prüfen.**
1. Als Admin anmelden: Der Japanisch-Lernstand ist unverändert.
2. Einstellungen → **Nutzer verwalten**: eine Adresse mit Großbuchstaben
   eintragen – sie erscheint in Kleinbuchstaben in der Liste.
3. Dieselbe Adresse wieder entfernen – sie verschwindet aus der Liste.
4. Die zweite Person einmal anmelden lassen: Ihr Lernstand ist unverändert.
5. Optional: eine Testperson entfernen, während sie die App geöffnet hat. Beim
   nächsten Speichern sieht sie „Kein Zugang".

---

### Hinweis
Solange in `src/firebase.js` noch `HIER_EINFUEGEN` steht, zeigt die App den
Hinweis „Firebase noch nicht konfiguriert" – das ist normal.
