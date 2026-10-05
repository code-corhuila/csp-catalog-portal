import { ActivatedRoute } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { SeatMapPageComponent } from './seat-map-page.component';

describe('SeatMapPageComponent', () => {
  it('renders every synthetic seat label', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SeatMapPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '44444444-4444-4444-4444-444444444444' } } },
        },
      ],
    }).createComponent(SeatMapPageComponent);

    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('A1');
    expect(fixture.nativeElement.textContent).toContain('A2');
    expect(fixture.nativeElement.textContent).toContain('A3');
    expect(fixture.nativeElement.textContent).toContain('B1');
    expect(fixture.nativeElement.textContent).toContain('B2');
    expect(fixture.nativeElement.textContent).toContain('B3');
  });
});
