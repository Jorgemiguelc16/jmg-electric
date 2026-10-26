/* Capturas de las pantallas de la plataforma, para comprobar que un cambio de estilos no cambia nada a la vista
   («npm run capturas -- carpeta» toma las capturas; «npm run capturas -- carpeta otra» además las compara con las
   de otra carpeta, píxel por píxel). Recorre la pantalla de ingreso, el inicio y las páginas, cada vista de
   resultados, cada pestaña de la cinta y cada ventana, en tema claro y oscuro. */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), ".."),
  dest = resolve(process.argv[2] || join(tmpdir(), "jmg-capturas")),
  otra = process.argv[3] ? resolve(process.argv[3]) : null;
mkdirSync(dest, { recursive: true });
const CHROME =
  process.env.CHROME ||
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
  ].find(existsSync);
const PUERTO = 9800 + Math.floor(Math.random() * 150),
  perfil = mkdtempSync(join(tmpdir(), "jmg-cap-")),
  nav = spawn(CHROME, [
    "--headless=new",
    `--remote-debugging-port=${PUERTO}`,
    `--user-data-dir=${perfil}`,
    "--no-first-run",
    "--hide-scrollbars",
    "about:blank"
  ]);
const esperar = ms => new Promise(r => setTimeout(r, ms));
let ws;
for (let i = 0; i < 60 && !ws; i++) {
  await esperar(250);
  try {
    const t = await (await fetch(`http://127.0.0.1:${PUERTO}/json/new?about:blank`, { method: "PUT" })).json();
    ws = new WebSocket(t.webSocketDebuggerUrl);
  } catch (e) {}
}
await new Promise(r => (ws.onopen = r));
let id = 0;
const pend = {};
ws.onmessage = m => {
  const d = JSON.parse(m.data);
  if (d.id && pend[d.id]) pend[d.id](d);
};
const cdp = (method, params = {}) =>
  new Promise(r => {
    pend[++id] = r;
    ws.send(JSON.stringify({ id, method, params }));
  });
