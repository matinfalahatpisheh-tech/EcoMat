/**
 * EcoMat — Core Domain Types, Operational Telemetry & Data Governance Contracts
 * Compatible with Node 22 native TypeScript strip-types mode for production execution.
 */

export const IndicatorCategory = {
  INFLATION_PRICES: 'INFLATION_PRICES',
  MONETARY_AGGREGATES: 'MONETARY_AGGREGATES',
  BANKING_CREDIT: 'BANKING_CREDIT',
  INTEREST_RATES: 'INTEREST_RATES',
  GOVERNMENT_BUDGET: 'GOVERNMENT_BUDGET',
  PUBLIC_DEBT: 'PUBLIC_DEBT',
  OIL_ENERGY: 'OIL_ENERGY',
  INTERNATIONAL_TRADE: 'INTERNATIONAL_TRADE',
  EXCHANGE_RATES: 'EXCHANGE_RATES',
  FOREIGN_RESERVES: 'FOREIGN_RESERVES',
  GDP_NATIONAL_ACCOUNTS: 'GDP_NATIONAL_ACCOUNTS',
  INDUSTRIAL_PRODUCTION: 'INDUSTRIAL_PRODUCTION',
  LABOR_EMPLOYMENT: 'LABOR_EMPLOYMENT',
  WAGES_INCOME: 'WAGES_INCOME',
  HOUSING_RENTS: 'HOUSING_RENTS',
  AGRICULTURE: 'AGRICULTURE',
  TRANSPORTATION: 'TRANSPORTATION',
  DEMOGRAPHICS: 'DEMOGRAPHICS',
  EQUITY_MARKETS: 'EQUITY_MARKETS',
  FIXED_INCOME: 'FIXED_INCOME',
  GOLD_COMMODITIES: 'GOLD_COMMODITIES',
  EXTERNAL_CONDITIONS: 'EXTERNAL_CONDITIONS',
} as const;
export type IndicatorCategory =
  (typeof IndicatorCategory)[keyof typeof IndicatorCategory];

export const IndicatorRole = {
  LEADING: 'LEADING',
  COINCIDENT: 'COINCIDENT',
  LAGGING: 'LAGGING',
  POLICY_VARIABLE: 'POLICY_VARIABLE',
  MARKET_VARIABLE: 'MARKET_VARIABLE',
  OUTCOME_VARIABLE: 'OUTCOME_VARIABLE',
} as const;
export type IndicatorRole = (typeof IndicatorRole)[keyof typeof IndicatorRole];

export const DataFrequency = {
  DAILY: 'DAILY',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  ANNUAL: 'ANNUAL',
} as const;
export type DataFrequency = (typeof DataFrequency)[keyof typeof DataFrequency];

export const SourceStatus = {
  CURRENT: 'CURRENT',
  STALE: 'STALE',
  AWAITING_MANUAL_IMPORT: 'AWAITING_MANUAL_IMPORT',
  UNAVAILABLE: 'UNAVAILABLE',
} as const;
export type SourceStatus = (typeof SourceStatus)[keyof typeof SourceStatus];

export const ValidationStatus = {
  VALIDATED: 'VALIDATED',
  WARNING_OUTLIER: 'WARNING_OUTLIER',
  WARNING_STRUCTURAL_BREAK: 'WARNING_STRUCTURAL_BREAK',
  REVISED: 'REVISED',
  QUARANTINED: 'QUARANTINED',
} as const;
export type ValidationStatus =
  (typeof ValidationStatus)[keyof typeof ValidationStatus];

export const StatementEpistemicType = {
  OBSERVED_FACT: 'OBSERVED_FACT',
  CALCULATED_INDICATOR: 'CALCULATED_INDICATOR',
  STATISTICAL_RELATIONSHIP: 'STATISTICAL_RELATIONSHIP',
  MODEL_FORECAST: 'MODEL_FORECAST',
  ANALYST_INTERPRETATION: 'ANALYST_INTERPRETATION',
  HYPOTHETICAL_SCENARIO: 'HYPOTHETICAL_SCENARIO',
} as const;
export type StatementEpistemicType =
  (typeof StatementEpistemicType)[keyof typeof StatementEpistemicType];

