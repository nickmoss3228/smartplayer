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
import { i18nReady } from './i18n'
import App from './App.tsx'

// English is fetched on demand (see i18n.js); wait for the starting language
// so the first frame is already in it. Russian is bundled, so this is instant.
i18nReady.then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
