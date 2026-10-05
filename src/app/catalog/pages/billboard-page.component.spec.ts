import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BillboardPageComponent } from './billboard-page.component';

describe('BillboardPageComponent', () => {
  it('shows only published movies', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [BillboardPageComponent],
      providers: [provideRouter([])],
    }).createComponent(BillboardPageComponent);

    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('The Silent Reel');
    expect(fixture.nativeElement.textContent).not.toContain('Neon Sky');
  });
});
