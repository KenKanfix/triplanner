import { Link, Outlet } from 'react-router-dom'
import SettingsButton from './SettingsButton'

const logoUrl = import.meta.env.BASE_URL + 'pwa-192x192.png'

export default function Layout() {
  return (
    <div className="app">
      <header className="app-header">
        <Link className="brand" to="/">
          <img
            className="brand-logo"
            src={logoUrl}
            alt="Triplanner icon"
            width={24}
            height={24}
          />
          <span>Triplanner</span>
        </Link>
        <SettingsButton />
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
