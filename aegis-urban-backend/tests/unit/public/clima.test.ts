import { avisosDesdeClima, describirCodigo, ClimaActual } from "../../../src/modules/public/clima.service";

const base: ClimaActual = {
  temperaturaC: 20, sensacionC: 20, precipitacionMm: 0, vientoKmh: 10, rafagasKmh: 15,
  codigo: 0, descripcion: "Despejado", aqi: 30, pm25: 8, actualizado: "2026-01-01T00:00:00Z",
};

describe("avisosDesdeClima", () => {
  it("clima templado → sin avisos", () => expect(avisosDesdeClima(base)).toEqual([]));

  it("calor extremo → aviso CRITICAL de HEAT", () => {
    const a = avisosDesdeClima({ ...base, sensacionC: 40 });
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ tipo: "HEAT", nivel: "CRITICAL", origen: "real" });
  });

  it("viento y lluvia a la vez → 2 avisos distintos", () => {
    const tipos = avisosDesdeClima({ ...base, rafagasKmh: 60, precipitacionMm: 4 }).map(a => a.tipo).sort();
    expect(tipos).toEqual(["RAIN", "WIND"]);
  });

  it("tormenta eléctrica y mala calidad de aire", () => {
    const tipos = avisosDesdeClima({ ...base, codigo: 95, aqi: 160 }).map(a => a.tipo).sort();
    expect(tipos).toEqual(["AIR_QUALITY", "STORM"]);
  });

  it("AQI nulo no genera aviso", () =>
    expect(avisosDesdeClima({ ...base, aqi: null })).toEqual([]));
});

describe("describirCodigo", () => {
  it("traduce códigos WMO", () => {
    expect(describirCodigo(0)).toBe("Despejado");
    expect(describirCodigo(63)).toBe("Lluvia");
    expect(describirCodigo(96)).toBe("Tormenta eléctrica");
  });
});
