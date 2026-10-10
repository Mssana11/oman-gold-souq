import { TestBed } from '@angular/core/testing';
import { GoldPrice } from './gold-price';

describe('GoldPrice', () => {
  let service: GoldPrice;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GoldPrice);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
