/** Claim ids C1–C9; labels locked in repo-root CLAIMS.md. */

export type ClaimId =
  | "C1"
  | "C2"
  | "C3"
  | "C4"
  | "C5"
  | "C6"
  | "C7"
  | "C8"
  | "C9";

export type ClaimMeta = {
  id: ClaimId;
  /** Short strength for UI chips */
  label: string;
  /** Plain-language claim for Methods (visitors) */
  summary: string;
};

/** Locked strength strings for the strongest Adoption surfaces. */
export const CLAIM: Record<ClaimId, ClaimMeta> = {
  C1: {
    id: "C1",
    label: "Strong",
    summary: "This day's CAISO net load equals load minus solar and wind.",
  },
  C2: {
    id: "C2",
    label: "Strong",
    summary:
      "Today's AFDC plug-in fleet at 27.9 mi/day with the CEC shape is about 16.6 GWh/day.",
  },
  C3: {
    id: "C3",
    label: "Strong",
    summary:
      "California light-duty stock is 29,657,259 vehicles as of 2025-12-31 (CEC).",
  },
  C4: {
    id: "C4",
    label: "Moderate",
    summary:
      "Today's plug-in share is about AFDC plug-ins divided by CEC light-duty stock (~6.7%); stock years differ by one.",
  },
  C5: {
    id: "C5",
    label: "Moderate",
    summary:
      "PG&E EV schedule energy ¢/car on one season day (not a full bill).",
  },
  C6: {
    id: "C6",
    label: "Weak as forecast · Strong as stress arithmetic",
    summary:
      "Scaling the fleet linearly to 50% or 100% of light-duty stock shows order-of-magnitude MW with today's CEC shape held fixed; not a map of where charging lands or a date when that fleet arrives.",
  },
  C7: {
    id: "C7",
    label: "Weak / Speculative",
    summary:
      "Shifting charging toward lowest-strain hours can cut this day's evening ramp in the model; not a real utility program.",
  },
  C8: {
    id: "C8",
    label: "Weak",
    summary:
      "Battery size to flatten net load over 9 a.m. through 9 p.m. is a back-of-envelope, not interconnection or procurement.",
  },
  C9: {
    id: "C9",
    label: "Moderate",
    summary:
      "Operational carbon intensity from the fuel-mix stack uses cited emission factors, with an annual imports proxy.",
  },
};

export const CLAIM_ORDER: readonly ClaimId[] = [
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
  "C7",
  "C8",
  "C9",
];

export function claimTitle(id: ClaimId): string {
  const c = CLAIM[id];
  return `${c.id} · ${c.label}`;
}
