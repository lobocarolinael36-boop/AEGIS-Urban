import { distanciaMetros, evaluarRiesgo, nombreRumbo, radioPorAlerta, ZonaRiesgo } from "../../../src/core/geo/riesgo";

const zona = (extra: Partial<ZonaRiesgo> = {}): ZonaRiesgo => ({
  id: 1, nombre: "Palermo", tipo: "Inundación", nivel: "CRITICAL",
  lat: -34.581, lon: -58.429, radioM: 1500, ...extra,
});

describe("distanciaMetros", () => {
  it("es 0 para el mismo punto", () => expect(distanciaMetros(-34.6, -58.4, -34.6, -58.4)).toBeCloseTo(0, 5));
  it("1° de latitud ≈ 111 km", () => expect(distanciaMetros(0, 0, 1, 0)).toBeGreaterThan(110_000));
});

describe("nombreRumbo", () => {
  it.each([[0, "norte"], [90, "este"], [180, "sur"], [270, "oeste"], [359, "norte"]])("%i° → %s", (g, n) =>
    expect(nombreRumbo(g)).toBe(n));
});

describe("radioPorAlerta", () => {
  it("el fuego tiene mayor radio que el resto", () =>
    expect(radioPorAlerta("CRITICAL", "FIRE")).toBeGreaterThan(radioPorAlerta("CRITICAL", "FLOOD")));
  it("crece con la severidad", () =>
    expect(radioPorAlerta("CATASTROPHIC", "FLOOD")).toBeGreaterThan(radioPorAlerta("WARNING", "FLOOD")));
});

describe("evaluarRiesgo", () => {
  it("sin zonas → SEGURO", () => expect(evaluarRiesgo(-34.6, -58.4, []).estado).toBe("SEGURO"));

  it("lejos de la zona → SEGURO", () =>
    expect(evaluarRiesgo(-34.7, -58.2, [zona()]).estado).toBe("SEGURO"));

  it("dentro de una zona CRITICAL → PELIGRO y sugiere alejarse", () => {
    const r = evaluarRiesgo(-34.581, -58.4285, [zona()]);
    expect(r.estado).toBe("PELIGRO");
    expect(r.zona?.nombre).toBe("Palermo");
    expect(r.mensaje).toContain("zona peligrosa");
    expect(r.direccion).not.toBeNull();
  });

  it("dentro de una zona WARNING → PRECAUCION (no PELIGRO)", () =>
    expect(evaluarRiesgo(-34.581, -58.429, [zona({ nivel: "WARNING", radioM: 800 })]).estado).toBe("PRECAUCION"));

  it("cerca del borde, fuera del radio → PRECAUCION", () => {
    // ~2 km al norte: fuera de 1500 m pero dentro del margen de 2400 m
    expect(evaluarRiesgo(-34.563, -58.429, [zona()]).estado).toBe("PRECAUCION");
  });

  it("el rumbo para alejarse apunta en sentido contrario a la zona", () => {
    // usuario al sur de la zona → alejarse hacia el sur
    const r = evaluarRiesgo(-34.585, -58.429, [zona()]);
    expect(r.direccion).toBe("sur");
  });

  it("prioriza PELIGRO sobre PRECAUCION", () => {
    const r = evaluarRiesgo(-34.581, -58.429, [
      zona({ id: 2, nombre: "Cerca", nivel: "WARNING", radioM: 800 }),
      zona({ id: 3, nombre: "Grave", nivel: "CATASTROPHIC", radioM: 2500 }),
    ]);
    expect(r.estado).toBe("PELIGRO");
    expect(r.zona?.nombre).toBe("Grave");
  });
});
