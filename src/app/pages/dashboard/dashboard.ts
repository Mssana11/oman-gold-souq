import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
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
  constructor(
    private goldPriceService: GoldPriceService
  ) {}

  isRefreshing = false;
refreshMessage = '';

private readonly currentCacheKey = 'oman-gold-current-v1';
private readonly attemptKey = 'oman-gold-current-last-attempt-v1';

private readonly refreshCooldown = 5 * 60 * 1000;

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

private loadHistoricalPrices(): void {
  const historyKey = 'oman-gold-history-v1';
  const attemptKey = 'oman-gold-history-last-attempt-v1';
  const updateInterval = 24 * 60 * 60 * 1000;

  let savedAt = 0;
  let lastAttempt = 0;

  try {
    const raw = localStorage.getItem(historyKey);

    if (raw) {
      const saved = JSON.parse(raw);
      savedAt = Number(saved.savedAt) || 0;
    }

    lastAttempt = Number(
      localStorage.getItem(attemptKey) ?? '0'
    );
  } catch {
    // متابعة العمل حتى إذا تعذر التخزين المحلي
  }

  // إذا كان لدينا سجل حديث وكافٍ، نستخدمه دون طلب جديد
  if (
    this.history.length >= 15 &&
    savedAt > 0 &&
    Date.now() - savedAt < updateInterval
  ) {
    this.historyLoading = false;
    return;
  }

  // عدم تكرار طلب التاريخ أكثر من مرة خلال 24 ساعة
  if (
    lastAttempt > 0 &&
    Date.now() - lastAttempt < updateInterval
  ) {
    this.historyLoading = false;
    return;
  }

  try {
    localStorage.setItem(attemptKey, String(Date.now()));
  } catch {}

  this.historyLoading = true;
  this.historyError = '';

  this.goldPriceService
    .getHistoricalPrices(30)
    .pipe(timeout({ first: 30000 }))
    .subscribe({
      next: (items) => {
        if (items.length > 0) {
          this.history = items;
          this.updateCardsFromHistory(items);

          try {
            localStorage.setItem(
              historyKey,
              JSON.stringify({
                savedAt: Date.now(),
                data: items
              })
            );
          } catch {
            console.warn('تعذر حفظ السجل التاريخي.');
          }

          this.historyError =
            items.length < 10
              ? 'تم تحميل جزء من البيانات التاريخية فقط.'
              : '';
        } else {
          this.historyError = this.history.length > 0
            ? 'تعذر تحديث السجل؛ نعرض البيانات المحفوظة.'
            : 'لم تتوفر بيانات تاريخية حاليًا.';
        }

        this.historyLoading = false;
      },

      error: (error) => {
        console.error('تعذر تحميل السجل التاريخي:', error);

        this.historyError = this.history.length > 0
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
  const updateInterval = 24 * 60 * 60 * 1000;

  // 1. قراءة السجل التاريخي المحفوظ
  try {
    const raw = localStorage.getItem(historyKey);

    if (raw) {
      const saved = JSON.parse(raw);

      if (
        typeof saved.savedAt === 'number' &&
        Array.isArray(saved.data) &&
        saved.data.length > 0
      ) {
        this.history = saved.data;
        this.updateCardsFromHistory(saved.data);
        this.lastUpdated = new Date(saved.savedAt);
      }
    }
  } catch {
    console.warn('تعذرت قراءة البيانات التاريخية المحفوظة.');
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
        this.applyCurrentPrices(saved.data);
        this.lastUpdated = new Date(saved.savedAt);
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
  Date.now() - lastAttempt < updateInterval &&
  this.history.length >= 25
) {
  this.historyLoading = false;
  return;
}

  // 5. تسجيل المحاولة قبل إرسال الطلب
  try {
    localStorage.setItem(
      attemptKey,
      String(Date.now())
    );
  } catch {
    // متابعة العمل إذا تعذر التخزين
  }

  // 6. طلب السعر الحالي فقط، دون إعادة طلب الأيام السبعة

  this.isRefreshing = true;
  this.goldPriceService
  .getGoldPrices()
  .pipe(timeout({first: 15000}))
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
        console.warn('استجابة السعر الحالي غير صالحة.');
        return;
        this.isRefreshing = false;
      }
      
      this.applyCurrentPrices(prices);

      try {
        localStorage.setItem(
          currentKey,
          JSON.stringify({
            savedAt: Date.now(),
            data: this.goldPrices
          })
        );

        this.lastUpdated = new Date();
      } catch {
        console.warn('تعذر حفظ السعر الحالي محليًا.');
      }
    },
    error: (error) => {
      console.error('تعذر تحديث السعر الحالي:', error);
      // نحتفظ بالأسعار السابقة ولا نمسح السجل التاريخي.
      this.isRefreshing = false;
    }
  });
}
}
