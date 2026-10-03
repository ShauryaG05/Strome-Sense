export default function GrokAdvisory({ advisory, onDispatch }) {
  if (!advisory) return null
  if (advisory.error) return (
    <div style={{ padding: 16, color: '#b91c1c', fontSize: 13, background: '#fef2f2', borderRadius: 8, margin: 16 }}>
      ⚠️ <b>Advisory Note:</b> {advisory.detail || advisory.raw || advisory.error}
    </div>
  )

  const res = advisory.resource_needs ?? {}

  return (
    <div style={{ padding: 16, fontSize: 14 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>⚡ Grok AI Advisory</h3>
      <p style={{ color: '#475569', marginBottom: 12 }}>{advisory.summary}</p>

      <strong>Immediate Actions</strong>
      <ul style={{ marginTop: 4, paddingLeft: 18 }}>
        {(advisory.immediate_actions ?? []).map((a, i) => <li key={i}>{a}</li>)}
      </ul>

      <strong>Evacuation Zones</strong>
      <ul style={{ marginTop: 4, paddingLeft: 18 }}>
        {(advisory.evacuation_zones ?? []).map((z, i) => <li key={i}>{z}</li>)}
      </ul>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
        {[['🏠 Shelters', res.shelters], ['🏥 Medical Teams', res.medical_teams], ['🚤 Rescue Boats', res.rescue_boats]].map(([label, val]) => (
          <span key={label} style={{ background: '#f1f5f9', borderRadius: 6, padding: '4px 10px', fontSize: 12 }}>
            {label}: <b>{val ?? '?'}</b>
          </span>
        ))}
        <span style={{ background: '#f1f5f9', borderRadius: 6, padding: '4px 10px', fontSize: 12 }}>
          ⏱ Timeline: <b>{advisory.timeline_hours}h</b>
        </span>
      </div>

      <button onClick={onDispatch} style={{
        background: '#ef4444', color: '#fff', border: 'none',
        borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 600
      }}>
        🚨 Dispatch Alert
      </button>
    </div>
  )
}
