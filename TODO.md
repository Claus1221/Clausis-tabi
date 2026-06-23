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
- [ ] **Beispielsätze begrenzen** – In Beispielsätzen nur Grammatik und Wörter
      verwenden, die schon einmal dran kamen. *(Für neue Kapitel (c7) per Skript
      geprüft; ein Audit des Altbestands (Grammatik-Themen, Wortblöcke) steht noch
      aus.)*
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
