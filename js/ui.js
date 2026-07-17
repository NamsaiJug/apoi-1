// =========================================================
// ui.js — small reusable DOM / formatting helpers
// =========================================================

export function fmtPct(pct, digits = 0) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return "—";
  return `${pct.toFixed(digits)}%`;
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function badgeFor(tone, label) {
  const cls = { achieved: "badge-achieved", partly: "badge-partly", not: "badge-not", na: "badge-na" }[tone] || "badge-na";
  return `<span class="badge ${cls}">${label}</span>`;
}

export function toneColor(tone) {
  return {
    achieved: "var(--achieved)",
    partly: "var(--partly)",
    not: "var(--not-achieved)",
    na: "var(--na)",
  }[tone] || "var(--na)";
}

/** Debounce helper for scroll/resize-triggered chart redraws. */
export function debounce(fn, wait = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/** Sets up an IntersectionObserver-based reveal-on-scroll for a NodeList/selector. */
export function revealOnScroll(selector = "[data-reveal]") {
  const targets = document.querySelectorAll(selector);
  if (!("IntersectionObserver" in window) || targets.length === 0) {
    targets.forEach((t) => t.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  targets.forEach((t) => io.observe(t));
}

/** Reads/writes simple state to the URL query string (for shareable/bookmarkable views). */
export const urlState = {
  get(key, fallback = null) {
    const params = new URLSearchParams(window.location.search);
    return params.has(key) ? params.get(key) : fallback;
  },
  set(key, value) {
    const params = new URLSearchParams(window.location.search);
    if (value === null || value === undefined || value === "") params.delete(key);
    else params.set(key, value);
    const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState({}, "", newUrl);
  },
};
