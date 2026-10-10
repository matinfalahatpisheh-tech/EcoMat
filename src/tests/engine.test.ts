/**
 * EcoMat — Automated Quantitative & Data Governance Test Suite (Section 27)
 * Uses explicitly labeled synthetic datasets for isolated mathematical unit tests
 * alongside integration checks on the core database and analytical engines.
 */

import assert from 'node:assert/strict';
import { EcoMatDatabase } from '../server/db';
import {
  analyzeLeadLagRelationship,
  buildMacroScenarios,
  calculateFeaturesForIndicator,
  computeCompositeIndices,
  computePortfolioIntelligence,
  detectMacroRegimes,
  generateForecastForIndicator,
  normalCdfTo100,
  pearsonCorrelation,
  runDataQualityEngine,
  runPointInTimeBacktest,
} from '../shared/analytics';
import {
  generateEvidenceBoundAnalystResponse,
  runAnalystAcceptanceTestSuite,
} from '../shared/aiAnalystEngine';
import { INDICATORS_REGISTRY, SOURCES_REGISTRY } from '../shared/registry';
import {
  DataFrequency,
  IndicatorCategory,
  IndicatorMetadata,
  IndicatorRole,
  ObservationRecord,
  ValidationStatus,
} from '../shared/types';

interface TestCaseResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestCaseResult[] = [];