export type OperationalCapabilityStatus =
  | 'ACTIVE'
  | 'DEGRADED'
  | 'NOT_CONNECTED'
  | 'AWAITING_IMPORT'
  | 'INSUFFICIENT_DATA';

export interface SourceRecord {
  id: string;
  nameFa: string;
  nameEn: string;
  url: string;
  sourceType: 'PRIMARY_DOMESTIC' | 'MARKET_EXCHANGE' | 'INTERNATIONAL_OFFICIAL';
  retrievalMethod: 'PUBLIC_API' | 'MANUAL_OFFICIAL_EXPORT';
  supportedIndicators: string[];
  lastSuccessfulRetrieval: string | null;
  lastAttemptedRetrieval: string | null;
  updateFrequencyFa: string;
  status: SourceStatus;
  limitationsFa: string;
  reliabilityNotesFa: string;
  // Stage 2 & 5 extended operational fields
  operationalState?: OperationalCapabilityStatus;
  dataNatureFa?: string;
  expectedLagDays?: number;
  requiresCredentialsFa?: string;
  termsComplianceFa?: string;
}

export interface ValidationRuleConfig {
  allowNegative: boolean;
  minPlausible: number;
  maxPlausible: number;
  maxPeriodJumpPct: number;
  zScoreOutlierThreshold: number;
}

export interface IndicatorMetadata {
  code: string;
  nameFa: string;
  nameEn: string;
  category: IndicatorCategory;
  roles: IndicatorRole[];
  unit: string;
  unitFa: string;
  currencyBasis:
    | 'IRR'
    | 'IRT'
    | 'USD'
    | 'INDEX'
    | 'PERCENT'
    | 'COUNT'
    | 'BARREL_DAY';
  priceBasis: 'NOMINAL' | 'REAL' | 'RATE';
  frequency: DataFrequency;
  geographicCoverageFa: string;
  sourceId: string;
  publicationLagDays: number;
  definitionFa: string;
  transformationRules: string[];
  validationRules: ValidationRuleConfig;
  historicalCoverage: string;
  status:
    | 'ACTIVE_VERIFIED'
    | 'LIVE_API_SUPPORTED'
    | 'AWAITING_IMPORT'
    | 'PLANNED_METADATA';
}

export interface ObservationRecord {
  id: string;
  indicatorCode: string;
  period: string;
  solarPeriod: string;
  value: number;
  normalizedValueToman?: number;
  unit: string;
  publicationTimestamp: string;
  retrievalTimestamp: string;
  sourceRef: string;
  releaseId: string;
  validationStatus: ValidationStatus;
  qualityFlags: string[];
  isSynthetic: boolean;
}

export interface ReleaseRecord {
  id: string;
  sourceId: string;
  titleFa: string;
  publicationDate: string;
  importedAt: string;
  importMethod:
    | 'SEED_VERIFIED_BULLETIN'
    | 'MANUAL_CSV_JSON'
    | 'LIVE_WORLD_BANK_API';
  recordCount: number;
  checksum: string;
}

export interface RevisionRecord {
  id: string;
  indicatorCode: string;
  period: string;
  solarPeriod: string;
  previousValue: number;
  revisedValue: number;
  previousReleaseId: string;
  newReleaseId: string;
  detectedAt: string;
  reasonFa: string;
}

export interface DerivedFeaturePoint {
  indicatorCode: string;
  period: string;
  solarPeriod: string;
  rawValue: number;
  momGrowthPct: number | null;
  qoqGrowthPct: number | null;
  yoyGrowthPct: number | null;
  annualizedShortGrowthPct: number | null;
  rolling3PeriodAvg: number | null;
  rolling12PeriodAvg: number | null;
  rollingVolatility: number | null;
  historicalPercentile: number | null;
  zScore: number | null;
  momentumAcceleration: number | null;
  formula: string;
  modelVersion: string;
  calculatedAt: string;
}

