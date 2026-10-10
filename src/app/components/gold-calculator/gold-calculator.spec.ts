import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GoldCalculator } from './gold-calculator';

describe('GoldCalculator', () => {
  let component: GoldCalculator;
  let fixture: ComponentFixture<GoldCalculator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoldCalculator],
    }).compileComponents();

    fixture = TestBed.createComponent(GoldCalculator);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
