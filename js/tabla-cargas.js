/* TABLA DE CARGAS ESPECIALES
   Ventana (cinta: Cargas › Tabla de cargas) para ingresar y editar las cargas especiales como en una hoja de
   cálculo: una fila por equipo, cuadros blancos para los datos y columnas grises con el resultado de su circuito.
   Vivienda y otros usos: lista «cargas». Edificio: pestañas Departamentos (lista «cargasT») y Servicios generales
   (lista «serv»). Se trabaja sobre una copia (TC_PEND): agregar, duplicar, quitar y editar filas queda pendiente
   hasta «Aplicar» o «Aceptar»; entonces la copia reemplaza a la lista del proyecto, se recalcula y se guarda en el
   historial, igual que si se hubiera editado en el panel Propiedades. Cada fila recuerda su posición original
   (_o) para mostrar el resultado de su circuito mientras no se modifique. */
let TC_PEND = null,
  TC_TAB = "cargas",
  TC_SEL = -1;
const TC_VW = ventanaMovil(document.querySelector("#tcDlg .vw"), "jmg-electric-tabla-cargas", {
  w: 1000,
  h: 480,
  minW: 520,
  minH: 260
});
const tcListas = () => (MODE === "multi" ? ["cargasT", "serv"] : ["cargas"]);
const tcCorto = o => Object.entries(o).map(([k, v]) => [k, v.split(" (")[0]]);
// Columnas editables de cada lista: clave, título, tipo de control y opciones
function tcCols(nm) {
  const fases = {
    k: "fases",
    l: "Fases",
    t: "sel",
    o: FASES.map(([v, l]) => [v, l === "Monofásica" ? "1φ" : "3φ"]),
    n: 1
  };
  const C = [
    { k: "nombre", l: "Descripción", t: "text" },
    { k: "tipo", l: "Tipo", t: "sel", o: tcCorto(nm === "serv" ? TSERV : TIPOS) }
  ];
  if (nm === "cargasT")
    C.push({
      k: "dep",
      l: "Departamento",
      t: "sel",
      o: tipos.map((t, i) => [String(i), t.nombre || `Tipo ${i + 1}`]),
      n: 1
    });
  else C.push(fases);
  if (nm === "cargas" && pisos.length) C.push({ k: "piso", l: "Tablero", t: "sel", o: opcPiso(), n: 1 });
  C.push({ k: "p", l: "Potencia (W)", t: "num" }, { k: "L", l: "Long. (m)", t: "num" });
  return C;
}
// Fila sin su posición original, tal como se guarda en la lista del proyecto
const tcLimpia = x => {
  const y = { ...x };
  delete y._o;
  return y;
};
function tablaCargas(tab) {
  if (!$("tcDlg").hidden) return;
  tcListas().forEach(nm => readList(nm));
  TC_PEND = Object.fromEntries(tcListas().map(nm => [nm, LISTS[nm].arr.map((x, i) => ({ ...x, _o: i }))]));
  TC_TAB = tcListas().includes(tab) ? tab : tcListas()[0];
  TC_SEL = -1;
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
// Fila modificada: nueva o con algún dato distinto del que tiene la lista del proyecto
const tcMod = (nm, x) => x._o == null || JSON.stringify(tcLimpia(x)) !== JSON.stringify(LISTS[nm].arr[x._o]);
// Número de cambios sin aplicar en todas las listas (filas nuevas, modificadas o quitadas)
function tcCambios() {
  if (!TC_PEND) return 0;
  return tcListas().reduce((s, nm) => {
    const P = TC_PEND[nm],
      quit = LISTS[nm].arr.filter((_, i) => !P.some(x => x._o === i)).length;
    return s + P.filter(x => tcMod(nm, x)).length + quit;
  }, 0);
}
// Después de cada cálculo (por ejemplo, al aplicar la ficha de un circuito): si la tabla no tiene cambios propios,
// vuelve a copiar las listas para mostrar los datos y resultados actuales (lo llama update() en js/app.js)
function tcSync() {
  if (!TC_PEND) return;
  if (!tcCambios())
    TC_PEND = Object.fromEntries(tcListas().map(nm => [nm, LISTS[nm].arr.map((x, i) => ({ ...x, _o: i }))]));
  if (!$("tcBody").contains(document.activeElement)) renderTabla();
}
function renderTabla() {
  if (!TC_PEND) return;
  const nm = TC_TAB,
    P = TC_PEND[nm],
    C = tcCols(nm),
    r = LAST,
    multi = MODE === "multi";
  // Pestañas solo en el edificio
  $("tcTabs").hidden = !multi;
  document
    .querySelectorAll("#tcTabs [data-tct]")
    .forEach(b => b.setAttribute("aria-selected", b.dataset.tct === nm ? "true" : "false"));
  $("tcT").textContent =
    nm === "cargas"
      ? "Tabla de cargas especiales"
      : nm === "cargasT"
        ? "Tabla de cargas · Departamentos"
        : "Tabla de cargas · Servicios generales";
  const celda = (x, j, c) => {
    const v = x[c.k],
      a = `data-tc="${j}|${c.k}" aria-label="${esc(c.l)} de la fila ${j + 1}"`,
      falta = c.t === "num" && !(parseFloat(v) > 0) ? " tc-falta" : "";
    if (c.t === "sel")
      return `<td class="t tc-e"><select ${a}>${c.o.map(([ov, ol]) => `<option value="${esc(ov)}"${String(ov) === String(v) ? " selected" : ""}>${esc(ol)}</option>`).join("")}</select></td>`;
    return `<td class="${c.t === "num" ? "" : "t "}tc-e${falta}"><input ${a} type="${c.t === "num" ? "number" : "text"}"${c.t === "num" ? ' min="0" step="any"' : ""} value="${v == null ? "" : esc(v)}"${c.t === "num" ? "" : ` placeholder="${nm === "serv" ? "ej. Electrobomba de agua" : "ej. Ducha eléctrica"}"`}></td>`;
  };
  // Resultado del circuito de la fila (solo si no tiene cambios pendientes)
  const res = (x, j) => {
    const q = !tcMod(nm, x) && r ? r.circ.find(c => c.src && c.src.t === nm && c.src.i === x._o) : null;
    if (!q)
      return `<td class="c-cir tc-r">—</td><td class="c-i tc-r">—</td><td class="c-itm tc-r">—</td><td class="c-sec tc-r">—</td><td class="t tc-r"><span class="cd-est ${tcMod(nm, x) ? "mod" : "warn"}" title="${tcMod(nm, x) ? "Sin aplicar" : "Faltan datos"}">${tcMod(nm, x) ? "Sin aplicar" : "Faltan datos"}</span></td>`;
    const tb = r.tabs.length > 1 ? q.tab + " · " : "";
    return `<td class="c-cir tc-r" data-ficha-tc="${esc(q.key)}" title="Doble clic: ficha del circuito">${esc(tb + q.id)}</td><td class="c-i tc-r">${fmt(q.I, 1)}</td><td class="c-itm tc-r">${q.f3 ? 3 : 2}×${q.itm ?? "—"}</td><td class="c-sec tc-r">${q.S} mm²</td><td class="t tc-r"><span class="cd-est ${q.ok ? "ok" : "bad"}" title="${q.ok ? "Cumple" : "No cumple"}">${q.ok ? "Cumple" : "No cumple"}</span></td>`;
  };
  const filas = P.length
    ? P.map(
        (x, j) =>
          `<tr data-fila="${j}" class="${j === TC_SEL ? "tc-sel" : ""}${tcMod(nm, x) ? " cd-mod" : ""}"><td class="tc-n">${j + 1}</td>${C.map(c => celda(x, j, c)).join("")}${res(x, j)}</tr>`
      ).join("")
    : `<tr><td class="t tc-vacio" colspan="${C.length + 6}">Aún no hay cargas. Use «+ Agregar fila».</td></tr>`;
  $("tcBody").innerHTML =
    `<table><thead><tr><th class="tc-n">N.°</th>${C.map(c => `<th class="${c.t === "num" ? "c-num" : "t"} c-${c.k}">${c.l}</th>`).join("")}<th class="c-cir">Circuito</th><th class="c-i">I (A)</th><th class="c-itm">ITM (A)</th><th class="c-sec">Sección</th><th class="t c-est">Estado</th></tr></thead><tbody>${filas}</tbody></table>`;
  tcPie();
}
function tcPie() {
  const n = tcCambios();
  $("tcApply").disabled = !n;
  $("tcNota").textContent = n ? `${n} cambio${n > 1 ? "s" : ""} sin aplicar` : "";
  $("tcDup").disabled = $("tcDel").disabled = !(TC_SEL >= 0 && TC_PEND && TC_PEND[TC_TAB][TC_SEL]);
}
// Escribe las copias en las listas del proyecto, con la misma limpieza de datos que el panel, y recalcula
function aplicarTabla() {
  if (!tcCambios()) return;
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
      L.arr.push(y);
    });
    renderList(nm);
  });
  calcularAhora();
  histPush();
  // La copia vuelve a reflejar la lista aplicada, con sus nuevas posiciones
  TC_PEND = Object.fromEntries(tcListas().map(nm => [nm, LISTS[nm].arr.map((x, i) => ({ ...x, _o: i }))]));
  toast("Cargas aplicadas");
  renderTabla();
}
$("tcDlg").addEventListener("input", e => {
  const el = e.target.closest("[data-tc]");
  if (!el || !TC_PEND) return;
  const [j, k] = el.dataset.tc.split("|"),
    x = TC_PEND[TC_TAB][+j],
    c = tcCols(TC_TAB).find(c => c.k === k);
  x[k] = c.t === "num" ? (el.value === "" ? null : parseFloat(el.value)) : c.n ? +el.value : el.value;
  const tr = el.closest("tr"),
    mod = tcMod(TC_TAB, x);
  tr.classList.toggle("cd-mod", mod);
  el.closest("td").classList.toggle("tc-falta", c.t === "num" && !(parseFloat(el.value) > 0));
  // Las columnas de resultado de esta fila pasan a «Sin aplicar» o vuelven a su resultado
  if (tr.dataset.mod !== String(mod)) {
    tr.dataset.mod = String(mod);
    const foco = document.activeElement && document.activeElement.dataset.tc;
    renderTabla();
    if (foco) {
      const f = document.querySelector(`#tcBody [data-tc="${foco}"]`);
      if (f) {
        f.focus();
        if (f.setSelectionRange && f.type === "text") f.setSelectionRange(f.value.length, f.value.length);
      }
    }
  } else tcPie();
});
$("tcDlg").addEventListener("change", e => {
  if (e.target.matches("select[data-tc]")) e.target.dispatchEvent(new Event("input", { bubbles: true }));
});
// Seleccionar una fila (para duplicarla o quitarla) al hacer clic o entrar en una de sus celdas
$("tcBody").addEventListener("focusin", e => {
  const tr = e.target.closest("tr[data-fila]");
  if (tr && +tr.dataset.fila !== TC_SEL) {
    document.querySelectorAll("#tcBody tr.tc-sel").forEach(t => t.classList.remove("tc-sel"));
    TC_SEL = +tr.dataset.fila;
    tr.classList.add("tc-sel");
    tcPie();
  }
});
$("tcBody").addEventListener("click", e => {
  const tr = e.target.closest("tr[data-fila]");
  if (!tr) return;
  document.querySelectorAll("#tcBody tr.tc-sel").forEach(t => t.classList.remove("tc-sel"));
  TC_SEL = +tr.dataset.fila;
  tr.classList.add("tc-sel");
  tcPie();
});
// Doble clic en el circuito de una fila: su ficha
$("tcBody").addEventListener("dblclick", e => {
  const c = e.target.closest("[data-ficha-tc]");
  if (!c) return;
  if (tcCambios()) return toast("Aplique o cancele primero los cambios de la tabla");
  fichaCirc(c.dataset.fichaTc);
});
// Enter baja a la misma columna de la fila siguiente, como en una hoja de cálculo
$("tcBody").addEventListener("keydown", e => {
  const el = e.target.closest("[data-tc]");
  if (!el || e.key !== "Enter") return;
  e.preventDefault();
  const [j, k] = el.dataset.tc.split("|"),
    sig = document.querySelector(`#tcBody [data-tc="${+j + (e.shiftKey ? -1 : 1)}|${k}"]`);
  if (sig) sig.focus();
});
$("tcDlg").addEventListener("click", e => {
  const t = e.target.closest("[data-tct]");
  if (t) {
    TC_TAB = t.dataset.tct;
    TC_SEL = -1;
    return renderTabla();
  }
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
    document.querySelector(`#tcBody [data-tc="${pos}|${a === "dup" ? "p" : "nombre"}"]`)?.focus();
  } else if (a === "del" && P[TC_SEL]) {
    P.splice(TC_SEL, 1);
    TC_SEL = Math.min(TC_SEL, P.length - 1);
    renderTabla();
  } else if (a === "ok") {
    aplicarTabla();
    cerrarTabla();
  } else if (a === "apply") aplicarTabla();
  else if (a === "cancel") cerrarTabla();
  else if (a === "max") TC_VW.maximizar();
  else if (a === "help") {
    const p = $("tcAyuda");
    p.hidden = !p.hidden;
    b.setAttribute("aria-expanded", !p.hidden);
  }
});
addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("tcDlg").hidden && $("fichaDlg").hidden) cerrarTabla();
});
