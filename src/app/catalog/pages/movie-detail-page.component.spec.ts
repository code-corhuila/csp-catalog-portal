import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MovieDetailPageComponent } from './movie-detail-page.component';
import { SYNTHETIC_CATALOG } from '../data/synthetic-catalog';

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

  it('displays a published movie with its details', () => {
    const publishedMovie = SYNTHETIC_CATALOG.movies.find(m => m.publicationStatus === 'PUBLISHED')!;
    const fixture = TestBed.configureTestingModule({
      imports: [MovieDetailPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => publishedMovie.id,
              },
            },
          },
        },
      ],
    }).createComponent(MovieDetailPageComponent);

    fixture.detectChanges();
    const content = fixture.nativeElement.textContent;

    expect(content).toContain(publishedMovie.title);
    expect(content).toContain(publishedMovie.duration.toString());
    expect(content).not.toContain('Película no encontrada.');
  });

  it('shows showtimes linked to seat map for a published movie', () => {
    const publishedMovie = SYNTHETIC_CATALOG.movies.find(m => m.publicationStatus === 'PUBLISHED')!;
    const fixture = TestBed.configureTestingModule({
      imports: [MovieDetailPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => publishedMovie.id,
              },
            },
          },
        },
      ],
    }).createComponent(MovieDetailPageComponent);

    fixture.detectChanges();
    const content = fixture.nativeElement.textContent;
    const movieShowtimes = SYNTHETIC_CATALOG.showtimes.filter(st => st.movieId === publishedMovie.id);

    movieShowtimes.forEach(st => {
      const date = new Date(st.startsAt);
      const hours = date.getHours() % 12 || 12;
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
      const expectedTime = `${hours}:${minutes}\u202F${ampm}`;
      expect(content).toContain(expectedTime);
    });
  });
});
