import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts: bundled by Vite and served from our own origin.
// Only the weights the app actually uses (font-normal … font-extrabold).
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import '@fontsource/manrope/800.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
