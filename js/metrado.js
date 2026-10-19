/* METRADO
   Cantidades de materiales (conductores, tubos, cajas, interruptores, tableros) a partir del resultado. */
const PULG = { 0.0127: '1/2"', 0.0159: '5/8"', 0.0191: '3/4"' };
function metrado(r) {
  const c = r.c,
    des = 1 + c.pDesp / 100,
    baj = c.bajada,
    D = c.desig ? ` ${c.desig}` : "";
  const cond = {},
    tubo = {},
    curv = {},
    itm = {},
    ids = {},
    add = (o, k, v) => {
      o[k] = (o[k] || 0) + v;
    };
  const tk = t => (t.mm ? `${t.mm}` : "80+"),
    tl = t => (t.mm ? `${t.mm} mm (${t.pul})` : `mayor de 3"`);
  const tubDesc = {};
  r.alims.forEach(a => {
    const n = a.cant || 1;
    add(cond, a.S, a.s.n * a.L * n);
    add(cond, a.St, a.L * n);
    add(tubo, tk(a.tubo), a.L * n);
    add(curv, tk(a.tubo), 2 * n);
    tubDesc[tk(a.tubo)] = tl(a.tubo);
    add(itm, `${a.s.tri ? 3 : 2}|${a.itm}|C|${a.pdc}`, n);
  });
  r.circ.forEach(q => {
    const n = r.alims[q.feeder].cant || 1,
      Lr = q.L + baj * q.n;
    add(cond, q.S, (q.f3 ? 3 : 2) * Lr * n);
    add(cond, q.St, Lr * n);
    add(tubo, tk(q.tubo), Lr * n);
    add(curv, tk(q.tubo), q.n * n);
    tubDesc[tk(q.tubo)] = tl(q.tubo);
    const tb = r.tabs.find(t => t.tab === q.tab);
    add(itm, `${q.f3 ? 3 : 2}|${q.itm}|${q.curva}|${tb.pdc}`, n);
  });
  let mods = {},
    nRes = 0;
  r.tabs.forEach(tb => {
    const n = r.alims[tb.feeder].cant || 1,
      cs = r.circ.filter(q => q.tab === tb.tab),
      vistos = {};
    let m =
      cs.reduce((s, q) => s + (q.f3 ? 3 : 2), 0) +
      c.reserva * 2 +
      (r.mode === "uni" && tb.tab === "TG" ? r.alims.slice(1).reduce((s, a) => s + (a.s.tri ? 3 : 2), 0) : 0);
    cs.forEach(q => {
      const k = c.idMode === "circuito" ? q.key : q.idName;
      if (vistos[k]) return;
      vistos[k] = 1;
      const g = cs.filter(x => (c.idMode === "circuito" ? x.key : x.idName) === k),
        pol = g.some(x => x.f3) ? 4 : 2;
      m += pol;
      add(ids, `${pol}|${q.idRat}`, n);
    });
    mods[tb.tab] = { n, m, desc: tb.desc };
    nRes += c.reserva * n;
  });
  let al = 0,
    to = 0,
    esp = 0,
    nCirc = 0;
  if (r.mode === "uni") {
    const v = x => Math.max(0, x);
    r.PS.forEach(p => {
      al += v(p.al.n);
      to += v(p.tg.n) + v(p.tc.n);
    });
    esp = r.cs.filter(x => x.p > 0).length;
  } else {
    r.T.forEach(t => {
      al += t.nAl * t.cant;
      to += t.nTo * t.cant;
      esp += [t.coc, t.cal, t.aire, t.otras].filter(x => x > 0).length * t.cant;
    });
    esp += r.circ.filter(q => q.tab === "TSG").length;
  }
  r.circ.forEach(q => {
    nCirc += r.alims[q.feeder].cant || 1;
  });
  const inter = Math.ceil(al / 2),
    p = r.pat,
    P = [];
  const sec = t => P.push({ sec: t }),
    it = (desc, und, cant, obs = "") => {
      if (cant > 0) P.push({ desc, und, cant, obs });
    };
  sec("CONDUCTORES");
  Object.keys(cond)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach(S =>
      it(`Conductor de cobre${D} de ${S} mm²`, "m", Math.ceil(cond[S] * des), `Incluye ${c.pDesp} % de desperdicio`)
    );
  sec("TUBERÍAS Y ACCESORIOS");
  Object.keys(tubo)
    .sort((a, b) => parseFloat(a) - parseFloat(b))
    .forEach(k => {
      const m = Math.ceil(tubo[k] * des);
      it(`Tubería PVC-SAP de ${tubDesc[k]}`, "m", m, "Tubos de 3 m");
      it(`Curva PVC-SAP de ${tubDesc[k]}`, "und", Math.ceil(curv[k]), "Estimado");
      it(`Unión PVC-SAP de ${tubDesc[k]}`, "und", Math.ceil(m / 3), "Una por tubo");
    });
  sec("CAJAS");
  it("Caja octogonal de fierro galvanizado 100 × 40 mm", "und", al, "Salidas de alumbrado");
  it(
    "Caja rectangular de fierro galvanizado 100 × 55 × 50 mm",
    "und",
    to + inter + esp,
    "Tomacorrientes, interruptores y salidas de fuerza"
  );
  it("Caja de pase cuadrada de fierro galvanizado 100 × 100 × 50 mm", "und", nCirc, "Estimado: una por circuito");
  sec("APARATOS");
  it("Tomacorriente doble con toma de tierra, 16 A, 250 V", "und", to);
  it("Interruptor unipolar simple, 10 A, 250 V", "und", inter, "Estimado: uno por cada 2 salidas de alumbrado");
  it("Salida de fuerza para carga especial", "und", esp, "Ducha, cocina, bomba u otra carga");
  sec("TABLEROS Y PROTECCIONES");
  Object.entries(mods).forEach(([t, v]) =>
    it(`Tablero ${t} de distribución, empotrado, para ${v.m} polos`, "und", v.n, v.desc)
  );
  Object.keys(itm)
    .sort((a, b) => {
      const x = a.split("|").map(parseFloat),
        y = b.split("|").map(parseFloat);
      return x[1] - y[1] || x[0] - y[0];
    })
    .forEach(k => {
      const [pp, i, cv, pd] = k.split("|");
      it(
        `Interruptor termomagnético ${pp}×${i} A, curva ${cv}, poder de corte ≥ ${pd} kA`,
        "und",
        itm[k],
        cv === "D" ? "Circuito de motor" : ""
      );
    });
  it("Interruptor termomagnético 2×16 A, curva C (reserva equipada)", "und", nRes, "Regla 050-108");
  Object.keys(ids)
    .sort()
    .forEach(k => {
      const [pp, i] = k.split("|");
      it(`Interruptor diferencial ${pp}×${i} A, 30 mA`, "und", ids[k], "Regla 150-400");
    });
  sec("PUESTA A TIERRA");
  it(
    `Varilla de cobre de ${fmt(p.Lv, 2)} m × ${PULG[p.dv] || fmt(p.dv * 1000, 1) + " mm"}`,
    "und",
    p.nVar,
    "Regla 060-702"
  );
  it("Conector de bronce para varilla", "und", p.nVar);
  it("Caja de registro de concreto con tapa", "und", p.nVar);
  if (p.fr < 1) it("Dosis de tratamiento del suelo (bentonita o gel)", "und", p.nVar, "Una por electrodo");
  it(
    `Conductor de cobre para puesta a tierra de ${r.Selec} mm²`,
    "m",
    Math.ceil((3 * p.nVar + 5) * des),
    "Estimado: 3 m por electrodo + 5 m al tablero"
  );
  sec("MEDICIÓN");
  if (r.mode === "uni")
    it(`Caja portamedidor y medidor de energía ${r.alims[0].s.txt}`, "und", 1, "Suministro de la concesionaria");
  else
    it(`Banco de medidores para ${r.units.length + (r.SV.length ? 1 : 0)} suministros`, "und", 1, "Norma DGE, 301.C");
  const out = [];
  let si = 0,
    ii = 0;
  P.forEach(x => {
    if (x.sec) {
      si++;
      ii = 0;
      out.push({ sec: x.sec, cod: String(si).padStart(2, "0") });
    } else {
      ii++;
      out.push({ ...x, cod: `${String(si).padStart(2, "0")}.${String(ii).padStart(2, "0")}` });
    }
  });
  return out.filter((x, i, a) => !x.sec || (a[i + 1] && !a[i + 1].sec));
}
function cardMetrado(r) {
  const M = metrado(r);
  return `<section class="card"><h2><span>Metrado de instalaciones eléctricas</span><span class="ref">Referencial</span></h2>
  <div class="tbl-wrap"><table><thead><tr><th class="t">Ítem</th><th class="t">Descripción</th><th>Und.</th><th>Cantidad</th><th class="t">Observación</th></tr></thead><tbody>
  ${M.map(x => (x.sec ? `<tr class="grp"><td colspan="5">${x.cod}  ${x.sec}</td></tr>` : `<tr><td class="t">${x.cod}</td><td class="t" style="white-space:normal">${esc(x.desc)}</td><td>${x.und}</td><td><strong>${fmt(x.cant, 0)}</strong></td><td class="t" style="white-space:normal;color:var(--muted)">${esc(x.obs)}</td></tr>`)).join("")}
  </tbody></table></div><div class="body"><p class="hint">Metrado referencial: las protecciones, tableros, cajas y aparatos salen del cálculo; las longitudes de conductores y tubos se estiman con la distancia a la salida más alejada más ${fmt(r.c.bajada, 1)} m de bajada por salida y ${fmt(r.c.pDesp, 0)} % de desperdicio. Verifique con los planos de distribución. Se incluye en la hoja «Metrado» del Excel.</p></div></section>`;
}
