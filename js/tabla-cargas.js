/* EDITOR DE CARGAS ESPECIALES
   Ventana (cinta: Cargas › Editor de cargas) al estilo de la ficha del circuito: a la izquierda la lista de cargas
   (agregar, duplicar, quitar) y a la derecha los datos de la carga elegida en grupos con marco, su conexión
   (fases y fase asignada) y el resultado de su circuito. Vivienda y otros usos: lista «cargas». Edificio:
   pestañas Departamentos (lista «cargasT») y Servicios generales (lista «serv»).
   Se trabaja sobre una copia (TC_PEND) hasta «Aplicar» o «Aceptar»; entonces la copia reemplaza a la lista del
   proyecto, se recalcula y se guarda en el historial, igual que al editar en el panel Propiedades. Cada fila
   recuerda su posición original (_o) para mostrar el resultado de su circuito mientras no se modifique.
   Fase: por defecto la asigna el balance de fases (js/calculo.js, balancear); si se elige R, S o T queda fijada
   en FIX, el mismo dato que se fija en Resultados › Balance de fases. Se guarda en la fila como _fase
   ("" = automática) hasta aplicar. */
let TC_PEND = null,
  TC_TAB = "cargas",
  TC_SEL = 0;
const TC_VW = ventanaMovil(document.querySelector("#tcDlg .vw"), "jmg-electric-editor-cargas", {
  w: 760,
  h: 540,
  minW: 560,
  minH: 360
});
const tcListas = () => (MODE === "multi" ? ["cargasT", "serv"] : ["cargas"]);
const tcCorto = o => Object.entries(o).map(([k, v]) => [k, v.split(" (")[0]]);
const tcCopia = () => Object.fromEntries(tcListas().map(nm => [nm, LISTS[nm].arr.map((x, i) => ({ ...x, _o: i }))]));
// Fila sin sus datos de trabajo, tal como se guarda en la lista del proyecto
const tcLimpia = x => {
  const y = { ...x };
  delete y._o;
  delete y._fase;
  return y;
};
// Sistema que alimenta la lista: el de la vivienda o, en el edificio, el general (servicios generales)
const tcSist = () => SIST[MODE === "multi" ? radio("sistG") : radio("sist")] || SIST.mono220;
// Circuito calculado de una fila sin cambios (por su posición original en la lista)
const tcCirc = (nm, x) =>
  x._o != null && LAST ? LAST.circ.find(c => c.src && c.src.t === nm && c.src.i === x._o) || null : null;
