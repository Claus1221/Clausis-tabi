# Tabi – Offene Aufgaben

Backlog der noch zu programmierenden bzw. zu überarbeitenden Features.

## Thema Reise

- [ ] **Geschichte fortführen** – Die Geschichte soll nicht am Gipfel enden. Den
      weiteren Verlauf logisch aufbauen.
- [ ] **Tourismus-Orientierung** – Die Fortführung der Geschichte daran ausrichten,
      was man als Tourist in Japan am ehesten braucht.
- [ ] **Neue Inhalte einführen** – Immer wieder neue Wörter und neue Grammatik
      einführen.
- [x] **Kanji-Herkunft zeigen** – Wenn neue Wörter eingeführt werden, zeigen, woher
      das Kanji kommt: welche Radikale es benutzt, ob es ein eigenes Radikal ist
      oder ein Piktogramm. *(Erledigt: `KANJI_ORIGIN`-Datenbank + `KanjiOrigin`-
      Komponente in Reise-Einführung (IntroStep) und Vokabel-Detail; deckt alle 28
      aktuell eingeführten Kanji ab. Neue Kanji brauchen je einen Eintrag.)*
- [ ] **Beispielsätze begrenzen** – In Beispielsätzen nur Grammatik und Wörter
      verwenden, die schon einmal dran kamen.
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
