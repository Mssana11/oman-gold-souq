import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GoldCard } from './gold-card';

describe('GoldCard', () => {
  let component: GoldCard;
  let fixture: ComponentFixture<GoldCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoldCard],
    }).compileComponents();

    fixture = TestBed.createComponent(GoldCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
