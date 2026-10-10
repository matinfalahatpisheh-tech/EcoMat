import React, { useState } from 'react';
import {
  AuditEventRecord,
  IndicatorMetadata,
  PipelineRunRecord,
  QualityIssue,
  ReleaseRecord,
  RevisionRecord,
  SourceRecord,
} from '../shared/types';
import { RefreshCw, Send, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Section 7, 8, 10, 11: Data Sources, Ingestion Pipeline, Revisions & Data Quality View
 */
export const DataSourcesAndQualityView: React.FC<{
  sources: SourceRecord[];
  indicators: IndicatorMetadata[];
  qualityIssues: QualityIssue[];
  revisions: RevisionRecord[];
  releases: ReleaseRecord[];
  pipelineRuns: PipelineRunRecord[];
  auditEvents: AuditEventRecord[];
  onOpenManualImport: () => void;
  onRefreshSnapshot: () => void;
}> = ({
  sources,
  qualityIssues,
  revisions,
  releases,
  pipelineRuns,
  auditEvents,
  onOpenManualImport,
  onRefreshSnapshot,
}) => {
  const [syncingWb, setSyncingWb] = useState(false);
  const [wbSyncMessage, setWbSyncMessage] = useState<string | null>(null);
  const [issueFilter, setIssueFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'INFO'>('ALL');

  const handleSyncWorldBank = async () => {
    setSyncingWb(true);
    setWbSyncMessage(null);
    try {
      const res = await fetch('/api/sources/sync-worldbank', { method: 'POST' });
      const data = await res.json();
      setWbSyncMessage(data.messageFa || 'همگام‌سازی انجام شد.');
      onRefreshSnapshot();
    } catch {
      setWbSyncMessage('خطا در برقراری ارتباط با وب‌سرویس بانک جهانی.');
    } finally {
      setSyncingWb(false);
    }
  };

  const filteredIssues =
    issueFilter === 'ALL'
      ? qualityIssues
      : qualityIssues.filter((i) => i.severity === issueFilter);

  return (
    <div className="space-y-8">
      {/* Source Registry & Connectors */}
      <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              رجیستری منابع رسمی داده و وضعیت اتصال‌دهنده‌ها (Source Registry & Connectors)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              تفکیک صریح منابع اولیه داخلی (نیازمند ورود فایل رسمی به دلیل محدودیت‌های دسترسی خودکار/کپچا) از وب‌سرویس‌های باز بین‌المللی.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSyncWorldBank}
              disabled={syncingWb}
              className="px-3.5 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingWb ? 'animate-spin' : ''}`} />
              <span>همگام‌سازی زنده API بانک جهانی (IRN)</span>
            </button>
            <button
              type="button"
              onClick={onOpenManualImport}
              className="px-3.5 py-2 text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white rounded-lg flex items-center gap-1.5 whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>ورود دستی فایل رسمی (CSV / JSON)</span>
            </button>
          </div>
        </div>

        {wbSyncMessage && (
          <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded text-xs text-sky-700 dark:text-sky-300">
            {wbSyncMessage}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-2.5 px-2 text-right">کد و نام مرجع رسمی</th>
                <th className="py-2.5 px-2 text-right">روش دریافت و تواتر</th>
                <th className="py-2.5 px-2 text-left font-mono">آخرین دریافت موفق</th>
                <th className="py-2.5 px-2 text-right">وضعیت طراوت داده</th>
                <th className="py-2.5 px-2 text-right">محدودیت‌ها و اعتبار منبع</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((src) => (
                <tr
                  key={src.id}
                  className="border-b border-slate-200/60 dark:border-slate-800/60"
                >
                  <td className="py-3 px-2">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {src.nameFa} ({src.id})
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">{src.url}</div>
                  </td>
                  <td className="py-3 px-2 text-slate-600 dark:text-slate-300">
                    <div>
                      {src.retrievalMethod === 'PUBLIC_API'
                        ? 'وب‌سرویس عمومی (REST API)'
                        : 'ورود کنترل‌شده فایل رسمی (CSV/JSON)'}
                    </div>
                    <div className="text-[11px] text-slate-500">{src.updateFrequencyFa}</div>
                  </td>
                  <td className="py-3 px-2 text-left font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {src.lastSuccessfulRetrieval
                      ? src.lastSuccessfulRetrieval.slice(0, 10)
                      : 'نامشخص'}
                  </td>
                  <td className="py-3 px-2 font-mono">
                    <span
                      className={
                        src.status === 'CURRENT'
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'text-amber-600 dark:text-amber-400 font-semibold'
                      }
                    >
                      {src.status === 'CURRENT'
                        ? 'به‌روز (Current)'
                        : 'دارای وقفه (Stale)'}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-slate-600 dark:text-slate-400 max-w-md">
                    <div>{src.reliabilityNotesFa}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      محدودیت: {src.limitationsFa}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Data Quality Engine Audit Table */}
      <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              موتور کنترل کیفیت داده (Data Quality & Anomaly Classification Engine)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              نقاط پرت واقعی اقتصادی (مانند تخلیه اثر پایه یارانه‌ها در خرداد ۱۴۰۲ یا جهش تورم ماهانه بهمن ۱۴۰۳) حذف نمی‌شوند، بلکه برچسب‌گذاری و حفظ می‌گردند.
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {(['ALL', 'MEDIUM', 'INFO'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setIssueFilter(sev)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  issueFilter === sev
                    ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {sev === 'ALL'
                  ? `همه موارد (${qualityIssues.length})`
                  : sev === 'MEDIUM'
                    ? 'شکست ساختاری و نقاط حدی'
                    : 'بازنگری‌های رسمی'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-2 px-2 text-right">شاخص و دوره</th>
                <th className="py-2 px-2 text-right">نوع رخداد کیفی</th>
                <th className="py-2 px-2 text-left font-mono">مقدار مشاهده‌شده</th>
                <th className="py-2 px-2 text-right">توضیح تحلیلی و آماری</th>
                <th className="py-2 px-2 text-right">وضعیت رسیدگی (Remediation)</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.map((iss) => (
                <tr
                  key={iss.id}
                  className="border-b border-slate-200/60 dark:border-slate-800/60"
                >
                  <td className="py-2.5 px-2 font-mono tabular-nums">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {iss.indicatorCode}
                    </span>{' '}
                    · {iss.solarPeriod}
                  </td>
                  <td className="py-2.5 px-2 font-mono text-amber-600 dark:text-amber-400">
                    {iss.issueType}
                  </td>
                  <td className="py-2.5 px-2 text-left font-mono tabular-nums">
                    {iss.observedValue}
                  </td>
                  <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300">
                    {iss.descriptionFa}
                  </td>
                  <td className="py-2.5 px-2 font-mono text-slate-500">
                    {iss.remediationStatus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Historical Revisions & Pipeline Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            تاریخچه بازنگری آمارهای رسمی (Revisions Log — عدم رونویسی پنهان)
          </h3>
          <div className="space-y-2.5 text-xs">
            {revisions.map((rev) => (
              <div
                key={rev.id}
                className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded space-y-1"
              >
                <div className="flex items-center justify-between font-mono tabular-nums">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {rev.indicatorCode} · دوره {rev.solarPeriod}
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    {rev.previousValue} ← {rev.revisedValue}
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">{rev.reasonFa}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            گزارش اجرای پایپ‌لاین داده و ممیزی سیستم (Pipeline Runs & Audit Trail)
          </h3>
          <div className="space-y-2.5 text-xs">
            {pipelineRuns.slice(0, 4).map((run) => (
              <div
                key={run.id}
                className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded space-y-1"
              >
                <div className="flex items-center justify-between font-mono tabular-nums">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {run.id} ({run.triggerType})
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {run.status} · معتبر: {run.recordsValidated} · قرنطینه: {run.recordsQuarantined}
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  {run.logSummaryFa}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

/**
 * Section 17 & 20: AI Economic Analyst (Retrieval-Grounded) & Model Settings
 */
export const AiAnalystAndSettingsView: React.FC = () => {
  const [question, setQuestion] = useState(
    'چرا شاخص فشار تورمی و نرخ ارز در پاییز ۱۴۰۵ افزایش یافته و کدام طبقات دارایی بر اساس داده‌های لایو فعلی برای پوشش این ریسک مناسب‌ترند؟'
  );
  const [answerData, setAnswerData] = useState<{
    answerFa: string;
    mode: string;
    modelUsed: string;
    citedEvidence: { code: string; solarPeriod: string; source: string; value: string }[];
    retrievedAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null as string | null);

  const presetQuestions = [
    'چرا فشار تورمی و انتظارات ارزی در مهر ۱۴۰۵ مجدداً افزایش یافته است؟',
    'کدام شاخص‌های کلان در آخرین گزارش‌های ۱۴۰۵ بیشترین تضعیف را داشته‌اند؟',
    'بر اساس شواهد لایو فعلی، چه دلایلی از تغییر وزن سبد دارایی به سمت طلای ۱۸ عیار، سهام دلاری و اخزا پشتیبانی می‌کند؟',
    'کدام شاخص‌های مهم اقتصادی در پایگاه داده مفقود هستند یا وقفه انتشار دارند؟',
  ];

  const handleAskAnalyst = async (qText?: string) => {
    const queryToUse = qText || question;
    if (!queryToUse.trim()) return;
    setQuestion(queryToUse);
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/analyst/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: queryToUse }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در دریافت پاسخ تحلیلگر');
      setAnswerData(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            تحلیلگر هوشمند اقتصاد کلان مبتنی بر بازیابی شواهد (Retrieval-Grounded AI Economic Analyst)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            پاسخ‌ها مستقیماً به رکوردهای واقعی ذخیره‌شده در پایگاه داده EcoMat مقید (Grounded) شده‌اند و از تولید اعداد ساختگی یا بدون منبع جلوگیری می‌شود.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {presetQuestions.map((pq, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAskAnalyst(pq)}
              className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded transition-colors"
            >
              {pq}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="پرسش پژوهشی خود را درباره وضعیت اقتصاد کلان، سناریوها یا سبد دارایی بنویسید..."
            className="flex-1 px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={() => handleAskAnalyst()}
            disabled={loading}
            className="px-5 py-2.5 text-xs font-medium bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{loading ? 'در حال واکشی شواهد و تحلیل...' : 'تحلیل مبتنی بر شواهد'}</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {answerData && (
          <div className="p-5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800 pb-2.5 font-mono tabular-nums">
              <span>موتور پاسخ‌گو: {answerData.modelUsed}</span>
              <span>·</span>
              <span>حالت بازیابی: {answerData.mode}</span>
              <span>·</span>
              <span>زمان بازیابی: {answerData.retrievedAt.slice(0, 19)}</span>
            </div>

            <div className="whitespace-pre-wrap text-xs leading-7 text-slate-800 dark:text-slate-200">
              {answerData.answerFa}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="text-[11px] text-slate-500 mb-2">
                رکوردهای مرجع بازیابی‌شده از پایگاه داده در این تحلیل:
              </div>
              <div className="flex flex-wrap gap-3 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
                {answerData.citedEvidence.map((ev) => (
                  <span key={ev.code}>
                    [{ev.code} | {ev.solarPeriod} | {ev.source}: {ev.value}]
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Model Configuration & Architecture Documentation */}
      <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-6 space-y-4 text-xs">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          تنظیمات روش‌شناختی، معماری سامانه و مستندات راه‌اندازی (Settings & Methodology)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-6 text-slate-600 dark:text-slate-300">
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
              ۱. قواعد تبدیل واحد و نرمال‌سازی
            </h4>
            <p>
              تمامی ارقام پولی در لایه ذخیره‌سازی با واحد اصلی منبع رسمی (هزار میلیارد ریال برای متغیرهای کلان پولی، ریال برای نرخ ارز و میلیون ریال برای سکه و مسکن) نگهداری می‌شوند. تبدیل به «تومان» یا «همت» صرفاً با قاعده صریح تقسیم بر ۱۰ در لایه نمایش اعمال می‌گردد.
            </p>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 pt-2">
              ۲. سیاست برخورد با داده‌های مفقود در شاخص‌های ترکیبی
            </h4>
            <p>
              حداقل پوشش داده مجاز برای محاسبه شاخص‌های ترکیبی ۷۵٪ تا ۸۰٪ وزن کل ورودی‌هاست. در صورت کاهش پوشش به زیر این آستانه، سیستم از تولید نمره جعلی خودداری کرده و عبارت «Insufficient Data» را برمی‌گرداند.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
              ۳. معماری فنی و دستورات اجرایی
            </h4>
            <p>
              پلتفرم بر پایه معماری سه لایه (کلاینت React 19 + سرور Express/TypeScript + پایگاه داده ماندگار فایل‌محور در مسیر <code className="font-mono">data/ecomat_store.json</code> و آرشیو فایل‌های خام در <code className="font-mono">data/raw_uploads/</code>) پیاده‌سازی شده است.
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-mono text-[11px] dir-ltr text-left">
              <div>npm run dev     # Start full-stack server on port 3000</div>
              <div>npm run test    # Execute 14-point automated quantitative test suite</div>
              <div>npm run build   # Build production frontend bundle</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