export interface QualityIssue {
  id: string;
  indicatorCode: string;
  period: string;
  solarPeriod: string;
  issueType:
    | 'MISSING_VALUE'
    | 'DUPLICATE_RECORD'
    | 'INVALID_DATE'
    | 'FREQUENCY_MISMATCH'
    | 'INVALID_UNIT'
    | 'UNEXPECTED_SIGN'
    | 'EXTREME_OUTLIER'
    | 'STRUCTURAL_BREAK'
    | 'SOURCE_REVISION'
    | 'STALE_OBSERVATION'
    | 'IMPLAUSIBLE_JUMP';
  severity: 'HIGH' | 'MEDIUM' | 'INFO';
  observedValue: number | string;
  descriptionFa: string;
  remediationStatus:
    | 'RETAINED_VERIFIED_EVENT'
    | 'QUARANTINED'
    | 'REVISED_TRACKED'
    | 'AWAITING_UPDATE';
  detectedAt: string;
}

export interface EngineAnalyticalOutput {
  engineId: string;
  titleFa: string;
  titleEn: string;
  summaryFactFa: string;
  interpretationFa: string;
  epistemicType: StatementEpistemicType;
  primaryMetrics: {
    labelFa: string;
    indicatorCode: string;
    value: number | null;
    unitFa: string;
    changeFromPrev: number | null;
    historicalPercentile: number | null;
    observationPeriod: string;
    solarPeriod: string;
    publicationDate: string;
    sourceId: string;
    formula: string;
  }[];
  uncertaintyNotesFa: string;
  limitationsFa: string;
  modelVersion: string;
  calculatedAt: string;
}

export interface CompositeIndexResult {
  code: string;
  nameFa: string;
  nameEn: string;
  score: number | null;
  equalWeightScore: number | null;
  status: 'COMPUTED' | 'INSUFFICIENT_DATA';
  directionOfRisk: 'HIGHER_IS_HIGHER_RISK' | 'HIGHER_IS_STRONGER_GROWTH';
  interpretationFa: string;
  economicPurposeFa: string;
  coverageRatio: number;
  minCoverageRequired: number;
  updateFrequencyFa: string;
  transformationMethodFa: string;
  weightingMethodFa: string;
  missingDataPolicyFa: string;
  historicalValidationFa: string;
  limitationsFa: string;
  inputs: {
    indicatorCode: string;
    nameFa: string;
    weight: number;
    latestValue: number | null;
    zScore: number | null;
    normalizedSubScore: number | null;
    solarPeriod: string;
    available: boolean;
  }[];
  updatedAt: string;
}

export interface LeadLagRelationshipResult {
  indicatorX: string;
  indicatorXNameFa: string;
  indicatorY: string;
  indicatorYNameFa: string;
  frequency: DataFrequency;
  sampleSize: number;
  dateRangeSolar: string;
  contemporaneousCorrelation: number;
  optimalLagMonths: number;
  maxLagCorrelation: number;
  pValueApprox: number;
  bonferroniThreshold: number;
  statisticallySignificantAfterCorrection: boolean;
  grangerFStat: number;
  outOfSampleR2: number;
  inSampleR2: number;
  stationarityTransformation: 'YOY_GROWTH' | 'FIRST_DIFFERENCE' | 'LEVEL';
  lagProfile: { lag: number; correlation: number; sampleSize: number }[];
  rollingCorrelations: {
    period: string;
    solarPeriod: string;
    correlation: number;
  }[];
  hypothesisNoteFa: string;
  causalDisclaimerFa: string;
}

