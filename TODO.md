# Tabi – Offene Aufgaben

Backlog der noch zu programmierenden bzw. zu überarbeitenden Features.

## Thema Reise

- [ ] **Geschichte fortführen** – Die Geschichte soll nicht am Gipfel enden. Den
      weiteren Verlauf logisch aufbauen. *(In Arbeit: Kapitel **c7 „Ankunft in
      Tokyo"** als erstes Muster nach dem Gipfel ergänzt; der Reise-Pfad geht jetzt
      über den Gipfel hinaus. Weitere Kapitel folgen nach Stil-Freigabe.)*
- [ ] **Tourismus-Orientierung** – Die Fortführung der Geschichte daran ausrichten,
      was man als Tourist in Japan am ehesten braucht. *(c7 = Bahnhof/Ausgang/
      Richtung – klassische Ankunfts-Situationen.)*
- [ ] **Neue Inhalte einführen** – Immer wieder neue Wörter und neue Grammatik
      einführen. *(c7 führt 東京/出口/右/左 + ここ・そこ・あそこ・どこ ein.)*
- [x] **Kanji-Herkunft zeigen** – Wenn neue Wörter eingeführt werden, zeigen, woher
      das Kanji kommt: welche Radikale es benutzt, ob es ein eigenes Radikal ist
      oder ein Piktogramm. *(Erledigt: `KANJI_ORIGIN`-Datenbank + `KanjiOrigin`-
      Komponente in Reise-Einführung (IntroStep) und Vokabel-Detail; deckt alle 28
      aktuell eingeführten Kanji ab. Neue Kanji brauchen je einen Eintrag.)*
- [x] **Beispielsätze begrenzen** – In Beispielsätzen nur Grammatik und Wörter
      verwenden, die schon einmal dran kamen. *(Audit-Werkzeug `scripts/
      audit-examples.mjs` erstellt. Strategie „inline akzeptieren + Ausreißer
      fixen": die 3 klaren Fälle behoben (g6 ohne を, c5 山 statt 家, g9 猫の目 statt
      日本) → 35 → 24 Funde. Die verbleibenden sind bewusst akzeptiert: Grammatik-/
      Wortlektionen führen ihre Beispielwörter antippbar selbst ein, da Grammatik
      vor dem Vokabular gelehrt wird. Audit-Tool bleibt für neue Inhalte.)*
- [x] **Multiple-Choice randomisieren** – Bei Multiple-Choice-Antworten die richtige
      Antwort zufällig verteilen; nicht immer die erste Auswahlmöglichkeit darf
      richtig sein. *(Erledigt: Optionen werden in GrammarExercise, ChoiceStep und
      RolePlay-Dialog pro Frage stabil gemischt.)*

## Thema Üben – Rollenspiel

- [x] **Freischaltung an Lernfortschritt koppeln** – Rollenspiel-Lektionen erst
      freischalten, wenn die jeweiligen Vokabeln und die Grammatik dazu gelernt
      wurden, d. h. in der Reise schon einmal dran kamen. *(Erledigt: `dialogGate`
      leitet Vokabel-/Grammatik-Bedarf aus den Antworten ab und prüft gegen das,
      was die Reise lehrt. Strikt, aber selbst-nachziehend – Wörter, die die Reise
      noch nicht lehrt, sperren nicht, greifen aber automatisch, sobald sie in der
      Reise eingeführt werden. Pfad-Reihenfolge bleibt zusätzlich erhalten.)*
