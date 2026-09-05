import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTrips, newTrip } from '../store/TripsContext'
import { uid as makeId } from '../lib/store'

export default function Dashboard() {
  const { trips, addTrip, deleteTrip } = useTrips()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')

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
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ New Trip'}
        </button>
      </div>

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
          {trips.map((t) => (
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