const tcFijada = (nm, x) => {
  const q = tcCirc(nm, x);
  return (q && (FIX[MODE] || {})[q.key]) || "";
};
const tcModDatos = (nm, x) => x._o == null || JSON.stringify(tcLimpia(x)) !== JSON.stringify(LISTS[nm].arr[x._o]);
const tcMod = (nm, x) => tcModDatos(nm, x) || (x._fase !== undefined && x._fase !== tcFijada(nm, x));
// Número de cambios sin aplicar en todas las listas (cargas nuevas, modificadas o quitadas)
function tcCambios() {
  if (!TC_PEND) return 0;
  return tcListas().reduce((s, nm) => {
    const P = TC_PEND[nm],
      quit = LISTS[nm].arr.filter((_, i) => !P.some(x => x._o === i)).length;
    return s + P.filter(x => tcMod(nm, x)).length + quit;
  }, 0);
}
function tablaCargas(tab) {
  if (!$("tcDlg").hidden) return;
  tcListas().forEach(nm => readList(nm));
  TC_PEND = tcCopia();
  TC_TAB = tcListas().includes(tab) ? tab : tcListas()[0];
  TC_SEL = 0;
  $("tcDlg").hidden = false;
  vwFondo();
  TC_VW.abrir();
  renderTabla();
}
function cerrarTabla() {
  TC_PEND = null;
  $("tcDlg").hidden = true;
  vwFondo();
}
// Después de cada cálculo (por ejemplo, al aplicar la ficha de un circuito): si el editor no tiene cambios propios,
// vuelve a copiar las listas para mostrar los datos y resultados actuales (lo llama update() en js/app.js)
function tcSync() {
  if (!TC_PEND) return;
  if (!tcCambios()) TC_PEND = tcCopia();
  if (!$("tcDlg").contains(document.activeElement) || document.activeElement.tagName === "BUTTON") renderTabla();
}
// Campos editables de la carga elegida: clave, título, control, opciones y unidad
function tcCampos(nm, x) {
  const s = tcSist(),
    E = [
      { k: "nombre", l: "Descripción", t: "text" },
      { k: "tipo", l: "Tipo de carga", t: "sel", o: tcCorto(nm === "serv" ? TSERV : TIPOS) },
      { k: "p", l: "Potencia", t: "num", u: "W" },
      { k: "L", l: "Longitud", t: "num", u: "m" }
    ];
  if (nm === "cargasT")
    E.push({ k: "dep", l: "Departamento", t: "sel", o: tipos.map((t, i) => [i, t.nombre || `Tipo ${i + 1}`]), n: 1 });
  if (nm === "cargas" && pisos.length) E.push({ k: "piso", l: "Tablero", t: "sel", o: opcPiso(), n: 1 });
  const C = [];
  if (nm !== "cargasT") {
    C.push({ k: "fases", l: "Fases", t: "sel", o: FASES, n: 1 });
    // La fase solo se elige en cargas monofásicas con suministro trifásico
    if (s.tri && +x.fases !== 3) {
      const q = tcModDatos(nm, x) ? null : tcCirc(nm, x),
        auto = q && q.fase && q.fase !== "—" ? `Automática (${q.fase})` : "Automática";
      C.push({ k: "_fase", l: "Fase", t: "sel", o: [["", auto], ...s.fases.map(f => [f, f])] });
    }
  }
  return { E, C };
}
const tcCampo = (x, d) => {
  const v = d.k === "_fase" ? (x._fase !== undefined ? x._fase : tcFijada(TC_TAB, x)) : x[d.k],
    a = `data-tce="${d.k}" aria-label="${esc(d.l)}"`,
    falta = d.t === "num" && !(parseFloat(v) > 0) ? " tc-falta" : "",
    c =
      d.t === "sel"
        ? `<select ${a}>${d.o.map(([ov, ol]) => `<option value="${esc(ov)}"${String(ov) === String(v ?? "") ? " selected" : ""}>${esc(ol)}</option>`).join("")}</select>`
        : `<input ${a} type="${d.t === "num" ? "number" : "text"}"${d.t === "num" ? ' min="0" step="any"' : ""} value="${v == null ? "" : esc(v)}">`;
  return `<label class="fc-f fc-e${falta}"><span>${d.l}</span>${c}<em>${d.u || ""}</em></label>`;
};
// Lista de la izquierda: número, descripción, potencia y estado de cada carga
function tcItem(nm, x, j) {
  const q = tcMod(nm, x) ? null : tcCirc(nm, x),
    est = tcMod(nm, x) ? "mod" : q ? (q.ok ? "ok" : "bad") : "warn",
    tit = { mod: "Sin aplicar", ok: "Cumple", bad: "No cumple", warn: "Faltan datos" }[est];
  return `<button type="button" role="option" class="tc-it${j === TC_SEL ? " sel" : ""}${est === "mod" ? " mod" : ""}" data-sel="${j}" aria-selected="${j === TC_SEL}"><b>${j + 1}</b><span>${esc(x.nombre || "Sin descripción")}</span><em>${x.p > 0 ? fmt(x.p, 0) + " W" : ""}</em><i class="cd-est ${est}" title="${tit}"></i></button>`;
}
function renderLista() {
  const nm = TC_TAB,
    P = TC_PEND[nm];
  $("tcLista").innerHTML = P.length
    ? P.map((x, j) => tcItem(nm, x, j)).join("")
    : `<p class="tc-vacio">Aún no hay cargas.</p>`;
  tcPie();
}
function renderTabla() {
  if (!TC_PEND) return;
  const nm = TC_TAB,
    P = TC_PEND[nm],
    multi = MODE === "multi";
  if (TC_SEL >= P.length) TC_SEL = P.length - 1;
  $("tcTabs").hidden = !multi;
  document
    .querySelectorAll("#tcTabs [data-tct]")
    .forEach(b => b.setAttribute("aria-selected", b.dataset.tct === nm ? "true" : "false"));
  $("tcT").textContent =
    nm === "cargas"
      ? "Editor de cargas especiales"
      : nm === "cargasT"
        ? "Editor de cargas · Departamentos"
        : "Editor de cargas · Servicios generales";
  renderLista();
  const x = P[TC_SEL];
  if (!x) {
    $("tcForm").innerHTML = `<p class="fc-nota">Use «+ Agregar» para crear la primera carga.</p>`;
    return;
  }
  const { E, C } = tcCampos(nm, x),
    s = tcSist();
  let con = C.map(d => tcCampo(x, d)).join("");
  if (nm === "cargasT")
    con =
      fcCampo("Fases", "Monofásica") +
      fcCampo("Fase", "La del departamento", "", "Cada departamento se conecta a una fase en el balance de fases");
  else if (!s.tri) con += fcCampo("Sistema", esc(s.nom));
  // Resultado del circuito: solo si la carga no tiene cambios sin aplicar
  const q = tcMod(nm, x) ? null : tcCirc(nm, x);
  const res = q
    ? fcCampo("Circuito", esc((LAST.tabs.length > 1 ? q.tab + " · " : "") + q.id)) +
      fcCampo("Corriente de diseño", fmt(q.Id, 2), "A") +
      fcCampo("Interruptor", `${q.f3 ? 3 : 2}×${q.itm ?? "—"}`, "A") +
      fcCampo("Conductor", `${q.f3 ? 4 : 2}-1×${q.S}`, "mm²") +
      fcCampo("ΔV total", `${fmt(q.dVt, 2)} %`) +
      fcCheck(q.ok, q.ok ? "Conforme" : "Revisar")
    : `<p class="fc-nota">${tcMod(nm, x) ? "El resultado se calcula al aplicar los cambios." : "Complete la potencia y la longitud para calcular su circuito."}</p>`;
  $("tcForm").innerHTML =
    fcGrupo(`Datos de la carga ${TC_SEL + 1}`, E.map(d => tcCampo(x, d)).join("")) +
    fcGrupo("Conexión", con) +
    `<fieldset class="fc-g"><legend>Resultado del circuito</legend>${res}${q ? `<button type="button" class="vw-btn tc-ficha" data-tca="ficha">Ver ficha del circuito</button>` : ""}</fieldset>`;
}
function tcPie() {
  const n = tcCambios(),
    hay = !!(TC_PEND && TC_PEND[TC_TAB][TC_SEL]);
  $("tcApply").disabled = !n;
  $("tcNota").textContent = n ? `${n} cambio${n > 1 ? "s" : ""} sin aplicar` : "";
  $("tcDup").disabled = $("tcDel").disabled = !hay;
}
/* Escribe las copias en las listas del proyecto, con la misma limpieza de datos que el panel, y recalcula.
   Luego fija (o libera) la fase elegida en cada carga, ya con la clave de su circuito, y vuelve a calcular. */