export interface RegimeClassification {
  id: string;
  nameFa: string;
  nameEn: string;
  isActive: boolean;
  activationScore: number;
  thresholdTypeFa?: string;
  dataLatencyDays?: number;
  supportingIndicators: {
    indicatorCode: string;
    nameFa: string;
    currentValue: string;
    thresholdRuleFa: string;
    thresholdNature?: 'POLICY_ANALYTICAL' | 'EMPIRICAL_STATISTICAL';
    pointInTimeZScore?: number | null;
    matched: boolean;
  }[];
  classificationRuleFa: string;
  historicalAnaloguesFa: string[];
  uncertaintyFa: string;
  lastChangeSolarPeriod: string;
  invalidationConditionsFa: string;
}

export interface ForecastOutput {
  targetIndicatorCode: string;
  targetNameFa: string;
  unitFa: string;
  originPeriod: string;
  originSolarPeriod: string;
  cutoffTimestamp: string;
  modelVersion: string;
  horizons: {
    horizonMonths: 3 | 6 | 12;
    targetSolarPeriod: string;
    ar1Estimate: number;
    naiveBaseline: number;
    historicalMeanBaseline: number;
    laggedMacroModelEstimate: number;
    interval80Low: number;
    interval80High: number;
    interval95Low: number;
    interval95High: number;
  }[];
  backtestMetrics: {
    evaluationStatus?: 'VALIDATED_OOS' | 'INSUFFICIENT_SAMPLE';
    sampleCount: number;
    effectiveNonOverlappingCount?: number;
    evalHorizonMonths?: number;
    minTrainingWindowMonths?: number;
    evalStartSolarPeriod?: string | null;
    evalEndSolarPeriod?: string | null;
    unpublishedExcludedCount?: number;
    revisionsRevertedCount?: number;
    ar1MAE: number | null;
    naiveMAE: number | null;
    macroModelMAE?: number | null;
    historicalMeanMAE?: number | null;
    ar1RMSE: number | null;
    naiveRMSE: number | null;
    macroModelRMSE?: number | null;
    nonOverlappingAr1MAE?: number | null;
    nonOverlappingNaiveMAE?: number | null;
    smapePct?: number | null;
    theilsU?: number | null;
    directionalAccuracyPct: number | null;
    empiricalCoverage80Pct?: number | null;
    empiricalCoverage95Pct?: number | null;
    crpsApprox?: number | null;
    dieboldMarianoHacStat?: number | null;
    dieboldMarianoPValue?: number | null;
  };
  assumptionsFa: string[];
  limitationsFa: string[];
}

export interface ScenarioDefinition {
  id: 'BASE' | 'UPSIDE' | 'DOWNSIDE' | 'SEVERE_STRESS';
  nameFa: string;
  nameEn: string;
  probabilityPct: number;
  probabilityTypeFa: string;
  isEmpiricalProbability?: boolean;
  internalConsistencyCheckFa?: string;
  assumptionsFa: string[];
  supportingObservationsFa: string[];
  triggersFa: string[];
  invalidationConditionsFa: string[];
  macroProjections12M: {
    cpiYoYPct: string;
    m2YoYPct: string;
    realGdpPct: string;
    fxPressureIndex: string;
  };
  assetClassImplications: {
    assetId: string;
    assetNameFa: string;
    stance: 'OVERWEIGHT' | 'NEUTRAL' | 'UNDERWEIGHT';
    expectedRealReturnRangeFa: string;
    rationaleFa: string;
  }[];
}

export interface AssetClassMetadata {
  id: string;
  nameFa: string;
  nameEn: string;
  proxyIndicatorCode: string;
  instrumentTypeFa: string;
  liquidityHorizonFa: string;
  continuousTradability: boolean;
  transactionCostBps: number;
  bidAskSpreadBps: number;
  storageOrCarryCostAnnualPct: number;
  taxAndLegalConstraintsFa: string;
  descriptionFa: string;
}

export interface AssetPerformanceSummary {
  asset: AssetClassMetadata;
  latestSolarPeriod: string;
  nominalReturn12MPct: number;
  realReturn12MPct: number;
  annualizedVolatilityPct: number;
  maxDrawdownNominalPct: number;
  maxDrawdownRealPct: number;
  sharpeRealApprox: number;
  historicalSeries: {
    period: string;
    solarPeriod: string;
    nominalIndex: number;
    realIndex: number;
    drawdownRealPct: number;
  }[];
}

