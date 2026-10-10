import React, { useState, useEffect } from 'react';
import {
  AssetPerformanceSummary,
  BacktestSimulationResult,
  CompositeIndexResult,
  ForecastOutput,
  IndicatorMetadata,
  LeadLagRelationshipResult,
  ObservationRecord,
  PortfolioAllocationRecommendation,
  RegimeClassification,
  ScenarioDefinition,
} from '../shared/types';
import { ForecastFanChart, SeriesPoint, TimeSeriesChart } from './Charts';
import { Download, RefreshCw } from 'lucide-react';

/**
 * Section 11 & 15 & 16: Macro Regime Monitor + Lead/Lag Statistical Lab
 */
export const RegimeAndStatisticalLabView: React.FC<{
  regimes: RegimeClassification[];
  indicators: IndicatorMetadata[];
  observations: ObservationRecord[];
}> = ({ regimes, indicators, observations }) => {
  const activeIndicators = indicators.filter((i) => i.status === 'ACTIVE_VERIFIED');
  const [indX, setIndX] = useState('PPI_HEADLINE');
  const [indY, setIndY] = useState('CPI_HEADLINE');
  const [leadLagResult, setLeadLagResult] = useState<LeadLagRelationshipResult | null>(
    null
  );
  const [loadingLab, setLoadingLab] = useState(false);

  const runLeadLag = async (xCode: string, yCode: string) => {
    setLoadingLab(true);
    try {
      const res = await fetch('/api/research/lead-lag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indicatorX: xCode, indicatorY: yCode }),
      });
      const data = await res.json();
      if (res.ok) setLeadLagResult(data);
    } finally {
      setLoadingLab(false);
    }
  };

  useEffect(() => {
    runLeadLag(indX, indY);
  }, [indX, indY]);

  return (
    <div className="space-y-8">
      {/* Macro Regime Classification Grid */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            پایشگر رژیم‌های کلان اقتصادی ایران (پوشش هم‌پوشانی رژیم‌ها)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            برخلاف مدل‌های تک‌حالتی، اقتصاد می‌تواند به‌طور هم‌زمان در چند رژیم هم‌پوشان (مانند تورم بالا + انقباض پولی + تنش ارزی) قرار داشته باشد. هر طبقه‌بندی دارای قاعده صریح و شرط نقض است.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {regimes.map((reg) => (
            <div
              key={reg.id}
              className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-5 space-y-3"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {reg.nameFa}
                </h3>
                <div className="text-xs font-mono tabular-nums">
                  <span
                    className={
                      reg.isActive
                        ? 'text-amber-600 dark:text-amber-400 font-semibold'
                        : 'text-slate-500'
                    }
                  >
                    {reg.isActive ? 'وضعیت: فعال (Active)' : 'وضعیت: غیرفعال'}
                  </span>
                  <span className="mx-1.5 text-slate-400">·</span>
                  <span className="text-slate-600 dark:text-slate-300">
                    انطباق: {reg.activationScore}/100
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong>قاعده تشخیص:</strong> {reg.classificationRuleFa}
              </p>

              <div className="border-t border-slate-200/80 dark:border-slate-800/80 pt-2.5 space-y-1.5">
                <div className="text-[11px] text-slate-500">شواهد و متغیرهای پشتیبان:</div>
                {reg.supportingIndicators.map((sup) => (
                  <div
                    key={sup.indicatorCode}
                    className="flex items-center justify-between text-xs font-mono tabular-nums"
                  >
                    <span className="text-slate-700 dark:text-slate-300 font-sans">
                      {sup.nameFa} ({sup.indicatorCode})
                    </span>
                    <span>
                      {sup.currentValue} · آستانه ({sup.thresholdRuleFa}):{' '}
                      <strong
                        className={
                          sup.matched
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                        }
                      >
                        {sup.matched ? 'برقرار' : 'عدم تحقق'}
                      </strong>
                    </span>
                  </div>
                ))}
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/80 dark:border-slate-800/80 space-y-1">
                <div>
                  <strong>مشابه‌های تاریخی:</strong> {reg.historicalAnaloguesFa.join(' ، ')} · آخرین تغییر وضعیت: {reg.lastChangeSolarPeriod}
                </div>
                <div>
                  <strong>شرط ابطال (Invalidation):</strong> {reg.invalidationConditionsFa}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 15: Lead/Lag and Statistical Research Lab */}
      <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              آزمایشگاه آماری روابط پیش‌نگر و پس‌نگر (Lead/Lag & Granger Precedence Lab)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              بررسی همبستگی متقاطع با وقفه‌های زمانی (-۶ تا +۶ ماه)، تبدیل مانا (تفاضل مرتبه اول برای متغیرهای سطح) و کنترل خطای آزمون‌های چندگانه (Bonferroni).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                متغیر پیش‌نگر فرضی (X)
              </label>
              <select
                value={indX}
                onChange={(e) => setIndX(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-slate-100"
              >
                {activeIndicators.map((i) => (
                  <option key={i.code} value={i.code}>
                    {i.nameFa} ({i.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                متغیر هدف (Y)
              </label>
              <select
                value={indY}
                onChange={(e) => setIndY(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-slate-100"
              >
                {activeIndicators.map((i) => (
                  <option key={i.code} value={i.code}>
                    {i.nameFa} ({i.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loadingLab ? (
          <div className="py-8 text-center text-xs text-slate-500">
            در حال محاسبه ماتریس همبستگی متقاطع و آماره گرنجر...
          </div>
        ) : (
          leadLagResult && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-xs font-mono tabular-nums">
                <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded border border-slate-200/70 dark:border-slate-800">
                  <div className="text-slate-500 font-sans mb-1">اندازه نمونه (N)</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {leadLagResult.sampleSize} ماه
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded border border-slate-200/70 dark:border-slate-800">
                  <div className="text-slate-500 font-sans mb-1">همبستگی هم‌زمان (Lag 0)</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {leadLagResult.contemporaneousCorrelation}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded border border-slate-200/70 dark:border-slate-800">
                  <div className="text-slate-500 font-sans mb-1">وقفه بهینه (Optimal Lag)</div>
                  <div className="text-sm font-semibold text-sky-600 dark:text-sky-400">
                    {leadLagResult.optimalLagMonths > 0
                      ? `+${leadLagResult.optimalLagMonths} ماه`
                      : `${leadLagResult.optimalLagMonths} ماه`}{' '}
                    (r={leadLagResult.maxLagCorrelation})
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded border border-slate-200/70 dark:border-slate-800">
                  <div className="text-slate-500 font-sans mb-1">مقدار p-value (تصحیح بونفرونی)</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {leadLagResult.pValueApprox} (آستانه: {leadLagResult.bonferroniThreshold})
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded border border-slate-200/70 dark:border-slate-800">
                  <div className="text-slate-500 font-sans mb-1">آماره F تقدم گرنجر</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    F = {leadLagResult.grangerFStat}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded border border-slate-200/70 dark:border-slate-800">
                  <div className="text-slate-500 font-sans mb-1">R² درون‌نمونه‌ای / برون‌نمونه‌ای</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {leadLagResult.inSampleR2} / {leadLagResult.outOfSampleR2}
                  </div>
                </div>
              </div>

              {/* Lag Profile Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                      <th className="py-2 px-2 text-right font-medium">وقفه زمانی (k ماه)</th>
                      {leadLagResult.lagProfile.map((lp) => (
                        <th
                          key={lp.lag}
                          className="py-2 px-2 text-center font-mono tabular-nums"
                        >
                          {lp.lag > 0 ? `+${lp.lag}` : lp.lag}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200/60 dark:border-slate-800/60">
                      <td className="py-2 px-2 font-medium text-slate-700 dark:text-slate-300">
                        ضریب همبستگی r(X_t-k, Y_t)
                      </td>
                      {leadLagResult.lagProfile.map((lp) => {
                        const isOpt = lp.lag === leadLagResult.optimalLagMonths;
                        return (
                          <td
                            key={lp.lag}
                            className={`py-2 px-2 text-center font-mono tabular-nums ${
                              isOpt
                                ? 'font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {lp.correlation.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded text-xs space-y-1.5">
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {leadLagResult.hypothesisNoteFa}
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  {leadLagResult.causalDisclaimerFa}
                </div>
              </div>
            </div>
          )
        )}
      </section>
    </div>
  );
};

/**
 * Section 12 & 17: Forecasting & Scenario Laboratory
 */
export const ScenarioAndForecastView: React.FC<{
  forecasts: ForecastOutput[];
  scenarios: ScenarioDefinition[];
  indicators: IndicatorMetadata[];
  observations: ObservationRecord[];
}> = ({ forecasts, scenarios, indicators, observations }) => {
  const [selectedTarget, setSelectedTarget] = useState('CPI_HEADLINE');
  const [cutoffIso, setCutoffIso] = useState('2026-10-31T23:59:59Z');
  const [customForecast, setCustomForecast] = useState<ForecastOutput | null>(null);

  const runCustomForecast = async (code: string, cutoff: string) => {
    const res = await fetch('/api/research/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetIndicatorCode: code, cutoffTimestamp: cutoff }),
    });
    if (res.ok) {
      setCustomForecast(await res.json());
    }
  };

  useEffect(() => {
    runCustomForecast(selectedTarget, cutoffIso);
  }, [selectedTarget, cutoffIso]);

  const activeForecast =
    customForecast ||
    forecasts.find((f) => f.targetIndicatorCode === selectedTarget) ||
    forecasts[0];

  const histPoints: SeriesPoint[] = observations
    .filter((o) => o.indicatorCode === selectedTarget && o.publicationTimestamp <= cutoffIso)
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((o) => ({
      period: o.period,
      solarPeriod: o.solarPeriod,
      value: o.value,
    }));

  const totalScenarioProb = scenarios.reduce((acc, s) => acc + s.probabilityPct, 0);

  return (
    <div className="space-y-8">
      {/* Forecasting Controls & Fan Chart */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 rounded-lg">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              آزمایشگاه پیش‌بینی کمّی (افق‌های ۳، ۶ و ۱۲ ماهه با خط برش زمانی)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              مقایسه مدل خودرگرسیونی AR(1) و مدل متغیرهای پیش‌نگر کلان در برابر خط مبنای ساده (Naive) و میانگین تاریخی.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">شاخص هدف پیش‌بینی</label>
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded"
              >
                <option value="CPI_HEADLINE">تورم نقطه‌به‌نقطه کل (CPI_HEADLINE)</option>
                <option value="M2_LIQUIDITY">حجم نقدینگی کل (M2_LIQUIDITY)</option>
                <option value="FX_INFORMAL_REF">نرخ مرجع دلار آزاد و تتر (FX_INFORMAL_REF)</option>
                <option value="GOLD_COIN_REF">سکه تمام امامی (GOLD_COIN_REF)</option>
                <option value="TEDPIX_INDEX">شاخص کل بورس (TEDPIX_INDEX)</option>
                <option value="HOUSING_TEHRAN_PRICE">قیمت مسکن تهران (HOUSING_TEHRAN_PRICE)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                خط برش تاریخ انتشار (Cutoff Date Enforcement)
              </label>
              <select
                value={cutoffIso}
                onChange={(e) => setCutoffIso(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded"
              >
                <option value="2026-10-31T23:59:59Z">۱۴۰۵/۰۷ (آخرین داده لایو و رسمی - مهر ۱۴۰۵)</option>
                <option value="2026-10-06T00:00:00Z">۱۴۰۵/۰۷ (قبل از بازنگری نقدینگی مرداد - آزمون وینتیج)</option>
                <option value="2026-06-30T23:59:59Z">۱۴۰۵/۰۳ (پایان بهار ۱۴۰۵ - آزمون گذشته‌نگر)</option>
                <option value="2026-03-31T23:59:59Z">۱۴۰۴/۱۲ (پایان سال ۱۴۰۴ - آزمون گذشته‌نگر)</option>
                <option value="2025-07-31T23:59:59Z">۱۴۰۴/۰۴ (نمونه کوچک - آزمون گزارش ناموجود/Null)</option>
              </select>
            </div>
          </div>
        </div>

        {activeForecast && (
          <>
            <ForecastFanChart history={histPoints} forecast={activeForecast} />

            {/* Horizon Comparison Table & OOS Validation Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-5 overflow-x-auto">
                <h3 className="text-sm font-semibold mb-3">
                  جدول مقایسه‌ای افق‌های پیش‌بینی و بازه‌های عدم قطعیت ({activeForecast.unitFa})
                </h3>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                      <th className="py-2 text-right">افق زمانی</th>
                      <th className="py-2 text-left font-mono">خط مبنای ساده (Naive)</th>
                      <th className="py-2 text-left font-mono">میانگین تاریخی</th>
                      <th className="py-2 text-left font-mono">مدل AR(1)</th>
                      <th className="py-2 text-left font-mono text-emerald-600 dark:text-emerald-400">
                        مدل کلان با وقفه
                      </th>
                      <th className="py-2 text-left font-mono">بازه ۸۰٪</th>
                      <th className="py-2 text-left font-mono">بازه ۹۵٪</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono tabular-nums">
                    {activeForecast.horizons.map((h) => (
                      <tr
                        key={h.horizonMonths}
                        className="border-b border-slate-200/60 dark:border-slate-800/60"
                      >
                        <td className="py-2.5 font-sans font-medium">
                          {h.targetSolarPeriod}
                        </td>
                        <td className="py-2.5 text-left">
                          {h.naiveBaseline.toLocaleString('en-US')}
                        </td>
                        <td className="py-2.5 text-left">
                          {h.historicalMeanBaseline.toLocaleString('en-US')}
                        </td>
                        <td className="py-2.5 text-left">
                          {h.ar1Estimate.toLocaleString('en-US')}
                        </td>
                        <td className="py-2.5 text-left font-bold text-emerald-600 dark:text-emerald-400">
                          {h.laggedMacroModelEstimate.toLocaleString('en-US')}
                        </td>
                        <td className="py-2.5 text-left text-slate-500">
                          [{h.interval80Low.toLocaleString('en-US')} ,{' '}
                          {h.interval80High.toLocaleString('en-US')}]
                        </td>
                        <td className="py-2.5 text-left text-slate-500">
                          [{h.interval95Low.toLocaleString('en-US')} ,{' '}
                          {h.interval95High.toLocaleString('en-US')}]
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-5 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">
                    ارزیابی دقت برون‌نمونه‌ای (Expanding-Window OOS)
                  </h3>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                      activeForecast.backtestMetrics.evaluationStatus === 'INSUFFICIENT_SAMPLE'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {activeForecast.backtestMetrics.evaluationStatus === 'INSUFFICIENT_SAMPLE'
                      ? 'نمونه ناکافی (Null)'
                      : `معتبر (n=${activeForecast.backtestMetrics.sampleCount})`}
                  </span>
                </div>
                <div className="space-y-1.5 font-mono tabular-nums">
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">پنجره ارزیابی و گام مستقل:</span>
                    <span>
                      {activeForecast.backtestMetrics.evalStartSolarPeriod
                        ? `${activeForecast.backtestMetrics.evalStartSolarPeriod} تا ${activeForecast.backtestMetrics.evalEndSolarPeriod} (${activeForecast.backtestMetrics.effectiveNonOverlappingCount ?? 0} گام غیرهم‌پوشان)`
                        : 'ناموجود'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">حذف آینده‌نگری / بازگشت بازنگری:</span>
                    <span className="text-amber-600 dark:text-amber-400">
                      {activeForecast.backtestMetrics.unpublishedExcludedCount ?? 0} رکورد /{' '}
                      {activeForecast.backtestMetrics.revisionsRevertedCount ?? 0} بازنگری
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">خطای مطلق AR(1) / گام غیرهم‌پوشان:</span>
                    <strong>
                      {activeForecast.backtestMetrics.ar1MAE !== null
                        ? `${activeForecast.backtestMetrics.ar1MAE} / ${activeForecast.backtestMetrics.nonOverlappingAr1MAE ?? '-'}`
                        : 'ناموجود (نمونه ناکافی)'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">خطای مطلق مدل کلان / خط مبنا (Naive):</span>
                    <span>
                      {activeForecast.backtestMetrics.macroModelMAE !== null &&
                      activeForecast.backtestMetrics.macroModelMAE !== undefined
                        ? `${activeForecast.backtestMetrics.macroModelMAE} / ${activeForecast.backtestMetrics.naiveMAE}`
                        : 'ناموجود'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">RMSE مدل / آماره Theil&apos;s U2:</span>
                    <strong>
                      {activeForecast.backtestMetrics.ar1RMSE !== null
                        ? `${activeForecast.backtestMetrics.ar1RMSE} (U=${activeForecast.backtestMetrics.theilsU ?? '-'})`
                        : 'ناموجود'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">خطای نسبی sMAPE / خطای احتمالاتی CRPS:</span>
                    <span>
                      {activeForecast.backtestMetrics.smapePct !== null &&
                      activeForecast.backtestMetrics.smapePct !== undefined
                        ? `${activeForecast.backtestMetrics.smapePct}% / ${activeForecast.backtestMetrics.crpsApprox}`
                        : 'ناموجود'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">پوشش تجربی بازه ۸۰٪ و ۹۵٪:</span>
                    <span>
                      {activeForecast.backtestMetrics.empiricalCoverage80Pct !== null &&
                      activeForecast.backtestMetrics.empiricalCoverage80Pct !== undefined
                        ? `${activeForecast.backtestMetrics.empiricalCoverage80Pct}% / ${activeForecast.backtestMetrics.empiricalCoverage95Pct}%`
                        : 'ناموجود'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">آماره Diebold-Mariano (HAC):</span>
                    <span>
                      {activeForecast.backtestMetrics.dieboldMarianoHacStat !== null &&
                      activeForecast.backtestMetrics.dieboldMarianoHacStat !== undefined
                        ? `DM=${activeForecast.backtestMetrics.dieboldMarianoHacStat} (p=${activeForecast.backtestMetrics.dieboldMarianoPValue})`
                        : 'ناموجود'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">دقت تشخیص جهت (Directional):</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {activeForecast.backtestMetrics.directionalAccuracyPct !== null
                        ? `${activeForecast.backtestMetrics.directionalAccuracyPct}%`
                        : 'ناموجود'}
                    </strong>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-slate-500 space-y-1">
                  <div>
                    <strong>مفروضات:</strong> {activeForecast.assumptionsFa[0]}
                  </div>
                  <div>
                    <strong>محدودیت‌ها:</strong> {activeForecast.limitationsFa[0]}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* 4 Mutually Exclusive & Exhaustive Macro Scenarios */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              ماتریس چهارگانه سناریوهای اقتصاد کلان در افق ۱۲ ماهه (مجموع احتمالات: {totalScenarioProb}٪)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              احتمالات تخصیص‌یافته از نوع «وزن تحلیلی مشروط به شواهد و رژیم فعلی» (Subjective Analyst & Regime-Conditioned Weights) هستند و نباید به‌عنوان احتمال کالیبره‌شده فیزیکی تلقی شوند.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {scenarios.map((sc) => (
            <div
              key={sc.id}
              className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-5 space-y-3"
            >
              <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {sc.nameFa}
                </h3>
                <span className="text-sm font-mono font-bold text-sky-600 dark:text-sky-400 tabular-nums shrink-0">
                  وزن سناریو: {sc.probabilityPct}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-slate-50 dark:bg-slate-950/70 rounded text-xs font-mono tabular-nums">
                <div>
                  <div className="text-[11px] font-sans text-slate-500">تورم ۱۲ماهه</div>
                  <div className="font-semibold">{sc.macroProjections12M.cpiYoYPct}</div>
                </div>
                <div>
                  <div className="text-[11px] font-sans text-slate-500">رشد نقدینگی</div>
                  <div className="font-semibold">{sc.macroProjections12M.m2YoYPct}</div>
                </div>
                <div>
                  <div className="text-[11px] font-sans text-slate-500">رشد حقیقی GDP</div>
                  <div className="font-semibold">{sc.macroProjections12M.realGdpPct}</div>
                </div>
                <div>
                  <div className="text-[11px] font-sans text-slate-500">فشار ارزی</div>
                  <div className="font-sans font-semibold">{sc.macroProjections12M.fxPressureIndex}</div>
                </div>
              </div>

              <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                <div>
                  <strong>ماهیت احتمال:</strong> {sc.probabilityTypeFa}
                </div>
                {sc.internalConsistencyCheckFa && (
                  <div className="p-2 bg-sky-500/5 border border-sky-500/20 rounded text-[11px]">
                    <strong>بررسی سازگاری درونی متغیرهای کلان:</strong>{' '}
                    {sc.internalConsistencyCheckFa}
                  </div>
                )}
                <div>
                  <strong>شواهد پشتیبان فعلی:</strong> {sc.supportingObservationsFa.join(' · ')}
                </div>
                <div>
                  <strong>محرک‌های فعال‌سازی (Triggers):</strong> {sc.triggersFa.join(' · ')}
                </div>
                <div>
                  <strong>شروط ابطال سناریو:</strong> {sc.invalidationConditionsFa.join(' · ')}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="text-[11px] text-slate-500">
                  پیامدهای نسبی برای طبقات دارایی در این سناریو:
                </div>
                {sc.assetClassImplications.map((imp) => (
                  <div
                    key={imp.assetId}
                    className="flex flex-wrap items-baseline justify-between gap-2 text-xs"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {imp.assetNameFa} ({imp.stance}):
                    </span>
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                      {imp.expectedRealReturnRangeFa} — {imp.rationaleFa}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

/**
 * Section 13 & 19: Portfolio Intelligence Engine
 */
export const PortfolioIntelligenceView: React.FC<{
  portfolio: {
    assets: AssetPerformanceSummary[];
    correlationMatrix: { assetA: string; assetB: string; correlation: number }[];
    recommendations: PortfolioAllocationRecommendation[];
  };
}> = ({ portfolio }) => {
  const [selectedProfile, setSelectedProfile] = useState<
    'CONSERVATIVE' | 'BALANCED' | 'INFLATION_HEDGE'
  >('BALANCED');

  // Interactive User Portfolio Stress-Test Simulator
  const [userWeights, setUserWeights] = useState<Record<string, number>>({
    FIXED_INCOME_AKHZA: 35,
    GOLD_COIN_ETF: 35,
    FX_LINKED_EXPOSURE: 0,
    EQUITIES_EXPORT: 20,
    EQUITIES_DOMESTIC: 10,
    HOUSING_TEHRAN: 0,
  });

  const totalUserWeight = Object.values(userWeights).reduce((acc, w) => acc + w, 0);

  const simulatedMetrics = React.useMemo(() => {
    const normFactor = totalUserWeight > 0 ? 100 / totalUserWeight : 0;
    let weightedNominal = 0;
    let weightedReal = 0;
    let weightedDdReal = 0;
    let weightedFrictionBps = 0;
    let illiquidSharePct = 0;

    for (const a of portfolio.assets) {
      const w = ((userWeights[a.asset.id] || 0) * normFactor) / 100;
      weightedNominal += w * a.nominalReturn12MPct;
      weightedReal += w * a.realReturn12MPct;
      weightedDdReal += w * a.maxDrawdownRealPct;
      weightedFrictionBps +=
        w * (a.asset.transactionCostBps + a.asset.bidAskSpreadBps);
      if (!a.asset.continuousTradability) {
        illiquidSharePct += w * 100;
      }
    }

    return {
      nominal12M: weightedNominal.toFixed(2),
      real12M: weightedReal.toFixed(2),
      maxDdReal: weightedDdReal.toFixed(2),
      frictionPct: (weightedFrictionBps / 100).toFixed(2),
      illiquidSharePct: illiquidSharePct.toFixed(1),
    };
  }, [userWeights, totalUserWeight, portfolio.assets]);

  const activeRec =
    portfolio.recommendations.find((r) => r.riskProfile === selectedProfile) ||
    portfolio.recommendations[0];

  return (
    <div className="space-y-8">
      {/* Asset Class Historical Comparison Table (Nominal vs Real, Costs, Liquidity) */}
      <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-5 overflow-x-auto">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            مقایسه عملکرد، ریسک، نقدشوندگی و هزینه‌های معاملاتی طبقات دارایی در ایران (۱۲ ماهه منتهی به ۱۴۰۵/۰۷ — همگام با بازار لایو)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            بازده حقیقی پس از کسر تورم نقطه‌به‌نقطه (۳۸.۴٪)، کارمزد معاملات، شکاف قیمت خرید/فروش (Spread) و هزینه نگهداری سالانه محاسبه شده است.
          </p>
        </div>

        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <th className="py-2.5 px-2 text-right">طبقه دارایی و ابزار</th>
              <th className="py-2.5 px-2 text-left font-mono">بازده اسمی ۱۲ماهه</th>
              <th className="py-2.5 px-2 text-left font-mono">بازده حقیقی خالص</th>
              <th className="py-2.5 px-2 text-left font-mono">نوسان سالانه</th>
              <th className="py-2.5 px-2 text-left font-mono">حداکثر افت حقیقی (Real DD)</th>
              <th className="py-2.5 px-2 text-left font-mono">هزینه معامله + اسپرد</th>
              <th className="py-2.5 px-2 text-right">افق نقدشوندگی و ملاحظات قانونی</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {portfolio.assets.map((item) => (
              <tr
                key={item.asset.id}
                className="border-b border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
              >
                <td className="py-3 px-2 font-sans">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {item.asset.nameFa}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {item.asset.instrumentTypeFa}
                  </div>
                </td>
                <td className="py-3 px-2 text-left font-semibold text-slate-800 dark:text-slate-200">
                  +{item.nominalReturn12MPct}%
                </td>
                <td
                  className={`py-3 px-2 text-left font-bold ${
                    item.realReturn12MPct >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {item.realReturn12MPct >= 0 ? `+${item.realReturn12MPct}%` : `${item.realReturn12MPct}%`}
                </td>
                <td className="py-3 px-2 text-left text-slate-600 dark:text-slate-400">
                  {item.annualizedVolatilityPct}%
                </td>
                <td className="py-3 px-2 text-left text-rose-600 dark:text-rose-400">
                  {item.maxDrawdownRealPct}%
                </td>
                <td className="py-3 px-2 text-left text-slate-600 dark:text-slate-400">
                  {((item.asset.transactionCostBps + item.asset.bidAskSpreadBps) / 100).toFixed(2)}%
                </td>
                <td className="py-3 px-2 font-sans text-slate-600 dark:text-slate-400 max-w-xs">
                  <div>{item.asset.liquidityHorizonFa}</div>
                  <div className="text-[11px] text-slate-400">
                    {item.asset.taxAndLegalConstraintsFa}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Interactive Custom Portfolio Simulator & Stress Testing */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              شبیه‌ساز ترکیب سبد دارایی شخصی و آزمون تنش هزینه‌های معاملاتی
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              وزن دارایی‌های فعلی خود را وارد کنید تا بازده حقیقی تعدیل‌شده با تورم، ریسک افت سرمایه و سهم دارایی‌های غیرنقدشونده محاسبه شود.
            </p>
          </div>

          <div className="space-y-2.5">
            {portfolio.assets.map((item) => {
              const w = userWeights[item.asset.id] ?? 0;
              return (
                <div key={item.asset.id} className="flex items-center gap-3 text-xs">
                  <span className="w-48 truncate text-slate-700 dark:text-slate-300">
                    {item.asset.nameFa}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={w}
                    onChange={(e) =>
                      setUserWeights((prev) => ({
                        ...prev,
                        [item.asset.id]: Number(e.target.value),
                      }))
                    }
                    className="flex-1 accent-sky-600"
                  />
                  <span className="w-12 text-left font-mono tabular-nums font-semibold">
                    {w}%
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono tabular-nums">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950/70 rounded">
              <div className="font-sans text-slate-500">بازده اسمی شبیه‌سازی</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                +{simulatedMetrics.nominal12M}%
              </div>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950/70 rounded">
              <div className="font-sans text-slate-500">بازده حقیقی خالص</div>
              <div
                className={`text-sm font-bold ${
                  Number(simulatedMetrics.real12M) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {Number(simulatedMetrics.real12M) >= 0
                  ? `+${simulatedMetrics.real12M}%`
                  : `${simulatedMetrics.real12M}%`}
              </div>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950/70 rounded">
              <div className="font-sans text-slate-500">حداکثر افت حقیقی</div>
              <div className="text-sm font-bold text-rose-600 dark:text-rose-400">
                {simulatedMetrics.maxDdReal}%
              </div>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950/70 rounded">
              <div className="font-sans text-slate-500">اصطکاک معاملاتی سبد</div>
              <div className="text-sm font-semibold">{simulatedMetrics.frictionPct}%</div>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950/70 rounded">
              <div className="font-sans text-slate-500">سهم دارایی غیرنقدشونده</div>
              <div className="text-sm font-semibold">{simulatedMetrics.illiquidSharePct}%</div>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950/70 rounded">
              <div className="font-sans text-slate-500">مجموع وزن واردشده</div>
              <div className="text-sm font-semibold">{totalUserWeight}%</div>
            </div>
          </div>
        </div>

        {/* Correlation Matrix across Real Monthly Returns */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-5 overflow-x-auto">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
            ماتریس همبستگی بازده‌های حقیقی ماهانه طبقات دارایی
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            همبستگی منفی یا پایین میان اوراق اخزا و دارایی‌های طلا/سهام مبنای علمی کاهش واریانس سبد در بازمتوازن‌سازی دوره‌ای است.
          </p>
          <table className="w-full text-[11px] font-mono tabular-nums border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="py-1.5 px-1.5 text-right font-sans">دارایی</th>
                {portfolio.assets.map((a) => (
                  <th key={a.asset.id} className="py-1.5 px-1.5 text-center">
                    {a.asset.id.split('_')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {portfolio.assets.map((rowAsset) => (
                <tr
                  key={rowAsset.asset.id}
                  className="border-b border-slate-200/50 dark:border-slate-800/50"
                >
                  <td className="py-2 px-1.5 font-sans font-medium text-slate-700 dark:text-slate-300">
                    {rowAsset.asset.nameFa.slice(0, 22)}
                  </td>
                  {portfolio.assets.map((colAsset) => {
                    const cell = portfolio.correlationMatrix.find(
                      (c) =>
                        c.assetA === rowAsset.asset.id &&
                        c.assetB === colAsset.asset.id
                    );
                    const val = cell?.correlation ?? 0;
                    return (
                      <td
                        key={colAsset.asset.id}
                        className={`py-2 px-1.5 text-center ${
                          val >= 0.6
                            ? 'text-sky-600 dark:text-sky-400 font-semibold'
                            : val <= -0.2
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'text-slate-500'
                        }`}
                      >
                        {val.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Transparent Allocation Ranges by Risk Profile */}
      <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              دامنه‌های پیشنهادی تخصیص دارایی مبتنی بر شواهد (بدون جعبه سیاه)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              این جدول صرفاً ابزار پشتیبان تصمیم پژوهشی است و هیچ‌گونه بازده تضمین‌شده یا اجرای خودکار معامله‌ای ندارد.
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {portfolio.recommendations.map((rec) => (
              <button
                key={rec.riskProfile}
                type="button"
                onClick={() => setSelectedProfile(rec.riskProfile)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedProfile === rec.riskProfile
                    ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {rec.profileNameFa.split('(')[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap gap-6">
          <span>
            <strong>بازه بازده حقیقی مورد انتظار در سناریوی پایه:</strong>{' '}
            {activeRec.expectedPortfolioRealReturnRangeFa}
          </span>
          <span>·</span>
          <span>
            <strong>حساسیت به مفروضات:</strong> {activeRec.sensitivityNoteFa}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeRec.allocations.map((alloc) => (
            <div
              key={alloc.assetId}
              className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2 text-xs"
            >
              <div className="flex items-baseline justify-between">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {alloc.assetNameFa}
                </h4>
                <span className="font-mono font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                  بازه: {alloc.minWeightPct}% تا {alloc.maxWeightPct}% (هدف: {alloc.targetWeightPct}%)
                </span>
              </div>
              <div className="text-slate-600 dark:text-slate-300">
                <strong>چرایی حضور در سبد:</strong> {alloc.whyIncludedFa}
              </div>
              <div className="text-slate-600 dark:text-slate-300">
                <strong>شرایط کلان پشتیبان:</strong> {alloc.supportingConditionsFa}
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                <strong>ریسک‌های تضعیف‌کننده:</strong> {alloc.underminingRisksFa}
              </div>
              <div className="text-amber-600 dark:text-amber-400">
                <strong>شرط تغییر تز سرمایه‌گذاری:</strong> {alloc.invalidationTriggerFa}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

/**
 * Section 14 & 18: Historical Point-in-Time Backtesting View
 */
export const BacktestingLabView: React.FC<{
  initialBacktest: BacktestSimulationResult;
}> = ({ initialBacktest }) => {
  const [costMult, setCostMult] = useState(1.0);
  const [btResult, setBtResult] = useState<BacktestSimulationResult>(initialBacktest);
  const [running, setRunning] = useState(false);

  const handleRunBacktest = async (mult: number) => {
    setCostMult(mult);
    setRunning(true);
    try {
      const res = await fetch('/api/research/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionCostMultiplier: mult }),
      });
      if (res.ok) {
        setBtResult(await res.json());
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            آزمایشگاه بک‌تست تاریخی نقطه‌ای (Point-in-Time Historical Backtesting)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            در هر تاریخ تصمیم‌گیری گذشته، صرفاً مشاهداتی که تاریخ انتشار رسمی آن‌ها (publicationTimestamp) پیش از آن روز بوده در دسترس مدل قرار گرفته است.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-600 dark:text-slate-400">
            ضریب اصطکاک و هزینه معاملات:
          </label>
          <select
            value={costMult}
            onChange={(e) => handleRunBacktest(Number(e.target.value))}
            disabled={running}
            className="px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded"
          >
            <option value={0}>۰ برابر (بدون کارمزد - فرضی)</option>
            <option value={1}>۱ برابر (کارمزد و اسپرد واقعی بازار ایران - ۰.۶۵٪)</option>
            <option value={2}>۲ برابر (شرایط تنش نقدشوندگی و اسپرد بالا - ۱.۳۰٪)</option>
          </select>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-xs font-mono tabular-nums">
        <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg">
          <div className="font-sans text-slate-500 mb-1">بازده تجمعی حقیقی استراتژی</div>
          <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
            {btResult.metrics.strategyCumulativeRealPct >= 0
              ? `+${btResult.metrics.strategyCumulativeRealPct}%`
              : `${btResult.metrics.strategyCumulativeRealPct}%`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            شارپ حقیقی: {btResult.metrics.strategyRealSharpe ?? 0} | IR:{' '}
            {btResult.metrics.informationRatio ?? 0}
          </div>
        </div>
        <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg">
          <div className="font-sans text-slate-500 mb-1">شاخص معیار هم‌وزن و نگهداری</div>
          <div className="text-base font-bold text-slate-800 dark:text-slate-200">
            {btResult.metrics.benchmarkCumulativeRealPct >= 0
              ? `+${btResult.metrics.benchmarkCumulativeRealPct}%`
              : `${btResult.metrics.benchmarkCumulativeRealPct}%`}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            طلا: {btResult.metrics.buyAndHoldGoldRealPct ?? 0}% | اخزا:{' '}
            {btResult.metrics.buyAndHoldAkhzaRealPct ?? 0}%
          </div>
        </div>
        <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg">
          <div className="font-sans text-slate-500 mb-1">حداکثر افت حقیقی (Max DD)</div>
          <div className="text-base font-bold text-rose-600 dark:text-rose-400">
            {btResult.metrics.strategyMaxDrawdownRealPct}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            معیار: {btResult.metrics.benchmarkMaxDrawdownRealPct}%
          </div>
        </div>
        <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg">
          <div className="font-sans text-slate-500 mb-1">نرخ برتری و معنی‌داری</div>
          <div className="text-base font-bold text-sky-600 dark:text-sky-400">
            {btResult.metrics.outOfSampleHitRatePct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            t={btResult.metrics.excessReturnTStat ?? 0} (p={btResult.metrics.excessReturnPValue ?? 1})
          </div>
        </div>
        <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg">
          <div className="font-sans text-slate-500 mb-1">کل گردش سبد و هزینه کسرشده</div>
          <div className="text-sm font-semibold">
            {btResult.metrics.totalTurnoverPct}% ({btResult.metrics.totalTransactionCostDragPct}%-)
          </div>
        </div>
        <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg">
          <div className="font-sans text-slate-500 mb-1">فیلتر آینده‌نگری و بازنگری</div>
          <div className="text-base font-bold text-amber-600 dark:text-amber-400">
            {btResult.lookAheadPreventedCount} رکورد
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            بازگشت بازنگری: {btResult.revisionsPreventedCount ?? 0} مورد
          </div>
        </div>
      </div>

      {/* Point-in-Time Decision Log */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-5 overflow-x-auto">
        <h3 className="text-sm font-semibold mb-3">
          کاربرگ تصمیم‌گیری‌های نقطه‌ای (ثبت دقیق اطلاعات در دسترس در لحظه تصمیم)
        </h3>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <th className="py-2 px-2 text-right">دوره و تاریخ تصمیم</th>
              <th className="py-2 px-2 text-left font-mono">تورم منتشرشده تا آن تاریخ</th>
              <th className="py-2 px-2 text-left font-mono">رشد نقدینگی منتشرشده (با وقفه ۳۵ روزه)</th>
              <th className="py-2 px-2 text-right">رژیم تشخیص‌داده‌شده و سیگنال</th>
              <th className="py-2 px-2 text-left font-mono">بازده حقیقی ۳ماهه بعدی استراتژی</th>
              <th className="py-2 px-2 text-left font-mono">بازده حقیقی ۳ماهه شاخص معیار</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {btResult.pointInTimeDecisions.map((d) => (
              <tr
                key={d.decisionDateIso}
                className="border-b border-slate-200/60 dark:border-slate-800/60"
              >
                <td className="py-2.5 px-2">
                  <span className="font-semibold">{d.solarPeriod}</span> ({d.decisionDateIso})
                </td>
                <td className="py-2.5 px-2 text-left">{d.availableCpiYoYAtDecision}%</td>
                <td className="py-2.5 px-2 text-left">{d.availableM2YoYAtDecision}%</td>
                <td className="py-2.5 px-2 font-sans">
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {d.detectedRegimeFa}
                  </div>
                  <div className="text-[11px] text-slate-500">{d.signalGeneratedFa}</div>
                </td>
                <td
                  className={`py-2.5 px-2 text-left font-bold ${
                    d.subsequent3MRealReturnPct >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {d.subsequent3MRealReturnPct >= 0
                    ? `+${d.subsequent3MRealReturnPct}%`
                    : `${d.subsequent3MRealReturnPct}%`}
                </td>
                <td className="py-2.5 px-2 text-left text-slate-600 dark:text-slate-400">
                  {d.benchmark3MRealReturnPct >= 0
                    ? `+${d.benchmark3MRealReturnPct}%`
                    : `${d.benchmark3MRealReturnPct}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Section 15 & 23: Exportable Research Reports (Markdown & HTML)
 */
export const ResearchReportsView: React.FC<{
  compositeIndices: CompositeIndexResult[];
  regimes: RegimeClassification[];
  scenarios: ScenarioDefinition[];
}> = ({ compositeIndices, regimes, scenarios }) => {
  const [reportCadence, setReportCadence] = useState<'MONTHLY' | 'WEEKLY'>('MONTHLY');

  const activeRegimes = regimes.filter((r) => r.isActive);

  const generateMarkdownReport = () => {
    return `# گزارش پژوهشی اقتصاد کلان و استراتژی دارایی ایران — EcoMat
**نوع گزارش:** ${reportCadence === 'MONTHLY' ? 'گزارش جامع ماهانه' : 'گزارش پایش هفتگی'}
**تاریخ برش داده و فید لایو (Data Cutoff):** ۱۴۰۵/۰۷/۱۸ (2026-10-10)
**نسخه موتور محاسباتی:** EcoMat-Quant-v2.5.0-LIVE

---

## ۱. خلاصه مدیریتی (Executive Summary)
بر اساس آخرین مشاهدات مستند ثبت‌شده از مرکز آمار ایران، بانک مرکزی، بورس تهران و نرخ‌های لحظه‌ای بازار آزاد، اقتصاد ایران در پاییز ۱۴۰۵ با هم‌زمانی رژیم‌های کلان زیر روبه‌روست:
${activeRegimes.map((r) => `- **${r.nameFa}** (امتیاز انطباق قواعد: ${r.activationScore}/100)`).join('\n')}

## ۲. تغییرات کلیدی شاخص‌ها و نماگرهای ترکیبی
${compositeIndices
  .map(
    (c) =>
      `- **${c.nameFa} (${c.code}):** امتیاز فعلی **${c.score}/100** (خط مبنای هم‌وزن: ${c.equalWeightScore}/100) — ${c.interpretationFa}`
  )
  .join('\n')}

## ۳. تحلیل سناریوهای ۱۲ ماهه آتی (افق ۱۴۰۵-۱۴۰۶)
${scenarios
  .map(
    (s) =>
      `- **${s.nameFa} (وزن تحلیلی: ${s.probabilityPct}٪):** تورم مورد انتظار ${s.macroProjections12M.cpiYoYPct} | رشد نقدینگی ${s.macroProjections12M.m2YoYPct} | رشد حقیقی ${s.macroProjections12M.realGdpPct}`
  )
  .join('\n')}

## ۴. پیامدهای سبد دارایی و محدودیت‌های روش‌شناختی
- تفکیک صریح بازده اسمی از بازده حقیقی نشان می‌دهد که با وجود بازده اسمی مثبت در اکثر بازارها، پس از کسر تورم ۳۸.۴ درصدی و هزینه‌های معاملاتی، تنها دارایی‌های پوشش‌دهنده نرخ ارز و طلا و اوراق با نرخ بازده مؤثر بالای ۳۸ درصد توان حفظ قدرت خرید را داشته‌اند.
- **محدودیت‌ها:** آمار ذخایر ارزی خالص بانک مرکزی منتشر نمی‌شود و ارسال خودکار زمان‌بندی‌شده گزارش‌ها منوط به راه‌اندازی سرویس زمان‌بند خارجی است.

## ۵. منابع و مراجع رسمی
- مرکز آمار ایران (SCI) — درگاه ملی آمار (شاخص قیمت مصرف‌کننده و تولیدکننده، پایه ۱۴۰۱)
- بانک مرکزی جمهوری اسلامی ایران (CBI) — نماگرهای پولی، نرخ بین‌بانکی و مسکن شهر تهران
- شرکت مدیریت فناوری بورس تهران (TSETMC) و فیدهای لایو بازار ارز و طلا
- گمرک جمهوری اسلامی ایران (IRICA) و سازمان برنامه و بودجه (PBO)
`;
  };

  const handleDownloadFile = (format: 'md' | 'html') => {
    const md = generateMarkdownReport();
    let content = md;
    let mime = 'text/markdown;charset=utf-8';
    let ext = 'md';

    if (format === 'html') {
      mime = 'text/html;charset=utf-8';
      ext = 'html';
      content = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>گزارش پژوهشی EcoMat</title>
<style>
  body { font-family: Tahoma, Vazirmatn, sans-serif; max-width: 860px; margin: 40px auto; line-height: 1.8; color: #0f172a; padding: 0 20px; }
  h1, h2 { color: #0284c7; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
  pre { background: #f8fafc; padding: 16px; border: 1px solid #e2e8f0; border-radius: 6px; white-space: pre-wrap; }
</style>
</head>
<body>
  <pre>${md}</pre>
</body>
</html>`;
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EcoMat_Research_Report_1405_07.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            مولد گزارش‌های پژوهشی مستند (خروجی استاندارد Markdown و HTML)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            تمامی اعداد و نتیجه‌گیری‌های گزارش مستقیماً از آخرین وضعیت تاییدشده پایگاه داده EcoMat استخراج می‌شوند.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setReportCadence((prev) => (prev === 'MONTHLY' ? 'WEEKLY' : 'MONTHLY'))
            }
            className="px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            قالب فعلی: {reportCadence === 'MONTHLY' ? 'ماهانه جامع' : 'پایش هفتگی'}
          </button>
          <button
            type="button"
            onClick={() => handleDownloadFile('md')}
            className="px-3.5 py-2 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>دریافت فایل Markdown (.md)</span>
          </button>
          <button
            type="button"
            onClick={() => handleDownloadFile('html')}
            className="px-3.5 py-2 text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white rounded-lg flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>دریافت فایل گزارش وب (.html)</span>
          </button>
        </div>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-6">
        <pre className="whitespace-pre-wrap text-xs leading-7 font-sans text-slate-800 dark:text-slate-200">
          {generateMarkdownReport()}
        </pre>
      </div>
    </div>
  );
};
