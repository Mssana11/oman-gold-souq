import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GoldChart } from './gold-chart';

describe('GoldChart', () => {
  let component: GoldChart;
  let fixture: ComponentFixture<GoldChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoldChart],
    }).compileComponents();

    fixture = TestBed.createComponent(GoldChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