export interface PortfolioAllocationRecommendation {
  riskProfile: 'CONSERVATIVE' | 'BALANCED' | 'INFLATION_HEDGE';
  profileNameFa: string;
  allocations: {
    assetId: string;
    assetNameFa: string;
    minWeightPct: number;
    targetWeightPct: number;
    maxWeightPct: number;
    whyIncludedFa: string;
    supportingConditionsFa: string;
    underminingRisksFa: string;
    invalidationTriggerFa: string;
  }[];
  expectedPortfolioRealReturnRangeFa: string;
  expectedTurnoverCostPct: number;
  sensitivityNoteFa: string;
}

export interface BacktestSimulationResult {
  id: string;
  strategyNameFa: string;
  benchmarkNameFa: string;
  startSolarPeriod: string;
  endSolarPeriod: string;
  decisionCount: number;
  lookAheadPreventedCount: number;
  revisionsPreventedCount?: number;
  transactionCostAssumptionPct: number;
  metrics: {
    strategyCumulativeNominalPct: number;
    strategyCumulativeRealPct: number;
    benchmarkCumulativeRealPct: number;
    buyAndHoldGoldRealPct?: number;
    buyAndHoldAkhzaRealPct?: number;
    buyAndHoldTedpixRealPct?: number;
    strategyAnnualizedVolatilityPct: number;
    benchmarkAnnualizedVolatilityPct?: number;
    strategyRealSharpe?: number;
    benchmarkRealSharpe?: number;
    informationRatio?: number;
    excessReturnTStat?: number;
    excessReturnPValue?: number;
    strategyMaxDrawdownRealPct: number;
    benchmarkMaxDrawdownRealPct: number;
    totalTurnoverPct: number;
    totalTransactionCostDragPct: number;
    outOfSampleHitRatePct: number;
  };
  pointInTimeDecisions: {
    decisionDateIso: string;
    solarPeriod: string;
    availableCpiYoYAtDecision: number;
    availableM2YoYAtDecision: number;
    availableAkhzaYtmAtDecision?: number;
    revisionsRevertedAtDecision?: number;
    detectedRegimeFa: string;
    signalGeneratedFa: string;
    weightsApplied: Record<string, number>;
    subsequent3MRealReturnPct: number;
    benchmark3MRealReturnPct: number;
  }[];
  limitationsFa: string[];
}

export interface CalendarEvent {
  id: string;
  titleFa: string;
  categoryFa: string;
  expectedDateSolar: string;
  expectedDateIso: string;
  actualDateSolar: string | null;
  isEstimatedSchedule: boolean;
  sourceId: string;
  importance: 'HIGH' | 'MEDIUM' | 'STANDARD';
  relatedIndicators: string[];
  evidenceUrl: string;
  notesFa: string;
}

export interface PipelineRunRecord {
  id: string;
  startedAt: string;
  completedAt: string;
  triggerType:
    | 'SYSTEM_INIT'
    | 'MANUAL_UPLOAD'
    | 'WORLD_BANK_SYNC'
    | 'QUALITY_RECOMPUTE'
    | 'BACKUP_RESTORE';
  sourceId: string;
  status: 'SUCCESS' | 'PARTIAL_QUARANTINE' | 'FAILED';
  recordsDiscovered: number;
  recordsValidated: number;
  recordsQuarantined: number;
  revisionsDetected: number;
  stepsCompleted: string[];
  logSummaryFa: string;
}

export interface AuditEventRecord {
  id: string;
  timestamp: string;
  actionType: string;
  actor: string;
  detailsFa: string;
  metadataJson: string;
}

export interface BackupMetadataRecord {
  id: string;
  filename: string;
  createdAt: string;
  sizeBytes: number;
  observationsCount: number;
  revisionsCount: number;
  checksum: string;
}

