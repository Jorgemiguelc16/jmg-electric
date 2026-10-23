/* FICHA DEL CIRCUITO
   Ventana de propiedades de un circuito derivado, al estilo de los diálogos de los programas de ingeniería:
   identificación arriba (con ▲▼ para pasar al circuito anterior o siguiente), pestañas Carga, Conductor,
   Protección y Caída de tensión, y los datos en grupos. Los resultados son los que ya calculó js/calculo.js
   (los mismos de la memoria y del expediente). En la pestaña Carga se editan los mismos datos que en el panel
   Propiedades (cuadros blancos; los grises son de solo lectura): los cambios quedan pendientes (FC_PEND) hasta
   «Aplicar» o «Aceptar», y entonces se escriben en el mismo lugar que usa el panel, de modo que el cálculo,
   el historial (deshacer) y el guardado funcionan igual. Se abre con doble clic en un circuito del explorador o
   del cuadro de conductores, desde el panel Propiedades o desde la cinta (Resultados › Ficha del circuito). */
let FC_KEY = null,
  FC_TAB = "carga",
  FC_PEND = {},
  FC_APL = false; // mientras se aplican los cambios, el cálculo no vuelve a dibujar la ficha (js/app.js)
const FC_VW = ventanaMovil(document.querySelector("#fichaDlg .vw"), "jmg-electric-ficha-circuito", {
  w: 560,
  h: 530,
  minW: 420,
  minH: 320
});
const fcCirc = () => (LAST ? LAST.circ.find(x => x.key === FC_KEY) : null);
const fcHay = () => Object.keys(FC_PEND).length > 0;
function fichaCirc(key) {
  if (DESACT) calcularAhora();
  if (!LAST || !LAST.circ.some(q => q.key === key)) return toast("Complete los datos para ver el circuito");
  const nuevo = $("fichaDlg").hidden;
  if (!nuevo && key !== FC_KEY && fcHay()) return toast("Aplique o cancele primero los cambios de la ficha");
  if (key !== FC_KEY) FC_PEND = {};
  FC_KEY = key;
  $("fichaDlg").hidden = false;
  vwFondo();
  if (nuevo) FC_VW.abrir();
  renderFicha();
}
function cerrarFicha() {
  FC_KEY = null;
  FC_PEND = {};
  $("fichaDlg").hidden = true;
  vwFondo();
}
/* Datos editables del circuito según su origen, los mismos que ofrece el panel Propiedades (propCircuito en
   js/app.js). Cada uno indica dónde se escribe: en la lista de cargas o servicios (lista) o en un campo del
   formulario (campo). */
function fcEditables(q) {
  const t = q.src && q.src.t;
  if (t === "cargas" || t === "serv") {
    const it = LISTS[t].arr[q.src.i];
    if (!it) return [];
    const tipos_ = t === "cargas" ? TIPOS : TSERV,
      E = [
        { id: "nombre", l: "Descripción", tipo: "text", v: it.nombre, lista: t },
        { id: "tipo", l: "Tipo de carga", tipo: "select", v: it.tipo, o: Object.entries(tipos_), lista: t },
        { id: "p", l: "Potencia", tipo: "number", v: it.p, u: "W", lista: t },
        {
          id: "fases",
          l: "Fases",
          tipo: "select",
          v: it.fases,
          o: [
            [1, "Monofásica"],
            [3, "Trifásica"]
          ],
          lista: t
        },
        { id: "L", l: "Longitud", tipo: "number", v: it.L, u: "m", lista: t }
      ];
    if (t === "cargas" && pisos.length)
      E.push({ id: "piso", l: "Tablero", tipo: "select", v: it.piso, o: opcPiso(), lista: t });
    return E;
  }
  if (t === "grp") {
    const k = q.src.k;
    return [
      { id: k + "_n", l: "Nº de salidas", tipo: "number", v: $(k + "_n").value, campo: true },
      { id: k + "_p", l: "Potencia por salida", tipo: "number", v: $(k + "_p").value, u: "W", campo: true },
      { id: k + "_L", l: "Longitud", tipo: "number", v: $(k + "_L").value, u: "m", campo: true }
    ];
  }
  return [];
}
// Campo de solo lectura con su unidad, como los cuadros grises de los diálogos de ingeniería
const fcCampo = (lbl, val, uni = "", ayuda = "") =>
  `<div class="fc-f"${ayuda ? ` data-ayuda="${esc(ayuda)}"` : ""}><span>${lbl}</span><output>${val}</output><em>${uni}</em></div>`;
