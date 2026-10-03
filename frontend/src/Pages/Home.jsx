import { Link } from "react-router-dom";
import StormScene from "../components/StormScene";

const BRAND = "StromeSense";
const NAV = [
  ["Live Map", "/map"],
  ["AI Assistant", "/chat"],
];

const press = "transition-[transform,box-shadow] duration-200 ease-out active:scale-[0.96]";

function PrimaryButton({ to, children }) {
  return (
    <Link
      to={to}
      className={`group inline-flex h-11 items-center gap-3 rounded-full bg-[#3f66ff] pr-1.5 pl-5 text-sm font-medium text-white shadow-[0_8px_26px_rgb(63_102_255/.45)] hover:shadow-[0_10px_34px_rgb(63_102_255/.7)] ${press}`}
    >
      {children}
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-full bg-white pb-px text-base leading-none text-[#3f66ff] transition-transform duration-300 ease-out group-hover:translate-x-px group-hover:-translate-y-px"
      >
        ↗
      </span>
    </Link>
  );
}

export default function Home() {
  return (
    <main
      className="relative isolate m-2.5 h-[calc(100svh-20px)] min-h-[600px] overflow-hidden rounded-[28px] bg-[#0a1018] text-[#f4f7fb] antialiased"
      style={{ fontFamily: '"Geist Variable", "Geist", system-ui, -apple-system, "Segoe UI", sans-serif' }}
    >
      <StormScene className="absolute inset-0 -z-20 size-full" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgb(3_7_12/.8)_0%,rgb(3_7_12/.35)_34%,transparent_58%),linear-gradient(to_bottom,rgb(3_7_12/.45),transparent_22%)]"
      />

      <header className="rise absolute inset-x-0 top-0 flex items-center justify-between px-5 py-5 md:px-12 md:py-6" style={{ "--i": 0 }}>
        <Link to="/" className="-mx-1 rounded-lg px-1 text-lg font-semibold tracking-tight">
          {BRAND}
        </Link>
        <nav className="hidden items-center md:flex">
          {NAV.map(([label, to]) => (
            <Link key={to} to={to} className="px-3 py-2.5 text-sm text-white/80 transition-colors duration-150 hover:text-white">
              {label}
            </Link>
          ))}
        </nav>
        <PrimaryButton to="/forecast">Check my region</PrimaryButton>
      </header>

      <section className="absolute bottom-[clamp(24px,5vh,56px)] left-5 max-w-[620px] md:left-12">
        <span
          className="rise inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs text-[#cfe0ff] shadow-[inset_0_0_0_1px_rgb(255_255_255/.2)] backdrop-blur-md"
          style={{ "--i": 1 }}
        >
          <i className="size-1.5 rounded-full bg-[#7fa0ff] shadow-[0_0_10px_#7fa0ff]" />
          AI-Powered Cyclone Risk Prediction
        </span>

        <h1 className="rise mt-4 mb-3.5 text-[clamp(1.9rem,3.1vw,3.1rem)] leading-[1.1] font-medium tracking-[-0.035em] text-balance" style={{ "--i": 2 }}>
          Know The Odds Of A Cyclone Before It Reaches The Coast
        </h1>

        <p className="rise mb-6 max-w-[52ch] text-[0.95rem] leading-relaxed text-pretty text-white/80" style={{ "--i": 3 }}>
          See the probability of cyclone formation, landfall and intensity for your region. Models trained on sea surface
          temperature, wind shear and pressure data turn raw atmospheric signals into clear, early risk alerts.
        </p>

        <div className="rise flex flex-wrap gap-3" style={{ "--i": 4 }}>
          <Link
            to="/map"
            className={`inline-flex h-11 items-center rounded-full bg-[#f4f7fb]/95 px-5 text-sm font-medium text-[#0b1220] ${press}`}
          >
            View live map
          </Link>
          <PrimaryButton to="/forecast">Get risk forecast</PrimaryButton>
        </div>
      </section>
    </main>
  );
}
