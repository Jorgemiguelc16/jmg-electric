/* DATOS DEL PROYECTO
   Ventana (cinta: Proyecto › Datos del proyecto) con los datos de entrada del proyecto en pestañas: Proyecto,
   Suministro, Vivienda (o Edificación), Salidas y Pisos en la vivienda; Proyecto, Suministro y Departamentos en el
   edificio. Igual que la ventana de parámetros, se arma con los mismos campos de los formularios del panel
   (fieldsets de index.html, incluidas las listas de pisos y departamentos): mismas opciones, ayudas y normas, sin
   duplicarlos. Los cambios quedan pendientes (DP_PEND) hasta «Aplicar» o «Aceptar»; entonces se escriben en esos
   campos avisando con «input» y «change», como si se hubieran escrito allí, y el cálculo, las validaciones y el
   historial funcionan igual. Agregar un piso o un tipo de departamento usa el mismo botón del formulario. */
let DP_PEND = null,
  DP_TAB = "proy";
const DP_VW = ventanaMovil(document.querySelector("#dpDlg .vw"), "jmg-electric-datos-proyecto", {
  w: 640,
  h: 540,
  minW: 460,
  minH: 340
});
// Pestañas de cada modo: [clave, título, fieldsets, listas que no se muestran, botón de agregar]
function dpPestanas() {
  const com = USOS[usoAct()];
  return MODE === "multi"
    ? [
        ["proy", "Proyecto", ["fs-proy", "fs-tipo"]],
        ["sum", "Suministro", ["fs-sum-multi"]],
        ["dep", "Departamentos", ["fs-tipos"], ["L_cargasT"], ["add_tipos", "+ Agregar tipo de departamento"]]
      ]
    : [
        ["proy", "Proyecto", ["fs-proy", "fs-tipo"]],
        ["sum", "Suministro", ["fs-sum-uni"]],
        ["viv", com ? "Edificación" : "Vivienda", ["fs-viv"]],
        ["sal", "Salidas", ["fs-sal"]],
        ["pis", "Pisos", ["fs-pisos"], [], ["add_pisos", "+ Agregar piso"]]
      ];
}
function datosProyecto(abrir, tab) {
  if (abrir) {
    DP_PEND = {};
    if (tab) DP_TAB = tab;
    if (!dpPestanas().some(p => p[0] === DP_TAB)) DP_TAB = "proy";
    $("dpDlg").hidden = false;
    vwFondo();
    DP_VW.abrir();
    renderDatos();
  } else {
    DP_PEND = null;
    $("dpDlg").hidden = true;
    vwFondo();
  }
}
// ¿El control está oculto dentro de su formulario (por ejemplo, un dato que no aplica al uso elegido)?
const dpOculto = (c, fs) => {
  for (let e = c; e && e !== fs; e = e.parentElement) if (e.hidden) return true;
  return false;
};
// Texto de un control: su etiqueta sin el texto de los controles, o su nombre accesible
function dpTexto(c) {
  const lb = c.closest("label");
  if (lb && lb.querySelectorAll("input,select").length === 1) {
    const k = lb.cloneNode(true);
    k.querySelectorAll("input,select,datalist,button").forEach(x => x.remove());
    const t = k.textContent.replace(/\s+/g, " ").trim();
    if (t) return t;
  }
  return c.getAttribute("aria-label") || c.placeholder || c.id;
}
// Clave de un control en DP_PEND: su id o, en los botones de opción, «radio:nombre»
const dpClave = c => (c.type === "radio" ? "radio:" + c.name : c.id);
const dpValor = c =>
  c.type === "radio" ? document.querySelector(`input[name="${c.name}"]:checked`)?.value || "" : c.value;
