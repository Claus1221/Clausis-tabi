# Bewusst nur ASCII (keine Umlaute): Windows PowerShell 5.1 liest .ps1 ohne BOM als
# ANSI und stolpert sonst ueber Sonderzeichen.
#
# Firestore-Regeln (firestore.rules) ins Firebase-Projekt "clausis-tabi" einspielen.
#
#   .\scripts\deploy-rules.ps1            pruefen, nachfragen, veroeffentlichen
#   .\scripts\deploy-rules.ps1 -NurPruefen   nur pruefen, ob die Regeln gueltig sind
#
# Das Skript veroeffentlicht NUR die Regeln - nicht die App. Es ersetzt die
# Schritte 2 (Syntaxpruefung) und 3 (Veroeffentlichen) aus FIREBASE-SETUP.md,
# Abschnitt "Umstellung auf die Freigabeliste". Schritt 0 und 1 bleiben Handarbeit
# in der Firebase-Console; das Skript fragt nach, ob sie erledigt sind, weil sonst
# die zweite Person ausgesperrt wird.
#
# Braucht Node/npm. Die Firebase-CLI wird per npx geholt (keine feste Installation).
# Beim ersten Lauf oeffnet sich der Browser zur Anmeldung - dort das PRIVATE
# Google-Konto waehlen, dem das Firebase-Projekt gehoert.
param(
  [switch]$NurPruefen
)

$ErrorActionPreference = 'Stop'
$Projekt = 'clausis-tabi'
$Wurzel = Split-Path -Parent $PSScriptRoot
Set-Location $Wurzel

function Invoke-Firebase {
  # --yes: npx fragt nicht nach, ob firebase-tools geladen werden darf.
  & npx --yes firebase-tools@latest @args
  if ($LASTEXITCODE -ne 0) { throw "firebase $($args -join ' ') ist fehlgeschlagen (Code $LASTEXITCODE)." }
}

function Confirm-Schritt([string]$Frage) {
  $antwort = Read-Host "$Frage (j/n)"
  if ($antwort -notmatch '^[jJ]') {
    Write-Host 'Abgebrochen. Es wurde nichts veroeffentlicht.' -ForegroundColor Yellow
    exit 1
  }
}

if (-not (Test-Path 'firestore.rules')) { throw 'firestore.rules nicht gefunden - bitte im Projektordner starten.' }
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) { throw 'npx nicht gefunden - bitte Node.js installieren.' }

Write-Host "Projekt: $Projekt" -ForegroundColor Cyan
Write-Host "Regeln:  $(Join-Path $Wurzel 'firestore.rules')" -ForegroundColor Cyan
Write-Host ''

# 1. Anmeldung. `login` ist ein No-op, wenn man schon angemeldet ist.
Write-Host '1/3  Anmeldung bei Firebase pruefen ...'
Invoke-Firebase login

# 2. Regeln von Firebase pruefen lassen, ohne etwas zu veroeffentlichen.
Write-Host ''
Write-Host '2/3  Regeln pruefen (Probelauf, es wird nichts geaendert) ...'
Invoke-Firebase deploy --only firestore:rules --project $Projekt --dry-run
Write-Host 'Die Regeln sind gueltig.' -ForegroundColor Green

if ($NurPruefen) {
  Write-Host 'Nur geprueft, nichts veroeffentlicht.'
  exit 0
}

# 3. Sicherheitsabfragen - die Reihenfolge aus FIREBASE-SETUP.md schuetzt davor,
#    dass eine schon freigeschaltete Person ausgesperrt wird.
Write-Host ''
Write-Host '3/3  Vor dem Veroeffentlichen:' -ForegroundColor Cyan
Write-Host '     Die neuen Regeln lassen ausser dem Admin nur Personen hinein, fuer die es in'
Write-Host '     Firestore ein Dokument  allowed/<e-mail in kleinbuchstaben>  gibt.'
Write-Host ''
Confirm-Schritt 'Hast du die Regeln in der Console mit den alten aus FIREBASE-SETUP.md verglichen (Schritt 0)?'
Confirm-Schritt 'Gibt es in Firestore das Dokument allowed/balkonien4ever@web.de (Schritt 1)?'
Confirm-Schritt "Neue Regeln jetzt fuer das Projekt '$Projekt' veroeffentlichen?"

Invoke-Firebase deploy --only firestore:rules --project $Projekt

Write-Host ''
Write-Host 'Fertig - die neuen Regeln sind aktiv.' -ForegroundColor Green
Write-Host 'Als Naechstes: den Branch nach main mergen (das deployt die App) und danach'
Write-Host 'Schritt 5 aus FIREBASE-SETUP.md pruefen.'
