// =========================================================
// calculations.js — the ONLY place scoring logic should live.
// All pages must call these functions rather than re-deriving scores.
//
// Hierarchy: Dimension → Relevance → Indicator → Question → Answer option
//            Country → Chamber → Response (per question)
// =========================================================

/** Builds fast lookup indexes from a loaded dataset (see data.js#loadFullDataset). */
export function buildIndex(dataset) {
  const { dimensions, relevances, indicators, questions, answerOptions, countries, chambers, responses, indicatorContext = [] } = dataset;

  const optionsByQuestion = new Map();
  for (const o of answerOptions) {
    if (!optionsByQuestion.has(o.question_id)) optionsByQuestion.set(o.question_id, []);
    optionsByQuestion.get(o.question_id).push(o);
  }
  const optionsById = new Map(answerOptions.map((o) => [o.option_id, o]));

  const questionsByIndicator = new Map();
  for (const q of questions) {
    if (!questionsByIndicator.has(q.indicator_id)) questionsByIndicator.set(q.indicator_id, []);
    questionsByIndicator.get(q.indicator_id).push(q);
  }

  const indicatorsByRelevance = new Map();
  for (const i of indicators) {
    if (!indicatorsByRelevance.has(i.relevance_id)) indicatorsByRelevance.set(i.relevance_id, []);
    indicatorsByRelevance.get(i.relevance_id).push(i);
  }

  const relevancesByDimension = new Map();
  for (const r of relevances) {
    if (!relevancesByDimension.has(r.dimension_id)) relevancesByDimension.set(r.dimension_id, []);
    relevancesByDimension.get(r.dimension_id).push(r);
  }

  const chambersByCountry = new Map();
  for (const c of chambers) {
    if (!chambersByCountry.has(c.country_id)) chambersByCountry.set(c.country_id, []);
    chambersByCountry.get(c.country_id).push(c);
  }

  const responsesByChamber = new Map();
  for (const r of responses) {
    if (!responsesByChamber.has(r.chamber_id)) responsesByChamber.set(r.chamber_id, []);
    responsesByChamber.get(r.chamber_id).push(r);
  }
  // responses keyed by chamber+question for O(1) lookup
  const responseByChamberQuestion = new Map();
  for (const r of responses) {
    responseByChamberQuestion.set(`${r.chamber_id}__${r.question_id}`, r);
  }

  const contextByChamberIndicator = new Map();
  for (const c of indicatorContext) {
    contextByChamberIndicator.set(`${c.chamber_id}__${c.indicator_id}`, c);
  }

  return {
    dimensions, relevances, indicators, questions, answerOptions, countries, chambers, responses,
    optionsByQuestion, optionsById, questionsByIndicator, indicatorsByRelevance,
    relevancesByDimension, chambersByCountry, responsesByChamber, responseByChamberQuestion,
    contextByChamberIndicator,
  };
}

/**
 * Scores a single response row against its question's answer options.
 * selected_option_ids may contain multiple ids ("O0181;O0182;O0183") for
 * "select all that apply" questions, where each option already carries the
 * fraction of the question's max score it contributes (e.g. four options
 * worth 0.25 each). Summing the selected options' scores therefore works
 * uniformly for both single-select (one id, its own score) and multi-select
 * (several ids, fractions add up to the max). If ANY selected option is
 * marked is_na, the whole question is treated as Not Applicable for this
 * chamber and excluded from the denominator.
 * Returns { score, max, isNA } where score/max are in the same units as max_score.
 */
export function calculateQuestionScore(response, question, idx) {
  if (!response || !response.selected_option_ids) {
    return { score: 0, max: question.max_score, isNA: true };
  }
  const ids = String(response.selected_option_ids).split(";").map((s) => s.trim()).filter(Boolean);
  const opts = ids.map((id) => idx.optionsById.get(id)).filter(Boolean);
  if (opts.length === 0 || opts.some((o) => o.is_na)) {
    return { score: 0, max: question.max_score, isNA: true };
  }
  const score = opts.reduce((sum, o) => sum + (o.score ?? 0), 0);
  return { score, max: question.max_score, isNA: false };
}

/** Sums applicable (non-N/A) max score across a set of question scorings — the true denominator. */
export function calculateApplicableMaximum(questionScores) {
  return questionScores.filter((qs) => !qs.isNA).reduce((sum, qs) => sum + qs.max, 0);
}

function aggregate(questionScores) {
  const applicable = questionScores.filter((qs) => !qs.isNA);
  const max = applicable.reduce((s, qs) => s + qs.max, 0);
  const score = applicable.reduce((s, qs) => s + qs.score, 0);
  const isNA = applicable.length === 0;
  return { score, max, pct: isNA ? null : (max > 0 ? (score / max) * 100 : null), isNA };
}

/** All question scores for one chamber (across every question in the dataset). */
function chamberQuestionScores(chamberId, idx) {
  return idx.questions.map((q) => {
    const resp = idx.responseByChamberQuestion.get(`${chamberId}__${q.question_id}`);
    return { questionId: q.question_id, indicatorId: q.indicator_id, ...calculateQuestionScore(resp, q, idx) };
  });
}

