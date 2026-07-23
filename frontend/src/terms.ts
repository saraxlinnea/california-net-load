/**
 * First-use hover definitions for specialist terms.
 * Keep vocabulary; define on hover/focus. Do not invent numbers here.
 */
export type TermId = "netLoad" | "lowestStrain" | "caiso" | "cecShape";

export type TermDef = {
  label: string;
  shortDef: string;
};

export const TERMS: Record<TermId, TermDef> = {
  netLoad: {
    label: "Net load",
    shortDef:
      "Grid demand minus wind and solar for that hour. The evening climb in net load is the hard part of the day.",
  },
  lowestStrain: {
    label: "Lowest-strain hours",
    shortDef:
      "Hours when this day's net load is lowest, usually when solar is strong. Charging then adds less to the evening climb.",
  },
  caiso: {
    label: "CAISO",
    shortDef:
      "California's grid operator (California Independent System Operator).",
  },
  cecShape: {
    label: "CEC charging shape",
    shortDef:
      "State Energy Commission hourly pattern for light-duty plug-in charging.",
  },
};
