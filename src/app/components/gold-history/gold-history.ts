import { Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { GoldHistoryItem } from '../../services/gold-price';

interface GoldHistoryDisplayRow {
date: string;
price24: number | null;
price22: number | null;
price21: number | null;
price18: number | null;
}

@Component({
selector: 'app-gold-history',
standalone: true,
imports: [DecimalPipe],
templateUrl: './gold-history.html',
styleUrl: './gold-history.css'
})
export class GoldHistoryComponent {
@Input() history: GoldHistoryItem[] = [];
@Input() loading = false;
@Input() errorMessage = '';

get displayHistory(): GoldHistoryDisplayRow[] {
// ربط كل سجل بتاريخِه الأصلي بصيغة YYYYMMDD
const historyMap = new Map<string, GoldHistoryItem>();

for (const item of this.history) {
  historyMap.set(item.date, item);
}

const rows: GoldHistoryDisplayRow[] = [];

// إنشاء 30 يومًا تقويميًا، بما فيها اليوم
for (let i = 29; i >= 0; i--) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - i);

  const dateKey =
    `${date.getFullYear()}` +
    `${String(date.getMonth() + 1).padStart(2, '0')}` +
    `${String(date.getDate()).padStart(2, '0')}`;

  const item = historyMap.get(dateKey);

  rows.push({
    date: date.toLocaleDateString('ar-OM'),
    price24: item?.price24 ?? null,
    price22: item?.price22 ?? null,
    price21: item?.price21 ?? null,
    price18: item?.price18 ?? null
  });
}

return rows;

}
}
