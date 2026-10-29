/* Chrome sin ventana para las pruebas que necesitan el navegador (herramientas/pruebas-ui.mjs y
   herramientas/pruebas-excel.mjs): lo abre con el protocolo DevTools, carga index.html y espera a que la plataforma
   esté lista. Chrome se busca en la ruta habitual de Windows; otra ruta se indica con la variable CHROME. */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
export const esperar = ms => new Promise(r => setTimeout(r, ms));

export async function abrirApp() {
  const CHROME =
    process.env.CHROME ||
    [
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
    ].find(existsSync);
  if (!CHROME) {
    console.log("No se encontró Chrome ni Edge; indique la ruta con la variable CHROME.");
    process.exit(1);
  }
  const PUERTO = 9400 + Math.floor(Math.random() * 400),
    perfil = mkdtempSync(join(tmpdir(), "jmg-ui-")),
    nav = spawn(CHROME, [
      "--headless=new",
      `--remote-debugging-port=${PUERTO}`,
      `--user-data-dir=${perfil}`,
      "--no-first-run",
      "--window-size=1366,768",
      "about:blank"
    ]);
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
  // Evalúa en la página; un error de la página hace fallar la prueba
  const ev = async expr => {
    const r = await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result.exceptionDetails)
      throw new Error("error en la página: " + (r.result.exceptionDetails.exception?.description || "").split("\n")[0]);
    return r.result.result?.value;
  };
  const J = async expr => JSON.parse(await ev(`JSON.stringify(${expr})`));
  // Carga la plataforma
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await cdp("Page.navigate", { url: pathToFileURL(join(raiz, "index.html")).href });
  for (let i = 0; i < 80; i++) {
    await esperar(250);
    try {
      if (await ev("typeof cargarEjemplo === 'function' && document.readyState === 'complete'")) break;
    } catch (e) {}
  }
  const cerrar = () => {
    try {
      ws.close();
    } catch (e) {}
    nav.kill();
    try {
      rmSync(perfil, { recursive: true, force: true });
    } catch (e) {}
  };
  return { cdp, ev, J, cerrar };
}
