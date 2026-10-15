import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { GOLD_HISTORY_SEED } from '../../components/gold-history/gold-history-seed';
import { CommonModule } from '@angular/common';
import { GoldCardComponent } from '../../components/gold-card/gold-card';
import { timeout } from 'rxjs';

import {
  GoldPriceService,
  GoldPrice,
  GoldHistoryItem
} from '../../services/gold-price';

import { GoldChartComponent } from '../../components/gold-chart/gold-chart';
import { GoldCalculatorComponent } from '../../components/gold-calculator/gold-calculator';
import { GoldHistoryComponent } from '../../components/gold-history/gold-history';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    GoldCardComponent,
    GoldChartComponent,
    GoldCalculatorComponent,
    GoldHistoryComponent,
    DatePipe,
    CommonModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  goldPrices: GoldPrice[] = [];
  history: GoldHistoryItem[] = [];

  price24 = 48.250;
  historyLoading = true;
  historyError = '';
lastUpdated: Date | null = null;
private hasCurrentPrice = false;
  constructor(
    private goldPriceService: GoldPriceService
  ) {}

  isRefreshing = false;
refreshMessage = '';

private readonly currentCacheKey = 'oman-gold-current-v1';
private readonly attemptKey = 'oman-gold-current-last-attempt-v1';

private readonly refreshCooldown = 30 * 60 * 1000;

refreshCurrentPriceManually(): void {
  if (this.isRefreshing) return;

  let lastAttempt = 0;

  try {
    lastAttempt = Number(
      localStorage.getItem(this.attemptKey) ?? '0'
    );
  } catch {}

  const elapsed = Date.now() - lastAttempt;

  if (lastAttempt > 0 && elapsed < this.refreshCooldown) {
    const remaining = Math.ceil(
      (this.refreshCooldown - elapsed) / 60000
    );

    this.refreshMessage =
      `يرجى الانتظار ${remaining} دقيقة تقريبًا قبل المحاولة التالية.`;
    return;
  }

  this.isRefreshing = true;
  this.refreshMessage = 'جارٍ تحديث سعر الذهب...';

  try {
    localStorage.setItem(
      this.attemptKey,
      String(Date.now())
    );
  } catch {}

  this.goldPriceService
    .getGoldPrices()
    .pipe(timeout({ first: 15000 }))
    .subscribe({
      next: (prices) => {
        const current24 = prices.find(
          item => item.karat === '24'
        );

        if (
          !current24 ||
          !Number.isFinite(current24.price) ||
          current24.price <= 0
        ) {
          this.refreshMessage = 'وصلت بيانات غير صالحة.';
          this.isRefreshing = false;
          return;
        }

        this.applyCurrentPrices(prices);

        const savedAt = Date.now();

        try {
          localStorage.setItem(
            this.currentCacheKey,
            JSON.stringify({
              savedAt,
              data: this.goldPrices
            })
          );
        } catch {}

        this.lastUpdated = new Date(savedAt);
        this.refreshMessage = 'تم تحديث السعر بنجاح.';
        this.isRefreshing = false;
      },

      error: (error) => {
        console.error('تعذر تحديث السعر:', error);

        this.refreshMessage =
          error.name === 'TimeoutError'
            ? 'انتهت مهلة الاتصال. حاولي لاحقًا.'
            : 'تعذر التحديث حاليًا. احتفظنا بالأسعار المعروضة إن أمكن.';

        this.isRefreshing = false;
      }
    });
}

  private updateCardsFromHistory(data: GoldHistoryItem[]): void {
  if (data.length === 0) return;

  const latest = data[data.length - 1];
  const previous = data.length > 1 ? data[data.length - 2] : null;

  const change24 = previous
    ? latest.price24 - previous.price24
    : 0;

  this.price24 = latest.price24;

  this.goldPrices = [24, 22, 21, 18].map(karat => {
    const factor = karat / 24;

    return {
      karat: String(karat),
      price: latest.price24 * factor,
      change: change24 * factor
    };
  });
}

private applyCurrentPrices(prices: GoldPrice[]): void {
  const current24 = prices.find(item => item.karat === '24');

  if (!current24 || !Number.isFinite(current24.price) || current24.price <= 0) {
    return;
  }

  const latestHistory =
    this.history.length > 0
      ? this.history[this.history.length - 1]
      : null;

  const previous24 = latestHistory?.price24 ?? current24.price;
  const change24 = current24.price - previous24;

  this.price24 = current24.price;

  this.goldPrices = [24, 22, 21, 18].map(karat => {
    const factor = karat / 24;

    return {
      karat: String(karat),
      price: current24.price * factor,
      change: change24 * factor
    };
  });
}
// أوقفنا التحديث التاريخي مؤقتًا لتقليل استهلاك GoldAPI.
// ستظل البيانات المحفوظة متاحة في الجدول والرسم البياني.