export interface SourceLiveDiagnostics {
  sourceId: string;
  nameFa: string;
  nameEn: string;
  url: string;
  operationalState: OperationalCapabilityStatus;
  isLiveAutomatedConnection: boolean;
  retrievalMethodFa: string;
  dataNatureFa: string;
  lastSuccessfulRetrieval: string | null;
  lastAttemptedRetrieval: string | null;
  latestObservationPeriod: string | null;
  latestObservationSolar: string | null;
  publicationLagDays: number;
  expectedFrequencyFa: string;
  requiresCredentialsFa: string;
  termsComplianceFa: string;
  structureValidated: boolean;
  activeIndicatorCount: number;
  awaitingIndicatorCount: number;
}

export interface SystemOperationalStatus {
  checkedAt: string;
  liveWebApp: {
    serverStatus: OperationalCapabilityStatus;
    uptimeSeconds: number;
    httpsPublicUrl: string;
    sharedPublicUrl: string;
    databaseEngine: string;
    databaseStatus: OperationalCapabilityStatus;
    sqliteWalEnabled: boolean;
    totalObservations: number;
    totalRevisions: number;
    totalReleases: number;
    aiAnalystStatus: OperationalCapabilityStatus;
    aiAnalystModeFa: string;
    manualImportStatus: OperationalCapabilityStatus;
    backupCount: number;
    lastBackupAt: string | null;
  };
  liveFinancialData: {
    activeAutomatedSourcesCount: number;
    manualVerifiedSourcesCount: number;
    disconnectedSourcesCount: number;
    activeIndicatorsCount: number;
    staleOrLaggedIndicatorsCount: number;
    awaitingImportIndicatorsCount: number;
    plannedMetadataIndicatorsCount: number;
    lastSuccessfulPipelineRun: PipelineRunRecord | null;
    lastErrorEvent: { timestamp: string; messageFa: string } | null;
    sourceDiagnostics: SourceLiveDiagnostics[];
  };
}

export interface LiveQuoteItem {
  code: string;
  nameFa: string;
  category: 'FX' | 'GOLD_COIN' | 'BOURSE' | 'GLOBAL_COMMODITY' | 'CRYPTO_IRR';
  priceToman: number;
  priceRawDisplay: string;
  unitFa: string;
  change24hPct: number;
  low24hToman?: number;
  high24hToman?: number;
  intrinsicValueToman?: number;
  bubbleOrSpreadPct?: number;
  bubbleStatusFa?: string;
  sourceNameFa: string;
  updatedAtIso: string;
  isLiveRealtime: boolean;
}

export interface BourseStockOpportunity {
  symbol: string;
  companyNameFa: string;
  sectorFa: string;
  instrumentType: 'STOCK' | 'GOLD_ETF' | 'FIXED_INCOME_ETF';
  estimatedPriceRial: number;
  forwardPe: number;
  historicalMeanPe: number;
  impliedDollarToman: number;
  liveDollarGapPct: number;
  dividendYieldPct: number;
  signal: 'STRONG_BUY' | 'BUY_STEPWISE' | 'HOLD' | 'WAIT_FOR_PULLBACK';
  signalLabelFa: string;
  entryZoneRialFa: string;
  targetPriceRialFa: string;
  stopLossRialFa: string;
  expectedReturn6MPct: string;
  fundamentalThesisFa: string;
  keyCatalystFa: string;
  mainRiskFa: string;
}

export interface MarketOpportunitySignal {
  id: string;
  marketCategory: 'GOLD' | 'FX' | 'STOCKS' | 'AUTO' | 'HOUSING' | 'FIXED_INCOME';
  marketCategoryFa: string;
  assetTitleFa: string;
  tickerOrInstrumentFa: string;
  actionSignal: 'STRONG_BUY' | 'ACCUMULATE_STEPWISE' | 'HOLD_WAIT' | 'TAKE_PROFIT_REDUCE';
  actionLabelFa: string;
  convictionScore: number;
  currentLivePriceDisplay: string;
  intrinsicOrFairValueDisplay: string;
  valuationGapPct: number;
  valuationStatusFa: string;
  entryZoneFa: string;
  stepwisePlanFa: string[];
  targetZone1Fa: string;
  targetZone2Fa: string;
  stopLossOrInvalidationFa: string;
  riskRewardRatio: string;
  recommendedHorizonFa: string;
  minCapitalToman: number;
  liquidityGradeFa: string;
  rationaleBulletsFa: string[];
  catalystsFa: string[];
  executionHowToFa: string;
}

