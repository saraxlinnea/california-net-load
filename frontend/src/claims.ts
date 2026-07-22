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
};

/** Locked strength strings for the strongest Adoption surfaces. */
export const CLAIM: Record<ClaimId, ClaimMeta> = {
  C1: { id: "C1", label: "Strong" },
  C2: { id: "C2", label: "Strong" },
  C3: { id: "C3", label: "Strong" },
  C4: { id: "C4", label: "Moderate" },
  C5: { id: "C5", label: "Moderate" },
  C6: { id: "C6", label: "Weak as forecast · Strong as stress arithmetic" },
  C7: { id: "C7", label: "Weak / Speculative" },
  C8: { id: "C8", label: "Weak" },
  C9: { id: "C9", label: "Moderate" },
};

export function claimTitle(id: ClaimId): string {
  const c = CLAIM[id];
  return `${c.id} · ${c.label}`;
}