function dpCampo(c) {
  const k = dpClave(c),
    v = k in DP_PEND ? DP_PEND[k] : dpValor(c),
    mod = k in DP_PEND ? " mod" : "",
    a = `data-dp="${esc(k)}"`;
  let ctl, txt;
  if (c.type === "radio") {
    // Los botones de opción del sistema eléctrico se muestran como una lista
    const rs = [...document.querySelectorAll(`input[name="${c.name}"]`)];
    txt = "Sistema eléctrico";
    ctl = `<select ${a} aria-label="${txt}">${rs.map(r => `<option value="${esc(r.value)}"${r.value === v ? " selected" : ""}>${esc(r.closest("label").querySelector(".t")?.firstChild?.textContent.trim() || r.value)}</option>`).join("")}</select>`;
  } else {
    txt = dpTexto(c);
    ctl =
      c.tagName === "SELECT"
        ? `<select ${a} aria-label="${esc(txt)}">${[...c.options].map(o => `<option value="${esc(o.value)}"${o.value === v ? " selected" : ""}>${esc(o.textContent)}</option>`).join("")}</select>`
        : `<input ${a} aria-label="${esc(txt)}" type="${c.type}"${["step", "min", "max", "list", "placeholder"].map(x => (c.getAttribute(x) ? ` ${x}="${esc(c.getAttribute(x))}"` : "")).join("")} value="${esc(v)}">`;
  }
  const ay = c.closest("label")?.dataset.ayuda || c.dataset.ayuda,
    falta = c.classList.contains("falta") || c.classList.contains("inv") ? " tc-falta" : "";
  return `<label class="fc-f fc-e pp-f${mod}${falta}"${ay ? ` data-ayuda="${esc(ay)}"` : ""}><span>${esc(txt)}</span>${ctl}</label>`;
}
// Grupos de un formulario: los datos sueltos y uno por cada elemento de sus listas (cada piso, cada tipo…)
function dpGrupos(fid, excluir) {
  const fs = $(fid);
  if (!fs) return "";
  const lg = fs.querySelector("legend"),
    tit =
      [...lg.childNodes]
        .filter(n => n.nodeType === 3 || n.id)
        .map(n => n.textContent)
        .join("")
        .trim() || lg.textContent,
    norma = lg.querySelector("small")?.textContent || "",
    vistos = new Set(),
    sueltos = [],
    items = new Map();
  fs.querySelectorAll("input,select").forEach(c => {
    if (!c.id && c.type !== "radio") return;
    if (["button", "file", "hidden", "checkbox"].includes(c.type) || dpOculto(c, fs)) return;
    if (excluir.some(id => c.closest("#" + id))) return;
    const k = dpClave(c);
    if (vistos.has(k)) return;
    vistos.add(k);
    const it = c.closest(".item");
    if (it) {
      if (!items.has(it)) items.set(it, []);
      items.get(it).push(c);
    } else sueltos.push(c);
  });
  // Datos sueltos agrupados por su subtítulo del formulario (por ejemplo, Alumbrado o Tomacorrientes en Salidas)
  const sub = c => {
    const p = c.closest(".row3,.row")?.previousElementSibling;
    return p && p.classList.contains("sublabel") ? p.textContent.trim() : "";
  };
  const porSub = new Map();
  sueltos.forEach(c => {
    const k = sub(c);
    if (!porSub.has(k)) porSub.set(k, []);
    porSub.get(k).push(c);
  });
  let h = [...porSub]
    .map(
      ([k, cs], j) =>
        `<fieldset class="fc-g"><legend>${esc(k || tit)}${!j && norma ? ` <small>${esc(norma)}</small>` : ""}</legend>${cs.map(dpCampo).join("")}</fieldset>`
    )
    .join("");
  items.forEach((cs, it) => {
    const ti = it.querySelector(".item-h span")?.textContent || "";
    h += `<fieldset class="fc-g"><legend>${esc(ti)}</legend>${cs.map(dpCampo).join("")}</fieldset>`;
  });
  return h;
}
function renderDatos() {
  if (!DP_PEND) return;
  const P = dpPestanas(),
    p = P.find(x => x[0] === DP_TAB) || P[0];
  DP_TAB = p[0];
  $("dpTabs").innerHTML = P.map(
    ([k, t]) => `<button type="button" role="tab" data-dpt="${k}" aria-selected="${k === DP_TAB}">${t}</button>`
  ).join("");
  const [, , fids, excl = [], add] = p,
    grupos = fids.map(f => dpGrupos(f, excl)).join("");
  // Sin datos que mostrar (por ejemplo, vivienda de un piso): la explicación del formulario
  const vacio = grupos
    ? ""
    : fids
        .map(f => $(f)?.querySelector(".hint")?.textContent.trim())
        .filter(Boolean)
        .map(t => `<p class="fc-nota">${esc(t)}</p>`)
        .join("");
  $("dpBody").innerHTML =
    grupos +
    vacio +
    (add ? `<button type="button" class="vw-btn dp-add" data-dpadd="${add[0]}">${add[1]}</button>` : "") +
    (DP_TAB === "proy"
      ? `<p class="fc-nota">El tipo de edificación (vivienda, edificio u otros usos) se cambia en el panel Propiedades.</p>`
      : "");
  dpPie();
}
// Franja de resultados: con cambios pendientes, la vista previa del cálculo
let DP_T = null;
function dpRes() {
  const el = $("dpRes");
  if (!el) return;
  const hay = Object.keys(DP_PEND || {}).length,
    r = hay ? previaCampos(DP_PEND) : LAST;
  el.className = "tc-res" + (hay ? " previa" : "");
  el.innerHTML = franjaProyecto(r, hay && !!r);
}
function dpPie() {
  clearTimeout(DP_T);
  DP_T = setTimeout(dpRes, 200);
  const n = Object.keys(DP_PEND || {}).length;
  $("dpApply").disabled = !n;
  $("dpNota").textContent = n ? `${n} cambio${n > 1 ? "s" : ""} sin aplicar` : "";
}
// Escribe los valores en los campos del formulario, como si se hubieran escrito allí, y recalcula
function aplicarDatos() {
  const ks = Object.keys(DP_PEND || {});
  if (!ks.length) return;
  ks.forEach(k => {
    if (k.startsWith("radio:")) {
      const r = document.querySelector(`input[name="${k.slice(6)}"][value="${DP_PEND[k]}"]`);
      if (r) {
        r.checked = true;
        r.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return;
    }
    const c = $(k);
    if (!c) return;
    c.value = DP_PEND[k];
    c.dispatchEvent(new Event("input", { bubbles: true }));
    c.dispatchEvent(new Event("change", { bubbles: true }));
  });
  DP_PEND = {};
  calcularAhora();
  histPush();
  toast("Datos aplicados");
  renderDatos();
}
$("dpDlg").addEventListener("input", e => {
  const el = e.target.closest("[data-dp]");
  if (!el || !DP_PEND) return;
  const k = el.dataset.dp,
    act = k.startsWith("radio:")
      ? document.querySelector(`input[name="${k.slice(6)}"]:checked`)?.value || ""
      : ($(k)?.value ?? "");
  if (el.value === act) delete DP_PEND[k];
  else DP_PEND[k] = el.value;
  el.closest(".pp-f").classList.toggle("mod", k in DP_PEND);
  dpPie();
});
$("dpDlg").addEventListener("change", e => {
  if (e.target.matches("select[data-dp]")) e.target.dispatchEvent(new Event("input", { bubbles: true }));
});
$("dpDlg").addEventListener("click", e => {
  const t = e.target.closest("[data-dpt]");
  if (t) {
    DP_TAB = t.dataset.dpt;
    return renderDatos();
  }
  // Agregar un piso o un tipo de departamento: el mismo botón del formulario (se aplica al momento)
  const ad = e.target.closest("[data-dpadd]");
  if (ad) {
    if (Object.keys(DP_PEND).length) return toast("Aplique o cancele primero los cambios");
    $(ad.dataset.dpadd).click();
    histPush();
    renderDatos();
    $("dpBody").lastElementChild?.previousElementSibling?.scrollIntoView({ block: "nearest" });
    return;
  }
  const b = e.target.closest("[data-dpa]");
  if (!b) return;
  const a = b.dataset.dpa;
  if (a === "ok") {
    aplicarDatos();
    datosProyecto(false);
  } else if (a === "apply") aplicarDatos();
  else if (a === "cancel") datosProyecto(false);
  else if (a === "max") DP_VW.maximizar();
});
// Enter en un dato aplica, como en las fichas; Esc cierra sin aplicar
$("dpDlg").addEventListener("keydown", e => {
  if (e.target.matches("[data-dp]") && e.key === "Enter") {
    e.preventDefault();
    e.target.dispatchEvent(new Event("input", { bubbles: true }));
    aplicarDatos();
  }
});
addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("dpDlg").hidden) datosProyecto(false);
});
// Doble clic en Proyecto, Suministro, Vivienda o Salidas del explorador: la pestaña que corresponde
$("exTree").addEventListener("click", e => {
  const n = e.target.closest(
    '[data-node="proyecto"],[data-node="suministro"],[data-node="vivienda"],[data-node="salidas"]'
  );
  if (!n || e.detail !== 2) return;
  const t = { proyecto: "proy", suministro: "sum", vivienda: MODE === "multi" ? "dep" : "viv", salidas: "sal" }[
    n.dataset.node
  ];
  setTimeout(() => datosProyecto(true, t));
});
