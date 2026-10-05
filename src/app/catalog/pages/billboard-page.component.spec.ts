import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { CatalogApiService } from '../data/catalog-api.service';
import { BillboardItem, Page } from '../model/billboard';
import { BillboardPageComponent } from './billboard-page.component';

function pageOf(items: BillboardItem[]): Page<BillboardItem> {
  return { data: items, meta: { page: 1, limit: 20, total: items.length, totalPages: 1 } };
}

const ITEM = {
  movie: { id: 'm1', title: 'Movie One', durationMinutes: 100, status: 'PUBLISHED' },
  room: { id: 'r1', name: 'Room 1', seats: [] },
  showtime: {
    id: 's1', movieId: 'm1', roomId: 'r1',
    startsAt: '2026-10-05T20:00:00Z', endsAt: '2026-10-05T22:00:00Z', status: 'SCHEDULED',
  },
} as BillboardItem;

describe('BillboardPageComponent', () => {
  let responses: Subject<Page<BillboardItem>>[];

  beforeEach(() => {
    responses = [];
    TestBed.configureTestingModule({
      providers: [{
        provide: CatalogApiService,
        useValue: {
          getBillboard: () => {
            const response = new Subject<Page<BillboardItem>>();
            responses.push(response);
            return response;
          },
        },
      }],
    });
  });

  function create() {
    const fixture = TestBed.createComponent(BillboardPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows loading, then the movies', async () => {
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('Loading billboard');

    responses[0].next(pageOf([ITEM]));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Movie One');
  });

  it('shows the empty state', async () => {
    const fixture = create();

    responses[0].next(pageOf([]));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No movies are currently published');
  });

  it('shows the error with a retry that asks again', async () => {
    const fixture = create();

    responses[0].error({ status: 503, userMessage: 'Try again later.' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();

    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    expect(responses.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Loading billboard');

    responses[1].next(pageOf([ITEM]));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Movie One');
  });

  it('ignores the answer of a request that a retry replaced', async () => {
    const fixture = create();
    const component = fixture.componentInstance;

    component.load();
    responses[0].next(pageOf([]));
    responses[1].next(pageOf([ITEM]));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Movie One');
    expect(fixture.nativeElement.textContent).not.toContain('No movies');
  });
});
