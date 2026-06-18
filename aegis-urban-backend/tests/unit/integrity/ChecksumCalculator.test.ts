import { ChecksumCalculator, AuditLogRow } from "../../../src/integrity/ChecksumCalculator";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<AuditLogRow> = {}): AuditLogRow {
  const base: AuditLogRow = {
    id_log:      1n,
    action:      "LOGIN",
    entity_name: "users",
    entity_id:   "42",
    id_user:     7,
    ip_address:  "192.168.1.1",
    old_values:  null,
    new_values:  '{"session":"abc"}',
    dvh:         "", // se rellena en cada test
    dvv:         "", // se rellena en cada test
    created_at:  new Date("2026-01-01T00:00:00.000Z"),
  };
  return { ...base, ...overrides };
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1: calculateDVH
// ─────────────────────────────────────────────────────────────────────────────

describe("ChecksumCalculator.calculateDVH", () => {
  it("devuelve un string hex de 64 caracteres (SHA-256)", () => {
    const row = makeRow();
    const dvh = ChecksumCalculator.calculateDVH(row);
    expect(dvh).toHaveLength(64);
    expect(dvh).toMatch(/^[0-9a-f]+$/);
  });

  it("es determinístico — misma fila produce mismo DVH", () => {
    const row = makeRow();
    expect(ChecksumCalculator.calculateDVH(row)).toBe(
      ChecksumCalculator.calculateDVH(row)
    );
  });

  it("cambia si se modifica cualquier campo", () => {
    const original = makeRow();
    const dvhOriginal = ChecksumCalculator.calculateDVH(original);

    const fields: Array<Partial<AuditLogRow>> = [
      { action: "LOGOUT" },
      { entity_name: "sensor" },
      { entity_id: "99" },
      { id_user: 99 },
      { ip_address: "10.0.0.1" },
      { new_values: '{"session":"xyz"}' },
      { created_at: new Date("2026-06-18T12:00:00.000Z") },
    ];

    for (const field of fields) {
      const modified = makeRow(field);
      expect(ChecksumCalculator.calculateDVH(modified)).not.toBe(dvhOriginal);
    }
  });

  it("null id_user y string vacío no producen el mismo DVH que id_user=0", () => {
    const rowNull  = makeRow({ id_user: null });
    const rowZero  = makeRow({ id_user: 0 });
    expect(ChecksumCalculator.calculateDVH(rowNull)).not.toBe(
      ChecksumCalculator.calculateDVH(rowZero)
    );
  });

  it("colisión imposible: 'LOG'+'IN' ≠ 'LO'+'GIN' gracias al separador 0x1F", () => {
    const rowA = makeRow({ action: "LOG",  entity_name: "IN"  });
    const rowB = makeRow({ action: "LO",   entity_name: "GIN" });
    expect(ChecksumCalculator.calculateDVH(rowA)).not.toBe(
      ChecksumCalculator.calculateDVH(rowB)
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: calculateChainedDVV
// ─────────────────────────────────────────────────────────────────────────────

describe("ChecksumCalculator.calculateChainedDVV", () => {
  it("DVV de la primera fila ES IGUAL al DVH (previousDVV null)", () => {
    const dvh = ChecksumCalculator.calculateDVH(makeRow());
    expect(ChecksumCalculator.calculateChainedDVV(null, dvh)).toBe(dvh);
  });

  it("DVV de fila 2 incorpora el DVV de fila 1 → es diferente al DVH2", () => {
    const dvh1 = ChecksumCalculator.calculateDVH(makeRow({ id_log: 1n }));
    const dvv1 = ChecksumCalculator.calculateChainedDVV(null, dvh1);

    const dvh2 = ChecksumCalculator.calculateDVH(makeRow({ id_log: 2n, action: "LOGOUT" }));
    const dvv2 = ChecksumCalculator.calculateChainedDVV(dvv1, dvh2);

    expect(dvv2).not.toBe(dvh2);
    expect(dvv2).toHaveLength(64);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3: validateTableIntegrity — escenarios principales
// ─────────────────────────────────────────────────────────────────────────────

describe("ChecksumCalculator.validateTableIntegrity", () => {
  /**
   * buildValidChain() — crea N filas con DVH + DVV correctos.
   */
  function buildValidChain(n: number): AuditLogRow[] {
    const rows: AuditLogRow[] = [];
    let previousDVV: string | null = null;

    for (let i = 1; i <= n; i++) {
      const base = makeRow({ id_log: BigInt(i), action: `ACTION_${i}` });
      const dvh  = ChecksumCalculator.calculateDVH(base);
      const dvv  = ChecksumCalculator.calculateChainedDVV(previousDVV, dvh);
      rows.push({ ...base, dvh, dvv });
      previousDVV = dvv;
    }
    return rows;
  }

  // ── Test 3.1: tabla vacía
  it("tabla vacía → isValid: true", () => {
    const result = ChecksumCalculator.validateTableIntegrity([]);
    expect(result.isValid).toBe(true);
    expect(result.corruptedRow).toBeNull();
  });

  // ── Test 3.2: inserción correcta → cadena válida
  it("3 filas correctas → isValid: true", () => {
    const rows = buildValidChain(3);
    const result = ChecksumCalculator.validateTableIntegrity(rows);
    expect(result.isValid).toBe(true);
    expect(result.corruptedRow).toBeNull();
    expect(result.reason).toContain("3 filas verificadas");
  });

  // ── Test 3.3: modificar un campo → DVH de esa fila inválido
  it("modificar un campo de la fila 2 → DVH inválido → corruptedRow = 2n", () => {
    const rows = buildValidChain(3);

    // Alteramos directamente el campo action DESPUÉS de guardar DVH
    rows[1] = { ...rows[1], action: "TAMPERED_ACTION" };

    const result = ChecksumCalculator.validateTableIntegrity(rows);
    expect(result.isValid).toBe(false);
    expect(result.corruptedRow).toBe(2n);
    expect(result.reason).toMatch(/DVH inválido/);
  });

  // ── Test 3.4: eliminar fila 1 → DVV de fila 2 ya no encadena
  it("eliminar fila 1 → DVV de fila 2 roto → corruptedRow = 2n", () => {
    const rows = buildValidChain(3);

    // Simulamos eliminación: sacamos la primera fila
    const [, ...withoutFirst] = rows;

    const result = ChecksumCalculator.validateTableIntegrity(withoutFirst);
    expect(result.isValid).toBe(false);
    expect(result.corruptedRow).toBe(2n);
    expect(result.reason).toMatch(/DVV roto/);
  });

  // ── Test 3.5: insertar una fila falsa en el medio → rompe cadena desde el punto de inserción
  it("insertar fila espuria entre fila 1 y fila 2 → DVV de fila 2 roto", () => {
    const rows = buildValidChain(3);

    // Creamos una fila falsa con DVH correcto para sí misma pero que rompe la cadena de fila 2
    const spuriousBase = makeRow({ id_log: 99n, action: "FAKE_INSERT", id_user: 999 });
    const spuriousDVH  = ChecksumCalculator.calculateDVH(spuriousBase);
    const spuriousDVV  = ChecksumCalculator.calculateChainedDVV(rows[0].dvv, spuriousDVH);
    const spurious: AuditLogRow = { ...spuriousBase, dvh: spuriousDVH, dvv: spuriousDVV };

    // [row1, spurious, row2, row3] — la cadena de row2 ya no encadena con spurious
    const tampered = [rows[0], spurious, rows[1], rows[2]];

    const result = ChecksumCalculator.validateTableIntegrity(tampered);
    expect(result.isValid).toBe(false);
    expect(result.reason).toMatch(/DVV roto/);
  });

  // ── Test 3.6: alterar DVH directamente → detectado antes de verificar DVV
  it("alterar dvh almacenado directamente → detectado como DVH inválido", () => {
    const rows = buildValidChain(2);
    rows[0] = { ...rows[0], dvh: "a".repeat(64) };

    const result = ChecksumCalculator.validateTableIntegrity(rows);
    expect(result.isValid).toBe(false);
    expect(result.corruptedRow).toBe(1n);
    expect(result.reason).toMatch(/DVH inválido/);
  });

  // ── Test 3.7: cadena de 100 filas correctas → O(n) sin false positivos
  it("100 filas correctas → isValid: true (escenario de carga)", () => {
    const rows = buildValidChain(100);
    const result = ChecksumCalculator.validateTableIntegrity(rows);
    expect(result.isValid).toBe(true);
    expect(result.reason).toContain("100 filas verificadas");
  });
});
