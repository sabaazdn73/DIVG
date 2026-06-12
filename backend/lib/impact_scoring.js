// ╔══════════════════════════════════════════════════════════════╗
// ║ IMPACT OUTCOME MEASUREMENT — SDG-aligned pace-of-change       ║
// ║ Methodology: Omid Azadegan (MSc, impact measurement)         ║
// ║                                                              ║
// ║ MODEL (matches the real GIIN impact performance benchmarks): ║
// ║  A firm's impact is expressed as an annualized "pace of      ║
// ║  change" (% improvement / year). That pace is compared to:   ║
// ║   • the PEER median pace for its sector (GIIN benchmark), and║
// ║   • the SDG-aligned threshold pace needed to hit the goal.   ║
// ║                                                              ║
// ║  Two scores result:                                          ║
// ║   • ambition_multiplier = firm target pace / peer median     ║
// ║   • adjusted_score      = firm actual pace / peer median     ║
// ║   • sdg_gap             = firm pace / SDG threshold          ║
// ║                                                              ║
// ║ TWO PATHS:                                                    ║
// ║   • REAL   — a realized pace was reported -> adjusted_score. ║
// ║   • SHADOW — no realized pace -> ambition only; the actual   ║
// ║              outcome is NEVER invented.                      ║
// ║                                                              ║
// ║ BENCHMARK SOURCING (see lib/sector_benchmarks.js):           ║
// ║   Peer medians are REAL published GIIN figures where they    ║
// ║   exist (energy, financial inclusion). Sectors without a     ║
// ║   public GIIN median are clearly flagged `illustrative`.     ║
// ║                                                              ║
// ║ BACKWARD COMPATIBILITY:                                       ║
// ║   If a firm provides no pace (only reported_target/capital), ║
// ║   we fall back to the legacy per-$1k normalization so older  ║
// ║   callers keep working. The output fields are unchanged.     ║
// ╚══════════════════════════════════════════════════════════════╝

import { benchmarkForSector } from './sector_benchmarks.js';

const FRED_API_KEY = process.env.FRED_API_KEY || '';

// Fetch with an abort-based timeout so a slow/unresponsive external API
// (World Bank, FRED) can never stall the whole scoring request.
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

async function fetchContext(countryCode) {
  const [inflation, gdpPerCapita, ppp] = await Promise.all([
    worldBank(countryCode, 'FP.CPI.TOTL.ZG'),
    worldBank(countryCode, 'NY.GDP.PCAP.CD'),
    worldBank(countryCode, 'PA.NUS.PPP'),
  ]);
  return {
    country: countryCode,
    inflation:      inflation?.value ?? null,
    gdp_per_capita: gdpPerCapita?.value ?? null,
    ppp:            ppp?.value ?? null,
    context_available: !!(inflation || gdpPerCapita || ppp),
  };
}

function round(x) { return x == null ? null : Math.round(x * 1000) / 1000; }

// ── Derive a firm's annualized pace of change (%) ───────────────
// Preferred: explicit target_pace / actual_pace (%). Backward-compatible
// fallback: derive a pseudo-pace from reported_target/capital so legacy
// callers that send capital_k + reported_target still produce a score.
function deriverPaces(company) {
  let targetPace = company.target_pace ?? company.pace_target ?? null;
  let actualPace = company.actual_pace ?? company.pace_actual ?? null;

  const legacy = targetPace == null && actualPace == null
    && (company.reported_target != null || company.actual_result != null);

  if (legacy) {
    // Legacy mode: map per-$1k intensity onto a comparable pace scale.
    // This keeps old inputs working; flagged in the output as `legacy_mode`.
    const cap = company.capital_k || 1;
    if (company.reported_target != null) {
      targetPace = (company.reported_target / cap) * 1000 / 100; // scale to ~% range
    }
    if (company.actual_result != null) {
      actualPace = (company.actual_result / cap) * 1000 / 100;
    }
  }
  return { targetPace, actualPace, legacy };
}

// ── Score one company against the real sector benchmark ─────────
function scoreCompany(company) {
  const bench = benchmarkForSector(company.sector);
  const { targetPace, actualPace, legacy } = deriverPaces(company);

  const peer = bench.median_pace;     // peer median pace (%)
  const sdg  = bench.sdg_threshold;   // SDG-aligned threshold pace (%)

  const ambition = (peer && targetPace != null) ? targetPace / peer : null;

  let path, adjScore, sdgGap, note;
  if (actualPace != null) {
    path = 'real';
    adjScore = peer ? actualPace / peer : null;
    sdgGap   = sdg  ? actualPace / sdg  : null;
    note = 'Scored on the real reported pace of change vs the sector peer median and SDG threshold.';
  } else {
    path = 'shadow';
    adjScore = null;
    sdgGap   = (sdg && targetPace != null) ? targetPace / sdg : null;
    note = 'No realized pace reported — shadow path: only target ambition vs benchmark is shown. Actual outcome NOT estimated.';
  }

  // confidence comes from the benchmark provenance, not a peer count
  const confidence =
    bench.source === 'GIIN' ? 'high'
    : bench.source === 'IPCC' ? 'medium'
    : 'low';

  return {
    name: company.name,
    sector: company.sector,
    geo: company.geo,
    target_pace: round(targetPace),
    actual_pace: round(actualPace),
    peer_median_pace: peer,
    sdg_threshold_pace: sdg,
    ambition_multiplier: round(ambition),
    adjusted_score: round(adjScore),
    sdg_gap: round(sdgGap),
    path,
    benchmark_confidence: confidence,
    benchmark_source: bench.source,
    benchmark_label: bench.label,
    benchmark_kpi: bench.kpi,
    benchmark_citation: bench.citation,
    illustrative: bench.source === 'illustrative',
    legacy_mode: legacy,
    low_data_flag: bench.source !== 'GIIN',
    note,
  };
}

// ── Top-level: score a whole portfolio ──────────────────────────
async function scorePortfolio(companies, { withContext = true } = {}) {
  let contexts = {};
  if (withContext) {
    const uniqueGeos = [...new Set(companies.map(c => c.geo).filter(Boolean))];
    const fetched = await Promise.all(uniqueGeos.map(g => fetchContext(g)));
    uniqueGeos.forEach((g, i) => { contexts[g] = fetched[i]; });
  }

  const scored = companies.map(c => {
    const s = scoreCompany(c);
    s.context = contexts[c.geo] || null;
    return s;
  });

  return {
    methodology: 'SDG-aligned pace-of-change vs GIIN sector benchmark (Omid Azadegan)',
    generated_at: new Date().toISOString(),
    companies: scored,
    honesty_notes: [
      'Peer medians are real published GIIN figures where available (energy, financial inclusion); other sectors are clearly flagged as illustrative.',
      'A firm\u2019s pace is compared to the peer median and the SDG-aligned threshold — never to an invented actual outcome.',
      'Scores are context-adjusted comparisons under stated assumptions, not measurements of real-world impact.',
    ],
  };
}

export {
  scorePortfolio, scoreCompany, deriverPaces,
  fetchContext, worldBank, fred,
};
