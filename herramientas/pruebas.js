/* Pruebas del cálculo sin navegador («npm test»).
   Carga en un contexto aislado de Node los archivos del motor (tablas del CNE, datos, cálculo, metrado y la
   preparación de proyectos) y, para cada caso de pruebas/casos.js, calcula el proyecto con proyectoDe() y
   calcular(), y compara el resultado completo con la referencia guardada (pruebas/referencia.js), con el mismo
   criterio que pruebas/index.html. El motor ya no lee la pantalla; la página se reemplaza por un objeto vacío
   que acepta todo, solo para que esos archivos puedan cargarse. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const raiz = path.join(__dirname, "..");
// Objeto que acepta cualquier uso (document.getElementById(...).addEventListener(...), etc.) y no hace nada
const nada = new Proxy(function () {}, {
  get: (t, k) => (k === Symbol.toPrimitive ? () => "" : k === "length" ? 0 : nada),
  apply: () => nada,
  construct: () => nada,
  set: () => true
});
const ctx = vm.createContext({
  console,
  document: nada,
  window: nada,
  navigator: nada,
  location: nada,
  localStorage: nada,
  sessionStorage: nada,
  addEventListener: () => {},
  setTimeout: () => 0,
  clearTimeout: () => {},
  requestAnimationFrame: () => 0,
  getComputedStyle: () => nada,
  matchMedia: () => nada,
  innerWidth: 1366,
  innerHeight: 768,
  ResizeObserver: undefined
});
const cargar = f => vm.runInContext(fs.readFileSync(path.join(raiz, f), "utf8"), ctx, { filename: f });
// Archivos del motor, en el orden de index.html
[
  "js/tablas-cne.js",
  "js/textos.js",
  "js/datos.js",
  "js/calculo.js",
  "js/resultados.js",
  "js/metrado.js",
  "js/proyectos.js"
].forEach(cargar);
/* Valores por defecto de cada dato: en el navegador DEFV se lee de los campos de index.html al cargar la página;
   aquí se leen del mismo HTML (atributo value de los campos y opción elegida de las listas) */
const html = fs.readFileSync(path.join(raiz, "index.html"), "utf8"),
  defv = {};
for (const m of html.matchAll(/<input\b[^>]*>/g)) {
  const id = (m[0].match(/\bid="([^"]+)"/) || [])[1];
  if (id) defv[id] = (m[0].match(/\bvalue="([^"]*)"/) || [, ""])[1];
}
for (const m of html.matchAll(/<select\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
  const ops = [...m[2].matchAll(/<option\b([^>]*)>([^<]*)/g)].map(o => [
    o[1],
    (o[1].match(/value="([^"]*)"/) || [, o[2]])[1]
  ]);
  defv[m[1]] = (ops.find(o => /\bselected\b/.test(o[0])) || ops[0] || [, ""])[1];
}
vm.runInContext("KEYS", ctx).forEach(k => (vm.runInContext("DEFV", ctx)[k] = defv[k] ?? ""));
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
// Diferencias con la misma tolerancia que pruebas/index.html
function diferencias(a, b, ruta = "", out = []) {
  if (out.length >= 10) return out;
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
process.exit(mal ? 1 : 0);