private loadHistoricalPrices(): void {
  console.log('بدأت دالة تحميل السجل التاريخي');
  
  const historyKey = 'oman-gold-history-v1';
  const attemptKey = 'oman-gold-history-last-attempt-v1';
  const updateInterval = 24 * 60 * 60 * 1000;

  let savedAt = 0;
  let lastAttempt = 0;
  let savedHistory: GoldHistoryItem[] = [];

  try {
    const raw = localStorage.getItem(historyKey);

    if (raw) {
      const saved = JSON.parse(raw);
      savedAt = Number(saved.savedAt) || 0;

      if (Array.isArray(saved.data)) {
        savedHistory = saved.data;
        console.log('السجلات التي قرأها التطبيق:', savedHistory.length);
      }
    }

    lastAttempt = Number(
      localStorage.getItem(attemptKey) ?? '0'
    );
  } catch {
    console.warn('تعذرت قراءة السجل التاريخي المحفوظ.');
  }
 // دمج البيانات الأولية مع السجل المحفوظ
  const seedMap = new Map<string, GoldHistoryItem>();

  for (const item of GOLD_HISTORY_SEED) {
    seedMap.set(item.date, item);
  }

  for (const item of savedHistory) {
    seedMap.set(item.date, item);
  }

  savedHistory = Array.from(seedMap.values())
    .sort((a, b) => a.date.localeCompare(b.date));
    
  // استعادة البيانات المحفوظة
  if (this.history.length === 0 && savedHistory.length > 0) {
    this.history = savedHistory;
    console.log('عدد السجلات المحفوظة:', savedHistory.length);
console.log('عدد السجلات المعروضة:', this.history.length);
  }

  // عدم إعادة الطلب إذا كان السجل حديثًا
  if (
    savedHistory.length >= 30 &&
    savedAt > 0 &&
    Date.now() - savedAt < updateInterval
  ) {
    this.historyLoading = false;
    return;
  }

  console.log('وقت آخر محاولة:', lastAttempt);
console.log(
  'عدد الساعات منذ آخر محاولة:',
  lastAttempt > 0
    ? ((Date.now() - lastAttempt) / (60 * 60 * 1000)).toFixed(2)
    : 'لا توجد محاولة سابقة'
);

  // منع تكرار الطلبات خلال 24 ساعة
  if (
    lastAttempt > 0 &&
    Date.now() - lastAttempt < updateInterval
  ) {
     console.log(
    'لم يُرسل طلب جديد؛ ما زلنا ضمن فترة الانتظار البالغة 24 ساعة.'
  );
    this.historyLoading = false;
    
    return;
  }

  try {
    localStorage.setItem(attemptKey, String(Date.now()));
  } catch {
    console.warn('تعذر حفظ وقت محاولة التحديث.');
  }

  this.historyLoading = true;
  this.historyError = '';

  const existingDates = savedHistory.map((item) => item.date);
console.log('التواريخ المحفوظة:', existingDates);
console.log('عدد التواريخ المحفوظة:', existingDates.length);
console.log('وقت آخر محاولة:', new Date(lastAttempt).toLocaleString('ar-OM'));
console.log(
  'هل ما زلنا ضمن فترة الانتظار؟',
  lastAttempt > 0 &&
  Date.now() - lastAttempt < updateInterval
);

  this.goldPriceService
    .getHistoricalPrices(30, existingDates, 2)
    .pipe(timeout({ first: 30000 }))
    .subscribe({
      next: (items) => {
        const merged = new Map<string, GoldHistoryItem>();
        if (items.length === 0) {
  console.warn('لم تصل بيانات تاريخية جديدة؛ سنحتفظ بالسجل المحفوظ.');
  this.historyLoading = false;
  this.historyError =
    'لم تصل بيانات تاريخية جديدة. نعرض السجل المحفوظ.';
  return;
}

        for (const item of savedHistory) {
          merged.set(item.date, item);
        }

        for (const item of items) {
          merged.set(item.date, item);
        }

        const combined = Array.from(merged.values())
          .sort((a, b) => a.date.localeCompare(b.date));

        this.history = combined;

        console.log('عدد السجلات التاريخية:', combined.length);
console.log('عدد النتائج الجديدة:', items.length);


        if (!this.hasCurrentPrice && combined.length > 0) {
          this.updateCardsFromHistory(combined);
        }

        try {
          localStorage.setItem(
            historyKey,
            JSON.stringify({
              savedAt: Date.now(),
              data: combined
            })
          );
        } catch {
          console.warn('تعذر حفظ السجل التاريخي.');
        }

        this.historyError =
          combined.length < 30
            ? `لدينا ${combined.length} يومًا من البيانات الحقيقية؛ سيُستكمل السجل تدريجيًا.`
            : '';

        this.historyLoading = false;

        console.log('عدد السجلات التاريخية:', combined.length);
        console.log('عدد النتائج الجديدة:', items.length);
      },

      error: (error) => {
        console.error('تعذر تحميل السجل التاريخي:', error);

        this.historyError =
          this.history.length > 0
            ? 'تعذر تحديث السجل؛ نعرض البيانات المحفوظة.'
            : 'تعذر تحميل أسعار الذهب التاريخية.';

        this.historyLoading = false;
      }
    });
}

  ngOnInit(): void {
  const historyKey = 'oman-gold-history-v1';
  const currentKey = 'oman-gold-current-v1';
  const attemptKey = 'oman-gold-current-last-attempt-v1';
  // تحديث السعر الحالي بعد مرور 24 ساعة
const updateInterval = 24 * 60 * 60 * 1000;

// منع تكرار المحاولة الفاشلة خلال 30 دقيقة
const attemptCooldown = 30 * 60 * 1000;

    // 1. قراءة السجل التاريخي ودمجه مع البيانات الأولية
  let savedHistory: GoldHistoryItem[] = [];
  let historySavedAt = 0;

  try {
    const raw = localStorage.getItem(historyKey);

    if (raw) {
      const saved = JSON.parse(raw);

      if (Array.isArray(saved.data)) {
        savedHistory = saved.data;
        historySavedAt = Number(saved.savedAt) || 0;
      }
    }
  } catch {
    console.warn('تعذرت قراءة البيانات التاريخية المحفوظة.');
  }

  // إضافة البيانات الأولية أولًا
  const historyMap = new Map<string, GoldHistoryItem>();

  for (const item of GOLD_HISTORY_SEED) {
    historyMap.set(item.date, item);
  }

  // البيانات المحفوظة في المتصفح لها الأولوية عند تكرار التاريخ
  for (const item of savedHistory) {
    historyMap.set(item.date, item);
  }

  this.history = Array.from(historyMap.values())
    .sort((a, b) => a.date.localeCompare(b.date));

  if (historySavedAt > 0) {
    this.lastUpdated = new Date(historySavedAt);
  }

  if (this.history.length > 0) {
    this.updateCardsFromHistory(this.history);
  }

  this.loadHistoricalPrices();

  // 2. قراءة السعر الحالي المحفوظ
  let currentSavedAt = 0;

  try {
    const raw = localStorage.getItem(currentKey);

    if (raw) {
      const saved = JSON.parse(raw);
      const validPrices =
        Array.isArray(saved.data) &&
        saved.data.some(
          (item: GoldPrice) =>
            item.karat === '24' &&
            Number.isFinite(item.price) &&
            item.price > 0
        );

      if (
        typeof saved.savedAt === 'number' &&
        validPrices
      ) {
        currentSavedAt = saved.savedAt;
        this.lastUpdated = new Date(saved.savedAt);
        this.hasCurrentPrice = true;
        this.applyCurrentPrices(saved.data);
      }
    }
  } catch {
    console.warn('تعذرت قراءة السعر الحالي المحفوظ.');
  }

  // 3. إذا كان السعر الحالي حديثًا، لا نرسل طلبًا جديدًا
  if (
    currentSavedAt > 0 &&
    Date.now() - currentSavedAt < updateInterval
  ) {
    return;
  }

  // 4. منع تكرار المحاولة خلال 24 ساعة
  let lastAttempt = 0;

  try {
    lastAttempt = Number(
      localStorage.getItem(attemptKey) ?? '0'
    );
  } catch {
    // متابعة العمل دون تخزين وقت المحاولة
  }

 if (
  lastAttempt > 0 &&
  Date.now() - lastAttempt < attemptCooldown
) {
  this.isRefreshing = false;
  return;
}

  // تسجيل وقت المحاولة في المفتاح المخصص له
try {
  localStorage.setItem(
    attemptKey,
    String(Date.now())
  );
} catch {
  console.warn('تعذر حفظ وقت محاولة التحديث.');
}

    // متابعة العمل إذا تعذر التخزين
  

  // 6. طلب السعر الحالي فقط، دون إعادة طلب الأيام السبعة

  this.isRefreshing = true;

this.goldPriceService
  .getGoldPrices()
  .pipe(timeout({ first: 15000 }))
  .subscribe({
    next: (prices) => {
      const current24 = prices.find(
        (item) => item.karat === '24'
      );

      if (
        !current24 ||
        !Number.isFinite(current24.price) ||
        current24.price <= 0
      ) {
        console.warn('استجابة السعر الحالي غير صالحة.');

        this.refreshMessage =
          'لم يصل سعر صحيح؛ نعرض آخر سعر محفوظ.';

        this.isRefreshing = false;
        return;
      }

      this.applyCurrentPrices(prices);

      const savedAt = Date.now();
      this.lastUpdated = new Date(savedAt);
      this.hasCurrentPrice = true;

      try {
        localStorage.setItem(
          currentKey,
          JSON.stringify({
            savedAt,
            data: this.goldPrices
          })
        );
      } catch {
        console.warn('تعذر حفظ السعر الحالي محليًا.');
      }

      this.isRefreshing = false;
      this.refreshMessage = 'تم تحديث السعر بنجاح.';
    },

    error: (error) => {
      console.error('تعذر جلب السعر الحالي:', error);

      this.refreshMessage =
        error.name === 'TimeoutError'
          ? 'انتهت مهلة الاتصال. حاولي لاحقًا.'
          : 'تعذر تحديث السعر حاليًا. نعرض آخر سعر محفوظ.';

      this.isRefreshing = false;
    }
  });
}
}