const ev = async expr => {
  const r = await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description?.split("\n")[0]);
  return r.result.result?.value;
};
let n = 0;
async function foto(nombre) {
  await esperar(350);
  const r = await cdp("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(dest, `${String(++n).padStart(2, "0")}-${nombre}.png`), Buffer.from(r.result.data, "base64"));
}
await cdp("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
// Sin animaciones ni cursor que parpadea, para que dos capturas iguales sean idénticas
await cdp("Page.navigate", { url: pathToFileURL(join(raiz, "index.html")).href });
for (let i = 0; i < 80; i++) {
  await esperar(250);
  try {
    if (await ev("typeof cargarEjemplo === 'function' && document.readyState === 'complete'")) break;
  } catch (e) {}
}
await ev(
  "(() => { const s = document.createElement('style'); s.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}.toast,.tipbox{display:none!important}'; document.head.appendChild(s); })()"
);
await esperar(1500);
await foto("ingreso");
await ev(`(() => {
  try { Object.keys(localStorage).filter(k => k.startsWith("jmg-electric-")).forEach(k => localStorage.removeItem(k)); } catch (e) {}
  document.body.classList.remove("sin-acceso", "wl-open");
  document.querySelectorAll(".welcome, #acceso").forEach(x => (x.hidden = true));
})()`);
const tema = t => ev(`document.documentElement.dataset.theme = ${JSON.stringify(t)}`);
for (const t of ["light", "dark"]) {
  await tema(t);
  for (const p of ["inicio", "proy", "herr", "normas", "guia", "novedades", "soporte", "acerca", "ajustes"]) {
    await ev(`setTab(${JSON.stringify(p)}); scrollTo(0, 0)`);
    await foto(`${t}-pagina-${p}`);
  }
}
await tema("light");
await ev(
  "cargarEjemplo('uni'); document.body.classList.remove('sin-acceso', 'wl-open'); document.querySelectorAll('.welcome, #acceso').forEach(x => (x.hidden = true))"
);
// La primera vista tras cargar el ejemplo necesita un momento más para terminar de dibujarse
await esperar(1500);
for (const v of ["resumen", "demanda", "alims", "cuadro", "balance", "unifilar", "metrado", "verif"]) {
  await ev(`verVista(${JSON.stringify(v)})`);
  await foto(`vista-${v}`);
}
for (const r of ["archivo", "proyecto", "cargas", "param", "resultados", "unifilar", "herr", "ayuda"]) {
  await ev(`document.querySelector('[data-tab-r=${r}]').click()`);
  await foto(`cinta-${r}`);
}
await ev(
  "document.querySelector('[data-tab-r=proyecto]').click(); verVista('cuadro'); selNode('circ:TG·C-6'); document.querySelector('[data-pane=right]')?.click()"
);
await foto("panel-derecho");
const ventana = async (abrir, nombre, cerrar) => {
  await ev(abrir);
  await foto(nombre);
  await ev(cerrar);
};
await ventana("cuadroCond(true)", "ventana-conductores", "cuadroCond(false)");
await ventana("fichaCirc('TG·C-6')", "ventana-ficha", "cerrarFicha()");
await ventana("fichaTablero('TG')", "ventana-tablero", "cerrarTablero()");
await ventana("tablaCargas('cargas')", "ventana-editor", "cerrarTabla()");
await ventana("parametros(true)", "ventana-parametros", "parametros(false)");
for (const t of ["proy", "sum", "viv", "sal", "pis"])
  await ventana(`datosProyecto(true, '${t}')`, `ventana-datos-${t}`, "datosProyecto(false)");
await tema("dark");
await ev("verVista('cuadro')");
await foto("oscuro-cuadro");
await ventana("fichaCirc('TG·C-6')", "oscuro-ficha", "cerrarFicha()");
await tema("light");
await ev(
  "cargarEjemplo('multi'); document.body.classList.remove('sin-acceso', 'wl-open'); document.querySelectorAll('.welcome, #acceso').forEach(x => (x.hidden = true)); verVista('unifilar')"
);
await foto("edificio-unifilar");
await ventana("datosProyecto(true, 'dep')", "ventana-departamentos", "datosProyecto(false)");
await ventana("tablaCargas('cargasT')", "ventana-editor-edificio", "cerrarTabla()");
console.log(`${n} capturas en ${dest}`);

// Comparación píxel por píxel con otra carpeta (en el mismo navegador, con un lienzo)
if (otra) {
  const fotos = readdirSync(dest).filter(f => f.endsWith(".png")),
    distintas = [];
  for (const f of fotos) {
    if (!existsSync(join(otra, f))) {
      distintas.push(`${f}: no está en ${otra}`);
      continue;
    }
    const a = readFileSync(join(dest, f)),
      b = readFileSync(join(otra, f));
    if (a.equals(b)) continue;
    const px = await ev(`(async () => {
      const img = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = "data:image/png;base64," + s; });
      const [x, y] = await Promise.all([img(${JSON.stringify(a.toString("base64"))}), img(${JSON.stringify(b.toString("base64"))})]);
      const c = document.createElement("canvas"); c.width = x.width; c.height = x.height;
      const g = c.getContext("2d"); g.drawImage(x, 0, 0); const d1 = g.getImageData(0, 0, c.width, c.height).data;
      g.clearRect(0, 0, c.width, c.height); g.drawImage(y, 0, 0); const d2 = g.getImageData(0, 0, c.width, c.height).data;
      let n = 0; for (let i = 0; i < d1.length; i += 4) if (d1[i] !== d2[i] || d1[i+1] !== d2[i+1] || d1[i+2] !== d2[i+2]) n++;
      return n;
    })()`);
    if (px) distintas.push(`${f}: ${px} píxeles distintos`);
  }
  console.log(
    distintas.length
      ? `✘ ${distintas.length} capturas distintas:\n  ${distintas.join("\n  ")}`
      : `✔ Las ${fotos.length} capturas son idénticas`
  );
}
nav.kill();
try {
  rmSync(perfil, { recursive: true, force: true });
} catch (e) {}
process.exit(0);
