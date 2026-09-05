import { useState } from 'react'
import { getFlightApiKey, setFlightApiKey } from '../lib/flights'

export default function SettingsButton() {
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState(getFlightApiKey())
  const [saved, setSaved] = useState(false)

  function save(e) {
    e.preventDefault()
    setFlightApiKey(key)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="settings">
      <button
        className="settings-toggle"
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Settings"
        aria-label="Settings"
      >
        ⚙️
      </button>
      {open && (
        <div className="settings-panel">
          <h3>Settings</h3>
          <form onSubmit={save}>
            <label>
              Aviationstack API key
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Paste your access_key"
              />
            </label>
            <p className="muted note">
              Used to look up flight details by number. Free tier at
              aviationstack.com — no credit card. Stored only in your browser.
            </p>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit">
                Save
              </button>
              {saved && <span className="saved-msg">✓ Saved</span>}
            </div>
          </form>
        </div>
      )}
    </div>
  )
}