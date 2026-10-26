/* DIAGRAMA UNIFILAR
   Dibuja el unifilar en SVG con el cuadro de cargas y el rótulo, y lo convierte a PNG y DXF (AutoCAD). */
function unifilar(r) {
  const c = r.c,
    o = [],
    a0 = r.alims[0],
    s0 = a0.s,
    multi = r.mode === "multi";
  const INK = "#14212e",
    NAVY = "#14304f",
    CU = "#9a5a23",
    GR = "#5a6775",
    CW = 74;
  const L = (x1, y1, x2, y2, w = 1.3, col = INK, dash) =>
    o.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`
    );
  const T = (x, y, t, { s = 9, b = 0, a = "start", f = INK, rot = 0 } = {}) =>
    o.push(
      `<text x="${x}" y="${y}" font-size="${s}"${b ? ' font-weight="700"' : ""} text-anchor="${a}" fill="${f}"${rot ? ` transform="rotate(${rot} ${x} ${y})"` : ""}>${esc(t)}</text>`
    );
  const dot = (x, y) => o.push(`<circle cx="${x}" cy="${y}" r="2.6" fill="${INK}"/>`);
  const arrow = (x, y) => o.push(`<path d="M${x - 4} ${y - 9}L${x + 4} ${y - 9}L${x} ${y}Z" fill="${INK}"/>`);
  const itm = (x, y) => {
    L(x - 3.5, y - 3.5, x + 3.5, y + 3.5);
    L(x + 3.5, y - 3.5, x - 3.5, y + 3.5);
    L(x, y + 24, x - 10, y + 3, 1.6);
    o.push(`<rect x="${x + 3}" y="${y + 9}" width="5" height="7" fill="none" stroke="${INK}" stroke-width="1"/>`);
  };
  const dif = (x, y) => {
    itm(x, y);
    L(x, y + 24, x, y + 40);
    o.push(`<ellipse cx="${x}" cy="${y + 32}" rx="9" ry="3.8" fill="none" stroke="${INK}" stroke-width="1.2"/>`);
  };
  const kwh = (x, y) => {
    o.push(`<circle cx="${x}" cy="${y + 14}" r="14" fill="#fff" stroke="${INK}" stroke-width="1.4"/>`);
    T(x, y + 17.5, "kWh", { s: 8.5, b: 1, a: "middle" });
  };
  const tierra = (x, y) => {
    L(x - 11, y, x + 11, y, 1.6);
    L(x - 7, y + 4.5, x + 7, y + 4.5, 1.6);
    L(x - 3, y + 9, x + 3, y + 9, 1.6);
  };
  const wrap = (t, n) => {
    const out = [];
    let ln = "";
    String(t)
      .split(/\s+/)
      .forEach(w => {
        if ((ln + " " + w).trim().length > n && ln) {
          out.push(ln);
          ln = w;
        } else ln = (ln + " " + w).trim();
      });
    if (ln) out.push(ln);
    if (out.length > 3) {
      out.length = 3;
      out[2] = out[2].slice(0, n - 1) + "…";
    }
    return out;
  };
  const tub = t => (t.mm ? `Ø${t.mm} mm` : t.pul);
  const cond = (n, S, St) => `${n}-1×${S} + 1×${St}(T) mm²${c.desig ? " " + c.desig : ""}`;

  // Tablero con sus circuitos derivados
  function panel(X, Y, tb, { entrada = true, pat = false } = {}) {
    const f = r.alims[tb.feeder],
      cs = r.circ.filter(q => q.tab === tb.tab),
      nres = c.reserva,
      col0 = X + 96,
      yb = Y + 46;
    const fd = r.mode === "uni" && tb.tab === "TG" ? r.alims.slice(1) : [];
    const ncol = cs.length + fd.length + nres,
      xe = col0 + (ncol - 1) * CW + 26;
    T(X + 60, Y + 14, `TABLERO ${tb.tab}`, { s: 11.5, b: 1, f: NAVY });
    const eqs = equiposDe(tb.tab);
    T(
      X + 60,
      Y + 28,
      `${tb.desc} · Icc ≈ ${fmt(tb.icc, 2)} kA · PdC mín. ${tb.pdc} kA${eqs.length ? ` · Equipos: ${eqs.map(([, d]) => d.c).join(", ")}` : ""}`,
      {
        s: 8.5,
        f: GR
      }
    );

    if (entrada) {
      o.push(`<circle cx="${X + 40}" cy="${Y + 6}" r="3" fill="#fff" stroke="${INK}" stroke-width="1.2"/>`);
      L(X + 40, Y + 9, X + 40, yb);
      T(
        X + 48,
        Y + 40,
        `Llega: ${cond(f.s.n, f.S, f.St)} Cu · ${tub(f.tubo)} · ITM ${f.s.tri ? 3 : 2}×${f.itm} A en ${r.mode === "uni" && tb.feeder > 0 ? "tablero TG" : tb.tab === "TSG" || r.mode === "multi" ? "banco de medidores" : "medidor"}`,
        { s: 7.5, f: GR }
      );
    }
    L(X + 14, yb, xe, yb, 4, CU);
    // Barra / puesta a tierra
    L(X + 14, yb, X + 14, yb + 232, 1.2, "#2f7a4b", "5 3");
    tierra(X + 14, yb + 232);
    T(X + 8, yb + 222, pat ? `PAT · 1×${r.Selec} mm² Cu · R ≤ 25 Ω` : `Barra de tierra · 1×${f.St} mm² Cu`, {
      s: 7.5,
      f: "#2f7a4b",
      rot: -90
    });
    // DPS del tablero: entre la barra y tierra (los demás equipos se nombran bajo el título del tablero)
    if (eqs.length) {
      if (eqs.some(([k]) => k === "dps")) {
        const xd = X + 58;
        L(xd, yb, xd, yb + 18);
        o.push(
          `<rect x="${xd - 9}" y="${yb + 18}" width="18" height="26" fill="#fff" stroke="${INK}" stroke-width="1.2"/>`
        );
        L(xd - 3, yb + 24, xd + 1, yb + 30, 1);
        L(xd + 1, yb + 30, xd - 4, yb + 30, 1);
        L(xd - 4, yb + 30, xd, yb + 37, 1);
        L(xd, yb + 44, xd, yb + 58, 1.2, "#2f7a4b", "5 3");
        tierra(xd, yb + 58);
        T(xd + 12, yb + 34, "DPS", { s: 7.5, b: 1, f: INK });
      }
    }
    // Agrupación de diferenciales
    const grp = [];
    cs.forEach((q, i) => {
      const key = c.idMode === "circuito" ? "c" + i : q.idName;
      const g = grp[grp.length - 1];
      if (g && g.key === key) g.items.push(i);
      else grp.push({ key, items: [i] });
    });
    const X_ = i => col0 + i * CW;
    grp.forEach(g => {
      const xs = g.items.map(X_),
        xc = (xs[0] + xs[xs.length - 1]) / 2,
        q0 = cs[g.items[0]];
      const pol = g.items.some(i => cs[i].f3) ? 4 : 2;
      dot(xc, yb);
      L(xc, yb, xc, yb + 14);
      dif(xc, yb + 14);
      L(xc, yb + 54, xc, yb + 66);
      T(xc + 12, yb + 30, q0.idName, { s: 8, b: 1 });
      T(xc + 12, yb + 40, `${pol}×${q0.idRat} A`, { s: 7.5 });
      T(xc + 12, yb + 50, `30 mA · tipo ${q0.idTipo || "A"}`, { s: 7.5, f: GR });
      if (xs.length > 1) {
        L(xs[0], yb + 66, xs[xs.length - 1], yb + 66, 2);
        xs.forEach(x => dot(x, yb + 66));
      }
      xs.forEach(x => L(x, yb + 66, x, yb + 76));
    });
    for (let j = 0; j < ncol; j++) {
      const x = X_(j),
        q = cs[j],
        a = j >= cs.length ? fd[j - cs.length] : null,
        res = !q && !a;
      if (res || a) {
        dot(x, yb);
        L(x, yb, x, yb + 76);
      }
      itm(x, yb + 76);
      L(x, yb + 100, x, yb + 282, 1.3, res ? GR : INK, res ? "4 3" : null);
      arrow(x, yb + 292);
      if (res) {
        T(x + 12, yb + 92, "ITM", { s: 8, f: GR });
        T(x - 5, yb + 276, "Reserva equipada", { s: 8, f: GR, rot: -90 });
        T(x, yb + 308, `${tb.tab === "TSG" ? "S-" : "C-"}${j - fd.length + 1}`, { s: 9.5, b: 1, a: "middle", f: GR });
        T(x, yb + 322, "Reserva", { s: 8, a: "middle", f: GR });
        continue;
      }
      if (a) {
        const td = r.tabs.find(t => t.feeder === r.alims.indexOf(a));
        T(x + 12, yb + 92, `${a.s.tri ? 3 : 2}×${a.itm ?? "—"} A`, { s: 8, b: 1 });
        T(x - 5, yb + 276, `${cond(a.s.n, a.S, a.St)} · ${tub(a.tubo)}`, { s: 7.5, rot: -90 });
        T(x + 12, yb + 276, `I ${fmt(a.I, 1)} A · ΔV ${fmt(a.dVp, 2)} % · L ${fmt(a.L, 0)} m`, {
          s: 7.5,
          f: GR,
          rot: -90
        });
        T(x, yb + 308, td.tab, { s: 9.5, b: 1, a: "middle", f: CU });
        T(x, yb + 321, "Alimentador", { s: 7.8, a: "middle" });
        T(x, yb + 331.5, `${ORD(td.piso)} piso`, { s: 7.8, a: "middle" });
        T(x, yb + 344, `${fmt(a.P, 0)} W`, { s: 7.5, a: "middle", f: GR });
        continue;
      }
      T(x + 12, yb + 92, `${q.f3 ? 3 : 2}×${q.itm ?? "—"} A ${q.curva}`, { s: 8, b: 1 });
      T(x - 5, yb + 276, `${cond(q.f3 ? 3 : 2, q.S, q.St)} · ${tub(q.tubo)}`, { s: 7.5, rot: -90 });
      T(x + 12, yb + 276, `I ${fmt(q.I, 1)} A · ΔV ${fmt(q.dVp, 2)} %`, { s: 7.5, f: GR, rot: -90 });
      T(x, yb + 308, q.id, { s: 9.5, b: 1, a: "middle", f: NAVY });
      const ls = wrap(q.desc, 13);
      ls.forEach((t, i) => T(x, yb + 321 + i * 10.5, t, { s: 7.8, a: "middle" }));
      T(
        x,
        yb + 321 + ls.length * 10.5 + 2,
        `${fmt(q.P, 0)} W${r.bal && q.fase && q.fase !== "—" && q.fase !== "3φ" ? " · " + q.fase : ""}`,
        { s: 7.5, a: "middle", f: GR }
      );
    }
    return { w: Math.max(xe - X + 20, 560), h: yb - Y + 372 };
  }

  let W = 0,
    y = 0;
  const X = 20,
    x = X + 40;
  // Detalle de tableros en filas (tableros de departamento o de piso)
  function detalle(tabs) {
    L(X, y, X + 10, y, 1, GR);
    T(X + 16, y + 4, "DETALLE DE TABLEROS", { s: 9, b: 1, f: GR });
    y += 24;
    const pw = tb => Math.max(96 + (r.circ.filter(q => q.tab === tb.tab).length + c.reserva - 1) * CW + 46, 560);
    const maxW = Math.max(W, 1400);
    let px = X,
      rowH = 0;
    tabs.forEach(tb => {
      const w = pw(tb);
      if (px > X && px + w > maxW) {
        y += rowH + 8;
        px = X;
        rowH = 0;
      }
      const p = panel(px, y, tb);
      W = Math.max(W, px + p.w);
      px += p.w + 16;
      rowH = Math.max(rowH, p.h);
    });
    y += rowH + 8;
  }
  // Acometida y alimentador principal
  L(x - 12, 14, x + 12, 14, 3);
  L(x, 14, x, 64);
  T(x + 16, 22, "RED DE DISTRIBUCIÓN SECUNDARIA", { s: 10, b: 1, f: NAVY });
  T(x + 16, 35, `${s0.nom} · 60 Hz · Icc en el punto de entrega ${fmt(c.iccE, 1)} kA`, { s: 8.5, f: GR });
  T(x + 16, 56, `Acometida · ${r.conexion}`, { s: 8.5 });
  if (!multi) {
    kwh(x, 64);
    T(x + 20, 82, "Medidor de energía activa", { s: 8.5 });
    L(x, 92, x, 110);
  } else L(x, 64, x, 110);
  itm(x, 110);
  L(x, 134, x, 246);
  T(x + 20, 126, `Interruptor general ${s0.tri ? 3 : 2}×${a0.itm} A · PdC ${a0.pdc} kA`, { s: 9, b: 1 });
  T(x + 16, 162, `Alimentador ${multi ? "general" : "principal"}: ${cond(s0.n, a0.S, a0.St)} Cu · ${tub(a0.tubo)}`, {
    s: 8.5,
    b: 1
  });
  T(x + 16, 175, `L = ${fmt(a0.L, 1)} m · I = ${fmt(a0.I, 2)} A · ΔV = ${fmt(a0.dVp, 2)} %`, { s: 8.5, f: GR });

  if (!multi) {
    const p = panel(X, 200, r.tabs[0], { entrada: false, pat: true });
    W = p.w + X;
    y = 200 + p.h;
    if (r.tabs.length > 1) {
      y += 8;
      detalle(r.tabs.slice(1));
    }
  } else {
    const yb = 246,
      feeders = r.alims.slice(1),
      CF = 200;
    T(x + 20, 214, "BANCO DE MEDIDORES · BARRA GENERAL", { s: 11.5, b: 1, f: NAVY });
    T(x + 20, 228, `Icc ≈ ${fmt(r.iccTG, 2)} kA · PdC mín. ${pdcPara(r.iccTG, r.c.pdcMin)} kA`, { s: 8.5, f: GR });
    const xe = X + 170 + (feeders.length - 1) * CF + 40;
    L(X + 14, yb, xe, yb, 4, CU);
    L(X + 14, yb, X + 14, yb + 180, 1.2, "#2f7a4b", "5 3");
    tierra(X + 14, yb + 180);
    T(X + 8, yb + 172, `PAT · 1×${r.Selec} mm² Cu · R ≤ 25 Ω`, { s: 7.5, f: "#2f7a4b", rot: -90 });
    feeders.forEach((f, i) => {
      const fx = X + 170 + i * CF,
        tb = r.tabs.find(t => t.feeder === i + 1),
        cant = f.cant || 1;
      dot(fx, yb);
      L(fx, yb, fx, yb + 16);
      kwh(fx, yb + 16);
      T(fx + 20, yb + 34, cant > 1 ? `kWh × ${cant}` : "kWh", { s: 8.5 });
      L(fx, yb + 44, fx, yb + 60);
      itm(fx, yb + 60);
      T(fx + 12, yb + 76, `${f.s.tri ? 3 : 2}×${f.itm} A`, { s: 8.5, b: 1 });
      L(fx, yb + 84, fx, yb + 196);
      arrow(fx, yb + 206);
      T(fx + 8, yb + 116, cond(f.s.n, f.S, f.St), { s: 8, b: 1 });
      T(fx + 8, yb + 128, `Cu · ${tub(f.tubo)} · L ${fmt(f.L, 0)} m`, { s: 8, f: GR });
      T(fx + 8, yb + 140, `I ${fmt(f.I, 1)} A · ΔV ${fmt(f.dVp, 2)} %`, { s: 8, f: GR });
      o.push(
        `<rect x="${fx - 72}" y="${yb + 208}" width="144" height="40" fill="#f3f6f9" stroke="${NAVY}" stroke-width="1.3"/>`
      );
      T(fx, yb + 225, tb ? tb.tab : "", { s: 11, b: 1, a: "middle", f: NAVY });
      T(
        fx,
        yb + 240,
        f.pKey === "servP" ? "Servicios generales" : `${r.T[f.ti].nombre} · ${cant} unidad${cant > 1 ? "es" : ""}`,
        { s: 8, a: "middle", f: GR }
      );
    });
    W = xe + 40;
    y = yb + 270;
    detalle(r.tabs);
  }
  W = Math.max(W, 780);
  // Cuadro de datos (EM.010, Art. 8)
  const md = multi ? r.MD : r.md.MD;
  const datos = [
    ["Potencia instalada", `${fmt(r.CI / 1000, 2)} kW`],
    ["Máxima demanda", `${fmt(md / 1000, 2)} kW`],
    ["Potencia a contratar", `${fmt(r.contratada, 1)} kW`],
    ["Tensión / sistema", `${s0.txt} · 60 Hz`],
    ["Número de fases", s0.tri ? (s0.n === 4 ? "3 (3F + N + PE)" : "3 (3F + PE)") : "1 (F + N + PE)"],
    ["Capacidad de ruptura general", `${a0.pdc} kA`],
    ...(multi ? [["Suministros", `${r.units.length} dptos. + servicios generales`]] : [])
  ];
  const bx = W - 300,
    bw = 280,
    rh = 17;
  o.push(`<rect x="${bx}" y="10" width="${bw}" height="${rh}" fill="${NAVY}"/>`);
  T(bx + bw / 2, 22, "CUADRO DE CARGAS · EM.010, ART. 8", { s: 8.5, b: 1, a: "middle", f: "#fff" });
  datos.forEach(([k, v], i) => {
    const yy = 10 + rh * (i + 1);
    o.push(
      `<rect x="${bx}" y="${yy}" width="${bw}" height="${rh}" fill="${i % 2 ? "#fff" : "#f3f6f9"}" stroke="#bfc8d2" stroke-width=".8"/>`
    );
    T(bx + 8, yy + 12, k, { s: 8.2, f: GR });
    T(bx + bw - 8, yy + 12, v, { s: 8.5, b: 1, a: "end" });
  });
  // Leyenda y rótulo
  const yr = y + 10,
    hr = 124;
  o.push(`<rect x="${X}" y="${yr}" width="330" height="${hr}" fill="none" stroke="${NAVY}" stroke-width="1"/>`);
  T(X + 10, yr + 16, "LEYENDA", { s: 9, b: 1, f: NAVY });
  {
    const lx = X + 24;
    let ly = yr + 30;
    L(lx, ly - 4, lx, ly);
    itm(lx, ly);
    L(lx, ly + 24, lx, ly + 28);
    T(lx + 22, ly + 16, "Interruptor termomagnético (ITM)", { s: 8 });
    const lx2 = X + 180;
    L(lx2, ly - 4, lx2, ly);
    dif(lx2, ly);
    T(lx2 + 22, ly + 16, "Interruptor diferencial 30 mA", { s: 8 });
    ly += 46;
    kwh(lx, ly - 4);
    T(lx + 22, ly + 12, "Medidor de energía", { s: 8 });
    tierra(lx2, ly + 4);
    T(lx2 + 22, ly + 12, "Puesta a tierra", { s: 8 });
    L(lx - 12, ly + 34, lx + 12, ly + 34, 4, CU);
    T(lx + 22, ly + 37, "Barra de tablero", { s: 8 });
    L(lx2 - 12, ly + 34, lx2 + 12, ly + 34, 1.3, GR, "4 3");
    T(lx2 + 22, ly + 37, "Circuito de reserva", { s: 8 });
  }
  const rx = Math.max(X + 350, W - 480),
    rw = W - 20 - rx;
  o.push(`<rect x="${rx}" y="${yr}" width="${rw}" height="${hr}" fill="none" stroke="${NAVY}" stroke-width="1"/>`);
  rotuloSvg(
    o,
    rx,
    yr,
    rw,
    hr,
    c.proj,
    `Diagrama unifilar · ${multi ? "Multifamiliar" : "Unifamiliar"} · Escala S/E`,
    "IE-01"
  );
  const H = yr + hr + 16;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Arial, Helvetica, sans-serif"><rect width="${W}" height="${H}" fill="#fff"/><rect x="6" y="4" width="${W - 12}" height="${H - 10}" fill="none" stroke="${NAVY}" stroke-width="1.5"/>${o.join("")}</svg>`;
  return { svg, W, H };
}
/* Rótulo de las láminas (unifilar y alturas): logo, datos del proyecto, plano y número de lámina, dentro del
   recuadro x, y, w, h. El logo vectorial (oculto en pantalla) es el que usa el DXF. */
