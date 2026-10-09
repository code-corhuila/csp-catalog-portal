import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { AdminMoviesPageComponent } from "./admin-movies-page.component";
import { AdminCatalogStateService } from "../data/admin-catalog-state.service";
import { AdminToastService } from "../data/admin-toast.service";
import { SYNTHETIC_CATALOG } from "../../data/synthetic-catalog";

describe("AdminMoviesPageComponent", () => {
  const createComponent = () => TestBed.configureTestingModule({
    imports: [AdminMoviesPageComponent],
    providers: [provideRouter([])],
  }).createComponent(AdminMoviesPageComponent);

  const state = () => TestBed.inject(AdminCatalogStateService);

  /** Messages pushed to the bottom-right toast queue of the mockup. */
  const toasts = () => TestBed.inject(AdminToastService).toasts().map((toast) => toast.message);

  /**
   * Runs change detection after mutating the component outside of an event
   * handler: zoneless Angular only refreshes views marked for check, otherwise
   * dev mode reports NG0100.
   */
  const sync = <T>(fixture: ComponentFixture<T>) => {
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
  };

  const fillDraft = (component: AdminMoviesPageComponent) => {
    component.draft.title = "Cinema Paradiso";
    component.draft.genre = "Suspenso";
    component.draft.duration = 124;
    component.draft.classification = "TP";
    component.draft.synopsis = "Un homenaje al cine de barrio.";
    component.draft.trailer = "https://www.youtube.com/watch?v=abc";
  };

  it("renders the page header of the mockup", () => {
    const fixture = createComponent();
    sync(fixture);
    const content = fixture.nativeElement.textContent;

    expect(content).toContain("Gestión de Películas");
    expect(content).toContain("Administra las películas disponibles para programar funciones.");
  });

  it("renders every field of the registration form", () => {
    const fixture = createComponent();
    sync(fixture);

    expect(fixture.nativeElement.querySelector("#new-movie-title")).not.toBeNull();
    expect(fixture.nativeElement.querySelector("#new-movie-genre").options.length).toBe(7);
    expect(fixture.nativeElement.querySelector("#new-movie-duration")).not.toBeNull();
    expect(fixture.nativeElement.querySelector("#new-movie-rating").options.length).toBe(6);
    expect(fixture.nativeElement.querySelector("#new-movie-synopsis").tagName).toBe("TEXTAREA");
    expect(fixture.nativeElement.querySelector("#new-movie-trailer").getAttribute("type")).toBe("url");
    expect(fixture.nativeElement.querySelector("button[type=submit]").textContent.trim()).toBe("Guardar Película");
  });

  it("lists every movie, including drafts, with its classification and trailer link", () => {
    const fixture = createComponent();
    sync(fixture);
    const rows = fixture.nativeElement.querySelectorAll(".data-table tbody tr");
    const content = fixture.nativeElement.textContent;

    expect(rows.length).toBe(state().movies().length);
    SYNTHETIC_CATALOG.movies.forEach((movie) => expect(content).toContain(movie.title));
    expect(content).toContain("min");
    expect(content).toContain("Ver Tráiler");

    // Column 4 is "Clasificación": it must carry the real labels of the dataset.
    const classifications = Array.from(rows as HTMLTableRowElement[]).map(
      (row) => (row.children[3].textContent ?? "").trim(),
    );
    ["TP", "+7", "+12", "+16", "+18"].forEach((label) => expect(classifications).toContain(label));
    expect(classifications).not.toContain("N/A");

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector(".btn-link");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("adds a movie, resets the form and toasts the confirmation", () => {
    const fixture = createComponent();
    sync(fixture);
    const component = fixture.componentInstance;
    const before = state().movies().length;

    fillDraft(component);
    component.saveMovie();
    sync(fixture);

    const rows = fixture.nativeElement.querySelectorAll(".data-table tbody tr");
    expect(state().movies().length).toBe(before + 1);
    expect(rows.length).toBe(before + 1);
    expect(rows[rows.length - 1].textContent).toContain("Cinema Paradiso");
    expect(rows[rows.length - 1].textContent).toContain("Suspenso");
    expect(toasts()).toContain("Película guardada correctamente.");
    expect(component.draft.title).toBe("");
    expect(component.draft.duration).toBeNull();
    expect(component.draft.classification).toBe("");
  });

  it("rejects an incomplete movie and keeps the list untouched", () => {
    const fixture = createComponent();
    sync(fixture);
    const component = fixture.componentInstance;
    const before = state().movies().length;

    component.saveMovie();
    sync(fixture);

    expect(state().movies().length).toBe(before);
    expect(fixture.nativeElement.querySelectorAll(".data-table tbody tr").length).toBe(before);
    expect(toasts()).toContain("Completa todos los campos de la película.");
    expect(toasts()).not.toContain("Película guardada correctamente.");
  });

  it("does not delete a movie that has scheduled showtimes", () => {
    const fixture = createComponent();
    sync(fixture);
    const before = state().movies().length;

    fixture.nativeElement.querySelector("tbody .btn-danger").click();
    sync(fixture);

    expect(state().movies().length).toBe(before);
    expect(fixture.nativeElement.querySelectorAll(".data-table tbody tr").length).toBe(before);
    expect(toasts()).toContain(
      "No se puede eliminar una película que tiene funciones programadas.",
    );
  });

  it("deletes a movie without showtimes", () => {
    const fixture = createComponent();
    sync(fixture);
    const component = fixture.componentInstance;
    const seeded = state().movies().length;

    fillDraft(component);
    component.saveMovie();
    sync(fixture);
    const rows: HTMLTableRowElement[] = Array.from(fixture.nativeElement.querySelectorAll(".data-table tbody tr"));

    (rows[rows.length - 1].querySelector(".btn-danger") as HTMLButtonElement).click();
    sync(fixture);

    expect(state().movies().length).toBe(seeded);
    expect(fixture.nativeElement.querySelectorAll(".data-table tbody tr").length).toBe(seeded);
    expect(toasts()).toContain("Película eliminada.");
  });
});