export interface SectorDeepDiveOutlook {
  sectorId: 'GOLD' | 'FX' | 'STOCKS' | 'AUTO' | 'HOUSING';
  sectorNameFa: string;
  currentPhaseFa: string;
  shortTermBias1MFa: string;
  mediumTermBias6MFa: string;
  attractivenessScore: number;
  keyMetrics: {
    labelFa: string;
    valueDisplay: string;
    interpretationFa: string;
  }[];
  benchmarkItems: {
    nameFa: string;
    currentMarketPriceFa: string;
    fairOrFactoryPriceFa: string;
    spreadOrBubblePct: number;
    verdictFa: string;
  }[];
  summaryAnalysisFa: string;
  actionableVerdictFa: string;
}

export interface LiveIranMarketSnapshot {
  fetchedAtIso: string;
  isLiveConnectionActive: boolean;
  liveSourcesUsed: string[];
  summaryIndicators: {
    dollarFreeToman: number;
    tetherUsdtToman: number;
    dirhamUaeToman: number;
    dirhamImpliedDollarToman: number;
    dollarTetherSpreadPct: number;
    dollarDirhamSpreadPct: number;
    gold18kGramToman: number;
    gold18kIntrinsicToman: number;
    gold18kBubblePct: number;
    mithqalToman: number;
    coinEmamiToman: number;
    coinEmamiIntrinsicToman: number;
    coinEmamiBubblePct: number;
    coinHalfToman: number;
    coinHalfBubblePct: number;
    coinQuarterToman: number;
    coinQuarterBubblePct: number;
    globalOunceUsd: number;
    paxgIrrToman: number;
    tedpixIndex: number;
    brentOilUsd: number;
    tehranHousingSqmToman: number;
    tehranHousingSqmUsd: number;
    housingPerGoldGramRatio: number;
  };
  quotes: LiveQuoteItem[];
  topOpportunities: MarketOpportunitySignal[];
  stockOpportunities: BourseStockOpportunity[];
  sectorOutlooks: SectorDeepDiveOutlook[];
}

export type EvidenceQualityBadge =
  | 'VERIFIED_LIVE'
  | 'VERIFIED_OFFICIAL'
  | 'ESTIMATED_DERIVED'
  | 'STALE_EXPIRED'
  | 'SOURCE_DISCREPANCY'
  | 'SOURCE_DISCONNECTED'
  | 'MISSING_UNAVAILABLE'
  | 'QUARANTINED_INVALID';

export type SemanticNumericCategory =
  | 'MARKET_PRICE'
  | 'INTRINSIC_ESTIMATE'
  | 'STATISTICAL_FORECAST'
  | 'SCENARIO_ASSUMPTION'
  | 'OBSERVED_MACRO';

export interface AnalystInputEvidence {
  code: string;
  nameFa: string;
  value: number | null;
  displayValueFa: string;
  unitFa: string;
  currencyBasis: 'IRR' | 'TOMAN' | 'USD' | 'NONE';
  solarPeriod: string;
  gregorianPeriod: string;
  publicationTimestamp: string | null;
  retrievalTimestamp: string | null;
  ageDescriptionFa: string;
  sourceId: string;
  sourceNameFa: string;
  qualityStatus: EvidenceQualityBadge;
  qualityLabelFa: string;
  semanticCategory: SemanticNumericCategory;
  methodologyOrWarningFa: string;
}

