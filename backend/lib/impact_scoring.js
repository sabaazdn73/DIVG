// ╔══════════════════════════════════════════════════════════════╗
// ║ IMPACT OUTCOME MEASUREMENT — ambition-adjusted scoring       ║
// ║ Methodology: Omid Azadegan (MSc, impact measurement)         ║
// ║                                                              ║
// ║ HOW IT WORKS:                                                ║
// ║  1. Normalize each firm's impact to a common unit            ║
// ║     (impact per $1k of capital) so firms of any size compare.║
// ║  2. Build a benchmark per sector via hierarchical shrinkage: ║
// ║     few peers -> pulled toward the global mean (honest).     ║
// ║  3. Score each firm against that benchmark on one of:        ║
// ║     • REAL  path — a realized outcome was reported;          ║
// ║       score = actual_per_unit / expected_benchmark.          ║
// ║     • SHADOW path — no realized outcome reported; only the   ║
// ║       target's ambition vs benchmark is shown, and the       ║
// ║       actual outcome is NEVER invented.                      ║
// ║                                                              ║
// ║ HONEST BOUNDARIES:                                           ║
// ║  • shrinkage applies ONLY to the expected-target benchmark,  ║
// ║    NEVER to a firm's actual reported outcome.                ║
// ║  • low-data sectors are flagged with a confidence level.     ║
// ║  • output is a context-adjusted score, NOT "real impact".    ║
// ╚══════════════════════════════════════════════════════════════╝

const FRED_API_KEY = process.env.FRED_API_KEY || '';

