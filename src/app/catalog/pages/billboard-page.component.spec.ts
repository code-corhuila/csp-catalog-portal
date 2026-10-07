import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { BillboardPageComponent } from "./billboard-page.component";
import { SYNTHETIC_CATALOG } from "../data/synthetic-catalog";

describe("BillboardPageComponent", () => {
  const createComponent = () => TestBed.configureTestingModule({
    imports: [BillboardPageComponent],
    providers: [provideRouter([])],
  }).createComponent(BillboardPageComponent);

  it("shows every published movie and hides drafts", () => {
    const fixture = createComponent();
    fixture.detectChanges();
    const content = fixture.nativeElement.textContent;
    const publishedMovies = SYNTHETIC_CATALOG.movies.filter(
      (movie) => movie.publicationStatus === "PUBLISHED",
    );
    const draftMovies = SYNTHETIC_CATALOG.movies.filter(
      (movie) => movie.publicationStatus === "DRAFT",
    );

    publishedMovies.forEach((movie) => expect(content).toContain(movie.title));
    draftMovies.forEach((movie) => expect(content).not.toContain(movie.title));
  });

  it("displays showtimes for each published movie", () => {
    const fixture = createComponent();
    fixture.detectChanges();
    const content = fixture.nativeElement.textContent;
    const publishedMovies = SYNTHETIC_CATALOG.movies.filter(
      (movie) => movie.publicationStatus === "PUBLISHED",
    );

    publishedMovies.forEach((movie) => {
      const movieShowtimes = SYNTHETIC_CATALOG.showtimes.filter((st) => st.movieId === movie.id);
      movieShowtimes.forEach((st) => {
        const date = new Date(st.startsAt);
        const hours = date.getHours() % 12 || 12;
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const ampm = date.getHours() >= 12 ? "PM" : "AM";
        const expectedTime = `${hours}:${minutes}\u202F${ampm}`;
        expect(content).toContain(expectedTime);
      });
    });
  });

  it("renders hero section with badge, title and subtitle", () => {
    const fixture = createComponent();
    fixture.detectChanges();
    const content = fixture.nativeElement.textContent;

    expect(content).toContain("TU CINE, TU EXPERIENCIA");
    expect(content).toContain("Vive el cine");
    expect(content).toContain("como nunca");
    expect(content).toContain("Descubre todas nuestras funciones disponibles");
  });

  it("renders search input with placeholder", () => {
    const fixture = createComponent();
    fixture.detectChanges();
    const searchInput = fixture.nativeElement.querySelector(
      'input[placeholder="Buscar película por título..."]',
    );
    expect(searchInput).not.toBeNull();
  });

  it("renders genre select with all available genres", () => {
    const fixture = createComponent();
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector("select");
    expect(select).not.toBeNull();
    const options = select.querySelectorAll("option");
    const publishedMovies = SYNTHETIC_CATALOG.movies.filter((m) => m.publicationStatus === "PUBLISHED");
    const genresSet = new Set<string>();
    publishedMovies.forEach((movie) => movie.genres?.forEach((g) => genresSet.add(g)));
    const expectedGenres = Array.from(genresSet);
    expect(options.length).toBe(expectedGenres.length + 1);
    expect(options[0].textContent).toContain("Todos los géneros");
    expectedGenres.forEach((genre) => {
      const found = Array.from(options as HTMLOptionsCollection).some((opt: HTMLOptionElement) =>
        opt.textContent?.includes(genre),
      );
      expect(found).toBeTrue();
    });
  });

  it("renders movie cards with poster, title, genre, duration, description and showtimes", () => {
    const fixture = createComponent();
    fixture.detectChanges();
    const movieCards = fixture.nativeElement.querySelectorAll(".movie-card");
    const publishedMovies = SYNTHETIC_CATALOG.movies.filter((m) => m.publicationStatus === "PUBLISHED");
    expect(movieCards.length).toBe(publishedMovies.length);

    publishedMovies.forEach((movie, index) => {
      const card = movieCards[index];
      expect(card.textContent).toContain(movie.title);
      expect(card.textContent).toContain(movie.duration.toString());
      movie.genres?.forEach((g) => expect(card.textContent).toContain(g));
      expect(card.textContent).toContain(movie.description);
      const showtimeLinks = card.querySelectorAll(".showtime-link");
      const movieShowtimes = SYNTHETIC_CATALOG.showtimes.filter((st) => st.movieId === movie.id);
      expect(showtimeLinks.length).toBe(movieShowtimes.length);
    });
  });

  it("filters movies by search term", () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const searchInput = fixture.nativeElement.querySelector(
      'input[placeholder="Buscar película por título..."]',
    );
    const firstMovie = SYNTHETIC_CATALOG.movies.find((m) => m.publicationStatus === "PUBLISHED")!;
    searchInput.value = firstMovie.title.substring(0, 3);
    searchInput.dispatchEvent(new Event("input"));
    fixture.detectChanges();

    const filtered = component.filteredMovies;
    expect(filtered.length).toBeGreaterThan(0);
    expect(
      filtered.every((m) => m.title.toLowerCase().includes(searchInput.value.toLowerCase())),
    ).toBeTrue();
  });

  it("filters movies by genre", () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector("select");
    const firstGenre = component.availableGenres[0];
    select.value = firstGenre;
    select.dispatchEvent(new Event("change"));
    fixture.detectChanges();

    const filtered = component.filteredMovies;
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((m) => m.genres?.includes(firstGenre))).toBeTrue();
  });

  it("shows empty state when no movies match search", () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const searchInput = fixture.nativeElement.querySelector(
      'input[placeholder="Buscar película por título..."]',
    );
    searchInput.value = "película-que-no-existe-xyz";
    searchInput.dispatchEvent(new Event("input"));
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain("No se encontraron películas que coincidan con los criterios de búsqueda.");
  });

  it("does not show auth buttons (simulates logged-in user)", () => {
    const fixture = createComponent();
    fixture.detectChanges();
    const content = fixture.nativeElement.textContent;
    expect(content).not.toContain("Iniciar sesión");
    expect(content).not.toContain("Registrarse");
  });

  it("shows CineSync branding in header", () => {
    const fixture = createComponent();
    fixture.detectChanges();
    const logo = fixture.nativeElement.querySelector(".brand-logo");
    expect(logo).not.toBeNull();
    expect(logo.getAttribute("src")).toBe("/assets/logos/icon-csp.svg");
    const brandName = fixture.nativeElement.querySelector(".brand-name");
    expect(brandName).not.toBeNull();
    expect(brandName.textContent).toContain("CineSync");
  });
});