function rotuloSvg(o, rx, yr, rw, hr, P, plano, lamina) {
  const INK = "#14212e",
    GR = "#5a6775";
  const L = (x1, y1, x2, y2, w = 1.3, col = INK) =>
    o.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}"/>`);
  const T = (x, y, t, { s = 9, b = 0, a = "start", f = INK } = {}) =>
    o.push(
      `<text x="${x}" y="${y}" font-size="${s}"${b ? ' font-weight="700"' : ""} text-anchor="${a}" fill="${f}">${esc(t)}</text>`
    );
  const LY = "#ffd200",
    LB = "#1f2328";
  o.push(`<rect x="${rx}" y="${yr}" width="110" height="${hr}" fill="${LB}"/>`);
  if (typeof LOGO_JPG === "string")
    o.push(
      `<image x="${rx + 1}" y="${yr + (hr - 108) / 2}" width="108" height="108" href="${LOGO_JPG}" preserveAspectRatio="xMidYMid slice"/>`
    );
  o.push(`<g display="none" data-dxf="logo">`);
  T(rx + 55, yr + 62, "JMG", { s: 30, b: 1, a: "middle", f: LY });
  o.push(
    `<path d="M${rx + 59} ${yr + 54}L${rx + 48} ${yr + 72}L${rx + 57} ${yr + 69}Z" fill="${LY}"/><path d="M${rx + 53} ${yr + 67}L${rx + 62} ${yr + 64}L${rx + 50} ${yr + 84}Z" fill="${LY}"/>`
  );
  T(rx + 55, yr + 100, "PROJECTS & ENERGY", { s: 7, b: 1, a: "middle", f: LY });
  o.push(`</g>`);
  const rot = [
    ["PROYECTO", P.nombre || "—"],
    ["PROPIETARIO", P.prop || "—"],
    ["UBICACIÓN", P.ubic || "—"],
    ["PROYECTISTA", (P.proy || "—") + (P.cip ? ` · CIP ${P.cip}` : "")],
    ["PLANO", plano],
    [
      "FECHA · LÁMINA",
      `${new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })} · ${lamina}`
    ]
  ];
  rot.forEach(([k, v], i) => {
    const yy = yr + (i * hr) / 6;
    if (i) L(rx + 110, yy, rx + rw, yy, 0.8, "#bfc8d2");
    T(rx + 118, yy + 12.5, k, { s: 7, b: 1, f: GR });
    T(rx + 205, yy + 12.5, String(v).slice(0, Math.max(20, Math.floor((rw - 215) / 4.6))), {
      s: 8.5,
      b: i === 0 || i === 4
    });
  });
}
/* SVG del unifilar → DXF para AutoCAD (formato R12, en mm sobre la lámina elegida) */
const LAMINAS = { A4: [297, 210], A3: [420, 297], A2: [594, 420], A1: [841, 594] };
function svgDxf(svgTxt, op = {}) {
  const lam = LAMINAS[op.lamina] || LAMINAS.A3,
    esq = op.colores || "jmg";
  const doc = new DOMParser().parseFromString(svgTxt, "image/svg+xml"),
    root = doc.documentElement;
  const W = parseFloat(root.getAttribute("width")) || 1,
    H = parseFloat(root.getAttribute("height")) || 1;
  const k = Math.min((lam[0] - 20) / W, (lam[1] - 20) / H),
    ox = (lam[0] - W * k) / 2,
    oy = (lam[1] - H * k) / 2;
  const n = v => parseFloat(v) || 0,
    f = v => (+v).toFixed(3),
    X = x => f(ox + x * k),
    Y = y => f(oy + (H - y) * k);
  const hex = c => {
    c = (c || "").toLowerCase();
    return c === "#fff" ? "#ffffff" : c;
  };
  // Colores: JMG (azul y cobre) · monocromo (impresión) · por capa (estilo AutoCAD)
  const ACI = {
    "#14304f": 162,
    "#9a5a23": 32,
    "#5a6775": 252,
    "#2f7a4b": 105,
    "#bfc8d2": 253,
    "#ffffff": 255,
    "#ffd200": 2,
    "#1f2328": 250
  };
  const OSCURO = ["#14304f", "#9a5a23", "#1f2328"];
  const col = (c, esTexto) => {
    c = hex(c);
    if (esq === "capas") return 256;
    if (esq === "mono") return 7;
    return ACI[c] ?? 7;
  };
  const E = [],
    add = (...kv) => {
      for (let i = 0; i < kv.length; i += 2) E.push(kv[i], kv[i + 1]);
    };
  const linea = (x1, y1, x2, y2, ly, c) => add(0, "LINE", 8, ly, 62, c, 10, X(x1), 20, Y(y1), 11, X(x2), 21, Y(y2));
  const pline = (pts, ly, c, w, cerrada) => {
    add(0, "POLYLINE", 8, ly, 62, c, 66, 1, 10, "0.0", 20, "0.0", 70, cerrada ? 1 : 0, 40, f(w), 41, f(w));
    pts.forEach(([x, y]) => add(0, "VERTEX", 8, ly, 10, X(x), 20, Y(y)));
    add(0, "SEQEND", 8, ly);
  };
  const solido = (x, y, w, h, ly, c) =>
    add(
      0,
      "SOLID",
      8,
      ly,
      62,
      c,
      10,
      X(x),
      20,
      Y(y),
      11,
      X(x + w),
      21,
      Y(y),
      12,
      X(x),
      22,
      Y(y + h),
      13,
      X(x + w),
      23,
      Y(y + h)
    );
  const enc = t =>
    Array.from(String(t))
      .map(ch => {
        const c = ch.codePointAt(0);
        return c < 128 ? ch : "\\U+" + c.toString(16).toUpperCase().padStart(4, "0");
      })
      .join("");
  const fondos = [];
  root.querySelectorAll("*").forEach(el => {
    const t = el.tagName.toLowerCase(),
      st = hex(el.getAttribute("stroke")),
      fi = hex(el.getAttribute("fill")),
      sw = n(el.getAttribute("stroke-width")) || 1;
    if (t === "line") {
      const dash = el.getAttribute("stroke-dasharray"),
        x1 = n(el.getAttribute("x1")),
        y1 = n(el.getAttribute("y1")),
        x2 = n(el.getAttribute("x2")),
        y2 = n(el.getAttribute("y2"));
      const capa = el.getAttribute("data-capa");
      if (dash) return linea(x1, y1, x2, y2, capa || "E-RESERVA", esq === "capas" ? 256 : esq === "mono" ? 7 : 252);
      if (sw >= 3)
        return pline(
          [
            [x1, y1],
            [x2, y2]
          ],
          "E-BARRAS",
          esq === "capas" ? 256 : esq === "mono" ? 7 : 32,
          sw * k
        );
      const ly = capa || (st === "#2f7a4b" ? "E-TIERRA" : "E-UNIFILAR");
      if (sw >= 1.5)
        return pline(
          [
            [x1, y1],
            [x2, y2]
          ],
          ly,
          col(st),
          0.35
        );
      return linea(x1, y1, x2, y2, ly, col(st));
    }
    if (t === "rect") {
      const x = n(el.getAttribute("x")),
        y = n(el.getAttribute("y")),
        w = n(el.getAttribute("width")),
        h = n(el.getAttribute("height"));
      if (!st && x === 0 && y === 0) return;
      if (fi && OSCURO.includes(fi)) {
        solido(x, y, w, h, "E-RELLENOS", esq === "capas" ? 256 : esq === "mono" ? 9 : col(fi));
        fondos.push([x, y, w, h]);
      }
      if (st) {
        const marco = x === 6 && y === 4;
        pline(
          [
            [x, y],
            [x + w, y],
            [x + w, y + h],
            [x, y + h]
          ],
          marco ? "E-MARCO" : "E-CUADROS",
          col(st),
          marco ? 0.5 : sw >= 1.2 ? 0.25 : 0,
          true
        );
      }
      return;
    }
    if (t === "circle") {
      add(
        0,
        "CIRCLE",
        8,
        "E-SIMBOLOS",
        62,
        col(st || fi),
        10,
        X(n(el.getAttribute("cx"))),
        20,
        Y(n(el.getAttribute("cy"))),
        40,
        f(n(el.getAttribute("r")) * k)
      );
      if (fi && fi !== "#ffffff" && fi !== "none" && n(el.getAttribute("r")) < 4) {
        const cx = n(el.getAttribute("cx")),
          cy = n(el.getAttribute("cy")),
          r = n(el.getAttribute("r"));
        pline(
          [
            [cx - r / 2, cy],
            [cx + r / 2, cy]
          ],
          "E-SIMBOLOS",
          col(fi),
          r * k * 1.6
        );
      }
      return;
    }
    if (t === "ellipse") {
      const cx = n(el.getAttribute("cx")),
        cy = n(el.getAttribute("cy")),
        rx = n(el.getAttribute("rx")),
        ry = n(el.getAttribute("ry")),
        P = [];
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * 2 * Math.PI;
        P.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
      }
      return pline(P, "E-SIMBOLOS", col(st), 0, true);
    }
    if (t === "path") {
      const P = [];
      (el.getAttribute("d") || "").replace(/([MLZ])\s*([-\d.]+)?[\s,]*([-\d.]+)?/gi, (m, c, a, b) => {
        if (!/z/i.test(c)) P.push([n(a), n(b)]);
        return m;
      });
      if (P.length >= 3) {
        const c = col(fi || st);
        add(
          0,
          "SOLID",
          8,
          "E-SIMBOLOS",
          62,
          c,
          10,
          X(P[0][0]),
          20,
          Y(P[0][1]),
          11,
          X(P[1][0]),
          21,
          Y(P[1][1]),
          12,
          X(P[2][0]),
          22,
          Y(P[2][1]),
          13,
          X(P[2][0]),
          23,
          Y(P[2][1])
        );
      }
      return;
    }
    if (t === "text") {
      const x = n(el.getAttribute("x")),
        y = n(el.getAttribute("y")),
        fs = n(el.getAttribute("font-size")) || 9,
        an = el.getAttribute("text-anchor"),
        b = el.getAttribute("font-weight") === "700";
      const tr = (el.getAttribute("transform") || "").match(/rotate\(([-\d.]+)/),
        rot = tr ? -n(tr[1]) : 0,
        j = an === "middle" ? 1 : an === "end" ? 2 : 0;
      let c = col(fi, true);
      if (esq === "mono" && fi === "#ffffff") c = 7;
      if (esq === "capas") c = 256;
      add(
        0,
        "TEXT",
        8,
        "E-TEXTOS",
        62,
        c,
        7,
        b ? "JMG_ARIAL_N" : "JMG_ARIAL",
        10,
        X(x),
        20,
        Y(y),
        40,
        f(fs * 0.72 * k),
        1,
        enc(el.textContent)
      );
      if (rot) add(50, rot.toFixed(2));
      if (j) add(72, j, 11, X(x), 21, Y(y));
    }
  });
  // Lámina: borde del papel (no se imprime en capa DEFPOINTS)
  add(0, "POLYLINE", 8, "Defpoints", 62, 8, 66, 1, 10, "0.0", 20, "0.0", 70, 1);
  [
    [0, 0],
    [lam[0], 0],
    [lam[0], lam[1]],
    [0, lam[1]]
  ].forEach(([x, y]) => add(0, "VERTEX", 8, "Defpoints", 10, f(x), 20, f(y)));
  add(0, "SEQEND", 8, "Defpoints");
  const capas = [
    ["E-UNIFILAR", 7, "CONTINUOUS"],
    ["E-BARRAS", 30, "CONTINUOUS"],
    ["E-RESERVA", 8, "DASHED"],
    ["E-TIERRA", 3, "CONTINUOUS"],
    ["E-SIMBOLOS", 4, "CONTINUOUS"],
    ["E-CUADROS", 5, "CONTINUOUS"],
    ["E-MARCO", 5, "CONTINUOUS"],
    ["E-RELLENOS", 9, "CONTINUOUS"],
    ["E-TEXTOS", 7, "CONTINUOUS"],
    ["Defpoints", 8, "CONTINUOUS"]
  ];
  const head = [
    0,
    "SECTION",
    2,
    "HEADER",
    9,
    "$ACADVER",
    1,
    "AC1009",
    9,
    "$DWGCODEPAGE",
    3,
    "ANSI_1252",
    9,
    "$INSBASE",
    10,
    "0.0",
    20,
    "0.0",
    30,
    "0.0",
    9,
    "$EXTMIN",
    10,
    "0.0",
    20,
    "0.0",
    30,
    "0.0",
    9,
    "$EXTMAX",
    10,
    f(lam[0]),
    20,
    f(lam[1]),
    30,
    "0.0",
    9,
    "$LIMMIN",
    10,
    "0.0",
    20,
    "0.0",
    9,
    "$LIMMAX",
    10,
    f(lam[0]),
    20,
    f(lam[1]),
    9,
    "$LTSCALE",
    40,
    "1.0",
    0,
    "ENDSEC",
    0,
    "SECTION",
    2,
    "TABLES",
    0,
    "TABLE",
    2,
    "LTYPE",
    70,
    2,
    0,
    "LTYPE",
    2,
    "CONTINUOUS",
    70,
    0,
    3,
    "Solid line",
    72,
    65,
    73,
    0,
    40,
    "0.0",
    0,
    "LTYPE",
    2,
    "DASHED",
    70,
    0,
    3,
    "__  __  __",
    72,
    65,
    73,
    2,
    40,
    f(Math.max(3, 6 * k)),
    49,
    f(Math.max(2, 4 * k)),
    49,
    f(-Math.max(1, 2 * k)),
    0,
    "ENDTAB",
    0,
    "TABLE",
    2,
    "LAYER",
    70,
    capas.length,
    ...capas.flatMap(([nm, c, lt]) => [0, "LAYER", 2, nm, 70, 0, 62, c, 6, lt]),
    0,
    "ENDTAB",
    0,
    "TABLE",
    2,
    "STYLE",
    70,
    2,
    0,
    "STYLE",
    2,
    "JMG_ARIAL",
    70,
    0,
    40,
    "0.0",
    41,
    "1.0",
    50,
    "0.0",
    71,
    0,
    42,
    "2.5",
    3,
    "arial.ttf",
    4,
    "",
    0,
    "STYLE",
    2,
    "JMG_ARIAL_N",
    70,
    0,
    40,
    "0.0",
    41,
    "1.0",
    50,
    "0.0",
    71,
    0,
    42,
    "2.5",
    3,
    "arialbd.ttf",
    4,
    "",
    0,
    "ENDTAB",
    0,
    "ENDSEC",
    0,
    "SECTION",
    2,
    "ENTITIES"
  ];
  const all = [...head, ...E, 0, "ENDSEC", 0, "EOF"];
  let out = "";
  for (let i = 0; i < all.length; i += 2) out += String(all[i]).padStart(3, " ") + "\r\n" + all[i + 1] + "\r\n";
  return out;
}
function svgPng(svg, scale = 2) {
  return new Promise((ok, ko) => {
    const img = new Image();
    img.onload = () => {
      try {
        const cv = document.createElement("canvas");
        cv.width = img.width * scale;
        cv.height = img.height * scale;
        const g = cv.getContext("2d");
        g.fillStyle = "#fff";
        g.fillRect(0, 0, cv.width, cv.height);
        g.drawImage(img, 0, 0, cv.width, cv.height);
        ok(cv.toDataURL("image/png"));
      } catch (e) {
        ko(e);
      }
    };
    img.onerror = () => ko(new Error("No se pudo dibujar el diagrama"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
}
function cardUnifilar(r, nro) {
  const u = unifilar(r);
  return `<section class="card"><h2><span><span class="num">${nro}</span>Diagrama unifilar</span></h2>
  <div class="unif">${u.svg}</div><div class="body"><p class="hint">Generado automáticamente a partir del cálculo: protecciones, conductores, diferenciales, puesta a tierra y cuadro de cargas exigido por la EM.010 (Art. 8). Se incluye también en la memoria de Excel.</p></div></section>`;
}
