/* CUADRO DE CONDUCTORES
   Ventana (cinta: Resultados › Cuadro de conductores) con la sección de cada alimentador y circuito derivado.
   Cada tramo usa por defecto la sección automática: la menor que cumple la capacidad de corriente (Tabla 2 con
   5A y 5C) y la caída de tensión (Regla 050-102). La lista ofrece esa sección y las tres siguientes, que también
   cumplen. Las elecciones quedan pendientes (CD_PEND) hasta «Aplicar» o «Aceptar»: entonces pasan a SECF y
   dimensionar() las aplica (js/calculo.js). La ventana se puede redimensionar; su tamaño se recuerda. */
let CD_PEND = null;
const CD_KEY = "jmg-electric-cuadro-conductores";
function cuadroCond(abrir) {
  if (abrir) {
    if (DESACT) calcularAhora();
    if (!LAST) return toast("Complete los datos para ver los conductores");
    CD_PEND = { ...(SECF[MODE] || {}) };
    tamCond();
  } else CD_PEND = null;
  $("condDlg").hidden = !abrir;
  document.body.classList.toggle("wl-open", abrir);
  if (abrir) renderCond();
}
// Número de elecciones pendientes distintas de las aplicadas
const cdCambios = () => {
  const a = SECF[MODE] || {},
    p = CD_PEND || {};
  return [...new Set([...Object.keys(a), ...Object.keys(p)])].filter(k => a[k] !== p[k]).length;
};
function renderCond() {
  const r = LAST;
  if (!r || !CD_PEND) return;
  const c = r.c,
    sf = SECF[r.mode] || (SECF[r.mode] = {}),
    varios = r.tabs.length > 1;
  const fila = (x, alim) => {
    const key = alim ? "A·" + x.desc : x.key,
      y = alim ? { ...x, alim: true } : x,
      Sa = x.Sauto ?? x.S,
      ia = SECC.indexOf(Sa),
      kc = idxPorCorriente(y, c),
      porDV = kc !== null && SECC[kc] !== Sa,
      ops = x.fail ? [] : SECC.slice(ia, ia + 4),
      dvAc = S => x.dvUp + (x.dVp * x.S) / S,
      uso = usoDV(y, x.S),
      nombre = alim ? x.desc : `${varios ? x.tab + " · " : ""}${x.id} ${x.desc}`;
    // Una elección que ya no es mayor que la automática (por ejemplo, tras alargar el tramo) deja de valer
    if (sf[key] && !x.Sauto) {
      if (CD_PEND[key] === sf[key]) delete CD_PEND[key];
      delete sf[key];
    }
    if (CD_PEND[key] && !(CD_PEND[key] > Sa && ops.includes(CD_PEND[key]))) delete CD_PEND[key];
    const pend = CD_PEND[key] || 0,
      mod = pend !== (sf[key] || 0);
    const sel = ops.length
      ? `<select data-secf="${esc(key)}" aria-label="Sección de ${esc(nombre)}">${ops
          .map(
            (S, i) =>
              `<option value="${i ? S : ""}"${(i ? pend === S : !pend) ? " selected" : ""}>${i ? `${S} mm² · ΔV ${fmt(dvAc(S), 2)} %` : `Automático (${S} mm²)`}</option>`
          )
          .join("")}</select>`
      : `<b>${x.S} mm²</b>`;
    const est = mod
      ? `<span class="pill">Sin aplicar</span>`
      : !x.ok
        ? `<span class="pill bad">No cumple</span>`
        : x.Sauto
          ? `<span class="pill warn">Sección mayor</span>`
          : pocoMargen(y)
            ? `<span class="pill warn">Poco margen</span>`
            : `<span class="pill ok">Cumple</span>`;
    return `<tr${mod ? ' class="cd-mod"' : x.Sauto ? ' class="cd-elegida"' : ""}><td class="t" title="${esc(nombre)}">${esc(nombre)}</td><td>${fmt(x.L, 1)}</td><td>${fmt(x.I, 1)}</td><td>${x.itm ?? "—"}</td><td title="${porDV ? `Definida por la caída de tensión; por corriente bastaría ${SECC[kc]} mm²` : "Definida por la capacidad de corriente"}">${Sa}${porDV ? "<sup>ΔV</sup>" : ""}</td><td class="t">${sel}</td><td>${fmt(alim ? x.dvAc : x.dVt, 2)}</td><td><span class="cd-uso"><i style="width:${Math.min(100, uso * 100).toFixed(0)}%"${uso >= DV_MARGEN ? ' class="w"' : ""}></i></span>${fmt(uso * 100, 0)}</td><td class="t">${est}</td></tr>`;
  };
  const sub = t => `<tr class="grp"><td class="t" colspan="9">${esc(t)}</td></tr>`;
  const circ = r.tabs
    .map(tb => {
      const cs = r.circ.filter(q => q.tab === tb.tab);
      return cs.length ? sub(`Circuitos derivados · ${tb.tab} ${tb.desc}`) + cs.map(q => fila(q, false)).join("") : "";
    })
    .join("");
  $("cdBody").innerHTML =
    `<table><colgroup><col><col class="n"><col class="n"><col class="n"><col class="n"><col class="s"><col class="n"><col class="u"><col class="e"></colgroup><thead><tr><th class="t">Tramo</th><th title="Longitud">L (m)</th><th title="Corriente">I (A)</th><th title="Interruptor termomagnético">ITM (A)</th><th title="Sección mínima que cumple capacidad y caída de tensión; «ΔV» si la define la caída de tensión">Mín. (mm²)</th><th class="t">Sección</th><th title="Caída de tensión acumulada desde el suministro">ΔV total (%)</th><th title="Caída de tensión respecto del límite que le corresponde (Regla 050-102)">Uso ΔV (%)</th><th class="t">Estado</th></tr></thead><tbody>
    ${sub("Alimentadores")}${r.alims.map(a => fila(a, true)).join("")}${circ}</tbody></table>`;
  const n = cdCambios();
  $("cdApply").disabled = !n;
  $("cdAuto").disabled = !Object.keys(CD_PEND).length;
  $("cdNota").textContent = n ? `${n} cambio${n > 1 ? "s" : ""} sin aplicar` : "";
}
function aplicarCond() {
  if (!cdCambios()) return;
  SECF[MODE] = { ...CD_PEND };
  calcularAhora();
  histPush();
  toast("Secciones aplicadas");
  renderCond();
}
// Tamaño de la ventana: el último que dejó el usuario, sin salir de la pantalla
function tamCond() {
  const b = document.querySelector(".cd-box");
  try {
    const t = JSON.parse(localStorage.getItem(CD_KEY) || "null");
    if (t && t.w && t.h) {
      b.style.width = Math.min(t.w, innerWidth - 24) + "px";
      b.style.height = Math.min(t.h, innerHeight - 24) + "px";
    }
    b.classList.toggle("max", !!(t && t.max));
  } catch (e) {}
}
function guardarTamCond() {
  const b = document.querySelector(".cd-box");
  if ($("condDlg").hidden) return;
  try {
    const t = b.classList.contains("max")
      ? { ...JSON.parse(localStorage.getItem(CD_KEY) || "{}"), max: true }
      : { w: b.offsetWidth, h: b.offsetHeight, max: false };
    localStorage.setItem(CD_KEY, JSON.stringify(t));
  } catch (e) {}
}
if (window.ResizeObserver) {
  let tm;
  new ResizeObserver(() => {
    clearTimeout(tm);
    tm = setTimeout(guardarTamCond, 300);
  }).observe(document.querySelector(".cd-box"));
}
$("condDlg").addEventListener("change", e => {
  const s = e.target.closest("[data-secf]");
  if (!s || !CD_PEND) return;
  if (s.value) CD_PEND[s.dataset.secf] = +s.value;
  else delete CD_PEND[s.dataset.secf];
  renderCond();
});
$("condDlg").addEventListener("click", e => {
  const b = e.target.closest("[data-cd]");
  if (!b) return;
  const a = b.dataset.cd;
  if (a === "cancel") cuadroCond(false);
  else if (a === "ok") {
    aplicarCond();
    cuadroCond(false);
  } else if (a === "apply") aplicarCond();
  else if (a === "auto") {
    CD_PEND = {};
    renderCond();
  } else if (a === "max") {
    document.querySelector(".cd-box").classList.toggle("max");
    guardarTamCond();
  }
});
addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("condDlg").hidden) cuadroCond(false);
});
