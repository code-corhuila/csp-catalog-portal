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
});
