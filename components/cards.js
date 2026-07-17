// =========================================================
// cards.js — reusable card markup generators.
// Each function returns an HTML string; pages insert via innerHTML.
// =========================================================

import { fmtPct, badgeFor } from "../js/ui.js";

/** Card for a dimension summary (used on Insights / Home). */
export function dimensionCard({ name, def, pct }) {
  return `
    <div class="card p-6 flex flex-col gap-4" data-reveal>
      <div class="flex items-start justify-between gap-3">
        <h3 class="font-display font-semibold text-lg">${name}</h3>
        <span class="font-mono text-2xl font-medium" style="color:var(--highlight)">${fmtPct(pct)}</span>
      </div>
      <div class="score-bar-slot"></div>
      <p class="text-sm text-[var(--ink-soft)] leading-relaxed">${def}</p>
    </div>`;
}

/** Card for a country tile (used on Explore by country). */
export function countryCard({ countryId, name, systemType, pct, rank }) {
  return `
    <a href="country.html?id=${countryId}" class="card p-5 flex items-center gap-4 group" data-reveal>
      <div class="w-12 h-12 rounded-full flex items-center justify-center font-mono text-sm font-medium flex-shrink-0" style="background:var(--highlight-dim); color:var(--highlight);">
        ${rank ?? "–"}
      </div>
      <div class="flex-1 min-w-0">
        <div class="font-display font-medium truncate group-hover:text-[var(--highlight)] transition-colors">${name}</div>
        <div class="text-xs text-[var(--ink-faint)] mt-0.5 capitalize">${systemType}</div>
      </div>
      <div class="font-mono text-lg font-medium flex-shrink-0">${fmtPct(pct)}</div>
    </a>`;
}

/** Card for an indicator tile (used on Explore by indicator). */
export function indicatorCard({ indicatorId, name, achievedCount, totalCount }) {
  return `
    <a href="indicator.html?id=${indicatorId}" class="card p-5 flex flex-col gap-3 group" data-reveal>
      <div class="font-display font-medium group-hover:text-[var(--highlight)] transition-colors">${name}</div>
      <div class="flex items-center gap-2 text-xs text-[var(--ink-soft)]">
        <span class="font-mono font-medium" style="color:var(--achieved)">${achievedCount}</span>
        <span>of ${totalCount} countries have achieved this indicator</span>
      </div>
    </a>`;
}

/** Small stat tile (used in hero sections). */
export function statTile({ label, value, tone = "ink" }) {
  const color = tone === "amber" ? "var(--amber)" : tone === "teal" ? "var(--highlight)" : "var(--ink)";
  return `
    <div class="flex flex-col gap-1">
      <span class="font-mono text-3xl font-medium" style="color:${color}">${value}</span>
      <span class="eyebrow">${label}</span>
    </div>`;
}

export { badgeFor };
