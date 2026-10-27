/* DIAGRAMA UNIFILAR
   Dibuja el unifilar en SVG con el cuadro de cargas y el rótulo, y lo convierte a PNG y DXF (AutoCAD). Dos formas:
   horizontal (por defecto: barra horizontal y circuitos hacia abajo) y vertical (opción de la cinta Planos: cada
   tablero es una columna con su barra vertical y un circuito por fila, con sus datos en texto horizontal). */
let UNIF_VERTICAL = false;
try {
  UNIF_VERTICAL = localStorage.getItem("jmg-electric-unif-vertical") === "1";
} catch (e) {}
function unifilar(r, op = {}) {
  // Una lámina: sus tableros (todos, o los que le tocan cuando el plano se divide), si lleva la acometida con el
  // cuadro de cargas (la primera) y su número
  const TABS = op.tabs || r.tabs,
    CAB = op.cab !== false,
    HOJA = op.hoja || "IE-01";
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
  };
  const dif = (x, y) => {
    itm(x, y);
    L(x, y + 24, x, y + 40);
    o.push(`<ellipse cx="${x}" cy="${y + 32}" rx="9" ry="3.8" fill="none" stroke="${INK}" stroke-width="1.2"/>`);
  };
  // Contador de energía (Norma DGE 08-80-22): rectángulo dividido, con «Wh» en la parte inferior
  const kwh = (x, y) => {
    o.push(`<rect x="${x - 12}" y="${y}" width="24" height="28" fill="#fff" stroke="${INK}" stroke-width="1.4"/>`);
    L(x - 12, y + 8, x + 12, y + 8, 1.2);
    T(x, y + 22.5, "Wh", { s: 8.5, b: 1, a: "middle" });
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
    // Circuitos en el orden de sus diferenciales: cada grupo junto, aunque su numeración no sea seguida (los
    // diferenciales se agrupan por fase)
    const gk = q => (c.idMode === "circuito" ? q.key : q.idName),
      cs0 = r.circ.filter(q => q.tab === tb.tab),
      pos = {};
    cs0.forEach((q, i) => {
      if (!(gk(q) in pos)) pos[gk(q)] = i;
    });
    const f = r.alims[tb.feeder],
      cs = cs0.slice().sort((p, q) => pos[gk(p)] - pos[gk(q)]),
      nres = c.reserva,
      col0 = X + 96,
      eqs = equiposDe(tb.tab),
      // Equipos que no van entre la barra y tierra (el DPS sí): franja propia sobre la barra
      eqx = eqs.filter(([k]) => k !== "dps"),
      yb = Y + 46 + (eqx.length ? 54 : 0);
    const fd = r.mode === "uni" && tb.tab === "TG" ? r.alims.slice(1) : [];
    const ncol = cs.length + fd.length + nres,
      xe = col0 + (ncol - 1) * CW + 26;
    T(X + 60, Y + 14, `TABLERO ${tb.tab}`, { s: 11.5, b: 1, f: NAVY });
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
    // Equipos del tablero con su símbolo de la Norma DGE
    if (eqx.length) {
      const ye = Y + 50,
        ex = X + 76,
        wE = 158;
      o.push(
        `<rect x="${ex}" y="${ye}" width="${eqx.length * wE + 8}" height="46" fill="none" stroke="${GR}" stroke-width="0.8" stroke-dasharray="4 3"/>`
      );
      T(ex + 6, ye + 10, "EQUIPOS DEL TABLERO", { s: 6.8, b: 1, f: GR });
      const EQS = {
        rel: ["Relé de tensión", "07-73-01"],
        med: ["Medidor de energía", "08-80-22"],
        ctr: ["Contactor con reloj", "07-72-18 · 08-80-40"]
      };
      eqx.forEach(([k], i) => {
        const sx = ex + 22 + i * wE,
          sy = ye + 29,
          [nom, cod] = EQS[k] || [k, ""];
        if (k === "ctr") {
          simboloDGE(o, "ctr", sx, sy, 1);
          simboloDGE(o, "reloj", sx + 16, sy, 0.85);
        } else simboloDGE(o, k, sx, sy, 1.1);
        const tx = sx + (k === "ctr" ? 30 : 18);
        T(tx, sy - 1, nom, { s: 7.6, b: 1 });
        T(tx, sy + 9, cod, { s: 6.8, f: GR });
      });
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
        // Pararrayos (Norma DGE 07-75-23): rectángulo con flecha
        L(xd, yb + 18, xd, yb + 34, 1.2);
        o.push(`<path d="M${xd - 4} ${yb + 33}L${xd + 4} ${yb + 33}L${xd} ${yb + 40}Z" fill="${INK}"/>`);
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
    if (!tabs.length) return;
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
  /* ---------- Unifilar vertical ---------- */
  const CWV = 460,
    RHV = 30;
  // Interruptor automático y diferencial en horizontal (la corriente va de izquierda a derecha): contacto fijo con
  // aspa en x, pivote de la cuchilla en x + 24
  const itmH = (x, y) => {
    L(x - 3.5, y - 3.5, x + 3.5, y + 3.5);
    L(x + 3.5, y - 3.5, x - 3.5, y + 3.5);
    L(x + 24, y, x + 3, y - 10, 1.6);
  };
  const difH = (x, y) => {
    itmH(x, y);
    L(x + 24, y, x + 40, y);
    o.push(`<ellipse cx="${x + 32}" cy="${y}" rx="3.8" ry="9" fill="none" stroke="${INK}" stroke-width="1.2"/>`);
  };
  const flecha = (x, y) => o.push(`<path d="M${x - 9} ${y - 4}L${x - 9} ${y + 4}L${x} ${y}Z" fill="${INK}"/>`);
  // Alto de una columna (para ordenarlas antes de dibujar)
  const altoCol = tb => {
    const cs = r.circ.filter(q => q.tab === tb.tab),
      eqs = equiposDe(tb.tab),
      fd = r.mode === "uni" && tb.tab === "TG" ? r.alims.slice(1) : [];
    return (
      60 +
      (eqs.some(([k]) => k !== "dps") ? 54 : 0) +
      (eqs.some(([k]) => k === "dps") ? 52 : 0) +
      (fd.length + cs.length + c.reserva) * RHV +
      new Set(cs.map(q => (c.idMode === "circuito" ? q.key : q.idName))).size * 10 +
      70
    );
  };
  // Columna de un tablero: barra vertical en X0 + 40; diferenciales con su barra secundaria; un circuito por fila
  function columna(X0, Y0, tb, { entrada = true, pat = false } = {}) {
    const f = r.alims[tb.feeder],
      gk = q => (c.idMode === "circuito" ? q.key : q.idName),
      cs0 = r.circ.filter(q => q.tab === tb.tab),
      pos = {};
    cs0.forEach((q, i) => {
      if (!(gk(q) in pos)) pos[gk(q)] = i;
    });
    const cs = cs0.slice().sort((p, q) => pos[gk(p)] - pos[gk(q)]),
      eqs = equiposDe(tb.tab),
      eqx = eqs.filter(([k]) => k !== "dps"),
      fd = r.mode === "uni" && tb.tab === "TG" ? r.alims.slice(1) : [],
      xb = X0 + 40;
    T(X0 + 56, Y0 + 14, `TABLERO ${tb.tab}`, { s: 11.5, b: 1, f: NAVY });
    T(X0 + 56, Y0 + 27, `${tb.desc} · Icc ≈ ${fmt(tb.icc, 2)} kA · PdC mín. ${tb.pdc} kA`, { s: 7.8, f: GR });
    if (entrada)
      T(
        X0 + 56,
        Y0 + 39,
        `Llega: ${cond(f.s.n, f.S, f.St)} Cu · ${tub(f.tubo)} · ITM ${f.s.tri ? 3 : 2}×${f.itm} A en ${r.mode === "uni" && tb.feeder > 0 ? "tablero TG" : tb.tab === "TSG" || r.mode === "multi" ? "banco de medidores" : "medidor"}`,
        { s: 7.2, f: GR }
      );
    let y = Y0 + 48;
    // Equipos del tablero con su símbolo de la Norma DGE
    if (eqx.length) {
      const wE = 140;
      o.push(
        `<rect x="${X0 + 56}" y="${y}" width="${Math.min(eqx.length * wE + 8, CWV - 70)}" height="46" fill="none" stroke="${GR}" stroke-width="0.8" stroke-dasharray="4 3"/>`
      );
      T(X0 + 62, y + 10, "EQUIPOS DEL TABLERO", { s: 6.8, b: 1, f: GR });
      const EQS = {
        rel: ["Relé de tensión", "07-73-01"],
        med: ["Medidor de energía", "08-80-22"],
        ctr: ["Contactor con reloj", "07-72-18 · 08-80-40"]
      };
      eqx.forEach(([k], i) => {
        const sx = X0 + 76 + i * wE,
          sy = y + 29,
          [nom, cd] = EQS[k] || [k, ""];
        if (k === "ctr") {
          simboloDGE(o, "ctr", sx, sy, 1);
          simboloDGE(o, "reloj", sx + 16, sy, 0.85);
        } else simboloDGE(o, k, sx, sy, 1.1);
        const tx = sx + (k === "ctr" ? 30 : 18);
        T(tx, sy - 1, nom, { s: 7.4, b: 1 });
        T(tx, sy + 9, cd, { s: 6.6, f: GR });
      });
      y += 54;
    }
    const yb0 = y;
    y += 16;
    // DPS: entre la barra y tierra
    if (eqs.some(([k]) => k === "dps")) {
      dot(xb, y);
      L(xb, y, xb + 50, y);
      L(xb + 50, y, xb + 50, y + 6);
      simboloDGE(o, "dps", xb + 50, y + 16, 1);
      L(xb + 50, y + 26, xb + 50, y + 32, 1.2, "#2f7a4b", "5 3");
      tierra(xb + 50, y + 32);
      T(xb + 64, y + 19, "DPS · protector contra sobretensiones", { s: 7.5, b: 1 });
      y += 52;
    }
    // Alimentadores de los demás tableros (TG de una vivienda)
    fd.forEach(a => {
      const td = r.tabs.find(t => t.feeder === r.alims.indexOf(a));
      dot(xb, y);
      L(xb, y, xb + 60, y);
      itmH(xb + 60, y);
      L(xb + 84, y, xb + 118, y);
      flecha(xb + 126, y);
      T(xb + 134, y - 2, `${td.tab} · alimentador del ${ORD(td.piso)} piso · ${a.s.tri ? 3 : 2}×${a.itm} A`, {
        s: 8,
        b: 1,
        f: CU
      });
      T(
        xb + 134,
        y + 9,
        `${cond(a.s.n, a.S, a.St)} · ${tub(a.tubo)} · I ${fmt(a.I, 1)} A · ΔV ${fmt(a.dVp, 2)} % · L ${fmt(a.L, 0)} m`,
        { s: 7, f: GR }
      );
      y += RHV;
    });
    // Diferenciales con sus circuitos
    const grupos = [];
    cs.forEach(q => {
      const g = grupos[grupos.length - 1];
      if (g && g.k === gk(q)) g.qs.push(q);
      else grupos.push({ k: gk(q), qs: [q] });
    });
    grupos.forEach(g => {
      const q0 = g.qs[0],
        pol = g.qs.some(q => q.f3) ? 4 : 2,
        xs = xb + 66;
      y += 10;
      T(xb + 8, y - 12, `${q0.idName} · ${pol}×${q0.idRat} A · 30 mA · tipo ${q0.idTipo || "A"}`, {
        s: 7,
        b: 1,
        f: NAVY
      });
      dot(xb, y);
      L(xb, y, xb + 12, y);
      difH(xb + 12, y);
      L(xb + 52, y, xs, y);
      if (g.qs.length > 1) L(xs, y, xs, y + (g.qs.length - 1) * RHV, 1.3);
      g.qs.forEach((q, i) => {
        const yq = y + i * RHV;
        if (i) dot(xs, yq);
        L(xs, yq, xs + 10, yq);
        itmH(xs + 10, yq);
        L(xs + 34, yq, xs + 58, yq);
        flecha(xs + 66, yq);
        T(xs + 74, yq - 2, `${q.id}  ${q.desc} · ${q.f3 ? 3 : 2}×${q.itm ?? "—"} A ${q.curva}`, {
          s: 8,
          b: 1,
          f: NAVY
        });
        T(
          xs + 74,
          yq + 9,
          `${cond(q.f3 ? 3 : 2, q.S, q.St)} · ${tub(q.tubo)} · I ${fmt(q.I, 1)} A · ΔV ${fmt(q.dVp, 2)} % · ${fmt(q.P, 0)} W${r.bal && q.fase && q.fase !== "—" && q.fase !== "3φ" ? " · " + q.fase : ""}`,
          { s: 7, f: GR }
        );
      });
      y += g.qs.length * RHV;
    });
    // Reservas equipadas
    for (let j = 0; j < c.reserva; j++) {
      dot(xb, y);
      L(xb, y, xb + 76, y, 1.3, GR, "4 3");
      itmH(xb + 76, y);
      L(xb + 100, y, xb + 124, y, 1.3, GR, "4 3");
      T(xb + 140, y + 3, `${tb.tab === "TSG" ? "S-" : "C-"}${cs.length + j + 1} · Reserva equipada · ITM 2×16 A C`, {
        s: 7.8,
        f: GR
      });
      y += RHV;
    }
    // Barra vertical del tablero y su puesta a tierra
    L(xb, yb0, xb, y, 4, CU);
    if (!entrada) L(xb, Y0 - 6, xb, yb0);
    L(xb, y, xb, y + 26, 1.2, "#2f7a4b", "5 3");
    tierra(xb, y + 26);
    T(xb + 16, y + 30, pat ? `PAT · 1×${r.Selec} mm² Cu · R ≤ 25 Ω` : `Barra de tierra · 1×${f.St} mm² Cu`, {
      s: 7.5,
      f: "#2f7a4b"
    });
    return { w: CWV, h: y + 44 - Y0 };
  }
  // Ordena bloques (ancho, alto) en filas: prueba de 1 a n bloques por fila y elige la proporción más cercana a la
  // de una lámina apaisada (1.41 : 1), contando el espacio del cuadro de cargas, la leyenda y el rótulo
  function ordenar(bloques, x0, y0) {
    const pone = n => {
      let px = x0,
        py = y0,
        fila = 0;
      bloques.forEach((b, i) => {
        if (i && i % n === 0) {
          py += fila + 16;
          px = x0;
          fila = 0;
        }
        b.x = px;
        b.y = py;
        px += b.w + 16;
        fila = Math.max(fila, b.h);
      });
      return { w: Math.max(780, ...bloques.map(b => b.x + b.w)), h: py + fila };
    };
    let mejor = 1,
      dif = Infinity;
    for (let n = 1; n <= bloques.length; n++) {
      const d = pone(n),
        e = Math.abs(Math.log((d.w + 20) / (d.h + 170) / 1.41));
      if (e < dif) {
        dif = e;
        mejor = n;
      }
    }
    return pone(mejor);
  }
  function cuerpoVertical() {
    if (!multi || !CAB) {
      // En la primera lámina de una vivienda, la columna del TG sigue a la acometida; las demás se ordenan a su lado
      const bl = TABS.map(tb => ({ tb, w: CWV, h: altoCol(tb) + 10, tg: CAB && !multi && tb === r.tabs[0] }));
      const dim = ordenar(bl, X, CAB ? 200 : 46);
      bl.forEach(b => columna(b.x, b.y, b.tb, b.tg ? { entrada: false, pat: true } : {}));
      W = dim.w + 20;
      y = dim.h + 8;
      return;
    }
    // Edificio: banco de medidores vertical (una fila por suministro) y luego las columnas de los tableros
    const feeders = r.alims.slice(1),
      RB = 46,
      hb = 70 + feeders.length * RB;
    const bl = [{ banco: 1, w: CWV, h: hb + 10 }, ...TABS.map(tb => ({ tb, w: CWV, h: altoCol(tb) + 10 }))];
    const dim = ordenar(bl, X, 200);
    const b0 = bl[0],
      xb = x;
    T(xb + 20, b0.y + 14, "BANCO DE MEDIDORES · BARRA GENERAL", { s: 11.5, b: 1, f: NAVY });
    T(xb + 20, b0.y + 28, `Icc ≈ ${fmt(r.iccTG, 2)} kA · PdC mín. ${pdcPara(r.iccTG, r.c.pdcMin)} kA`, {
      s: 8.5,
      f: GR
    });
    const yb = b0.y + 46;
    L(xb, 246, xb, yb, 1.3);
    L(xb, yb, xb, yb + feeders.length * RB, 4, CU);
    feeders.forEach((f, i) => {
      const yf = yb + 22 + i * RB,
        tb = r.tabs.find(t => t.feeder === i + 1),
        cant = f.cant || 1;
      dot(xb, yf);
      L(xb, yf, xb + 28, yf);
      o.push(
        `<rect x="${xb + 28}" y="${yf - 12}" width="28" height="24" fill="#fff" stroke="${INK}" stroke-width="1.4"/>`
      );
      L(xb + 34, yf - 12, xb + 34, yf + 12, 1.2);
      T(xb + 45, yf + 3.5, "Wh", { s: 7.5, b: 1, a: "middle" });
      L(xb + 56, yf, xb + 70, yf);
      itmH(xb + 70, yf);
      L(xb + 94, yf, xb + 126, yf);
      flecha(xb + 134, yf);
      T(
        xb + 142,
        yf - 2,
        `${tb ? tb.tab : ""} · ${f.pKey === "servP" ? "Servicios generales" : `${r.T[f.ti].nombre} · ${cant} unidad${cant > 1 ? "es" : ""}`}`,
        { s: 8.5, b: 1, f: NAVY }
      );
      T(
        xb + 142,
        yf + 10,
        `${cant > 1 ? `Wh × ${cant} · ` : ""}${f.s.tri ? 3 : 2}×${f.itm} A · ${cond(f.s.n, f.S, f.St)} · L ${fmt(f.L, 0)} m · ΔV ${fmt(f.dVp, 2)} %`,
        { s: 7.2, f: GR }
      );
    });
    L(xb, yb + feeders.length * RB, xb, yb + feeders.length * RB + 22, 1.2, "#2f7a4b", "5 3");
    tierra(xb, yb + feeders.length * RB + 22);
    T(xb + 16, yb + feeders.length * RB + 26, `PAT · 1×${r.Selec} mm² Cu · R ≤ 25 Ω`, { s: 7.5, f: "#2f7a4b" });
    bl.slice(1).forEach(b => columna(b.x, b.y, b.tb));
    W = dim.w + 20;
    y = dim.h + 8;
  }
  // Acometida y alimentador principal (primera lámina); en las demás, el título de continuación
  if (!CAB) {
    T(X, 26, `DIAGRAMA UNIFILAR · DETALLE DE TABLEROS (continuación de la lámina IE-01)`, { s: 11, b: 1, f: NAVY });
  } else {
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
  }

  if (UNIF_VERTICAL) cuerpoVertical();
  else if (!CAB) {
    y = 46;
    detalle(TABS);
  } else if (!multi) {
    const p = panel(X, 200, r.tabs[0], { entrada: false, pat: true });
    W = p.w + X;
    y = 200 + p.h;
    if (TABS.length > 1) {
      y += 8;
      detalle(TABS.slice(1));
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
    detalle(TABS);
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
  if (CAB) o.push(`<rect x="${bx}" y="10" width="${bw}" height="${rh}" fill="${NAVY}"/>`);
  if (CAB) T(bx + bw / 2, 22, "CUADRO DE CARGAS · EM.010, ART. 8", { s: 8.5, b: 1, a: "middle", f: "#fff" });
  (CAB ? datos : []).forEach(([k, v], i) => {
    const yy = 10 + rh * (i + 1);
    o.push(
      `<rect x="${bx}" y="${yy}" width="${bw}" height="${rh}" fill="${i % 2 ? "#fff" : "#f3f6f9"}" stroke="#bfc8d2" stroke-width=".8"/>`
    );
    T(bx + 8, yy + 12, k, { s: 8.2, f: GR });
    T(bx + bw - 8, yy + 12, v, { s: 8.5, b: 1, a: "end" });
  });
  // Leyenda y rótulo
  // Equipos marcados en algún tablero: se agregan a la leyenda con su símbolo y código DGE
  const conEq = new Set(TABS.flatMap(t => equiposDe(t.tab).map(([k]) => k))),
    ext = [
      conEq.has("dps") && ["dps", "Protector contra sobretensiones (DPS)", "07-75-23"],
      conEq.has("rel") && ["rel", "Relé de tensión (U> U<)", "07-73-01"],
      conEq.has("ctr") && ["ctr", "Contactor", "07-72-18"],
      conEq.has("ctr") && ["reloj", "Reloj horario", "08-80-40"]
    ].filter(Boolean);
  const yr = y + 10,
    hr = 124 + Math.ceil(ext.length / 2) * 32;
  o.push(`<rect x="${X}" y="${yr}" width="330" height="${hr}" fill="none" stroke="${NAVY}" stroke-width="1"/>`);
  T(X + 10, yr + 16, "LEYENDA", { s: 9, b: 1, f: NAVY });
  {
    const lx = X + 24;
    let ly = yr + 30;
    L(lx, ly - 4, lx, ly);
    itm(lx, ly);
    L(lx, ly + 24, lx, ly + 28);
    T(lx + 22, ly + 13, "Interruptor termomagnético (ITM)", { s: 8 });
    T(lx + 22, ly + 23, "07-72-21", { s: 6.8, f: GR });
    const lx2 = X + 180;
    L(lx2, ly - 4, lx2, ly);
    dif(lx2, ly);
    T(lx2 + 22, ly + 13, "Interruptor diferencial 30 mA", { s: 8 });
    T(lx2 + 22, ly + 23, "07-72-17", { s: 6.8, f: GR });
    ly += 46;
    kwh(lx, ly - 4);
    T(lx + 22, ly + 9, "Medidor de energía", { s: 8 });
    T(lx + 22, ly + 19, "08-80-22", { s: 6.8, f: GR });
    tierra(lx2, ly + 4);
    T(lx2 + 22, ly + 9, "Puesta a tierra", { s: 8 });
    T(lx2 + 22, ly + 19, "03-31-44", { s: 6.8, f: GR });
    L(lx - 12, ly + 34, lx + 12, ly + 34, 4, CU);
    T(lx + 22, ly + 37, "Barra de tablero", { s: 8 });
    L(lx2 - 12, ly + 34, lx2 + 12, ly + 34, 1.3, GR, "4 3");
    T(lx2 + 22, ly + 37, "Circuito de reserva", { s: 8 });
    // Equipos del tablero, en dos columnas
    ext.forEach(([k, d, cd], i) => {
      const ex = i % 2 ? lx2 : lx,
        ey = yr + 140 + Math.floor(i / 2) * 32;
      simboloDGE(o, k, ex, ey, k === "rel" || k === "reloj" ? 1 : 1.1);
      T(ex + 22, ey - 1, d.length > 30 ? d.slice(0, d.indexOf(" (")) || d : d, { s: 8 });
      T(ex + 22, ey + 9, cd, { s: 6.8, f: GR });
    });
  }
  const rx = Math.max(X + 350, W - 480),
    rw = W - 20 - rx;
  rotuloSvg(
    o,
    rx,
    yr + hr - 124,
    rw,
    124,
    c.proj,
    `Unifilar ${multi ? "multifamiliar" : "unifamiliar"} · Escala S/E`,
    HOJA + (op.parte ? " · " + op.parte : "")
  );
  if (op.sigue) T(X, yr - 6, `Continúa en la lámina ${op.sigue}`, { s: 8, b: 1, f: CU });
  const H = yr + hr + 16;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Arial, Helvetica, sans-serif"><rect width="${W}" height="${H}" fill="#fff"/><rect x="6" y="4" width="${W - 12}" height="${H - 10}" fill="none" stroke="${NAVY}" stroke-width="1.5"/>${o.join("")}</svg>`;
  return { svg, W, H };
}
/* Láminas del unifilar: la primera (IE-01) lleva la acometida, el medidor o el banco de medidores, el alimentador
   general y, en una vivienda, el tablero general; los demás tableros entran mientras el texto más pequeño del dibujo
   (7 px) siga midiendo al menos 1.8 mm impreso en la lámina elegida (la menor altura de la norma ISO 3098 de
   rotulado técnico, adoptada como criterio); los que no caben pasan a IE-01A, IE-01B… */
const TXT_MIN_MM = 1.8;
const laminaPlano = () => {
  try {
    const l = JSON.parse(localStorage.getItem("jmg-electric-dxf") || "{}").lamina;
    if (LAMINAS[l]) return l;
  } catch (e) {}
  return "A3";
};
function unifilarHojas(r, lam = laminaPlano()) {
  const [lw, lh] = LAMINAS[lam] || LAMINAS.A3,
    cabe = u => Math.min((lw - 20) / u.W, (lh - 20) / u.H) * 7 * 0.72 >= TXT_MIN_MM - 1e-9,
    hojas = [];
  let act = r.mode === "uni" ? [r.tabs[0]] : [],
    cab = true;
  (r.mode === "uni" ? r.tabs.slice(1) : r.tabs).forEach(tb => {
    const prueba = [...act, tb];
    if (cabe(unifilar(r, { tabs: prueba, cab })) || (!act.length && !cab)) act = prueba;
    else {
      hojas.push({ tabs: act, cab });
      act = [tb];
      cab = false;
    }
  });
  hojas.push({ tabs: act, cab });
  const n = hojas.length,
    nom = i => (i ? "IE-01" + "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i - 1] : "IE-01");
  return hojas
    .map((h, i) => ({
      ...unifilar(r, {
        tabs: h.tabs,
        cab: h.cab,
        hoja: nom(i),
        parte: n > 1 ? `${i + 1}/${n}` : "",
        sigue: i < n - 1 ? nom(i + 1) : ""
      }),
      hoja: nom(i),
      lam
    }))
    .map(h => ({ ...h, mm: Math.min((lw - 20) / h.W, (lh - 20) / h.H) * 7 * 0.72 }));
}
/* Rótulo de las láminas (unifilar y alturas): logo, datos del proyecto, plano y número de lámina, dentro del
   recuadro x, y, w, h. El logo vectorial (oculto en pantalla) es el que usa el DXF. */
function rotuloSvg(o, rx, yr, rw, hr, P, plano, lamina) {
  const INK = "#14212e";
  const L = (x1, y1, x2, y2, w = 1.3, col = INK) =>
    o.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}"/>`);
  const T = (x, y, t, { s = 9, b = 0, a = "start", f = INK } = {}) =>
    o.push(
      `<text x="${x}" y="${y}" font-size="${s}"${b ? ' font-weight="700"' : ""} text-anchor="${a}" fill="${f}">${esc(t)}</text>`
    );
  const LY = "#ffd200",
    LB = "#1f2328",
    CU = "#9a5a23",
    NAVY = "#14304f";
  o.push(`<g data-capa="E-ROTULO">`);
  o.push(`<rect x="${rx}" y="${yr}" width="110" height="${hr}" fill="${LB}"/>`);
  if (typeof LOGO_JPG === "string")
    o.push(
      `<image x="${rx}" y="${yr}" width="110" height="${hr}" href="${LOGO_JPG}" preserveAspectRatio="xMidYMid slice"/>`
    );
  o.push(`<g display="none" data-dxf="logo">`);
  // Logo dibujado con figuras rellenas, medido sobre la imagen del logo (200 × 200): así se ve igual en cualquier
  // AutoCAD, sin depender de la fuente. Letras «JMG» de bloques y el rayo amarillo dentro de la M
  {
    // Misma escala que la imagen en pantalla: cubre la caja de 110 de ancho por el alto del rótulo
    const e = Math.max(110, hr) / 200,
      x0 = rx + 55 - 100 * e,
      y0 = yr + hr / 2 - 100 * e,
      fig = pts =>
        o.push(
          `<path d="${pts.map(([u, v], n) => `${n ? "L" : "M"}${px2(x0 + u * e)} ${px2(y0 + v * e)}`).join("")}Z" fill="${LY}"/>`
        ),
      caja = (u1, v1, u2, v2) =>
        fig([
          [u1, v1],
          [u2, v1],
          [u2, v2],
          [u1, v2]
        ]);
    // J
    caja(46.9, 61, 62.3, 121.3);
    caja(17.8, 106.6, 46.9, 121.3);
    caja(17.8, 96, 32.9, 106.6);
    // M: trazos verticales, brazo izquierdo y arranque del derecho
    caja(68.1, 61, 83.1, 121.3);
    fig([
      [68.1, 61],
      [86.3, 61],
      [95, 77.5],
      [83.1, 90]
    ]);
    caja(111.9, 61, 126.9, 121.3);
    fig([
      [109.4, 61],
      [111.9, 61],
      [111.9, 85.6]
    ]);
    // Rayo
    fig([
      [98.1, 61.5],
      [108.8, 61.3],
      [104.6, 85]
    ]);
    fig([
      [98.1, 61.5],
      [104.6, 85],
      [96, 96.3],
      [86.9, 96.3]
    ]);
    fig([
      [104.6, 85],
      [110, 88.1],
      [96, 96.3]
    ]);
    fig([
      [96, 96.3],
      [110, 88.1],
      [90.3, 120]
    ]);
    // G
    caja(133.1, 61, 148.1, 121.3);
    caja(148.1, 61, 182.5, 75);
    caja(156.3, 85, 182.5, 99.4);
    caja(166.9, 99.4, 182.5, 106.6);
    caja(148.1, 106.6, 182.5, 121.3);
    T(x0 + 100 * e, y0 + 140 * e, "PROJECTS & ENERGY", { s: 8, b: 1, a: "middle", f: LY });
  }
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
    T(rx + 118, yy + 12.5, k, { s: 7, b: 1, f: CU });
    T(rx + 205, yy + 12.5, String(v).slice(0, Math.max(20, Math.floor((rw - 215) / 4.6))), {
      s: 8.5,
      b: i === 0 || i === 4,
      f: i === 0 || i === 4 ? NAVY : INK
    });
  });
  o.push(`<rect x="${rx}" y="${yr}" width="${rw}" height="${hr}" fill="none" stroke="${NAVY}" stroke-width="1"/>`);
  o.push(`</g>`);
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
  // Esquema JMG en colores vivos: azul, naranja cobre, cian, verde, rojo y amarillo
  const ACI = {
    "#14212e": 7,
    "#000000": 7,
    "#14304f": 150,
    "#9a5a23": 30,
    "#5a6775": 8,
    "#2f7a4b": 3,
    "#bfc8d2": 8,
    "#ffffff": 255,
    "#ffd200": 2,
    "#1f2328": 250,
    "#b42318": 1,
    "#c62828": 1,
    "#1565c0": 150,
    "#8a9199": 8
  };
  // Rellenos sólidos: los oscuros de las láminas y los colores de las fases (barras del balance, LED)
  const OSCURO = ["#14304f", "#9a5a23", "#1f2328", "#000000", "#c62828", "#1565c0", "#b42318", "#2f7a4b"];
  // Rellenos claros del dibujo de los tableros (gabinete, módulos, riel, canaletas), en grises de AutoCAD para que se
  // vean con volumen como en pantalla; lo que va encima se dibuja en tonos oscuros (esquema JMG)
  const CLARO = {
    "#ffffff": 254,
    "#f3f6f9": 255,
    "#eaf2fb": 255,
    "#e3e9f0": 254,
    "#d9eedf": 254,
    "#e6e9ed": 253,
    "#d5dae0": 253,
    "#c9ced5": 252,
    // Barra de tierra, en verde como en pantalla
    "#2f7a4b": 3
  };
  const SOBRE_CLARO = { "#14212e": 250, "#000000": 250, "#1f2328": 250, "#5a6775": 8, "#bfc8d2": 8, "#8a9199": 8 };
  const claros = [],
    sobreClaro = (x, y) => claros.some(([a, b, w, h]) => x >= a && x <= a + w && y >= b && y <= b + h);
  const col = (c, esTexto, claro) => {
    c = hex(c);
    if (esq === "capas") return 256;
    if (esq === "mono") return 7;
    if (claro && SOBRE_CLARO[c] !== undefined) return SOBRE_CLARO[c];
    // Los textos secundarios (gris en pantalla) van en cian para que se lean bien
    if (esTexto && c === "#5a6775") return 4;
    // El azul de los textos, más claro para que se lea sobre el fondo oscuro de AutoCAD
    if (esTexto && c === "#14304f") return 140;
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
  // Capa: la del propio elemento o la de su grupo (data-capa), o la que corresponde a su tipo
  const capaDe = (el, d) => {
    const g = el.closest ? el.closest("[data-capa]") : null;
    return (g && g.getAttribute("data-capa")) || d;
  };
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
      const capa = capaDe(el, ""),
        cl = sobreClaro((x1 + x2) / 2, (y1 + y2) / 2);
      // Punteadas: la de tierra (verde) en E-TIERRA; las demás (reservas, niveles) en su capa
      if (dash)
        return linea(
          x1,
          y1,
          x2,
          y2,
          capa || (st === "#2f7a4b" ? "E-TIERRA" : "E-RESERVA"),
          esq === "capas" ? 256 : esq === "mono" ? 7 : col(st, false, cl)
        );
      if (sw >= 3)
        return pline(
          [
            [x1, y1],
            [x2, y2]
          ],
          "E-BARRAS",
          esq === "capas" ? 256 : esq === "mono" ? 7 : 30,
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
          col(st, false, cl),
          0.35
        );
      return linea(x1, y1, x2, y2, ly, col(st, false, cl));
    }
    if (t === "rect") {
      const x = n(el.getAttribute("x")),
        y = n(el.getAttribute("y")),
        w = n(el.getAttribute("width")),
        h = n(el.getAttribute("height"));
      if (!st && x === 0 && y === 0) return;
      const cl = sobreClaro(x + w / 2, y + h / 2);
      if (esq === "jmg" && CLARO[fi] && capaDe(el, "") === "E-TABLEROS") {
        solido(x, y, w, h, "E-RELLENOS", CLARO[fi]);
        claros.push([x, y, w, h]);
      } else if (fi && OSCURO.includes(fi)) {
        solido(x, y, w, h, capaDe(el, "E-RELLENOS"), esq === "capas" ? 256 : esq === "mono" ? 9 : col(fi));
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
          marco ? "E-MARCO" : capaDe(el, "E-CUADROS"),
          col(st, false, cl),
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
        capaDe(el, "E-SIMBOLOS"),
        62,
        col(st || fi, false, sobreClaro(n(el.getAttribute("cx")), n(el.getAttribute("cy")))),
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
          capaDe(el, "E-SIMBOLOS"),
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
      return pline(P, capaDe(el, "E-SIMBOLOS"), col(st), 0, true);
    }
    if (t === "path") {
      const P = [];
      (el.getAttribute("d") || "").replace(/([MLZ])\s*([-\d.]+)?[\s,]*([-\d.]+)?/gi, (m, c, a, b) => {
        if (!/z/i.test(c)) P.push([n(a), n(b)]);
        return m;
      });
      if (P.length >= 3) {
        const c = col(fi || st, false, sobreClaro(P[0][0], P[0][1])),
          q = P.length === 4 ? P[3] : P[2];
        add(
          0,
          "SOLID",
          8,
          capaDe(el, "E-SIMBOLOS"),
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
          X(q[0]),
          22,
          Y(q[1]),
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
      let c = col(fi, true, sobreClaro(x, y));
      if (esq === "mono" && fi === "#ffffff") c = 7;
      if (esq === "capas") c = 256;
      add(
        0,
        "TEXT",
        8,
        capaDe(el, "E-TEXTOS"),
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
  const CAPAS = {
    "E-UNIFILAR": [7, "CONTINUOUS"],
    "E-BARRAS": [30, "CONTINUOUS"],
    "E-RESERVA": [8, "DASHED"],
    "E-TIERRA": [3, "CONTINUOUS"],
    "E-SIMBOLOS": [4, "CONTINUOUS"],
    "E-CUADROS": [5, "CONTINUOUS"],
    "E-MARCO": [5, "CONTINUOUS"],
    "E-RELLENOS": [9, "CONTINUOUS"],
    "E-TEXTOS": [7, "CONTINUOUS"],
    "E-ROTULO": [5, "CONTINUOUS"],
    "E-LEYENDA": [4, "CONTINUOUS"],
    "E-ELEVACION": [7, "CONTINUOUS"],
    "E-NIVELES": [8, "DASHED"],
    "E-TUBERIA": [30, "CONTINUOUS"],
    "E-DETALLE": [7, "CONTINUOUS"],
    "E-TABLEROS": [7, "CONTINUOUS"],
    "E-CABLEADO": [7, "CONTINUOUS"],
    "E-NOTAS": [7, "CONTINUOUS"],
    Defpoints: [8, "CONTINUOUS"]
  };
  // Solo las capas que el dibujo usa (código 8 de cada entidad), en el orden de la lista
  const usadas = new Set();
  for (let i = 0; i < E.length; i += 2) if (E[i] === 8) usadas.add(E[i + 1]);
  const capas = Object.keys(CAPAS)
    .filter(k => usadas.has(k))
    .concat([...usadas].filter(k => !CAPAS[k]))
    .map(k => [k, ...(CAPAS[k] || [7, "CONTINUOUS"])]);
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
    // Vista al abrir: centrada en la lámina y con su altura más un margen (como «Zoom extensión»)
    9,
    "$VIEWCTR",
    10,
    f(lam[0] / 2),
    20,
    f(lam[1] / 2),
    9,
    "$VIEWSIZE",
    40,
    f(lam[1] * 1.04),
    0,
    "ENDSEC",
    0,
    "SECTION",
    2,
    "TABLES",
    0,
    "TABLE",
    2,
    "VPORT",
    70,
    1,
    0,
    "VPORT",
    2,
    "*ACTIVE",
    70,
    0,
    10,
    "0.0",
    20,
    "0.0",
    11,
    "1.0",
    21,
    "1.0",
    12,
    f(lam[0] / 2),
    22,
    f(lam[1] / 2),
    13,
    "0.0",
    23,
    "0.0",
    14,
    "10.0",
    24,
    "10.0",
    15,
    "10.0",
    25,
    "10.0",
    16,
    "0.0",
    26,
    "0.0",
    36,
    "1.0",
    17,
    "0.0",
    27,
    "0.0",
    37,
    "0.0",
    40,
    f(lam[1] * 1.04),
    41,
    f(lam[0] / lam[1]),
    42,
    "50.0",
    43,
    "0.0",
    44,
    "0.0",
    50,
    "0.0",
    51,
    "0.0",
    71,
    0,
    72,
    100,
    73,
    1,
    74,
    3,
    75,
    0,
    76,
    0,
    77,
    0,
    78,
    0,
    0,
    "ENDTAB",
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
  const hs = unifilarHojas(r),
    chicas = hs.filter(h => h.mm < TXT_MIN_MM - 1e-9),
    u = { svg: hs.map(h => h.svg).join('</div><div class="unif">') };
  return `<section class="card"><h2><span><span class="num">${nro}</span>Diagrama unifilar</span></h2>
  <div class="unif">${u.svg}</div><div class="body"><p class="hint">Generado automáticamente a partir del cálculo: protecciones, conductores, diferenciales, puesta a tierra y cuadro de cargas exigido por la EM.010 (Art. 8). Se incluye también en la memoria de Excel.${hs.length > 1 ? ` Dividido en ${hs.length} láminas (${hs.map(h => h.hoja).join(", ")})${chicas.length ? "." : " "}${chicas.length ? "" : `para que, impreso en ${hs[0].lam}, ningún texto quede menor de 1.8 mm; la lámina se elige en Planos.`}` : ""}${chicas.length ? ` <strong>Impreso en ${hs[0].lam}, el texto quedaría menor de 1.8 mm (${chicas.map(h => `${h.hoja}: ${fmt(h.mm, 1)} mm`).join(", ")}): elija una lámina más grande en Planos.</strong>` : ""}</p></div></section>`;
}

// Casilla de la cinta (Planos › Unifilar vertical): cambia el dibujo en pantalla y en las descargas
{
  const ck = typeof document !== "undefined" && document.getElementById("optUnifV");
  if (ck && ck.addEventListener) {
    ck.checked = UNIF_VERTICAL;
    ck.addEventListener("change", () => {
      UNIF_VERTICAL = ck.checked;
      try {
        localStorage.setItem("jmg-electric-unif-vertical", UNIF_VERTICAL ? "1" : "0");
      } catch (e) {}
      if (LAST) render(LAST);
    });
  }
}

// Lámina del plano (Planos › Lámina): divide el unifilar en pantalla y en las descargas; es la misma de la ventana DXF
{
  const sl = typeof document !== "undefined" && document.getElementById("optLamina");
  if (sl && sl.addEventListener) {
    sl.value = laminaPlano();
    sl.addEventListener("change", () => {
      try {
        const o = JSON.parse(localStorage.getItem("jmg-electric-dxf") || "{}");
        o.lamina = sl.value;
        localStorage.setItem("jmg-electric-dxf", JSON.stringify(o));
      } catch (e) {}
      if (LAST) render(LAST);
    });
  }
}