// Fetch with an abort-based timeout so a slow/unresponsive external API
// (World Bank, FRED) can never stall the whole scoring request. On timeout
// it throws, which the callers below already catch and turn into null.
async function fetchWithTimeout(url, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── External context: World Bank (keyless) + FRED (key) ──────────
// World Bank per-country indicators. Returns most-recent non-null value.
async function worldBank(country, indicator) {
  try {
    const url = `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}?format=json&per_page=10&date=2018:2023`;
    const resp = await fetchWithTimeout(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!Array.isArray(data) || data.length < 2 || !data[1]) return null;
    for (const row of data[1]) {
      if (row.value !== null && row.value !== undefined) {
        return { value: row.value, year: row.date };
      }
    }
    return null;
  } catch (e) {
    console.warn('[WB] error:', e.message);
    return null;
  }
}

// FRED series (e.g. US macro). Optional enrichment.
async function fred(seriesId) {
  if (!FRED_API_KEY) return null;
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations`
      + `?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json`
      + `&sort_order=desc&limit=1`;
    const resp = await fetchWithTimeout(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    const obs = data.observations?.[0];
    return obs ? { value: parseFloat(obs.value), date: obs.date } : null;
  } catch (e) {
    console.warn('[FRED] error:', e.message);
    return null;
  }
}

// Fetch the context bundle for one company's geography.
async function fetchContext(countryCode) {
  const [inflation, gdpPerCapita, ppp] = await Promise.all([
    worldBank(countryCode, 'FP.CPI.TOTL.ZG'),   // inflation, annual %
    worldBank(countryCode, 'NY.GDP.PCAP.CD'),   // GDP per capita, USD
    worldBank(countryCode, 'PA.NUS.PPP'),       // PPP conversion factor
  ]);
  return {
    country: countryCode,
    inflation:     inflation?.value ?? null,
    gdp_per_capita: gdpPerCapita?.value ?? null,
    ppp:           ppp?.value ?? null,
    context_available: !!(inflation || gdpPerCapita || ppp),
  };
}

// ── Core: hierarchical shrinkage benchmark ──────────────────────
// expected_sector = (n*sector_mean + k*global_mean) / (n + k)
// Few peers (small n) -> estimate pulled toward global mean (honest).
function shrinkageBenchmarks(rows, k = 2.0) {
  const globalMean = rows.reduce((s, r) => s + r.target_per_unit, 0) / rows.length;
  const sectors = {};
  for (const r of rows) (sectors[r.sector] ||= []).push(r.target_per_unit);

  const expected = {};
  const meta = {};
  for (const [sec, vals] of Object.entries(sectors)) {
    const n = vals.length;
    const secMean = vals.reduce((a, b) => a + b, 0) / n;
    const shrunk = (n * secMean + k * globalMean) / (n + k);
    expected[sec] = shrunk;
    // confidence heuristic: more peers => higher confidence in the benchmark
    meta[sec] = {
      n,
      raw_mean: secMean,
      shrunk_expected: shrunk,
      confidence: n >= 4 ? 'high' : n >= 2 ? 'medium' : 'low',
    };
  }
  return { globalMean, expected, meta };
}

// Normalize a company's impact to a per-capital common unit (impact per $1k).
function normalize(company) {
  const cap = company.capital_k || 1;
  return {
    ...company,
    target_per_unit: (company.reported_target ?? 0) / cap * 1000,
    actual_per_unit: company.actual_result == null ? null : company.actual_result / cap * 1000,
  };
}

// ── Score one company (two-path) ────────────────────────────────
function scoreCompany(normRow, benchmarks) {
  const expected = benchmarks.expected[normRow.sector];
  const secMeta  = benchmarks.meta[normRow.sector];

  // PATCH: Prevent division by zero if benchmark is exactly 0
  const ambition = (expected && expected !== 0) ? normRow.target_per_unit / expected : null;

  // PATH 1 (real) if actual exists; PATH 2 (shadow) if actual missing.
  let path, adjScore, note;
  if (normRow.actual_per_unit != null) {
    path = 'real';
    // PATCH: Prevent division by zero
    adjScore = (expected && expected !== 0) ? normRow.actual_per_unit / expected : null;
    note = 'Scored on real reported actual vs context-adjusted benchmark.';
  } else {
    path = 'shadow';
    // We DO NOT invent an actual. We report only the ambition of the target
    // vs the estimated benchmark, and flag that no actual was available.
    adjScore = null;
    note = 'No actual reported — shadow path: only ambition vs estimated benchmark shown. Actual outcome NOT estimated.';
  }

  return {
    name: normRow.name,
    sector: normRow.sector,
    stage: normRow.stage,
    geo: normRow.geo,
    target_per_unit: round(normRow.target_per_unit),
    actual_per_unit: normRow.actual_per_unit == null ? null : round(normRow.actual_per_unit),
    expected_benchmark: round(expected),
    ambition_multiplier: round(ambition),
    adjusted_score: round(adjScore),
    path,
    benchmark_confidence: secMeta?.confidence ?? 'low',
    low_data_flag: (secMeta?.n ?? 0) < 3,
    note,
  };
}

function round(x) { return x == null ? null : Math.round(x * 1000) / 1000; }

// ── Top-level: score a whole portfolio ──────────────────────────
async function scorePortfolio(companies, { withContext = true, k = 2.0 } = {}) {
  const norm = companies.map(normalize);
  const benchmarks = shrinkageBenchmarks(norm, k);

  // optional: attach real external context per company (World Bank / FRED)
  let contexts = {};
  if (withContext) {
    const uniqueGeos = [...new Set(companies.map(c => c.geo).filter(Boolean))];
    const fetched = await Promise.all(uniqueGeos.map(g => fetchContext(g)));
    uniqueGeos.forEach((g, i) => { contexts[g] = fetched[i]; });
  }

  const scored = norm.map(r => {
    const s = scoreCompany(r, benchmarks);
    s.context = contexts[r.geo] || null;
    return s;
  });

  return {
    methodology: 'ambition-adjusted, hierarchical-shrinkage benchmark (Omid Azadegan)',
    generated_at: new Date().toISOString(),
    global_mean: round(benchmarks.globalMean),
    sector_meta: benchmarks.meta,
    companies: scored,
    honesty_notes: [
      'Estimation applies only to the expected-target benchmark, never to actual outcomes.',
      'Scores are context-adjusted comparisons under stated assumptions, not measurements of real-world impact.',
      'Low-data sectors are flagged; their benchmarks are shrunk toward the global mean.',
    ],
  };
}

export {
  scorePortfolio, scoreCompany, shrinkageBenchmarks, normalize,
  fetchContext, worldBank, fred,
};