import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { AppComponent } from "./app.component";

describe("AppComponent (standalone)", () => {
  const createComponent = () => TestBed.configureTestingModule({
    imports: [AppComponent],
    providers: [provideRouter([])],
  }).createComponent(AppComponent);

  it("shows CineSync branding in header when running standalone", () => {
    const fixture = createComponent();
    fixture.detectChanges();
    const logo = fixture.nativeElement.querySelector(".brand-logo");
    expect(logo).not.toBeNull();
    expect(logo.getAttribute("src")).toBe("/assets/logos/icon-csp.svg");
    const brandName = fixture.nativeElement.querySelector(".brand-name");
    expect(brandName).not.toBeNull();
    expect(brandName.textContent).toContain("CineSync");
  });

  it("does not show auth buttons (shell handles auth)", () => {
    const fixture = createComponent();
    fixture.detectChanges();
    const content = fixture.nativeElement.textContent;
    expect(content).not.toContain("Iniciar sesión");
    expect(content).not.toContain("Registrarse");
  });
});