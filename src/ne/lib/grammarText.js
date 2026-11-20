// ─── Was die Erklärung eines Grammatik-Themas zeigt (rein) ────────────────────
// Regel: JEDER body-Abschnitt steht da, wie er geschrieben ist – nie wird Erklärtext
// ausgeblendet. Die strukturierte Liste „Neue Wörter“ (Devanagari, Umschrift, Bedeutung)
// kommt nur dazu, wenn der body KEINEN eigenen Abschnitt „Neue Wörter“/„Neues Wort“ hat;
// hat er einen, erklärt der die Wörter schon (oft mit mehr als nur der Bedeutung).
const NEW_WORDS_HEADING = /^\s*neue?s?\s+w(ö|o)rt(er)?\s*$/i

export const hasNewWordsSection = body => (body || []).some(s => NEW_WORDS_HEADING.test(s.h || ''))

// → { sections: body (unverändert), list: anzuzeigende neue Wörter oder [] }
export function explainParts(body, newWords) {
  const list = newWords?.length && !hasNewWordsSection(body) ? newWords : []
  return { sections: body, list }
}
