// =========================================================
// data.js — reusable CSV loading functions
// Pages should ONLY call these functions, never fetch CSVs directly.
// =========================================================

const CACHE = {
  dimensions: null,
  relevances: null,
  indicators: null,
  questions: null,
  answerOptions: null,
  countries: null,
  chambers: null,
  responsesByChamber: {},
  glossary: null,
};

const DATA_ROOT = "data";
// Cache-busting token: forces a fresh network fetch of every CSV on each full
// page load, so edits to data/ are never masked by a stale browser cache.
const CACHE_BUST = Date.now();

function loadCSV(path) {
  const url = `${path}?v=${CACHE_BUST}`;
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (err) => reject(err),
    });
  }).catch((err) => {
    console.error(`[data.js] Failed to load ${path}. If you're opening this file directly (file://), ` +
      `serve the folder with a local server instead, e.g. "python3 -m http.server" then open ` +
      `http://localhost:8000/.`, err);
    throw err;
  });
}

/** Loads all metadata tables (dimensions → relevances → indicators → questions → answer_options). */
export async function loadMetadata() {
  if (CACHE.dimensions) {
    return {
      dimensions: CACHE.dimensions,
      relevances: CACHE.relevances,
      indicators: CACHE.indicators,
      questions: CACHE.questions,
      answerOptions: CACHE.answerOptions,
    };
  }
  const [dimensions, relevances, indicators, questions, answerOptions] = await Promise.all([
    loadCSV(`${DATA_ROOT}/metadata/dimensions.csv`),
    loadCSV(`${DATA_ROOT}/metadata/dimension_relevances.csv`),
    loadCSV(`${DATA_ROOT}/metadata/indicators.csv`),
    loadCSV(`${DATA_ROOT}/metadata/questions.csv`),
    loadCSV(`${DATA_ROOT}/metadata/answer_options.csv`),
  ]);
  CACHE.dimensions = dimensions;
  CACHE.relevances = relevances;
  CACHE.indicators = indicators;
  CACHE.questions = questions.map((q) => ({ ...q, max_score: parseFloat(q.max_score) }));
  CACHE.answerOptions = answerOptions.map((o) => ({
    ...o,
    score: o.score === "" || o.score === undefined ? null : parseFloat(o.score),
    is_na: String(o.is_na).toLowerCase() === "true",
  }));
  return {
    dimensions: CACHE.dimensions,
    relevances: CACHE.relevances,
    indicators: CACHE.indicators,
    questions: CACHE.questions,
    answerOptions: CACHE.answerOptions,
  };
}

/** Loads countries.csv */
export async function loadCountries() {
  if (CACHE.countries) return CACHE.countries;
  const rows = await loadCSV(`${DATA_ROOT}/metadata/countries.csv`);
  CACHE.countries = rows;
  return rows;
}

/** Loads chambers.csv */
export async function loadChambers() {
  if (CACHE.chambers) return CACHE.chambers;
  const rows = await loadCSV(`${DATA_ROOT}/metadata/chambers.csv`);
  CACHE.chambers = rows;
  return rows;
}

/** Loads the response CSV for a single chamber. */
export async function loadResponses(chamberId) {
  if (CACHE.responsesByChamber[chamberId]) return CACHE.responsesByChamber[chamberId];
  const rows = await loadCSV(`${DATA_ROOT}/responses/${chamberId}.csv`);
  CACHE.responsesByChamber[chamberId] = rows;
  return rows;
}

/** Loads glossary.csv (Terms, Definition columns). */
export async function loadGlossary() {
  if (CACHE.glossary) return CACHE.glossary;
  const rows = await loadCSV(`${DATA_ROOT}/metadata/glossary.csv`);
  CACHE.glossary = rows;
  return rows;
}

/** Loads responses for every chamber (used for regional aggregates). */
export async function loadAllResponses() {
  const chambers = await loadChambers();
  const all = await Promise.all(chambers.map((c) => loadResponses(c.chamber_id)));
  return all.flat();
}

/**
 * Convenience: loads everything the calculation engine typically needs at once.
 * Returns a single normalized "dataset" object.
 */
export async function loadFullDataset() {
  const [meta, countries, chambers, responses] = await Promise.all([
    loadMetadata(),
    loadCountries(),
    loadChambers(),
    loadAllResponses(),
  ]);
  return { ...meta, countries, chambers, responses };
}
