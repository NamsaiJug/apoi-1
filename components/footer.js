// =========================================================
// footer.js — shared site footer, mounted on every page.
// =========================================================

export function mountFooter() {
  const root = document.getElementById("footer-root");
  if (!root) return;
  const year = new Date().getFullYear();
  root.innerHTML = `
    <footer class="border-t border-[var(--hairline)] mt-24">
      <div class="shell py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div class="col-span-2 md:col-span-1">
          <div class="flex items-center gap-2 font-display font-semibold mb-3">
            <span class="inline-flex items-center justify-center w-7 h-7 rounded-full" style="background:var(--highlight)">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="white" stroke-width="1.4"/><circle cx="8" cy="8" r="2.4" fill="white"/></svg>
            </span>
            AAPO
          </div>
          <p class="text-sm text-[var(--ink-soft)] leading-relaxed">Asia Parliamentary Openness Index — a joint initiative of the Asia-Pacific parliamentary monitoring network.</p>
        </div>
        <div>
          <div class="eyebrow mb-3">Explore</div>
          <ul class="space-y-2 text-sm">
            <li><a href="insight.html" class="hover:text-[var(--highlight)]">Insights</a></li>
            <li><a href="countries.html" class="hover:text-[var(--highlight)]">By country</a></li>
            <li><a href="indicators.html" class="hover:text-[var(--highlight)]">By indicator</a></li>
            <li><a href="downloads.html" class="hover:text-[var(--highlight)]">Downloads</a></li>
          </ul>
        </div>
        <div>
          <div class="eyebrow mb-3">About</div>
          <ul class="space-y-2 text-sm">
            <li><a href="about.html" class="hover:text-[var(--highlight)]">Methodology</a></li>
            <li><a href="about.html#network" class="hover:text-[var(--highlight)]">The AAPO network</a></li>
            <li><a href="about.html#report" class="hover:text-[var(--highlight)]">Report an issue</a></li>
          </ul>
        </div>
        <div>
          <div class="eyebrow mb-3">Contact</div>
          <ul class="space-y-2 text-sm text-[var(--ink-soft)]">
            <li>hello@aapo-index.org</li>
          </ul>
        </div>
      </div>
      <div class="shell py-6 border-t border-[var(--hairline)] text-xs text-[var(--ink-faint)] flex flex-wrap gap-x-6 gap-y-2">
        <span>© ${year} AAPO Network</span>
        <a href="about.html" class="hover:text-[var(--ink)]">Licensing</a>
        <a href="downloads.html" class="hover:text-[var(--ink)]">Data use policy</a>
      </div>
    </footer>
  `;
}
