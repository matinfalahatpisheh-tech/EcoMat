import 'dotenv/config';
process.env.DISABLE_HMR = 'true';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { EcoMatDatabase } from './src/server/db';
import { fetchLiveIranMarketSnapshot } from './src/server/liveMarketEngine';
import {
  analyzeLeadLagRelationship,
  generateForecastForIndicator,
  runPointInTimeBacktest,
  validateIncomingImportRows,
  MODEL_VERSION,
} from './src/shared/analytics';
import {
  generateEvidenceBoundAnalystResponse,
  runAnalystAcceptanceTestSuite,
  verifyCandidateResponseAgainstLedger,
} from './src/shared/aiAnalystEngine';

const PORT = 3000;
const SERVER_START_MS = Date.now();
const db = new EcoMatDatabase(true);

// Rate limiter per IP for exposed API endpoints
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string, maxReqPerMin = 120): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  entry.count += 1;
  return entry.count <= maxReqPerMin;
}

// Sanitize text against prompt injection attempts
function sanitizePromptInput(raw: string): string {
  return raw
    .replace(/ignore\s+(all\s+)?previous\s+instructions/gi, '[REMOVED_INJECTION]')
    .replace(/system\s*prompt/gi, '[FILTERED]')
    .slice(0, 1400)
    .trim();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.use('/api', (req, res, next) => {
    const ip = req.ip || 'local';
    if (!checkRateLimit(ip)) {
      res.status(429).json({
        error: 'تعداد درخواست‌ها بیش از حد مجاز در دقیقه است. لطفاً چند ثانیه صبر کنید.',
      });
      return;
    }
    next();
  });

  // 0. Health & Live Market Endpoints
  app.get('/api/health', (_req, res) => {
    const state = db.getState();
    res.json({
      status: 'OK',
      uptimeSeconds: Math.round((Date.now() - SERVER_START_MS) / 1000),
      schemaVersion: state.schemaVersion,
      observationsCount: state.observations.length,
      checkedAt: new Date().toISOString(),
    });
  });

  app.get('/api/market/live', async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === 'true';
      const housingDetail = db.getIndicatorDetail('HOUSING_TEHRAN_PRICE');
      const latestHousingVal =
        housingDetail && housingDetail.observations.length > 0
          ? housingDetail.observations[housingDetail.observations.length - 1].value
          : 1385;
      const liveSnapshot = await fetchLiveIranMarketSnapshot(latestHousingVal, forceRefresh);
      db.syncLiveMarketToObservations(liveSnapshot);
      res.json(liveSnapshot);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'خطا در دریافت نرخ‌های لحظه‌ای بازار ایران',
      });
    }
  });

  // Evidence-Bound AI Live Market & Capital Allocation Analyst (No Fabricated Entry/Exit or Ungrounded Claims)
  app.post('/api/market/ai-trade-advisor', async (req, res) => {
    try {
      const rawCap = req.body?.capitalToman;
      const capitalAmount =
        rawCap !== undefined && rawCap !== null && Number(rawCap) > 0
          ? Number(rawCap)
          : null;
      const capitalUnit: 'TOMAN' | 'IRR' | 'UNSPECIFIED' =
        req.body?.capitalUnit === 'IRR'
          ? 'IRR'
          : capitalAmount !== null
            ? 'TOMAN'
            : 'UNSPECIFIED';
      const horizonFa = req.body?.horizonFa || 'UNSPECIFIED';
      const riskToleranceFa = req.body?.riskProfileFa || 'UNSPECIFIED';
      const liquidityNeedFa = req.body?.liquidityNeedFa || 'UNSPECIFIED';
      const customQuestion = sanitizePromptInput(
        String(
          req.body?.question ||
            'ارزیابی مستند شکاف قیمت بازار و ارزش ذاتی دارایی‌ها همراه با شروط ابطال'
        )
      );

      const housingDetail = db.getIndicatorDetail('HOUSING_TEHRAN_PRICE');
      const latestHousingVal =
        housingDetail && housingDetail.observations.length > 0
          ? housingDetail.observations[housingDetail.observations.length - 1].value
          : 1385;
      const live = await fetchLiveIranMarketSnapshot(latestHousingVal, false);
      db.syncLiveMarketToObservations(live);
      const snapshot = db.getFullAnalyticalSnapshot();

      const bundle = {
        ...snapshot,
        liveMarket: live,
      };

      const baseResponse = generateEvidenceBoundAnalystResponse(bundle, {
        questionFa: customQuestion,
        userProfile: {
          capitalAmount,
          capitalUnit,
          horizonFa,
          riskToleranceFa,
          liquidityNeedFa,
        },
      });

      const apiKey = process.env.GEMINI_API_KEY;
      if (
        apiKey &&
        apiKey !== 'MY_GEMINI_API_KEY' &&
        baseResponse.analysisRestrictionStatus !==
          'ABSTAINED_INSUFFICIENT_OR_INVALID_DATA'
      ) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          });

          const allowedEvidenceText = baseResponse.usedEvidence
            .map(
              (e) =>
                `- [${e.code} | دوره: ${e.solarPeriod} | منبع: ${e.sourceId} | وضعیت: ${e.qualityLabelFa}]: ${e.displayValueFa} ${e.unitFa}`
            )
            .join('\n');

          const systemInstruction = `شما «تحلیلگر مستند و مقید به شواهد EcoMat» هستید.
قواعد اجباری:
1. هرگز هیچ عدد، قیمت، بازده، احتمال، نقطه ورود/خروج یا حد سود/ضرر عددی که در شواهد ورودی زیر نیست نسازید.
2. بین قیمت بازار، ارزش ذاتی برآوردی، پیش‌بینی آماری و فرض سناریو تفکیک صریح قائل شوید.
3. اگر اطلاعات شخصی کاربر (${baseResponse.userProfileAudit.unassumedMissingFieldsFa.join('، ') || 'کامل'}) ناقص است، آن را حدس نزنید.
4. صرفاً از ارقام فهرست زیر استفاده کنید (هر عدد خارج از این فهرست توسط ممیز مستقل مسدود می‌شود):
${allowedEvidenceText}`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: customQuestion,
            config: {
              systemInstruction,
              temperature: 0.1,
            },
          });

          const candidateText = response.text;
          if (candidateText) {
            const verification = verifyCandidateResponseAgainstLedger(
              candidateText,
              baseResponse.usedEvidence,
              baseResponse.flaggedOrUnavailableInputs,
              bundle,
              {
                questionFa: customQuestion,
                userProfile: {
                  capitalAmount,
                  capitalUnit,
                  horizonFa,
                  riskToleranceFa,
                  liquidityNeedFa,
                },
              }
            );

            if (verification.passedIndependentAudit) {
              res.json({
                ...baseResponse,
                answerFa: candidateText,
                mode: 'EVIDENCE_BOUND_GEMINI_VERIFIED',
                modelUsed: 'gemini-3.8-flash',
                independentVerification: verification,
              });
              return;
            }
          }
        } catch (err) {
          console.warn('Gemini verification fallback triggered:', err);
        }
      }

      res.json(baseResponse);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'خطا در اجرای تحلیلگر مستند بازار',
      });
    }
  });

  // 1. Full Analytical Snapshot (Synced with Live Market Feed)
  app.get('/api/snapshot', async (_req, res) => {
    try {
      const housingDetail = db.getIndicatorDetail('HOUSING_TEHRAN_PRICE');
      const latestHousingVal =
        housingDetail && housingDetail.observations.length > 0
          ? housingDetail.observations[housingDetail.observations.length - 1].value
          : 1385;
      const liveSnapshot = await fetchLiveIranMarketSnapshot(latestHousingVal, false);
      db.syncLiveMarketToObservations(liveSnapshot);
      const snapshot = db.getFullAnalyticalSnapshot();
      res.json({
        ...snapshot,
        liveMarket: liveSnapshot,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'خطا در بازیابی اطلاعات سامانه',
      });
    }
  });

  // 2. Specific Indicator Details & Derived Features
  app.get('/api/indicators/:code', (req, res) => {
    const detail = db.getIndicatorDetail(req.params.code);
    if (!detail) {
      res.status(404).json({ error: 'شاخص مورد نظر در رجیستری یافت نشد.' });
      return;
    }
    res.json(detail);
  });

  // 3. Lead/Lag & Statistical Research Lab
  app.post('/api/research/lead-lag', (req, res) => {
    try {
      const { indicatorX, indicatorY } = req.body || {};
      const state = db.getState();
      const xCode = indicatorX || 'M2_LIQUIDITY';
      const yCode = indicatorY || 'CPI_HEADLINE';
      const result = analyzeLeadLagRelationship(
        xCode,
        yCode,
        state.indicators,
        state.observations,
        15
      );
      res.json(result);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'خطا در محاسبه همبستگی پیش‌نگر/پس‌نگر',
      });
    }
  });

  // 4. Forecasting with Cutoff Enforcement & Point-in-Time Vintage Rollback
  app.post('/api/research/forecast', (req, res) => {
    try {
      const { targetIndicatorCode, cutoffTimestamp } = req.body || {};
      const state = db.getState();
      const forecast = generateForecastForIndicator(
        targetIndicatorCode || 'CPI_HEADLINE',
        state.indicators,
        state.observations,
        cutoffTimestamp || '2026-10-31T23:59:59Z',
        state.revisions
      );
      res.json(forecast);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'خطا در اجرای مدل پیش‌بینی',
      });
    }
  });

  // 5. Point-in-Time Historical Backtesting
  app.post('/api/research/backtest', (req, res) => {
    try {
      const { transactionCostMultiplier } = req.body || {};
      const mult = Number(transactionCostMultiplier ?? 1.0);
      const state = db.getState();
      const result = runPointInTimeBacktest(
        state.indicators,
        state.observations,
        Number.isNaN(mult) ? 1.0 : Math.max(0, Math.min(5, mult)),
        state.revisions
      );
      res.json(result);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'خطا در اجرای بک‌تست نقطه‌ای',
      });
    }
  });

  // 6. Manual Import Validation Preview (Does NOT commit to DB yet)
  app.post('/api/ingest/preview', (req, res) => {
    try {
      const { rows } = req.body || {};
      if (!Array.isArray(rows)) {
        res.status(400).json({ error: 'آرایه رکوردها (rows) ارسال نشده است.' });
        return;
      }
      const state = db.getState();
      const validation = validateIncomingImportRows(
        rows,
        state.indicators,
        state.observations
      );
      res.json({
        totalSubmitted: rows.length,
        validCount: validation.validRecords.length,
        quarantinedCount: validation.quarantinedRecords.length,
        revisionsCount: validation.revisionsDetected.length,
        validRecords: validation.validRecords,
        quarantinedRecords: validation.quarantinedRecords,
        revisionsDetected: validation.revisionsDetected,
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'خطا در اعتبارسنجی فایل ورودی',
      });
    }
  });

  // 7. Manual Import Commit (Executes 11-stage ingestion workflow)
  app.post('/api/ingest/commit', (req, res) => {
    try {
      const { sourceId, releaseTitleFa, rawContent, rows } = req.body || {};
      if (!Array.isArray(rows) || rows.length === 0) {
        res.status(400).json({ error: 'هیچ رکوردی برای ثبت ارسال نشده است.' });
        return;
      }
      const outcome = db.commitManualImport({
        sourceId: sourceId || 'SCI',
        releaseTitleFa: releaseTitleFa || 'ورود دستی فایل رسمی توسط کاربر',
        rawContent: typeof rawContent === 'string' ? rawContent : JSON.stringify(rows),
        rows,
      });
      res.json(outcome);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'خطا در ثبت نهایی مشاهدات',
      });
    }
  });

  // 8. Live World Bank Open Data API Connector
  app.post('/api/sources/sync-worldbank', async (_req, res) => {
    try {
      const syncResult = await db.syncWorldBankIranData();
      res.json(syncResult);
    } catch (err) {
      res.status(500).json({
        success: false,
        messageFa: err instanceof Error ? err.message : 'خطا در همگام‌سازی وب‌سرویس بانک جهانی',
      });
    }
  });

  // 9. Evidence-Bound AI Economic Analyst with Independent Post-Generation Verifier
  app.post('/api/analyst/ask', async (req, res) => {
    try {
      const rawQuestion = String(req.body?.question || '');
      const question = sanitizePromptInput(rawQuestion);
      if (!question) {
        res.status(400).json({ error: 'لطفاً پرسش تحلیلی خود را وارد نمایید.' });
        return;
      }

      const housingDetail = db.getIndicatorDetail('HOUSING_TEHRAN_PRICE');
      const latestHousingVal =
        housingDetail && housingDetail.observations.length > 0
          ? housingDetail.observations[housingDetail.observations.length - 1].value
          : 1385;
      const liveSnapshot = await fetchLiveIranMarketSnapshot(latestHousingVal, false);
      db.syncLiveMarketToObservations(liveSnapshot);
      const snapshot = db.getFullAnalyticalSnapshot();

      const bundle = {
        ...snapshot,
        liveMarket: liveSnapshot,
      };

      const userProfile = req.body?.userProfile || undefined;
      const simulationOverrides = req.body?.simulationOverrides || undefined;

      const baseResponse = generateEvidenceBoundAnalystResponse(bundle, {
        questionFa: question,
        userProfile,
        simulationOverrides,
      });

      const citedEvidence = baseResponse.usedEvidence.slice(0, 8).map((ev) => ({
        code: ev.code,
        solarPeriod: ev.solarPeriod,
        source: ev.sourceId,
        value: `${ev.displayValueFa} ${ev.unitFa} (${ev.qualityLabelFa})`,
      }));

      const apiKey = process.env.GEMINI_API_KEY;
      if (
        apiKey &&
        apiKey !== 'MY_GEMINI_API_KEY' &&
        !simulationOverrides?.injectedCandidateLlmTextFa &&
        baseResponse.analysisRestrictionStatus !==
          'ABSTAINED_INSUFFICIENT_OR_INVALID_DATA'
      ) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          });

          const evidenceLines = baseResponse.usedEvidence
            .map(
              (ev) =>
                `- ${ev.nameFa} [${ev.code} | دوره: ${ev.solarPeriod} | منبع: ${ev.sourceId} | کیفیت: ${ev.qualityLabelFa}]: مقدار = ${ev.displayValueFa} ${ev.unitFa}`
            )
            .join('\n');

          const flaggedLines = baseResponse.flaggedOrUnavailableInputs
            .map(
              (fl) =>
                `- [محدودیت/هشدار ${fl.qualityStatus}] ${fl.nameFa} [${fl.code}]: ${fl.methodologyOrWarningFa}`
            )
            .join('\n');

          const systemInstruction = `شما «تحلیلگر مستند و مقید به شواهد EcoMat» هستید.
الزامات غیرقابل مذاکره:
1. فقط به داده‌های معتبر و قابل ردیابی زیر استناد کنید و برای هر عدد، [کد شاخص | دوره | منبع] را ذکر نمایید.
2. داده‌های نامعتبر، منقضی، دارای اختلاف منبع یا برآوردی را صریحاً برچسب‌گذاری کنید و هرگز واقعیت مشاهده‌شده معرفی نکنید.
3. قیمت بازار، ارزش ذاتی برآوردی، پیش‌بینی آماری و فرض سناریو را تفکیک کنید.
4. هرگز نقاط ورود/خروج عددی، حد سود/ضرر ساختگی یا بازده تضمین‌شده تولید نکنید.
5. هر عدد خارج از شواهد زیر توسط ممیز مستقل سامانه مسدود خواهد شد.

=== شواهد معتبر و قابل ردیابی ===
${evidenceLines}

=== ورودی‌های نامعتبر، منقضی یا مفقود ===
${flaggedLines}`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: question,
            config: {
              systemInstruction,
              temperature: 0.1,
            },
          });

          const candidateText = response.text;
          if (candidateText) {
            const verification = verifyCandidateResponseAgainstLedger(
              candidateText,
              baseResponse.usedEvidence,
              baseResponse.flaggedOrUnavailableInputs,
              bundle,
              {
                questionFa: question,
                userProfile,
                simulationOverrides,
              }
            );

            if (verification.passedIndependentAudit) {
              res.json({
                ...baseResponse,
                answerFa: candidateText,
                mode: 'EVIDENCE_BOUND_GEMINI_VERIFIED',
                modelUsed: 'gemini-3.8-flash',
                independentVerification: verification,
                citedEvidence,
                retrievedAt: baseResponse.generatedAt,
              });
              return;
            }
          }
        } catch (err) {
          console.warn('Gemini call fallback triggered:', err);
        }
      }

      res.json({
        ...baseResponse,
        citedEvidence,
        retrievedAt: baseResponse.generatedAt,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'خطا در اجرای تحلیلگر مستند',
      });
    }
  });

  // 10. Acceptance Test Suite Endpoint (7 Adversarial & Edge-Case Scenarios)
  app.get('/api/analyst/acceptance-tests', async (_req, res) => {
    try {
      const housingDetail = db.getIndicatorDetail('HOUSING_TEHRAN_PRICE');
      const latestHousingVal =
        housingDetail && housingDetail.observations.length > 0
          ? housingDetail.observations[housingDetail.observations.length - 1].value
          : 1385;
      const liveSnapshot = await fetchLiveIranMarketSnapshot(latestHousingVal, false);
      const snapshot = db.getFullAnalyticalSnapshot();
      const results = runAnalystAcceptanceTestSuite({
        ...snapshot,
        liveMarket: liveSnapshot,
      });
      res.json({
        executedAt: new Date().toISOString(),
        totalScenarios: results.length,
        passedCount: results.filter((r) => r.passed).length,
        failedCount: results.filter((r) => !r.passed).length,
        scenarios: results,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'خطا در اجرای آزمون‌های پذیرش مشاور هوشمند',
      });
    }
  });

  // Vite middleware in development, static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EcoMat server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
