import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { GoldPrice } from '../../services/gold-price';

@Component({
  selector: 'app-gold-calculator',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './gold-calculator.html',
  styleUrl: './gold-calculator.css'
})
export class GoldCalculatorComponent {
  @Input() goldPrices: GoldPrice[] = [];

  karat = '24';
  weight = 1;

  get pricePerGram(): number {
    const gold = this.goldPrices.find(
      item => item.karat === this.karat
    );

    return gold?.price ?? 0;
  }

  get totalPrice(): number {
    const weight = Number(this.weight);

    if (!Number.isFinite(weight) || weight <= 0) {
      return 0;
    }

    return this.pricePerGram * weight;
  }
}