// Campo editable (cuadro blanco); muestra el valor pendiente si lo hay
function fcEdit(d) {
  const v = d.id in FC_PEND ? FC_PEND[d.id] : (d.v ?? ""),
    mod = d.id in FC_PEND ? " mod" : "",
    a = `data-fce="${esc(d.id)}" aria-label="${esc(d.l)}"`;
  const c =
    d.tipo === "select"
      ? `<select ${a}>${d.o.map(([ov, ol]) => `<option value="${esc(ov)}"${String(ov) === String(v) ? " selected" : ""}>${esc(ol)}</option>`).join("")}</select>`
      : `<input ${a} type="${d.tipo}"${d.tipo === "number" ? ' min="0" step="any"' : ""} value="${esc(v)}">`;
  return `<label class="fc-f fc-e${mod}"><span>${d.l}</span>${c}<em>${d.u || ""}</em></label>`;
}
const fcGrupo = (tit, campos) => `<fieldset class="fc-g"><legend>${tit}</legend>${campos}</fieldset>`;
const fcCheck = (ok, txt) => `<div class="fc-chk ${ok ? "ok" : "bad"}"><i></i>${txt}</div>`;
// Qué se edita y dónde, según el origen del circuito
function fcNota(q) {
  const t = q.src && q.src.t,
    nm = { al: "alumbrado", tg: "tomacorrientes", tc: "tomacorrientes de cocina / lavandería" };
  if (t === "grp")
    return `Estos datos son de todas las salidas de ${nm[q.src.k]} (máximo ${ctx().maxSal} por circuito): al cambiarlos se recalculan todos los circuitos del grupo.`;
  if (t === "piso")
    return `Circuito de ${nm[q.src.k]} del ${ORD(q.src.i + 2)} piso: sus salidas y longitudes se editan en Vivienda › Pisos y tableros («Abrir en el panel»).`;
  if (t === "tipo")
    return "Circuito de un tipo de departamento: sus datos se editan en el departamento («Abrir en el panel»).";
  return "";
}
function renderFicha() {
  const r = LAST,
    lista = r ? r.circ : [],
    i = lista.findIndex(x => x.key === FC_KEY),
    q = lista[i];
  if (!q) return cerrarFicha();
  const c = r.c,
    tb = r.tabs.find(t => t.tab === q.tab),
    pol = q.f3 ? 3 : 2;
  $("fcT").textContent = `Propiedades del circuito · ${q.id} ${q.desc}`;
  $("fcCab").innerHTML =
    `<div class="fc-f fc-id"><span>Circuito</span><output>${esc(q.id)}</output><span class="fc-nav"><button type="button" data-fc="prev" aria-label="Circuito anterior"${i ? "" : " disabled"}>▲</button><button type="button" data-fc="next" aria-label="Circuito siguiente"${i < lista.length - 1 ? "" : " disabled"}>▼</button></span></div>` +
    fcCampo("Descripción", esc(q.desc)) +
    fcCampo("Tablero", esc(q.tab + (tb ? " · " + tb.desc : ""))) +
    `<fieldset class="fc-g fc-est"><legend>Verificación</legend>${fcCheck(q.ok, q.ok ? "Conforme" : "Revisar")}</fieldset>`;
  document
    .querySelectorAll("#fcTabs [data-fct]")
    .forEach(b => b.setAttribute("aria-selected", b.dataset.fct === FC_TAB ? "true" : "false"));
  let h = "";
  if (FC_TAB === "carga") {
    const ed = fcEditables(q),
      nota = fcNota(q);
    h =
      (ed.length ? fcGrupo("Datos de la carga", ed.map(fcEdit).join("")) : "") +
      (nota ? `<p class="fc-nota">${nota}</p>` : "") +
      fcGrupo(
        "Resultado de la carga",
        fcCampo("Tipo", esc(q.tipo || "—")) +
          (q.n > 1 ? fcCampo("Salidas", q.n) : "") +
          fcCampo("Potencia instalada", fmt(q.P, 0), "W") +
          (q.motor ? fcCampo("Motor", "Sí") : "")
      ) +
      fcGrupo(
        "Sistema",
        fcCampo("Sistema", esc(q.s.nom)) +
          (q.fase && q.fase !== "—" ? fcCampo("Fase", esc(q.fase)) : "") +
          fcCampo("Tensión", q.s.V, "V") +
          fcCampo("Longitud", fmt(q.L, 1), "m")
      );
  } else if (FC_TAB === "cond") {
    h =
      fcGrupo(
        "Conductor",
        fcCampo("Fase y neutro", `${q.f3 ? 4 : 2}-1×${q.S}`, "mm²") +
          fcCampo("Protección (tierra)", `1×${q.St}`, "mm²") +
          (c.desig ? fcCampo("Designación", esc(c.desig)) : "") +
          fcCampo("Tubo", q.tubo.mm ? `${q.tubo.mm} mm (${q.tubo.pul})` : q.tubo.pul) +
          (q.Sauto
            ? fcCampo("Sección elegida", "Mayor que la automática", "", "Elegida en el cuadro de conductores")
            : "")
      ) +
      fcGrupo(
        "Capacidad de corriente",
        fcCampo("Corriente nominal", fmt(q.I, 2), "A") +
          fcCampo("Corriente de diseño", fmt(q.Id, 2), "A", `Corriente nominal × ${fmt(q.fd ?? FD, 2)}`) +
          fcCampo("Iz de la Tabla 2", fmt(q.Iz, 1), "A", MET[c.met] || c.met) +
          fcCampo("Factor de corrección", fmt(c.fc, 2), "", "Temperatura (Tabla 5A) × agrupamiento (Tabla 5C)") +
          fcCampo("Iz corregida", fmt(q.Izc, 1), "A")
      );
  } else if (FC_TAB === "prot") {
    h =
      fcGrupo(
        "Interruptor termomagnético",
        fcCampo("Polos × In", `${pol}×${q.itm ?? "—"}`, "A") + fcCampo("Curva", esc(q.curva || "—"))
      ) +
      fcGrupo(
        "Interruptor diferencial",
        fcCampo("Designación", esc(q.idName || "—")) + fcCampo("Polos × In", `${q.f3 ? 4 : 2}×${q.idRat ?? "—"}`, "A")
      ) +
      fcGrupo(
        "Coordinación",
        fcCheck(
          q.itm !== null && q.Id <= q.itm + 1e-9,
          `Corriente de diseño ${fmt(q.Id, 1)} A ≤ ITM ${q.itm ?? "—"} A`
        ) + fcCheck(q.itm !== null && q.Izc >= q.itm, `ITM ${q.itm ?? "—"} A ≤ Iz corregida ${fmt(q.Izc, 1)} A`)
      );
  } else {
    const uso = usoDV(q, q.S);
    h =
      fcGrupo(
        "Caída de tensión",
        fcCampo("En el circuito", `${fmt(q.dVp, 2)} %`, `${fmt(q.dV, 2)} V`) +
          fcCampo("Aguas arriba", `${fmt(q.dvUp, 2)} %`, "", "Alimentadores desde el suministro hasta el tablero") +
          fcCampo("Total", `${fmt(q.dVt, 2)} %`) +
          `<div class="fc-f"><span>Uso del límite</span><output><span class="cd-uso"><i style="width:${Math.min(100, uso * 100).toFixed(0)}%"${uso >= DV_MARGEN ? ' class="w"' : ""}></i></span>${fmt(uso * 100, 0)} %</output><em></em></div>`
      ) +
      fcGrupo(
        "Límites · Regla 050-102",
        fcCheck(q.dVp <= DV_DER + 1e-9, `Circuito ${fmt(q.dVp, 2)} % ≤ ${fmt(DV_DER, 1)} %`) +
          fcCheck(q.dVt <= DV_TOT + 1e-9, `Total ${fmt(q.dVt, 2)} % ≤ ${fmt(DV_TOT, 1)} %`)
      );
  }
  $("fcBody").innerHTML = h;
  fcPie();
}
// Botones y aviso del pie según haya o no cambios pendientes
function fcPie() {
  const n = Object.keys(FC_PEND).length;
  $("fcApply").disabled = !n;
  $("fcNota").textContent = n ? `${n} cambio${n > 1 ? "s" : ""} sin aplicar` : "";
}
/* Escribe los cambios pendientes en el mismo lugar que el panel Propiedades: en la lista de cargas o servicios
   (con la misma conversión que el panel) o en el campo del formulario, avisando con un evento «input» como si se
   hubiera escrito allí. Luego recalcula, guarda en el historial y sigue al mismo circuito aunque cambie de
   número (por ejemplo, al pasarlo a otro tablero). */
