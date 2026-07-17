// =========================================================
// glossary.js — side panel overlay, available from any page, driven by
// data/metadata/glossary.csv (columns: Terms, Definition).
//
// Two things this module does:
//  1. mountGlossary() — loads the CSV, builds the side panel, and wires up
//     a single delegated click handler so ANY current or future element
//     with class="glossary-term-trigger" data-term="{id}" opens the panel
//     scrolled to that term (also opens via the navbar "Glossary" button).
//  2. linkGlossaryTerms(root) — walks the visible text under `root` and
//     wraps every occurrence of a glossary term with a clickable span +
//     dictionary icon, so a term appearing anywhere in the site's prose
//     becomes a glossary trigger automatically. Safe to call repeatedly:
//     already-linked text is skipped, and it never touches interactive
//     controls (buttons, links, <select>/<option>, form fields).
// =========================================================

import { loadGlossary } from "../js/data.js?v=2";

let TERMS = []; // [{ id, term, def }]

export const DICTIONARY_ICON = `<svg class="glossary-icon" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
  <path d="M2 3.4c0-.5.6-.9 2-.9 1.6 0 3.1.6 4 1.6 1-1 2.4-1.6 4-1.6 1.4 0 2 .4 2 .9v8.2c0-.4-.6-.8-2-.8-1.6 0-3 .5-4 1.5-1-1-2.4-1.5-4-1.5-1.4 0-2 .4-2 .8V3.4Z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
  <path d="M8 4.1v8.2" stroke="currentColor" stroke-width="1.1"/>
</svg>`;

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Loads glossary.csv into TERMS (once, sorted alphabetically) and returns it. */
async function ensureTerms() {
  if (TERMS.length) return TERMS;
  const rows = await loadGlossary();
  TERMS = rows
    .map((r) => ({ term: (r.Terms || "").trim(), def: (r.Definition || "").trim() }))
    .filter((t) => t.term && t.def)
    .map((t) => ({ ...t, id: slugify(t.term) }))
    .sort((a, b) => a.term.localeCompare(b.term));
  return TERMS;
}

export function mountGlossary() {
  if (document.getElementById("glossary-panel-root")) return ensureTerms();

  const root = document.createElement("div");
  root.id = "glossary-panel-root";
  root.innerHTML = `
    <div class="glossary-overlay" id="glossary-overlay"></div>
    <aside class="glossary-panel" id="glossary-panel" role="dialog" aria-label="Glossary">
      <div class="flex items-center justify-between px-6 py-5 border-b border-[var(--hairline)]">
        <div class="font-display font-semibold text-lg">Glossary</div>
        <button id="glossary-close" class="btn-ghost btn !px-3 !py-1.5 text-sm" aria-label="Close glossary">Close</button>
      </div>
      <div class="px-6 pt-4">
        <input id="glossary-search" type="text" placeholder="Search terms…" class="w-full border border-[var(--hairline)] rounded-[var(--radius)] px-3 py-2 text-sm bg-[var(--paper-raised)]" />
      </div>
      <div class="overflow-y-auto px-6 py-4 flex-1" id="glossary-list"></div>
    </aside>
  `;
  document.body.appendChild(root);

  const overlay = document.getElementById("glossary-overlay");
  const panel = document.getElementById("glossary-panel");
  const listEl = document.getElementById("glossary-list");
  const searchEl = document.getElementById("glossary-search");

  function termRowHTML(t) {
    return `
      <div id="term-${t.id}" class="py-4 border-b border-[var(--hairline)] last:border-0 scroll-mt-4">
        <div class="font-display font-medium mb-1">${t.term}</div>
        <p class="text-sm text-[var(--ink-soft)] leading-relaxed">${t.def}</p>
      </div>`;
  }

  // Full A–Z browse list, grouped with a letter heading whenever the first
  // letter changes (terms are pre-sorted alphabetically).
  function renderAllGrouped() {
    let lastLetter = null;
    listEl.innerHTML = TERMS.map((t) => {
      const letter = t.term[0].toUpperCase();
      const heading = letter !== lastLetter
        ? `<div class="font-mono text-xs font-semibold text-[var(--ink-faint)] uppercase pt-5 pb-1 first:pt-0">${letter}</div>`
        : "";
      lastLetter = letter;
      return heading + termRowHTML(t);
    }).join("");
  }

  // Flat filtered list (search) — no letter headings, since the group is already small.
  function renderFiltered(q) {
    const rows = TERMS.filter((t) => t.term.toLowerCase().includes(q) || t.def.toLowerCase().includes(q));
    listEl.innerHTML = rows.length
      ? rows.map(termRowHTML).join("")
      : `<p class="text-sm text-[var(--ink-faint)] py-6">No terms match "${q}".</p>`;
  }

  // Isolated single-term view — used whenever a term is opened (from the page
  // text or from within the panel itself), so no other terms are shown.
  function renderSingleTerm(t) {
    listEl.innerHTML = `
      <button id="glossary-back" class="text-xs text-[var(--highlight)] mb-4 hover:underline">← All terms</button>
      ${termRowHTML(t)}`;
    document.getElementById("glossary-back").addEventListener("click", () => {
      searchEl.value = "";
      renderAllGrouped();
    });
  }

  function renderList(filter = "") {
    const q = filter.trim().toLowerCase();
    if (q) renderFiltered(q);
    else renderAllGrouped();
  }

  function open(termId) {
    overlay.classList.add("open");
    panel.classList.add("open");
    searchEl.value = "";
    if (termId) {
      const t = TERMS.find((x) => x.id === termId);
      if (t) {
        renderSingleTerm(t);
        return;
      }
    }
    renderAllGrouped();
  }
  function close() {
    overlay.classList.remove("open");
    panel.classList.remove("open");
  }

  overlay.addEventListener("click", close);
  document.getElementById("glossary-close").addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  window.addEventListener("aapo:openGlossary", (e) => open(e.detail?.term));
  searchEl.addEventListener("input", () => renderList(searchEl.value));

  // Single delegated handler: works for the navbar trigger, any term already
  // in the DOM, AND any term linked later by linkGlossaryTerms() — including
  // clicks on terms rendered inside the panel itself.
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest(".glossary-term-trigger");
    if (!trigger) return;
    e.preventDefault();
    open(trigger.dataset.term);
  });

  return ensureTerms().then(() => renderAllGrouped());
}

