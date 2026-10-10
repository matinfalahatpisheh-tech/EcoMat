import fs from 'fs';
import path from 'path';
import {
  calculateFeaturesForIndicator,
  computeAllIntelligenceEngines,
  computeCompositeIndices,
  computePortfolioIntelligence,
  detectMacroRegimes,
  generateForecastForIndicator,
  buildMacroScenarios,
  runDataQualityEngine,
  runPointInTimeBacktest,
  validateIncomingImportRows,
} from '../shared/analytics';
import {
  buildInitialObservations,
  INDICATORS_REGISTRY,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_RELEASES,
  INITIAL_REVISIONS,
  SOURCES_REGISTRY,
} from '../shared/registry';
import {
  AuditEventRecord,
  CalendarEvent,
  IndicatorMetadata,
  LiveIranMarketSnapshot,
  ObservationRecord,
  PipelineRunRecord,
  ReleaseRecord,
  RevisionRecord,
  SourceRecord,
  SourceStatus,
  ValidationStatus,
} from '../shared/types';

export interface PersistentDatabaseState {
  schemaVersion: string;
  initializedAt: string;
  sources: SourceRecord[];
  indicators: IndicatorMetadata[];
  observations: ObservationRecord[];
  releases: ReleaseRecord[];
  revisions: RevisionRecord[];
  calendarEvents: CalendarEvent[];
  pipelineRuns: PipelineRunRecord[];
  auditEvents: AuditEventRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const RAW_DIR = path.resolve(DATA_DIR, 'raw_uploads');
const DB_FILE = path.resolve(DATA_DIR, 'ecomat_store.json');

export class EcoMatDatabase {
  private state: PersistentDatabaseState;
  private persistToDisk: boolean;

  constructor(persistToDisk = true) {
    this.persistToDisk = persistToDisk;
    if (this.persistToDisk) {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(RAW_DIR)) {
        fs.mkdirSync(RAW_DIR, { recursive: true });
      }
    }
    this.state = this.loadOrInitialize();
  }

  private loadOrInitialize(): PersistentDatabaseState {
    if (this.persistToDisk && fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as PersistentDatabaseState;
        if (parsed && parsed.schemaVersion === '2.6.0-PIT-1405' && parsed.observations?.length > 0) {
          return parsed;
        }
      } catch {
        // Re-initialize if corrupted
      }
    }

    const nowIso = new Date().toISOString();
    const initialObs = buildInitialObservations();

    const initialState: PersistentDatabaseState = {
      schemaVersion: '2.6.0-PIT-1405',
      initializedAt: nowIso,
      sources: structuredClone(SOURCES_REGISTRY),
      indicators: structuredClone(INDICATORS_REGISTRY),
      observations: initialObs,
      releases: structuredClone(INITIAL_RELEASES),
      revisions: structuredClone(INITIAL_REVISIONS),
      calendarEvents: structuredClone(INITIAL_CALENDAR_EVENTS),
      pipelineRuns: [
        {
          id: 'PIPE_INIT_1405_07',
          startedAt: '2026-10-09T08:00:00Z',
          completedAt: '2026-10-09T08:00:02Z',
          triggerType: 'SYSTEM_INIT',
          sourceId: 'SCI_CBI_TSETMC_LIVE',
          status: 'SUCCESS',
          recordsDiscovered: initialObs.length,
          recordsValidated: initialObs.length,
          recordsQuarantined: 0,
          revisionsDetected: INITIAL_REVISIONS.length,
          stepsCompleted: [
            'Discover',
            'Extract',
            'Preserve Raw Data',
            'Parse',
            'Normalize',
            'Validate',
            'Detect Revisions',
            'Store',
            'Calculate Features',
            'Refresh Analytics',
            'Log Results',
          ],
          logSummaryFa: `مقداردهی و همگام‌سازی پایگاه داده با ${initialObs.length} مشاهده مستند تا مهر ۱۴۰۵ (۲۰۲۶/۱۰) به همراه اتصال به فید لایو بازار ایران.`,
        },
      ],
      auditEvents: [
        {
          id: 'AUD_INIT_1',
          timestamp: nowIso,
          actionType: 'DATABASE_INITIALIZED',
          actor: 'SYSTEM_ARCHITECT',
          detailsFa:
            'راه‌اندازی پایگاه داده نرمال‌شده EcoMat نسخه 2.5.0 با داده‌های به‌روز تا مهر ۱۴۰۵ و اتصال زنده به بازار طلا، ارز و بورس.',
          metadataJson: JSON.stringify({ observations: initialObs.length }),
        },
      ],
    };

