import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Observable,
  forkJoin,
  map,
  catchError,
  of
} from 'rxjs';

import { GOLD_API_KEY, GOLD_API_URL } from './gold-api.config';

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

interface GoldApiResponse {
  timestamp?: number;
  date?: string;
  price?: number;
  metal?: string;
  currency?: string;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class GoldPriceService {
  private readonly headers = {
    'x-access-token': GOLD_API_KEY
  };

  constructor(private http: HttpClient) {}

  // جلب أسعار الذهب الحالية
  getGoldPrices(): Observable<GoldPrice[]> {
    return this.http
      .get<GoldApiResponse>(
        `${GOLD_API_URL}/price/XAU/OMR`,
        { headers: this.headers }
      )
      .pipe(
        map((response) => {
          const gramPrice = Number(response['price_gram_24k']);
          const ouncePrice = Number(response['price']);

          const price24 =
            Number.isFinite(gramPrice) && gramPrice > 0
              ? gramPrice
              : Number.isFinite(ouncePrice) && ouncePrice > 0
                ? ouncePrice / 31.1034768
                : 0;

          if (price24 <= 0) {
            throw new Error('لم يصل سعر صالح للذهب من GoldAPI.');
          }

          return [24, 22, 21, 18].map((karat) => ({
            karat: String(karat),
            price: price24 * karat / 24,
            change: 0
          }));
        })
      );
  }

  // جلب أسعار الذهب التاريخية لآخر 30 يومًا
  getHistoricalPrices(
    days = 30
  ): Observable<GoldHistoryItem[]> {
    const requests: Observable<GoldHistoryItem | null>[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - i);

      const dateKey =
        `${date.getFullYear()}` +
        `${String(date.getMonth() + 1).padStart(2, '0')}` +
        `${String(date.getDate()).padStart(2, '0')}`;

      requests.push(
        this.http
          .get<GoldApiResponse>(
            `${GOLD_API_URL}/XAU/OMR/${dateKey}`,
            { headers: this.headers }
          )
          .pipe(
            map((response): GoldHistoryItem | null => {
              const gram = Number(response['price_gram_24k']);
              const ounce = Number(response['price']);

              const price24 =
                Number.isFinite(gram) && gram > 0
                  ? gram
                  : Number.isFinite(ounce) && ounce > 0
                    ? ounce / 31.1034768
                    : 0;

              if (price24 <= 0) {
                return null;
              }

              return {
                date: dateKey,
                price24,
                price22: price24 * 22 / 24,
                price21: price24 * 21 / 24,
                price18: price24 * 18 / 24
              };
            }),
            catchError(() => of(null))
          )
      );
    }

    return forkJoin(requests).pipe(
      map((results) =>
        results
          .filter(
            (item): item is GoldHistoryItem => item !== null
          )
          .sort((a, b) => a.date.localeCompare(b.date))
      )
    );
  }
}
