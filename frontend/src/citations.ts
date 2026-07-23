/**
 * Stable citation list derived from PROVENANCE only.
 * Do not hand-maintain a second bibliography.
 */
import { PGE_EV_RATES, PGE_RATE_PDF, PROVENANCE } from "./provenance";

export const CITATION_ORDER = [
  "grid",
  "evShape",
  "afdc",
  "ldv",
  "milesPerDay",
  "tou",
  "dataCenters",
  "ieprDemandForecast",
  "eiaAeo2026",
  "accIi",
  "bloomEnergyDcReport",
] as const;

export type CitationId = (typeof CITATION_ORDER)[number];

export type Citation = {
  id: CitationId;
  n: number;
  /** Short label for Methods list */
  title: string;
  /** One-line detail for Methods */
  detail: string;
  url?: string;
  /** Extra primary URL when useful (e.g. PG&E PDF vs hub) */
  secondaryUrl?: string;
  secondaryLabel?: string;
};

function buildCitation(id: CitationId, n: number): Citation {
  switch (id) {
    case "grid":
      return {
        id,
        n,
        title: PROVENANCE.grid.source,
        detail: `${PROVENANCE.grid.processingNote} In-repo: ${PROVENANCE.grid.processedGlob}. Processed days: ${PROVENANCE.grid.days.join(", ")}. Peak-load benchmarks include ${PROVENANCE.grid.peak2024Mw.toLocaleString()} MW (${PROVENANCE.grid.peak2024Label}) from CAISO Peak Load History PDF.`,
        url: PROVENANCE.grid.peakHistoryUrl,
      };
    case "evShape":
      return {
        id,
        n,
        title: PROVENANCE.evShape.source,
        detail: `Year ${PROVENANCE.evShape.year} LD shapes (5 utility regions) for EV overlays. Local extract from the CEC 2022 IEPR PEV Load Shapes Data sheet; processed files ${PROVENANCE.evShape.processedPath} and ${PROVENANCE.evShape.processedSummerWeekday}. Hub below is CEDU 2022 Load Shapes (not a direct Excel URL).`,
        url: PROVENANCE.evShape.hubUrl,
      };
    case "afdc":
      return {
        id,
        n,
        title: `${PROVENANCE.population.source} (${PROVENANCE.population.year})`,
        detail: `BEV+PHEV ${PROVENANCE.population.bevPlusPhev.toLocaleString()}.`,
        url: PROVENANCE.population.afdcUrl,
      };
    case "ldv":
      return {
        id,
        n,
        title: "CEC light-duty vehicle population",
        detail: `${PROVENANCE.population.ldvTotal.toLocaleString()} on-road (data as of ${PROVENANCE.population.ldvAsOf}). ${PROVENANCE.population.ldvSource}. Retrieved ${PROVENANCE.population.ldvRetrievedAsOf}.`,
        url: PROVENANCE.population.ldvUrl,
        secondaryUrl: PROVENANCE.population.ldvDownloadUrl,
        secondaryLabel: "Download hub",
      };
    case "milesPerDay":
      return {
        id,
        n,
        title: PROVENANCE.milesPerDay.source,
        detail: `Primary Adoption miles/day ${PROVENANCE.milesPerDay.primaryMiles}: CA VMT ${PROVENANCE.milesPerDay.caVmt2023.toLocaleString()} ÷ registered vehicles ${PROVENANCE.milesPerDay.caRegisteredVehicles2023.toLocaleString()} ÷ 365. Retrieved ${PROVENANCE.milesPerDay.retrievedAsOf}.`,
        url: PROVENANCE.milesPerDay.url,
      };
    case "tou":
      return {
        id,
        n,
        title: PROVENANCE.tou.source,
        detail: `Effective ${PROVENANCE.tou.effective}. Re-verified ${PROVENANCE.tou.reVerifiedAsOf} (${PROVENANCE.tou.matchStatus}) vs tou_rates_pge.csv.`,
        url: PGE_RATE_PDF,
        secondaryUrl: PGE_EV_RATES,
        secondaryLabel: "PG&E EV rate plans",
      };
    case "dataCenters":
      return {
        id,
        n,
        title: PROVENANCE.dataCenters.source,
        detail: `About ${PROVENANCE.dataCenters.peakMwApprox.toLocaleString()} MW / ~${(PROVENANCE.dataCenters.peakShareOfCaisoApprox * 100).toFixed(0)}% of CAISO peak (${PROVENANCE.dataCenters.asOf}). Peak demand share, not annual energy. ${PROVENANCE.dataCenters.methodologyNote}. Retrieved ${PROVENANCE.dataCenters.retrievedAsOf}.`,
        url: PROVENANCE.dataCenters.url,
        secondaryUrl: PROVENANCE.dataCenters.methodologyUrl,
        secondaryLabel: "Methodology memo",
      };
    case "ieprDemandForecast":
      return {
        id,
        n,
        title: PROVENANCE.ieprDemandForecast.name,
        detail: `Adopted ${PROVENANCE.ieprDemandForecast.adopted}. ${PROVENANCE.ieprDemandForecast.peakDriverFinding}. UI label "${PROVENANCE.ieprDemandForecast.planningScenarioPeakRiseLabel}": ${PROVENANCE.ieprDemandForecast.planningScenarioPeakRiseNote} Higher path "${PROVENANCE.ieprDemandForecast.highScenarioPeakRiseLabel}": ${PROVENANCE.ieprDemandForecast.highScenarioPeakRiseNote} ${PROVENANCE.ieprDemandForecast.dataCenterUpwardRevisionNote} ${PROVENANCE.ieprDemandForecast.strengthLabel}. Retrieved ${PROVENANCE.ieprDemandForecast.retrievedAsOf}.`,
        url: PROVENANCE.ieprDemandForecast.url,
      };
    case "eiaAeo2026":
      return {
        id,
        n,
        title: PROVENANCE.eiaAeo2026.name,
        detail: `${PROVENANCE.eiaAeo2026.published}: "${PROVENANCE.eiaAeo2026.nationalFinding}." National contrast only. Retrieved ${PROVENANCE.eiaAeo2026.retrievedAsOf}.`,
        url: PROVENANCE.eiaAeo2026.url,
        secondaryUrl: PROVENANCE.eiaAeo2026.pressUrl,
        secondaryLabel: "EIA press release",
      };
    case "accIi":
      return {
        id,
        n,
        title: PROVENANCE.accIi.name,
        detail: `New light-duty ZEV sales shares: ${Math.round(PROVENANCE.accIi.salesShare2026 * 100)}% (2026), ${Math.round(PROVENANCE.accIi.salesShare2030 * 100)}% (2030), ${Math.round(PROVENANCE.accIi.salesShare2035 * 100)}% (2035). ${PROVENANCE.accIi.note} Linked source is a CARB ${PROVENANCE.accIi.urlKind}. Retrieved ${PROVENANCE.accIi.retrievedAsOf}.`,
        url: PROVENANCE.accIi.url,
      };
    case "bloomEnergyDcReport":
      return {
        id,
        n,
        title: PROVENANCE.bloomEnergyDcReport.name,
        detail: `${PROVENANCE.bloomEnergyDcReport.note} Status: ${PROVENANCE.bloomEnergyDcReport.status}.`,
      };
  }
}

/** Ordered citations 1..N, always rebuilt from PROVENANCE. */
export const CITATIONS: readonly Citation[] = CITATION_ORDER.map((id, i) =>
  buildCitation(id, i + 1),
);

export function citationNumber(id: CitationId): number {
  const hit = CITATIONS.find((c) => c.id === id);
  if (!hit) throw new Error(`Unknown citation id: ${id}`);
  return hit.n;
}

export function citationAnchor(id: CitationId): string {
  return `cite-${citationNumber(id)}`;
}
