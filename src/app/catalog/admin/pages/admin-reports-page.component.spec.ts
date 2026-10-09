import { ComponentFixture, TestBed } from "@angular/core/testing";
import { AdminReportsPageComponent } from "./admin-reports-page.component";
import { AdminCatalogStateService } from "../data/admin-catalog-state.service";
import { SYNTHETIC_CATALOG } from "../../data/synthetic-catalog";

describe("AdminReportsPageComponent", () => {
  const createComponent = () => TestBed.configureTestingModule({
    imports: [AdminReportsPageComponent],
  }).createComponent(AdminReportsPageComponent);

  const state = () => TestBed.inject(AdminCatalogStateService);

  /**
   * Runs change detection after mutating the component outside of an event
   * handler: zoneless Angular only refreshes views marked for check, otherwise
   * dev mode reports NG0100.
   */
  const sync = <T>(fixture: ComponentFixture<T>) => {
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
  };

  it("renders the page header of the mockup", () => {
    const fixture = createComponent();
    sync(fixture);
    const content = fixture.nativeElement.textContent;

    expect(content).toContain("Reportes");
    expect(content).toContain("Consulta las métricas generales del cine.");
  });

  it("shows the three headline metrics of the administration", () => {
    const fixture = createComponent();
    sync(fixture);
    const values: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll(".report-value"));
    const metrics = state().metrics();

    expect(values.length).toBe(3);
    expect(values[0].textContent!.trim()).toBe(String(metrics.showtimes));
    expect(values[1].textContent!.trim()).toBe(String(metrics.rooms));
    expect(values[2].textContent!.trim()).toBe(String(metrics.movies));
    expect(fixture.nativeElement.textContent).toContain("Funciones programadas");
    expect(fixture.nativeElement.textContent).toContain("Salas registradas");
    expect(fixture.nativeElement.textContent).toContain("Películas registradas");
  });

  it("reports the occupancy of every room", () => {
    const fixture = createComponent();
    sync(fixture);
    const occupancyCard = fixture.nativeElement.querySelectorAll(".card")[0];
    const rows = occupancyCard.querySelectorAll("tbody tr");

    expect(rows.length).toBe(SYNTHETIC_CATALOG.rooms.length);
    expect(rows[0].textContent).toContain(SYNTHETIC_CATALOG.rooms[0].name);
    expect(rows[0].textContent).toContain("48 asientos");
    expect(rows[0].textContent).toContain(String(SYNTHETIC_CATALOG.showtimes.length));
    expect(rows[0].querySelector(".status-tag").textContent.trim()).toBe("Con funciones");
  });

  it("summarises every scheduled function with its status", () => {
    const fixture = createComponent();
    sync(fixture);
    const summaryCard = fixture.nativeElement.querySelectorAll(".card")[1];
    const rows = summaryCard.querySelectorAll("tbody tr");

    expect(summaryCard.textContent).toContain("Resumen de Funciones");
    expect(rows.length).toBe(SYNTHETIC_CATALOG.showtimes.length);
    SYNTHETIC_CATALOG.showtimes.forEach((showtime) => {
      const movie = SYNTHETIC_CATALOG.movies.find((item) => item.id === showtime.movieId)!;
      expect(summaryCard.textContent).toContain(movie.title);
    });
    expect(rows[0].querySelector(".status-tag").textContent.trim()).toBe("Publicada");
  });

  it("shows the empty states when the administration is cleared", () => {
    const fixture = createComponent();
    state().rooms.set([]);
    state().showtimes.set([]);
    sync(fixture);
    const content = fixture.nativeElement.textContent;

    expect(content).toContain("No hay salas registradas.");
    expect(content).toContain("No hay funciones registradas.");
    expect(content).toContain("0");
  });
});
