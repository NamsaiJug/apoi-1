// =========================================================
// charts.js — chart wrappers (Chart.js) + the "Aperture" signature visual.
//
// The Aperture is AAPO's signature motif: a camera-iris diaphragm whose
// blades swing open in proportion to an openness score. Closed = opaque
// (little transparency); fully open = a wide, unobstructed circle of light.
// It is used anywhere a single headline score needs to be felt, not just read.
// =========================================================

const CSS = getComputedStyle(document.documentElement);
function cssVar(name, fallback) {
  const v = CSS.getPropertyValue(name);
  return v ? v.trim() : fallback;
}

/**
 * Renders an SVG aperture into `container`.
 * @param {HTMLElement} container
 * @param {number} score 0-100
 * @param {object} opts { size, blades, color, trackColor, animate, label }
 */
export function renderAperture(container, score, opts = {}) {
  const size = opts.size ?? 160;
  const blades = opts.blades ?? 9;
  const color = opts.color ?? "var(--highlight)";
  const trackColor = opts.trackColor ?? "var(--hairline)";
  const animate = opts.animate ?? true;
  const cx = size / 2, cy = size / 2;
  const R = size * 0.46; // pivot radius (outer rim the blades hinge near)
  const fraction = Math.max(0, Math.min(100, score ?? 0)) / 100;
  const openMaxDeg = 46; // how far each blade swings open at score = 100
  const bladeAngle = openMaxDeg * fraction;
  const bladeWidth = ((2 * Math.PI * R) / blades) * 0.72; // half-width at pivot
  const tipLength = R * 1.62; // reach toward/through center when closed

  let blades_svg = "";
  for (let i = 0; i < blades; i++) {
    const baseAngle = (360 / blades) * i;
    const d = `M 0 ${-bladeWidth / 2}
               C ${-tipLength * 0.42} ${-bladeWidth * 0.4}, ${-tipLength * 0.8} ${-bladeWidth * 0.12}, ${-tipLength} 0
               C ${-tipLength * 0.8} ${bladeWidth * 0.12}, ${-tipLength * 0.42} ${bladeWidth * 0.4}, 0 ${bladeWidth / 2}
               Z`;
    blades_svg += `
      <g transform="translate(${cx} ${cy}) rotate(${baseAngle})">
        <g class="aperture-blade" style="transform-origin:${R}px 0px;" transform="translate(${R} 0) rotate(${animate ? 0 : bladeAngle}) translate(${-R} 0)" data-open-deg="${bladeAngle}">
          <path d="${d}" transform="translate(${R} 0)" fill="${color}" opacity="0.92" />
        </g>
      </g>`;
  }

  container.innerHTML = `
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Openness score ${Math.round(score)} percent">
      <circle cx="${cx}" cy="${cy}" r="${R * 1.06}" fill="none" stroke="${trackColor}" stroke-width="1.5" />
      ${blades_svg}
    </svg>`;

  if (animate) {
    requestAnimationFrame(() => {
      container.querySelectorAll(".aperture-blade").forEach((g) => {
        const deg = g.getAttribute("data-open-deg");
        const R2 = R;
        g.setAttribute("transform", `translate(${R2} 0) rotate(${deg}) translate(${-R2} 0)`);
      });
    });
  }
}

/** Horizontal bar showing the score out of 100 with a band-colored fill. */
export function renderScoreBar(container, pct, tone = "achieved") {
  const width = pct === null ? 0 : Math.max(2, pct);
  const color = { achieved: "var(--achieved)", partly: "var(--partly)", not: "var(--not-achieved)", na: "var(--na)" }[tone];
  container.innerHTML = `
    <div style="background:var(--hairline); border-radius:999px; height:8px; width:100%; overflow:hidden;">
      <div style="background:${color}; height:100%; width:${width}%; border-radius:999px; transition:width .8s cubic-bezier(.16,1,.3,1);"></div>
    </div>`;
}

