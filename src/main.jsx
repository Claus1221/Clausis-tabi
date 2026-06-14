import React from 'react'
import ReactDOM from 'react-dom/client'
import TabiApp from './TabiApp.jsx'
import { AuthGate } from './AuthGate.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthGate>
      <TabiApp />
    </AuthGate>
  </React.StrictMode>
)
