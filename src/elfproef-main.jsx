import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import Elfproef from './pages/Elfproef.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Elfproef />
  </StrictMode>,
)
