import { Injectable } from '@angular/core';
import {
  Observable,
  of,
  from,
  map,
  catchError
} from 'rxjs';

export interface GoldPrice {
  karat: string;
  price: number;
  change: number;
}

export interface GoldHistoryItem {
  date: string;
  price24: number;
  price22: number;
  price21: number;
  price18: number;
  change24?: number;
}

interface XausHistoryResponse {
  points: {
    d: string;
    c: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class GoldPriceService {

  // لا نطلب سعرًا حاليًا من GoldAPI.
  // ستعتمد لوحة التحكم على البيانات المحفوظة إن توفرت.
  getGoldPrices(): Observable<GoldPrice[]> {
    return of([]);
  }

  // جلب السجل التاريخي من XAUS
  getHistoricalPrices(
    days = 30,
    _existingDates: string[] = [],
    _maxRequests = 3
  ): Observable<GoldHistoryItem[]> {
    const historyUrl = 'https://xaus.com/api/v1/history';
    const ounceToGram = 31.1034768;
    const usdToOmr = 0.3845;

    return from(
      fetch(historyUrl, {
        signal: AbortSignal.timeout(20000)
      }).then((response) => {
        if (!response.ok) {
          throw new Error(`XAUS HTTP ${response.status}`);
        }

        return response.json() as Promise<XausHistoryResponse>;
      })
    ).pipe(
      map((response): GoldHistoryItem[] => {
        const points = (response.points ?? [])
          .filter(
            (point) =>
              /^\d{4}-\d{2}-\d{2}$/.test(point.d) &&
              Number.isFinite(point.c) &&
              point.c > 0
          )
          .sort((a, b) => a.d.localeCompare(b.d));

        const recentPoints = points.slice(-90);

        if (recentPoints.length === 0) {
          return [];
        }

        const rows: GoldHistoryItem[] = [];

        for (let i = days - 1; i >= 0; i--) {
          const date = new Date();
          date.setHours(12, 0, 0, 0);
          date.setDate(date.getDate() - i);

          const isoDate =
            `${date.getFullYear()}-` +
            `${String(date.getMonth() + 1).padStart(2, '0')}-` +
            `${String(date.getDate()).padStart(2, '0')}`;

          let point:
            XausHistoryResponse['points'][number] | undefined;

          for (const candidate of recentPoints) {
            if (candidate.d <= isoDate) {
              point = candidate;
            } else {
              break;
            }
          }

          if (!point) {
            continue;
          }

          const price24 =
            (point.c / ounceToGram) * usdToOmr;

          rows.push({
            date: isoDate.replace(/-/g, ''),
            price24,
            price22: price24 * 22 / 24,
            price21: price24 * 21 / 24,
            price18: price24 * 18 / 24
          });
        }

        return rows;
      }),
      catchError((error) => {
        console.error('تعذر جلب سجل XAUS:', error);
        return of([]);
      })
    );
  }
}
