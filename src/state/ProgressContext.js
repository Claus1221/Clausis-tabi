import { createContext } from 'react'
import { SETTINGS_DEFAULTS } from '../useProgress.js'

// Fortschritt (aus Firestore) für alle Screens verfügbar machen.
export const ProgressCtx = createContext({
  progress: { completedLessons: [], completedWordBlocks: [], completedGrammar: [], completedChapters: [], completedDialogs: [], chapterStars: {}, xpByDate: {}, srs: {}, settings: {} },
  settings: SETTINGS_DEFAULTS,
  loading: false, // Nepali reicht den Ladezustand aus useProgress durch (Japanisch nicht)
  awardXp: async () => {},
  completeLesson: async () => {},
  completeWordBlock: async () => {},
  completeGrammar: async () => {},
  completeChapter: async () => {},
  completeDialog: async () => {},
  reviewCard: async () => {},
  scheduleNew: async () => {},
  saveNote: async () => {},
  saveSettings: async () => {},
  bumpChapterStars: async () => {},
  reset: async () => {},
})
