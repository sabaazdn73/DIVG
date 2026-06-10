// ╔══════════════════════════════════════════════════════════════╗
// ║ IRIS+ STARTER METRIC SET                                     ║
// ╚══════════════════════════════════════════════════════════════╝

export const IRIS_METRICS = [
  {
    code: 'PI4060',
    name: 'Client Individuals: Total',
    unit: 'individuals',
    themes: ['financial inclusion', 'general', 'health', 'education'],
    desc: 'Total unique individuals who were clients/recipients of the products or services during the reporting period.',
    citation: 'IRIS, 2020. Client Individuals: Total (PI4060). v5.1.',
  },
  {
    code: 'PI9327',
    name: 'Client Individuals: Active',
    unit: 'individuals',
    themes: ['financial inclusion', 'general'],
    desc: 'Unique individuals who actively used the products or services during the reporting period.',
    citation: 'IRIS, 2020. Client Individuals: Active (PI9327). v5.1.',
  },
  {
    code: 'PI2822',
    name: 'Client Individuals: Provided New Access',
    unit: 'individuals',
    themes: ['financial inclusion', 'energy', 'water', 'education', 'health'],
    desc: 'Unique clients who received products/services they were previously unable to access (new access).',
    citation: 'IRIS, 2020. Client Individuals: Provided New Access (PI2822). v5.1.',
  },
  {
    code: 'PI2845',
    name: 'Client Households: Provided New Access',
    unit: 'households',
    themes: ['energy', 'water', 'agriculture'],
    desc: 'Unique households newly able to access products/services (e.g. clean cookstoves, water purification, off-grid energy).',
    citation: 'IRIS, 2020. Client Households: Provided New Access (PI2845). v5.1.',
  },
  {
    code: 'PI2998',
    name: 'Individuals Trained: Total',
    unit: 'individuals',
    themes: ['education', 'agriculture', 'employment'],
    desc: 'Total individuals trained by the organization during the reporting period (excludes own employees).',
    citation: 'IRIS, 2020. Individuals Trained: Total (PI2998). v5.1.',
  },
  {
    code: 'OI4229',
    name: 'Employees Trained',
    unit: 'employees',
    themes: ['employment', 'general'],
    desc: "Number of the organization's own employees trained during the reporting period.",
    citation: 'IRIS, 2020. Employees Trained (OI4229). v5.1.',
  },
  {
    code: 'PI2575',
    name: 'Client Organizations: Provided New Access',
    unit: 'organizations',
    themes: ['financial inclusion', 'agriculture', 'general'],
    desc: 'Unique client organizations/enterprises newly able to access the products or services.',
    citation: 'IRIS, 2020. Client Organizations: Provided New Access (PI2575). v5.1.',
  },
  {
    code: 'OI6613',
    name: 'Greenhouse Gas Emissions Avoided / Reduced',
    unit: 'tCO2e',
    themes: ['energy', 'food waste', 'agriculture', 'climate'],
    desc: 'Tonnes of CO2-equivalent emissions avoided or reduced due to the products/services.',
    citation: 'IRIS+ climate metric — confirm current code/version at iris.thegiin.org.',
  },
];

export function metricsForTheme(theme: string) {
  if (!theme) return IRIS_METRICS;
  const t = theme.toLowerCase();
  return IRIS_METRICS.filter(m => m.themes.some(x => x.includes(t) || t.includes(x)));
}

export function metricByCode(code: string) {
  return IRIS_METRICS.find(m => m.code === code) || null;
}