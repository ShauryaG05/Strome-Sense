import { useState } from 'react'
import { Link } from 'react-router-dom'

const DEFAULT_LINKS = [
  { label: 'Risk Map', href: '/' },
  { label: 'AI Assistant', href: '/chat' },
  { label: 'Emergency', href: '#emergency', cta: true },
]

// Shared "floating pill" look from the reference screenshot
const pill =
  'inline-flex items-center rounded-full bg-[#fbfaf7] text-neutral-900 ' +
  'shadow-[0_3px_0_#cfd6de,0_10px_24px_rgb(0_0_0/0.15)]'

export default function Navbar({
  siteName = 'StormSense',
  logoSrc = '', // optional: path to your logo image. Falls back to a letter mark.
  links = DEFAULT_LINKS,
  assessment = null,
  loading = false,
  initialLocation = '',
  onLocationChange,
}) {
  const [location, setLocation] = useState(initialLocation)
  const hasLocation = location.trim().length > 0

  const handleChange = (e) => {
    setLocation(e.target.value)
    onLocationChange?.(e.target.value)
  }

  const dotClass = loading
    ? 'bg-amber-500 animate-pulse'
    : assessment
    ? 'bg-emerald-600 shadow-[0_0_0_4px_rgb(5_150_105/0.2)]'
    : hasLocation
    ? 'bg-sky-500'
    : 'bg-neutral-400'

  return (
    <header className="relative z-20 shrink-0 grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-4 md:grid-cols-[1fr_auto_1fr] md:px-8 md:py-5">
      {/* LEFT: logo + site name */}
      <Link
        to="/"
        aria-label={`${siteName} home`}
        className={`${pill} justify-self-start gap-2.5 p-2 sm:pr-5 text-base font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500`}
      >
        {logoSrc ? (
          <img src={logoSrc} alt="" className="h-8.5 w-8.5 rounded-full object-cover" />
        ) : (
          <span
            aria-hidden="true"
            className="grid h-8.5 w-8.5 place-items-center rounded-full bg-neutral-900 text-[15px] text-[#fbfaf7]"
          >
            {siteName.charAt(0)}
          </span>
        )}
        <span className="hidden sm:inline">{siteName}</span>
      </Link>

      {/* MIDDLE: location display / input */}
      <label
        className={`${pill} order-last col-span-2 w-full gap-3 px-5 py-3 focus-within:ring-2 focus-within:ring-sky-500 md:order-0 md:col-span-1 md:w-96`}
      >
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full transition-colors ${dotClass}`} />
        <input
          type="text"
          value={location}
          onChange={handleChange}
          placeholder={
            assessment
              ? assessment.location?.name ?? 'Assessed location'
              : 'Click map or enter coordinates'
          }
          aria-label="Location query"
          autoComplete="off"
          className="w-full min-w-0 bg-transparent text-[15px] font-medium outline-none placeholder:text-neutral-500"
        />
        {assessment?.risk?.total != null && (
          <span className="hidden shrink-0 rounded-full bg-neutral-900 px-2.5 py-0.5 text-xs font-bold text-[#fbfaf7] sm:inline">
            Risk {assessment.risk.total}/100
          </span>
        )}
      </label>

      {/* RIGHT: navigation buttons */}
      <nav aria-label="Primary" className={`${pill} justify-self-end gap-1 p-1.5`}>
        {links.slice(0, 3).map(({ label, href, cta }) => {
          const isInternal = href.startsWith('/')
          const className = `rounded-full px-3 py-2 text-sm font-bold transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 sm:px-4 sm:text-[15px] ${
            cta
              ? 'bg-rose-600 text-white hover:bg-rose-500'
              : 'hover:bg-black/[0.07]'
          }`

          return isInternal ? (
            <Link key={label} to={href} className={className}>
              {label}
            </Link>
          ) : (
            <a key={label} href={href} className={className}>
              {label}
            </a>
          )
        })}
      </nav>
    </header>
  )
}
