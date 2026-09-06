import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { TripsProvider } from './store/TripsContext.jsx'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

// Disable the browser's pull-to-refresh reload gesture inside the PWA.
// Only blocks a downward pull while the page is already at the very top,
// so normal scrolling inside the app is unaffected.
let startY = null
document.addEventListener(
  'touchstart',
  (e) => {
    startY =
      window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null
  },
  { passive: true },
)
document.addEventListener(
  'touchmove',
  (e) => {
    if (startY !== null && e.touches[0]?.clientY - startY > 8) {
      e.preventDefault()
    }
  },
  { passive: false },
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <TripsProvider>
        <App />
      </TripsProvider>
    </BrowserRouter>
  </StrictMode>,
)