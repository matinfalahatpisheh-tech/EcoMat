/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  AuditEventRecord,
  BacktestSimulationResult,
  CalendarEvent,
  CompositeIndexResult,
  DerivedFeaturePoint,
  EngineAnalyticalOutput,
  ForecastOutput,
  IndicatorCategory,
  IndicatorMetadata,
  LiveIranMarketSnapshot,
  ObservationRecord,
  PipelineRunRecord,
  QualityIssue,
  RegimeClassification,
  ReleaseRecord,
  RevisionRecord,
  ScenarioDefinition,
  SourceRecord,
  AssetPerformanceSummary,
  PortfolioAllocationRecommendation,
} from './shared/types';
import { calculateFeaturesForIndicator } from './shared/analytics';
import { TimeSeriesChart, SeriesPoint } from './components/Charts';
import { ManualImportModal } from './components/ManualImportModal';
import {
  BacktestingLabView,
  PortfolioIntelligenceView,
  RegimeAndStatisticalLabView,
  ResearchReportsView,
  ScenarioAndForecastView,
} from './components/ResearchViews';
import {
  AiAnalystAndSettingsView,
  DataSourcesAndQualityView,
} from './components/GovernanceAndAnalystViews';
import { LiveMarketOpportunitiesView } from './components/LiveMarketOpportunitiesView';
import {
  Upload,
  Search,
  Sun,
  Moon,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react';

type NavSectionId =
  | 'LIVE_MARKET_OPPORTUNITIES'
  | 'EXEC_OVERVIEW'
  | 'INDICATORS_EXPLORER'
  | 'INFLATION_PP'
  | 'MONETARY_BANKING'
  | 'CURRENCY_EXTERNAL'
  | 'FISCAL_BUDGET'
  | 'REAL_ECONOMY_LABOR'
  | 'HOUSING'
  | 'CAPITAL_MARKETS'
  | 'ECONOMIC_CALENDAR'
  | 'MACRO_REGIME'
  | 'SCENARIO_LAB'
  | 'PORTFOLIO_INTEL'
  | 'HISTORICAL_BACKTEST'
  | 'RESEARCH_REPORTS'
  | 'DATA_SOURCES_QUALITY'
  | 'AI_ANALYST_SETTINGS';

const NAV_SECTIONS: {
  id: NavSectionId;
  num: string;
  labelFa: string;
  groupFa: string;
}[] = [
  { id: 'LIVE_MARKET_OPPORTUNITIES', num: '00', labelFa: 'فرصت‌های معاملاتی لایو و خرید سهام', groupFa: 'بازار لایو ایران' },
  { id: 'EXEC_OVERVIEW', num: '01', labelFa: 'نمای کلی مدیریتی', groupFa: 'پایش کلان' },
  { id: 'INDICATORS_EXPLORER', num: '02', labelFa: 'کاوشگر شاخص‌های اقتصادی', groupFa: 'پایش کلان' },
  { id: 'INFLATION_PP', num: '03', labelFa: 'تورم و قدرت خرید', groupFa: 'بخش‌های اقتصادی' },
  { id: 'MONETARY_BANKING', num: '04', labelFa: 'نظام پولی و بانکی', groupFa: 'بخش‌های اقتصادی' },
  { id: 'CURRENCY_EXTERNAL', num: '05', labelFa: 'ارز و بخش خارجی', groupFa: 'بخش‌های اقتصادی' },
  { id: 'FISCAL_BUDGET', num: '06', labelFa: 'سیاست مالی و بودجه', groupFa: 'بخش‌های اقتصادی' },
  { id: 'REAL_ECONOMY_LABOR', num: '07', labelFa: 'بخش حقیقی و اشتغال', groupFa: 'بخش‌های اقتصادی' },
  { id: 'HOUSING', num: '08', labelFa: 'مسکن و مستغلات', groupFa: 'بخش‌های اقتصادی' },
  { id: 'CAPITAL_MARKETS', num: '09', labelFa: 'بازارهای سرمایه', groupFa: 'بخش‌های اقتصادی' },
  { id: 'ECONOMIC_CALENDAR', num: '10', labelFa: 'تقویم اقتصادی و شواهد', groupFa: 'پایش کلان' },
  { id: 'MACRO_REGIME', num: '11', labelFa: 'پایش رژیم کلان و آزمایشگاه آماری', groupFa: 'آزمایشگاه پژوهش' },
  { id: 'SCENARIO_LAB', num: '12', labelFa: 'آزمایشگاه سناریو و پیش‌بینی', groupFa: 'آزمایشگاه پژوهش' },
  { id: 'PORTFOLIO_INTEL', num: '13', labelFa: 'هوشمندی سبد دارایی', groupFa: 'تصمیم‌گیری سرمایه‌گذاری' },
  { id: 'HISTORICAL_BACKTEST', num: '14', labelFa: 'بک‌تست تاریخی نقطه‌ای', groupFa: 'تصمیم‌گیری سرمایه‌گذاری' },
  { id: 'RESEARCH_REPORTS', num: '15', labelFa: 'گزارش‌های پژوهشی', groupFa: 'خروجی و حاکمیت داده' },
  { id: 'DATA_SOURCES_QUALITY', num: '16', labelFa: 'منابع داده و کنترل کیفیت', groupFa: 'خروجی و حاکمیت داده' },
  { id: 'AI_ANALYST_SETTINGS', num: '17', labelFa: 'تحلیلگر هوشمند و تنظیمات مدل', groupFa: 'خروجی و حاکمیت داده' },
];

interface FullSnapshotData {
  schemaVersion: string;
  generatedAt: string;
  sources: SourceRecord[];
  indicators: IndicatorMetadata[];
  observations: ObservationRecord[];
  releases: ReleaseRecord[];
  revisions: RevisionRecord[];
  calendarEvents: CalendarEvent[];
  pipelineRuns: PipelineRunRecord[];
  auditEvents: AuditEventRecord[];
  qualityIssues: QualityIssue[];
  engines: EngineAnalyticalOutput[];
  compositeIndices: CompositeIndexResult[];
  regimes: RegimeClassification[];
  scenarios: ScenarioDefinition[];
  portfolio: {
    assets: AssetPerformanceSummary[];
    correlationMatrix: { assetA: string; assetB: string; correlation: number }[];
    recommendations: PortfolioAllocationRecommendation[];
  };
  backtest: BacktestSimulationResult;
  forecasts: ForecastOutput[];
  liveMarket?: LiveIranMarketSnapshot;
}

export default function App() {
  const [activeNav, setActiveNav] = useState<NavSectionId>('LIVE_MARKET_OPPORTUNITIES');
  const [interactionLevel, setInteractionLevel] = useState<1 | 2 | 3>(2);
  const [currencyDisplay, setCurrencyDisplay] = useState<'IRR' | 'TOMAN'>('TOMAN');
  const [darkMode, setDarkMode] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [snapshot, setSnapshot] = useState<FullSnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Indicator Explorer state
  const [selectedIndicatorCode, setSelectedIndicatorCode] = useState('CPI_HEADLINE');
  const [indicatorSearch, setIndicatorSearch] = useState('');

  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [darkMode]);

  const fetchSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/snapshot');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSnapshot(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'خطا در برقراری ارتباط با پایگاه داده سرور'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  // Helper to convert IRR values when user selects TOMAN mode
  const formatCurrencyAware = (
    val: number | null,
    currencyBasis: string,
    unitFa: string
  ): { displayVal: string; displayUnit: string } => {
    if (val === null || val === undefined) {
      return { displayVal: 'بدون داده', displayUnit: unitFa };
    }
    if (currencyDisplay === 'TOMAN' && currencyBasis === 'IRR') {
      const converted = Number((val / 10).toFixed(2));
      const newUnit = unitFa
        .replace('هزار میلیارد ریال', 'هزار میلیارد تومان (همت)')
        .replace('میلیون ریال', 'میلیون تومان')
        .replace('ریال', 'تومان');
      return {
        displayVal: converted.toLocaleString('en-US'),
        displayUnit: newUnit,
      };
    }
    return {
      displayVal: val.toLocaleString('en-US'),
      displayUnit: unitFa,
    };
  };

  const getSeriesForChart = (code: string): {
    meta: IndicatorMetadata;
    points: SeriesPoint[];
    features: DerivedFeaturePoint[];
  } | null => {
    if (!snapshot) return null;
    const meta = snapshot.indicators.find((i) => i.code === code);
    if (!meta) return null;
    const obs = snapshot.observations
      .filter((o) => o.indicatorCode === code)
      .sort((a, b) => a.period.localeCompare(b.period));
    const features = calculateFeaturesForIndicator(meta, obs);

    const divisor =
      currencyDisplay === 'TOMAN' && meta.currencyBasis === 'IRR' ? 10 : 1;

    const points: SeriesPoint[] = features.map((f, idx) => ({
      period: f.period,
      solarPeriod: f.solarPeriod,
      value: Number((f.rawValue / divisor).toFixed(2)),
      secondaryValue:
        f.rolling3PeriodAvg !== null
          ? Number((f.rolling3PeriodAvg / divisor).toFixed(2))
          : null,
      flag: obs[idx]?.qualityFlags?.[0],
    }));

    return { meta, points, features };
  };

  // Render specialized sectoral view (Sections 3 through 9)
  const renderDomainSectorView = (config: {
    titleFa: string;
    subtitleFa: string;
    engineId: string;
    primaryCode: string;
    secondaryCode: string;
    compositeCode?: string;
  }) => {
    if (!snapshot) return null;
    const engine = snapshot.engines.find((e) => e.engineId === config.engineId);
    const composite = config.compositeCode
      ? snapshot.compositeIndices.find((c) => c.code === config.compositeCode)
      : undefined;
    const primarySeries = getSeriesForChart(config.primaryCode);
    const secondarySeries = getSeriesForChart(config.secondaryCode);

    return (
      <div className="space-y-6">
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {config.titleFa}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {config.subtitleFa}
              </p>
            </div>
            {engine && (
              <div className="text-xs font-mono text-slate-500 tabular-nums">
                موتور: {engine.engineId} · نسخه: {engine.modelVersion}
              </div>
            )}
          </div>

          {engine && (
            <div className="space-y-3 text-xs leading-6">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded">
                <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  ۱. واقعیت مشاهده‌شده و محاسبه‌شده (Observed & Calculated Facts):
                </div>
                <p className="text-slate-700 dark:text-slate-300">{engine.summaryFactFa}</p>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded">
                <div className="font-semibold text-sky-700 dark:text-sky-400 mb-1">
                  ۲. تفسیر تحلیلی (Analyst Interpretation — متمایز از داده خام):
                </div>
                <p className="text-slate-700 dark:text-slate-300">
                  {engine.interpretationFa}
                </p>
              </div>

              {/* Primary Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {engine.primaryMetrics.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5"
                  >
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {m.labelFa}
                    </div>
                    <div className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {m.value !== null ? m.value.toLocaleString('en-US') : 'N/A'}{' '}
                      <span className="text-xs font-sans font-normal text-slate-500">
                        {m.unitFa}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-slate-500">
                      تغییر دوره قبل:{' '}
                      <span className="text-slate-800 dark:text-slate-200">
                        {m.changeFromPrev !== null
                          ? m.changeFromPrev > 0
                            ? `+${m.changeFromPrev}`
                            : m.changeFromPrev
                          : '—'}
                      </span>{' '}
                      · صدک تاریخی: {m.historicalPercentile ?? '—'}%
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                      {m.indicatorCode} · دوره: {m.solarPeriod} · منبع: {m.sourceId}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      فرمول: {m.formula}
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 flex flex-wrap gap-4">
                <span>
                  <strong>عدم قطعیت:</strong> {engine.uncertaintyNotesFa}
                </span>
                <span>·</span>
                <span>
                  <strong>محدودیت‌های شناخته شده:</strong> {engine.limitationsFa}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Composite Index Breakdown if applicable */}
        {composite && (
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-5 space-y-3 text-xs">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {composite.nameFa} ({composite.code})
                </h3>
                <p className="text-slate-500 mt-0.5">{composite.economicPurposeFa}</p>
              </div>
              <div className="font-mono tabular-nums text-sm">
                امتیاز وزن‌دار:{' '}
                <strong className="text-base text-sky-600 dark:text-sky-400">
                  {composite.score ?? 'Insufficient Data'}/100
                </strong>{' '}
                · خط مبنای هم‌وزن: <strong>{composite.equalWeightScore}/100</strong>
              </div>
            </div>
            <div className="text-slate-600 dark:text-slate-300">
              {composite.interpretationFa}
            </div>
          </div>
        )}

        {/* Interactive Time-Series Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {primarySeries && (
            <TimeSeriesChart
              titleFa={primarySeries.meta.nameFa}
              subtitleFa={primarySeries.meta.definitionFa}
              code={primarySeries.meta.code}
              unitFa={
                formatCurrencyAware(
                  10,
                  primarySeries.meta.currencyBasis,
                  primarySeries.meta.unitFa
                ).displayUnit
              }
              sourceId={primarySeries.meta.sourceId}
              data={primarySeries.points}
              secondaryLabelFa="میانگین متحرک ۳ ماهه"
              colorHex="#0ea5e9"
            />
          )}
          {secondarySeries && (
            <TimeSeriesChart
              titleFa={secondarySeries.meta.nameFa}
              subtitleFa={secondarySeries.meta.definitionFa}
              code={secondarySeries.meta.code}
              unitFa={
                formatCurrencyAware(
                  10,
                  secondarySeries.meta.currencyBasis,
                  secondarySeries.meta.unitFa
                ).displayUnit
              }
              sourceId={secondarySeries.meta.sourceId}
              data={secondarySeries.points}
              secondaryLabelFa="میانگین متحرک ۳ ماهه"
              colorHex="#10b981"
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract (Section 2 of Frontend Design Constitution) */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            setActiveNav('EXEC_OVERVIEW');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
        >
          EcoMat
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <button
            type="button"
            onClick={() => setActiveNav('LIVE_MARKET_OPPORTUNITIES')}
            className={`hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 py-1 font-bold ${
              activeNav === 'LIVE_MARKET_OPPORTUNITIES'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500'
                : 'text-emerald-600/80 dark:text-emerald-400/90'
            }`}
          >
            بازار لایو و سیگنال خرید
          </button>
          <button
            type="button"
            onClick={() => setActiveNav('EXEC_OVERVIEW')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeNav === 'EXEC_OVERVIEW'
                ? 'text-slate-900 dark:text-slate-100 border-b-2 border-sky-500'
                : ''
            }`}
          >
            نمای کلی اقتصاد
          </button>
          <button
            type="button"
            onClick={() => setActiveNav('INDICATORS_EXPLORER')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeNav === 'INDICATORS_EXPLORER'
                ? 'text-slate-900 dark:text-slate-100 border-b-2 border-sky-500'
                : ''
            }`}
          >
            کاوشگر شاخص‌ها
          </button>
          <button
            type="button"
            onClick={() => setActiveNav('SCENARIO_LAB')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeNav === 'SCENARIO_LAB'
                ? 'text-slate-900 dark:text-slate-100 border-b-2 border-sky-500'
                : ''
            }`}
          >
            آزمایشگاه سناریو
          </button>
          <button
            type="button"
            onClick={() => setActiveNav('PORTFOLIO_INTEL')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeNav === 'PORTFOLIO_INTEL'
                ? 'text-slate-900 dark:text-slate-100 border-b-2 border-sky-500'
                : ''
            }`}
          >
            سبد دارایی
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            ورود داده رسمی CSV/JSON
          </button>
        </div>
      </header>

      {/* Main Workspace Layout: Sidebar (260px) + Content Viewport */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1600px] w-full mx-auto">
        {/* Right Sidebar (in RTL) with all 18 Primary Navigation Sections */}
        <aside className="w-full lg:w-[275px] shrink-0 border-b lg:border-b-0 lg:border-l border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/50 backdrop-blur-md p-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mb-3 px-2">
            <span>ترمینال لایو و کلان ایران · ۱۸ ماژول</span>
            <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ۱۴۰۵/۰۷ لایو
            </span>
          </div>

          {/* Mobile dropdown selector */}
          <div className="lg:hidden mb-2">
            <select
              value={activeNav}
              onChange={(e) => setActiveNav(e.target.value as NavSectionId)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
            >
              {NAV_SECTIONS.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.num}. {sec.labelFa}
                </option>
              ))}
            </select>
          </div>

          <nav className="hidden lg:flex flex-col space-y-1">
            {NAV_SECTIONS.map((sec) => {
              const isSelected = activeNav === sec.id;
              const isLiveSec = sec.id === 'LIVE_MARKET_OPPORTUNITIES';
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveNav(sec.id)}
                  className={`flex items-center justify-between px-3 py-2.5 text-xs rounded-xl transition-all text-right whitespace-nowrap ${
                    isSelected
                      ? isLiveSec
                        ? 'bg-gradient-to-l from-emerald-500/20 to-sky-500/15 text-emerald-600 dark:text-emerald-300 font-bold border border-emerald-500/30 shadow-xs'
                        : 'bg-sky-500/15 text-sky-600 dark:text-sky-300 font-bold border border-sky-500/30 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <span className="truncate flex items-center gap-1.5">
                    <span className="font-mono text-[11px] opacity-60">
                      {sec.num}.
                    </span>
                    <span>{sec.labelFa}</span>
                  </span>
                  {isLiveSec && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Analytical Viewport */}
        <main className="flex-1 p-5 lg:p-7 space-y-6 overflow-x-hidden">
          {/* Workspace Control Bar (Level 1/2/3 Switcher, Currency Basis IRR/Toman, Theme) */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>سطح تعامل کاربری:</span>
              </span>
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setInteractionLevel(1)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    interactionLevel === 1
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  سطح ۱: خلاصه مدیریتی
                </button>
                <button
                  type="button"
                  onClick={() => setInteractionLevel(2)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    interactionLevel === 2
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  سطح ۲: تحلیل شاخص‌ها و سناریو
                </button>
                <button
                  type="button"
                  onClick={() => setInteractionLevel(3)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    interactionLevel === 3
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  سطح ۳: آزمایشگاه کمّی و بک‌تست
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Explicit Rial / Toman Conversion Rule Toggle (Section 8) */}
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setCurrencyDisplay('IRR')}
                  className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                    currencyDisplay === 'IRR'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium'
                      : 'text-slate-500'
                  }`}
                >
                  واحد منبع (ریال)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrencyDisplay('TOMAN')}
                  className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                    currencyDisplay === 'TOMAN'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium'
                      : 'text-slate-500'
                  }`}
                >
                  تبدیل به تومان (÷۱۰)
                </button>
              </div>

              <button
                type="button"
                onClick={() => setDarkMode((d) => !d)}
                className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="تغییر تم تیره / روشن"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4 py-8">
              <div className="h-24 bg-slate-200/50 dark:bg-slate-900/60 rounded-lg animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="h-32 bg-slate-200/50 dark:bg-slate-900/60 rounded-lg animate-pulse" />
                <div className="h-32 bg-slate-200/50 dark:bg-slate-900/60 rounded-lg animate-pulse" />
                <div className="h-32 bg-slate-200/50 dark:bg-slate-900/60 rounded-lg animate-pulse" />
                <div className="h-32 bg-slate-200/50 dark:bg-slate-900/60 rounded-lg animate-pulse" />
              </div>
            </div>
          ) : error || !snapshot ? (
            <div className="p-6 border border-rose-500/30 bg-rose-500/10 rounded-lg text-xs text-rose-600 dark:text-rose-400">
              {error || 'امکان بارگذاری اطلاعات فراهم نشد.'}
            </div>
          ) : (
            <>
              {/* Persistent Live Market Ribbon Across All Modules */}
              {snapshot.liveMarket && (
                <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-l from-emerald-500/10 via-sky-500/5 to-slate-900/40 p-3.5 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        فید لایو بازار ایران (مهر ۱۴۰۵)
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                        تمامی نمودارها، بک‌تست‌ها و شاخص‌های این بخش با آخرین نرخ‌های زنده همگام‌سازی شده‌اند
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeNav !== 'LIVE_MARKET_OPPORTUNITIES' && (
                        <button
                          type="button"
                          onClick={() => setActiveNav('LIVE_MARKET_OPPORTUNITIES')}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                        >
                          رفتن به ترمینال معاملات و خرید سهام
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => fetchSnapshot()}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:border-sky-500"
                      >
                        به‌روزرسانی لحظه‌ای کل سامانه
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/70 text-xs">
                    <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">دلار آزاد / تتر لایو</div>
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        {snapshot.liveMarket.summaryIndicators.tetherUsdtToman.toLocaleString('fa-IR')} <span className="text-[10px] font-normal">تومان</span>
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">طلای ۱۸ عیار (حباب: {snapshot.liveMarket.summaryIndicators.gold18kBubblePct}٪)</div>
                      <div className="font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                        {snapshot.liveMarket.summaryIndicators.gold18kGramToman.toLocaleString('fa-IR')} <span className="text-[10px] font-normal">تومان</span>
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">سکه امامی (حباب: {snapshot.liveMarket.summaryIndicators.coinEmamiBubblePct}٪)</div>
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        {(snapshot.liveMarket.summaryIndicators.coinEmamiToman / 1_000_000).toFixed(1)} <span className="text-[10px] font-normal">میلیون تومان</span>
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">شاخص کل بورس (TEDPIX)</div>
                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {snapshot.liveMarket.summaryIndicators.tedpixIndex.toLocaleString('fa-IR')}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">مترمربع مسکن تهران</div>
                      <div className="font-mono font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                        {(snapshot.liveMarket.summaryIndicators.tehranHousingSqmToman / 1_000_000).toFixed(1)} <span className="text-[10px] font-normal">میلیون تومان</span>
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">نسبت مسکن به طلا</div>
                      <div className="font-mono font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                        {snapshot.liveMarket.summaryIndicators.housingPerGoldGramRatio} <span className="text-[10px] font-normal">گرم طلا / متر</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 00. LIVE MARKET OPPORTUNITIES, STOCK PICKS & CAPITAL ALLOCATOR */}
              {activeNav === 'LIVE_MARKET_OPPORTUNITIES' && (
                <LiveMarketOpportunitiesView useToman={currencyDisplay === 'TOMAN'} />
              )}

              {/* 01. EXECUTIVE OVERVIEW (Section 21) */}
              {activeNav === 'EXEC_OVERVIEW' && (
                <div className="space-y-8">
                  {/* Hero Mission & Five Fundamental Questions */}
                  <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-2xl p-6 space-y-4 shadow-xs">
                    <div className="flex flex-wrap items-baseline justify-between gap-4">
                      <div>
                        <h1
                          className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-100"
                          style={{ textWrap: 'balance' }}
                        >
                          نمای کلی مدیریتی اقتصاد کلان و بازارهای لایو ایران — EcoMat
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          پاسخ مستند و به‌روز (مهر ۱۴۰۵) به ۵ پرسش کلیدی اقتصاد کلان و تخصیص سرمایه با اتصال مستقیم به نرخ‌های لحظه‌ای بازار ایران.
                        </p>
                      </div>
                      <div className="text-xs font-mono tabular-nums px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        آخرین دوره فعال: ۱۴۰۵/۰۷ (2026-10 Live) · مشاهدات فعال: {snapshot.observations.length} رکورد
                      </div>
                    </div>

                    {/* The 5 Core Questions Summary Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2 text-xs">
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-1.5">
                        <div className="font-bold text-sky-600 dark:text-sky-400">
                          ۱. چه اتفاقی در حال رخ دادن است؟
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-5">
                          در مهر ۱۴۰۵، تورم نقطه‌به‌نقطه در ۳۸.۴٪ و بازده اخزا در ۳۸.۴٪ قرار دارد؛ تتر و دلار آزاد در کانال لایو {snapshot.liveMarket ? snapshot.liveMarket.summaryIndicators.tetherUsdtToman.toLocaleString('fa-IR') : '۱۵۱,۵۵۰'} تومان معامله می‌شوند.
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-1.5">
                        <div className="font-bold text-sky-600 dark:text-sky-400">
                          ۲. در زیر پوست اقتصاد چه تغییر می‌کند؟
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-5">
                          عبور حجم نقدینگی از ۱۳,۴۸۹ همت و صعود سهم پول دیداری سیال (M1/M2 = ۳۱.۶٪) نشان‌دهنده آمادگی نقدینگی برای چرخش سریع به سمت طلا و سهام بنیادی است.
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-1.5">
                        <div className="font-bold text-sky-600 dark:text-sky-400">
                          ۳. چشم‌انداز ۳، ۶ و ۱۲ ماه آینده؟
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-5">
                          در سناریوی پایه ۱۴۰۵-۱۴۰۶، تعدیل نرخ ارز توافقی شرکت‌های صادراتی و تقاضای پوششی طلا محرک اصلی بازدهی اسمی بازارها خواهد بود.
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-1.5">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          ۴. کدام دارایی‌ها جذابیت خرید دارند؟
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-5">
                          طلای ۱۸ عیار و صندوق‌های طلا (به دلیل حباب بسیار کمتر از سکه)، سهام دلاری با P/E زیر ۵ (فملی، شپنا، وبملت) و تبدیل پله‌ای طلا به مسکن مصرفی.
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-1.5">
                        <div className="font-bold text-sky-600 dark:text-sky-400">
                          ۵. وضعیت اتصال لایو و شواهد؟
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-5">
                          نرخ‌های طلا، سکه، تتر، دلار و شاخص بورس به‌صورت زنده از فیدهای بازار ایران دریافت شده و مستقیماً در سری‌های ۱۴۰۵/۰۷ ثبت می‌شوند.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Composite Indices 8-Card Grid */}
                  <section className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        شاخص‌های ترکیبی هشت‌گانه اقتصاد کلان (مقیاس ۰ تا ۱۰۰ در برابر خط مبنای هم‌وزن)
                      </h2>
                      <span className="text-xs text-slate-500">
                        تبدیل آماری: Φ(Z) × 100 · بدون وزن‌دهی سلیقه‌ای
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {snapshot.compositeIndices.map((ci) => (
                        <div
                          key={ci.code}
                          className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-4 space-y-2"
                        >
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {ci.nameFa.split('(')[0]}
                          </div>
                          <div className="flex items-baseline justify-between font-mono tabular-nums">
                            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                              {ci.score !== null ? ci.score : 'Insufficient Data'}
                              <span className="text-xs font-normal text-slate-500">
                                /100
                              </span>
                            </span>
                            <span className="text-xs text-slate-500">
                              هم‌وزن: {ci.equalWeightScore ?? '—'}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                (ci.score ?? 50) >= 65
                                  ? 'bg-amber-500'
                                  : (ci.score ?? 50) <= 40
                                    ? 'bg-sky-500'
                                    : 'bg-emerald-500'
                              }`}
                              style={{ width: `${ci.score ?? 0}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-5">
                            {ci.interpretationFa}
                          </p>
                          <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                            پوشش داده: {Math.round(ci.coverageRatio * 100)}% (حداقل مجاز:{' '}
                            {Math.round(ci.minCoverageRequired * 100)}%)
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Level 2 & 3 Additional Analytical Charts on Overview */}
                  {interactionLevel >= 2 && (
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {getSeriesForChart('CPI_HEADLINE') && (
                        <TimeSeriesChart
                          titleFa="روند تورم نقطه‌به‌نقطه کل کشور (CPI YoY)"
                          subtitleFa="گزارش رسمی مرکز آمار ایران (سال پایه ۱۴۰۱=۱۰۰)"
                          code="CPI_HEADLINE"
                          unitFa="درصد"
                          sourceId="SCI"
                          data={getSeriesForChart('CPI_HEADLINE')!.points}
                          secondaryLabelFa="میانگین متحرک ۳ ماهه"
                          colorHex="#0ea5e9"
                        />
                      )}
                      {getSeriesForChart('AKHZA_YTM_INDEX') && (
                        <TimeSeriesChart
                          titleFa="نرخ بازده تا سررسید اسناد خزانه اسلامی (اخزا)"
                          subtitleFa="معیار نرخ بهره بدون ریسک اسمی در بازار ثانویه فرابورس"
                          code="AKHZA_YTM_INDEX"
                          unitFa="درصد سالانه"
                          sourceId="TSETMC"
                          data={getSeriesForChart('AKHZA_YTM_INDEX')!.points}
                          secondaryLabelFa="میانگین متحرک ۳ ماهه"
                          colorHex="#f59e0b"
                        />
                      )}
                    </section>
                  )}

                  {/* Executive Engine Cards (Fact vs Change vs Historical Percentile vs Freshness) */}
                  <section className="space-y-3">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      خلاصه خروجی موتورهای هفت‌گانه هوشمندی اقتصادی (تفکیک مشاهده، تغییر، صدک تاریخی و تفسیر)
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {snapshot.engines.map((eng) => (
                        <div
                          key={eng.engineId}
                          className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-5 space-y-3 text-xs"
                        >
                          <div className="flex items-baseline justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {eng.titleFa}
                            </h3>
                            <span className="font-mono text-[11px] text-slate-400">
                              {eng.epistemicType}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 leading-6">
                            <strong>مشاهده:</strong> {eng.summaryFactFa}
                          </p>
                          <p className="text-slate-600 dark:text-slate-400 leading-6">
                            <strong>تفسیر:</strong> {eng.interpretationFa}
                          </p>
                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono tabular-nums">
                            {eng.primaryMetrics.map((pm, idx) => (
                              <div
                                key={idx}
                                className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded"
                              >
                                <div className="font-sans text-[11px] text-slate-500 truncate">
                                  {pm.labelFa}
                                </div>
                                <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                                  {pm.value} {pm.unitFa}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {pm.solarPeriod} · {pm.sourceId}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* 02. ECONOMIC INDICATORS REGISTRY & EXPLORER (Section 9) */}
              {activeNav === 'INDICATORS_EXPLORER' && (
                <div className="space-y-6">
                  <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          رجیستری و کاوشگر شاخص‌های اقتصاد کلان ایران ({snapshot.indicators.length} شاخص ثبت‌شده)
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          شفافیت کامل وضعیت داده: شاخص‌های دارای سری تاریخی تاییدشده (ACTIVE_VERIFIED) از شاخص‌های در انتظار ورود دستی یا منتشرنشده متمایز شده‌اند.
                        </p>
                      </div>
                      <div className="relative w-full sm:w-72">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                        <input
                          type="text"
                          value={indicatorSearch}
                          onChange={(e) => setIndicatorSearch(e.target.value)}
                          placeholder="جستجوی نام فارسی یا کد انگلیسی..."
                          className="w-full pr-8 pl-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                            <th className="py-2 px-2 text-right">کد و عنوان شاخص</th>
                            <th className="py-2 px-2 text-right">دسته‌بندی و نقش فرضی</th>
                            <th className="py-2 px-2 text-right">منبع و وقفه</th>
                            <th className="py-2 px-2 text-right">واحد سنجش</th>
                            <th className="py-2 px-2 text-right">وضعیت دسترسی</th>
                            <th className="py-2 px-2 text-center">کاوش</th>
                          </tr>
                        </thead>
                        <tbody>
                          {snapshot.indicators
                            .filter(
                              (i) =>
                                i.nameFa.includes(indicatorSearch) ||
                                i.code.toLowerCase().includes(indicatorSearch.toLowerCase())
                            )
                            .map((ind) => (
                              <tr
                                key={ind.code}
                                className={`border-b border-slate-200/60 dark:border-slate-800/60 ${
                                  selectedIndicatorCode === ind.code
                                    ? 'bg-sky-500/10'
                                    : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                                }`}
                              >
                                <td className="py-2.5 px-2">
                                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                                    {ind.nameFa}
                                  </div>
                                  <div className="font-mono text-[11px] text-slate-500">
                                    {ind.code} · {ind.nameEn}
                                  </div>
                                </td>
                                <td className="py-2.5 px-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                  <div>{ind.category}</div>
                                  <div>نقش: {ind.roles.join(', ')}</div>
                                </td>
                                <td className="py-2.5 px-2 font-mono text-slate-600 dark:text-slate-400">
                                  {ind.sourceId} · وقفه: {ind.publicationLagDays} روز
                                </td>
                                <td className="py-2.5 px-2 text-slate-600 dark:text-slate-400">
                                  {ind.unitFa}
                                </td>
                                <td className="py-2.5 px-2 font-mono text-[11px]">
                                  <span
                                    className={
                                      ind.status === 'ACTIVE_VERIFIED'
                                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                        : ind.status === 'LIVE_API_SUPPORTED'
                                          ? 'text-sky-600 dark:text-sky-400 font-semibold'
                                          : 'text-amber-600 dark:text-amber-400'
                                    }
                                  >
                                    {ind.status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2 text-center">
                                  {ind.status === 'ACTIVE_VERIFIED' ? (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedIndicatorCode(ind.code)}
                                      className="px-2.5 py-1 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded"
                                    >
                                      نمایش سری
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setIsImportModalOpen(true)}
                                      className="px-2.5 py-1 text-xs text-sky-600 dark:text-sky-400 hover:underline"
                                    >
                                      ورود داده
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Selected Indicator Chart & Derived Features Table */}
                  {getSeriesForChart(selectedIndicatorCode) && (
                    <div className="space-y-6">
                      <TimeSeriesChart
                        titleFa={getSeriesForChart(selectedIndicatorCode)!.meta.nameFa}
                        subtitleFa={
                          getSeriesForChart(selectedIndicatorCode)!.meta.definitionFa
                        }
                        code={selectedIndicatorCode}
                        unitFa={
                          formatCurrencyAware(
                            10,
                            getSeriesForChart(selectedIndicatorCode)!.meta
                              .currencyBasis,
                            getSeriesForChart(selectedIndicatorCode)!.meta.unitFa
                          ).displayUnit
                        }
                        sourceId={
                          getSeriesForChart(selectedIndicatorCode)!.meta.sourceId
                        }
                        data={getSeriesForChart(selectedIndicatorCode)!.points}
                        secondaryLabelFa="میانگین متحرک ۳ دوره"
                      />

                      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-5 overflow-x-auto">
                        <h3 className="text-sm font-semibold mb-3">
                          جدول مشاهدات ذخیره شده و ویژگی‌های مهندسی‌شده (Derived Features — بدون تورش آینده‌نگری)
                        </h3>
                        <table className="w-full text-xs font-mono tabular-nums border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-sans">
                              <th className="py-2 px-2 text-right">دوره شمسی (میلادی)</th>
                              <th className="py-2 px-2 text-left">مقدار خام</th>
                              <th className="py-2 px-2 text-left">تغییر ماهانه (MoM)</th>
                              <th className="py-2 px-2 text-left">تغییر فصلی (QoQ)</th>
                              <th className="py-2 px-2 text-left">رشد سالانه (YoY)</th>
                              <th className="py-2 px-2 text-left">میانگین ۳ماهه</th>
                              <th className="py-2 px-2 text-left">نمره استاندارد (Z-Score)</th>
                              <th className="py-2 px-2 text-left">صدک تاریخی</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getSeriesForChart(selectedIndicatorCode)!
                              .features.slice()
                              .reverse()
                              .map((f) => (
                                <tr
                                  key={f.period}
                                  className="border-b border-slate-200/50 dark:border-slate-800/50"
                                >
                                  <td className="py-2 px-2 text-right">
                                    {f.solarPeriod} ({f.period})
                                  </td>
                                  <td className="py-2 px-2 text-left font-semibold">
                                    {f.rawValue.toLocaleString('en-US')}
                                  </td>
                                  <td className="py-2 px-2 text-left">
                                    {f.momGrowthPct !== null ? `${f.momGrowthPct}%` : '—'}
                                  </td>
                                  <td className="py-2 px-2 text-left">
                                    {f.qoqGrowthPct !== null ? `${f.qoqGrowthPct}%` : '—'}
                                  </td>
                                  <td className="py-2 px-2 text-left">
                                    {f.yoyGrowthPct !== null ? `${f.yoyGrowthPct}%` : '—'}
                                  </td>
                                  <td className="py-2 px-2 text-left">
                                    {f.rolling3PeriodAvg !== null
                                      ? f.rolling3PeriodAvg.toLocaleString('en-US')
                                      : '—'}
                                  </td>
                                  <td className="py-2 px-2 text-left">
                                    {f.zScore !== null ? f.zScore : '—'}
                                  </td>
                                  <td className="py-2 px-2 text-left">
                                    {f.historicalPercentile !== null
                                      ? `${f.historicalPercentile}%`
                                      : '—'}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 03. INFLATION AND PURCHASING POWER */}
              {activeNav === 'INFLATION_PP' &&
                renderDomainSectorView({
                  titleFa: 'تحلیل تخصصی تورم، قیمت تولیدکننده و قدرت خرید خانوار',
                  subtitleFa:
                    'پایش شاخص بهای مصرف‌کننده (CPI)، خوراکی‌ها، تورم ماهانه سالانه‌شده و پیش‌نگری هزینه تولیدکننده (PPI) بر اساس داده‌های مرکز آمار ایران.',
                  engineId: 'ENGINE_INFLATION',
                  primaryCode: 'CPI_HEADLINE',
                  secondaryCode: 'PPI_HEADLINE',
                  compositeCode: 'IDX_INFLATION_PRESSURE',
                })}

              {/* 04. MONETARY AND BANKING SYSTEM */}
              {activeNav === 'MONETARY_BANKING' &&
                renderDomainSectorView({
                  titleFa: 'تحلیل نظام پولی، پایه پولی، نقدینگی و نرخ سود بین‌بانکی',
                  subtitleFa:
                    'تفکیک رشد اسمی و حقیقی نقدینگی، ضریب فزاینده پولی، سهم پول دیداری سیال (M1/M2) و دالان نرخ سود بانک مرکزی.',
                  engineId: 'ENGINE_MONETARY',
                  primaryCode: 'M2_LIQUIDITY',
                  secondaryCode: 'M1_SHARE_IN_M2',
                  compositeCode: 'IDX_LIQUIDITY_EXPANSION',
                })}

              {/* 05. CURRENCY AND EXTERNAL SECTOR */}
              {activeNav === 'CURRENCY_EXTERNAL' &&
                renderDomainSectorView({
                  titleFa: 'تحلیل بازار ارز، شکاف ارزی (رانت دونرخی) و تراز تجاری غیرنفتی',
                  subtitleFa:
                    'مقایسه مستند نرخ حواله مرکز مبادله (نیما/توافقی) با مظنه مرجع بازار آزاد و تراز ماهانه گمرک ج.ا.ا بدون فرض ساختگی درباره ذخایر ارزی.',
                  engineId: 'ENGINE_CURRENCY',
                  primaryCode: 'FX_INFORMAL_REF',
                  secondaryCode: 'FX_OFFICIAL_NIMA',
                  compositeCode: 'IDX_CURRENCY_STRESS',
                })}

              {/* 06. FISCAL POLICY AND GOVERNMENT BUDGET */}
              {activeNav === 'FISCAL_BUDGET' &&
                renderDomainSectorView({
                  titleFa: 'تحلیل سیاست مالی، تحقق بودجه عمومی و بازار بدهی دولتی',
                  subtitleFa:
                    'بررسی شکاف بودجه مصوب و عملکرد خزانه و اثر انتشار اسناد خزانه اسلامی (اخزا) بر نرخ بهره بدون ریسک اقتصاد.',
                  engineId: 'ENGINE_FISCAL',
                  primaryCode: 'BUDGET_REALIZATION_RATIO',
                  secondaryCode: 'AKHZA_YTM_INDEX',
                  compositeCode: 'IDX_FISCAL_RISK',
                })}

              {/* 07. REAL ECONOMY AND EMPLOYMENT */}
              {activeNav === 'REAL_ECONOMY_LABOR' &&
                renderDomainSectorView({
                  titleFa: 'تحلیل بخش حقیقی اقتصاد، رشد تولید ناخالص داخلی، انرژی و بازار کار',
                  subtitleFa:
                    'پایش رشد اقتصادی فصلی به قیمت‌های ثابت ۱۴۰۱، نرخ بیکاری مرکز آمار و قیمت جهانی نفت برنت.',
                  engineId: 'ENGINE_REAL_ECONOMY',
                  primaryCode: 'GDP_REAL_GROWTH',
                  secondaryCode: 'UNEMPLOYMENT_RATE',
                  compositeCode: 'IDX_GROWTH_MOMENTUM',
                })}

              {/* 08. HOUSING */}
              {activeNav === 'HOUSING' &&
                renderDomainSectorView({
                  titleFa: 'تحلیل بازار مسکن، تغییرات حقیقی قیمت و شاخص استطاعت خرید',
                  subtitleFa:
                    'بررسی میانگین قیمت معاملات قطعی ثبت‌شده در شهر تهران و مقایسه آن با تورم عمومی و هزینه فرصت اوراق بدهی.',
                  engineId: 'ENGINE_HOUSING',
                  primaryCode: 'HOUSING_TEHRAN_PRICE',
                  secondaryCode: 'CPI_HEADLINE',
                  compositeCode: 'IDX_HOUSING_HEAT',
                })}

              {/* 09. CAPITAL MARKETS */}
              {activeNav === 'CAPITAL_MARKETS' &&
                renderDomainSectorView({
                  titleFa: 'تحلیل بازار سرمایه: شاخص کل، هم‌وزن، طلا و شرایط مالی',
                  subtitleFa:
                    'مقایسه بازده اسمی و تعدیل‌شده با تورم صنایع صادرات‌محور (TEDPIX) و صنایع کوچک ریالی (هم‌وزن) در برابر نرخ اخزا و طلا.',
                  engineId: 'ENGINE_CAPITAL_MARKETS',
                  primaryCode: 'TEDPIX_INDEX',
                  secondaryCode: 'TSE_EQUAL_WEIGHT',
                  compositeCode: 'IDX_EQUITY_CONDITIONS',
                })}

              {/* 10. ECONOMIC CALENDAR AND NEWS EVIDENCE (Section 22) */}
              {activeNav === 'ECONOMIC_CALENDAR' && (
                <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-5 space-y-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      تقویم انتشار آمارهای کلان و رویدادهای سیاستی رسمی (Economic Calendar & Primary Evidence)
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      تفکیک صریح تاریخ‌های انتشار قطعی از تاریخ‌های تخمینی مبتنی بر الگوی وقفه تاریخی. هم‌زمانی زمانی یک رویداد با نوسان بازار به‌منزله اثبات علیت نیست.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                          <th className="py-2.5 px-2 text-right">عنوان رویداد / گزارش آماری</th>
                          <th className="py-2.5 px-2 text-right">مرجع رسمی</th>
                          <th className="py-2.5 px-2 text-left font-mono">تاریخ انتشار مورد انتظار</th>
                          <th className="py-2.5 px-2 text-right">نوع زمان‌بندی</th>
                          <th className="py-2.5 px-2 text-right">شاخص‌های مرتبط</th>
                          <th className="py-2.5 px-2 text-right">توضیحات و پیوند منبع</th>
                        </tr>
                      </thead>
                      <tbody>
                        {snapshot.calendarEvents.map((ev) => (
                          <tr
                            key={ev.id}
                            className="border-b border-slate-200/60 dark:border-slate-800/60"
                          >
                            <td className="py-3 px-2 font-semibold text-slate-900 dark:text-slate-100">
                              {ev.titleFa}
                            </td>
                            <td className="py-3 px-2 font-mono">{ev.sourceId}</td>
                            <td className="py-3 px-2 text-left font-mono tabular-nums">
                              {ev.expectedDateSolar} ({ev.expectedDateIso})
                            </td>
                            <td className="py-3 px-2">
                              {ev.isEstimatedSchedule ? (
                                <span className="text-amber-600 dark:text-amber-400">
                                  تخمینی (الگوی وقفه تاریخی)
                                </span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  برنامه رسمی تاییدشده
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 font-mono text-[11px] text-slate-500">
                              {ev.relatedIndicators.join(' · ')}
                            </td>
                            <td className="py-3 px-2 text-slate-600 dark:text-slate-400">
                              <div>{ev.notesFa}</div>
                              <a
                                href={ev.evidenceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 hover:underline mt-0.5"
                              >
                                <span>درگاه مرجع ({ev.sourceId})</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 11. MACRO REGIME MONITOR & LEAD/LAG LAB */}
              {activeNav === 'MACRO_REGIME' && (
                <RegimeAndStatisticalLabView
                  regimes={snapshot.regimes}
                  indicators={snapshot.indicators}
                  observations={snapshot.observations}
                />
              )}

              {/* 12. SCENARIO & FORECASTING LAB */}
              {activeNav === 'SCENARIO_LAB' && (
                <ScenarioAndForecastView
                  forecasts={snapshot.forecasts}
                  scenarios={snapshot.scenarios}
                  indicators={snapshot.indicators}
                  observations={snapshot.observations}
                />
              )}

              {/* 13. PORTFOLIO INTELLIGENCE */}
              {activeNav === 'PORTFOLIO_INTEL' && (
                <PortfolioIntelligenceView portfolio={snapshot.portfolio} />
              )}

              {/* 14. HISTORICAL BACKTESTING */}
              {activeNav === 'HISTORICAL_BACKTEST' && (
                <BacktestingLabView initialBacktest={snapshot.backtest} />
              )}

              {/* 15. RESEARCH REPORTS */}
              {activeNav === 'RESEARCH_REPORTS' && (
                <ResearchReportsView
                  compositeIndices={snapshot.compositeIndices}
                  regimes={snapshot.regimes}
                  scenarios={snapshot.scenarios}
                />
              )}

              {/* 16. DATA SOURCES AND QUALITY */}
              {activeNav === 'DATA_SOURCES_QUALITY' && (
                <DataSourcesAndQualityView
                  sources={snapshot.sources}
                  indicators={snapshot.indicators}
                  qualityIssues={snapshot.qualityIssues}
                  revisions={snapshot.revisions}
                  releases={snapshot.releases}
                  pipelineRuns={snapshot.pipelineRuns}
                  auditEvents={snapshot.auditEvents}
                  onOpenManualImport={() => setIsImportModalOpen(true)}
                  onRefreshSnapshot={fetchSnapshot}
                />
              )}

              {/* 17. AI ANALYST & SETTINGS */}
              {activeNav === 'AI_ANALYST_SETTINGS' && <AiAnalystAndSettingsView />}
            </>
          )}
        </main>
      </div>

      {/* Quiet Footer (No Ornamental Telemetry Clutter) */}
      <footer className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4">
        <div>
          EcoMat — پلتفرم هوشمندی اقتصاد کلان، سیگنال‌های لایو بازار و تحلیل سبد دارایی ایران (به‌روزرسانی مهر ۱۴۰۵)
        </div>
        <div className="font-mono">
          موتور کمی: EcoMat-Quant-v2.5.0-LIVE · متصل به فید زنده طلا، ارز و بورس تهران
        </div>
      </footer>

      {/* Manual Official CSV/JSON Import Modal */}
      {snapshot && (
        <ManualImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          indicators={snapshot.indicators}
          onImportCommitted={() => {
            fetchSnapshot();
          }}
        />
      )}
    </div>
  );
}