/** Indicator score for one chamber: aggregates that indicator's questions. */
export function calculateIndicatorScore(chamberId, indicatorId, idx) {
  const questions = idx.questionsByIndicator.get(indicatorId) || [];
  const scores = questions.map((q) => {
    const resp = idx.responseByChamberQuestion.get(`${chamberId}__${q.question_id}`);
    return calculateQuestionScore(resp, q, idx);
  });
  return aggregate(scores);
}

/** Relevance score for one chamber: aggregates all indicators under that relevance. */
export function calculateRelevanceScore(chamberId, relevanceId, idx) {
  const indicators = idx.indicatorsByRelevance.get(relevanceId) || [];
  const scores = indicators.flatMap((i) => {
    const questions = idx.questionsByIndicator.get(i.indicator_id) || [];
    return questions.map((q) => {
      const resp = idx.responseByChamberQuestion.get(`${chamberId}__${q.question_id}`);
      return calculateQuestionScore(resp, q, idx);
    });
  });
  return aggregate(scores);
}

/**
 * Dimension score for one chamber: aggregates all relevances/indicators/questions under it.
 * Indicators are deduplicated by id before flattening to questions — the source metadata
 * can list the same indicator under more than one relevance of the same dimension (e.g. an
 * indicator that supports both "availability of agendas" and "availability of draft
 * legislation"), and its questions must only be counted once at the dimension level.
 */
export function calculateDimensionScore(chamberId, dimensionId, idx) {
  const relevances = idx.relevancesByDimension.get(dimensionId) || [];
  const indicatorIds = new Set();
  relevances.forEach((r) => {
    (idx.indicatorsByRelevance.get(r.relevance_id) || []).forEach((i) => indicatorIds.add(i.indicator_id));
  });
  const scores = [...indicatorIds].flatMap((indicatorId) => {
    const questions = idx.questionsByIndicator.get(indicatorId) || [];
    return questions.map((q) => {
      const resp = idx.responseByChamberQuestion.get(`${chamberId}__${q.question_id}`);
      return calculateQuestionScore(resp, q, idx);
    });
  });
  return aggregate(scores);
}

/** Overall chamber score: aggregates every question answered by that chamber. */
export function calculateChamberScore(chamberId, idx) {
  const scores = chamberQuestionScores(chamberId, idx);
  return aggregate(scores);
}

/**
 * Country score: average of its chambers' overall scores.
 * Bicameral => (lower + upper) / 2.  Unicameral => the single chamber's score.
 * `level` + `key` optionally scope this to a dimension/relevance/indicator instead of overall.
 */
export function calculateCountryScore(countryId, idx, level = "overall", key = null) {
  const chambers = idx.chambersByCountry.get(countryId) || [];
  const chamberScores = chambers.map((c) => {
    if (level === "dimension") return calculateDimensionScore(c.chamber_id, key, idx);
    if (level === "relevance") return calculateRelevanceScore(c.chamber_id, key, idx);
    if (level === "indicator") return calculateIndicatorScore(c.chamber_id, key, idx);
    return calculateChamberScore(c.chamber_id, idx);
  });
  const valid = chamberScores.filter((s) => !s.isNA && s.pct !== null);
  if (valid.length === 0) return { pct: null, isNA: true, byChamber: chamberScores, chambers };
  const pct = valid.reduce((s, cs) => s + cs.pct, 0) / valid.length;
  return { pct, isNA: false, byChamber: chamberScores, chambers };
}

/** Average of calculateCountryScore(...).pct across a list of countries — used for regional averages. */
export function calculateRegionalAverage(countryIds, idx, level = "overall", key = null) {
  const results = countryIds.map((cid) => calculateCountryScore(cid, idx, level, key));
  const valid = results.filter((r) => !r.isNA);
  if (valid.length === 0) return null;
  return valid.reduce((s, r) => s + r.pct, 0) / valid.length;
}

/** Ranks countries by a scoring function (highest first). Ties share a rank. */
export function calculateRanking(countryIds, idx, level = "overall", key = null) {
  const rows = countryIds
    .map((cid) => ({ countryId: cid, ...calculateCountryScore(cid, idx, level, key) }))
    .filter((r) => !r.isNA)
    .sort((a, b) => b.pct - a.pct);
  let rank = 0, lastPct = null;
  return rows.map((r, i) => {
    if (r.pct !== lastPct) rank = i + 1;
    lastPct = r.pct;
    return { ...r, rank };
  });
}

/**
 * Indicator classification for a COUNTRY (across all its chambers), per the AAPO methodology:
 *  - achieved: every question, every chamber scores the max (1)
 *  - partly_achieved: at least one chamber scores < 1 on at least one question
 *  - not_achieved: every chamber scores 0 on every question
 *  - na: every chamber is N/A on every question
 */
