// =========================================================
// app.js — shared bootstrap called by every page.
// =========================================================

import { mountNavbar } from "../components/navbar.js?v=4";
import { mountFooter } from "../components/footer.js?v=2";
import { mountGlossary, linkGlossaryTerms } from "../components/glossary.js?v=3";
import { initAccordions } from "../components/accordion.js?v=1";
import { revealOnScroll } from "./ui.js?v=1";

/** Call once per page, right after DOM is ready. */
export async function bootstrapPage(activeNavKey) {
  mountNavbar(activeNavKey);
  mountFooter();
  try {
    await mountGlossary(); // loads glossary.csv before we try to auto-link terms
    linkGlossaryTerms(document.body);
  } catch (err) {
    // The glossary is a nice-to-have layer on top of the page, not core
    // functionality — a failed/slow CSV fetch (flaky network, CDN hiccup)
    // must never prevent the rest of the page (nav, footer, and whatever
    // the calling page does next) from working.
    console.warn("[app.js] Glossary failed to load; continuing without it.", err);
  }
  initAccordions(document);
  revealOnScroll();
}

/** Re-run accordion binding + reveal + glossary term-linking after dynamically inserting new markup. */
export function refreshDynamicUI() {
  try {
    linkGlossaryTerms(document.body);
  } catch (err) {
    console.warn("[app.js] Glossary term-linking failed; continuing.", err);
  }
  initAccordions(document);
  revealOnScroll();
}
