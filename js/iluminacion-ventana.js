/* VENTANA «NIVELES DE ILUMINACIÓN»
   Todos los tipos de ambiente del Anexo de la EM.010 (js/iluminacion.js) con su iluminancia de la norma y la del
   proyecto, que el proyectista puede cambiar: un valor distinto queda como criterio y uno menor que el mínimo, «bajo
   norma» (con aviso en la revisión del diseño). También los ambientes propios, para lo que el Anexo no tiene (pista
   de baile, cabina de DJ…). Se abre desde Parámetros, desde la cinta del editor y desde la ventana Ambientes. */
const LX_VW = ventanaMovil(document.querySelector("#luxDlg .vw"), "jmg-electric-iluminacion", {
  w: 980,
  h: 600,
  minW: 640,
  minH: 320
});
let LX_G = "",
  LX_T = null;
function luxAbrir() {
  $("luxDlg").hidden = false;
  vwFondo();
  LX_VW.abrir();
  luxRender();
}
function luxCerrar() {
  $("luxDlg").hidden = true;
  vwFondo();
}
// Tipos de ambiente usados en las áreas del diseño
function luxUsados() {
  const D = typeof dsD === "function" && EPL ? dsD() : PLANO && PLANO.dis;
  return new Set(((D && D.els) || []).filter(e => e.ar && e.ar.amb).map(e => e.ar.amb));
}
function luxRender() {
  if ($("luxDlg").hidden) return;
  const q = $("lxBusca").value.trim().toLowerCase(),
    solo = $("lxCamb").checked,
    usados = luxUsados(),
    n = { crit: 0, bajo: 0 };
  $("lxGrupo").innerHTML =
    `<option value="">Todos los usos</option><option value="usados"${LX_G === "usados" ? " selected" : ""}>Usados en el diseño (${usados.size})</option>` +
    AMB_GRUPOS.map(([g, t]) => `<option value="${g}"${g === LX_G ? " selected" : ""}>${esc(t)}</option>`).join("") +
    `<option value="prop"${LX_G === "prop" ? " selected" : ""}>Propios del proyecto (${LUX.prop.length})</option>`;
  const fila = (k, t) => {
    const cl = { norma: "", criterio: " lx-crit", bajo: " lx-bajo", sin: " lx-sin" }[t.est];
    if (t.est === "criterio") n.crit++;
    if (t.est === "bajo") n.bajo++;
    const ref = [
      t.ugr != null ? `UGR ${t.ugr}` : "",
      t.uo != null ? `Uo ${fmt(t.uo, 2)}` : "",
      t.ra != null ? `Ra ${t.ra}` : ""
    ]
      .filter(Boolean)
      .join(" · ");
    return `<div class="lx-fila${cl}">${
      t.propio
        ? `<input type="text" data-lx-n="${k}" value="${esc(t.n)}" maxlength="60" aria-label="Nombre del ambiente propio">`
        : `<span title="${esc(t.nota || "")}">${esc(t.n)}${usados.has(k) ? ' <i class="lx-uso">en el diseño</i>' : ""}${t.nota ? `<small>${esc(t.nota)}</small>` : ""}</span>`
    }<span class="lx-ref">${t.propio ? "—" : esc(t.em)}</span><span class="am-n">${t.luxN == null ? "—" : fmt(t.luxN, 0)}</span><input type="number" min="0" max="${LUX_MAX}" step="10" data-lx="${k}" value="${t.lux ?? ""}" placeholder="${t.luxN == null ? "escriba" : t.luxN}" aria-label="Iluminancia del proyecto, ${esc(t.n)}"><span class="lx-est">${LUX_EST[t.est]}</span><span class="lx-ugr">${ref}</span>${
      t.propio
        ? `<button type="button" class="vw-btn" data-lx-del="${k}" title="Quitar este ambiente propio">×</button>`
        : `<button type="button" class="vw-btn" data-lx-def="${k}" title="Volver al valor de la norma"${Object.hasOwn(LUX.v, k) ? "" : " disabled"}>↺</button>`
    }</div>`;
  };
  const ok = (k, t) =>
    (!q || `${t.n} ${t.em}`.toLowerCase().includes(q)) &&
    (!solo || t.est !== "norma") &&
    (LX_G !== "usados" || usados.has(k));
  let h = "";
  if (!LX_G || LX_G === "usados" || LX_G === "prop") {
    const P = LUX.prop.map(p => [p.k, ambTipo(p.k)]).filter(([k, t]) => ok(k, t));
    if (P.length || LX_G === "prop")
      h +=
        `<h4>Propios del proyecto <small>criterio del proyectista: lo que el Anexo no tiene</small></h4>` +
        (P.map(([k, t]) => fila(k, t)).join("") ||
          `<p class="rev-ok">Aún no hay ambientes propios. «+ Ambiente propio» agrega uno (pista de baile, cabina de DJ…) con su iluminancia.</p>`);
  }
  AMB_GRUPOS.forEach(([g, tit]) => {
    if (LX_G && LX_G !== "usados" && LX_G !== g) return;
    const L = Object.keys(PL_AMB)
      .filter(k => PL_AMB[k].g === g && k !== "otro")
      .map(k => [k, ambTipo(k)])
      .filter(([k, t]) => ok(k, t));
    if (L.length) h += `<h4>${esc(tit)}</h4>` + L.map(([k, t]) => fila(k, t)).join("");
  });
  $("lxLista").innerHTML =
    `<div class="lx-fila lx-cab"><span>Ambiente</span><span>Ref.</span><span class="am-n">Norma (lx)</span><span>Proyecto (lx)</span><span>Estado</span><span>Referencia</span><span></span></div>` +
    (h || `<p class="rev-ok">Ningún ambiente con ese filtro.</p>`);
  // Cuenta de todos los cambios (no solo de lo visible)
  const todos = [...Object.keys(PL_AMB), ...LUX.prop.map(p => p.k)].map(ambTipo),
    nc = todos.filter(t => t.est === "criterio" && !t.propio).length,
    nb = todos.filter(t => t.est === "bajo").length;
  $("lxCuenta").innerHTML =
    `${nc ? `${nc} criterio` : "Todo según la norma"}${nb ? ` · <b class="lux-bajo">${nb} bajo norma</b>` : ""}${LUX.prop.length ? ` · ${LUX.prop.length} propio${LUX.prop.length === 1 ? "" : "s"}` : ""}`;
}
// Guarda el cambio en el proyecto (y lo recuerda para los proyectos nuevos); refresca lo que muestra niveles
function luxCambio(redibujar = true) {
  luxRecordar();
  clearTimeout(LX_T);
  LX_T = setTimeout(() => {
    saveDraft();
    if (typeof histPush === "function") histPush();
  }, 400);
  if (!$("ambDlg").hidden) ambRender();
  if (ED && ED.abierto) {
    edProps();
    if (typeof elRender === "function") elRender();
  }
  if (redibujar) luxRender();
}
$("luxDlg").addEventListener("click", e => {
  if (e.target.id === "luxDlg") return luxCerrar();
  const b = e.target.closest("[data-lxb]");
  if (b) {
    const a = b.dataset.lxb;
    if (a === "cerrar") return luxCerrar();
    if (a === "max") return LX_VW.maximizar();
    if (a === "nuevo") {
      let i = 1;
      while (LUX.prop.some(p => p.k === "u" + i)) i++;
      if (LUX.prop.length >= 100) return toast("Hasta 100 ambientes propios por proyecto");
      LUX.prop.push({ k: "u" + i, n: "Ambiente propio " + i, lux: null });
      LX_G = "prop";
      luxCambio();
      const el = document.querySelector(`[data-lx-n="u${i}"]`);
      if (el) el.select();
      return;
    }
    if (a === "norma") {
      const n = Object.keys(LUX.v).length;
      if (!n) return toast("Todos los niveles ya son los de la norma");
      return confirmar(
        "Volver a la norma",
        `<p style="margin:0">Los <b>${n}</b> nivel${n === 1 ? "" : "es"} cambiado${n === 1 ? "" : "s"} vuelve${n === 1 ? "" : "n"} al valor de la EM.010. Los ambientes propios no cambian.</p>`,
        "Volver a la norma",
        si => {
          if (!si) return;
          LUX.v = {};
          luxCambio();
          toast("Niveles de iluminación de la EM.010");
        },
        "Iluminación"
      );
    }
  }
  const d = e.target.closest("[data-lx-def]");
  if (d) {
    delete LUX.v[d.dataset.lxDef];
    return luxCambio();
  }
  const x = e.target.closest("[data-lx-del]");
  if (x) {
    const k = x.dataset.lxDel,
      p = LUX.prop.find(q => q.k === k),
      usado = luxUsados().has(k);
    return confirmar(
      "Quitar ambiente propio",
      `<p style="margin:0">¿Quitar «${esc(p ? p.n : k)}»?${usado ? " Las áreas del diseño con este tipo quedarán sin tipo de ambiente." : ""}</p>`,
      "Quitar",
      si => {
        if (!si) return;
        LUX.prop = LUX.prop.filter(q => q.k !== k);
        const D = typeof dsD === "function" && EPL ? dsD() : PLANO && PLANO.dis;
        ((D && D.els) || []).forEach(el => el.ar && el.ar.amb === k && delete el.ar.amb);
        if (usado && typeof edCambio === "function" && ED && ED.abierto) edCambio();
        luxCambio();
      },
      "Iluminación"
    );
  }
});
$("luxDlg").addEventListener("input", e => {
  const t = e.target;
  if (t.id === "lxBusca") return luxRender();
  if (t.dataset.lxN !== undefined) {
    const p = LUX.prop.find(q => q.k === t.dataset.lxN);
    if (p) p.n = t.value.replace(/[<>]/g, "").trim().slice(0, 60) || "Ambiente propio";
    return luxCambio(false);
  }
  const k = t.dataset.lx;
  if (k === undefined) return;
  const v = t.value.trim() === "" ? null : Math.min(LUX_MAX, Math.max(0, Number(t.value)));
  const p = LUX.prop.find(q => q.k === k);
  if (p) p.lux = v === null || !Number.isFinite(v) ? null : v;
  else if (v === null || !Number.isFinite(v) || v === PL_AMB[k].lux) delete LUX.v[k];
  else LUX.v[k] = v;
  // Solo la fila: el cursor sigue en el campo
  const f = t.closest(".lx-fila"),
    tt = ambTipo(k);
  if (f) {
    f.className = "lx-fila" + { norma: "", criterio: " lx-crit", bajo: " lx-bajo", sin: " lx-sin" }[tt.est];
    f.querySelector(".lx-est").textContent = LUX_EST[tt.est];
    const r = f.querySelector("[data-lx-def]");
    if (r) r.disabled = !Object.hasOwn(LUX.v, k);
  }
  luxCambio(false);
});
$("luxDlg").addEventListener("change", e => {
  if (e.target.id === "lxGrupo") {
    LX_G = e.target.value;
    return luxRender();
  }
  if (e.target.id === "lxCamb") return luxRender();
  // Al terminar de escribir, la cuenta y el orden al día
  if (e.target.dataset.lx !== undefined || e.target.dataset.lxN !== undefined) luxRender();
});
$("luxDlg").addEventListener("keydown", e => {
  if (e.key === "Escape") {
    e.preventDefault();
    luxCerrar();
  }
  e.stopPropagation();
});
