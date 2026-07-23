import { NavLink, Outlet, useSearchParams } from "react-router-dom";
import { PROVENANCE } from "./provenance";
import { shareSearchString } from "./shareState";
import { SITE_STATS, StatBubble } from "./StatBubble";
import { Cite } from "./WhyHint";
import "./App.css";

const PRIMARY_NAV = [
  { to: "/", label: "Adoption" },
  { to: "/charge", label: "Cost" },
  { to: "/fuel", label: "Fuel" },
  { to: "/compare", label: "Compare" },
  { to: "/methods", label: "Methods" },
] as const;

export default function Layout() {
  const [searchParams] = useSearchParams();
  const qs = shareSearchString(searchParams);

  return (
    <div className="site-shell">
      <header className="site-header">
        <NavLink className="site-brand" to={`/${qs}`}>
          California Net Load
        </NavLink>
        <p className="site-intro">
          California&apos;s grid is entering a new era of demand growth. According
          to the CEC&apos;s 2025 IEPR demand forecast (adopted January 2026)
          <Cite id="ieprDemandForecast" />, regulators expect EV charging, not AI
          data centers, to be the state&apos;s biggest driver of peak demand growth
          through 2045, and timing matters as much as size: when we charge
          affects the grid as much as how much we charge. This site walks through
          real California grid days, real EV charging patterns from state data,
          and what happens if charging shifts to better hours. Every chart traces
          to a named, dated source.
        </p>
        <div className="site-stats" role="list" aria-label="Key grid and EV figures">
          {SITE_STATS.map((stat) => (
            <div key={stat.value} role="listitem">
              <StatBubble {...stat} />
            </div>
          ))}
        </div>
        <nav className="site-nav" aria-label="Primary">
          {PRIMARY_NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={`${to === "/" ? "/" : to}${qs}`}
              end={to === "/"}
              className={({ isActive }) => (isActive ? "active" : undefined)}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>
          Sources verified as of <strong>{PROVENANCE.verifiedAsOf}</strong>
          {" · "}
          <NavLink to={`/methods${qs}`}>Methods</NavLink>
        </p>
      </footer>
    </div>
  );
}