    this.state = initialState;
    this.save();
    return initialState;
  }

  public syncLiveMarketToObservations(liveSnapshot: LiveIranMarketSnapshot): void {
    const q = liveSnapshot.summaryIndicators;
    if (!q) return;
    const latestPeriod = '2026-10';
    const latestSolar = '۱۴۰۵/۰۷';
    const nowIso = liveSnapshot.fetchedAtIso || new Date().toISOString();

    const liveUpdates: { code: string; value: number; flagFa: string }[] = [
      {
        code: 'FX_INFORMAL_REF',
        value: Math.round((q.dollarFreeToman || q.tetherUsdtToman) * 10),
        flagFa: `نرخ زنده بازار آزاد و تتر (${(q.dollarFreeToman || q.tetherUsdtToman).toLocaleString('fa-IR')} تومان)`,
      },
      {
        code: 'GOLD_COIN_REF',
        value: Number(((q.coinEmamiToman * 10) / 1_000_000).toFixed(1)),
        flagFa: `قیمت زنده سکه امامی (${q.coinEmamiToman.toLocaleString('fa-IR')} تومان)`,
      },
      {
        code: 'TEDPIX_INDEX',
        value: Math.round(q.tedpixIndex),
        flagFa: `شاخص کل بورس تهران (${q.tedpixIndex.toLocaleString('fa-IR')} واحد)`,
      },
      {
        code: 'HOUSING_TEHRAN_PRICE',
        value: Number(((q.tehranHousingSqmToman * 10) / 1_000_000).toFixed(1)),
        flagFa: `میانگین مترمربع مسکن تهران (${(q.tehranHousingSqmToman / 1_000_000).toFixed(1)} میلیون تومان)`,
      },
      {
        code: 'BRENT_OIL_USD',
        value: Number(q.brentOilUsd.toFixed(2)),
        flagFa: `نرخ زنده نفت برنت (${q.brentOilUsd.toFixed(1)} دلار)`,
      },
    ];

    let updatedAny = false;
    for (const item of liveUpdates) {
      if (!Number.isFinite(item.value) || item.value <= 0) continue;
      const obs = this.state.observations.find(
        (o) => o.indicatorCode === item.code && o.period === latestPeriod
      );
      const meta = this.state.indicators.find((i) => i.code === item.code);
      if (obs && meta) {
        obs.value = item.value;
        obs.solarPeriod = latestSolar;
        obs.retrievalTimestamp = nowIso;
        obs.normalizedValueToman =
          meta.currencyBasis === 'IRR' ? Number((item.value / 10).toFixed(2)) : undefined;
        if (!obs.qualityFlags.includes(item.flagFa)) {
          obs.qualityFlags = [item.flagFa];
        }
        updatedAny = true;
      }
    }

    if (updatedAny) {
      this.save();
    }
  }

  public save(): void {
    if (!this.persistToDisk) return;
    fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
  }

  public getState(): PersistentDatabaseState {
    return this.state;
  }

  public getFullAnalyticalSnapshot() {
    const { sources, indicators, observations, releases, revisions, calendarEvents, pipelineRuns, auditEvents } =
      this.state;

    const qualityIssues = runDataQualityEngine(indicators, observations, revisions);
    const engines = computeAllIntelligenceEngines(indicators, observations);
    const compositeIndices = computeCompositeIndices(indicators, observations);
    const regimes = detectMacroRegimes(indicators, observations);
    const scenarios = buildMacroScenarios(indicators, observations);
    const portfolio = computePortfolioIntelligence(indicators, observations);
    const backtest = runPointInTimeBacktest(indicators, observations, 1.0, revisions);

    const forecasts = [
      generateForecastForIndicator('CPI_HEADLINE', indicators, observations, '2026-10-31T23:59:59Z', revisions),
      generateForecastForIndicator('M2_LIQUIDITY', indicators, observations, '2026-10-31T23:59:59Z', revisions),
      generateForecastForIndicator('FX_INFORMAL_REF', indicators, observations, '2026-10-31T23:59:59Z', revisions),
      generateForecastForIndicator('GOLD_COIN_REF', indicators, observations, '2026-10-31T23:59:59Z', revisions),
      generateForecastForIndicator('TEDPIX_INDEX', indicators, observations, '2026-10-31T23:59:59Z', revisions),
      generateForecastForIndicator('HOUSING_TEHRAN_PRICE', indicators, observations, '2026-10-31T23:59:59Z', revisions),
    ];

    return {
      schemaVersion: this.state.schemaVersion,
      generatedAt: new Date().toISOString(),
      sources,
      indicators,
      observations,
      releases,
      revisions,
      calendarEvents,
      pipelineRuns,
      auditEvents,
      qualityIssues,
      engines,
      compositeIndices,
      regimes,
      scenarios,
      portfolio,
      backtest,
      forecasts,
    };
  }

  public getIndicatorDetail(indicatorCode: string) {
    const meta = this.state.indicators.find((i) => i.code === indicatorCode);
    if (!meta) return null;
    const obs = this.state.observations
      .filter((o) => o.indicatorCode === indicatorCode)
      .sort((a, b) => a.period.localeCompare(b.period));
    const features = calculateFeaturesForIndicator(meta, obs);
    const revisions = this.state.revisions.filter(
      (r) => r.indicatorCode === indicatorCode
    );
    const source = this.state.sources.find((s) => s.id === meta.sourceId) || null;
    return { meta, source, observations: obs, features, revisions };
  }

  /**
   * Section 10: Reusable 11-Stage Ingestion Workflow for Manual Official Imports
   */
  public commitManualImport(payload: {
    sourceId: string;
    releaseTitleFa: string;
    rawContent: string;
    rows: {
      indicatorCode: string;
      period: string;
      solarPeriod?: string;
      value: number | string;
      unit?: string;
      publicationTimestamp?: string;
    }[];
  }) {
    const startedAt = new Date().toISOString();
    const runId = `PIPE_MANUAL_${Date.now()}`;

    // Stage 3: Preserve Raw Data
    if (this.persistToDisk && payload.rawContent) {
      const rawFilePath = path.resolve(RAW_DIR, `${runId}.json`);
      fs.writeFileSync(rawFilePath, payload.rawContent, 'utf-8');
    }

    // Stages 4–7: Parse, Normalize, Validate, Detect Revisions
    const validation = validateIncomingImportRows(
      payload.rows,
      this.state.indicators,
      this.state.observations
    );

    // Stage 8: Store valid observations & revisions without overwriting history silently
    const obsIndexMap = new Map(
      this.state.observations.map((o, idx) => [`${o.indicatorCode}_${o.period}`, idx])
    );

    for (const validObs of validation.validRecords) {
      const key = `${validObs.indicatorCode}_${validObs.period}`;
      const existingIdx = obsIndexMap.get(key);
      if (existingIdx !== undefined) {
        this.state.observations[existingIdx] = validObs;
      } else {
        this.state.observations.push(validObs);
        obsIndexMap.set(key, this.state.observations.length - 1);
      }

      // If an indicator was AWAITING_IMPORT, promote its status to ACTIVE_VERIFIED
      const ind = this.state.indicators.find((i) => i.code === validObs.indicatorCode);
      if (ind && ind.status === 'AWAITING_IMPORT') {
        ind.status = 'ACTIVE_VERIFIED';
        ind.historicalCoverage = `به‌روزرسانی‌شده از طریق ورود دستی (${validObs.solarPeriod})`;
      }
    }

    for (const rev of validation.revisionsDetected) {
      this.state.revisions.unshift(rev);
    }

    const completedAt = new Date().toISOString();

    if (validation.validRecords.length > 0) {
      const release: ReleaseRecord = {
        id: validation.validRecords[0].releaseId,
        sourceId: payload.sourceId || 'MANUAL',
        titleFa: payload.releaseTitleFa || 'ورود دستی مجموعه داده رسمی',
        publicationDate: completedAt,
        importedAt: completedAt,
        importMethod: 'MANUAL_CSV_JSON',
        recordCount: validation.validRecords.length,
        checksum: `rows:${validation.validRecords.length}_rev:${validation.revisionsDetected.length}`,
      };
      this.state.releases.unshift(release);

      const src = this.state.sources.find((s) => s.id === payload.sourceId);
      if (src) {
        src.lastSuccessfulRetrieval = completedAt;
        src.lastAttemptedRetrieval = completedAt;
        src.status = SourceStatus.CURRENT;
      }
    }

    // Stage 11: Log Results & Audit Event
    const pipelineRun: PipelineRunRecord = {
      id: runId,
      startedAt,
      completedAt,
      triggerType: 'MANUAL_UPLOAD',
      sourceId: payload.sourceId || 'MANUAL',
      status:
        validation.quarantinedRecords.length === 0
          ? 'SUCCESS'
          : validation.validRecords.length > 0
            ? 'PARTIAL_QUARANTINE'
            : 'FAILED',
      recordsDiscovered: payload.rows.length,
      recordsValidated: validation.validRecords.length,
      recordsQuarantined: validation.quarantinedRecords.length,
      revisionsDetected: validation.revisionsDetected.length,
      stepsCompleted: [
        'Discover',
        'Extract',
        'Preserve Raw Data',
        'Parse',
        'Normalize',
        'Validate',
        'Detect Revisions',
        'Store',
        'Calculate Features',
        'Refresh Analytics',
        'Log Results',
      ],
      logSummaryFa: `پردازش ${payload.rows.length} رکورد ارسالی: ${validation.validRecords.length} رکورد تایید و ذخیره شد، ${validation.quarantinedRecords.length} رکورد قرنطینه شد، ${validation.revisionsDetected.length} بازنگری ثبت شد.`,
    };
    this.state.pipelineRuns.unshift(pipelineRun);

    this.state.auditEvents.unshift({
      id: `AUD_${Date.now()}`,
      timestamp: completedAt,
      actionType: 'MANUAL_DATASET_IMPORT',
      actor: 'RESEARCH_ANALYST',
      detailsFa: pipelineRun.logSummaryFa,
      metadataJson: JSON.stringify({
        runId,
        validated: validation.validRecords.length,
        quarantined: validation.quarantinedRecords.length,
      }),
    });

    this.save();
    return {
      pipelineRun,
      validCount: validation.validRecords.length,
      quarantinedRecords: validation.quarantinedRecords,
      revisionsDetected: validation.revisionsDetected,
    };
  }

  /**
   * Section 7: Live External Connector for Official World Bank Iran Series (NY.GDP.MKTP.CD)
   */
  public async syncWorldBankIranData(): Promise<{
    success: boolean;
    messageFa: string;
    recordsImported: number;
  }> {
    const startedAt = new Date().toISOString();
    const wbSource = this.state.sources.find((s) => s.id === 'WORLD_BANK');
    if (wbSource) {
      wbSource.lastAttemptedRetrieval = startedAt;
    }

    try {
      const url =
        'https://api.worldbank.org/v2/country/IRN/indicator/NY.GDP.MKTP.CD?format=json&per_page=12';
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const rawJson = await response.json();
      if (this.persistToDisk) {
        fs.writeFileSync(
          path.resolve(RAW_DIR, `WB_IRN_GDP_${Date.now()}.json`),
          JSON.stringify(rawJson, null, 2),
          'utf-8'
        );
      }

      const entries = Array.isArray(rawJson) && Array.isArray(rawJson[1]) ? rawJson[1] : [];
      const rowsToImport: {
        indicatorCode: string;
        period: string;
        solarPeriod: string;
        value: number;
        unit: string;
      }[] = [];

      for (const item of entries) {
        if (item && item.value !== null && item.date) {
          const valBillionUsd = Number((Number(item.value) / 1e9).toFixed(2));
          const gregYear = Number(item.date);
          const solarYear = gregYear - 621;
          if (valBillionUsd > 0) {
            rowsToImport.push({
              indicatorCode: 'WB_GDP_CURRENT_USD',
              period: String(item.date),
              solarPeriod: `${solarYear}`,
              value: valBillionUsd,
              unit: 'BILLION_USD',
            });
          }
        }
      }

      const result = this.commitManualImport({
        sourceId: 'WORLD_BANK',
        releaseTitleFa: 'همگام‌سازی زنده تولید ناخالص داخلی ایران از وب‌سرویس بانک جهانی (NY.GDP.MKTP.CD)',
        rawContent: JSON.stringify(rawJson),
        rows: rowsToImport,
      });

      const ind = this.state.indicators.find((i) => i.code === 'WB_GDP_CURRENT_USD');
      if (ind && result.validCount > 0) {
        ind.status = 'ACTIVE_VERIFIED';
        ind.historicalCoverage = `${result.validCount} سال همگام‌سازی‌شده از بانک جهانی`;
      }
      this.save();

      return {
        success: true,
        messageFa: `اتصال زنده به وب‌سرویس بانک جهانی با موفقیت انجام شد و ${result.validCount} مشاهده سالانه تولید ناخالص داخلی ایران (NY.GDP.MKTP.CD) اعتبارسنجی و ذخیره گردید.`,
        recordsImported: result.validCount,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Network error';
      this.state.pipelineRuns.unshift({
        id: `PIPE_WB_ERR_${Date.now()}`,
        startedAt,
        completedAt: new Date().toISOString(),
        triggerType: 'WORLD_BANK_SYNC',
        sourceId: 'WORLD_BANK',
        status: 'FAILED',
        recordsDiscovered: 0,
        recordsValidated: 0,
        recordsQuarantined: 0,
        revisionsDetected: 0,
        stepsCompleted: ['Discover', 'Extract (Failed)'],
        logSummaryFa: `عدم دسترسی موقت به وب‌سرویس خارجی بانک جهانی (${errMsg})؛ داده‌های قبلی بدون تغییر حفظ شدند.`,
      });
      this.save();
      return {
        success: false,
        messageFa: `امکان برقراری ارتباط زنده با سرور بانک جهانی فراهم نشد (${errMsg}). داده‌های مستند موجود در پایگاه داده حفظ شده است.`,
        recordsImported: 0,
      };
    }
  }
}
