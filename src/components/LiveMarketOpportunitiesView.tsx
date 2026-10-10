import React, { useState, useEffect, useCallback } from 'react';
import {
  LiveIranMarketSnapshot,
  MarketOpportunitySignal,
  BourseStockOpportunity,
  SectorDeepDiveOutlook,
  EvidenceBoundAnalystResponse,
} from '../shared/types';
import {
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Target,
  AlertTriangle,
  Wallet,
  Calculator,
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Building2,
  Car,
  Coins,
  DollarSign,
  BarChart3,
} from 'lucide-react';

interface LiveMarketOpportunitiesViewProps {
  useToman: boolean;
}

export const LiveMarketOpportunitiesView: React.FC<LiveMarketOpportunitiesViewProps> = ({
  useToman,
}) => {
  const [snapshot, setSnapshot] = useState<LiveIranMarketSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'SIGNALS' | 'STOCKS' | 'SECTORS_OUTLOOK' | 'CAPITAL_ALLOCATOR'
  >('SIGNALS');

  const [selectedCategory, setSelectedCategory] = useState<
    'ALL' | 'GOLD' | 'STOCKS' | 'FX' | 'HOUSING' | 'AUTO'
  >('ALL');

  const [activeSectorId, setActiveSectorId] = useState<
    'GOLD' | 'FX' | 'STOCKS' | 'AUTO' | 'HOUSING'
  >('GOLD');

  // Interactive Capital Allocator State
  const [capitalToman, setCapitalToman] = useState<number>(500_000_000);
  const [riskProfile, setRiskProfile] = useState<'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE'>(
    'BALANCED'
  );
  const [horizon, setHorizon] = useState<'SHORT_1_3M' | 'MEDIUM_3_6M' | 'LONG_6_12M'>(
    'MEDIUM_3_6M'
  );
  const [liquidityNeedFa, setLiquidityNeedFa] = useState<string>(
    'متوسط (قابل دسترسی در ۱ هفته)'
  );
  const [customAdvisorQuestion, setCustomAdvisorQuestion] = useState<string>(
    'بر اساس قیمت بازار و ارزش ذاتی طلای ۱۸ عیار، سکه و اوراق اخزا، چه شواهد و شروط ابطالی برای تخصیص این سرمایه وجود دارد؟'
  );
  const [advisorResponse, setAdvisorResponse] = useState<string | null>(null);
  const [advisorFullData, setAdvisorFullData] =
    useState<EvidenceBoundAnalystResponse | null>(null);
  const [advisorLoading, setAdvisorLoading] = useState<boolean>(false);

  const fetchLiveMarket = useCallback(async (force = false) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch(`/api/market/live${force ? '?refresh=true' : ''}`);
      if (!res.ok) throw new Error('خطا در دریافت اطلاعات لحظه‌ای بازار');
      const data = (await res.json()) as LiveIranMarketSnapshot;
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ارتباط با سرور بازار لایو');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveMarket(false);
    const interval = setInterval(() => {
      fetchLiveMarket(false);
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchLiveMarket]);

  const formatMoney = (tomanVal: number) => {
    if (useToman) {
      return `${Math.round(tomanVal).toLocaleString('fa-IR')} تومان`;
    }
    return `${Math.round(tomanVal * 10).toLocaleString('fa-IR')} ریال`;
  };

  // Compute dynamic capital allocation rows based on user's exact Toman budget, risk profile, and live prices
  const computeAllocationPlan = () => {
    if (!snapshot) return [];
    const s = snapshot.summaryIndicators;
    const coreEquities = snapshot.stockOpportunities.filter((st) =>
      ['فملی', 'شپنا', 'وبملت', 'فولاد'].includes(st.tickerFa)
    );
    const avgStockUnitToman =
      coreEquities.length > 0
        ? Math.round(
            coreEquities.reduce((acc, st) => acc + st.currentPriceRial / 10, 0) /
              coreEquities.length
          )
        : 620;

    // If capital >= 3.8 Billion Toman and horizon is LONG_6_12M, include direct Housing swap option
    const canBuyPhysicalHousing = capitalToman >= 3_800_000_000 && horizon === 'LONG_6_12M';

    let weights: {
      id: string;
      marketFa: string;
      instrumentFa: string;
      weightPct: number;
      unitPriceToman: number;
      unitNameFa: string;
      entryRuleFa: string;
      targetExitFa: string;
      stopLossFa: string;
    }[] = [];

    if (canBuyPhysicalHousing) {
      weights = [
        {
          id: 'HOUSING_UNIT',
          marketFa: 'مسکن و آپارتمان مصرفی (کف ارزش دلاری)',
          instrumentFa: 'آپارتمان میان‌متراژ با تخفیف خرید نقدی (یا حفظ در صندوق طلا تا زمان قرارداد)',
          weightPct: 55,
          unitPriceToman: s.tehranHousingSqmToman,
          unitNameFa: 'متر مربع آپارتمان معیار تهران',
          entryRuleFa: `چانه‌زنی نقدی برای خرید ۱۰٪ زیر قیمت اعلامی منطقه (${s.tehranHousingSqmUsd} دلار / ${s.housingPerGoldGramRatio} گرم طلا بر متر)`,
          targetExitFa: `تعدیل به میانگین تاریخی ۱,۲۵۰ دلار در هر متر (${formatMoney(s.dollarFreeToman * 1250)})`,
          stopLossFa: 'دارایی ملکی بلندمدت (بدون فروش در نوسانات کوتاه‌مدت)',
        },
        {
          id: 'GOLD_18K',
          marketFa: 'طلای ۱۸ عیار / صندوق طلای بورس',
          instrumentFa: 'نماد عیار / طلا / کهربا یا آب‌شده رسمی',
          weightPct: 20,
          unitPriceToman: s.gold18kGramToman,
          unitNameFa: 'گرم طلای ۱۸ عیار',
          entryRuleFa: `خرید ۲ پله‌ای در محدوده ${formatMoney(s.gold18kGramToman * 0.985)} تا ${formatMoney(s.gold18kGramToman)}`,
          targetExitFa: formatMoney(s.gold18kGramToman * 1.25),
          stopLossFa: 'نگهداری به عنوان پشتیبان نقدشوندگی ارزی-طلایی',
        },
        {
          id: 'BOURSE_LEADERS',
          marketFa: 'سبد سهام پیشرو صادراتی بورس',
          instrumentFa: 'فملی (۴۰٪)، شپنا (۳۰٪)، وبملت (۳۰٪)',
          weightPct: 15,
          unitPriceToman: avgStockUnitToman,
          unitNameFa: 'برگه سهم بنیادی (میانگین موزون سبد)',
          entryRuleFa: 'ورود در ۳ پله در روزهای منفی و متعادل بازار روی P/E ~ 4.5',
          targetExitFa: '+۳۵٪ تا +۴۸٪ بازدهی با تعدیل نرخ دلار توافقی شرکت‌ها',
          stopLossFa: 'حد ضرر ۱۲٪ زیر میانگین قیمت خرید',
        },
        {
          id: 'FIXED_INCOME_RESERVE',
          marketFa: 'نقدینگی آماده و درآمد ثابت روزشمار',
          instrumentFa: 'صندوق درآمد ثابت بورس (آگاس / کمند) + تتر (USDT)',
          weightPct: 10,
          unitPriceToman: s.tetherUsdtToman,
          unitNameFa: 'واحد تتر (معادل دلاری)',
          entryRuleFa: 'پارک نقدینگی با سود ۳۸.۴٪ سالانه جهت شکار فرصت‌های اصلاحی',
          targetExitFa: 'تزریق به پله‌های دوم و سوم طلا و سهام در اصلاح بازار',
          stopLossFa: 'بدون ریسک کاهش اصل سرمایه ریالی',
        },
      ];
    } else if (riskProfile === 'CONSERVATIVE') {
      weights = [
        {
          id: 'GOLD_18K',
          marketFa: 'طلای ۱۸ عیار و صندوق‌های طلای بورس (سپر تورم)',
          instrumentFa: 'صندوق طلا (عیار / طلا) یا طلای آب‌شده رسمی (بدون حباب سکه)',
          weightPct: 35,
          unitPriceToman: s.gold18kGramToman,
          unitNameFa: 'گرم طلای ۱۸ عیار',
          entryRuleFa: `پله اول (۵۰٪) در ${formatMoney(s.gold18kGramToman)} | پله دوم در ${formatMoney(s.gold18kGramToman * 0.975)}`,
          targetExitFa: `${formatMoney(s.gold18kGramToman * 1.22)} (+۲۲٪ هدف اول)`,
          stopLossFa: 'نگهداری میان‌مدت جهت پوشش تورم ریالی',
        },
        {
          id: 'FIXED_INCOME_ETF',
          marketFa: 'صندوق‌های درآمد ثابت بورس (سود روزشمار قطعی)',
          instrumentFa: 'نماد آگاس / کمند / کاردان (۳۸.۴٪ مؤثر سالانه بدون مالیات)',
          weightPct: 35,
          unitPriceToman: 1_000,
          unitNameFa: 'واحد صندوق درآمد ثابت',
          entryRuleFa: 'خرید روی NAV در ساعت معاملاتی بورس؛ نقدشوندگی آنی',
          targetExitFa: 'دریافت سود ماهانه حدود ۲.۷۵٪ + ذخیره نقدینگی برای خرید در کف',
          stopLossFa: 'تضمین اصل سرمایه (ریسک صفر)',
        },
        {
          id: 'BOURSE_DIVIDEND',
          marketFa: 'سهام بزرگ سودده و کم‌نوسان بورس',
          instrumentFa: 'فملی، شپنا، وبملت، فولاد (سود تقسیمی بالا و P/E زیر ۵)',
          weightPct: 18,
          unitPriceToman: avgStockUnitToman,
          unitNameFa: 'برگه سهم بنیادی',
          entryRuleFa: 'خرید در ۲ پله در روزهای متعادل بازار',
          targetExitFa: '+۳۰٪ تا +۴۰٪ (رشد قیمتی + سود مجمع)',
          stopLossFa: '۱۰٪ زیر میانگین خرید',
        },
        {
          id: 'FX_USDT',
          marketFa: 'دلار دیجیتال (تتر USDT) / اسکناس',
          instrumentFa: 'تتر در صرافی معتبر یا دلار آزاد (لنگر حواله درهم)',
          weightPct: 12,
          unitPriceToman: s.tetherUsdtToman,
          unitNameFa: 'دلار / تتر (USDT)',
          entryRuleFa: `خرید در کف نوسان روزانه (${formatMoney(s.tetherUsdtToman * 0.99)})`,
          targetExitFa: formatMoney(s.tetherUsdtToman * 1.18),
          stopLossFa: `تثبیت زیر ${formatMoney(s.tetherUsdtToman * 0.92)}`,
        },
      ];
    } else if (riskProfile === 'BALANCED') {
      weights = [
        {
          id: 'GOLD_18K',
          marketFa: 'طلای ۱۸ عیار و صندوق‌های طلا (بدون حباب کاذب سکه)',
          instrumentFa: 'نماد عیار / کهربا / طلا یا طلای آب‌شده معتبر',
          weightPct: 35,
          unitPriceToman: s.gold18kGramToman,
          unitNameFa: 'گرم طلای ۱۸ عیار',
          entryRuleFa: `پله اول (۴۰٪) در ${formatMoney(s.gold18kGramToman)} | پله دوم (۳۵٪) در ${formatMoney(s.gold18kGramToman * 0.975)} | پله سوم (۲۵٪) در ${formatMoney(s.gold18kGramToman * 0.95)}`,
          targetExitFa: `${formatMoney(s.gold18kGramToman * 1.26)} (+۲۶٪ هدف ۶ ماهه)`,
          stopLossFa: `تثبیت هفتگی زیر ${formatMoney(s.gold18kGramToman * 0.91)}`,
        },
        {
          id: 'BOURSE_LEADERS',
          marketFa: 'سبد سهام پیشرو صادراتی و ارزی بورس (جامپ دلاری)',
          instrumentFa: 'فملی (۳۰٪)، شپنا (۳۰٪)، وبملت (۲۵٪)، فولاد/فارس (۱۵٪)',
          weightPct: 35,
          unitPriceToman: avgStockUnitToman,
          unitNameFa: 'برگه سهم بنیادی',
          entryRuleFa: 'ورود ۳ پله‌ای؛ استفاده از شکاف نرخ دلار توافقی و دلار آزاد',
          targetExitFa: '+۳۵٪ تا +۵۰٪ بازدهی کل در افق ۳ تا ۶ ماهه',
          stopLossFa: 'حد ضرر ۱۲٪ از میانگین قیمت خرید هر نماد',
        },
        {
          id: 'FX_USDT',
          marketFa: 'بازار ارز (تتر لحظه‌ای USDT / دلار آزاد)',
          instrumentFa: 'تتر (USDT-IRT) با کارمزد ۰.۱۵٪ و نقدشوندگی ۲۴ ساعته',
          weightPct: 15,
          unitPriceToman: s.tetherUsdtToman,
          unitNameFa: 'واحد تتر (USDT)',
          entryRuleFa: `خرید زمانی که دلار کمتر یا مساوی برابری درهم (${formatMoney(s.dirhamImpliedDollarToman)}) است`,
          targetExitFa: formatMoney(s.tetherUsdtToman * 1.2),
          stopLossFa: `تثبیت زیر ${formatMoney(s.tetherUsdtToman * 0.92)}`,
        },
        {
          id: 'FIXED_INCOME_RESERVE',
          marketFa: 'ذخیره نقدینگی استراتژیک (کف‌خر در اصلاح‌ها)',
          instrumentFa: 'صندوق درآمد ثابت بورس (آگاس / کمند) — سود ۳۸.۴٪ سالانه',
          weightPct: 15,
          unitPriceToman: 1_000,
          unitNameFa: 'واحد صندوق درآمد ثابت',
          entryRuleFa: 'نگهداری برای اجرای پله سوم خرید طلا و سهام در روزهای منفی سنگین',
          targetExitFa: 'سود قطعی روزشمار تا لحظه شکار فرصت خرید',
          stopLossFa: 'بدون ریسک کاهش اصل سرمایه',
        },
      ];
    } else {
      // AGGRESSIVE
      weights = [
        {
          id: 'BOURSE_HIGH_BETA',
          marketFa: 'سبد سهام پیشرو و اهرمی بورس (حداکثر پتانسیل رشد)',
          instrumentFa: 'شپنا (۳۰٪)، فملی (۳۰٪)، وبملت (۲۵٪)، اهرم/شتاب (۱۵٪)',
          weightPct: 45,
          unitPriceToman: avgStockUnitToman,
          unitNameFa: 'برگه سهم / واحد صندوق',
          entryRuleFa: 'ورود در ۳ پله روی کف ارزش دلاری بورس و P/E ~ 4.4',
          targetExitFa: '+۴۵٪ تا +۶۵٪ در موج تعدیل نرخ ارز شرکت‌ها',
          stopLossFa: 'حد ضرر سخت‌گیرانه ۱۰٪ تا ۱۲٪ روی بخش اهرمی',
        },
        {
          id: 'GOLD_18K_LEVERAGED',
          marketFa: 'طلای ۱۸ عیار و صندوق‌های طلای بورس',
          instrumentFa: 'نماد عیار / کهربا / طلا (بهره‌مندی همزمان از انس و دلار)',
          weightPct: 35,
          unitPriceToman: s.gold18kGramToman,
          unitNameFa: 'گرم طلای ۱۸ عیار',
          entryRuleFa: `پله اول در ${formatMoney(s.gold18kGramToman)} | پله دوم در ${formatMoney(s.gold18kGramToman * 0.97)}`,
          targetExitFa: `${formatMoney(s.gold18kGramToman * 1.32)} (+۳۲٪)`,
          stopLossFa: `تثبیت زیر ${formatMoney(s.gold18kGramToman * 0.9)}`,
        },
        {
          id: 'FX_USDT_SWING',
          marketFa: 'نوسان‌گیری تتر / دلار و ثبت‌نام خودروی کارخانه‌ای',
          instrumentFa: 'تتر (USDT) یا بلوکه موقت در طرح فروش کارخانه‌ای خودرو (شکاف ۳۵٪)',
          weightPct: 20,
          unitPriceToman: s.tetherUsdtToman,
          unitNameFa: 'واحد تتر (USDT)',
          entryRuleFa: `خرید در کف‌های ۲۴ ساعته (${formatMoney(s.tetherUsdtToman * 0.985)})`,
          targetExitFa: formatMoney(s.tetherUsdtToman * 1.24),
          stopLossFa: `تثبیت زیر ${formatMoney(s.tetherUsdtToman * 0.92)}`,
        },
      ];
    }

    return weights.map((w) => {
      const allocatedToman = Math.round((capitalToman * w.weightPct) / 100);
      const quantity = w.unitPriceToman > 0 ? allocatedToman / w.unitPriceToman : 0;
      const step1Toman = Math.round(allocatedToman * 0.45);
      const step2Toman = Math.round(allocatedToman * 0.35);
      const step3Toman = allocatedToman - step1Toman - step2Toman;
      return {
        ...w,
        allocatedToman,
        quantity,
        step1Toman,
        step2Toman,
        step3Toman,
      };
    });
  };

  const handleAskLiveAdvisor = async () => {
    try {
      setAdvisorLoading(true);
      const res = await fetch('/api/market/ai-trade-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capitalToman,
          horizonFa:
            horizon === 'SHORT_1_3M'
              ? 'کوتاه‌مدت (۱ تا ۳ ماه)'
              : horizon === 'MEDIUM_3_6M'
                ? 'میان‌مدت (۳ تا ۶ ماه)'
                : 'بلندمدت (۶ تا ۱۲ ماه)',
          riskProfileFa:
            riskProfile === 'CONSERVATIVE'
              ? 'محافظه‌کارانه (حفظ اصل سرمایه و پوشش تورم)'
              : riskProfile === 'BALANCED'
                ? 'متعادل (رشد بهینه و ریسک کنترل‌شده)'
                : 'تهاجمی (تحمل نوسان بالا)',
          liquidityNeedFa,
          question: customAdvisorQuestion,
        }),
      });
      const data = (await res.json()) as EvidenceBoundAnalystResponse;
      if (data.answerFa) {
        setAdvisorResponse(data.answerFa);
        setAdvisorFullData(data);
      }
    } catch {
      setAdvisorResponse('خطا در دریافت پاسخ مشاور هوشمند؛ لطفاً جدول محاسباتی بالا را بررسی نمایید.');
    } finally {
      setAdvisorLoading(false);
    }
  };

  if (loading && !snapshot) {
    return (
      <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-xl">
        <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-200">
          در حال دریافت نرخ‌های لحظه‌ای طلا، سکه، دلار، تتر و محاسبه سیگنال‌های معاملاتی بازار ایران...
        </p>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="p-6 bg-rose-950/30 border border-rose-800/60 rounded-xl text-rose-200">
        <p className="text-sm font-semibold mb-2">خطا در بارگذاری ترمینال بازار لایو</p>
        <p className="text-xs opacity-80 mb-4">{error}</p>
        <button
          onClick={() => fetchLiveMarket(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium"
        >
          تلاش مجدد اتصال زنده
        </button>
      </div>
    );
  }

  const s = snapshot.summaryIndicators;
  const filteredOpportunities =
    selectedCategory === 'ALL'
      ? snapshot.topOpportunities
      : snapshot.topOpportunities.filter((o) => o.marketCategory === selectedCategory);

  const selectedSectorOutlook: SectorDeepDiveOutlook =
    snapshot.sectorOutlooks.find((sec) => sec.sectorId === activeSectorId) ||
    snapshot.sectorOutlooks[0];

  const allocationRows = computeAllocationPlan();

  return (
    <div className="space-y-6">
      {/* Top Header & Live Market Feed Status Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                متصل به نرخ‌های لایو بازار ایران
              </span>
              {snapshot.liveSourcesUsed.map((src, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded text-[11px] bg-slate-800/90 text-slate-300 border border-slate-700"
                >
                  {src}
                </span>
              ))}
            </div>
            <h1 className="text-xl font-bold text-slate-100">
              ترمینال فرصت‌های معاملاتی لایو، خرید سهام و تخصیص سرمایه در بازارهای ایران
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              محاسبه لحظه‌ای ارزش ذاتی، حباب سکه و طلا، برابری حواله درهم دوبی، شکاف دلاری سهام بورس، ارزش دلاری خودرو و نسبت طلایی مسکن به طلا برای تصمیم‌گیری معاملاتی و خرید پله‌ای
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-center">
            <div className="text-left">
              <div className="text-[11px] text-slate-400">آخرین به‌روزرسانی زنده:</div>
              <div className="text-xs font-mono text-slate-200" dir="ltr">
                {new Date(snapshot.fetchedAtIso).toLocaleTimeString('fa-IR')}
              </div>
            </div>
            <button
              onClick={() => fetchLiveMarket(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition cursor-pointer shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'در حال دریافت...' : 'به‌روزرسانی لحظه‌ای قیمت‌ها'}
            </button>
          </div>
        </div>

        {/* Live Market Key Radar Strip (8 Crucial Live Numbers + Intrinsic Parity) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2.5 mt-5">
          {/* 1. Gold 18K */}
          <div className="bg-slate-950/75 border border-slate-800/90 rounded-lg p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>طلای ۱۸ عیار (گرم)</span>
              <Coins className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-sm font-bold font-mono tabular-nums text-amber-300">
              {formatMoney(s.gold18kGramToman)}
            </div>
            <div className="text-[11px] mt-1 flex items-center justify-between">
              <span className="text-slate-400">حباب ذاتی:</span>
              <span
                className={`font-mono font-semibold ${
                  Math.abs(s.gold18kBubblePct) < 2 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {s.gold18kBubblePct > 0 ? `+${s.gold18kBubblePct}%` : `${s.gold18kBubblePct}%`}
              </span>
            </div>
          </div>

          {/* 2. Emami Coin */}
          <div className="bg-slate-950/75 border border-slate-800/90 rounded-lg p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>سکه تمام امامی</span>
              <span className="text-[10px] text-amber-400/90">ذاتی: {(s.coinEmamiIntrinsicToman / 1e6).toFixed(1)}M</span>
            </div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-100">
              {formatMoney(s.coinEmamiToman)}
            </div>
            <div className="text-[11px] mt-1 flex items-center justify-between">
              <span className="text-slate-400">حباب سکه:</span>
              <span
                className={`font-mono font-semibold ${
                  s.coinEmamiBubblePct > 15 ? 'text-rose-400' : 'text-amber-300'
                }`}
              >
                +{s.coinEmamiBubblePct}%
              </span>
            </div>
          </div>

          {/* 3. Quarter Coin Bubble Warning */}
          <div className="bg-slate-950/75 border border-slate-800/90 rounded-lg p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>ربع سکه بهار آزادی</span>
              <span className="text-[10px] text-rose-400">ذاتی: {(s.coinQuarterToman / (1 + s.coinQuarterBubblePct / 100) / 1e6).toFixed(1)}M</span>
            </div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-100">
              {formatMoney(s.coinQuarterToman)}
            </div>
            <div className="text-[11px] mt-1 flex items-center justify-between">
              <span className="text-slate-400">حباب ربع:</span>
              <span className="font-mono font-semibold text-rose-400">
                +{s.coinQuarterBubblePct}%
              </span>
            </div>
          </div>

          {/* 4. Free Dollar Tehran */}
          <div className="bg-slate-950/75 border border-slate-800/90 rounded-lg p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>دلار آزاد تهران</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-sm font-bold font-mono tabular-nums text-emerald-300">
              {formatMoney(s.dollarFreeToman)}
            </div>
            <div className="text-[11px] mt-1 flex items-center justify-between">
              <span className="text-slate-400">برابری درهم:</span>
              <span className="font-mono text-slate-300">
                {s.dirhamImpliedDollarToman.toLocaleString('fa-IR')}
              </span>
            </div>
          </div>

          {/* 5. Tether USDT Live */}
          <div className="bg-slate-950/75 border border-slate-800/90 rounded-lg p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>تتر لحظه‌ای (USDT)</span>
              <span className="text-[10px] text-sky-400">نوبیتکس/تترلند</span>
            </div>
            <div className="text-sm font-bold font-mono tabular-nums text-sky-300">
              {formatMoney(s.tetherUsdtToman)}
            </div>
            <div className="text-[11px] mt-1 flex items-center justify-between">
              <span className="text-slate-400">اسپرد با دلار:</span>
              <span className="font-mono text-slate-300">
                {s.dollarTetherSpreadPct > 0
                  ? `+${s.dollarTetherSpreadPct}%`
                  : `${s.dollarTetherSpreadPct}%`}
              </span>
            </div>
          </div>

          {/* 6. Global Gold Ounce */}
          <div className="bg-slate-950/75 border border-slate-800/90 rounded-lg p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>انس جهانی طلا</span>
              <span className="text-[10px] text-amber-300">XAU/USD</span>
            </div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-100" dir="ltr">
              ${s.globalOunceUsd.toLocaleString('en-US', { minimumFractionDigits: 1 })}
            </div>
            <div className="text-[11px] mt-1 flex items-center justify-between">
              <span className="text-slate-400">درهم امارات:</span>
              <span className="font-mono text-slate-300">
                {s.dirhamUaeToman.toLocaleString('fa-IR')} ت
              </span>
            </div>
          </div>

          {/* 7. Bourse TEDPIX */}
          <div className="bg-slate-950/75 border border-slate-800/90 rounded-lg p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>شاخص کل بورس</span>
              <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-sm font-bold font-mono tabular-nums text-indigo-300">
              {s.tedpixIndex.toLocaleString('fa-IR')}
            </div>
            <div className="text-[11px] mt-1 flex items-center justify-between">
              <span className="text-slate-400">P/E پیشروها:</span>
              <span className="font-mono text-emerald-400 font-semibold">۴.۵ (کف ارزندگی)</span>
            </div>
          </div>

          {/* 8. Tehran Housing to Gold Ratio */}
          <div className="bg-slate-950/75 border border-slate-800/90 rounded-lg p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>مسکن تهران (هر متر)</span>
              <Building2 className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div className="text-sm font-bold font-mono tabular-nums text-teal-300">
              {formatMoney(s.tehranHousingSqmToman)}
            </div>
            <div className="text-[11px] mt-1 flex items-center justify-between">
              <span className="text-slate-400">نسبت به طلا:</span>
              <span className="font-mono text-emerald-400 font-semibold">
                {s.housingPerGoldGramRatio} گرم/متر
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 4 Sub-Navigation Tabs for Trading & Investment Action */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('SIGNALS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'SIGNALS'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Target className="w-4 h-4" />
          ۱. فرصت‌های معاملاتی لایو و نقاط ورود/خروج ({snapshot.topOpportunities.length} سیگنال فعال)
        </button>

        <button
          onClick={() => setActiveTab('STOCKS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'STOCKS'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          ۲. تابلوی خرید سهام و صندوق‌های بورس (محدوده خرید، P/E و حد ضرر)
        </button>

        <button
          onClick={() => setActiveTab('SECTORS_OUTLOOK')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'SECTORS_OUTLOOK'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          ۳. وضعیت پیش‌روی ۵ بازار ایران (طلا، دلار، بورس، خودرو، مسکن)
        </button>

        <button
          onClick={() => setActiveTab('CAPITAL_ALLOCATOR')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'CAPITAL_ALLOCATOR'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-900 text-amber-300 hover:bg-slate-800 border border-amber-500/30'
          }`}
        >
          <Calculator className="w-4 h-4" />
          ۴. ماشین‌حساب اختصاص سرمایه خرید و مشاور هوشمند (بر اساس بودجه شما)
        </button>
      </div>

      {/* TAB 1: ACTIONABLE LIVE TRADE SIGNALS & SETUPS */}
      {activeTab === 'SIGNALS' && (
        <div className="space-y-4">
          {/* Category Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 rounded-xl p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 ml-2">فیلتر بازار هدف:</span>
              {[
                { id: 'ALL', label: 'همه بازارهای ایران' },
                { id: 'GOLD', label: 'طلا، سکه و صندوق طلا' },
                { id: 'STOCKS', label: 'بورس و سهام بنیادی' },
                { id: 'FX', label: 'دلار، تتر و درهم' },
                { id: 'HOUSING', label: 'مسکن و ملک' },
                { id: 'AUTO', label: 'خودرو (کارخانه و بازار)' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as typeof selectedCategory)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setActiveTab('CAPITAL_ALLOCATOR')}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5" />
              محاسبه مبلغ دقیق خرید برای بودجه شما ⬅
            </button>
          </div>

          {/* Opportunity Cards Grid */}
          <div className="grid grid-cols-1 gap-5">
            {filteredOpportunities.map((opp: MarketOpportunitySignal) => {
              const isStrongBuy = opp.actionSignal === 'STRONG_BUY';
              const isAccumulate = opp.actionSignal === 'ACCUMULATE_STEPWISE';
              const isReduce = opp.actionSignal === 'TAKE_PROFIT_REDUCE';

              const badgeColors = isStrongBuy
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : isAccumulate
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  : isReduce
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

              return (
                <div
                  key={opp.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition"
                >
                  {/* Card Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-4 border-b border-slate-800">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                          {opp.marketCategoryFa}
                        </span>
                        <span
                          className={`px-3 py-0.5 rounded-md text-xs font-bold border ${badgeColors}`}
                        >
                          {opp.actionLabelFa}
                        </span>
                        <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-slate-950 text-slate-300 border border-slate-800">
                          نماد / ابزار: {opp.tickerOrInstrumentFa}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-100">{opp.assetTitleFa}</h3>
                    </div>

                    <div className="flex items-center gap-4 self-start lg:self-center bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-lg">
                      <div>
                        <div className="text-[11px] text-slate-400">امتیاز ارزندگی و اطمینان</div>
                        <div className="text-sm font-bold font-mono text-emerald-400">
                          {opp.convictionScore} / 100
                        </div>
                      </div>
                      <div className="h-7 w-px bg-slate-800" />
                      <div>
                        <div className="text-[11px] text-slate-400">نسبت ریسک به بازده (R/R)</div>
                        <div className="text-sm font-bold font-mono text-amber-300" dir="ltr">
                          {opp.riskRewardRatio}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Trade Setup Box: Live Price, Fair Value, Entry, Targets, Stop-Loss */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 my-4">
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
                      <div className="text-[11px] text-slate-400 mb-1">قیمت لایو / فعلی بازار</div>
                      <div className="text-xs font-bold text-slate-100 font-mono">
                        {opp.currentLivePriceDisplay}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {opp.valuationStatusFa}
                      </div>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
                      <div className="text-[11px] text-slate-400 mb-1">ارزش ذاتی / تعادلی</div>
                      <div className="text-xs font-bold text-sky-300 font-mono">
                        {opp.intrinsicOrFairValueDisplay}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        افق پیشنهادی: {opp.recommendedHorizonFa}
                      </div>
                    </div>

                    <div className="bg-emerald-950/25 border border-emerald-800/50 rounded-lg p-3">
                      <div className="text-[11px] text-emerald-400 font-semibold mb-1">
                        محدوده ورود پیشنهادی (Entry)
                      </div>
                      <div className="text-xs font-bold text-emerald-200">{opp.entryZoneFa}</div>
                      <div className="text-[11px] text-emerald-400/80 mt-1">
                        نقدشوندگی: {opp.liquidityGradeFa}
                      </div>
                    </div>

                    <div className="bg-indigo-950/25 border border-indigo-800/50 rounded-lg p-3">
                      <div className="text-[11px] text-indigo-300 font-semibold mb-1">
                        حد سود اول و دوم (Targets)
                      </div>
                      <div className="text-xs font-bold text-indigo-200">۱) {opp.targetZone1Fa}</div>
                      <div className="text-[11px] text-indigo-300 mt-1">۲) {opp.targetZone2Fa}</div>
                    </div>

                    <div className="bg-rose-950/25 border border-rose-800/50 rounded-lg p-3">
                      <div className="text-[11px] text-rose-300 font-semibold mb-1">
                        حد ضرر / شرط ابطال (Stop-Loss)
                      </div>
                      <div className="text-xs font-medium text-rose-200">
                        {opp.stopLossOrInvalidationFa}
                      </div>
                    </div>
                  </div>

                  {/* Stepwise Buying Plan & Fundamental Evidence */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
                    <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-3.5">
                      <h4 className="text-xs font-bold text-amber-300 mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        استراتژی ورود پله‌ای و مدیریت حجم معامله:
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {opp.stepwisePlanFa.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-2 leading-relaxed">
                            <span className="text-amber-400 font-mono font-bold mt-0.5">
                              {idx + 1}.
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-300">
                        <strong className="text-emerald-400">نحوه اجرای عملی معامله: </strong>
                        {opp.executionHowToFa}
                      </div>
                    </div>

                    <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-3.5">
                      <h4 className="text-xs font-bold text-sky-300 mb-2 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        شواهد ریاضی و بنیادی قابل استناد (چرا این فرصت شکل گرفته است؟):
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {opp.rationaleBulletsFa.map((b, idx) => (
                          <li key={idx} className="flex items-start gap-2 leading-relaxed">
                            <span className="text-sky-400 font-bold">•</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-slate-400">محرک‌های پیش‌رو:</span>
                        {opp.catalystsFa.map((cat, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: BOURSE STOCKS & ETFS BUY WATCHLIST */}
      {activeTab === 'STOCKS' && (
        <div className="space-y-5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-100">
                  تابلوی تحلیل و خرید سهام پیشرو و صندوق‌های قابل معامله بورس تهران (ETF)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  ارزش‌گذاری مبتنی بر نسبت P/E آینده‌نگر، سود تقسیمی (DPS) و شکاف میان دلار توافقی شرکت‌ها با دلار آزاد لحظه‌ای ({formatMoney(s.dollarFreeToman)})
                </p>
              </div>
              <div className="px-3 py-2 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-xs text-emerald-300">
                شکاف فعلی دلار توافقی شرکت‌ها با دلار آزاد:{' '}
                <strong className="font-mono">+38.8%</strong> (پتانسیل جامپ درآمدی صادراتی‌ها)
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-950/60">
                    <th className="p-3 font-semibold">نماد و نام شرکت</th>
                    <th className="p-3 font-semibold">گروه / صنعت</th>
                    <th className="p-3 font-semibold">سیگنال معاملاتی</th>
                    <th className="p-3 font-semibold">P/E فعلی (تاریخی)</th>
                    <th className="p-3 font-semibold">محدوده ورود (خرید پله‌ای)</th>
                    <th className="p-3 font-semibold">هدف قیمتی ۶ ماهه</th>
                    <th className="p-3 font-semibold">حد ضرر الزامی</th>
                    <th className="p-3 font-semibold">بازده مورد انتظار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-xs">
                  {snapshot.stockOpportunities.map((stk: BourseStockOpportunity, i) => {
                    const sigStyle =
                      stk.signal === 'STRONG_BUY'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : stk.signal === 'BUY_STEPWISE'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

                    return (
                      <tr key={i} className="hover:bg-slate-800/40 transition">
                        <td className="p-3">
                          <div className="font-bold text-slate-100">{stk.symbol}</div>
                          <div className="text-[11px] text-slate-400">{stk.companyNameFa}</div>
                        </td>
                        <td className="p-3 text-slate-300">{stk.sectorFa}</td>
                        <td className="p-3">
                          <span
                            className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold border ${sigStyle}`}
                          >
                            {stk.signalLabelFa}
                          </span>
                        </td>
                        <td className="p-3 font-mono">
                          {stk.forwardPe > 0 ? (
                            <span>
                              <strong className="text-emerald-400">{stk.forwardPe}</strong>{' '}
                              <span className="text-slate-400">(تاریخی: {stk.historicalMeanPe})</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">مبتنی بر NAV / جایگزینی</span>
                          )}
                        </td>
                        <td className="p-3 font-medium text-emerald-300">{stk.entryZoneRialFa}</td>
                        <td className="p-3 font-medium text-indigo-300">{stk.targetPriceRialFa}</td>
                        <td className="p-3 font-medium text-rose-300">{stk.stopLossRialFa}</td>
                        <td className="p-3 font-bold text-amber-300">{stk.expectedReturn6MPct}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Fundamental Cards for Each Stock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {snapshot.stockOpportunities.map((stk, idx) => (
              <div
                key={idx}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-100">
                    {stk.symbol} — {stk.companyNameFa}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                    بازده هدف: {stk.expectedReturn6MPct}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{stk.fundamentalThesisFa}</p>
                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="text-emerald-400">
                    <strong>محرک صعودی (کاتالیزور): </strong>
                    <span className="text-slate-300">{stk.keyCatalystFa}</span>
                  </div>
                  <div className="text-rose-400">
                    <strong>ریسک اصلی: </strong>
                    <span className="text-slate-300">{stk.mainRiskFa}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: 5 IRANIAN MARKETS DEEP-DIVE OUTLOOK (GOLD, FX, STOCKS, AUTO, HOUSING) */}
      {activeTab === 'SECTORS_OUTLOOK' && (
        <div className="space-y-5">
          {/* 5 Market Selector Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { id: 'GOLD', title: 'طلا و سکه', icon: Coins, score: 92 },
              { id: 'STOCKS', title: 'بورس و سهام', icon: BarChart3, score: 89 },
              { id: 'HOUSING', title: 'مسکن و ملک', icon: Building2, score: 86 },
              { id: 'FX', title: 'دلار، تتر و ارز', icon: DollarSign, score: 81 },
              { id: 'AUTO', title: 'بازار خودرو', icon: Car, score: 68 },
            ].map((item) => {
              const IconComp = item.icon;
              const isSelected = activeSectorId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSectorId(item.id as typeof activeSectorId)}
                  className={`p-3.5 rounded-xl border text-right transition cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500/60 text-white shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <IconComp
                      className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`}
                    />
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-emerald-400">
                      جذابیت: {item.score}/100
                    </span>
                  </div>
                  <div className="text-sm font-bold">{item.title}</div>
                </button>
              );
            })}
          </div>

          {/* Selected Sector Deep Dive Panel */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-100">
                  {selectedSectorOutlook.sectorNameFa}
                </h2>
                <p className="text-xs text-emerald-400 font-medium mt-1">
                  فاز فعلی چرخه بازار: {selectedSectorOutlook.currentPhaseFa}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2">
                  <div className="text-[11px] text-slate-400">چشم‌انداز ۱ ماهه (کوتاه‌مدت)</div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">
                    {selectedSectorOutlook.shortTermBias1MFa}
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2">
                  <div className="text-[11px] text-slate-400">چشم‌انداز ۶ ماهه (میان‌مدت)</div>
                  <div className="text-xs font-bold text-emerald-300 mt-0.5">
                    {selectedSectorOutlook.mediumTermBias6MFa}
                  </div>
                </div>
              </div>
            </div>

            {/* Key Sector Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {selectedSectorOutlook.keyMetrics.map((m, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5"
                >
                  <div className="text-xs text-slate-400 mb-1">{m.labelFa}</div>
                  <div className="text-base font-bold font-mono text-amber-300">
                    {m.valueDisplay}
                  </div>
                  <div className="text-xs text-slate-300 mt-1.5">{m.interpretationFa}</div>
                </div>
              ))}
            </div>

            {/* Benchmark Items Comparison Table (Gold items, Car models, Housing types, etc.) */}
            <div>
              <h3 className="text-sm font-bold text-slate-200 mb-3">
                جدول مقایسه قیمت بازار آزاد با ارزش ذاتی / قیمت کارخانه و حکم معاملاتی:
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-400 bg-slate-950/60">
                      <th className="p-3 font-semibold">دارایی / مدل شاخص در بازار ایران</th>
                      <th className="p-3 font-semibold">قیمت فعلی بازار آزاد</th>
                      <th className="p-3 font-semibold">ارزش ذاتی / قیمت کارخانه</th>
                      <th className="p-3 font-semibold">حباب / شکاف قیمتی</th>
                      <th className="p-3 font-semibold">توصیه و حکم سرمایه‌گذاری</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-xs">
                    {selectedSectorOutlook.benchmarkItems.map((b, i) => (
                      <tr key={i} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-slate-100">{b.nameFa}</td>
                        <td className="p-3 font-mono text-slate-200">{b.currentMarketPriceFa}</td>
                        <td className="p-3 font-mono text-sky-300">{b.fairOrFactoryPriceFa}</td>
                        <td className="p-3 font-mono">
                          <span
                            className={`inline-flex items-center gap-1 font-bold ${
                              b.spreadOrBubblePct <= 0
                                ? 'text-emerald-400'
                                : b.spreadOrBubblePct > 20
                                  ? 'text-rose-400'
                                  : 'text-amber-300'
                            }`}
                          >
                            {b.spreadOrBubblePct > 0 ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            )}
                            {b.spreadOrBubblePct > 0
                              ? `+${b.spreadOrBubblePct}%`
                              : `${b.spreadOrBubblePct}%`}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-emerald-300">{b.verdictFa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Analytical Verdict Box */}
            <div className="bg-emerald-950/25 border border-emerald-800/50 rounded-xl p-4 space-y-2">
              <div className="text-xs font-bold text-emerald-300">
                جمع‌بندی تحلیلی وضعیت پیش‌روی بازار:
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {selectedSectorOutlook.summaryAnalysisFa}
              </p>
              <div className="pt-2 border-t border-emerald-800/40 text-xs font-bold text-amber-300">
                نسخه اجرایی تخصیص سرمایه: {selectedSectorOutlook.actionableVerdictFa}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INTERACTIVE CAPITAL ALLOCATION CALCULATOR & AI TRADE STRATEGIST */}
      {activeTab === 'CAPITAL_ALLOCATOR' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-400" />
                ماشین‌حساب هوشمند اختصاص سرمایه خرید (محاسبه دقیق تعداد واحد، گرم طلا، سهام و پله‌های ورود)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                مبلغ سرمایه نقد خود را به تومان وارد کنید تا بر اساس قیمت‌های لحظه‌ای همین ثانیه بازار، سبد خرید دقیق، تعداد گرم طلا، تعداد تتر، سبد سهام و مبالغ ورود در هر پله محاسبه شود.
              </p>
            </div>

            {/* User Input Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/70 border border-slate-800 rounded-xl p-4">
              {/* 1. Capital Amount in Toman */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ۱. مبلغ سرمایه قابل اختصاص برای خرید (تومان):
                </label>
                <input
                  type="number"
                  min={1_000_000}
                  step={10_000_000}
                  value={capitalToman}
                  onChange={(e) => setCapitalToman(Math.max(1_000_000, Number(e.target.value)))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono font-bold text-amber-300 focus:outline-none focus:border-emerald-500"
                />
                <div className="text-[11px] text-emerald-400 mt-1 font-medium">
                  معادل: {capitalToman.toLocaleString('fa-IR')} تومان (
                  {(capitalToman / s.dollarFreeToman).toFixed(0)} دلار آزاد)
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    { label: '۱۰۰ میلیون', val: 100_000_000 },
                    { label: '۵۰۰ میلیون', val: 500_000_000 },
                    { label: '۱ میلیارد', val: 1_000_000_000 },
                    { label: '۲.۵ میلیارد', val: 2_500_000_000 },
                    { label: '۵ میلیارد (شامل مسکن)', val: 5_000_000_000 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      onClick={() => setCapitalToman(preset.val)}
                      className={`px-2 py-1 rounded text-[11px] font-medium cursor-pointer transition ${
                        capitalToman === preset.val
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Risk Appetite */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ۲. استراتژی و درجه ریسک‌پذیری شما:
                </label>
                <div className="space-y-1.5">
                  {[
                    {
                      id: 'CONSERVATIVE',
                      label: 'محافظه‌کارانه (تمرکز بر طلای ۱۸ عیار + سود روزشمار ۳۱.۵٪)',
                    },
                    {
                      id: 'BALANCED',
                      label: 'متعادل و بهینه (ترکیب طلا + سهام بنیادی دلاری + تتر)',
                    },
                    {
                      id: 'AGGRESSIVE',
                      label: 'تهاجمی و پربازده (حداکثر وزن سهام جامپ دلاری + طلا)',
                    },
                  ].map((rp) => (
                    <button
                      key={rp.id}
                      onClick={() => setRiskProfile(rp.id as typeof riskProfile)}
                      className={`w-full text-right px-3 py-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
                        riskProfile === rp.id
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {rp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Investment Horizon */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ۳. افق زمانی سرمایه‌گذاری:
                </label>
                <div className="space-y-1.5">
                  {[
                    { id: 'SHORT_1_3M', label: 'کوتاه‌مدت (۱ تا ۳ ماه — نقدشوندگی بالا)' },
                    { id: 'MEDIUM_3_6M', label: 'میان‌مدت (۳ تا ۶ ماه — شکار موج تعدیل ارزی)' },
                    {
                      id: 'LONG_6_12M',
                      label: 'بلندمدت (۶ تا ۱۲ ماه — شامل تبدیل طلا به ملک برای سرمایه‌های بالا)',
                    },
                  ].map((hz) => (
                    <button
                      key={hz.id}
                      onClick={() => setHorizon(hz.id as typeof horizon)}
                      className={`w-full text-right px-3 py-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
                        horizon === hz.id
                          ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {hz.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Computed Buy Order Sheet Table */}
            <div>
              <h3 className="text-sm font-bold text-slate-100 mb-3">
                جدول اجرایی سبد خرید پیشنهادی برای سرمایه{' '}
                <span className="text-amber-400 font-mono">
                  {capitalToman.toLocaleString('fa-IR')} تومان
                </span>{' '}
                (محاسبه‌شده با قیمت‌های لایو):
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-950/70">
                      <th className="p-3 font-semibold">بازار و طبقه دارایی</th>
                      <th className="p-3 font-semibold">ابزار / نماد دقیق خرید</th>
                      <th className="p-3 font-semibold">وزن و مبلغ کل اختصاص‌یافته</th>
                      <th className="p-3 font-semibold">تعداد واحد / مقدار در قیمت لایو</th>
                      <th className="p-3 font-semibold">تقسیم‌بندی پله‌های ورود (مدیریت ریسک)</th>
                      <th className="p-3 font-semibold">حد سود و حد ضرر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-xs">
                    {allocationRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-slate-100">{row.marketFa}</td>
                        <td className="p-3 text-emerald-300 font-medium">{row.instrumentFa}</td>
                        <td className="p-3 font-mono">
                          <div className="font-bold text-amber-300">
                            {row.allocatedToman.toLocaleString('fa-IR')} تومان
                          </div>
                          <div className="text-[11px] text-slate-400">({row.weightPct}٪ کل سبد)</div>
                        </td>
                        <td className="p-3 font-mono text-sky-300 font-bold">
                          {row.quantity >= 100
                            ? Math.round(row.quantity).toLocaleString('fa-IR')
                            : row.quantity.toFixed(2)}{' '}
                          <span className="text-[11px] font-sans font-normal text-slate-300">
                            {row.unitNameFa}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="text-[11px] text-slate-200 space-y-0.5">
                            <div>
                              • <strong>پله اول (۴۵٪ - امروز):</strong>{' '}
                              <span className="font-mono text-emerald-300">
                                {row.step1Toman.toLocaleString('fa-IR')} ت
                              </span>
                            </div>
                            <div>
                              • <strong>پله دوم (۳۵٪ - در اصلاح):</strong>{' '}
                              <span className="font-mono text-sky-300">
                                {row.step2Toman.toLocaleString('fa-IR')} ت
                              </span>
                            </div>
                            <div>
                              • <strong>پله سوم (۲۰٪ - تثبیت):</strong>{' '}
                              <span className="font-mono text-amber-300">
                                {row.step3Toman.toLocaleString('fa-IR')} ت
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-[11px]">
                          <div className="text-indigo-300">
                            <strong>هدف:</strong> {row.targetExitFa}
                          </div>
                          <div className="text-rose-300 mt-1">
                            <strong>حد ضرر:</strong> {row.stopLossFa}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Evidence-Bound AI Live Analyst Box */}
            <div className="bg-slate-950/90 border border-emerald-800/50 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  تحلیلگر مستند و مقید به شواهد بازار لایو (ممیزی‌شده با محاسبات مستقل سامانه)
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">نیاز نقدینگی:</span>
                  <select
                    value={liquidityNeedFa}
                    onChange={(e) => setLiquidityNeedFa(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                  >
                    <option value="فوری / روزشمار (نقدشوندگی بالا)">فوری / روزشمار</option>
                    <option value="متوسط (قابل دسترسی در ۱ هفته)">متوسط (۱ هفته)</option>
                    <option value="پایین (عدم نیاز به برداشت ماهانه)">پایین (بلندمدت)</option>
                    <option value="UNSPECIFIED">مشخص‌نشده (آزمون عدم حدس)</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={customAdvisorQuestion}
                  onChange={(e) => setCustomAdvisorQuestion(e.target.value)}
                  placeholder="سؤال تحلیلی خود را بنویسید..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleAskLiveAdvisor}
                  disabled={advisorLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition cursor-pointer shrink-0"
                >
                  {advisorLoading
                    ? 'در حال ممیزی شواهد...'
                    : 'تحلیل مستند (بدون جعل نقطه ورود/خروج)'}
                </button>
              </div>

              {advisorFullData && (
                <div className="mt-3 space-y-3">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <span className="text-emerald-400">
                      ممیز مستقل: {advisorFullData.independentVerification.auditStatus} (اعداد بدون پشتوانه:{' '}
                      {advisorFullData.independentVerification.ungroundedNumbersDetected.length})
                    </span>
                    <span className="text-slate-300">
                      درجه اطمینان: {advisorFullData.confidenceAssessment.levelFa} (
                      {advisorFullData.confidenceAssessment.evidenceScore0To100}/100)
                    </span>
                  </div>
                  <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-lg text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {advisorResponse}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
