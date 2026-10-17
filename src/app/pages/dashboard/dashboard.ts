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
currentPriceUpdatedAt: Date | null = null;

private hasCurrentPrice = false;
  constructor(
    private goldPriceService: GoldPriceService
  ) {}

  isRefreshing = false;
refreshMessage =
  'التحديث متوقف مؤقتًا بسبب استنفاد الحصة الشهرية لـ GoldAPI. الأسعار المعروضة قد لا تكون أسعار اليوم.';

private readonly currentCacheKey = 'oman-gold-current-v1';
private readonly attemptKey = 'oman-gold-current-last-attempt-v1';

private readonly refreshCooldown = 30 * 60 * 1000;

refreshCurrentPriceManually(): void {
   // عدم الاتصال بـ GoldAPI عند استخدام السعر اليدوي
  try {
    const rawManual = localStorage.getItem(
      'oman-gold-manual-price-v1'
    );

    if (rawManual) {
      const manual = JSON.parse(rawManual);

      if (
        manual.source === 'manual' &&
        Number.isFinite(Number(manual.price24)) &&
        Number(manual.price24) > 0 &&
        Number(manual.price24) <= 10000
      ) {
        this.refreshMessage =
          'أنتِ تستخدمين السعر اليدوي المحفوظ. لم يتم الاتصال بـ GoldAPI.';
        return;
      }
    }
  } catch {
    // متابعة التحقق من آلية التحديث المعتادة عند تعذر قراءة التخزين
  }
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
this.currentPriceUpdatedAt = new Date(savedAt);

this.refreshMessage =
  'تم جلب البيانات وحفظها في هذا الوقت، لكن تاريخ السعر الفعلي غير مؤكد.';

this.isRefreshing = false;
      },

      error: (error) => {
  console.error('تعذر جلب السعر الحالي:', error);

  if (error.status === 429) {
    this.refreshMessage =
      'توقّف تحديث الأسعار بسبب بلوغ حد الطلبات المسموح به في GoldAPI. نعرض البيانات المحفوظة، وقد لا تكون أسعار اليوم.';
  } else if (error.status === 403) {
    this.refreshMessage =
      'رفضت GoldAPI الطلب أو انتهت صلاحية الوصول. نعرض البيانات المحفوظة، وقد لا تكون أسعار اليوم.';
  } else if (error.name === 'TimeoutError') {
    this.refreshMessage =
      'انتهت مهلة الاتصال. نعرض البيانات المحفوظة، وقد لا تكون أسعار اليوم.';
  } else {
    this.refreshMessage =
      'تعذر تحديث الأسعار حاليًا. نعرض البيانات المحفوظة، وقد لا تكون أسعار اليوم.';
  }

  this.isRefreshing = false;
}

    });
}
saveManualGoldPrice(): void {
  const price = Number(this.price24);
  if (!Number.isFinite(price) || price <= 0) {
    this.refreshMessage = 'يرجى إدخال سعر صحيح أكبر من صفر.';
    return;
  }
  if (price > 10000) {
    this.refreshMessage = 'السعر المدخل مرتفع جدًا، يرجى التحقق منه.';
    return;
  }
  this.price24 = Math.round(price * 1000) / 1000;
  this.goldPrices = [24, 22, 21, 18].map(karat => ({
    karat: String(karat),
    price: Math.round((this.price24 * karat / 24) * 1000) / 1000,
    change: 0
  }));
  try {
    localStorage.setItem(
      'oman-gold-manual-price-v1',
      JSON.stringify({
        price24: this.price24,
        savedAt: Date.now(),
        source: 'manual'
      })
      );
    this.currentPriceUpdatedAt = null;
    this.lastUpdated = null;
    this.refreshMessage =
      'مصدر السعر: إدخال يدوي. تم حفظه في المتصفح، ولا يمثل جلبًا مباشرًا من GoldAPI.';
  } catch {
    this.refreshMessage =
      'تم تعديل الأسعار في الصفحة، لكن تعذر حفظها في المتصفح.';
  }
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
  const historyKey = 'oman-gold-history-v1';

  this.historyLoading = true;
  this.historyError = '';

  let savedHistory: GoldHistoryItem[] = [];

  // قراءة السجل السابق إن وُجد
  try {
    const raw = localStorage.getItem(historyKey);

    if (raw) {
      const saved = JSON.parse(raw);

      savedHistory = Array.isArray(saved)
        ? saved
        : Array.isArray(saved.data)
          ? saved.data
          : [];
    }
  } catch {
    savedHistory = [];
  }
  // نستخدم XAUS فقط، وليس GoldAPI
  this.goldPriceService
    .getHistoricalPrices(30, [], 1)
    .pipe(timeout({ first: 15000}))
    .subscribe({
      next: (items: GoldHistoryItem[]) => {
      const historyMap = new Map<string, GoldHistoryItem>();
      // السجل التمهيدي
      for (const item of GOLD_HISTORY_SEED) {
      historyMap.set(item.date, item);
         }
        // السجل المحفوظ سابقًا
        for (const item of savedHistory) {
          historyMap.set(item.date, item);
        }

        // الأسعار الجديدة من XAUS لها الأولوية
        for (const item of items) {
          historyMap.set(item.date, item);
        }

        this.history = Array.from(historyMap.values())
          .sort((a, b) => a.date.localeCompare(b.date));

        try {
          localStorage.setItem(
            historyKey,
            JSON.stringify({
              savedAt: Date.now(),
              data: this.history
            })
          );
        } catch (error) {
          console.warn('تعذر حفظ سجل الأسعار محليًا:', error);
        }

        this.historyLoading = false;

        if (items.length === 0) {
          this.historyError =
            'تعذر جلب السجل من المصدر الجديد. نعرض البيانات المحفوظة إن وجدت.';
        } else {
          this.historyError =
            'ملاحظة: قد يتكرر آخر سعر إغلاق متاح في أيام توقف السوق.';
        }
      },

      error: (error) => {

        this.history = savedHistory.length > 0
          ? savedHistory
          : GOLD_HISTORY_SEED;

        this.historyLoading = false;


        this.historyError =
          'تعذر تحديث السجل الآن. نعرض البيانات المحفوظة إن وجدت.';
      }
    });
}

  ngOnInit(): void {
  const historyKey = 'oman-gold-history-v1';
  const currentKey = 'oman-gold-current-v1';
  const attemptKey = 'oman-gold-current-last-attempt-v1';
  // تحديث السعر الحالي بعد مرور 24 ساعة
const updateInterval = 24 * 60 * 60 * 1000;

// منع تكرار المحاولة الفاشلة خلال 24 دقيقة
const attemptCooldown = 24 * 60 * 60 * 1000;
let hasManualPrice = false;
// قراءة السعر اليدوي المحفوظ دون الاتصال بالإنترنت
  try {
    const rawManual = localStorage.getItem(
      'oman-gold-manual-price-v1'
    );

    if (rawManual) {
      const manual = JSON.parse(rawManual);
      const manualPrice = Number(manual.price24);

      if (
        manual.source === 'manual' &&
        Number.isFinite(manualPrice) &&
        manualPrice > 0 &&
        manualPrice <= 10000
      ) {
        hasManualPrice = true;
        this.price24 = manualPrice;

        this.goldPrices = [24, 22, 21, 18].map(karat => ({
          karat: String(karat),
          price: Math.round(
            (manualPrice * karat / 24) * 1000
          ) / 1000,
          change: 0
        }));

        this.currentPriceUpdatedAt = null;
        this.lastUpdated = null;
        this.hasCurrentPrice = true;

        this.refreshMessage =
  'مصدر السعر: إدخال يدوي محفوظ في هذا المتصفح. لم يتم جلب سعر مباشر من GoldAPI، وقد لا يعكس السعر المعروض سعر السوق اليوم.';

        this.isRefreshing = false;
        // لا نخرج من ngOnInit؛ نتابع تحميل السجل التاريخي
      }
    }
  } catch {
    console.warn('تعذرت قراءة السعر اليدوي المحفوظ.');
  }

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

  if (this.history.length > 0 && !hasManualPrice) {
  this.updateCardsFromHistory(this.history);

  this.refreshMessage =
    'مصدر السعر: أحدث سجل تاريخي متاح. قد لا يعكس السعر المعروض سعر السوق اليوم.';
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
  validPrices &&
  !hasManualPrice
) {
  currentSavedAt = saved.savedAt;
  this.currentPriceUpdatedAt = new Date(saved.savedAt);
  this.hasCurrentPrice = true;
  this.applyCurrentPrices(saved.data);
}
    }
  } catch {
    console.warn('تعذرت قراءة السعر الحالي المحفوظ.');
  }

   // 3 لا نطلب GoldAPI إذا كان هناك سعر يدوي محفوظ
  if (hasManualPrice) {
    this.isRefreshing = false;
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
      this.currentPriceUpdatedAt = new Date(savedAt);
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

