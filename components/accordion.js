// =========================================================
// accordion.js — reusable expand/collapse groups.
// Markup contract:
// <div class="accordion-item">
//   <button class="accordion-trigger">...text...<svg class="accordion-chevron">...</svg></button>
//   <div class="accordion-panel"><div class="accordion-panel-inner">...content...</div></div>
// </div>
// =========================================================

export function initAccordions(root = document, { allowMultiple = true } = {}) {
  const items = root.querySelectorAll(".accordion-item");
  items.forEach((item) => {
    const trigger = item.querySelector(".accordion-trigger");
    if (!trigger || trigger.dataset.bound) return;
    trigger.dataset.bound = "true";
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      if (!allowMultiple) {
        item.parentElement.querySelectorAll(".accordion-item.open").forEach((other) => {
          if (other !== item) {
            other.classList.remove("open");
            other.querySelector(".accordion-trigger")?.setAttribute("aria-expanded", "false");
          }
        });
      }
      item.classList.toggle("open", !isOpen);
      trigger.setAttribute("aria-expanded", String(!isOpen));
    });
  });
}

/** Renders a single accordion item's HTML string (for dynamic insertion). */
export function accordionItemHTML(title, bodyHTML, { open = false } = {}) {
  return `
    <div class="accordion-item${open ? " open" : ""}">
      <button class="accordion-trigger">
        <span>${title}</span>
        <svg class="accordion-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="accordion-panel">
        <div class="accordion-panel-inner pb-5 text-sm text-[var(--ink-soft)] leading-relaxed">${bodyHTML}</div>
      </div>
    </div>`;
}