/** Chart.js horizontal bar chart comparing dimension scores. */
export function renderDimensionChart(canvas, dimensionRows) {
  return new Chart(canvas, {
    type: "bar",
    data: {
      labels: dimensionRows.map((d) => d.name),
      datasets: [{
        data: dimensionRows.map((d) => d.pct ?? 0),
        backgroundColor: cssVar("--highlight", "#1F3A5F"),
        borderRadius: 6,
        maxBarThickness: 28,
      }],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { min: 0, max: 100, grid: { color: cssVar("--hairline", "#DEDAD0") }, ticks: { callback: (v) => `${v}%` } },
        y: { grid: { display: false } },
      },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.x.toFixed(0)}%` } } },
    },
  });
}

/**
 * Chart.js VERTICAL STACKED bar chart comparing each country's total score.
 * Each bar stacks two segments: the achieved score (colored, highlight-aware)
 * and the remainder up to 100% (fixed light gray — the "lost" score).
 * Takes plain arrays (not row objects) so callers can mutate an existing
 * chart's `data` and call chart.update() for a smooth transition instead of
 * recreating the chart from scratch.
 */
/**
 * Draws a dashed horizontal line + label at chart.options.plugins.averageLine.value.
 * Registered per-chart-instance (not globally) so it only affects charts that opt in.
 * Callers update the line by setting `chart.options.plugins.averageLine.value = x`
 * before calling chart.update() — no need to recreate the chart.
 */
const averageLinePlugin = {
  id: "averageLine",
  afterDatasetsDraw(chart) {
    const opts = chart.options.plugins?.averageLine;
    if (!opts || opts.value === null || opts.value === undefined) return;
    const { ctx, chartArea, scales } = chart;
    const y = scales.y.getPixelForValue(opts.value);
    const color = opts.color || cssVar("--ink-faint", "#8A9099");

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(chartArea.left, y);
    ctx.lineTo(chartArea.right, y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = color;
    ctx.font = "600 11px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = y - chartArea.top > 12 ? "bottom" : "top";
    ctx.fillText(`Avg ${Math.round(opts.value)}%`, chartArea.right, y + (ctx.textBaseline === "bottom" ? -3 : 3));
    ctx.restore();
  },
};

export function renderCountryScoreChart(canvas, { labels, achieved, remainder, colors, average = null }) {
  return new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Score",
          data: achieved,
          backgroundColor: colors,
          stack: "total",
          maxBarThickness: 42,
        },
        {
          label: "Remaining",
          data: remainder,
          backgroundColor: cssVar("--hairline", "#DEDAD0"),
          stack: "total",
          borderRadius: 4,
          maxBarThickness: 42,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { stacked: true, min: 0, max: 100, grid: { color: cssVar("--hairline", "#DEDAD0") }, ticks: { callback: (v) => `${v}%` } },
        x: { stacked: true, grid: { display: false }, ticks: { autoSkip: false, maxRotation: 40, minRotation: 40, font: { size: 11 } } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          filter: (item) => item.datasetIndex === 0,
          callbacks: { label: (ctx) => `Score: ${ctx.parsed.y.toFixed(0)}%` },
        },
        averageLine: { value: average },
      },
    },
    plugins: [averageLinePlugin],
  });
}

/** Chart.js horizontal ranking bar chart (countries), highlighting one country. */
export function renderRankingChart(canvas, rankingRows, highlightId) {
  return new Chart(canvas, {
    type: "bar",
    data: {
      labels: rankingRows.map((r) => r.name),
      datasets: [{
        data: rankingRows.map((r) => r.pct ?? 0),
        backgroundColor: rankingRows.map((r) => (r.countryId === highlightId ? cssVar("--amber", "#D9A441") : cssVar("--highlight-dim", "#E7ECF1"))),
        borderColor: rankingRows.map((r) => (r.countryId === highlightId ? cssVar("--amber", "#D9A441") : cssVar("--highlight", "#1F3A5F"))),
        borderWidth: 1,
        borderRadius: 5,
        maxBarThickness: 18,
      }],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { min: 0, max: 100, grid: { color: cssVar("--hairline", "#DEDAD0") }, ticks: { callback: (v) => `${v}%` } },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } },
      },
      plugins: { legend: { display: false } },
    },
  });
}
