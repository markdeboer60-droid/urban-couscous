import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import BelastingCodes from './pages/BelastingCodes.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BelastingCodes />
  </StrictMode>,
)
