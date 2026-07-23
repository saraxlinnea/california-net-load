import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  citationAnchor,
  citationNumber,
  type CitationId,
} from "./citations";
import { shareSearchString } from "./shareState";

type CiteProps = {
  id: CitationId | CitationId[];
};

/** Superscript citation marker linking to Methods #cite-n. */
export function Cite({ id }: CiteProps) {
  const [searchParams] = useSearchParams();
  const qs = shareSearchString(searchParams);
  const ids = Array.isArray(id) ? id : [id];

  return (
    <span className="cite-group">
      {ids.map((cid) => {
        const n = citationNumber(cid);
        return (
          <Link
            key={cid}
            className="cite-ref"
            to={`/methods${qs}#${citationAnchor(cid)}`}
            title={`Source ${n}`}
          >
            <sup>[{n}]</sup>
          </Link>
        );
      })}
    </span>
  );
}

type WhyHintProps = {
  /** Accessible name; summary shows "?" by default. */
  label?: string;
  /** Optional visible summary text instead of "?" (e.g. "Explain"). */
  summaryText?: string;
  children: ReactNode;
};

/** Collapsed-by-default progressive disclosure for control explanations. */
export function WhyHint({
  label = "Why this control",
  summaryText,
  children,
}: WhyHintProps) {
  return (
    <details className={`why-hint${summaryText ? " why-hint-text" : ""}`}>
      <summary
        className={
          summaryText ? "why-hint-summary why-hint-summary-text" : "why-hint-summary"
        }
        aria-label={label}
      >
        {summaryText ?? "?"}
      </summary>
      <div className="why-hint-body">{children}</div>
    </details>
  );
}
