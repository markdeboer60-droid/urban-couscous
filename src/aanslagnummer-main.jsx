import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import Aanslagnummer from './pages/Aanslagnummer.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Aanslagnummer />
  </StrictMode>,
)