function runTest(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, passed: true, details: 'OK' });
    console.log(`✅ PASS: ${name}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, details: msg });
    console.error(`❌ FAIL: ${name} -> ${msg}`);
  }
}

// 1. Database initialization
runTest('1. Database Initialization & Normalized Entities', () => {
  const db = new EcoMatDatabase(false);
  const state = db.getState();
  assert.ok(state.sources.length >= 6, 'Expected at least 6 registered official sources');
  assert.ok(state.indicators.length >= 20, 'Expected at least 20 registered indicators');
  assert.ok(state.observations.length >= 400, 'Expected verified historical observations');
  assert.ok(state.releases.length >= 3, 'Expected initial release records');
  assert.ok(state.revisions.length >= 2, 'Expected initial tracked revision records');
});

// 2. Registry integrity
runTest('2. Indicator & Source Registry Integrity', () => {
  const sourceIds = new Set(SOURCES_REGISTRY.map((s) => s.id));
  const codes = new Set<string>();
  for (const ind of INDICATORS_REGISTRY) {
    assert.ok(!codes.has(ind.code), `Duplicate indicator code: ${ind.code}`);
    codes.add(ind.code);
    assert.ok(
      sourceIds.has(ind.sourceId),
      `Indicator ${ind.code} references unknown source ${ind.sourceId}`
    );
    assert.ok(ind.roles.length > 0, `Indicator ${ind.code} must have at least one role`);
  }
});

// 3. Observation insertion & 4. Duplicate detection & 5. Revision handling & 6. Date/Frequency validation
runTest('3-6. Ingestion Validation: Insertion, Duplicates, Revisions, and Date/Frequency Checks', () => {
  const db = new EcoMatDatabase(false);

  const syntheticBatch = [
    // Valid new period
    {
      indicatorCode: 'CPI_HEADLINE',
      period: '2026-11',
      solarPeriod: '۱۴۰۵/۰۸',
      value: 38.8,
      unit: 'PERCENT',
    },
    // Duplicate in same batch (should be quarantined)
    {
      indicatorCode: 'CPI_HEADLINE',
      period: '2026-11',
      solarPeriod: '۱۴۰۵/۰۸',
      value: 39.1,
      unit: 'PERCENT',
    },
    // Revision of existing 2026-10 value (38.4 -> 38.6)
    {
      indicatorCode: 'CPI_HEADLINE',
      period: '2026-10',
      solarPeriod: '۱۴۰۵/۰۷',
      value: 38.6,
      unit: 'PERCENT',
    },
    // Invalid date format
    {
      indicatorCode: 'CPI_HEADLINE',
      period: '1405/08/01',
      value: 35.0,
    },
    // Frequency mismatch: annual period on monthly indicator
    {
      indicatorCode: 'M2_LIQUIDITY',
      period: '2026',
      value: 138000,
    },
    // Negative value on non-negative indicator
    {
      indicatorCode: 'M2_LIQUIDITY',
      period: '2026-11',
      value: -500,
    },
  ];

  const outcome = db.commitManualImport({
    sourceId: 'SCI',
    releaseTitleFa: 'SYNTHETIC_UNIT_TEST_BATCH',
    rawContent: JSON.stringify(syntheticBatch),
    rows: syntheticBatch,
  });

  assert.equal(outcome.validCount, 2, 'Expected 2 valid rows (1 new + 1 revision)');
  assert.equal(outcome.quarantinedRecords.length, 4, 'Expected 4 quarantined rows');
  assert.equal(outcome.revisionsDetected.length, 1, 'Expected 1 revision record created');
  assert.equal(
    outcome.revisionsDetected[0].previousValue,
    38.4,
    'Revision must preserve original value 38.4'
  );
  assert.equal(
    outcome.revisionsDetected[0].revisedValue,
    38.6,
    'Revision must record new value 38.6'
  );
});

// 7. Growth-rate & 8. Inflation calculations (Explicitly labeled synthetic dataset)
runTest('7-8. Growth-Rate, Zero-Rate Boundary & Compounded Inflation Calculations', () => {
  const syntheticLevelMeta: IndicatorMetadata = {
    code: 'SYNTH_LEVEL_TEST',
    nameFa: 'شاخص مصنوعی تست سطح',
    nameEn: 'Synthetic Level Test Series',
    category: IndicatorCategory.MONETARY_AGGREGATES,
    roles: [IndicatorRole.LEADING],
    unit: 'TRILLION_IRR',
    unitFa: 'هزار میلیارد ریال',
    currencyBasis: 'IRR',
    priceBasis: 'NOMINAL',
    frequency: DataFrequency.MONTHLY,
    geographicCoverageFa: 'تست واحد',
    sourceId: 'CBI',
    publicationLagDays: 10,
    definitionFa: 'سری مصنوعی صرفاً جهت تست ریاضی نرخ رشد',
    transformationRules: [],
    validationRules: {
      allowNegative: false,
      minPlausible: 0,
      maxPlausible: 10000,
      maxPeriodJumpPct: 50,
      zScoreOutlierThreshold: 3.0,
    },
    historicalCoverage: 'تست',
    status: 'ACTIVE_VERIFIED',
  };

  // Create 13 monthly points starting at 100 and growing to 125 at month 12 (+25% YoY)
  const synthObs: ObservationRecord[] = Array.from({ length: 13 }, (_, idx) => {
    const monthStr = String(idx === 12 ? 1 : idx + 1).padStart(2, '0');
    const year = idx === 12 ? 2026 : 2025;
    const val = idx === 0 ? 100 : idx === 1 ? 105 : idx === 12 ? 125 : 100 + idx * 2;
    return {
      id: `SYNTH_${idx}`,
      indicatorCode: 'SYNTH_LEVEL_TEST',
      period: `${year}-${monthStr}`,
      solarPeriod: `1404/${monthStr}`,
      value: val,
      unit: 'TRILLION_IRR',
      publicationTimestamp: `${year}-${monthStr}-15T00:00:00Z`,
      retrievalTimestamp: '2026-02-01T00:00:00Z',
      sourceRef: 'UNIT_TEST',
      releaseId: 'REL_TEST',
      validationStatus: ValidationStatus.VALIDATED,
      qualityFlags: [],
      isSynthetic: true,
    };
  });

  const features = calculateFeaturesForIndicator(syntheticLevelMeta, synthObs);
  assert.equal(features[1].momGrowthPct, 5.0, '100 -> 105 must equal +5.0% MoM growth');
  assert.equal(features[12].yoyGrowthPct, 25.0, '100 -> 125 after 12 months must equal +25.0% YoY growth');

  // Test CPI_MOM annualized compounding and zero-rate boundary: 0.0% -> 3.0% monthly => +3.0 pps diff & 42.58% annualized
  const cpiMomMeta = INDICATORS_REGISTRY.find((i) => i.code === 'CPI_MOM')!;
  const cpiMomSynth: ObservationRecord[] = [
    {
      id: 'CPI_MOM_TEST_0',
      indicatorCode: 'CPI_MOM',
      period: '2026-01',
      solarPeriod: '۱۴۰۴/۱۰',
      value: 0.0,
      unit: 'PERCENT',
      publicationTimestamp: '2026-01-05T00:00:00Z',
      retrievalTimestamp: '2026-01-05T00:00:00Z',
      sourceRef: 'UNIT_TEST',
      releaseId: 'REL_TEST',
      validationStatus: ValidationStatus.VALIDATED,
      qualityFlags: [],
      isSynthetic: true,
    },
    {
      id: 'CPI_MOM_TEST_1',
      indicatorCode: 'CPI_MOM',
      period: '2026-02',
      solarPeriod: '۱۴۰۴/۱۱',
      value: 3.0,
      unit: 'PERCENT',
      publicationTimestamp: '2026-02-05T00:00:00Z',
      retrievalTimestamp: '2026-02-05T00:00:00Z',
      sourceRef: 'UNIT_TEST',
      releaseId: 'REL_TEST',
      validationStatus: ValidationStatus.VALIDATED,
      qualityFlags: [],
      isSynthetic: true,
    },
  ];
  const momFeats = calculateFeaturesForIndicator(cpiMomMeta, cpiMomSynth);
  assert.equal(
    momFeats[1].momGrowthPct,
    3.0,
    'Rate indicator moving from 0.0% to 3.0% must record +3.0 percentage point difference'
  );
  assert.equal(
    momFeats[1].annualizedShortGrowthPct,
    42.58,
    '3.0% monthly inflation compounded over 12 months must be 42.58%'
  );
});

// 9. Composite score calculations & 10. Missing-data handling
runTest('9-10. Composite Indices (0-100 Scale) & Insufficient-Data Policy', () => {
  assert.equal(normalCdfTo100(0), 50.0, 'Z=0 must map to 50.0 on 0-100 scale');
  assert.ok(normalCdfTo100(2) > 95, 'Z=+2 must map above 95');
  assert.ok(normalCdfTo100(-2) < 5, 'Z=-2 must map below 5');

  const db = new EcoMatDatabase(false);
  const state = db.getState();
  const indices = computeCompositeIndices(state.indicators, state.observations);
  assert.equal(indices.length, 8, 'Must compute all 8 required composite indices');
  for (const idx of indices) {
    assert.equal(idx.status, 'COMPUTED');
    assert.ok(idx.score !== null && idx.score >= 0 && idx.score <= 100);
    assert.ok(idx.equalWeightScore !== null);
  }

  // Now test missing data policy: pass empty observations -> must return INSUFFICIENT_DATA, never fake numbers
  const emptyIndices = computeCompositeIndices(state.indicators, []);
  for (const idx of emptyIndices) {
    assert.equal(
      idx.status,
      'INSUFFICIENT_DATA',
      `Index ${idx.code} must report INSUFFICIENT_DATA when observations are missing`
    );
    assert.equal(idx.score, null, 'Score must be null when data is insufficient');
  }
});

// 11. Forecast cutoff enforcement, vintage revision rollback & insufficient-sample null reporting
runTest('11-12. Point-in-Time Cutoff, Vintage Revision Rollback, Parameter Isolation & Null Metrics on Small Sample', () => {
  const db = new EcoMatDatabase(false);
  const state = db.getState();

  // A. Cutoff in 2026-04-15 should only see observations published on or before 2026-04-15
  const cutoff2026 = '2026-04-15T00:00:00Z';
  const fcPast = generateForecastForIndicator(
    'CPI_HEADLINE',
    state.indicators,
    state.observations,
    cutoff2026,
    state.revisions
  );
  assert.equal(
    fcPast.originPeriod,
    '2026-03',
    'Forecast with 2026-04-15 cutoff must originate at 2026-03'
  );
  assert.ok(
    (fcPast.backtestMetrics.unpublishedExcludedCount ?? 0) > 0,
    'Must report count of excluded post-cutoff observations'
  );

  // B. Parameter isolation test: mutating future observations after cutoff2026 must have ZERO effect on fcPast
  const mutatedFutureObs = state.observations.map((o) =>
    o.publicationTimestamp > cutoff2026 ? { ...o, value: o.value * 100 } : o
  );
  const fcPastWithMutatedFuture = generateForecastForIndicator(
    'CPI_HEADLINE',
    state.indicators,
    mutatedFutureObs,
    cutoff2026,
    state.revisions
  );
  assert.deepEqual(
    fcPast.horizons,
    fcPastWithMutatedFuture.horizons,
    'Expanding-window parameters must be 100% isolated from post-cutoff observations (zero look-ahead)'
  );
  assert.equal(
    fcPast.backtestMetrics.ar1MAE,
    fcPastWithMutatedFuture.backtestMetrics.ar1MAE,
    'OOS MAE must not depend on any post-cutoff observation'
  );

  // C. Vintage revision rollback test: at 2026-10-06 (before REV_M2_2026_08 detectedAt 2026-10-08), M2 2026-08 must revert to 133450
  const fcM2BeforeRev = generateForecastForIndicator(
    'M2_LIQUIDITY',
    state.indicators,
    state.observations,
    '2026-10-06T00:00:00Z',
    state.revisions
  );
  assert.ok(
    (fcM2BeforeRev.backtestMetrics.revisionsRevertedCount ?? 0) >= 1,
    'Must detect and revert post-cutoff statistical revisions'
  );
  assert.equal(
    fcM2BeforeRev.horizons[0].naiveBaseline,
    133450,
    'M2_LIQUIDITY for 2026-08 at cutoff 2026-10-06 must use pre-revision vintage value 133450 instead of revised 133820'
  );

  // D. Insufficient sample test: early cutoff 2025-07-31 (fewer than 13 observations) must report null metrics, never fake numbers
  const fcSmallSample = generateForecastForIndicator(
    'CPI_HEADLINE',
    state.indicators,
    state.observations,
    '2025-07-31T23:59:59Z',
    state.revisions
  );
  assert.equal(
    fcSmallSample.backtestMetrics.evaluationStatus,
    'INSUFFICIENT_SAMPLE',
    'Small sample must report INSUFFICIENT_SAMPLE'
  );
  assert.equal(
    fcSmallSample.backtestMetrics.ar1MAE,
    null,
    'ar1MAE must be null when OOS sample is insufficient'
  );
  assert.equal(
    fcSmallSample.backtestMetrics.directionalAccuracyPct,
    null,
    'directionalAccuracyPct must be null when OOS sample is insufficient'
  );

  // E. Full-sample OOS validation metrics (Theil's U, sMAPE, CRPS, Coverage, Newey-West HAC DM)
  const fcFull = generateForecastForIndicator(
    'CPI_HEADLINE',
    state.indicators,
    state.observations,
    '2026-10-31T23:59:59Z',
    state.revisions
  );
  assert.equal(fcFull.backtestMetrics.evaluationStatus, 'VALIDATED_OOS');
  assert.ok((fcFull.backtestMetrics.effectiveNonOverlappingCount ?? 0) >= 3);
  assert.ok(fcFull.backtestMetrics.theilsU !== null && fcFull.backtestMetrics.theilsU > 0);
  assert.ok(fcFull.backtestMetrics.crpsApprox !== null && fcFull.backtestMetrics.crpsApprox > 0);
  assert.ok(fcFull.backtestMetrics.empiricalCoverage80Pct !== null);
  assert.ok(fcFull.backtestMetrics.dieboldMarianoHacStat !== null);

  // F. Backtest must actively filter out unpublished lagged series AND post-decision revisions
  const bt = runPointInTimeBacktest(
    state.indicators,
    state.observations,
    1.0,
    state.revisions
  );
  assert.ok(
    bt.lookAheadPreventedCount > 0,
    'Backtest must detect and prevent look-ahead bias on lagged indicators'
  );
  assert.ok(
    (bt.revisionsPreventedCount ?? 0) > 0,
    'Backtest must revert post-decision statistical revisions'
  );
  assert.ok(
    bt.metrics.buyAndHoldGoldRealPct !== undefined &&
      bt.metrics.buyAndHoldAkhzaRealPct !== undefined,
    'Backtest must compute passive Buy-and-Hold benchmarks'
  );
  assert.equal(bt.pointInTimeDecisions.length, 6);
});

// 13. Portfolio return calculations & Scenario probability sum
runTest('13. Portfolio Nominal vs. Real Returns & Scenario Probability Axioms', () => {
  const db = new EcoMatDatabase(false);
  const state = db.getState();
  const portfolio = computePortfolioIntelligence(state.indicators, state.observations);

  assert.equal(portfolio.assets.length, 6, 'Must evaluate 6 core Iranian asset classes');
  for (const a of portfolio.assets) {
    assert.ok(
      a.realReturn12MPct < a.nominalReturn12MPct,
      `With positive inflation, real return (${a.realReturn12MPct}%) must be lower than nominal return (${a.nominalReturn12MPct}%) for ${a.asset.id}`
    );
  }

  const scenarios = buildMacroScenarios(state.indicators, state.observations);
  const probSum = scenarios.reduce((acc, s) => acc + s.probabilityPct, 0);
  assert.equal(probSum, 100, 'Mutually exclusive scenario probabilities must sum to 100%');
  for (const s of scenarios) {
    assert.equal(s.isEmpiricalProbability, false, 'Scenario weights must be explicitly flagged as non-empirical subjective priors');
    assert.ok(s.internalConsistencyCheckFa && s.internalConsistencyCheckFa.length > 20, 'Each scenario must document macroeconomic internal consistency');
  }
});

// 14. Statistical Lead/Lag, Analytical OLS Granger & Null-Safe Regimes
runTest('14. Lead/Lag Analytical OLS Granger & Null-Safe Regime Detection', () => {
  assert.equal(pearsonCorrelation([1, 2, 3, 4], [2, 4, 6, 8]), 1.0);
  const db = new EcoMatDatabase(false);
  const state = db.getState();
  const ll = analyzeLeadLagRelationship(
    'PPI_HEADLINE',
    'CPI_HEADLINE',
    state.indicators,
    state.observations
  );
  assert.ok(ll.sampleSize >= 20);
  assert.ok(ll.lagProfile.length === 13);
  assert.ok(ll.grangerFStat >= 0, 'OLS Granger F-statistic must be non-negative');

  // Empty observations must never falsely trigger Disinflation regime
  const emptyRegimes = detectMacroRegimes(state.indicators, []);
  for (const reg of emptyRegimes) {
    assert.equal(
      reg.isActive,
      false,
      `Regime ${reg.id} must be inactive when observations are missing`
    );
    assert.ok(
      reg.activationScore <= 68,
      `Inactive regime ${reg.id} score must be capped at 68`
    );
  }

  const issues = runDataQualityEngine(
    state.indicators,
    state.observations,
    state.revisions
  );
  assert.ok(issues.length >= 4, 'Quality engine must surface revisions, outliers, and awaiting imports');
});

// 15. Evidence-Bound AI Analyst & 7 Mandatory Acceptance Test Scenarios
runTest('15. Evidence-Bound AI Analyst & 7 Mandatory Acceptance Test Scenarios', () => {
  const db = new EcoMatDatabase(false);
  const snapshot = db.getFullAnalyticalSnapshot();

  // Construct deterministic live market fixture for acceptance tests
  const mockLive = {
    fetchedAtIso: '2026-10-10T09:00:00.000Z',
    isLiveConnectionActive: true,
    liveSourcesUsed: ['TSETMC', 'NOBITEX'],
    summaryIndicators: {
      dollarFreeToman: 151550,
      tetherUsdtToman: 151820,
      dirhamUaeToman: 41280,
      dirhamImpliedDollarToman: 151600,
      dollarTetherSpreadPct: 0.18,
      dollarDirhamSpreadPct: -0.03,
      gold18kGramToman: 9162000,
      gold18kIntrinsicToman: 9155000,
      gold18kBubblePct: 0.08,
      mithqalToman: 39688000,
      coinEmamiToman: 261500000,
      coinEmamiIntrinsicToman: 216800000,
      coinEmamiBubblePct: 20.62,
      coinHalfToman: 145000000,
      coinHalfBubblePct: 33.7,
      coinQuarterToman: 95000000,
      coinQuarterBubblePct: 75.2,
      globalOunceUsd: 3792.4,
      paxgIrrToman: 575500000,
      tedpixIndex: 2920000,
      brentOilUsd: 78.5,
      tehranHousingSqmToman: 138500000,
      tehranHousingSqmUsd: 914,
      housingPerGoldGramRatio: 15.12,
    },
    quotes: [],
    topOpportunities: [],
    stockOpportunities: [],
    sectorOutlooks: [],
  };

  const bundle = {
    ...snapshot,
    liveMarket: mockLive,
  };

  const suiteResults = runAnalystAcceptanceTestSuite(bundle);
  assert.equal(
    suiteResults.length,
    7,
    'Must execute all 7 mandatory acceptance test scenarios'
  );

  for (const sc of suiteResults) {
    assert.equal(
      sc.passed,
      true,
      `Acceptance scenario ${sc.scenarioId} (${sc.titleFa}) failed: ${sc.actualBehaviorSummaryFa}`
    );
    assert.equal(sc.verdictCode, 'PASS_BOUNDARY_ENFORCED');
  }

  // Verify semantic separation is populated
  const sampleRes = generateEvidenceBoundAnalystResponse(bundle, {
    questionFa: 'وضعیت تورم و ارزش ذاتی طلا چگونه است؟',
  });
  assert.ok(sampleRes.semanticSeparation.marketPricesAndFacts.length > 0);
  assert.ok(sampleRes.semanticSeparation.intrinsicEstimates.length > 0);
  assert.ok(sampleRes.semanticSeparation.statisticalForecasts.length > 0);
  assert.ok(sampleRes.semanticSeparation.scenarioAssumptions.length > 0);
  assert.equal(sampleRes.independentVerification.passedIndependentAudit, true);
  assert.equal(
    sampleRes.independentVerification.ungroundedNumbersDetected.length,
    0
  );
});

const failed = results.filter((r) => !r.passed);
console.log(`\n========================================`);
console.log(`EcoMat Test Suite Summary: ${results.length - failed.length}/${results.length} Passed`);
console.log(`========================================\n`);

if (failed.length > 0) {
  process.exit(1);
}

