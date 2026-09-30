import { RadialBarChart, RadialBar, PolarAngleAxis, Tooltip, ResponsiveContainer } from 'recharts'

const LEVEL_BG = { LOW: '#dcfce7', MEDIUM: '#fef9c3', HIGH: '#ffedd5', CRITICAL: '#fee2e2' }
// Darker text tones so the chip passes contrast on the pastel backgrounds
const LEVEL_FG = { LOW: '#15803d', MEDIUM: '#a16207', HIGH: '#c2410c', CRITICAL: '#b91c1c' }
// Same colours as the map, used for the dot and progress bar
const LEVEL_BAR = { LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444' }

const fmt = (v, digits = 0) =>
  v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(digits)
const fmtInt = (v) => (v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toLocaleString())

function Stat({ label, value, unit }) {
  return (
    <div className="sp-row">
      <span className="sp-label">{label}</span>
      <span className="sp-value">
        {value}
        {unit && value !== '—' && <small>{unit}</small>}
      </span>
    </div>
  )
}

export default function StatsPanel({ assessment }) {
  if (!assessment)
    return (
      <div className="sp-root">
        <style>{css}</style>
        <div className="sp-card sp-empty">
          <span className="sp-dot">
            <span className="sp-ping" />
            <span className="sp-core" />
          </span>
          <div className="sp-empty-title">No location selected</div>
          <div className="sp-empty-text">Click anywhere on the map to see its cyclone risk assessment.</div>
        </div>
      </div>
    )

  const { risk, cyclone, infrastructure } = assessment
  const bar = LEVEL_BAR[risk.level] ?? '#94a3b8'
  const total = Math.min(100, Math.max(0, Number(risk.total) || 0))

  const chartData = [
    { name: 'Wind', value: risk.wind ?? 0, fill: '#3b82f6' },
    { name: 'Storm surge', value: risk.surge ?? 0, fill: '#06b6d4' },
    { name: 'Flood', value: risk.flood ?? 0, fill: '#8b5cf6' },
    { name: 'Vulnerability', value: risk.vulnerability ?? 0, fill: '#f59e0b' },
  ]

  return (
    <div className="sp-root">
      <style>{css}</style>

      {/* Overall score */}
      <section className="sp-card sp-hero sp-in" style={{ '--i': 0, '--c': bar }}>
        <div className="sp-hero-top">
          <div>
            <div className="sp-eyebrow">Overall risk</div>
            <div className="sp-score">
              <b>{fmt(risk.total)}</b>
              <span>/ 100</span>
            </div>
          </div>
          <span className="sp-chip" style={{ background: LEVEL_BG[risk.level], color: LEVEL_FG[risk.level] }}>
            <i style={{ background: bar }} />
            {risk.level}
          </span>
        </div>
        <div className="sp-bar">
          <i style={{ width: `${total}%`, background: bar }} />
        </div>
      </section>

      {/* Breakdown chart + legend */}
      <section className="sp-card sp-group sp-in" style={{ '--i': 1 }}>
        <div className="sp-eyebrow sp-title">Risk breakdown</div>
        <div className="sp-chart-row">
          <div className="sp-chart">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="28%"
                outerRadius="100%"
                data={chartData}
                startAngle={90}
                endAngle={-270}
              >
                {/* Fixes the scale to 0-100 so bars aren't stretched to the largest value */}
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar
                  dataKey="value"
                  cornerRadius={6}
                  background={{ fill: '#eef2f6' }}
                  animationDuration={700}
                  animationEasing="ease-out"
                />
                <Tooltip
                  cursor={false}
                  formatter={(v) => `${Number(v).toFixed(1)}/100`}
                  contentStyle={{
                    border: 'none', borderRadius: 12, fontSize: 12, padding: '6px 10px',
                    boxShadow: '0 0 0 1px rgb(0 0 0 / .06), 0 8px 20px rgb(0 0 0 / .12)',
                  }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>

          <ul className="sp-legend">
            {chartData.map((d) => (
              <li key={d.name}>
                <span className="sp-swatch" style={{ background: d.fill }} />
                <span className="sp-label">{d.name}</span>
                <b>{fmt(d.value)}</b>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Conditions */}
      <section className="sp-card sp-group sp-in" style={{ '--i': 2 }}>
        <div className="sp-eyebrow sp-title">Cyclone conditions</div>
        <Stat label="Wind speed" value={fmt(cyclone.wind_speed, 1)} unit=" m/s" />
        <Stat label="Pressure" value={fmt(cyclone.pressure)} unit=" hPa" />
        <Stat label="Storm surge" value={fmt(cyclone.storm_surge, 2)} unit=" m" />
        <Stat label="Rainfall" value={fmt(cyclone.rainfall, 1)} unit=" mm/hr" />
      </section>

      {/* Infrastructure */}
      <section className="sp-card sp-group sp-in" style={{ '--i': 3 }}>
        <div className="sp-eyebrow sp-title">Infrastructure nearby</div>
        <Stat label="Hospitals" value={fmtInt(infrastructure.hospitals?.length ?? 0)} />
        <Stat label="Roads" value={fmtInt(infrastructure.roads_count)} />
        <Stat label="Power nodes" value={fmtInt(infrastructure.power_nodes)} />
      </section>
    </div>
  )
}

const css = `
.sp-root{
  display:grid; gap:12px; padding:16px; min-height:100%; align-content:start;
  background:#f8fafc; color:#0f172a; -webkit-font-smoothing:antialiased;
}

/* Surfaces: shadow layers instead of borders.
   Group card radius 16 = row radius 10 + 6px padding (concentric). */
.sp-card{
  background:#fff; border-radius:16px;
  box-shadow:0 0 0 1px rgb(0 0 0 / .05), 0 1px 2px rgb(0 0 0 / .04), 0 6px 16px rgb(0 0 0 / .04);
}
.sp-hero{
  padding:16px;
  background:linear-gradient(to bottom, color-mix(in srgb, var(--c) 12%, #fff), #fff 75%);
}
.sp-group{padding:6px}

.sp-eyebrow{font-size:11px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:#64748b}
.sp-title{padding:8px 12px 6px}

/* Hero */
.sp-hero-top{display:flex; align-items:flex-start; justify-content:space-between; gap:12px}
.sp-score{display:flex; align-items:baseline; gap:6px; margin-top:4px; font-variant-numeric:tabular-nums}
.sp-score b{font-size:40px; line-height:1; font-weight:800; letter-spacing:-.02em}
.sp-score span{font-size:13px; color:#64748b}
.sp-chip{
  display:inline-flex; align-items:center; gap:6px; padding:5px 11px; border-radius:999px;
  font-size:12px; font-weight:700; letter-spacing:.06em;
}
.sp-chip i{width:7px; height:7px; border-radius:50%}
.sp-bar{height:8px; margin-top:16px; border-radius:999px; background:rgb(15 23 42 / .07); overflow:hidden}
.sp-bar i{
  display:block; height:100%; border-radius:inherit; transform-origin:left;
  animation:sp-fill .8s cubic-bezier(.2,0,0,1) .2s both;
}

/* Chart + legend */
.sp-chart-row{display:flex; align-items:center; gap:16px; flex-wrap:wrap; padding:4px 12px 12px}
.sp-chart{width:132px; height:132px; flex-shrink:0}
.sp-legend{flex:1; min-width:140px; margin:0; padding:0; list-style:none; display:grid; gap:10px}
.sp-legend li{display:flex; align-items:center; gap:8px; font-size:13px}
.sp-legend .sp-label{flex:1}
.sp-legend b{font-weight:700; font-variant-numeric:tabular-nums}
.sp-swatch{width:8px; height:8px; border-radius:50%; flex-shrink:0}

/* Stat rows */
.sp-row{
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  padding:10px 12px; border-radius:10px;
  transition-property:background-color; transition-duration:.15s;
}
.sp-row:hover{background:#f1f5f9}
.sp-label{font-size:13px; color:#64748b}
.sp-value{font-size:14px; font-weight:700; font-variant-numeric:tabular-nums}
.sp-value small{margin-left:1px; font-size:12px; font-weight:500; color:#94a3b8}

/* Empty state */
.sp-empty{
  display:flex; flex-direction:column; align-items:center; gap:8px; padding:28px 24px; text-align:center;
  box-shadow:none; background:#fff; outline:1px dashed #cbd5e1; outline-offset:-1px;
}
.sp-dot{position:relative; width:12px; height:12px; margin-bottom:6px}
.sp-dot span{position:absolute; inset:0; border-radius:50%; background:#38bdf8}
.sp-ping{animation:sp-pulse 1.8s ease-out infinite}
.sp-empty-title{font-size:15px; font-weight:700; color:#0f172a; text-wrap:balance}
.sp-empty-text{max-width:220px; font-size:13px; line-height:1.5; color:#64748b; text-wrap:pretty}

/* Motion: split + stagger, run once */
.sp-in{animation:sp-in .45s cubic-bezier(.2,0,0,1) both; animation-delay:calc(var(--i, 0) * 80ms)}
@keyframes sp-in{from{opacity:0; transform:translateY(8px)}}
@keyframes sp-fill{from{transform:scaleX(0)}}
@keyframes sp-pulse{from{transform:scale(1); opacity:.6} to{transform:scale(2.6); opacity:0}}

@media (prefers-reduced-motion:reduce){
  .sp-in, .sp-bar i, .sp-ping{animation:none}
  .sp-row{transition-duration:.01ms}
}
`
