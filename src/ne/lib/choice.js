// Zustand einer Antwort-Option für components/Choice.jsx (rein): vor der Antwort neutral,
// danach die richtige 'correct', die gewählte falsche 'wrong', alle übrigen neutral.
// picked = null/undefined heißt „noch nicht geantwortet“ (0 ist eine gültige Wahl).
export function choiceState(option, picked, correct) {
  if (picked === null || picked === undefined) return 'neutral'
  if (option === correct) return 'correct'
  return option === picked ? 'wrong' : 'neutral'
}
