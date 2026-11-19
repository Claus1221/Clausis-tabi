import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthGate } from './AuthGate.jsx'
import { LangGate } from './LangGate.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthGate>
      <LangGate />
    </AuthGate>
  </React.StrictMode>
)
