// =========================================================
// questionBlock.js — the reusable "question-answer-block" used on both
// country.html and indicator.html: a single question's text, its answer
// options (bulleted, selected one highlighted, each showing its own point
// value), the achieved score, collapsible Country context / Evidence
// sources boxes, and a Report issue link. Extracted here so both pages
// share the exact same markup/behavior rather than duplicating it.
// =========================================================

import { calculateQuestionScore } from "../js/calculations.js?v=15";

export const REPORT_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdUzpNtGzBEwPaC1FhNTuFkcwCtLkogFzRZJpnQv5QeHVf7pg/viewform";

/** A small collapsible box (closed by default) used for Country context / Evidence sources. */
export function accordionBoxHTML(label, text) {
  return `
    <div class="accordion-item !border-0 rounded-[var(--radius)] overflow-hidden mb-2" style="background:var(--paper)">
      <button class="accordion-trigger !px-3 !py-2 text-xs font-medium">
        <span>${label}</span>
        <svg class="accordion-chevron" width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="accordion-panel">
        <div class="accordion-panel-inner px-3 pb-3 text-xs text-[var(--ink-soft)] leading-relaxed">${text || "—"}</div>
      </div>
    </div>`;
}

/**
 * Renders one question's full block for a given chamber.
 * @param {object} q - question row (question_id, question_text, ...)
 * @param {number} index - 0-based position, shown as "1", "2", ...
 * @param {string} chamberId
 * @param {object} idx - the index object from buildIndex()
 */
export function questionBlockHTML(q, index, chamberId, idx) {
  const resp = idx.responseByChamberQuestion.get(`${chamberId}__${q.question_id}`);
  const score = calculateQuestionScore(resp, q, idx);
  const options = idx.optionsByQuestion.get(q.question_id) || [];
  const selectedIds = resp ? String(resp.selected_option_ids).split(";").map((s) => s.trim()) : [];
  const scoreDisplay = score.isNA ? "N/A" : `${Number.isInteger(score.score) ? score.score : score.score.toFixed(2)}<span class="text-[var(--ink-faint)]">/${score.max}</span>`;

  const optionsHTML = options.map((o) => {
    const isSelected = selectedIds.includes(o.option_id);
    const pointLabel = o.is_na ? "N/A" : (o.score ?? 0);
    const color = isSelected ? "var(--highlight)" : "var(--ink-faint)";
    return `
      <div class="flex items-baseline gap-1.5${isSelected ? " font-semibold" : ""}" style="color:${color}">
        <span>•</span>
        <span class="flex-1">${o.label}</span>
        <span class="text-xs flex-shrink-0" style="color:${isSelected ? "var(--highlight)" : "var(--ink-faint)"}">(${pointLabel})</span>
      </div>`;
  }).join("");

  return `
    <div class="question-answer-block pt-5 mt-5 border-t border-[var(--hairline)] first:border-0 first:mt-0 first:pt-0">
      <div class="grid md:grid-cols-[1fr_1fr_64px] gap-4">
        <div>
          <div class="text-base leading-relaxed mb-3"><span class="font-mono text-[var(--ink-faint)] mr-2">${index + 1}</span>${q.question_text}</div>
          ${resp ? `
            ${accordionBoxHTML("Country context", resp.country_context)}
            ${accordionBoxHTML("Evidence sources", resp.supporting_evidence)}
          ` : ""}
        </div>
        <div class="text-sm space-y-1.5">
          ${optionsHTML}
        </div>
        <div class="font-mono text-right font-semibold" style="color:var(--highlight)">${scoreDisplay}</div>
      </div>
      <div class="text-right mt-3">
        <a href="${REPORT_FORM_URL}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-xs font-medium" style="color:var(--not-achieved)">⚠ Report issue →</a>
      </div>
    </div>`;
}
