import { NavLink, Outlet, useSearchParams } from "react-router-dom";
import { DefinedTerm } from "./DefinedTerm";
import { PROVENANCE } from "./provenance";
import { shareSearchString } from "./shareState";
import { SITE_STATS, StatBubble } from "./StatBubble";
import { Cite } from "./WhyHint";
import "./App.css";

const STORY_NAV = [
  { to: "/", label: "Fleet" },
  { to: "/charge", label: "Cost" },
  { to: "/fuel", label: "Fuel" },
  { to: "/compare", label: "Compare" },
] as const;

export default function Layout() {
  const [searchParams] = useSearchParams();
  const qs = shareSearchString(searchParams);

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-title-bar">
          <NavLink className="site-brand" to={`/${qs}`}>
            California Grid Load
          </NavLink>
        </div>
        <div className="site-header-body">
          <div className="site-stats" role="list" aria-label="Key grid and EV figures">
            {SITE_STATS.map((stat) => (
              <div key={stat.value} role="listitem">
                <StatBubble {...stat} />
              </div>
            ))}
          </div>
          <p className="site-intro">
            The CEC&apos;s 2025{" "}
            <DefinedTerm id="iepr">Integrated Energy Policy Report (IEPR)</DefinedTerm>{" "}
            demand forecast (adopted January 2026)
            <Cite id="ieprDemandForecast" /> expects EV charging, not AI data
            centers, to drive the most peak demand growth through 2045.
          </p>
          <nav className="site-nav" aria-label="Primary">
            <div className="site-nav-story" role="group" aria-label="Story">
              {STORY_NAV.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={`${to === "/" ? "/" : to}${qs}`}
                  end={to === "/"}
                  className={({ isActive }) => (isActive ? "active" : undefined)}
                >
                  {label}
                </NavLink>
              ))}
            </div>
            <div className="site-nav-ref" role="group" aria-label="Reference">
              <NavLink
                to={`/methods${qs}`}
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                Methods
              </NavLink>
            </div>
          </nav>
        </div>
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
