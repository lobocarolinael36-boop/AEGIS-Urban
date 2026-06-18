import { ChecksumCalculator, FilaBitacora } from "../../../src/integrity/ChecksumCalculator";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function crearFila(sobreescribir: Partial<FilaBitacora> = {}): FilaBitacora {
  const base: FilaBitacora = {
    id_log:      1n,
    action:      "LOGIN",
    entity_name: "users",
    entity_id:   "42",
    id_user:     7,
    ip_address:  "192.168.1.1",
    old_values:  null,
    new_values:  '{"sesion":"abc"}',
    dvh:         "", // se rellena en cada test
    dvv:         "", // se rellena en cada test
    created_at:  new Date("2026-01-01T00:00:00.000Z"),
  };
  return { ...base, ...sobreescribir };
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1: calcularDVH
// ─────────────────────────────────────────────────────────────────────────────

describe("ChecksumCalculator.calcularDVH", () => {
  it("devuelve un string hex de 64 caracteres (SHA-256)", () => {
    const fila = crearFila();
    const dvh  = ChecksumCalculator.calcularDVH(fila);
    expect(dvh).toHaveLength(64);
    expect(dvh).toMatch(/^[0-9a-f]+$/);
  });

  it("es determinístico — misma fila produce mismo DVH", () => {
    const fila = crearFila();
    expect(ChecksumCalculator.calcularDVH(fila)).toBe(
      ChecksumCalculator.calcularDVH(fila)
    );
  });

  it("cambia si se modifica cualquier campo", () => {
    const original   = crearFila();
    const dvhOriginal = ChecksumCalculator.calcularDVH(original);

    const campos: Array<Partial<FilaBitacora>> = [
      { action: "LOGOUT" },
      { entity_name: "sensor" },
      { entity_id: "99" },
      { id_user: 99 },
      { ip_address: "10.0.0.1" },
      { new_values: '{"sesion":"xyz"}' },
      { created_at: new Date("2026-06-18T12:00:00.000Z") },
    ];

    for (const campo of campos) {
      const modificada = crearFila(campo);
      expect(ChecksumCalculator.calcularDVH(modificada)).not.toBe(dvhOriginal);
    }
  });

  it("id_user null y vacío no producen el mismo DVH que id_user=0", () => {
    const filaNula  = crearFila({ id_user: null });
    const filaCero  = crearFila({ id_user: 0 });
    expect(ChecksumCalculator.calcularDVH(filaNula)).not.toBe(
      ChecksumCalculator.calcularDVH(filaCero)
    );
  });

  it("colisión imposible: 'LOG'+'IN' ≠ 'LO'+'GIN' gracias al separador 0x1F", () => {
    const filaA = crearFila({ action: "LOG",  entity_name: "IN"  });
    const filaB = crearFila({ action: "LO",   entity_name: "GIN" });
    expect(ChecksumCalculator.calcularDVH(filaA)).not.toBe(
      ChecksumCalculator.calcularDVH(filaB)
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: calcularDVVEncadenado
// ─────────────────────────────────────────────────────────────────────────────

describe("ChecksumCalculator.calcularDVVEncadenado", () => {
  it("DVV de la primera fila ES IGUAL al DVH (dvvAnterior null)", () => {
    const dvh = ChecksumCalculator.calcularDVH(crearFila());
    expect(ChecksumCalculator.calcularDVVEncadenado(null, dvh)).toBe(dvh);
  });

  it("DVV de fila 2 incorpora el DVV de fila 1 → es diferente al DVH2", () => {
    const dvh1 = ChecksumCalculator.calcularDVH(crearFila({ id_log: 1n }));
    const dvv1 = ChecksumCalculator.calcularDVVEncadenado(null, dvh1);

    const dvh2 = ChecksumCalculator.calcularDVH(crearFila({ id_log: 2n, action: "LOGOUT" }));
    const dvv2 = ChecksumCalculator.calcularDVVEncadenado(dvv1, dvh2);

    expect(dvv2).not.toBe(dvh2);
    expect(dvv2).toHaveLength(64);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3: validarIntegridad — escenarios principales
// ─────────────────────────────────────────────────────────────────────────────

describe("ChecksumCalculator.validarIntegridad", () => {
  /**
   * construirCadenaValida() — crea N filas con DVH + DVV correctos.
   */
  function construirCadenaValida(n: number): FilaBitacora[] {
    const filas: FilaBitacora[] = [];
    let dvvAnterior: string | null = null;

    for (let i = 1; i <= n; i++) {
      const base = crearFila({ id_log: BigInt(i), action: `ACCION_${i}` });
      const dvh  = ChecksumCalculator.calcularDVH(base);
      const dvv  = ChecksumCalculator.calcularDVVEncadenado(dvvAnterior, dvh);
      filas.push({ ...base, dvh, dvv });
      dvvAnterior = dvv;
    }
    return filas;
  }

  // ── Test 3.1: tabla vacía
  it("tabla vacía → esValida: true", () => {
    const resultado = ChecksumCalculator.validarIntegridad([]);
    expect(resultado.esValida).toBe(true);
    expect(resultado.filaCorrupta).toBeNull();
  });

  // ── Test 3.2: inserción correcta → cadena válida
  it("3 filas correctas → esValida: true", () => {
    const filas     = construirCadenaValida(3);
    const resultado = ChecksumCalculator.validarIntegridad(filas);
    expect(resultado.esValida).toBe(true);
    expect(resultado.filaCorrupta).toBeNull();
    expect(resultado.motivo).toContain("3 filas verificadas");
  });

  // ── Test 3.3: modificar un campo → DVH de esa fila inválido
  it("modificar un campo de la fila 2 → DVH inválido → filaCorrupta = 2n", () => {
    const filas = construirCadenaValida(3);

    // Alteramos directamente el campo action DESPUÉS de guardar DVH
    filas[1] = { ...filas[1], action: "ACCION_MANIPULADA" };

    const resultado = ChecksumCalculator.validarIntegridad(filas);
    expect(resultado.esValida).toBe(false);
    expect(resultado.filaCorrupta).toBe(2n);
    expect(resultado.motivo).toMatch(/DVH inválido/);
  });

  // ── Test 3.4: eliminar fila 1 → DVV de fila 2 ya no encadena
  it("eliminar fila 1 → DVV de fila 2 roto → filaCorrupta = 2n", () => {
    const filas = construirCadenaValida(3);

    // Simulamos eliminación: sacamos la primera fila
    const [, ...sinPrimera] = filas;

    const resultado = ChecksumCalculator.validarIntegridad(sinPrimera);
    expect(resultado.esValida).toBe(false);
    expect(resultado.filaCorrupta).toBe(2n);
    expect(resultado.motivo).toMatch(/DVV roto/);
  });

  // ── Test 3.5: insertar una fila falsa en el medio → rompe cadena desde el punto de inserción
  it("insertar fila espuria entre fila 1 y fila 2 → DVV de fila 2 roto", () => {
    const filas = construirCadenaValida(3);

    const baseEspuria = crearFila({ id_log: 99n, action: "INSERCION_FALSA", id_user: 999 });
    const dvhEspurio  = ChecksumCalculator.calcularDVH(baseEspuria);
    const dvvEspurio  = ChecksumCalculator.calcularDVVEncadenado(filas[0].dvv, dvhEspurio);
    const filaEspuria: FilaBitacora = { ...baseEspuria, dvh: dvhEspurio, dvv: dvvEspurio };

    // [fila1, espuria, fila2, fila3] — la cadena de fila2 ya no encadena con espuria
    const manipulada = [filas[0], filaEspuria, filas[1], filas[2]];

    const resultado = ChecksumCalculator.validarIntegridad(manipulada);
    expect(resultado.esValida).toBe(false);
    expect(resultado.motivo).toMatch(/DVV roto/);
  });

  // ── Test 3.6: alterar dvh almacenado directamente → detectado antes de verificar DVV
  it("alterar dvh almacenado directamente → detectado como DVH inválido", () => {
    const filas = construirCadenaValida(2);
    filas[0] = { ...filas[0], dvh: "a".repeat(64) };

    const resultado = ChecksumCalculator.validarIntegridad(filas);
    expect(resultado.esValida).toBe(false);
    expect(resultado.filaCorrupta).toBe(1n);
    expect(resultado.motivo).toMatch(/DVH inválido/);
  });

  // ── Test 3.7: cadena de 100 filas correctas → O(n) sin falsos positivos
  it("100 filas correctas → esValida: true (escenario de carga)", () => {
    const filas     = construirCadenaValida(100);
    const resultado = ChecksumCalculator.validarIntegridad(filas);
    expect(resultado.esValida).toBe(true);
    expect(resultado.motivo).toContain("100 filas verificadas");
  });
});
