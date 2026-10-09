import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { AdminRoomsPageComponent } from "./admin-rooms-page.component";
import { AdminCatalogStateService } from "../data/admin-catalog-state.service";
import { AdminToastService } from "../data/admin-toast.service";
import { SYNTHETIC_CATALOG } from "../../data/synthetic-catalog";

describe("AdminRoomsPageComponent", () => {
  const createComponent = () => TestBed.configureTestingModule({
    imports: [AdminRoomsPageComponent],
    providers: [provideRouter([])],
  }).createComponent(AdminRoomsPageComponent);

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

    expect(content).toContain("Configuración de Salas");
    expect(content).toContain("Administra las salas y su capacidad de asientos.");
  });

  it("renders the room creation form", () => {
    const fixture = createComponent();
    sync(fixture);

    expect(fixture.nativeElement.querySelector("#new-room-name")).not.toBeNull();
    expect(fixture.nativeElement.querySelector("#new-room-capacity").getAttribute("type")).toBe("number");
    expect(fixture.nativeElement.querySelector("button[type=submit]").textContent.trim()).toBe("Guardar Sala");
  });

  it("lists every room with its seat capacity", () => {
    const fixture = createComponent();
    sync(fixture);
    const rows = fixture.nativeElement.querySelectorAll(".data-table tbody tr");
    const content = fixture.nativeElement.textContent;

    expect(rows.length).toBe(state().rooms().length);
    SYNTHETIC_CATALOG.rooms.forEach((room) => expect(content).toContain(room.name));
    expect(content).toContain("48 asientos");
    expect(rows[0].querySelector(".btn-danger").textContent.trim()).toBe("Eliminar");
  });

  it("shows the empty state when there are no rooms", () => {
    const fixture = createComponent();
    state().rooms.set([]);
    sync(fixture);

    expect(fixture.nativeElement.textContent).toContain("No hay salas registradas.");
  });

  it("creates a room, resets the form and toasts the confirmation", () => {
    const fixture = createComponent();
    sync(fixture);
    const component = fixture.componentInstance;
    const before = state().rooms().length;

    component.draft.name = "Sala 02 - VIP";
    component.draft.capacity = 60;
    component.saveRoom();
    sync(fixture);

    const rows = fixture.nativeElement.querySelectorAll(".data-table tbody tr");
    expect(state().rooms().length).toBe(before + 1);
    expect(rows.length).toBe(before + 1);
    expect(rows[rows.length - 1].textContent).toContain("Sala 02 - VIP");
    expect(rows[rows.length - 1].textContent).toContain("60 asientos");
    expect(toasts()).toContain("Sala registrada exitosamente.");
    expect(component.draft.name).toBe("");
    expect(component.draft.capacity).toBeNull();
  });

  it("rejects a room without a name or a positive capacity", () => {
    const fixture = createComponent();
    sync(fixture);
    const component = fixture.componentInstance;
    const before = state().rooms().length;

    component.draft.name = "   ";
    component.draft.capacity = 60;
    component.saveRoom();
    component.draft.name = "Sala 03";
    component.draft.capacity = 0;
    component.saveRoom();
    sync(fixture);

    expect(state().rooms().length).toBe(before);
    expect(fixture.nativeElement.querySelectorAll(".data-table tbody tr").length).toBe(before);
    expect(toasts()).toContain("Ingresa un nombre y una capacidad válidos.");
  });

  it("does not delete a room that has scheduled showtimes", () => {
    const fixture = createComponent();
    sync(fixture);
    const before = state().rooms().length;

    fixture.nativeElement.querySelector("tbody .btn-danger").click();
    sync(fixture);

    expect(state().rooms().length).toBe(before);
    expect(fixture.nativeElement.querySelectorAll(".data-table tbody tr").length).toBe(before);
    expect(toasts()).toContain(
      "No se puede eliminar una sala que tiene funciones programadas.",
    );
  });

  it("deletes a room without showtimes", () => {
    const fixture = createComponent();
    sync(fixture);
    const component = fixture.componentInstance;
    const seeded = state().rooms().length;

    component.draft.name = "Sala 02 - VIP";
    component.draft.capacity = 60;
    component.saveRoom();
    sync(fixture);
    const rows: HTMLTableRowElement[] = Array.from(fixture.nativeElement.querySelectorAll(".data-table tbody tr"));

    (rows[rows.length - 1].querySelector(".btn-danger") as HTMLButtonElement).click();
    sync(fixture);

    expect(state().rooms().length).toBe(seeded);
    expect(fixture.nativeElement.querySelectorAll(".data-table tbody tr").length).toBe(seeded);
    expect(toasts()).toContain("Sala eliminada.");
  });
});