function aplicarFicha() {
  const q = fcCirc();
  if (!q || !fcHay()) return;
  const ed = fcEditables(q),
    src = q.src ? { ...q.src } : null;
  let lista = null;
  FC_APL = true;
  ed.forEach(d => {
    if (!(d.id in FC_PEND)) return;
    const v = FC_PEND[d.id];
    if (d.campo) {
      const el = $(d.id);
      el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      const L = LISTS[d.lista],
        it = L.arr[src.i],
        f = L.f.find(x => x.k === d.id);
      it[d.id] =
        f && f.t === "number"
          ? String(v).trim() === ""
            ? null
            : parseFloat(v) || 0
          : d.id === "fases" || d.id === "piso"
            ? +v
            : String(v).replace(/[<>]/g, "");
      lista = d.lista;
    }
  });
  FC_PEND = {};
  if (lista) renderList(lista);
  // Aplicar es una orden explícita: recalcula aunque el cálculo automático esté desactivado
  calcularAhora();
  histPush();
  FC_APL = false;
  // El mismo circuito después del cálculo: por su clave o, si cambió de número, por su origen
  const r = LAST;
  if (r && !r.circ.some(x => x.key === FC_KEY) && src) {
    const n = r.circ.find(x => x.src && x.src.t === src.t && x.src.i === src.i && x.src.k === src.k);
    if (n) FC_KEY = n.key;
  }
  if (NODE.startsWith("circ:") && !$("propBody").contains(document.activeElement)) {
    if (r && r.circ.some(x => x.key === FC_KEY)) selNode("circ:" + FC_KEY);
  }
  toast("Cambios aplicados");
  renderFicha();
}
$("fichaDlg").addEventListener("input", e => {
  const el = e.target.closest("[data-fce]");
  if (!el) return;
  const q = fcCirc(),
    d = q && fcEditables(q).find(x => x.id === el.dataset.fce);
  if (!d) return;
  // Si vuelve al valor que ya tenía, deja de ser un cambio pendiente
  if (String(el.value) === String(d.v ?? "")) delete FC_PEND[d.id];
  else FC_PEND[d.id] = el.value;
  el.closest(".fc-e").classList.toggle("mod", d.id in FC_PEND);
  fcPie();
});
$("fichaDlg").addEventListener("change", e => {
  if (e.target.matches("select[data-fce]")) e.target.dispatchEvent(new Event("input", { bubbles: true }));
});
$("fichaDlg").addEventListener("click", e => {
  const t = e.target.closest("[data-fct]");
  if (t) {
    FC_TAB = t.dataset.fct;
    return renderFicha();
  }
  const b = e.target.closest("[data-fc]");
  if (!b) return;
  const a = b.dataset.fc,
    lista = LAST ? LAST.circ : [],
    i = lista.findIndex(x => x.key === FC_KEY);
  if (a === "close") cerrarFicha();
  else if (a === "ok") {
    aplicarFicha();
    cerrarFicha();
  } else if (a === "apply") aplicarFicha();
  else if (a === "max") FC_VW.maximizar();
  else if ((a === "prev" || a === "next") && lista[i + (a === "prev" ? -1 : 1)]) {
    if (fcHay()) return toast("Aplique o cancele primero los cambios de este circuito");
    FC_KEY = lista[i + (a === "prev" ? -1 : 1)].key;
    renderFicha();
  } else if (a === "panel") {
    if (fcHay()) return toast("Aplique o cancele primero los cambios de la ficha");
    const k = FC_KEY;
    // El cuadro de conductores se cierra solo si no tiene cambios sin aplicar
    if (!$("condDlg").hidden) {
      if (cdCambios()) return toast("Aplique o cancele primero los cambios del cuadro de conductores");
      cuadroCond(false);
    }
    cerrarFicha();
    selNode("circ:" + k);
  }
});
// Teclado: Enter en un dato aplica; ← → cambian de pestaña y ↑ ↓ de circuito fuera de los campos
$("fichaDlg").addEventListener("keydown", e => {
  if (e.target.matches("[data-fce]")) {
    if (e.key === "Enter") {
      e.preventDefault();
      e.target.dispatchEvent(new Event("input", { bubbles: true }));
      aplicarFicha();
    }
    return;
  }
  if (e.target.matches("input,select,textarea")) return;
  const T = ["carga", "cond", "prot", "dv"],
    k = { ArrowLeft: -1, ArrowRight: 1 }[e.key],
    v = { ArrowUp: "prev", ArrowDown: "next" }[e.key];
  if (k) {
    FC_TAB = T[(T.indexOf(FC_TAB) + k + T.length) % T.length];
    renderFicha();
  } else if (v) document.querySelector(`#fichaDlg [data-fc="${v}"]`)?.click();
  else return;
  e.preventDefault();
});
// Esc cierra sin aplicar, como «Cancelar»
addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("fichaDlg").hidden) cerrarFicha();
});
// Doble clic en un circuito del explorador. El primer clic vuelve a dibujar el árbol y el navegador ya no
// emite «dblclick», así que se usa el número de clics seguidos que trae el propio clic (e.detail).
$("exTree").addEventListener("click", e => {
  const n = e.target.closest('[data-node^="circ:"]');
  if (n && e.detail === 2) setTimeout(() => fichaCirc(n.dataset.node.slice(5)));
});
// Botón «Ver ficha del circuito» del panel Propiedades
$("propBody").addEventListener("click", e => {
  const b = e.target.closest("[data-ficha]");
  if (b) fichaCirc(b.dataset.ficha);
});
