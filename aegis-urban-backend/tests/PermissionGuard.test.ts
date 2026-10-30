const mockConsultar = jest.fn();

jest.mock("../src/config/database", () => ({ db: { consultar: (...args: unknown[]) => mockConsultar(...args) } }));

import { familiaTienePermiso } from "../src/security/access-control/PermissionGuard";

const permisosBase = [
  { codigo: "ALERT_VIEW", recurso: "/api/alertas", metodoHttp: "GET" },
];
const permisosDefensa = [
  { codigo: "ALERT_ACKNOWLEDGE", recurso: "/api/alertas/:id/reconocer", metodoHttp: "PATCH" },
  { codigo: "SIMULATION_SCENARIOS_CREATE", recurso: "/api/simulation/start", metodoHttp: "POST" },
];
const permisosAuditor = [
  { codigo: "AUDIT_VIEW", recurso: "/api/admin/bitacora", metodoHttp: "GET" },
];

function configurarFamilia(ids: number[], permisos: unknown[]) {
  mockConsultar.mockReset();
  mockConsultar.mockImplementation((sql: string) => Promise.resolve({
    rows: sql.includes("WITH RECURSIVE")
      ? ids.map((id, i) => ({ id_family: id, name: `family_${id}`, id_parent_family: i ? ids[i - 1] : null }))
      : permisos,
  }));
}

describe("matriz de permisos por familia", () => {
  it("permite a Tránsito consultar alertas, pero no reconocerlas", async () => {
    configurarFamilia([1], permisosBase);
    await expect(familiaTienePermiso(1, "/api/alertas", "GET")).resolves.toBe(true);
    await expect(familiaTienePermiso(1, "/api/alertas/:id/reconocer", "PATCH")).resolves.toBe(false);
  });

  it("permite a Defensa Civil reconocer alertas y configurar escenarios", async () => {
    configurarFamilia([1, 2], [...permisosBase, ...permisosDefensa]);
    await expect(familiaTienePermiso(2, "/api/alertas/:id/reconocer", "PATCH")).resolves.toBe(true);
    await expect(familiaTienePermiso(2, "/api/simulation/start", "POST")).resolves.toBe(true);
  });

  it("permite a Auditoría leer bitácora, pero no ejecutar operaciones", async () => {
    configurarFamilia([3], [...permisosBase, ...permisosAuditor]);
    await expect(familiaTienePermiso(3, "/api/admin/bitacora", "GET")).resolves.toBe(true);
    await expect(familiaTienePermiso(3, "/api/alertas/:id/reconocer", "PATCH")).resolves.toBe(false);
  });
});
