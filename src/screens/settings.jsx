import { useContext, useState } from 'react'
import { C, JP } from '../theme.js'
import { ProgressCtx } from '../state/ProgressContext.js'
import { SPEECH_INPUT_SUPPORTED } from '../lib/listen.js'
import { getApiKey, setApiKey, getTtsKey, setTtsKey } from '../lib/apiKey.js'
import { pingApiKey } from '../lib/claude.js'
import { pingTtsKey } from '../lib/ttsCloud.js'
import { Card, Btn } from '../components/ui.jsx'

// ─── Einstellungen ───────────────────────────────────────────────────────────

// Zahlen-Einsteller (− Wert +) für einen Parameter.
function NumberSetting({ label, hint, value, min, max, step, suffix, onChange }) {
  const StepBtn = ({ dir, disabled }) => (
    <button onClick={() => onChange(Math.min(max, Math.max(min, value + dir * step)))} disabled={disabled}
      style={{
        width: 34, height: 34, borderRadius: 9, border: `1.5px solid ${C.washiDark}`,
        background: disabled ? C.washi : '#fff', color: disabled ? C.washiDark : C.indigo,
        fontSize: 20, fontWeight: 700, lineHeight: 1, cursor: disabled ? 'default' : 'pointer',
      }}>{dir < 0 ? '−' : '+'}</button>
  )
  return (
    <Card style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: C.sumi }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <StepBtn dir={-1} disabled={value <= min} />
        <span style={{ minWidth: 48, textAlign: 'center', fontWeight: 700, fontSize: 16, color: C.indigo }}>{value}{suffix || ''}</span>
        <StepBtn dir={1} disabled={value >= max} />
      </div>
    </Card>
  )
}

// Eigener Anthropic-API-Key (BYOK): schaltet freies Bewerten gesprochener
// Antworten in den Gesprächs-Szenen frei (statt nur feste Musterantworten).
// Bleibt bewusst außerhalb von saveSettings/progress – rein gerätelokal,
// siehe lib/apiKey.js. Ohne Key läuft alles wie bisher weiter.
// Ein gerätelokal gespeicherter API-Key (Eingabe, Testen, Entfernen). Wird für
// zwei unabhängige Dienste genutzt (Anthropic, Google TTS) – daher als eine
// Komponente mit hineingereichten Lese-/Schreib-/Prüf-Funktionen.
function KeySetting({ intro, placeholder, read, write, ping, okHint }) {
  const [value, setValue] = useState(() => read())
  const [status, setStatus] = useState(read() ? 'saved' : 'empty')

  const save = () => { write(value.trim()); setStatus(value.trim() ? 'saved' : 'empty') }
  const clear = () => { write(''); setValue(''); setStatus('empty') }
  const test = async () => {
    if (!value.trim() || status === 'testing') return
    setStatus('testing')
    setStatus((await ping(value.trim())) ? 'ok' : 'invalid')
  }

  return (
    <Card style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10, lineHeight: 1.5 }}>{intro}</div>
      <input
        type="password" value={value} onChange={e => { setValue(e.target.value); setStatus('empty') }}
        placeholder={placeholder} autoCapitalize="none" autoCorrect="off" spellCheck={false}
        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 14, borderRadius: 8, border: `1.5px solid ${C.washiDark}`, marginBottom: 8 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={save} style={{ flex: 1 }}>Speichern</Btn>
        <Btn onClick={test} variant="ghost" style={{ flex: 1 }}>{status === 'testing' ? 'Prüfe …' : 'Testen'}</Btn>
        {read() && <Btn onClick={clear} variant="ghost" style={{ flex: 1 }}>Entfernen</Btn>}
      </div>
      {status === 'ok' && <div style={{ fontSize: 12, color: C.matcha, marginTop: 8 }}>✓ {okHint || 'Key funktioniert.'}</div>}
      {status === 'invalid' && <div style={{ fontSize: 12, color: C.shu, marginTop: 8 }}>✗ Key ungültig oder keine Verbindung.</div>}
      {status === 'saved' && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}>Gespeichert (nur auf diesem Gerät).</div>}
    </Card>
  )
}

