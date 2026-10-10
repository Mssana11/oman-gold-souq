import { Component, Input } from '@angular/core';
import { DecimalPipe} from '@angular/common';
import { GoldHistoryItem } from '../../services/gold-price';

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

  get displayHistory(): GoldHistoryItem[] {
    return this.history.map(item => {
      if (/^\d{8}$/.test(item.date)) {
        const date = new Date(
          Number(item.date.slice(0, 4)),
          Number(item.date.slice(4, 6)) - 1,
          Number(item.date.slice(6, 8))
        );

        return {
          ...item,
          date: date.toLocaleDateString('ar-OM')
        };
      }

      return item;
    });
  }
}
