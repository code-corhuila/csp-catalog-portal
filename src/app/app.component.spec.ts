import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { AppComponent } from "./app.component";

/** Empty page used only to mount routes in the site-header tests. */
@Component({ selector: "app-stub-page", standalone: true, template: "" })
class StubPage {}

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

  it("hides the site header on /admin routes (admin layout owns the header)", async () => {
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([
        { path: "admin", component: StubPage },
        { path: "**", component: StubPage },
      ])],
    });
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector(".site-header")).not.toBeNull();
    await router.navigateByUrl("/admin/rooms");
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector(".site-header")).toBeNull();
    await router.navigateByUrl("/");
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector(".site-header")).not.toBeNull();
  });

  it("does not show auth buttons (shell handles auth)", () => {
    const fixture = createComponent();
    fixture.detectChanges();
    const content = fixture.nativeElement.textContent;
    expect(content).not.toContain("Iniciar sesión");
    expect(content).not.toContain("Registrarse");
  });
});