export default function SettingsScreen({ onClose }) {
  const { settings, saveSettings } = useContext(ProgressCtx)
  const set = (patch) => saveSettings(patch)

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: C.textMuted, cursor: 'pointer', lineHeight: 1 }}>←</button>
        <h2 style={{ fontSize: 20, fontFamily: JP, color: C.indigo, margin: 0 }}>Einstellungen</h2>
      </div>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 20, marginLeft: 30 }}>Übungen nach deinem Geschmack einstellen</p>

      {/* Standard-Wiederholung */}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, marginBottom: 8 }}>STANDARD-WIEDERHOLUNG</div>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>Was startet, wenn du „Wiederholen" antippst:</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['mix', '🎲 Gemischt'], ['srs', '🗂 SRS-Karten']].map(([id, lbl]) => {
            const on = settings.standardReview === id
            return (
              <button key={id} onClick={() => set({ standardReview: id })}
                style={{
                  flex: 1, padding: '12px 8px', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  border: `2px solid ${on ? C.indigo : C.washiDark}`,
                  background: on ? `${C.indigo}12` : '#fff', color: on ? C.indigo : C.sumi,
                }}>{lbl}</button>
            )
          })}
        </div>
      </Card>

      {/* Gesprächs-Szenen */}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, marginBottom: 8 }}>GESPRÄCHS-SZENEN</div>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
          Wie die NPC-Zeile in Rollenspiel-Szenen erscheint:
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[[false, '📖 Text sichtbar'], [true, '🎧 Nur Audio']].map(([val, lbl]) => {
            const on = settings.audioOnlyDialogs === val
            return (
              <button key={String(val)} onClick={() => set({ audioOnlyDialogs: val })}
                style={{
                  flex: 1, padding: '12px 8px', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  border: `2px solid ${on ? C.indigo : C.washiDark}`,
                  background: on ? `${C.indigo}12` : '#fff', color: on ? C.indigo : C.sumi,
                }}>{lbl}</button>
            )
          })}
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10 }}>
          „Nur Audio" zeigt den Text der Ansage erst, nachdem du geantwortet hast (oder wenn du ihn dir extra einblendest) – echtes Hörverstehen wie bei einer echten Durchsage oder einem Gespräch.
        </div>
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
          Wie du in Rollenspiel-Szenen antwortest:
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[[false, '👆 Antippen'], [true, '🎤 Sprechen']].map(([val, lbl]) => {
            const on = settings.speakDialogs === val
            return (
              <button key={String(val)} onClick={() => set({ speakDialogs: val })}
                style={{
                  flex: 1, padding: '12px 8px', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  border: `2px solid ${on ? C.indigo : C.washiDark}`,
                  background: on ? `${C.indigo}12` : '#fff', color: on ? C.indigo : C.sumi,
                }}>{lbl}</button>
            )
          })}
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10 }}>
          {SPEECH_INPUT_SUPPORTED
            ? '„Sprechen" prüft deine Antwort per Spracherkennung – du sagst sie laut, statt sie anzutippen. Antippen bleibt zusätzlich immer möglich. Die Erkennung braucht Internet und Mikrofon-Erlaubnis.'
            : 'Spracherkennung ist auf diesem Gerät/Browser nicht verfügbar (am besten Chrome auf Android nutzen) – es gilt dann automatisch Antippen.'}
        </div>
      </Card>

      {/* Freies Gespräch */}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, margin: '18px 0 8px' }}>FREIES GESPRÄCH</div>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
          Wie viel Text im freien KI-Gespräch mitläuft:
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['gestuetzt', '📖 Gestützt'], ['hoerend', '🎧 Hörend'], ['immersiv', '🇯🇵 Immersiv']].map(([id, lbl]) => {
            const on = (settings.talkScaffold || 'hoerend') === id
            return (
              <button key={id} onClick={() => set({ talkScaffold: id })}
                style={{
                  flex: 1, padding: '12px 6px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  border: `2px solid ${on ? C.indigo : C.washiDark}`,
                  background: on ? `${C.indigo}12` : '#fff', color: on ? C.indigo : C.sumi,
                }}>{lbl}</button>
            )
          })}
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10, lineHeight: 1.5 }}>
          <b>Gestützt</b>: die japanische Zeile steht sofort da. <b>Hörend</b>: erst zuhören, Text auf Wunsch
          einblenden. <b>Immersiv</b>: zusätzlich ohne deutsche Übersetzung. Nachhören und der Hilfe-Knopf
          gehen in allen Stufen.
        </div>
      </Card>

      {/* KI-Bewertung freier Antworten */}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, margin: '18px 0 8px' }}>KI-GESPRÄCHSPARTNER (EIGENER API-KEY)</div>
      <KeySetting
        read={getApiKey} write={setApiKey} ping={pingApiKey} placeholder="sk-ant-…"
        intro={'Mit einem eigenen Anthropic-API-Key schaltest du die freien Gespräche frei: Dein Gegenüber '
          + 'wird dann live erzeugt, reagiert wirklich auf das, was du sagst, und bespricht das Gespräch mit dir nach. '
          + 'Außerdem werden gesprochene Antworten in den Szenen sinngemäß gewertet, statt nur wortgleich. '
          + 'Der Key bleibt ausschließlich auf diesem Gerät gespeichert und wird nirgends synchronisiert. '
          + 'Ohne Key funktioniert alles wie bisher.'} />

      {/* Studio-Stimme für frei erzeugte Sätze */}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, margin: '18px 0 8px' }}>STUDIO-STIMME IM GESPRÄCH (OPTIONAL)</div>
      <KeySetting
        read={getTtsKey} write={setTtsKey} ping={pingTtsKey} placeholder="Google-Cloud-API-Key"
        okHint="Stimme erreichbar."
        intro={'Die Sätze im freien Gespräch entstehen erst beim Sprechen – für sie gibt es keine vorproduzierten '
          + 'Aufnahmen, deshalb liest sie sonst die Geräte-Stimme vor. Mit einem eigenen Google-Cloud-Key '
          + '(Text-to-Speech aktiviert) klingen auch sie nach derselben Studio-Stimme wie der Rest der App. '
          + 'Der Gratis-Rahmen von Google reicht dafür bei täglichem Üben locker aus.'} />

      {/* Übungs-Parameter */}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, margin: '18px 0 8px' }}>PARAMETER</div>
      <NumberSetting label="Antwortmöglichkeiten" hint="Optionen bei Erkennen/Hören — mehr = weniger Raten"
        value={settings.options} min={4} max={8} step={1} onChange={v => set({ options: v })} />
      <NumberSetting label="Tagesziel" hint="XP, die du pro Tag schaffen möchtest" suffix=" XP"
        value={settings.dailyGoal} min={50} max={600} step={50} onChange={v => set({ dailyGoal: v })} />
      <NumberSetting label="Aufgaben pro Runde" hint="Fragen je Übung (Erkennen, Hören, Tippen, Gemischt)"
        value={settings.roundSize} min={5} max={30} step={1} onChange={v => set({ roundSize: v })} />
      <NumberSetting label="Fleiß-Session" hint="Karten je Fleiß-Übung"
        value={settings.freeSize} min={10} max={60} step={5} onChange={v => set({ freeSize: v })} />

      <p style={{ fontSize: 12, color: C.textMuted, marginTop: 16, lineHeight: 1.5 }}>
        Änderungen werden sofort gespeichert und gelten beim nächsten Start einer Übung.
      </p>

      {/* Versionsanzeige — hilft zu erkennen, ob die neueste Version geladen ist. */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.washiDark}`, textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>
          Tabi v{__APP_VERSION__} · {__BUILD_HASH__}
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
          Build: {__BUILD_TIME__.slice(0, 16).replace('T', ' ')} UTC
        </div>
      </div>
    </div>
  )
}