/**
 * Wraps every occurrence of a glossary term found in the visible text under
 * `root` with a clickable span + dictionary icon. Idempotent: already-linked
 * spans are skipped on re-runs, and interactive/structural elements (links,
 * buttons, form controls, script/style) are never touched so dropdowns and
 * nav/tab controls keep working normally.
 */
export function linkGlossaryTerms(root = document.body) {
  if (!TERMS.length || !root) return;

  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "SELECT", "OPTION", "BUTTON", "TEXTAREA", "INPUT", "A"]);
  const sortedTerms = TERMS.slice().sort((a, b) => b.term.length - a.term.length);
  const pattern = new RegExp(`\\b(${sortedTerms.map((t) => escapeRegExp(t.term)).join("|")})\\b`, "gi");
  const termByLower = new Map(TERMS.map((t) => [t.term.toLowerCase(), t]));

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      let el = node.parentElement;
      while (el && el !== root.parentElement) {
        if (SKIP_TAGS.has(el.tagName) || el.classList?.contains("glossary-term-trigger") || el.classList?.contains("no-glossary-link")) {
          return NodeFilter.FILTER_REJECT;
        }
        el = el.parentElement;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) textNodes.push(node);

  textNodes.forEach((textNode) => {
    pattern.lastIndex = 0;
    if (!pattern.test(textNode.nodeValue)) return;
    pattern.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    let match;
    while ((match = pattern.exec(textNode.nodeValue))) {
      const matchedText = match[0];
      const termRow = termByLower.get(matchedText.toLowerCase());
      if (!termRow) continue;
      frag.append(document.createTextNode(textNode.nodeValue.slice(lastIndex, match.index)));
      const span = document.createElement("span");
      span.className = "glossary-term-trigger";
      span.dataset.term = termRow.id;
      span.tabIndex = 0;
      span.setAttribute("role", "button");
      span.append(document.createTextNode(matchedText));
      span.insertAdjacentHTML("beforeend", DICTIONARY_ICON);
      frag.append(span);
      lastIndex = match.index + matchedText.length;
    }
    frag.append(document.createTextNode(textNode.nodeValue.slice(lastIndex)));
    textNode.parentNode.replaceChild(frag, textNode);
  });
}
