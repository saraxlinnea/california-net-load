import type { ReactNode } from "react";
import type { DayOption } from "./types";
import "./App.css";

type Props = {
  /** Page title (or home subtitle when productTitle is set) */
  title: string;
  /** Optional large product name on the home hero only */
  productTitle?: string;
  /** What this page (or the site, on home) is about */
  lede: string;
  /** Optional honesty / caveats under the lede */
  honesty?: string;
  days: DayOption[];
  date: string;
  onDateChange: (date: string) => void;
  controlsLabel?: string;
  loading?: boolean;
  loadingLabel?: string;
  error?: string | null;
  emptyMessage?: string;
  children?: ReactNode;
  /** Extra controls after the day selector */
  extraControls?: ReactNode;
};

/**
 * Shared shell for Fuel / Storage / Adoption deep dives: hero, day select, status, body.
 */
export default function DeepDiveShell({
  title,
  productTitle,
  lede,
  honesty,
  days,
  date,
  onDateChange,
  controlsLabel = "Day controls",
  loading = false,
  loadingLabel = "Loading…",
  error = null,
  emptyMessage = "No days are available.",
  children,
  extraControls,
}: Props) {
  return (
    <div className="page">
      <header className={productTitle ? "hero hero-home" : "hero"}>
        {productTitle ? (
          <>
            <h1 className="brand">{productTitle}</h1>
            <p className="lede">{lede}</p>
            <p className="page-subtitle">{title}</p>
          </>
        ) : (
          <>
            <h1>{title}</h1>
            <p className="lede">{lede}</p>
          </>
        )}
        {honesty && <p className="honesty">{honesty}</p>}
      </header>

      {days.length > 0 && (
        <section className="controls" aria-label={controlsLabel}>
          <label className="field">
            <span>Day</span>
            <select
              value={date}
              onChange={(event) => onDateChange(event.target.value)}
            >
              {days.map((day) => (
                <option key={day.date} value={day.date}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>
          {extraControls}
        </section>
      )}

      {loading && <p className="muted">{loadingLabel}</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && days.length === 0 && (
        <p className="muted">{emptyMessage}</p>
      )}
      {children}
    </div>
  );
}
