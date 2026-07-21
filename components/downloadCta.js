// =========================================================
// downloadCta.js — shared "Conduct deeper analysis" download CTA,
// mounted at the bottom of country.html, countries.html,
// indicators.html, and indicator.html, right above the footer.
// =========================================================

export function mountDownloadCta() {
  const root = document.getElementById("download-cta-root");
  if (!root) return;
  root.innerHTML = `
    <section class="shell pb-16">
      <div class="card p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6" style="background:var(--highlight-dim); border-color:transparent;">
        <div>
          <h2 class="font-display text-xl font-semibold mb-2">Conduct deeper analysis</h2>
          <p class="text-[var(--ink-soft)] max-w-md">Machine-readable data for all countries in this cycle is available for download.</p>
        </div>
        <div class="flex gap-3 flex-shrink-0">
          <a href="downloads.html" class="btn btn-primary">Download raw data</a>
        </div>
      </div>
    </section>
  `;
}
