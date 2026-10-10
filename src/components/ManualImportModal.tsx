import React, { useState } from 'react';
import { Upload, CheckCircle2, AlertTriangle, FileSpreadsheet, X } from 'lucide-react';
import { IndicatorMetadata, ObservationRecord, RevisionRecord } from '../shared/types';

interface ManualImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicators: IndicatorMetadata[];
  onImportCommitted: () => void;
}

interface PreviewResponse {
  totalSubmitted: number;
  validCount: number;
  quarantinedCount: number;
  revisionsCount: number;
  validRecords: ObservationRecord[];
  quarantinedRecords: { row: Record<string, unknown>; reasonFa: string }[];
  revisionsDetected: RevisionRecord[];
}

export const ManualImportModal: React.FC<ManualImportModalProps> = ({
  isOpen,
  onClose,
  indicators,
  onImportCommitted,
}) => {
  const [sourceId, setSourceId] = useState('SCI');
  const [releaseTitleFa, setReleaseTitleFa] = useState(
    'گزارش شاخص قیمت مصرف‌کننده و بازنگری مقادیر فصلی - آبان ۱۴۰۵'
  );
  const [rawInputText, setRawInputText] = useState<string>(() =>
    JSON.stringify(
      [
        {
          indicatorCode: 'CPI_HEADLINE',
          period: '2026-11',
          solarPeriod: '۱۴۰۵/۰۸',
          value: 38.8,
          unit: 'PERCENT',
        },
        {
          indicatorCode: 'CPI_MOM',
          period: '2026-11',
          solarPeriod: '۱۴۰۵/۰۸',
          value: 2.7,
          unit: 'PERCENT',
        },
        {
          indicatorCode: 'CPI_HEADLINE',
          period: '2026-10',
          solarPeriod: '۱۴۰۵/۰۷',
          value: 38.5,
          unit: 'PERCENT',
        },
      ],
      null,
      2
    )
  );
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const parseInputToRows = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.startsWith('[')) {
      return JSON.parse(trimmed);
    }
    // Simple CSV parser: header line indicatorCode,period,solarPeriod,value,unit
    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.trim());
      const obj: Record<string, string | number> = {};
      headers.forEach((h, i) => {
        obj[h] = h === 'value' ? Number(cols[i]) : cols[i];
      });
      return obj;
    });
  };

  const handleLoadTemplate = (templateId: 'SCI_UPDATE' | 'INDUSTRIAL_ACTIVATE' | 'QUARANTINE_TEST') => {
    setPreview(null);
    setStatusMessage(null);
    if (templateId === 'SCI_UPDATE') {
      setSourceId('SCI');
      setReleaseTitleFa('گزارش رسمی تورم آبان ۱۴۰۵ و اصلاحیه مهر ۱۴۰۵ - مرکز آمار');
      setRawInputText(
        JSON.stringify(
          [
            {
              indicatorCode: 'CPI_HEADLINE',
              period: '2026-11',
              solarPeriod: '۱۴۰۵/۰۸',
              value: 38.8,
              unit: 'PERCENT',
            },
            {
              indicatorCode: 'CPI_MOM',
              period: '2026-11',
              solarPeriod: '۱۴۰۵/۰۸',
              value: 2.7,
              unit: 'PERCENT',
            },
            {
              indicatorCode: 'CPI_HEADLINE',
              period: '2026-10',
              solarPeriod: '۱۴۰۵/۰۷',
              value: 38.5,
              unit: 'PERCENT',
            },
          ],
          null,
          2
        )
      );
    } else if (templateId === 'INDUSTRIAL_ACTIVATE') {
      setSourceId('CBI');
      setReleaseTitleFa('سری فصلی شاخص تولید کارگاه‌های بزرگ صنعتی ۱۴۰۴-۱۴۰۵ - بانک مرکزی');
      setRawInputText(
        `indicatorCode,period,solarPeriod,value,unit
INDUSTRIAL_PROD_INDEX,2025-09,۱۴۰۴/۰۶,3.8,PERCENT
INDUSTRIAL_PROD_INDEX,2025-12,۱۴۰۴/۰۹,2.4,PERCENT
INDUSTRIAL_PROD_INDEX,2026-03,۱۴۰۴/۱۲,1.9,PERCENT
INDUSTRIAL_PROD_INDEX,2026-06,۱۴۰۵/۰۳,2.1,PERCENT
INDUSTRIAL_PROD_INDEX,2026-09,۱۴۰۵/۰۶,2.5,PERCENT`
      );
    } else {
      setSourceId('SCI');
      setReleaseTitleFa('آزمون کنترل کیفیت و قرنطینه رکوردهای معیوب (آبان ۱۴۰۵)');
      setRawInputText(
        JSON.stringify(
          [
            {
              indicatorCode: 'M2_LIQUIDITY',
              period: '2026-11',
              solarPeriod: '۱۴۰۵/۰۸',
              value: 138200,
              unit: 'TRILLION_IRR',
            },
            {
              indicatorCode: 'M2_LIQUIDITY',
              period: '2026-11',
              solarPeriod: '۱۴۰۵/۰۸',
              value: 138200,
              unit: 'TRILLION_IRR',
            },
            {
              indicatorCode: 'M2_LIQUIDITY',
              period: '1405/08/15',
              value: 138500,
              unit: 'TRILLION_IRR',
            },
            {
              indicatorCode: 'CPI_HEADLINE',
              period: '2026-11',
              value: -15.5,
              unit: 'PERCENT',
            },
          ],
          null,
          2
        )
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setRawInputText(ev.target.result);
        setPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handlePreviewValidation = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const rows = parseInputToRows(rawInputText);
      const res = await fetch('/api/ingest/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در اعتبارسنجی');
      setPreview(data);
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : 'فرمت CSV یا JSON واردشده معتبر نیست.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommitImport = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const rows = parseInputToRows(rawInputText);
      const res = await fetch('/api/ingest/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          releaseTitleFa,
          rawContent: rawInputText,
          rows,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ثبت نهایی');
      setStatusMessage(data.pipelineRun?.logSummaryFa || 'با موفقیت ذخیره شد.');
      onImportCommitted();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'خطا در ثبت داده');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              پایپ‌لاین ورود دستی و اعتبارسنجی مجموعه‌داده‌های رسمی (CSV / JSON)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              مراحل اجرایی: کشف ← استخراج ← آرشیو فایل خام ← نرمال‌سازی ← اعتبارسنجی ۱۱گانه ← تشخیص بازنگری‌ها ← ذخیره در پایگاه داده
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg"
            aria-label="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Official Dataset Templates */}
        <div className="mb-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            بارگذاری سریع قالب‌های نمونه استاندارد جهت بررسی عملکرد موتور اعتبارسنجی و تاریخچه بازنگری‌ها:
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleLoadTemplate('SCI_UPDATE')}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded transition-colors whitespace-nowrap"
            >
              ۱. گزارش تورم فروردین ۱۴۰۴ + بازنگری اسفند ۱۴۰۳ (JSON)
            </button>
            <button
              type="button"
              onClick={() => handleLoadTemplate('INDUSTRIAL_ACTIVATE')}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded transition-colors whitespace-nowrap"
            >
              ۲. فعال‌سازی شاخص «تولید کارگاه‌های بزرگ صنعتی» (CSV)
            </button>
            <button
              type="button"
              onClick={() => handleLoadTemplate('QUARANTINE_TEST')}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded transition-colors whitespace-nowrap"
            >
              ۳. آزمون قرنطینه داده‌های معیوب و تکراری
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              منبع انتشار رسمی
            </label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-slate-100"
            >
              <option value="SCI">مرکز آمار ایران (SCI)</option>
              <option value="CBI">بانک مرکزی ج.ا.ا (CBI)</option>
              <option value="TSETMC">شرکت مدیریت فناوری بورس تهران (TSETMC)</option>
              <option value="PBO">سازمان برنامه و بودجه (PBO)</option>
              <option value="IRICA">گمرک جمهوری اسلامی ایران (IRICA)</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              عنوان گزارش / انتشار رسمی (Release Title)
            </label>
            <input
              type="text"
              value={releaseTitleFa}
              onChange={(e) => setReleaseTitleFa(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-slate-600 dark:text-slate-400">
              محتوای داده (فرمت JSON یا CSV با ستون‌های: indicatorCode, period, solarPeriod, value, unit)
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 cursor-pointer hover:underline">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>انتخاب فایل از رایانه (.csv / .json)</span>
              <input
                type="file"
                accept=".csv,.json,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
          <textarea
            dir="ltr"
            rows={7}
            value={rawInputText}
            onChange={(e) => {
              setRawInputText(e.target.value);
              setPreview(null);
            }}
            className="w-full p-3 text-xs font-mono tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-slate-100"
          />
          <div className="text-[11px] text-slate-500 mt-1">
            کدهای شاخص مجاز: {indicators.map((i) => i.code).join(' · ')}
          </div>
        </div>

        {/* Validation Preview Output */}
        {preview && (
          <div className="mb-5 p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 rounded-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono tabular-nums">
              <span>کل رکوردهای ارسالی: {preview.totalSubmitted}</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                معتبر و آماده ثبت: {preview.validCount}
              </span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                بازنگری نسبت به انتشارهای قبلی: {preview.revisionsCount}
              </span>
              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                قرنطینه‌شده (خطای اعتبارسنجی): {preview.quarantinedCount}
              </span>
            </div>

            {preview.revisionsDetected.length > 0 && (
              <div className="text-xs space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="font-semibold text-amber-600 dark:text-amber-400">
                  بازنگری‌های شناسایی‌شده (مقادیر قبلی در جدول Revisions حفظ خواهند شد):
                </div>
                {preview.revisionsDetected.map((rev) => (
                  <div key={rev.id} className="text-slate-600 dark:text-slate-300 font-mono">
                    {rev.indicatorCode} ({rev.solarPeriod}): {rev.previousValue} ← {rev.revisedValue}
                  </div>
                ))}
              </div>
            )}

            {preview.quarantinedRecords.length > 0 && (
              <div className="text-xs space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>رکوردهای متوقف‌شده در قرنطینه (وارد محاسبات تحلیلی نمی‌شوند):</span>
                </div>
                {preview.quarantinedRecords.map((q, idx) => (
                  <div key={idx} className="text-slate-600 dark:text-slate-300">
                    · {q.reasonFa}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {statusMessage && (
          <div className="mb-4 p-3 border border-sky-500/30 bg-sky-500/10 rounded text-xs text-sky-700 dark:text-sky-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handlePreviewValidation}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            ۱. پیش‌نمایش و اعتبارسنجی کیفیت
          </button>
          <button
            type="button"
            onClick={handleCommitImport}
            disabled={isLoading || (preview !== null && preview.validCount === 0)}
            className="px-4 py-2 text-xs font-medium bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>۲. تایید و ثبت نهایی در پایگاه داده</span>
          </button>
        </div>
      </div>
    </div>
  );
};
