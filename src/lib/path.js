import { LESSONS } from '../data/kana.js'
import { WORD_BLOCKS } from '../data/words.js'
import { GRAMMAR } from '../data/grammar.js'
import { CHAPTER_BY_ID } from '../data/chapters.js'

export function isNodeDone(node, progress) {
  if (node.type === 'kana') return (progress.completedLessons || []).includes(node.id)
  if (node.type === 'word') return (progress.completedWordBlocks || []).includes(node.id)
  if (node.type === 'grammar') return (progress.completedGrammar || []).includes(node.id)
  if (node.type === 'chapter') return (progress.completedChapters || []).includes(node.id)
  return false
}
export function pathNodeMeta(node) {
  if (node.type === 'kana') { const l = LESSONS.find(x => x.id === node.id); return { face: l.kana[0], label: l.title, kind: l.script } }
  if (node.type === 'word') { const b = WORD_BLOCKS.find(x => x.id === node.id); return { face: b.words[0].kanji, label: b.title, kind: 'Wörter' } }
  if (node.type === 'grammar') { const g = GRAMMAR.find(x => x.id === node.id); return { face: g.glyph, label: g.title, kind: 'Grammatik' } }
  if (node.type === 'chapter') { const c = CHAPTER_BY_ID[node.id]; return { face: '物', label: c ? c.title : 'Geschichte', kind: 'Kapitel' } }
  return { face: '富', label: 'Gipfel', kind: 'Ziel' }
}

