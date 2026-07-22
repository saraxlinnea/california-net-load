import { NavLink, Outlet, useSearchParams } from "react-router-dom";
import { PROVENANCE } from "./provenance";
import { shareSearchString } from "./shareState";
import "./App.css";

const PRIMARY_NAV = [
  { to: "/", label: "Adoption" },
  { to: "/charge", label: "Cost" },
  { to: "/fuel", label: "Fuel" },
  { to: "/compare", label: "Compare" },
  { to: "/methods", label: "Methods" },
] as const;

const SITE_TAGLINE =
  "Real CAISO days, EV charging timing, and PG&E per-car costs in one place.";

export default function Layout() {
  const [searchParams] = useSearchParams();
  const qs = shareSearchString(searchParams);

  return (
    <div className="site-shell">
      <header className="site-header">
        <NavLink className="site-brand" to={`/${qs}`}>
          California Net Load
        </NavLink>
        <p className="site-tagline">{SITE_TAGLINE}</p>
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
