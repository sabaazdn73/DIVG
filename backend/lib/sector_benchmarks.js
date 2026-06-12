// ╔══════════════════════════════════════════════════════════════╗
// ║ SECTOR IMPACT BENCHMARKS (backend) — real, GIIN-sourced       ║
// ║ Mirror of frontend/src/lib/sector_benchmarks.ts.             ║
// ║                                                              ║
// ║ Figures are annualized median "pace of change" (%) compared  ║
// ║ to an SDG-aligned threshold — the exact shape of the GIIN    ║
// ║ impact performance benchmarks. Only `source: 'GIIN'` rows    ║
// ║ are published medians; `illustrative` rows are clearly       ║
// ║ flagged and must not be presented as audited GIIN data.      ║
// ╚══════════════════════════════════════════════════════════════╝

const SECTOR_BENCHMARKS = [
  {
    sector: 'energy',
    label: 'Clean energy / energy access',
    kpi: 'Annual reduction in scope 1 & 2 GHG emissions',
    median_pace: 6.1, sdg_threshold: 6.8, n: 270, source: 'GIIN',
    citation: 'GIIN Energy Impact Performance Benchmark, Nov 2023 (median 6.1%, n≈270). IPCC 1.5°C pathway ≈6.8%/yr.',
  },
  {
    sector: 'climate',
    label: 'Climate change mitigation',
    kpi: 'Annual reduction in GHG emissions',
    median_pace: 6.1, sdg_threshold: 7.6, n: 270, source: 'IPCC',
    citation: 'IPCC: GHG must fall ≈7.6%/yr to 2030 for 1.5°C. Peer median proxied from GIIN energy benchmark (6.1%).',
  },
  {
    sector: 'food waste',
    label: 'Food-waste reduction (GHG-linked)',
    kpi: 'Annual reduction in GHG emissions (CO2e)',
    median_pace: 6.1, sdg_threshold: 7.6, n: null, source: 'illustrative',
    citation: 'No dedicated GIIN food-waste benchmark. GHG threshold from IPCC (7.6%/yr); peer median proxied from GIIN energy benchmark (6.1%).',
  },
  {
    sector: 'financial inclusion',
    label: 'Financial inclusion (emerging markets)',
    kpi: 'Annual rise in clients actively using responsible financial services',
    median_pace: 11.0, sdg_threshold: 8.5, n: 2000, source: 'GIIN',
    citation: 'GIIN Financial Inclusion Benchmark, 2022 (n≈2,000, 13 investors). Sub-Saharan Africa median 11.0% vs SDG 1.4 threshold ≈8.5%.',
  },
  {
    sector: 'agriculture',
    label: 'Agriculture / smallholders',
    kpi: 'Change in farmer income / farmers reached',
    median_pace: 8.0, sdg_threshold: 8.0, n: 1200, source: 'illustrative',
    citation: 'GIIN Agriculture Benchmark, 2023 (n≈1,200, 18 funds). Public median behind IRIS+ login; figure illustrative.',
  },
  {
    sector: 'healthcare',
    label: 'Quality healthcare',
    kpi: 'Patients receiving treatment / provided new access',
    median_pace: 9.0, sdg_threshold: 9.0, n: null, source: 'illustrative',
    citation: 'GIIN Healthcare Benchmark exists; public median not released. Figure illustrative.',
  },
];

const DEFAULT_BENCHMARK = {
  sector: 'general',
  label: 'General (no sector benchmark)',
  kpi: 'Annualized impact pace of change',
  median_pace: 8.0, sdg_threshold: 8.0, n: null, source: 'illustrative',
  citation: 'No matching GIIN sector benchmark; illustrative default used.',
};

function benchmarkForSector(sector) {
  if (!sector) return DEFAULT_BENCHMARK;
  const s = String(sector).toLowerCase().trim();
  return (
    SECTOR_BENCHMARKS.find(b => b.sector === s) ||
    SECTOR_BENCHMARKS.find(b => s.includes(b.sector) || b.sector.includes(s)) ||
    DEFAULT_BENCHMARK
  );
}

export { SECTOR_BENCHMARKS, DEFAULT_BENCHMARK, benchmarkForSector };
