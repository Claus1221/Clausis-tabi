// ─── Firebase-Konfiguration ──────────────────────────────────────────────────
//
// Diese Werte bekommst du aus der Firebase-Console:
//   console.firebase.google.com  →  dein Projekt  →  ⚙ Projekteinstellungen
//   →  Abschnitt "Meine Apps"  →  Web-App  →  "SDK-Konfiguration"  →  "Config"
//
// WICHTIG: Diese Werte sind KEINE Geheimnisse. Sie dürfen öffentlich im Code
// stehen — sie identifizieren nur dein Projekt. Der eigentliche Schutz kommt von
//   1. Firebase Authentication (nur erlaubte Google-Konten kommen rein), und
//   2. den Firestore-Sicherheitsregeln (jeder sieht nur seine eigenen Daten).
//
// Ersetze unten die "HIER_EINFUEGEN"-Werte durch deine echten Werte.
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAM8XRE1stHOfFQKNmf0j4pqNWQw-bOKGg",
  authDomain: "clausis-tabi.firebaseapp.com",
  projectId: "clausis-tabi",
  storageBucket: "clausis-tabi.firebasestorage.app",
  messagingSenderId: "426555633535",
  appId: "1:426555633535:web:0242c89b897dc30254f44a"
}

// Nur diese Google-Konten dürfen die App benutzen.
// Leer lassen ([]) = jedes eingeloggte Google-Konto darf rein.
// Für eine reine Privat-App: trage hier deine eigene Gmail-Adresse ein.
export const ALLOWED_EMAILS = [
  'clausalbers@gmail.com',
  'balkonien4ever@web.de',
]

// true, sobald oben echte Werte eingetragen sind.
export const isConfigured = !Object.values(firebaseConfig).some(
  v => typeof v === 'string' && v.includes('HIER_EINFUEGEN')
)

const app = isConfigured ? initializeApp(firebaseConfig) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
export const googleProvider = new GoogleAuthProvider()
