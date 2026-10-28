/* LÁMINA DEL TABLERO GENERAL DEL EDIFICIO (IE-05, solo edificios)
   Entre la caja toma de la concesionaria y el banco de medidores: el interruptor general del alimentador general
   (en caja moldeada) y las barras de cobre N, R, S y T, de las que sale con pletina y perno la fase de cada
   suministro (la que le asigna el balance) y su neutro, hacia su medidor. Como en el detalle de tableros: vista de
   la puerta con su señal, vista interior con los conductores en sus colores, datos del tablero y cuadro de
   conexiones; abajo, notas y rótulo. Interruptor, conductores y fases salen del cálculo; las dimensiones del
   gabinete y de las barras son del fabricante. Nada de esto cambia el cálculo. */
function tableroGeneral(r) {
  if (r.mode !== "multi") return null;
  const c = r.c,
    o = [],
    { L, T, R, C } = trazos(o);
  const INK = "#14212e",
    NAVY = "#14304f",
    CU = "#9a5a23",
    GR = "#5a6775",
    LN = "#bfc8d2",
    VE = "#2f7a4b",
    W = 1123;
  // Conductores como se ven en obra: R rojo, S negro, T azul, N blanco (con borde gris para que se vea), PE verde-amarillo
  const COL = { R: "#c62828", S: "#000000", T: "#1565c0", N: "#ffffff" },
    colTxt = f => (f === "N" ? GR : f === "S" ? INK : COL[f] || INK);
  const cable = (x1, y1, x2, y2, f, w = 1.4) => {
    const ln = (col, ww, dash) =>
      o.push(
        `<line x1="${px2(x1)}" y1="${px2(y1)}" x2="${px2(x2)}" y2="${px2(y2)}" stroke="${col}" stroke-width="${ww}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ""} data-capa="E-CABLEADO"/>`
      );
    if (f === "PE") {
      ln(VE, w + 0.4);
      ln("#ffd200", w * 0.6, "3 3");
    } else if (f === "N") {
      ln("#8a9199", w + 0.8);
      ln("#ffffff", w * 0.55);
    } else ln(COL[f] || INK, w);
  };
  // Recorrido de un cable por varios puntos
  const tramo = (pts, f, w) => pts.slice(1).forEach((p, i) => cable(pts[i][0], pts[i][1], p[0], p[1], f, w));
  const perno = (x, y, rr = 2.6) => {
    C(x, y, rr, { fi: "#fff", st: INK, sw: 0.7 });
    L(x - rr * 0.6, y, x + rr * 0.6, y, 0.6);
  };
  const sis = SIST[r.sk],
    tri = sis.tri,
    conN = !tri || sis.n === 4,
    gen = r.alims[0],
    polos = tri ? ["R", "S", "T"] : ["R"],
    barras = [...(conN ? ["N"] : []), ...polos],
    nomF = f => (f === "R" && !tri ? "F" : f),
    M = suministrosBanco(r);
  // Salidas: una por fase de cada suministro (el TSG trifásico toma R, S y T) y su neutro
  const filas = [];
  M.forEach(m => (m.tri ? polos : [tri ? m.fase : "R"]).forEach(f => filas.push({ m, f })));
  const cond = (n, S, St) => `${n}-1×${S} + 1×${St}(T) mm²`;

  T(20, 28, "TABLERO GENERAL DEL EDIFICIO", { s: 13, b: 1, f: NAVY });
  T(
    20,
    43,
    "Vista de la puerta y vista interior esquemática · interruptor general y barras de cobre hacia el banco de medidores · escala S/E",
    { s: 8.5, f: GR }
  );
  const yb = 58;
  T(20, yb + 14, "TABLERO TG", { s: 11, b: 1, f: NAVY });
  T(
    150,
    yb + 14,
    `Tablero general · ${sis.txt} · PdC ${gen.pdc} kA · interruptor general ${polos.length}×${gen.itm} A · ${M.length} suministros · llega de la caja toma F1`,
    { s: 8, f: GR }
  );
  const yc = yb + 24,
    x0 = 214,
    gw = 560;
  // Alturas de la vista interior
  const my = yc + 34,
    np = polos.length,
    pp = 26,
    mw = np * pp + 18,
    mh = 116,
    // Una zona por fase, cada una con su barra y las salidas que toman esa fase (sin cruzar otras barras)
    porFase = polos.map(f => filas.filter(x => x.f === f)),
    paso = 18,
    yB1 = my + mh + 46,
    yB2 = yB1 + 16 + Math.max(1, ...porFase.map(z => z.length)) * paso,
    yN = yB2 + 24,
    yDin = yN + 26,
    yPE = yDin + 42,
    bh = yPE + 40 - yc;
  o.push(`<g data-capa="E-TABLEROS">`);

  /* ---------- Vista de la puerta ---------- */
  R(30, yc, 160, bh, { fi: "#e6e9ed", sw: 1.4 });
  R(37, yc + 7, 146, bh - 14, { fi: "#f3f6f9", sw: 0.9 });
  R(170, yc + bh / 2 - 14, 5, 28, { fi: INK, sw: 0.8 });
  senalRiesgoTexto(o, 75, yc + 22, 70);
  R(70, yc + 140, 80, 22, { fi: "#fff", sw: 0.9 });
  T(110, yc + 155, "TG", { s: 9, b: 1, a: "middle", f: NAVY });
  T(110, yc + 176, "Tablero general", { s: 7, a: "middle", f: GR });
  // Bisagras y chapas
  [yc + 24, yc + bh - 34].forEach(y => R(31, y, 5, 10, { fi: "#c9ced5", st: GR, sw: 0.6 }));
  T(110, yc + bh + 14, "VISTA DE LA PUERTA", { s: 7, b: 1, a: "middle", f: GR });

  /* ---------- Vista interior ---------- */
  R(x0, yc, gw, bh, { sw: 1.4 });
  R(x0 + 6, yc + 6, gw - 12, bh - 12, { st: LN, sw: 0.7 });
  T(x0 + gw / 2, yc + bh + 14, "VISTA INTERIOR (SIN PUERTA)", { s: 7, b: 1, a: "middle", f: GR });
  // Interruptor general en caja moldeada: bornes con tornillos arriba y abajo, etiqueta, unidad de disparo y palanca
  const mx = x0 + 120,
    bx = i => mx + 9 + pp * (i + 0.5);
  R(mx, my, mw, mh, { fi: "#1f2328", sw: 1.2 });
  polos.forEach((f, i) => {
    [my + 4, my + mh - 18].forEach(y => {
      R(bx(i) - 9, y, 18, 14, { fi: "#c9ced5", st: GR, sw: 0.5 });
      C(bx(i), y + 7, 3.2, { fi: "#fff", st: GR, sw: 0.6 });
    });
  });
  R(mx + 6, my + 24, mw - 12, 10, { fi: "#c9ced5", st: "", sw: 0 });
  T(mx + mw / 2, my + 31.5, `${np}P · ${gen.itm} A`, { s: 6.4, b: 1, a: "middle" });
  R(mx + 8, my + 40, mw * 0.5, 24, { fi: "#d9eedf", st: GR, sw: 0.6 });
  T(mx + 8 + mw * 0.25, my + 55, `${gen.itm} A`, { s: 7, b: 1, a: "middle" });
  R(mx + mw - 26, my + 40, 16, 34, { fi: "#e6e9ed", st: "", sw: 0 });
  R(mx + mw - 22, my + 44, 8, 12, { fi: INK, st: "", sw: 0 });
  T(mx + 10, my + 80, `Icu ${gen.pdc} kA`, { s: 6.2, f: "#fff" });
  T(mx + mw + 12, my + 22, "INTERRUPTOR GENERAL", { s: 7.6, b: 1, f: NAVY });
  T(mx + mw + 12, my + 35, `${np}×${gen.itm} A · ${gen.pdc} kA · caja moldeada`, { s: 7.4, b: 1 });
  T(mx + mw + 12, my + 48, "Protege el alimentador general (lámina IE-01)", { s: 6.8, f: GR });
  // Llegada desde la caja toma: fases al interruptor, neutro directo a su barra y tierra a la barra de tierra
  T(mx + mw + 12, yc + 18, `Llega de la caja toma F1 · ${cond(tri ? sis.n : 2, gen.S, gen.St)}`, {
    s: 7,
    b: 1,
    f: NAVY
  });
  polos.forEach((f, i) =>
    tramo(
      [
        [bx(i), yc + 6],
        [bx(i), my + 4]
      ],
      f,
      2.6
    )
  );
  /* Barras de cobre: una vertical por fase, cada una en su zona, y el neutro horizontal abajo, a lo ancho. Cada salida
     toma con un perno la fase de su barra y la lleva con cable aislado a su borne de fase; su neutro sale del borne
     vecino y baja por su zona hasta la barra N. Así ningún conductor pasa sobre otra barra. */
  const zx = x0 + 22,
    zw = (gw - 44) / np,
    zL = z => zx + z * zw,
    xBarZ = z => zL(z) + 16,
    bw = 12;
  polos.forEach((f, z) => {
    const xb = xBarZ(z);
    [yB1 - 8, yB2 - 4].forEach(y => R(xb - 4, y, bw + 8, 12, { fi: CU, st: "", sw: 0 }));
    R(xb, yB1 - 4, bw, yB2 - yB1 + 8, { fi: COL[f], st: "", sw: 0 });
    perno(xb + bw / 2, yB1 - 2, 3);
    perno(xb + bw / 2, yB2 + 2, 3);
    T(xb + bw / 2, yB1 - 14, nomF(f), { s: 7.4, b: 1, a: "middle", f: colTxt(f) });
  });
  const cx = f => xBarZ(polos.indexOf(f)) + bw / 2;
  // Del interruptor a la cabeza de cada barra, sin cruzarse: T arriba, S al medio y R abajo
  polos.forEach((f, i) => {
    const yv = my + mh + 12 + (np - 1 - i) * 7;
    tramo(
      [
        [bx(i), my + mh],
        [bx(i), yv],
        [cx(f), yv],
        [cx(f), yB1 - 2]
      ],
      f,
      3.2
    );
  });
  // Barra de neutro (blanca con borde gris; en AutoCAD, gris claro, para no confundirla con la S negra)
  if (conN) {
    R(zx, yN - 5, gw - 44, 10, { fi: "#e6e9ed", st: GR, sw: 0.8 });
    [zx - 8, zx + gw - 44].forEach(x => R(x, yN - 6, 8, 12, { fi: CU, st: "", sw: 0 }));
    T(zx + gw - 50, yN + 16, "Barra de neutro (N)", { s: 6.8, b: 1, a: "end", f: GR });
    tramo(
      [
        [x0 + 16, yc + 6],
        [x0 + 16, yN],
        [zx, yN]
      ],
      "N",
      3.2
    );
  }
  // Salidas de cada zona: perno en la barra, cable a su borne de fase, borne de neutro y su bajada a la barra N
  const yaN = new Set();
  porFase.forEach((zona, z) => {
    const f = polos[z],
      xb = cx(f),
      xF = zL(z) + 52,
      xNb = xF + 12;
    zona.forEach((sa, k) => {
      const y = yB1 + 16 + k * paso;
      perno(xb, y, 2.4);
      cable(xb + 3, y, xF - 4, y, f, 1.4);
      R(xF - 4, y - 5, 8, 10, { fi: "#c9ced5", st: GR, sw: 0.5 });
      C(xF, y, 1.8, { fi: "#fff", st: GR, sw: 0.5 });
      const conNeutro = conN && !yaN.has(sa.m);
      if (conNeutro) {
        yaN.add(sa.m);
        R(xNb - 4, y - 5, 8, 10, { fi: "#c9ced5", st: GR, sw: 0.5 });
        C(xNb, y, 1.8, { fi: "#fff", st: GR, sw: 0.5 });
        // Bajada del neutro: las filas de arriba bajan más a la derecha, para no cruzar las de abajo
        const xv = zL(z) + zw - 10 - k * 3;
        tramo(
          [
            [xNb + 3, y + 5],
            [xv, y + 5],
            [xv, yN - 5]
          ],
          "N",
          1.2
        );
        C(xv, yN - 5, 1.6, { fi: GR, st: "" });
      }
      T(xNb + 10, y + 2, `${sa.m.nom} · ${nomF(f)}${conNeutro ? "-N" : ""} → ${sa.m.tab}`, {
        s: 6.2,
        b: 1,
        f: colTxt(f)
      });
    });
  });
  // Riel DIN para equipos (DPS u otros, si el proyecto los lleva)
  R(x0 + 60, yDin, 300, 14, { fi: "#c9ced5", st: GR, sw: 0.7 });
  for (let x = x0 + 66; x < x0 + 356; x += 12) R(x, yDin + 5, 6, 4, { fi: "#e6e9ed", st: "", sw: 0 });
  T(x0 + 366, yDin + 10, "Riel DIN", { s: 6.8, f: GR });
  // Barra de tierra con sus bornes y aisladores; conductor de tierra a la puerta y al pozo
  R(x0 + 40, yPE, 360, 10, { fi: CU, st: "", sw: 0 });
  [x0 + 32, x0 + 400].forEach(x => R(x, yPE - 2, 10, 14, { fi: "#ffd200", st: GR, sw: 0.5 }));
  for (let x = x0 + 52; x < x0 + 396; x += 20) C(x, yPE + 5, 2.4, { fi: "#fff", st: GR, sw: 0.5 });
  T(x0 + 40, yPE + 24, `Barra de tierra (PE) · conductor de puesta a tierra ${r.Selec} mm² al pozo`, { s: 6.8, f: VE });
  tramo(
    [
      [x0 + 400, yPE + 5],
      [x0 + gw - 14, yPE + 5],
      [x0 + gw - 14, yPE - 40]
    ],
    "PE",
    1.6
  );
  T(x0 + gw - 18, yPE - 44, "A la puerta", { s: 6.4, a: "end", f: VE });
  tramo(
    [
      [x0 + 10, yc + 6],
      [x0 + 10, yPE + 5],
      [x0 + 40, yPE + 5]
    ],
    "PE",
    1.6
  );
  o.push(`</g>`);

  /* ---------- Datos del tablero y cuadro de conexiones ---------- */
  const dw = 250,
    dx = W - 20 - dw;
  o.push(`<g data-capa="E-CUADROS">`);
  R(dx, yc, dw, 18, { st: "", fi: NAVY });
  T(dx + dw / 2, yc + 12.5, "DATOS DEL TABLERO TG", { s: 7.8, b: 1, a: "middle", f: "#fff" });
  const datos = [
    ["Sistema", sis.txt],
    ["Interruptor general", `${np}×${gen.itm} A`],
    ["Poder de corte", `${gen.pdc} kA`],
    ["Icc en barras", `${fmt(r.iccTG, 2)} kA`],
    ["Alimentador", cond(tri ? sis.n : 2, gen.S, gen.St)],
    ["Barras", `Cobre · ${barras.map(nomF).join(", ")}`],
    ["Salidas", `${M.length} suministros`],
    ["Tierra", `${r.Selec} mm² al pozo`]
  ];
  datos.forEach(([k, v], i) => {
    const yy = yc + 18 + i * 17;
    R(dx, yy, dw, 17, { st: LN, fi: i % 2 ? "#fff" : "#f3f6f9", sw: 0.8 });
    T(dx + 8, yy + 12, k, { s: 7.2, f: GR });
    T(dx + dw - 8, yy + 12, v, { s: 7.4, b: 1, a: "end" });
  });
  let yy = yc + 18 + datos.length * 17 + 12;
  R(dx, yy, dw, 18, { st: "", fi: NAVY });
  T(dx + dw / 2, yy + 12.5, "CONEXIONES DEL TABLERO TG", { s: 7.8, b: 1, a: "middle", f: "#fff" });
  yy += 18;
  R(dx, yy, dw, 14, { st: LN, fi: "#e3e9f0", sw: 0.8 });
  [
    ["SALIDA", dx + 5],
    ["HACIA", dx + 44],
    ["BORNES", dx + 140],
    ["ITM", dx + 186]
  ].forEach(([t, x]) => T(x, yy + 10, t, { s: 5.8, b: 1, f: GR }));
  yy += 14;
  M.forEach((m, i) => {
    R(dx, yy, dw, 13, { st: LN, fi: i % 2 ? "#fff" : "#f3f6f9", sw: 0.8 });
    T(dx + 5, yy + 9.5, m.nom, { s: 6.6, b: 1, f: NAVY });
    T(dx + 44, yy + 9.5, `Medidor → ${m.tab}`, { s: 6.4 });
    T(dx + 140, yy + 9.5, (m.tri ? polos.map(nomF) : [nomF(tri ? m.fase : "R")]).concat(conN ? ["N"] : []).join("-"), {
      s: 6.4,
      b: 1
    });
    T(dx + 186, yy + 9.5, `${m.a.s.tri ? 3 : 2}×${m.a.itm} A`, { s: 6.4 });
    yy += 13;
  });
  o.push(`</g>`);

  /* ---------- Notas y rótulo ---------- */
  const yr = Math.max(yc + bh + 28, yy + 16),
    hr = 124,
    rx = W - 480,
    rw = W - 20 - rx;
  o.push(`<g data-capa="E-NOTAS">`);
  R(20, yr, rx - 40, hr, { st: NAVY, sw: 1 });
  T(30, yr + 16, "NOTAS", { s: 9, b: 1, f: NAVY });
  const notas = [
    "Caja toma F1 (concesionaria) → tablero general → banco de medidores (lámina IE-06) → tablero de cada suministro (lámina IE-04).",
    "Interruptor general y alimentador del cálculo (lámina IE-01). Gabinete, tipo de interruptor y sección de las barras según el fabricante.",
    "Cada salida toma con perno la fase del balance y la lleva con cable aislado a su borne, junto a su neutro; el interruptor de cada suministro va después de su medidor.",
    "Conductores: R rojo, S negro, T azul (orden de fases: criterio), N blanco, tierra verde-amarillo. Barra de tierra unida a la puerta y al pozo."
  ];
  let ny = yr + 32;
  notas.forEach((t, i) => {
    const ln = [];
    let u = "";
    t.split(" ").forEach(w => {
      if ((u + " " + w).trim().length > 150 && u) {
        ln.push(u);
        u = w;
      } else u = (u + " " + w).trim();
    });
    ln.push(u);
    ln.forEach((l, j) => {
      if (!j) T(30, ny, `${i + 1}.`, { s: 7.6, b: 1, f: NAVY });
      T(42, ny, l, { s: 7.6 });
      ny += 10;
    });
    ny += 1.5;
  });
  o.push(`</g>`);
  rotuloSvg(o, rx, yr, rw, hr, c.proj, "Tablero general del edificio · Escala S/E", "IE-05");
  const H = yr + hr + 16;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Arial, Helvetica, sans-serif"><rect width="${W}" height="${H}" fill="#fff"/><rect x="6" y="4" width="${W - 12}" height="${H - 10}" fill="none" stroke="${NAVY}" stroke-width="1.5"/>${o.join("")}</svg>`;
  return { svg, W, H };
}
function cardTableroGeneral(r, nro) {
  const u = tableroGeneral(r);
  return `<section class="card"><h2><span><span class="num">${nro}</span>Tablero general del edificio</span></h2>
  <div class="unif">${u.svg}</div><div class="body"><p class="hint">Interruptor general del alimentador general y barras de cobre N, R, S y T de las que sale la fase de cada suministro, según el balance, hacia su medidor. Se descarga en DXF, PNG y SVG desde la cinta (Planos).</p></div></section>`;
}
