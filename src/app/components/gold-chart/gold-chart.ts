import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  AfterViewInit,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';

import Chart from 'chart.js/auto';
import { GoldHistoryItem } from '../../services/gold-price';

@Component({
  selector: 'app-gold-chart',
  standalone: true,
  imports: [],
  templateUrl: './gold-chart.html',
  styleUrl: './gold-chart.css'
})
export class GoldChartComponent
  implements AfterViewInit, OnChanges, OnDestroy {

  @Input() history: GoldHistoryItem[] = [];

  @ViewChild('goldChart')
  chartCanvas!: ElementRef<HTMLCanvasElement>;

  selectedKarat = '24';

  private chart?: Chart;
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.updateChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.viewReady && changes['history']) {
      this.updateChart();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  changeKarat(karat: string): void {
    this.selectedKarat = karat;
    this.updateChart();
  }

  private updateChart(): void {
    if (!this.chartCanvas || this.history.length === 0) {
      this.chart?.destroy();
      this.chart = undefined;
      return;
    }

    const priceKey = `price${this.selectedKarat}` as
      | 'price24'
      | 'price22'
      | 'price21'
      | 'price18';

    const labels = this.history.map(item => {
      const date = item.date;

      // يدعم التاريخ بصيغة YYYYMMDD
      // وكذلك التاريخ المعروض بصيغة أخرى
      if (/^\d{8}$/.test(date)) {
        return `${date.slice(6, 8)}/${date.slice(4, 6)}`;
      }

      return date;
    });

    const prices = this.history.map(item => item[priceKey]);

    if (this.chart) {
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = prices;
      this.chart.data.datasets[0].label =
        `سعر غرام الذهب عيار ${this.selectedKarat} (ر.ع)`;
      this.chart.update();
      return;
    }

    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'line',

      data: {
        labels,
        datasets: [{
          label: `سعر غرام الذهب عيار ${this.selectedKarat} (ر.ع)`,
          data: prices,
          borderColor: '#D4AF37',
          backgroundColor: 'rgba(212, 175, 55, 0.15)',
          borderWidth: 3,
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 6
        }]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,

        plugins: {
          legend: {
            labels: {
              font: { family: 'Arial' }
            }
          },

          tooltip: {
            callbacks: {
              label: context =>
                `${Number(context.raw).toFixed(3)} ر.ع`
            }
          }
        },

        scales: {
          x: {
            grid: { display: false }
          },

          y: {
            beginAtZero: false,
            ticks: {
              callback: value => `${value} ر.ع`
            }
          }
        }
      }
    });
  }
}