export interface AnalystSemanticSeparation {
  marketPricesAndFacts: {
    labelFa: string;
    code: string;
    valueDisplayFa: string;
    unitFa: string;
    sourceAndTimeFa: string;
    qualityStatus: EvidenceQualityBadge;
    qualityLabelFa: string;
  }[];
  intrinsicEstimates: {
    labelFa: string;
    code: string;
    estimatedValueFa: string;
    marketComparisonFa: string;
    formulaFa: string;
    statusLabelFa: string;
  }[];
  statisticalForecasts: {
    labelFa: string;
    code: string;
    horizonFa: string;
    pointForecastFa: string;
    interval50Fa: string;
    interval90Fa: string;
    oosMetricSummaryFa: string;
    validationStatus: 'VALIDATED_OOS' | 'INSUFFICIENT_SAMPLE';
  }[];
  scenarioAssumptions: {
    scenarioNameFa: string;
    conditionalPremiseFa: string;
    empiricalLikelihoodFa: string;
    analystWeightFa: string;
    invalidationTriggerFa: string;
    distinctionNoticeFa: string;
  }[];
}

export interface IndependentVerificationReport {
  passedIndependentAudit: boolean;
  auditStatus:
    | 'VERIFIED_CLEAN'
    | 'RESTRICTED_BY_DATA_GAPS'
    | 'BLOCKED_UNGROUNDED_CLAIM'
    | 'POLICY_REFUSAL_ENFORCED';
  checkedAtIso: string;
  unitCompatibilityStatus: 'COMPATIBLE' | 'NORMALIZED_RIAL_TOMAN_OR_SCALE';
  unitNormalizationNotesFa: string[];
  ungroundedNumbersDetected: string[];
  auditChecks: {
    checkId: string;
    titleFa: string;
    passed: boolean;
    detailFa: string;
  }[];
  remediationAppliedFa: string | null;
}

export interface EvidenceBoundAnalystResponse {
  questionFa: string;
  generatedAt: string;
  mode:
    | 'EVIDENCE_BOUND_GEMINI_VERIFIED'
    | 'EVIDENCE_BOUND_DETERMINISTIC_ENGINE'
    | 'RESTRICTED_ABSTENTION_GUARD';
  modelUsed: string;
  analysisRestrictionStatus:
    | 'FULL_EVIDENCE_COVERAGE'
    | 'RESTRICTED_PARTIAL_EVIDENCE'
    | 'ABSTAINED_INSUFFICIENT_OR_INVALID_DATA';
  answerFa: string;
  usedEvidence: AnalystInputEvidence[];
  flaggedOrUnavailableInputs: AnalystInputEvidence[];
  semanticSeparation: AnalystSemanticSeparation;
  verifiableReasoningStepsFa: string[];
  explicitAssumptionsFa: string[];
  limitationsAndUncomputableFa: string[];
  invalidationTriggersFa: string[];
  userProfileAudit: {
    capitalProvidedFa: string;
    horizonProvidedFa: string;
    riskToleranceProvidedFa: string;
    liquidityNeedProvidedFa: string;
    unassumedMissingFieldsFa: string[];
    isProfileCompleteForAllocation: boolean;
  };
  policyGuardrailsTriggered: {
    code: string;
    titleFa: string;
    actionTakenFa: string;
  }[];
  confidenceAssessment: {
    level: 'HIGH' | 'MODERATE' | 'LOW' | 'ABSTAINED';
    levelFa: string;
    evidenceScore0To100: number;
    rationaleFa: string;
  };
  independentVerification: IndependentVerificationReport;
}

export interface AcceptanceTestScenarioResult {
  scenarioId: string;
  scenarioNumber: number;
  titleFa: string;
  categoryFa: string;
  simulatedConditionFa: string;
  sampleUserPromptFa: string;
  expectedBehaviorFa: string;
  actualBehaviorSummaryFa: string;
  passed: boolean;
  verdictCode: 'PASS_BOUNDARY_ENFORCED' | 'FAIL_EXCEEDED_EVIDENCE';
  analystResponse: EvidenceBoundAnalystResponse;
}

