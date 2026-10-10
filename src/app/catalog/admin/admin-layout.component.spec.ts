import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { AdminLayoutComponent } from "./admin-layout.component";
import { AdminToastService } from "./data/admin-toast.service";

describe("AdminLayoutComponent", () => {
  const createComponent = () => TestBed.configureTestingModule({
    imports: [AdminLayoutComponent],
    providers: [provideRouter([])],
  }).createComponent(AdminLayoutComponent);

  it("shows the Admin badge next to the section navigation", () => {
    const fixture = createComponent();
    fixture.detectChanges();
    const badge: HTMLElement | null = fixture.nativeElement.querySelector(".admin-badge");

    expect(badge).not.toBeNull();
    expect(badge!.textContent!.trim()).toBe("Admin");
  });

  it("renders the administration links with the labels of the mockup", () => {
    const fixture = createComponent();
    fixture.detectChanges();
    const links: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll(".nav-link"));

    expect(links.map((link) => link.textContent!.trim())).toEqual([
      "Cartelera y Funciones",
      "Películas",
      "Salas",
      "Reportes",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/admin/billboard",
      "/admin/movies",
      "/admin/rooms",
      "/admin/reports",
    ]);
  });

  it("renders an outlet for the active administration page", () => {
    const fixture = createComponent();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector("router-outlet")).not.toBeNull();
  });

  it("renders the queued success and error toasts", () => {
    const fixture = createComponent();
    const toasts = TestBed.inject(AdminToastService);
    toasts.success("Película guardada correctamente.");
    toasts.error("Conflicto detectado en la programación.");
    fixture.detectChanges();

    const elements: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll(".toast"));
    expect(elements.length).toBe(2);
    expect(elements[0].textContent).toContain("Película guardada correctamente.");
    expect(elements[0].classList.contains("toast-success")).toBeTrue();
    expect(elements[1].textContent).toContain("Conflicto detectado en la programación.");
    expect(elements[1].classList.contains("toast-error")).toBeTrue();
  });
});
