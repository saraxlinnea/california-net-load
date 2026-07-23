import { TERMS, type TermId } from "./terms";

type DefinedTermProps = {
  id: TermId;
  /** Override visible text; defaults to TERMS[id].label */
  children?: string;
};

/**
 * Visible label with hover/focus short definition.
 * Keyboard-focusable; uses title + CSS tooltip.
 */
export function DefinedTerm({ id, children }: DefinedTermProps) {
  const term = TERMS[id];
  const label = children ?? term.label;
  return (
    <span
      className="defined-term"
      tabIndex={0}
      title={term.shortDef}
      aria-label={`${label}: ${term.shortDef}`}
    >
      <span className="defined-term-label">{label}</span>
      <span className="defined-term-tip" role="tooltip">
        {term.shortDef}
      </span>
    </span>
  );
}
