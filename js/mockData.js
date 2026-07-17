// =========================================================
// mockData.js — registry of which rows in data/ are illustrative placeholders
// rather than verified survey results.
//
// The actual mock rows themselves live as plain CSVs in data/metadata and
// data/responses so that the rest of the app never has to know or care
// whether a row is "real" or "mock" — it just reads CSVs. This file only
// tracks *which* chambers are currently placeholders, so the UI can show a
// small disclosure badge. When a chamber's real survey data is ready, simply
// remove its id here and replace its response CSV — no other code changes
// needed.
//
// Current state: Thailand's lower house (THA_low) is REAL assessment data.
// Every other chamber — including Thailand's Senate (THA_up) — is mock,
// generated to exercise the full calculation engine (bicameral averaging,
// multi-select "select all that apply" scoring, N/A handling) ahead of
// those countries' real assessments.
// =========================================================

export const MOCK_CHAMBER_IDS = new Set([
  "THA_up",
  "TWN_uni",
  "PHL_low", "PHL_up",
  "MYS_low", "MYS_up",
  "IDN_uni",
  "LKA_uni",
  "KHM_low", "KHM_up",
  "MNG_uni",
  "AUS_low", "AUS_up",
  "KOR_uni",
]);

export const REAL_CHAMBER_IDS = new Set(["THA_low"]);

export function isMockChamber(chamberId) {
  return MOCK_CHAMBER_IDS.has(chamberId);
}

/** A country counts as "fully real" only once every one of its chambers has real data. */
export function isFullyRealCountry(countryId, chambersByCountry) {
  const chambers = chambersByCountry.get(countryId) || [];
  return chambers.length > 0 && chambers.every((c) => REAL_CHAMBER_IDS.has(c.chamber_id));
}

export const MOCK_DATA_NOTICE =
  "Figures shown include illustrative placeholder data for prototyping purposes and do not reflect a completed AAPO assessment, except where noted as real Thailand lower-house data.";
