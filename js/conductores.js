/* CUADRO DE CONDUCTORES
   Ventana (cinta: Resultados › Cuadro de conductores) con la sección de cada alimentador y circuito derivado.
   Cada tramo usa por defecto la sección automática: la menor que cumple la capacidad de corriente (Tabla 2 con
   5A y 5C) y la caída de tensión (Regla 050-102). La lista ofrece esa sección y las tres siguientes, que también
   cumplen; la elegida se guarda en SECF y dimensionar() la aplica (js/calculo.js). */
function cuadroCond(abrir) {
  if (abrir) {
    if (DESACT) calcularAhora();
    if (!LAST) return toast("Complete los datos para ver los conductores");
  }
  $("condDlg").hidden = !abrir;
  document.body.classList.toggle("wl-open", abrir);
  if (abrir) renderCond();
}
function renderCond() {
  const r = LAST;
  if (!r) return cuadroCond(false);
  const c = r.c,
    sf = SECF[r.mode] || {},
    varios = r.tabs.length > 1;
  const fila = (x, alim) => {
    const key = alim ? "A·" + x.desc : x.key,
      y = alim ? { ...x, alim: true } : x,
      Sa = x.Sauto ?? x.S,
      kc = idxPorCorriente(y, c),
      ops = x.fail ? [] : SECC.slice(SECC.indexOf(Sa), SECC.indexOf(Sa) + 4),
      dvAc = S => x.dvUp + (x.dVp * x.S) / S,
      uso = usoDV(y, x.S),
      nombre = alim ? x.desc : `${varios ? x.tab + " · " : ""}${x.id} ${x.desc}`;
    // Una elección que ya no es mayor que la automática (por ejemplo, tras alargar el tramo) deja de valer
    if (sf[key] && !x.Sauto) delete sf[key];
    const sel = ops.length
      ? `<select class="cd-sel" data-secf="${esc(key)}" aria-label="Sección de ${esc(nombre)}">${ops
          .map(
            (S, i) =>
              `<option value="${i ? S : ""}"${(i ? x.Sauto && S === x.S : !x.Sauto) ? " selected" : ""}>${i ? "" : "Automático · "}${S} mm² · ΔV ${fmt(dvAc(S), 2)} %</option>`
          )
          .join("")}</select>`
      : `<b>${x.S} mm²</b>`;
    const est = !x.ok
      ? `<span class="pill bad">No cumple</span>`
      : x.Sauto
        ? `<span class="pill warn">Sección mayor</span>`
        : pocoMargen(y)
          ? `<span class="pill warn">Poco margen</span>`
          : `<span class="pill ok">Cumple</span>`;
    return `<tr${x.Sauto ? ' class="cd-elegida"' : ""}><td class="t">${esc(nombre)}</td><td>${fmt(x.L, 1)}</td><td>${fmt(x.I, 1)}</td><td>${x.itm ?? "—"} A</td><td>${Sa} mm²<small>${kc === null || SECC[kc] === Sa ? "por corriente" : `por ΔV · corriente: ${SECC[kc]}`}</small></td><td class="t">${sel}</td><td>${fmt(alim ? x.dvAc : x.dVt, 2)}<small>tramo ${fmt(x.dVp, 2)}</small></td><td><span class="cd-uso"><i style="width:${Math.min(100, uso * 100).toFixed(0)}%"${uso >= DV_MARGEN ? ' class="w"' : ""}></i></span>${fmt(uso * 100, 0)} %</td><td class="t">${est}</td></tr>`;
  };
  const sub = t => `<tr class="grp"><td class="t" colspan="9">${esc(t)}</td></tr>`;
  const circ = r.tabs
    .map(tb => {
      const cs = r.circ.filter(q => q.tab === tb.tab);
      return cs.length ? sub(`Circuitos derivados · ${tb.tab} ${tb.desc}`) + cs.map(q => fila(q, false)).join("") : "";
    })
    .join("");
  $("cdBody").innerHTML =
    `<div class="tbl-wrap cd-wrap"><table class="cd-t"><thead><tr><th class="t">Tramo</th><th>L (m)</th><th>I (A)</th><th>ITM</th><th>Mínima que cumple</th><th class="t">Sección</th><th>ΔV total (%)</th><th>Uso del límite</th><th class="t">Estado</th></tr></thead><tbody>
    ${sub("Alimentadores")}${r.alims.map(a => fila(a, true)).join("")}${circ}</tbody></table></div>
    <p class="hint">Límites de caída de tensión (Regla 050-102): alimentadores 2.5 %; circuitos derivados 2.5 % y 4 % en total desde el suministro. «Uso del límite» compara la caída de tensión con el límite que le corresponde. «Poco margen»: el tramo usa el ${fmt(DV_MARGEN * 100, 0)} % o más del límite de caída de tensión o de la capacidad del conductor. Al cambiar la sección de un alimentador cambia la caída disponible para sus circuitos.</p>`;
  $("cdAuto").hidden = !Object.keys(sf).length;
}
function elegirSeccion(cambio) {
  cambio(SECF[MODE] || (SECF[MODE] = {}));
  calcularAhora();
  histPush();
  if (LAST) renderCond();
}
$("condDlg").addEventListener("change", e => {
  const s = e.target.closest("[data-secf]");
  if (!s) return;
  elegirSeccion(m => {
    if (s.value) m[s.dataset.secf] = +s.value;
    else delete m[s.dataset.secf];
  });
  toast(s.value ? `Sección elegida: ${s.value} mm²` : "Sección automática");
});
$("condDlg").addEventListener("click", e => {
  const b = e.target.closest("[data-cd]");
  if (e.target.id === "condDlg" || (b && b.dataset.cd === "close")) return cuadroCond(false);
  if (b && b.dataset.cd === "auto") {
    elegirSeccion(m => Object.keys(m).forEach(k => delete m[k]));
    toast("Todas las secciones en automático");
  }
});
addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("condDlg").hidden) cuadroCond(false);
});
