import { Component, Input } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';

@Component({
  selector: 'app-gold-card',
  standalone: true,
  imports: [DecimalPipe, PercentPipe],
  templateUrl: './gold-card.html',
  styleUrl: './gold-card.css'
})
export class GoldCardComponent {
  @Input() karat = '24';
  @Input() price = 0;
  @Input() change = 0;

  get isUp(): boolean {
    return this.change > 0;
  }

  get isDown(): boolean {
    return this.change < 0;
  }

  get changePercent(): number {
    const previousPrice = this.price - this.change;

    if (previousPrice <= 0) {
      return 0;
    }

    return this.change / previousPrice;
  }
}