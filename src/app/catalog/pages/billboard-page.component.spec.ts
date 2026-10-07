import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BillboardPageComponent } from './billboard-page.component';
import { SYNTHETIC_CATALOG } from '../data/synthetic-catalog';

describe('BillboardPageComponent', () => {
  it('shows every published movie and hides drafts', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [BillboardPageComponent],
      providers: [provideRouter([])],
    }).createComponent(BillboardPageComponent);

    fixture.detectChanges();
    const content = fixture.nativeElement.textContent;
    const publishedMovies = SYNTHETIC_CATALOG.movies.filter(
      movie => movie.publicationStatus === 'PUBLISHED',
    );
    const draftMovies = SYNTHETIC_CATALOG.movies.filter(
      movie => movie.publicationStatus === 'DRAFT',
    );

    publishedMovies.forEach(movie => expect(content).toContain(movie.title));
    draftMovies.forEach(movie => expect(content).not.toContain(movie.title));
  });

  it('displays showtimes for each published movie', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [BillboardPageComponent],
      providers: [provideRouter([])],
    }).createComponent(BillboardPageComponent);

    fixture.detectChanges();
    const content = fixture.nativeElement.textContent;
    const publishedMovies = SYNTHETIC_CATALOG.movies.filter(
      movie => movie.publicationStatus === 'PUBLISHED',
    );

    publishedMovies.forEach(movie => {
      const movieShowtimes = SYNTHETIC_CATALOG.showtimes.filter(st => st.movieId === movie.id);
      movieShowtimes.forEach(st => {
        const date = new Date(st.startsAt);
        const hours = date.getHours() % 12 || 12;
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
        // Angular DatePipe "shortTime" in es-ES uses narrow no-break space (U+202F)
        const expectedTime = `${hours}:${minutes}\u202F${ampm}`;
        expect(content).toContain(expectedTime);
      });
    });
  });
});
