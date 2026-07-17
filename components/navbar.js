// =========================================================
// navbar.js — shared site navigation, mounted on every page.
// =========================================================

import { DICTIONARY_ICON } from "./glossary.js?v=3";

const LINKS = [
  { href: "insight.html", key: "insight", label: "Insights" },
  { href: "countries.html", key: "countries", label: "Explore by country" },
  { href: "indicators.html", key: "indicators", label: "Explore by indicator" },
  { href: "downloads.html", key: "downloads", label: "Downloads" },
  { href: "about.html", key: "about", label: "About" },
];

export function mountNavbar(activeKey = "") {
  const root = document.getElementById("navbar-root");
  if (!root) return;

  root.innerHTML = `
    <nav class="aapo-nav">
      <div class="shell flex items-center justify-between h-16">
        <a href="index.html" class="flex items-center gap-2 font-display font-semibold text-[var(--ink)]">
          <span class="inline-flex items-center justify-center w-8 h-8 rounded-full" style="background:var(--highlight)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="white" stroke-width="1.4"/><circle cx="8" cy="8" r="2.4" fill="white"/></svg>
          </span>
          <span class="hidden sm:inline">AAPO</span>
        </a>

        <div class="hidden md:flex items-center gap-7" id="nav-links"></div>

        <div class="flex items-center gap-2">
          <button id="glossary-nav-btn" class="btn-ghost btn !py-2 !px-4 text-sm">${DICTIONARY_ICON}Glossary</button>
          <button id="nav-toggle" class="md:hidden btn-ghost btn !px-3 !py-2" aria-label="Toggle menu" aria-expanded="false">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
      <div id="nav-mobile" class="md:hidden hidden border-t border-[var(--hairline)]">
        <div class="shell py-3 flex flex-col gap-3" id="nav-links-mobile"></div>
      </div>
    </nav>
  `;

  const linkHTML = (l) => `<a href="${l.href}" class="nav-link${l.key === activeKey ? " active" : ""}">${l.label}</a>`;
  document.getElementById("nav-links").innerHTML = LINKS.map(linkHTML).join("");
  document.getElementById("nav-links-mobile").innerHTML = LINKS.map(linkHTML).join("");

  const toggle = document.getElementById("nav-toggle");
  const mobile = document.getElementById("nav-mobile");
  toggle?.addEventListener("click", () => {
    const isOpen = !mobile.classList.contains("hidden");
    mobile.classList.toggle("hidden");
    toggle.setAttribute("aria-expanded", String(!isOpen));
  });

  document.getElementById("glossary-nav-btn")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("aapo:openGlossary"));
  });
}
