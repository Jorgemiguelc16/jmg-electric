/* METRADO
   Cantidades de materiales (conductores, tubos, cajas, interruptores, tableros) a partir del resultado. */
const PULG = { 0.0127: '1/2"', 0.0159: '5/8"', 0.0191: '3/4"' };
/* Tramos verticales de un circuito (m), con las alturas de montaje (Parámetros › Alturas; mismas salidas que el
   diagrama de alturas, js/alturas.js): la salida del tablero (desde su borde superior) al techo o al piso, y
   - por el techo (alumbrado, emergencia, aire, interfono): una bajada por salida, techo − altura; en el alumbrado,
     una por interruptor (uno por cada 2 salidas, como en las cajas), porque el centro de luz está en la losa;
   - por el piso (tomacorrientes, terma y fuerza): en cada salida el tubo sube y vuelve a bajar, y en la última
     solo sube: (2n − 1) × altura. */
function tramoVertical(q, c) {
  const A = c.alt,
    T = A.techo,
    t = `${q.tipo} ${q.desc}`.toLowerCase(),
    n = Math.max(1, q.n || 0);
  const techo = (k, h) => Math.max(0, T - A.tab) + k * Math.max(0, T - h),
    piso = h => A.tab + (2 * n - 1) * h;
  if (/emergencia/.test(t)) return techo(n, A.braq);
  if (/alumbrado|iluminaci/.test(t)) return techo(Math.ceil(n / 2), A.int);
  if (/tomacorriente/.test(t)) return piso(/cocina|lavander/.test(t) ? A.tomaC : A.toma);
  if (/calentador|ducha|terma/.test(t)) return piso(A.terma);
  if (/aire acondicionado/.test(t)) return techo(n, A.aire);
  if (/intercomunicador|portero/.test(t)) return techo(n, A.int);
  return piso(A.fza);
}
function metrado(r) {
  const c = r.c,
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
      Lr = q.L + tramoVertical(q, c);
    add(cond, q.S, (q.f3 ? 3 : 2) * Lr * n);
    add(cond, q.St, Lr * n);
    add(tubo, tk(q.tubo), Lr * n);
    add(curv, tk(q.tubo), q.n * n);
    tubDesc[tk(q.tubo)] = tl(q.tubo);
    const tb = r.tabs.find(t => t.tab === q.tab);
    add(itm, `${q.f3 ? 3 : 2}|${q.itm}|${q.curva}|${tb.pdc}`, n);
  });
  const eqm = {};
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
      add(ids, `${pol}|${q.idRat}|${q.idTipo || "A"}`, n);
    });
    const tri = r.alims[tb.feeder].s.tri;
    equiposDe(tb.tab).forEach(([k, d]) => {
      add(eqm, `${k === "ctr" ? (tri ? 3 : 2) : tri ? 4 : 2}|${d.d(tri)}`, n);
      m += k === "dps" ? (tri ? 4 : 2) : k === "med" ? (tri ? 4 : 2) : 2;
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
      esp += t.nEsp * t.cant;
    });
    esp += r.circ.filter(q => q.tab === "TSG").length;
  }
  r.circ.forEach(q => {
    nCirc += r.alims[q.feeder].cant || 1;
  });
  const inter = Math.ceil(al / 2),
    p = r.pat,
    P = [];
  /* Partidas de la Norma Técnica «Metrados para Obras de Edificación y Habilitaciones Urbanas» (R.D. N.° 073-2010-
     VIVIENDA/VMCS-DNC), título OE.5. El metrado es neto: el desperdicio se informa para el análisis de precios. */
  let pc = "",
    pi = 0;
  const sec = (cod, t) => {
      pc = cod;
      pi = 0;
      P.push({ sec: t, cod });
    },
    it = (desc, und, cant, obs = "", cod = "") => {
      if (cant > 0) P.push({ desc, und, cant, obs, cod: cod || `${pc}.${++pi}` });
    };
  sec("OE.5.1", "CONEXIÓN A LA RED EXTERNA DE MEDIDORES");
  if (r.mode === "uni")
    it(
      `Conexión a la red externa: caja portamedidor y medidor de energía ${r.alims[0].s.txt}`,
      "Glb.",
      1,
      "Por lo general la ejecuta la concesionaria"
    );
  else
    it(
      `Conexión a la red externa: banco de medidores para ${r.units.length + (r.SV.length ? 1 : 0)} suministros`,
      "Glb.",
      1,
      "Norma DGE, 301.C"
    );
  sec("OE.5.2.1", "SALIDAS");
  it("Salida para alumbrado: caja octogonal de fierro galvanizado 100 × 40 mm", "Und.", al);
  it("Salida para tomacorrientes: caja rectangular de fierro galvanizado 100 × 55 × 50 mm", "Und.", to);
  it(
    "Salida para interruptores: caja rectangular de fierro galvanizado 100 × 55 × 50 mm",
    "Und.",
    inter,
    "Estimado: una por cada 2 salidas de alumbrado"
  );
  it(
    "Salida de fuerza para carga especial: caja rectangular de fierro galvanizado 100 × 55 × 50 mm",
    "Und.",
    esp,
    "Ducha, cocina, bomba u otra carga"
  );
  it("Caja de paso cuadrada de fierro galvanizado 100 × 100 × 50 mm", "Und.", nCirc, "Estimado: una por circuito");
  sec("OE.5.2.2", "CANALIZACIONES, CONDUCTOS O TUBERÍAS");
  Object.keys(tubo)
    .sort((a, b) => parseFloat(a) - parseFloat(b))
    .forEach(k => {
      const m = Math.ceil(tubo[k]);
      it(
        `Tubería PVC-SAP de ${tubDesc[k]}`,
        "m",
        m,
        `Incluye accesorios: ${Math.ceil(curv[k])} curvas y ${Math.ceil(m / 3)} uniones (estimado, tubos de 3 m)`
      );
    });
  sec("OE.5.2.3", "CONDUCTORES Y CABLES DE ENERGÍA EN TUBERÍAS");
  Object.keys(cond)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach(S =>
      it(`Conductor de cobre${D} de ${S} mm²`, "m", Math.ceil(cond[S]), "Metros de tubería × número de conductores")
    );
  // Tablero principal: el general de cada suministro (TG de la vivienda; TSG y tablero de cada departamento)
  const tabPrin = t => r.mode !== "uni" || t === "TG";
  [
    ["OE.5.2.6", "TABLEROS PRINCIPALES", true],
    ["OE.5.2.7", "TABLEROS DE DISTRIBUCIÓN", false]
  ].forEach(([cod, tit, pr]) => {
    sec(cod, tit);
    Object.entries(mods)
      .filter(([t]) => tabPrin(t) === pr)
      .forEach(([t, v]) => it(`Tablero ${t}, empotrado, para ${v.m} polos`, "Und.", v.n, v.desc));
  });
  sec("OE.5.2.8", "DISPOSITIVOS DE MANIOBRA Y PROTECCIÓN");
  const POLOS = { 1: "unipolares", 2: "bipolares", 3: "tripolares", 4: "tetrapolares" },
    dis = [];
  Object.keys(itm).forEach(k => {
    const [pp, i, cv, pd] = k.split("|");
    dis.push([
      +pp,
      0,
      +i,
      `Interruptor termomagnético ${pp}×${i} A, curva ${cv}, poder de corte ≥ ${pd} kA`,
      itm[k],
      cv === "D" ? "Circuito de motor" : ""
    ]);
  });
  if (nRes)
    dis.push([2, 0, 16, "Interruptor termomagnético 2×16 A, curva C (reserva equipada)", nRes, "Regla 050-108"]);
  Object.keys(ids).forEach(k => {
    const [pp, i, tp] = k.split("|");
    dis.push([+pp, 1, +i, `Interruptor diferencial ${pp}×${i} A, 30 mA, tipo ${tp}`, ids[k], "Regla 150-400"]);
  });
  Object.entries(eqm).forEach(([k, n]) => {
    const [pp, dsc] = k.split("|");
    dis.push([+pp, 2, 0, dsc, n, "Equipo adicional del tablero · criterio del proyectista"]);
  });
  const nPol = {};
  dis
    .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || a[3].localeCompare(b[3]))
    .forEach(([pp, , , dsc, n, obs]) => {
      nPol[pp] = (nPol[pp] || 0) + 1;
      it(`Dispositivos ${POLOS[pp]}: ${dsc}`, "Und.", n, obs, `OE.5.2.8.${pp}.${nPol[pp]}`);
    });
  sec("OE.5.4", "INSTALACIÓN DEL SISTEMA DE PUESTA A TIERRA");
  // Materiales del pozo (Parámetros › Tierra y metrado); el tratamiento solo si el factor es menor que 1
  const pz = c.pozo,
    tq = [
      pz.sal ? `${fmt(pz.sal, 0)} kg de sal industrial` : "",
      pz.carb ? `${fmt(pz.carb, 0)} kg de carbón vegetal` : ""
    ]
      .filter(Boolean)
      .join(" y "),
    trat = p.fr < 1 ? (tq ? ` tratada con ${tq}` : ", tratamiento del suelo (bentonita o gel)") : "";
  it(
    `Pozo de puesta a tierra con varilla de cobre de ${fmt(p.Lv, 2)} m × ${PULG[p.dv] || fmt(p.dv * 1000, 1) + " mm"}, conector de bronce tipo Anderson, caja de registro de concreto${pz.tapa ? ` con tapa de ${fmt(pz.tapa, 2)} × ${fmt(pz.tapa, 2)} × ${fmt(pz.tapaE, 2)} m` : " con tapa"}${pz.tierra ? `, relleno de ${fmt(pz.tierra, 1)} m³ de tierra negra cernida` : ""}${trat} y conductor desnudo de cobre de ${r.Selec} mm² al tablero`,
    "Und.",
    p.nVar,
    `Regla 060-702. Conductor: ${Math.ceil(pz.cond + 3 * (p.nVar - 1))} m en total (${fmt(pz.cond, 0)} m al tablero${p.nVar > 1 ? ` + 3 m por cada varilla adicional` : ""})${pz.pvc ? `; tubo PVC de protección: ${fmt(pz.pvc, 0)} m` : ""}. Materiales por pozo, criterio de diseño`
  );
  sec("C", "COMPLEMENTOS (NO CODIFICADOS EN LA NORMA)");
  it("Tomacorriente doble con toma de tierra, 16 A, 250 V", "Und.", to);
  it("Interruptor unipolar simple, 10 A, 250 V", "Und.", inter, "Estimado: uno por cada 2 salidas de alumbrado");
  return P.filter((x, i, a) => !x.sec || (a[i + 1] && !a[i + 1].sec));
}
function cardMetrado(r) {
  const M = metrado(r);
  return `<section class="card"><h2><span>Metrado de instalaciones eléctricas</span><span class="ref">Referencial</span></h2>
  <div class="tbl-wrap"><table><thead><tr><th class="t">Ítem</th><th class="t">Descripción</th><th>Und.</th><th>Cantidad</th><th class="t">Observación</th></tr></thead><tbody>
  ${M.map(x => (x.sec ? `<tr class="grp"><td colspan="5">${x.cod}  ${x.sec}</td></tr>` : `<tr><td class="t">${x.cod}</td><td class="t" style="white-space:normal">${esc(x.desc)}</td><td>${x.und}</td><td><strong>${fmt(x.cant, 0)}</strong></td><td class="t" style="white-space:normal;color:var(--muted)">${esc(x.obs)}</td></tr>`)).join("")}
  </tbody></table></div><div class="body"><p class="hint">Metrado referencial ordenado por las partidas de la Norma Técnica de Metrados (R.D. N.° 073-2010-VIVIENDA, título OE.5). Las protecciones, tableros y salidas salen del cálculo; las longitudes de conductores y tubos suman la distancia a la salida más alejada y los tramos verticales según las alturas de montaje (Parámetros › Alturas): del tablero al techo o al piso, una bajada por interruptor o salida alta y, en las salidas por el piso, una subida y una bajada por salida. Las cantidades son netas: el desperdicio (${fmt(r.c.pDesp, 0)} %) se aplica en el análisis de precios. Verifique con los planos de distribución. Se incluye en la hoja «Metrado» del Excel.</p></div></section>`;
}
