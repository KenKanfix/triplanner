import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTrips, newTrip } from '../store/TripsContext'
import { uid as makeId } from '../lib/store'
import { sortByDate } from '../lib/format'
import { downloadTrips, parseImportedTrips } from '../lib/tripExport'

export default function Dashboard() {
  const { trips, addTrip, deleteTrip, importTrips } = useTrips()
  const sortedTrips = sortByDate(trips, 'startDate')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [importMsg, setImportMsg] = useState(null)
  const fileRef = useRef(null)

  function handleExport() {
    downloadTrips(trips)
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const imported = parseImportedTrips(text)
      importTrips(imported)
      setImportMsg({
        type: 'ok',
        text: `Imported ${imported.length} trip(s) from ${file.name}.`,
      })
    } catch (err) {
      setImportMsg({ type: 'error', text: err.message })
    }
  }

  function handleCreate(e) {
    e.preventDefault()
    const trip = {
      ...newTrip(),
      id: makeId(),
      name: name.trim() || 'Untitled trip',
      startDate,
      endDate,
      notes,
    }
    addTrip(trip)
    setName('')
    setStartDate('')
    setEndDate('')
    setNotes('')
    setShowForm(false)
  }

  return (
    <section className="page">
      <div className="page-head">
        <h1>My Trips</h1>
        <div className="btn-group">
          <button
            className="btn"
            onClick={handleExport}
            disabled={trips.length === 0}
            title="Download all trips as a JSON backup"
          >
            ⬇️ Export
          </button>
          <button
            className="btn"
            onClick={() => fileRef.current?.click()}
            title="Restore trips from a JSON backup"
          >
            ⬆️ Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
          <button
            className="btn btn-primary"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? 'Cancel' : '+ New Trip'}
          </button>
        </div>
      </div>

      {importMsg && (
        <p
          className={
            importMsg.type === 'ok' ? 'import-msg' : 'error-text'
          }
        >
          {importMsg.text}
        </p>
      )}

      {showForm && (
        <form className="card form" onSubmit={handleCreate}>
          <h2>New Trip</h2>
          <label>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Japan Autumn 2026"
              autoFocus
            />
          </label>
          <div className="form-row">
            <label>
              Start date
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label>
              End date
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>
          <label>
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything to remember"
              rows={2}
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Create Trip
          </button>
        </form>
      )}

      {trips.length === 0 ? (
        <div className="empty">
          <p>No trips yet. Click “+ New Trip” to start planning.</p>
        </div>
      ) : (
        <div className="card-grid">
          {sortedTrips.map((t) => (
            <div key={t.id} className="card trip-card">
              <Link to={`/trip/${t.id}`} className="trip-card-link">
                <h2>{t.name}</h2>
                <p className="muted">{t.cities.length} cities planned</p>
                <p className="muted">
                  {(t.startDate || t.endDate) &&
                    `${t.startDate || '?'} → ${t.endDate || '?'}`}
                </p>
                {t.notes && <p className="notes">{t.notes}</p>}
              </Link>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  if (confirm(`Delete trip “${t.name}”?`)) deleteTrip(t.id)
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
