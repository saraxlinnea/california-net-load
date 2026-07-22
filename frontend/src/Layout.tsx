import { NavLink, Outlet, useSearchParams } from "react-router-dom";
import { PROVENANCE } from "./provenance";
import { shareSearchString } from "./shareState";
import "./App.css";

const NAV_ITEMS = [
  { to: "/", label: "Adoption" },
  { to: "/charge", label: "Cost" },
  { to: "/fuel", label: "Fuel" },
  { to: "/storage", label: "Storage" },
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
        <nav className="site-nav" aria-label="Primary">
          {NAV_ITEMS.map(({ to, label }) => (
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
          <NavLink to={`/methods${qs}`}>Math + Citations</NavLink>
        </p>
      </footer>
    </div>
  );
}
