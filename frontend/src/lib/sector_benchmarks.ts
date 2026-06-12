// ╔══════════════════════════════════════════════════════════════╗
// ║ SECTOR IMPACT BENCHMARKS — real, sourced where published      ║
// ║                                                              ║
// ║ The GIIN's impact performance benchmarks express performance ║
// ║ as a "pace of change" (annualized % improvement) compared to ║
// ║ the pace needed to hit an SDG-aligned threshold by 2030.     ║
// ║ We use that exact shape here, with the published medians.     ║
// ║                                                              ║
// ║ HONESTY: only `source: 'GIIN'` rows are published figures.   ║
// ║ Rows marked `source: 'illustrative'` have NO public GIIN      ║
// ║ median (the figure lives behind the IRIS+ login) — they are  ║
// ║ clearly labelled as illustrative and must not be presented   ║
// ║ as audited GIIN data.                                        ║
// ╚══════════════════════════════════════════════════════════════╝

export type BenchmarkSource = 'GIIN' | 'IPCC' | 'illustrative';

export interface SectorBenchmark {
  sector: string;              // matches the user-entered sector / IRIS+ theme
  label: string;               // human label for the UI
  kpi: string;                 // what the % refers to
  median_pace: number;         // annualized median % change (peer benchmark)
  sdg_threshold: number;       // annualized % change needed to hit the SDG target
  n: number | null;            // sample size behind the benchmark, if published
  source: BenchmarkSource;     // provenance
  citation: string;            // exact, checkable source
  note?: string;               // extra honesty context
}

// All figures below are annualized median "pace of change" (%), matched to the
// SDG-aligned threshold each benchmark is measured against.
export const SECTOR_BENCHMARKS: SectorBenchmark[] = [
  {
    sector: 'energy',
    label: 'Clean energy / energy access',
    kpi: 'Annual reduction in scope 1 & 2 GHG emissions',
    median_pace: 6.1,
    sdg_threshold: 6.8,
    n: 270,
    source: 'GIIN',
    citation: 'GIIN Energy Impact Performance Benchmark, Nov 2023 (median 6.1%, n≈270). IPCC 1.5°C pathway requires ≈6.8%/yr.',
    note: 'Energy receives the largest share of impact capital; benchmark built by GIIN Impact Lab + a 20-member design team.',
  },
  {
    sector: 'climate',
    label: 'Climate change mitigation',
    kpi: 'Annual reduction in GHG emissions',
    median_pace: 6.1,
    sdg_threshold: 7.6,
    n: 270,
    source: 'IPCC',
    citation: 'IPCC: global GHG must fall ≈7.6%/yr to 2030 for 1.5°C. Peer median uses the GIIN energy benchmark (6.1%) as the closest published proxy.',
    note: 'Threshold is the IPCC 7.6%/yr figure; peer median proxied from the energy benchmark.',
  },
  {
    sector: 'food waste',
    label: 'Food-waste reduction (GHG-linked)',
    kpi: 'Annual reduction in GHG emissions (CO2e)',
    median_pace: 6.1,
    sdg_threshold: 7.6,
    n: null,
    source: 'illustrative',
    citation: 'No dedicated GIIN food-waste benchmark. GHG threshold from IPCC (7.6%/yr); peer median proxied from the GIIN energy benchmark (6.1%).',
    note: 'Illustrative: food waste is not a standalone GIIN benchmark sector. Treated under climate/GHG.',
  },
  {
    sector: 'financial inclusion',
    label: 'Financial inclusion (emerging markets)',
    kpi: 'Annual rise in clients actively using responsible financial services',
    median_pace: 11.0,
    sdg_threshold: 8.5,
    n: 2000,
    source: 'GIIN',
    citation: 'GIIN Financial Inclusion Benchmark, 2022 (n≈2,000 investments, 13 investors). Sub-Saharan Africa median pace 11.0% vs SDG 1.4 threshold ≈8.5%.',
    note: 'Regional medians: South Asia 16.0% (thr 4.2%), SE Asia 10.0% (thr 8.6%), Sub-Saharan Africa 11.0% (thr 8.5%). We use the SSA figures as the default.',
  },
  {
    sector: 'agriculture',
    label: 'Agriculture / smallholders',
    kpi: 'Change in farmer income / farmers reached',
    median_pace: 8.0,
    sdg_threshold: 8.0,
    n: 1200,
    source: 'illustrative',
    citation: 'GIIN Agriculture Benchmark, 2023 (n≈1,200 investments, 18 funds, 7 KPIs). Exact medians are behind the IRIS+ login; figure here is illustrative.',
    note: 'Illustrative pace: the GIIN agriculture benchmark exists but does not publish a single public median. Replace with the IRIS+ figure when available.',
  },
  {
    sector: 'healthcare',
    label: 'Quality healthcare',
    kpi: 'Patients receiving treatment / provided new access',
    median_pace: 9.0,
    sdg_threshold: 9.0,
    n: null,
    source: 'illustrative',
    citation: 'GIIN Healthcare Benchmark exists (KPIs: patients treated, new access, decent jobs). Public median not released; figure here is illustrative.',
    note: 'Illustrative: replace with the IRIS+ healthcare median when accessible.',
  },
];

// Default fallback when a sector has no benchmark row at all.
export const DEFAULT_BENCHMARK: SectorBenchmark = {
  sector: 'general',
  label: 'General (no sector benchmark)',
  kpi: 'Annualized impact pace of change',
  median_pace: 8.0,
  sdg_threshold: 8.0,
  n: null,
  source: 'illustrative',
  citation: 'No matching GIIN sector benchmark; illustrative default used.',
  note: 'Illustrative default. For a real comparison, pick a sector with a published GIIN benchmark (energy or financial inclusion).',
};

export function benchmarkForSector(sector: string): SectorBenchmark {
  if (!sector) return DEFAULT_BENCHMARK;
  const s = sector.toLowerCase().trim();
  return (
    SECTOR_BENCHMARKS.find(b => b.sector === s) ||
    SECTOR_BENCHMARKS.find(b => s.includes(b.sector) || b.sector.includes(s)) ||
    DEFAULT_BENCHMARK
  );
}
