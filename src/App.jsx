import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import TripDetail from './pages/TripDetail'
import CityDetail from './pages/CityDetail'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="trip/:tripId" element={<TripDetail />} />
        <Route path="trip/:tripId/city/:cityId" element={<CityDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
