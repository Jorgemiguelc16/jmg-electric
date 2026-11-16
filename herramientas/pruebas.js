/* Pruebas del cálculo sin navegador («npm test»).
   Carga en un contexto aislado de Node los archivos del motor (tablas del CNE, datos, cálculo, metrado y la
   preparación de proyectos) y, para cada caso de pruebas/casos.js, calcula el proyecto con proyectoDe() y
   calcular(), y compara el resultado completo con la referencia guardada (pruebas/referencia.js), con el mismo
   criterio que pruebas/index.html. El contexto (motor y valores por defecto) lo prepara herramientas/contexto.js. */
const vm = require("vm");
const { crearContexto } = require("./contexto.js");

const { ctx, cargar } = crearContexto();
cargar("pruebas/casos.js");
cargar("pruebas/referencia.js");

// Resultado completo de un caso, igual que resumen() de pruebas/index.html
const resumen = r =>
  vm.runInContext(
    `(r => {
      const red = (k, v) => (typeof v === "number" ? +v.toFixed(6) : v);
      const o = JSON.parse(JSON.stringify(r, red));
      delete o.PS; delete o.varios; delete o.esq; if (o.c) delete o.c.proj;
      o.metrado = JSON.parse(JSON.stringify(metrado(r), red));
      o.alertas = alertas(r);
      o.recomendaciones = recomendaciones(r).map(x => [x.tipo, x.id, x.txt]);
      return o;
    })`,
    ctx
  )(r);
/* Diferencias con la misma tolerancia que pruebas/index.html. Con --ignorar=campo1,campo2 no se cuentan esos
   campos (por ejemplo, datos nuevos agregados a propósito), para ver si cambió algún valor del cálculo. */
const IGN = new Set(
    ((process.argv.find(a => a.startsWith("--ignorar=")) || "").slice(10) || "").split(",").filter(Boolean)
  ),
  TODO = process.argv.includes("--todo");
