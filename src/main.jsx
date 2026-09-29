import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { DataProvider } from './lib/store'
import AuthGate from './components/AuthGate'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthGate>
      <DataProvider>
        <App />
      </DataProvider>
    </AuthGate>
  </StrictMode>,
)