function aplicarTabla() {
  if (!tcCambios()) return;
  const fases = [];
  tcListas().forEach(nm => {
    const L = LISTS[nm];
    L.arr.length = 0;
    TC_PEND[nm].forEach(x => {
      const y = { ...L.nuevo(), ...tcLimpia(x) };
      L.f.forEach(f => {
        const v = y[f.k];
        if (f.t === "number") y[f.k] = v === "" || v == null ? null : parseFloat(v) || 0;
        else if (f.n || f.k === "fases") y[f.k] = +v || 0;
        else if (f.t === "text") y[f.k] = String(v ?? "").replace(/[<>]/g, "");
      });
      if (x._fase !== undefined) fases.push([nm, L.arr.length, x._fase]);
      L.arr.push(y);
    });
    renderList(nm);
  });
  calcularAhora();
  if (fases.length && LAST) {
    const fx = (FIX[MODE] = FIX[MODE] || {});
    fases.forEach(([nm, i, f]) => {
      const q = LAST.circ.find(c => c.src && c.src.t === nm && c.src.i === i);
      if (!q) return;
      if (f) fx[q.key] = f;
      else delete fx[q.key];
    });
    calcularAhora();
  }
  histPush();
  TC_PEND = tcCopia();
  toast("Cargas aplicadas");
  renderTabla();
}
$("tcDlg").addEventListener("input", e => {
  const el = e.target.closest("[data-tce]");
  if (!el || !TC_PEND) return;
  const nm = TC_TAB,
    x = TC_PEND[nm][TC_SEL],
    k = el.dataset.tce;
  if (!x) return;
  const d = [...tcCampos(nm, x).E, ...tcCampos(nm, x).C].find(c => c.k === k);
  x[k] =
    k === "_fase"
      ? el.value
      : d.t === "num"
        ? el.value === ""
          ? null
          : parseFloat(el.value)
        : d.n
          ? +el.value
          : el.value;
  el.closest(".fc-e").classList.toggle("tc-falta", d.t === "num" && !(parseFloat(el.value) > 0));
  el.closest(".fc-e").classList.toggle("mod", true);
  // Al cambiar a trifásica (o volver a monofásica) cambia el grupo Conexión: se vuelve a dibujar el formulario
  if (k === "fases") return renderTabla();
  const it = $("tcLista").querySelector(`[data-sel="${TC_SEL}"]`);
  if (it) it.outerHTML = tcItem(nm, x, TC_SEL);
  tcPie();
});
$("tcDlg").addEventListener("change", e => {
  if (e.target.matches("select[data-tce]")) e.target.dispatchEvent(new Event("input", { bubbles: true }));
});
function tcElegir(j) {
  if (!TC_PEND[TC_TAB][j]) return;
  TC_SEL = j;
  renderTabla();
  $("tcLista").querySelector(`[data-sel="${j}"]`)?.focus();
}
$("tcDlg").addEventListener("click", e => {
  const t = e.target.closest("[data-tct]");
  if (t) {
    TC_TAB = t.dataset.tct;
    TC_SEL = 0;
    return renderTabla();
  }
  const it = e.target.closest("[data-sel]");
  if (it) return tcElegir(+it.dataset.sel);
  const b = e.target.closest("[data-tca]");
  if (!b || !TC_PEND) return;
  const a = b.dataset.tca,
    P = TC_PEND[TC_TAB];
  if (a === "add" || a === "dup") {
    const base =
      a === "dup" && P[TC_SEL]
        ? { ...P[TC_SEL], _o: null }
        : {
            ...LISTS[TC_TAB].nuevo(),
            ...(TC_TAB === "cargasT" && P.length ? { dep: P[P.length - 1].dep } : {}),
            _o: null
          };
    const pos = a === "dup" ? TC_SEL + 1 : P.length;
    P.splice(pos, 0, base);
    TC_SEL = pos;
    renderTabla();
    document.querySelector(`#tcForm [data-tce="${a === "dup" ? "p" : "nombre"}"]`)?.focus();
  } else if (a === "del" && P[TC_SEL]) {
    P.splice(TC_SEL, 1);
    renderTabla();
  } else if (a === "ok") {
    aplicarTabla();
    cerrarTabla();
  } else if (a === "apply") aplicarTabla();
  else if (a === "cancel") cerrarTabla();
  else if (a === "max") TC_VW.maximizar();
  else if (a === "ficha") {
    if (tcCambios()) return toast("Aplique o cancele primero los cambios del editor");
    const q = tcCirc(TC_TAB, P[TC_SEL]);
    if (q) fichaCirc(q.key);
  } else if (a === "help") {
    const p = $("tcAyuda");
    p.hidden = !p.hidden;
    b.setAttribute("aria-expanded", !p.hidden);
  }
});
// Teclado: ↑ ↓ en la lista cambian de carga; Enter en un dato aplica, como en la ficha del circuito
$("tcDlg").addEventListener("keydown", e => {
  if (e.target.matches("[data-sel]") && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
    e.preventDefault();
    tcElegir(TC_SEL + (e.key === "ArrowDown" ? 1 : -1));
  } else if (e.target.matches("[data-tce]") && e.key === "Enter") {
    e.preventDefault();
    e.target.dispatchEvent(new Event("input", { bubbles: true }));
    aplicarTabla();
  }
});
addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("tcDlg").hidden && $("fichaDlg").hidden) cerrarTabla();
});