function diferencias(a, b, ruta = "", out = []) {
  if (!TODO && out.length >= 10) return out;
  if (IGN.has(ruta.split(/[.[]/).pop().replace("]", ""))) return out;
  if (typeof a === "number" && typeof b === "number") {
    if (Math.abs(a - b) > 1e-6 * Math.max(1, Math.abs(a))) out.push([ruta, a, b]);
    return out;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    [...new Set([...Object.keys(a), ...Object.keys(b)])].forEach(k =>
      diferencias(a[k], b[k], ruta + (Array.isArray(a) ? `[${k}]` : (ruta ? "." : "") + k), out)
    );
    return out;
  }
  if (JSON.stringify(a) !== JSON.stringify(b)) out.push([ruta, a, b]);
  return out;
}

const casos = vm.runInContext("CASOS_PRUEBA", ctx),
  ref = vm.runInContext("REFERENCIA", ctx),
  t0 = Date.now();
let mal = 0;
casos.forEach(cp => {
  let d;
  try {
    const p = vm.runInContext("proyectoDe", ctx)(JSON.parse(JSON.stringify(cp.p))),
      r = vm.runInContext("calcular", ctx)(p);
    d = ref.casos[cp.id] ? diferencias(ref.casos[cp.id], resumen(r)) : [["sin referencia"]];
  } catch (e) {
    d = [["error", e.message]];
  }
  if (d.length) {
    mal++;
    console.log(`✘ ${cp.id} ${cp.tit}`);
    d.forEach(([r, a, b]) =>
      console.log(`    ${r || "(todo)"}: antes ${JSON.stringify(a)} → ahora ${JSON.stringify(b)}`)
    );
  }
});
const n = casos.length,
  s = ((Date.now() - t0) / 1000).toFixed(2);
console.log(
  mal
    ? `\n✘ ${mal} de ${n} casos con diferencias contra la referencia (${s} s)`
    : `✔ Todas las pruebas pasaron (${n} de ${n}) en ${s} s · referencia ${ref.version} del ${ref.fecha}`
);
// Cálculo con el diseño del plano (casos con las medidas calculadas a mano)
mal += require("./pruebas-calc-plano.js")(ctx);
/* Balance de fases en dos niveles: en cada caso trifásico, cada tablero secundario queda con el menor desbalance
   posible para sus circuitos (sin fases fijadas), el TG lleva el total y una fase fijada se respeta */
{
  const fallas = [],
    calc = p => vm.runInContext("calcular", ctx)(vm.runInContext("proyectoDe", ctx)(JSON.parse(JSON.stringify(p))));
  let n = 0;
  casos.forEach(cp => {
    const r = calc(cp.p);
    if (!r.bal) return;
    r.bal.tabs.forEach(t => {
      n++;
      if (t.tab === "TG" && Math.abs(t.desb - r.bal.desb) > 1e-9) fallas.push(`${cp.id} TG: no es el total`);
      if (t.tab !== "TG" && t.desb > t.desbMin + 1e-6)
        fallas.push(`${cp.id} ${t.tab}: ${t.desb.toFixed(1)} % y podría ser ${t.desbMin.toFixed(1)} %`);
    });
  });
  // Vivienda de 3 pisos con TD-1 (C6): antes TD-1 102 %, TD-2 103 % y TD-3 155 % (con una fase vacía) y el total en
  // 1.2 %; ahora cada tablero en su mínimo, con sus tres fases usadas, y el total dentro del 10 %
  const c6 = calc(casos.find(c => c.id === "C6").p),
    tb = k => c6.bal.tabs.find(t => t.tab === k);
  if (
    !(
      tb("TD-1").desb < 5 &&
      tb("TD-2").desb < 51 &&
      tb("TD-3").desb < 81 &&
      Math.min(...tb("TD-3").ph) > 0 &&
      c6.bal.desb <= 10
    )
  )
    fallas.push(
      `C6: ${c6.bal.tabs.map(t => `${t.tab} ${t.desb.toFixed(1)} %`).join(", ")} · total ${c6.bal.desb.toFixed(1)} %`
    );
  // Una fase fijada por el proyectista se respeta (y su tablero no se rota)
  const p6 = JSON.parse(JSON.stringify(casos.find(c => c.id === "C6").p)),
    q = c6.circ.find(x => x.tab === "TD-2" && !x.f3);
  p6.FIX = { uni: { [q.key]: "T" }, multi: {} };
  const f6 = calc(p6);
  if (f6.bal.items.find(x => x.key === q.key).fase !== "T") fallas.push("C6: la fase fijada no se respetó");
  if (fallas.length) {
    mal++;
    console.log("✘ Balance por tablero\n" + fallas.map(x => "    " + x).join("\n"));
  } else console.log(`✔ Balance por tablero: ${n} tableros en el menor desbalance posible; fase fijada respetada`);
}
/* Edificio: esquema del banco de medidores y del TSG (criterio del proyectista). Por defecto (banco junto al TG y TSG
   con medidor en el banco) el cálculo no cambia: lo verifica la referencia. Banco lejos: alimentador TG → banco con la
   demanda de los departamentos y de los servicios, que los departamentos y el TSG acumulan; TSG desde el TG: sale del
   TG y no carga el tramo al banco; medidor trifásico en un tipo: su alimentador y su unidad son trifásicos. */
{
  const fallas = [],
    calc = p => vm.runInContext("calcular", ctx)(vm.runInContext("proyectoDe", ctx)(JSON.parse(JSON.stringify(p)))),
    base = casos.find(c => c.id === "C7").p,
    cerca = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a));
  const r0 = calc(base),
    r1 = calc({ ...base, bmJunto: "0", Lbm: "25" }),
    g1 = r1.alims[0],
    b1 = r1.alims.find(a => a.pKey === "bm"),
    s1 = r1.alims.find(a => a.pKey === "servP"),
    d1 = r1.alims.filter(a => a.pKey === "tipo");
  if (r0.alims.some(a => a.pKey === "bm") || r0.topo) fallas.push("por defecto no debe haber tramo TG → banco");
  // Diámetro máximo de la tubería TG → banco: 50 mm por defecto; más pequeño, las mismas fases en más tuberías
  const r0b = calc({ ...base, tgbmMax: "25" });
  if (!r0.tgbm || r0.tgbm.max !== 50) fallas.push("tubería TG → banco: por defecto debe ser hasta Ø50 mm");
  else if (
    !r0b.tgbm ||
    r0b.tgbm.max !== 25 ||
    r0b.tgbm.n !== r0.tgbm.n ||
    r0b.tgbm.tubos.length < r0.tgbm.tubos.length ||
    r0b.tgbm.tubos.some(t => t.mm > 25)
  )
    fallas.push("tubería TG → banco: el diámetro máximo editable no se respeta");
  if (!b1) fallas.push("banco lejos: falta el alimentador TG → banco");
  else {
    if (!cerca(b1.P, r1.mdDeptos + r1.aireTot + r1.mdServ)) fallas.push(`TG → banco: demanda ${b1.P}`);
    if (b1.L !== 25 || !cerca(b1.dvUp, g1.dVp)) fallas.push("TG → banco: longitud o caída de tensión de arriba");
    if (!d1.every(a => cerca(a.dvUp, b1.dvAc)))
      fallas.push("los departamentos no acumulan la caída del tramo al banco");
    if (!cerca(s1.dvUp, b1.dvAc) || !/banco de medidores → tablero de servicios/.test(s1.desc))
      fallas.push("el TSG con medidor en el banco no sale del banco");
    if (!(d1[0].dvAc > r0.alims.find(a => a.pKey === "tipo").dvAc))
      fallas.push("la caída de los departamentos no subió");
    if (r1.tabs.some(t => r1.alims[t.feeder].pKey === "bm")) fallas.push("un tablero apunta al tramo TG → banco");
    if (r1.alims[r1.tabs.find(t => t.tab === "TSG").feeder] !== s1) fallas.push("el TSG no apunta a su alimentador");
  }
  const r2 = calc({ ...base, bmJunto: "0", Lbm: "25", tsgDe: "tg" }),
    b2 = r2.alims.find(a => a.pKey === "bm"),
    s2 = r2.alims.find(a => a.pKey === "servP");
  if (!b2 || !cerca(b2.P, r2.mdDeptos + r2.aireTot))
    fallas.push("TSG desde el TG: el tramo al banco no lleva sus servicios");
  if (!cerca(s2.dvUp, r2.alims[0].dVp) || !/TG → tablero de servicios/.test(s2.desc))
    fallas.push("TSG desde el TG: no sale del TG");
  if (!r2.topo || !r2.topo.tsgTG) fallas.push("TSG desde el TG: falta el esquema en el resultado");
  // Medidor trifásico en el primer tipo
  const p3 = JSON.parse(JSON.stringify(base));
  p3.tipos[0].fases = "3";
  const r3 = calc(p3),
    a3 = r3.alims.find(a => a.pKey === "tipo" && r3.T[a.ti]._i === 0),
    u3 = r3.units.filter(u => r3.T[u.ti]._i === 0);
  if (!a3.s.tri || !u3.every(u => u.f3)) fallas.push("medidor trifásico: el alimentador o la unidad no son trifásicos");
  if (!r3.bal.items.filter(x => x.ti != null && r3.T[x.ti]._i === 0).every(x => x.fase === "3φ"))
    fallas.push("medidor trifásico: en el balance no va en las tres fases");
  if (fallas.length) {
    mal++;
    console.log("✘ Edificio: banco de medidores y TSG" + fallas.map(x => "\n    " + x).join(""));
  } else
    console.log(
      `✔ Edificio: banco junto al TG sin cambios; banco lejos (+${b1.dVp.toFixed(2)} % de caída), TSG desde el TG y medidor trifásico`
    );
}
process.exit(mal ? 1 : 0);
