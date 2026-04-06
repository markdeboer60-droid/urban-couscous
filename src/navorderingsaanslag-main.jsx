import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import Navorderingsaanslag from './pages/Navorderingsaanslag.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Navorderingsaanslag />
  </StrictMode>,
)
