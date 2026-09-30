import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const LEVEL_COLOR = { LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444' }
const FALLBACK_COLOR = '#94a3b8'

const fmt = (v, digits = 0) =>
  v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(digits)

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// MapContainer's center/zoom props only apply on first render,
// so we move the map ourselves whenever a new location is assessed.
function FlyTo({ lat, lon }) {
  const map = useMap()
  useEffect(() => {
    if (lat == null || lon == null) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const zoom = Math.max(map.getZoom(), 8)
    if (reduce) map.setView([lat, lon], zoom, { animate: false })
    else map.flyTo([lat, lon], zoom, { duration: 0.9 })
  }, [lat, lon, map])
  return null
}

export default function RiskMap({ assessment, onMapClick }) {
  const center = assessment
    ? [assessment.location.lat, assessment.location.lon]
    : [20.5937, 78.9629] // India default

  const level = assessment?.risk?.level
  const color = LEVEL_COLOR[level] ?? FALLBACK_COLOR
  const total = assessment?.risk?.total

  // Pulsing dot in the risk colour instead of the default blue pin
  const icon = useMemo(
    () =>
      L.divIcon({
        className: 'ss-pin-wrap',
        html: `<span class="ss-pin" style="--c:${color}"></span>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -6],
      }),
    [color]
  )

  return (
    <div className="ss-wrap">
      <style>{css}</style>

      <MapContainer
        className="ss-map"
        center={center}
        zoom={assessment ? 9 : 5}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <ClickHandler onMapClick={onMapClick} />
        <FlyTo lat={assessment?.location.lat} lon={assessment?.location.lon} />
        <ZoomControl position="topright" />

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        {assessment && (
          <>
            {/* Outer zone + inner core */}
            <Circle
              center={center}
              radius={50000}
              interactive={false}
              pathOptions={{ color, weight: 1.5, opacity: 0.7, fillColor: color, fillOpacity: 0.12 }}
            />
            <Circle
              center={center}
              radius={12000}
              interactive={false}
              pathOptions={{ color, weight: 0, fillColor: color, fillOpacity: 0.28 }}
            />

            <Marker position={center} icon={icon} title={assessment.location.name}>
              <Popup className="ss-popup" closeButton={false}>
                <div className="ss-card">
                  <div className="ss-head">
                    <h3>{assessment.location.name}</h3>
                    <span className="ss-chip" style={{ '--c': color }}>{level ?? 'N/A'}</span>
                  </div>

                  <div className="ss-score">
                    <b>{fmt(total)}</b>
                    <span>/ 100 risk score</span>
                  </div>
                  <div className="ss-bar">
                    <i style={{ width: `${Math.min(100, Math.max(0, total ?? 0))}%`, background: color }} />
                  </div>

                  <dl className="ss-stats">
                    <div><dt>Wind</dt><dd>{fmt(assessment.cyclone?.wind_speed, 1)} <small>m/s</small></dd></div>
                    <div><dt>Storm surge</dt><dd>{fmt(assessment.cyclone?.storm_surge, 2)} <small>m</small></dd></div>
                  </dl>
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>

      {/* Hint: fades out once a location is assessed */}
      <div role="status" className={`ss-hint ${assessment ? 'is-hidden' : ''}`}>
        Click anywhere on the map to assess risk
      </div>

      {/* Legend */}
      <ul className="ss-legend" aria-label="Risk levels">
        {Object.entries(LEVEL_COLOR).map(([name, c]) => (
          <li key={name} className={level && level !== name ? 'is-dim' : ''}>
            <span style={{ background: c }} />
            {name}
          </li>
        ))}
      </ul>
    </div>
  )
}

const css = `
.ss-wrap{
  position:relative; height:100%; width:100%; isolation:isolate; overflow:hidden;
  border-radius:16px; background:#f8fafc;
  -webkit-font-smoothing:antialiased;
  box-shadow:0 0 0 1px rgb(0 0 0 / .08), 0 1px 2px rgb(0 0 0 / .1), 0 12px 32px rgb(0 0 0 / .15);
}
.ss-map.leaflet-container{background:#e2e8f0; font-family:inherit}
.ss-map.leaflet-grab{cursor:crosshair}
.ss-map.leaflet-dragging.leaflet-grab{cursor:grabbing}

/* Marker */
.ss-pin-wrap{background:none; border:none}
.ss-pin{position:relative; display:block; width:24px; height:24px}
.ss-pin::before{
  content:""; position:absolute; inset:0; border-radius:50%; background:var(--c); opacity:.4;
  animation:ss-ring 2s cubic-bezier(.2,0,0,1) infinite;
}
.ss-pin::after{
  content:""; position:absolute; inset:5px; border-radius:50%; background:var(--c);
  box-shadow:0 0 0 3px #0f172a, 0 4px 10px rgb(0 0 0 / .5);
}
@keyframes ss-ring{from{transform:scale(.6); opacity:.5} to{transform:scale(1.6); opacity:0}}

/* Zoom buttons: 40x40 hit area, press feedback */
.ss-map .leaflet-right .leaflet-control{margin-right:16px}
.ss-map .leaflet-top .leaflet-control{margin-top:16px}
.ss-map .leaflet-bar{
  border:none; border-radius:14px; overflow:hidden;
  box-shadow:0 0 0 1px rgb(255 255 255 / .08), 0 8px 20px rgb(0 0 0 / .4);
}
.ss-map .leaflet-bar a{
  width:40px; height:40px; line-height:40px; font-size:18px;
  background:rgb(15 23 42 / .92); color:#e2e8f0; border-bottom:1px solid rgb(255 255 255 / .06);
  transition-property:background-color, color, transform; transition-duration:.15s;
}
.ss-map .leaflet-bar a:last-child{border-bottom:none}
.ss-map .leaflet-bar a:hover{background:#1e293b; color:#fff}
.ss-map .leaflet-bar a:active{transform:scale(.96)}

/* Attribution */
.ss-map .leaflet-control-attribution{
  background:rgb(15 23 42 / .7); color:#94a3b8; border-radius:10px 0 0 0; padding:2px 8px; backdrop-filter:blur(6px);
}
.ss-map .leaflet-control-attribution a{color:#cbd5e1}

/* Popup (wrapper radius 16 = card radius 10 + 6 inset padding) */
.ss-popup .leaflet-popup-content-wrapper{
  background:rgb(15 23 42 / .96); color:#e2e8f0; border-radius:16px; padding:6px;
  box-shadow:0 0 0 1px rgb(255 255 255 / .08), 0 4px 8px rgb(0 0 0 / .25), 0 16px 40px rgb(0 0 0 / .45);
}
.ss-popup .leaflet-popup-content{margin:0; width:230px !important}
.ss-popup .leaflet-popup-tip{background:rgb(15 23 42 / .96); box-shadow:none}
.ss-card{padding:10px 12px 12px; font-size:13px; line-height:1.4}
.ss-head{display:flex; align-items:flex-start; justify-content:space-between; gap:10px}
.ss-head h3{margin:0; font-size:14px; font-weight:700; color:#f8fafc; text-wrap:balance}
.ss-chip{
  flex-shrink:0; padding:2px 8px; border-radius:999px; font-size:10px; font-weight:700; letter-spacing:.06em;
  color:var(--c); background:color-mix(in srgb, var(--c) 16%, transparent);
  box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--c) 35%, transparent);
}
.ss-score{display:flex; align-items:baseline; gap:6px; margin:12px 0 6px; font-variant-numeric:tabular-nums}
.ss-score b{font-size:28px; line-height:1; font-weight:800; color:#f8fafc}
.ss-score span{font-size:12px; color:#94a3b8}
.ss-bar{height:6px; border-radius:999px; background:rgb(255 255 255 / .08); overflow:hidden}
.ss-bar i{display:block; height:100%; border-radius:inherit; transform-origin:left; animation:ss-fill .7s cubic-bezier(.2,0,0,1) both}
@keyframes ss-fill{from{transform:scaleX(0)}}
.ss-stats{display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:12px 0 0}
.ss-stats div{padding:8px 10px; border-radius:10px; background:rgb(255 255 255 / .05)}
.ss-stats dt{font-size:11px; color:#94a3b8}
.ss-stats dd{margin:2px 0 0; font-size:14px; font-weight:700; color:#f8fafc; font-variant-numeric:tabular-nums}
.ss-stats small{font-size:11px; font-weight:500; color:#94a3b8}

/* Hint chip */
.ss-hint{
  position:absolute; top:16px; left:50%; z-index:1000; pointer-events:none; white-space:nowrap;
  padding:9px 16px; border-radius:999px; font-size:13px; font-weight:600; color:#0f172a;
  background:#fbfaf7; box-shadow:0 3px 0 #cfd6de, 0 10px 24px rgb(0 0 0 / .25);
  transform:translateX(-50%); opacity:1;
  transition-property:opacity, transform; transition-duration:.3s; transition-timing-function:cubic-bezier(.2,0,0,1);
}
.ss-hint.is-hidden{opacity:0; transform:translate(-50%,-8px)}

/* Legend */
.ss-legend{
  position:absolute; left:16px; bottom:16px; z-index:1000; pointer-events:none; margin:0; padding:8px 12px;
  list-style:none; display:flex; gap:12px; border-radius:12px;
  background:rgb(15 23 42 / .85); backdrop-filter:blur(8px);
  box-shadow:0 0 0 1px rgb(255 255 255 / .08), 0 8px 20px rgb(0 0 0 / .35);
}
.ss-legend li{
  display:flex; align-items:center; gap:6px; font-size:10px; font-weight:700; letter-spacing:.06em; color:#e2e8f0;
  transition-property:opacity; transition-duration:.2s;
}
.ss-legend li.is-dim{opacity:.45}
.ss-legend span{width:8px; height:8px; border-radius:50%}
@media (max-width:520px){.ss-legend{gap:8px; padding:8px 10px}.ss-hint{max-width:calc(100% - 96px); white-space:normal; text-align:center}}

@media (prefers-reduced-motion:reduce){
  .ss-pin::before, .ss-bar i{animation:none}
  .ss-hint, .ss-legend li, .ss-map .leaflet-bar a{transition-duration:.01ms}
}
`
