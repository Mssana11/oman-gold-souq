import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GoldHistory } from './gold-history';

describe('GoldHistory', () => {
  let component: GoldHistory;
  let fixture: ComponentFixture<GoldHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoldHistory],
    }).compileComponents();

    fixture = TestBed.createComponent(GoldHistory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
