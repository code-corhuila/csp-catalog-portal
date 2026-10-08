import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MovieDetailPageComponent } from './movie-detail-page.component';

describe('MovieDetailPageComponent', () => {
  it('does not expose a draft movie through a direct URL', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [MovieDetailPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => '22222222-2222-2222-2222-222222222222',
              },
            },
          },
        },
      ],
    }).createComponent(MovieDetailPageComponent);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Película no encontrada.');
    expect(fixture.nativeElement.textContent).not.toContain('Neon Sky');
  });
});
