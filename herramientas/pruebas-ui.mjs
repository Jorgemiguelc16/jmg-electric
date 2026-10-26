/* Pruebas de la interfaz («npm run pruebas-ui»), solo para desarrollo.
   Abre index.html en Chrome sin ventana (protocolo DevTools), entra sin cuenta y recorre las ventanas como lo
   haría un usuario: abrir, editar, vista previa, aplicar, cancelar, deshacer, doble clic. Cada prueba verifica
   el resultado esperado; al final muestra cuáles pasaron. Las pruebas del cálculo son «npm test».
   Chrome se busca en la ruta habitual de Windows; otra ruta se indica con la variable CHROME. */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
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
// Evalúa en la página; un error de la página hace fallar la prueba
const ev = async expr => {
  const r = await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result.exceptionDetails)
    throw new Error("error en la página: " + (r.result.exceptionDetails.exception?.description || "").split("\n")[0]);
  return r.result.result?.value;
};
const J = async expr => JSON.parse(await ev(`JSON.stringify(${expr})`));
const poner = (sel, v) =>
  ev(
    `(el => { el.focus(); el.value = ${JSON.stringify(String(v))}; el.dispatchEvent(new Event("input", {bubbles:true})); el.dispatchEvent(new Event("change", {bubbles:true})); })(document.querySelector(${JSON.stringify(sel)}))`
  );
const clic = sel => ev(`document.querySelector(${JSON.stringify(sel)}).click()`);
const raton = (type, x, y, n = 1) =>
  cdp("Input.dispatchMouseEvent", {
    type,
    x,
    y,
    button: "left",
    buttons: type === "mouseReleased" ? 0 : 1,
    clickCount: n
  });
