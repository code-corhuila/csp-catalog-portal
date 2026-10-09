import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { AdminBillboardPageComponent } from "./admin-billboard-page.component";
import {
  AdminCatalogStateService,
  parseDateTimeLocal,
  toDateTimeLocalValue,
} from "../data/admin-catalog-state.service";
import { AdminToastService } from "../data/admin-toast.service";

describe("AdminBillboardPageComponent", () => {
  const createComponent = () => TestBed.configureTestingModule({
    imports: [AdminBillboardPageComponent],
    providers: [provideRouter([])],
  }).createComponent(AdminBillboardPageComponent);

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

  it("renders the page header of the mockup", () => {
    const fixture = createComponent();
    sync(fixture);
    const content = fixture.nativeElement.textContent;

    expect(content).toContain("Gestión de Cartelera y Funciones");
    expect(content).toContain("Programa y administra las funciones disponibles del cine.");
  });

  it("offers every movie and room in the schedule form", () => {
    const fixture = createComponent();
    sync(fixture);

    const movieSelect: HTMLSelectElement = fixture.nativeElement.querySelector("#movie-select");
    const roomSelect: HTMLSelectElement = fixture.nativeElement.querySelector("#room-select");

    expect(movieSelect.options.length).toBe(state().movies().length + 1);
    expect(roomSelect.options.length).toBe(state().rooms().length + 1);
    expect(movieSelect.options[0].textContent).toContain("Seleccionar película...");
    expect(roomSelect.options[0].textContent).toContain("Seleccionar sala...");
    expect(Array.from(movieSelect.options).some((option) => option.value === state().movies()[0].id)).toBeTrue();
  });

  it("lists every scheduled showtime with movie, room, times and status", () => {
    const fixture = createComponent();
    sync(fixture);
    const rows = fixture.nativeElement.querySelectorAll(".data-table tbody tr");
    const showtime = state().showtimes()[0];

    expect(rows.length).toBe(state().showtimes().length);
    expect(rows[0].textContent).toContain(state().movieTitle(showtime.movieId));
    expect(rows[0].textContent).toContain(state().roomName(showtime.roomId));
    expect(rows[0].textContent).toContain("2026-10-06 20:00");
    expect(rows[0].querySelector(".status-tag").textContent.trim()).toBe("Publicada");
    expect(rows[0].querySelector(".btn-danger").textContent.trim()).toBe("Eliminar");
  });

  it("shows the empty state when no function is scheduled", () => {
    const fixture = createComponent();
    state().showtimes.set([]);
    sync(fixture);

    expect(fixture.nativeElement.textContent).toContain("No hay funciones programadas.");
  });

  it("calculates the end time from the selected movie duration", async () => {
    const fixture = createComponent();
    sync(fixture);
    // NgForm wires every NgModel of the <form> on a microtask.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    sync(fixture);

    const component = fixture.componentInstance;
    const movie = state().movies()[0];

    const movieSelect: HTMLSelectElement = fixture.nativeElement.querySelector("#movie-select");
    movieSelect.value = movie.id;
    movieSelect.dispatchEvent(new Event("change"));

    const startInput: HTMLInputElement = fixture.nativeElement.querySelector("#start-time");
    startInput.value = "2026-11-01T10:00";
    startInput.dispatchEvent(new Event("input"));
    sync(fixture);

    // NgModel writes the model back into the DOM on a resolved promise.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    sync(fixture);

    const expected = toDateTimeLocalValue(parseDateTimeLocal("2026-11-01T10:00") + movie.duration * 60_000);
    const endInput: HTMLInputElement = fixture.nativeElement.querySelector("#end-time");

    expect(component.selectedMovieId).toBe(movie.id);
    expect(component.startTime).toBe("2026-11-01T10:00");
    expect(component.endTime).toBe(expected);
    expect(endInput.value).toBe(expected);
    expect(endInput.readOnly).toBeTrue();
  });

  it("publishes a function, adds its row and toasts the confirmation", () => {
    const fixture = createComponent();
    sync(fixture);
    const component = fixture.componentInstance;
    const before = state().showtimes().length;

    component.selectedMovieId = state().movies()[0].id;
    component.selectedRoomId = state().rooms()[0].id;
    component.startTime = "2026-11-02T09:00";
    component.schedule();
    sync(fixture);

    const rows = fixture.nativeElement.querySelectorAll(".data-table tbody tr");
    expect(state().showtimes().length).toBe(before + 1);
    expect(rows.length).toBe(before + 1);
    expect(toasts()).toContain("Función programada exitosamente.");
    expect(component.selectedMovieId).toBe("");
    expect(component.startTime).toBe("");
    expect(component.alertMessage).toBe("");
  });

  it("shows the conflict alert and an error toast when the room is already busy", () => {
    const fixture = createComponent();
    sync(fixture);
    const component = fixture.componentInstance;
    const busy = state().showtimes()[0];
    const before = state().showtimes().length;

    component.selectedMovieId = state().movies()[0].id;
    component.selectedRoomId = busy.roomId;
    component.startTime = "2026-10-06T21:00";
    component.schedule();
    sync(fixture);

    const alert: HTMLElement | null = fixture.nativeElement.querySelector(".alert");
    expect(state().showtimes().length).toBe(before);
    expect(component.alertMessage).toContain("ya tiene una función programada en ese horario");
    expect(alert).not.toBeNull();
    expect(alert!.textContent).toContain("ya tiene una función programada en ese horario");
    expect(toasts()).toContain("Conflicto detectado en la programación.");
  });

  it("asks for every field when the schedule is incomplete", () => {
    const fixture = createComponent();
    sync(fixture);
    const component = fixture.componentInstance;
    const before = state().showtimes().length;

    component.schedule();
    sync(fixture);

    expect(state().showtimes().length).toBe(before);
    expect(component.alertMessage).toBe("");
    expect(fixture.nativeElement.querySelector(".alert")).toBeNull();
    expect(toasts()).toContain("Completa todos los campos.");
  });

  it("removes a showtime from the table", () => {
    const fixture = createComponent();
    sync(fixture);
    const before = state().showtimes().length;

    fixture.nativeElement.querySelector("tbody .btn-danger").click();
    sync(fixture);

    expect(state().showtimes().length).toBe(before - 1);
    expect(fixture.nativeElement.querySelectorAll(".data-table tbody tr").length).toBe(before - 1);
    expect(toasts()).toContain("Función retirada de cartelera.");
  });

  it("does not show auth buttons (the shell owns authentication)", () => {
    const fixture = createComponent();
    sync(fixture);
    const content = fixture.nativeElement.textContent;

    expect(content).not.toContain("Iniciar sesión");
    expect(content).not.toContain("Registrarse");
  });
});