export function calculateIndicatorClassification(countryId, indicatorId, idx) {
  const chambers = idx.chambersByCountry.get(countryId) || [];
  const questions = idx.questionsByIndicator.get(indicatorId) || [];
  let allScored = [];
  for (const c of chambers) {
    for (const q of questions) {
      const resp = idx.responseByChamberQuestion.get(`${c.chamber_id}__${q.question_id}`);
      allScored.push(calculateQuestionScore(resp, q, idx));
    }
  }
  const applicable = allScored.filter((s) => !s.isNA);
  if (applicable.length === 0) return "na";
  const allMax = applicable.every((s) => s.max > 0 && s.score >= s.max - 1e-9);
  if (allMax) return "achieved";
  const allZero = applicable.every((s) => s.score <= 1e-9);
  if (allZero) return "not_achieved";
  return "partly_achieved";
}

/**
 * Same classification rules as calculateIndicatorClassification, but scoped
 * to a single chamber rather than combining every chamber of the country.
 * Use this for a per-chamber view (e.g. a badge shown while the "Lower
 * Chamber" tab is active) so it reflects only that chamber's own answers —
 * combining chambers can otherwise mask one chamber's N/A behind another
 * chamber's real score. For unicameral countries this is equivalent to
 * calculateIndicatorClassification since there is only one chamber anyway.
 */
export function calculateIndicatorClassificationForChamber(chamberId, indicatorId, idx) {
  const questions = idx.questionsByIndicator.get(indicatorId) || [];
  const scored = questions.map((q) => {
    const resp = idx.responseByChamberQuestion.get(`${chamberId}__${q.question_id}`);
    return calculateQuestionScore(resp, q, idx);
  });
  const applicable = scored.filter((s) => !s.isNA);
  if (applicable.length === 0) return "na";
  const allMax = applicable.every((s) => s.max > 0 && s.score >= s.max - 1e-9);
  if (allMax) return "achieved";
  const allZero = applicable.every((s) => s.score <= 1e-9);
  if (allZero) return "not_achieved";
  return "partly_achieved";
}

/** Convenience: score band label + tone for any percentage 0-100. */
export function scoreBand(pct) {
  if (pct === null || pct === undefined) return { label: "N/A", tone: "na" };
  if (pct >= 90) return { label: "Achieved", tone: "achieved" };
  if (pct > 0) return { label: "Partly achieved", tone: "partly" };
  return { label: "Not achieved", tone: "not" };
}

/**
 * Finds a country's chamber for a given "slot":
 *  - "lower": the lower house, or the single chamber for a unicameral parliament
 *  - "upper": the upper house (undefined if the parliament is unicameral)
 */
export function getChamberForCountry(countryId, slot, idx) {
  const chambers = idx.chambersByCountry.get(countryId) || [];
  if (slot === "upper") return chambers.find((c) => c.chamber_type === "upper");
  return chambers.find((c) => c.chamber_type === "lower" || c.chamber_type === "unicameral");
}

/**
 * Ranks countries by a single chamber slot ("lower" or "upper") rather than the
 * country-level average. Countries without a chamber in that slot (e.g. a
 * unicameral country when slot="upper") are excluded rather than shown as 0/N/A.
 * `level`/`key` optionally scope the score to a dimension/relevance/indicator,
 * mirroring calculateCountryScore/calculateRanking.
 */
export function calculateChamberRanking(countryIds, slot, idx, level = "overall", key = null) {
  const rows = countryIds
    .map((countryId) => {
      const chamber = getChamberForCountry(countryId, slot, idx);
      if (!chamber) return null;
      const score = level === "dimension" ? calculateDimensionScore(chamber.chamber_id, key, idx)
        : level === "relevance" ? calculateRelevanceScore(chamber.chamber_id, key, idx)
        : level === "indicator" ? calculateIndicatorScore(chamber.chamber_id, key, idx)
        : calculateChamberScore(chamber.chamber_id, idx);
      if (score.isNA || score.pct === null) return null;
      return { countryId, chamberId: chamber.chamber_id, pct: score.pct };
    })
    .filter(Boolean)
    .sort((a, b) => b.pct - a.pct);

  let rank = 0, lastPct = null;
  return rows.map((r, i) => {
    if (r.pct !== lastPct) rank = i + 1;
    lastPct = r.pct;
    return { ...r, rank };
  });
}

/**
 * Raw score for a country: the sum of achieved points and applicable total
 * points across every one of its chambers (e.g. bicameral Thailand combines
 * both its House and Senate). This is the "65/68"-style figure shown
 * alongside the percentage — informational context, not a different
 * methodology; the percentage remains the authoritative comparable score.
 */
export function calculateCountryRawScore(countryId, idx) {
  const chambers = idx.chambersByCountry.get(countryId) || [];
  return chambers.reduce(
    (acc, c) => {
      const s = calculateChamberScore(c.chamber_id, idx);
      return { score: acc.score + s.score, max: acc.max + s.max };
    },
    { score: 0, max: 0 }
  );
}