async function dobleClic(sel) {
  const r = await J(`document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect()`);
  const x = r.x + Math.min(30, r.width / 2),
    y = r.y + r.height / 2;
  for (const n of [1, 2]) {
    await raton("mousePressed", x, y, n);
    await raton("mouseReleased", x, y, n);
  }
  await esperar(250);
}
const tecla = (key, code, k) => cdp("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: k });
// El historial (deshacer) agrupa los cambios de medio segundo: se espera antes de deshacer
const deshacer = async (n = 1) => {
  await esperar(700);
  for (let i = 0; i < n; i++) await ev("histGo(-1)");
};

// Carga la plataforma y entra sin cuenta (el acceso con cuenta no interviene en estas pruebas)
await cdp("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
await cdp("Page.navigate", { url: pathToFileURL(join(raiz, "index.html")).href });
for (let i = 0; i < 80; i++) {
  await esperar(250);
  try {
    if (await ev("typeof cargarEjemplo === 'function' && document.readyState === 'complete'")) break;
  } catch (e) {}
}
// Carga un ejemplo y espera a que el historial lo registre (agrupa los cambios de medio segundo)
const ejemplo = async m => {
  const r = await ev(`(() => {
    document.querySelectorAll(".welcome").forEach(x => (x.hidden = true));
    try { Object.keys(localStorage).filter(k => k.startsWith("jmg-electric-")).forEach(k => localStorage.removeItem(k)); } catch (e) {}
    cargarEjemplo(${JSON.stringify(m)});
    document.body.classList.remove("sin-acceso", "wl-open");
    document.querySelectorAll(".welcome, #acceso").forEach(x => (x.hidden = true));
    return !!LAST;
  })()`);
  await esperar(700);
  return r;
};

// Pruebas: cada una recibe ok(condición, descripción)
const PRUEBAS = [];
const prueba = (nombre, fn) => PRUEBAS.push([nombre, fn]);

prueba("La cinta tiene sus 8 pestañas y solo 6 menús ▾", async ok => {
  await ejemplo("uni");
  ok((await ev("document.querySelectorAll('.ap-ribbon > .rib').length")) === 8, "8 pestañas");
  ok((await ev("document.querySelectorAll('.ap-ribbon .mc-caret').length")) === 6, "6 menús ▾");
  ok(await ev("document.querySelector('#ws .ap-right').hidden"), "panel derecho cerrado por defecto");
});

prueba("Cuadro de conductores: vista previa, cancelar y aplicar", async ok => {
  await ejemplo("uni");
  await ev("cuadroCond(true)");
  const dv0 = await ev("LAST.circ.find(q => /Ducha/.test(q.desc)).dVt");
  await ev(
    "(s => { s.value = s.options[2].value; s.dispatchEvent(new Event('change', {bubbles:true})); })(document.querySelector('#cdBody select'))"
  );
  const fila = await ev("document.querySelector('#cdBody tr:nth-child(2)').cells[6].textContent");
  ok(fila === "0.37", `ΔV del alimentador en la vista previa 0.37 % (dio ${fila})`);
  ok((await ev("LAST.alims[0].S")) === 16, "el proyecto sigue con 16 mm²");
  await clic('#condDlg [data-cd="cancel"].vw-btn');
  ok((await J("SECF.uni")) && !Object.keys(await J("SECF.uni")).length, "cancelar no cambia las secciones");
  await ev("cuadroCond(true)");
  await ev(
    "(s => { s.value = s.options[2].value; s.dispatchEvent(new Event('change', {bubbles:true})); })(document.querySelector('#cdBody select'))"
  );
  await clic('#condDlg [data-cd="ok"]');
  ok((await ev("LAST.alims[0].S")) === 35, "aplicado: alimentador de 35 mm²");
  ok((await ev("LAST.circ.find(q => /Ducha/.test(q.desc)).dVt")) < dv0, "baja la ΔV de los circuitos aguas abajo");
});

prueba("Ficha del circuito: vista previa, fase, aplicar y deshacer", async ok => {
  await ejemplo("uni");
  await ev(
    "document.querySelector('input[name=sist][value=tri380]').checked = true; document.querySelector('input[name=sist][value=tri380]').dispatchEvent(new Event('change', {bubbles:true})); calcularAhora(); fichaCirc('TG·C-6')"
  );
  await poner('[data-fce="L"]', 60);
  await esperar(400);
  ok(/2-1×10 mm²/.test(await ev("$('fcRes').textContent")), "vista previa con 10 mm² a 60 m");
  ok((await J("[cargas[0].L, LAST.circ.find(q => q.key === 'TG·C-6').S]")).join() === "12,4", "el proyecto no cambia");
  await poner('[data-fce="_fase"]', "T");
  await clic("#fichaDlg [data-fc=apply]");
  const q = await J("LAST.circ.find(q => q.key === FC_KEY)");
  ok(q.L === 60 && q.S === 10 && q.fase === "T", "aplicado: 60 m, 10 mm² y fase T");
  await ev("cerrarFicha()");
  await deshacer();
  const u = await J("({L: cargas[0].L, fix: FIX.uni, hist: HIST.length, sist: radio('sist')})");
  ok(u.L === 12 && !Object.keys(u.fix).length, "deshacer vuelve a 12 m y fase automática " + JSON.stringify(u));
});

prueba("Doble clic abre las fichas (explorador y cuadro de cargas)", async ok => {
  await ejemplo("uni");
  await ev("verVista('cuadro')");
  await dobleClic('#exTree [data-node="circ:TG·C-7"]');
  ok(/C-7/.test(await ev("$('fichaDlg').hidden ? '' : $('fcT').textContent")), "explorador → ficha del circuito");
  await ev("cerrarFicha()");
  await dobleClic("#results tr[data-ficha]");
  ok(!(await ev("$('fichaDlg').hidden")), "fila del cuadro → ficha del circuito");
  await ev("cerrarFicha()");
  await dobleClic("#results tr[data-fichatab]");
  ok(/TG/.test(await ev("$('ftDlg').hidden ? '' : $('ftT').textContent")), "franja del tablero → ficha del tablero");
  await tecla("Escape", "Escape", 27);
  ok(await ev("$('ftDlg').hidden"), "Esc cierra la ficha del tablero");
});

prueba("Ficha del tablero: longitud con vista previa y equipos", async ok => {
  await ejemplo("multi");
  const tA = await ev("LAST.circ.find(q => q.src && q.src.t === 'tipo' && q.src.i === 0).tab");
  await ev(`fichaTablero('${tA}')`);
  await poner("[data-ftl]", 80);
  await esperar(500);
  ok(/2-1×16/.test(await ev("$('ftBody').textContent")), "vista previa: alimentador de 16 mm² a 80 m");
  ok((await ev("tipos[0].Ld")) === 25, "el proyecto sigue en 25 m");
  await clic("#ftDlg [data-ft=apply]");
  ok((await ev("tipos[0].Ld")) === 80, "aplicado: 80 m");
  await clic("[data-ftp=eq]");
  await ev(
    "(c => { c.checked = true; c.dispatchEvent(new Event('change', {bubbles:true})); })(document.querySelector('[data-fteq=dps]'))"
  );
  await clic("#ftDlg [data-ft=ok]");
  ok((await J("TEQ.multi"))[tA]?.dps === true, "DPS guardado en el tablero");
});

prueba("Editor de cargas: botón rápido, vista previa y aplicar", async ok => {
  await ejemplo("multi");
  await ev("tablaCargas('cargasT')");
  await poner('[data-tce="L"]', 50);
  await esperar(400);
  ok(/2-1×4 mm²/.test(await ev("$('tcRes').textContent")), "vista previa: terma a 50 m necesita 4 mm²");
  ok((await ev("cargasT[0].L")) === 15, "el proyecto sigue en 15 m");
  await clic('#tcDlg [data-tca="cancel"].vw-btn');
  await ev("tablaCargas('cargasT')");
  await clic('[data-rap^="calentador|Ducha"]');
  await poner('[data-tce="p"]', 3500);
  await poner('[data-tce="L"]', 14);
  await clic("#tcDlg [data-tca=ok]");
  ok((await ev("cargasT.length")) === 4, "cuatro cargas tras aplicar");
  ok((await ev("LAST.circ.filter(q => q.src && q.src.t === 'cargasT').length")) === 4, "cada carga con su circuito");
});

prueba("Parámetros de diseño: vista previa y aplicar", async ok => {
  await ejemplo("uni");
  await ev("parametros(true); document.querySelector('[data-ppt=cond]').click()");
  await poner("[data-pp=temp]", 45);
  await esperar(500);
  ok(/Vista previa/.test(await ev("$('ppRes').textContent")), "franja con vista previa");
  ok((await ev("$('temp').value")) === "30", "el proyecto sigue a 30 °C");
  await poner("[data-pp=met]", "A1");
  await clic("#ppDlg [data-ppa=ok]");
  ok((await ev("$('met').value")) === "A1" && (await ev("$('temp').value")) === "45", "aplicado: A1 y 45 °C");
  ok(await ev("recomendaciones(LAST).some(x => /A1/.test(x.tit))"), "aparece la recomendación del método A1");
});

prueba("Datos del proyecto: vista previa, tipo de edificación y deshacer", async ok => {
  await ejemplo("uni");
  await ev("datosProyecto(true, 'viv')");
  await poner('[data-dp="area"]', 300);
  await esperar(500);
  ok(/MD 11.00 kW/.test(await ev("$('dpRes').textContent")), "vista previa: 11 kW con 300 m²");
  ok((await ev("LAST.md.MD")) === 9000, "el proyecto sigue en 9 kW");
  await clic("#dpDlg [data-dpa=cancel].vw-btn");
  await ev("datosProyecto(true, 'proy')");
  await poner('[data-dp="_tipo"]', "multi");
  await clic("#dpDlg [data-dpa=apply]");
  ok((await ev("MODE")) === "multi", "cambia a edificio multifamiliar");
  await ev("datosProyecto(false)");
  await deshacer();
  ok((await ev("MODE")) === "uni", "deshacer vuelve a vivienda");
});

prueba("Editor de departamentos: salidas, cargas, duplicar y quitar", async ok => {
  await ejemplo("multi");
  await ev("datosProyecto(true, 'dep')");
  await clic('[data-ddsel="1"]');
  await clic('[data-ddadd="lumsT"]');
  await poner('[data-dd="lumsT|0|n"]', 4);
  await poner('[data-dd="lumsT|0|p"]', 20);
  await clic('[data-ddrap^="cocina"]');
  const i = await ev("DPD.cargasT.length - 1");
  await poner(`[data-dd="cargasT|${i}|p"]`, 8000);
  await poner(`[data-dd="cargasT|${i}|L"]`, 10);
  await esperar(400);
  ok(/MD 13.50 kW por dpto/.test(await ev("$('ddRes').textContent")), "vista previa: 13.5 kW por departamento");
  ok(!(await ev("lumsT.length")), "el proyecto no cambia antes de aplicar");
  await clic('[data-dda="dup"]');
  await clic("#dpDlg [data-dpa=apply]");
  const r = await J("({t: tipos.length, l: lumsT.length, c: cargasT.filter(x => x.tipo === 'cocina').length})");
  ok(r.t === 3 && r.l === 2 && r.c === 2, "el duplicado lleva sus salidas y cargas");
  await clic('[data-ddsel="2"]');
  await clic('[data-dda="del"]');
  await clic("#dpDlg [data-dpa=ok]");
  ok((await ev("tipos.length")) === 2 && (await ev("lumsT.length")) === 1, "quitar el tipo quita también lo suyo");
});

prueba("Panel Propiedades: fase del circuito", async ok => {
  await ejemplo("uni");
  await ev(
    "document.querySelector('input[name=sist][value=tri380]').checked = true; document.querySelector('input[name=sist][value=tri380]').dispatchEvent(new Event('change', {bubbles:true})); calcularAhora(); selNode('circ:TG·C-6')"
  );
  ok(/Automática \(R\)/.test(await ev("document.querySelector('[data-fasefix]').textContent")), "fase automática R");
  await ev(
    "(s => { s.value = 'S'; s.dispatchEvent(new Event('change', {bubbles:true})); })(document.querySelector('[data-fasefix]'))"
  );
  ok((await ev("LAST.circ.find(q => q.key === 'TG·C-6').fase")) === "S", "fase S fijada en el cálculo");
});

prueba("Las ventanas se mueven y no salen de la pantalla", async ok => {
  await ejemplo("uni");
  await ev("cuadroCond(true)");
  const g = await J("CD_VW.leer()");
  await raton("mousePressed", g.x + 200, g.y + 15);
  await raton("mouseMoved", g.x + 100, g.y + 75);
  await raton("mouseReleased", g.x + 100, g.y + 75);
  const g2 = await J("CD_VW.leer()");
  ok(g2.x === g.x - 100 && g2.y === g.y + 60, "arrastrar la barra mueve la ventana");
  await ev("CD_VW.poner({x: -500, y: -500, w: 5000, h: 5000})");
  const g3 = await J("CD_VW.leer()");
  ok(g3.x >= 8 && g3.y >= 8 && g3.x + g3.w <= 1366 && g3.y + g3.h <= 768, "la ventana queda dentro de la pantalla");
});

prueba("Datos del proyecto: pisos (lista) y circuitos del 1er piso en un TD-1", async ok => {
  await ejemplo("uni");
  await ev(
    "pisos.push({area: 80, Ld: 9, al_n: 10, al_L: 16, tg_n: 12, tg_L: 18, tc_n: 0, tc_L: null, aE: 0}); renderList('pisos'); calcularAhora(); datosProyecto(true, 'pis')"
  );
  await poner('[data-dp="pisos_area_0"]', 95);
  await poner('[data-dp="esqPisos"]', "td");
  // La longitud TG → TD-1 aparece al aplicar la elección del TD-1
  await clic("#dpDlg [data-dpa=apply]");
  ok(await ev("!!document.querySelector('[data-dp=Ltd1]')"), "al aplicar aparece la longitud al TD-1");
  await poner('[data-dp="Ltd1"]', 6);
  await clic("#dpDlg [data-dpa=ok]");
  ok((await ev("pisos[0].area")) === 95, "el área del 2do piso pasa a su lista (95 m²)");
  ok(
    (await ev("PROY.esqPisos")) === "td" && (await ev("LAST.tabs.some(t => t.tab === 'TD-1')")),
    "aparece el tablero TD-1"
  );
  ok(
    await ev(
      "[...document.querySelectorAll('#L_cargas select')].some(s => [...s.options].some(o => /TD-1/.test(o.textContent)))"
    ),
    "las cargas especiales ya pueden ir al TD-1 (efecto de cambiar el dato)"
  );
});

prueba("Lo que se escribe en el panel pasa a los datos del proyecto (PROY)", async ok => {
  await ejemplo("uni");
  await ev("selNode('vivienda')");
  await poner("#area", 200);
  ok(
    (await ev("PROY.area")) === "200" && (await ev("estado().area")) === "200",
    "área escrita en el panel → PROY y estado()"
  );
  ok((await ev("LAST.md.MD")) === 10000, "el cálculo usa el área nueva: 200 m² → 10 kW (Regla 050-200)");
  await ev(
    "(r => { r.checked = true; r.dispatchEvent(new Event('change', {bubbles:true})); })(document.querySelector('input[name=sist][value=tri380]'))"
  );
  ok(
    (await ev("PROY.sist")) === "tri380" && (await ev("LAST.alims[0].s.tri")),
    "sistema elegido → PROY y cálculo trifásico"
  );
  await poner("#uso", "oficina");
  ok((await ev("PROY.tg_p")) === "250", "al pasar a oficina, 250 VA por tomacorriente también en PROY");
});

// Ejecución
let mal = 0;
const t0 = Date.now();
for (const [nombre, fn] of PRUEBAS) {
  const fallas = [];
  try {
    await fn((c, d) => {
      if (!c) fallas.push(d);
    });
  } catch (e) {
    fallas.push(e.message);
  }
  await ev(
    "['cerrarFicha','cerrarTablero','cerrarTabla'].forEach(f => { try { window[f] && window[f](); } catch (e) {} }); try { cuadroCond(false); parametros(false); datosProyecto(false); } catch (e) {}"
  ).catch(() => {});
  // En todas las pruebas: los datos del proyecto (PROY) y los campos de la pantalla deben coincidir
  try {
    const dif = await J(
      "KEYS.filter(k => PROY[k] !== $(k).value).concat(['sist', 'sistG'].filter(n => PROY[n] !== radio(n)))"
    );
    if (dif.length) fallas.push("PROY y la pantalla no coinciden en: " + dif.join(", "));
  } catch (e) {
    fallas.push(e.message);
  }
  if (fallas.length) mal++;
  console.log(`${fallas.length ? "✘" : "✔"} ${nombre}`);
  fallas.forEach(f => console.log(`    ✘ ${f}`));
}
const n = PRUEBAS.length;
console.log(
  mal
    ? `\n✘ ${mal} de ${n} pruebas de la interfaz fallaron (${((Date.now() - t0) / 1000).toFixed(1)} s)`
    : `\n✔ Todas las pruebas de la interfaz pasaron (${n} de ${n}) en ${((Date.now() - t0) / 1000).toFixed(1)} s`
);
nav.kill();
try {
  rmSync(perfil, { recursive: true, force: true });
} catch (e) {}
process.exit(mal ? 1 : 0);
