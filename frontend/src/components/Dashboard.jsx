import { useState, useCallback } from 'react'
import RiskMap from './RiskMap'
import StatsPanel from './StatsPanel'
import GeminiAdvisory from './GeminiAdvisory'
import Navbar from './Navbar'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export default function Dashboard({
  sharedAssessment,
  onAssessmentChange,
  showNavbar = true
}) {
  const [localAssessment, setLocalAssessment] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const assessment = sharedAssessment !== undefined ? sharedAssessment : localAssessment

  const updateAssessment = (data) => {
    if (onAssessmentChange) {
      onAssessmentChange(data)
    }
    setLocalAssessment(data)
  }

  const handleMapClick = useCallback(async (lat, lon) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/risk/assess?lat=${lat}&lon=${lon}`)
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      updateAssessment(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [onAssessmentChange])

  const handleDispatch = useCallback(async () => {
    if (!assessment) return
    try {
      await fetch(`${API_BASE}/alerts/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: assessment.location,
          risk_level: assessment.risk.level,
          risk_total: assessment.risk.total,
        }),
      })
      alert('Alert dispatched!')
    } catch {
      alert('Failed to dispatch alert')
    }
  }, [assessment])

  const handleLocationSearch = useCallback((query) => {
    // Support typing "lat, lon" e.g. "19.07, 84.70"
    const match = query.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/)
    if (match) {
      const lat = parseFloat(match[1])
      const lon = parseFloat(match[3])
      handleMapClick(lat, lon)
    }
  }, [handleMapClick])

  return (
    <div className="app-layout">
      {showNavbar && (
        <header className="app-header">
          <Navbar
            siteName="StormSense"
            assessment={assessment}
            loading={loading}
            onLocationChange={handleLocationSearch}
          />
        </header>
      )}

      <div className="app-body">
        <aside className="sidebar">
          <StatsPanel assessment={assessment} />
          {assessment && (
            <GeminiAdvisory advisory={assessment.advisory} onDispatch={handleDispatch} />
          )}
          {error && (
            <div style={{ padding: 16, color: '#ef4444', fontSize: 13, background: '#fef2f2', borderLeft: '4px solid #ef4444', margin: 16, borderRadius: 6 }}>
              ⚠️ {error}
            </div>
          )}
        </aside>

        <main className="map-area">
          {loading && (
            <div className="loading-overlay">
              <span>🌀 Analyzing cyclone risk…</span>
            </div>
          )}
          <RiskMap assessment={assessment} onMapClick={handleMapClick} />
        </main>
      </div>
    </div>
  )
}