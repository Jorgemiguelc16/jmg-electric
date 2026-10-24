/* VENTANAS DE ESCRITORIO
   Comportamiento común de las ventanas al estilo de los programas de ingeniería (cuadro de conductores, ficha
   del circuito): se mueven desde la barra de título, se redimensionan desde cualquier borde o esquina
   (elementos .vw-rs con data-rs = n, s, e, w, ne, nw, se o sw), se maximizan con doble clic en la barra o con
   su botón, y recuerdan su posición y tamaño en este navegador. Nunca salen de la pantalla. */
function ventanaMovil(box, clave, def) {
  const MIN = { w: def.minW || 380, h: def.minH || 220 },
    bar = box.querySelector(".vw-bar");
  // Posición y tamaño, siempre dentro de la pantalla
  const poner = g => {
    const W = innerWidth,
      H = innerHeight,
      w = Math.min(W - 16, Math.max(MIN.w, g.w)),
      h = Math.min(H - 16, Math.max(MIN.h, g.h));
    box.style.width = w + "px";
    box.style.height = h + "px";
    box.style.left = Math.max(8, Math.min(g.x, W - w - 8)) + "px";
    box.style.top = Math.max(8, Math.min(g.y, H - h - 8)) + "px";
  };
  const leer = () => ({ x: box.offsetLeft, y: box.offsetTop, w: box.offsetWidth, h: box.offsetHeight });
  const guardar = () => {
    try {
      const t = box.classList.contains("max")
        ? { ...JSON.parse(localStorage.getItem(clave) || "{}"), max: true }
        : { ...leer(), max: false };
      localStorage.setItem(clave, JSON.stringify(t));
    } catch (e) {}
  };
  // Al abrir: la última posición y tamaño que dejó el usuario; si no hay, centrada
  const abrir = () => {
    let t = null;
    try {
      t = JSON.parse(localStorage.getItem(clave) || "null");
    } catch (e) {}
    const w = t?.w || Math.min(def.w, innerWidth - 24),
      h = t?.h || Math.min(def.h, innerHeight - 24);
    poner({ w, h, x: t?.x ?? (innerWidth - w) / 2, y: t?.y ?? (innerHeight - h) / 2 });
    box.classList.toggle("max", !!t?.max);
  };
  const maximizar = () => {
    box.classList.toggle("max");
    guardar();
  };
  box.addEventListener("pointerdown", e => {
    const rs = e.target.closest("[data-rs]"),
      mover = !rs && e.target.closest(".vw-bar") && !e.target.closest("button");
    if (e.button !== 0 || (!rs && !mover) || box.classList.contains("max")) return;
    e.preventDefault();
    const d = rs ? rs.dataset.rs : "",
      g = leer(),
      x0 = e.clientX,
      y0 = e.clientY;
    box.classList.add("mov");
    const mov = ev => {
      const dx = ev.clientX - x0,
        dy = ev.clientY - y0;
      if (!rs) return poner({ ...g, x: g.x + dx, y: g.y + dy });
      let { x, y, w, h } = g;
      if (d.includes("e")) w = g.w + dx;
      if (d.includes("s")) h = g.h + dy;
      // Con los bordes izquierdo y superior, el borde opuesto queda fijo y la ventana no sale de la pantalla
      if (d.includes("w")) {
        w = Math.max(MIN.w, Math.min(g.w - dx, g.x + g.w - 8));
        x = g.x + g.w - w;
      }
      if (d.includes("n")) {
        h = Math.max(MIN.h, Math.min(g.h - dy, g.y + g.h - 8));
        y = g.y + g.h - h;
      }
      poner({ x, y, w, h });
    };
    const soltar = () => {
      removeEventListener("pointermove", mov);
      removeEventListener("pointerup", soltar);
      removeEventListener("pointercancel", soltar);
      box.classList.remove("mov");
      guardar();
    };
    addEventListener("pointermove", mov);
    addEventListener("pointerup", soltar);
    addEventListener("pointercancel", soltar);
  });
  bar.addEventListener("dblclick", e => {
    if (!e.target.closest("button")) maximizar();
  });
  addEventListener("resize", () => {
    if (box.offsetParent) poner(leer());
  });
  return { abrir, maximizar, poner, leer };
}
// Bordes y esquinas para redimensionar, comunes a todas las ventanas
const VW_BORDES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"]
  .map(d => `<i class="vw-rs ${d}" data-rs="${d}"></i>`)
  .join("");
document.querySelectorAll(".vw").forEach(b => b.insertAdjacentHTML("beforeend", VW_BORDES));
// El fondo de la página queda fijo mientras haya alguna ventana o diálogo abierto
const vwFondo = () => document.body.classList.toggle("wl-open", !!document.querySelector(".welcome:not([hidden])"));
/* Vista previa de cambios en campos del formulario (ventanas Parámetros de diseño y Datos del proyecto): pone los
   valores pendientes en sus campos (y en las listas que dependen de ellos), calcula el proyecto y lo deja todo
   como estaba, aunque el cálculo falle. pend: {id: valor} o {"radio:nombre": valor}. Devuelve el resultado o null
   si el proyecto tiene datos pendientes. */
function previaCampos(pend) {
  const ks = Object.keys(pend || {});
  if (!ks.length || !LAST) return null;
  const antes = [];
  try {
    ks.forEach(k => {
      if (k.startsWith("radio:")) {
        const nm = k.slice(6),
          r0 = document.querySelector(`input[name="${nm}"]:checked`),
          r1 = document.querySelector(`input[name="${nm}"][value="${pend[k]}"]`);
        antes.push(() => r0 && (r0.checked = true));
        if (r1) r1.checked = true;
      } else {
        const c = $(k);
        if (!c) return;
        const v0 = c.value;
        antes.push(() => (c.value = v0));
        c.value = pend[k];
      }
    });
    Object.keys(LISTS).forEach(readList);
    if (faltantes().length) return null;
    const c = ctx();
    return MODE === "uni" ? calcUni(c) : calcMulti(c);
  } catch (e) {
    return null;
  } finally {
    antes.reverse().forEach(f => f());
    Object.keys(LISTS).forEach(readList);
    faltantes();
  }
}
// Franja con los resultados principales del proyecto (o su vista previa)
function franjaProyecto(r, prev) {
  if (!r)
    return `<span class="tc-rt">${LAST ? "Con estos datos faltan datos obligatorios para calcular." : "Complete los datos para calcular."}</span>`;
  const a = r.alims[0],
    ok = r.alims.every(x => x.ok) && r.circ.every(q => q.ok),
    dv = Math.max(...r.alims.map(x => x.dvAc), ...r.circ.map(q => q.dVt));
  return `<i class="cd-est ${ok ? "ok" : "bad"}"></i><b>MD ${fmt((r.mode === "multi" ? r.MD : r.md.MD) / 1000, 2)} kW</b><span>Alimentador ${a.s.n}-1×${a.S} mm² · ITM ${a.s.tri ? 3 : 2}×${a.itm ?? "—"} A</span><span>ΔV máx ${fmt(dv, 2)} %</span><span>${r.circ.length} circuitos</span><span class="tc-ok">${ok ? "Conforme" : "Revisar"}</span>${prev ? `<em>Vista previa: así quedaría al aplicar</em>` : ""}`;
}
