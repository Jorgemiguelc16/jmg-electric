/* LÁMINA DE DETALLE DE TABLEROS (IE-04)
   Por cada tablero del proyecto, la vista de la puerta con la señal «¡Peligro! Riesgo eléctrico» (Norma DGE,
   141-02-02) y la vista interior esquemática con sus dispositivos en riel DIN, tomados del cálculo y en el orden del
   cuadro de cargas: equipos adicionales, interruptores de los alimentadores (TG de una vivienda), cada diferencial
   con sus circuitos y las reservas; abajo, las barras de neutro y de tierra. La capacidad en polos es la del metrado
   (polosTablero, js/metrado.js). Al final, el detalle de la señal con las proporciones de la norma. */
function tableros(r) {
  const c = r.c,
    o = [],
    { L, T, R } = trazos(o);
  const INK = "#14212e",
    NAVY = "#14304f",
    CU = "#9a5a23",
    GR = "#5a6775",
    LN = "#bfc8d2",
    VE = "#2f7a4b",
    W = 1123;
  T(20, 28, "DETALLE DE TABLEROS", { s: 13, b: 1, f: NAVY });
  T(
    20,
    43,
    "Vista de la puerta y vista interior esquemática de cada tablero · dispositivos según el cálculo · escala S/E",
    {
      s: 8.5,
      f: GR
    }
  );
  // Módulos de riel DIN: ancho por polo y alto; filas de hasta 28 polos, como en un tablero real, para que el gabinete deje lugar a sus datos
  const MW = 20,
    MH = 60,
    x0 = 214,
    x1 = W - 20,
    ancho = 28 * MW;
  let yb = 58;
  r.tabs.forEach(tb => {
    const pt = polosTablero(r, tb),
      a = r.alims[tb.feeder],
      pa = a.s.tri ? 3 : 2;
    o.push(`<g data-capa="E-TABLEROS">`);
    // Lista de módulos en el orden del cuadro de cargas
    const M = [];
    pt.eqs.forEach(e => M.push({ pol: e.pol, t1: e.d.c, fi: "#f3f6f9", g: "eq" }));
    pt.fd.forEach((f, i) => {
      const p = f.s.tri ? 3 : 2,
        dest = r.tabs.find(t => t.feeder === i + 1);
      M.push({ pol: p, t1: `${p}×${f.itm} A`, t3: "Alimentador", t2: dest ? dest.tab : "", fi: "#fff", g: "fd" });
    });
    pt.ids.forEach((d, gi) => {
      M.push({
        pol: d.pol,
        t1: "ID",
        t3: `${d.pol}×${d.rat} A`,
        t4: `30 mA · ${d.tipo}`,
        fi: "#eaf2fb",
        g: "id" + gi,
        id: 1
      });
      d.circ.forEach(q =>
        M.push({
          pol: q.f3 ? 3 : 2,
          t1: `${q.f3 ? 3 : 2}×${q.itm} A`,
          t3: `curva ${q.curva}`,
          t2: q.id,
          fi: "#fff",
          g: "id" + gi,
          idn: d.nom
        })
      );
    });
    for (let i = 0; i < c.reserva; i++)
      M.push({ pol: 2, t1: "2×16 A", t3: "curva C", t2: "Reserva", fi: "#fff", g: "res", res: 1 });
    // Distribución en filas de riel DIN (6 px entre grupos)
    const filas = [[]];
    let ux = 0,
      gAnt = null;
    M.forEach(m => {
      const gap = gAnt !== null && gAnt !== m.g ? 6 : 0,
        w = m.pol * MW;
      if (ux + gap + w > ancho && filas[filas.length - 1].length) {
        filas.push([]);
        ux = 0;
      } else ux += gap;
      m.x = ux;
      ux += w;
      gAnt = m.g;
      filas[filas.length - 1].push(m);
    });
    const ih = 40 + filas.length * (MH + 52) + 40,
      bh = Math.max(ih, 190),
      // Ancho del gabinete según su fila más larga
      uw = Math.max(...filas.map(f => (f.length ? f[f.length - 1].x + f[f.length - 1].pol * MW : 0)), 300),
      gw = uw + 56;
    // Encabezado del tablero
    T(20, yb + 14, `TABLERO ${tb.tab}`, { s: 11, b: 1, f: NAVY });
    T(
      150,
      yb + 14,
      `${tb.desc} · ${a.s.txt} · PdC ${tb.pdc} kA · capacidad mínima ${pt.m} polos · alimentado con ITM ${pa}×${a.itm} A${a.cant > 1 ? ` · ${a.cant} tableros iguales` : ""}`,
      { s: 8, f: GR }
    );
    const yc = yb + 24;
    // Vista de la puerta con la señal de riesgo eléctrico
    R(30, yc, 160, bh, { fi: "#e6e9ed", sw: 1.4 });
    R(37, yc + 7, 146, bh - 14, { fi: "#f3f6f9", sw: 0.9 });
    R(170, yc + bh / 2 - 14, 5, 28, { fi: INK, sw: 0.8 });
    senalRiesgoTexto(o, 75, yc + 22, 70);
    R(70, yc + 140, 80, 22, { fi: "#fff", sw: 0.9 });
    T(110, yc + 155, tb.tab, { s: 9, b: 1, a: "middle", f: NAVY });
    T(110, yc + bh + 14, "VISTA DE LA PUERTA", { s: 7, b: 1, a: "middle", f: GR });
    // Vista interior
    R(x0, yc, gw, bh, { fi: "#fff", sw: 1.4 });
    R(x0 + 6, yc + 6, gw - 12, bh - 12, { st: LN, sw: 0.7 });
    T(x0 + gw / 2, yc + bh + 14, "VISTA INTERIOR (SIN PUERTA NI CUBIERTA)", { s: 7, b: 1, a: "middle", f: GR });
    filas.forEach((fila, fi) => {
      const yf = yc + 28 + fi * (MH + 52),
        xs = x0 + 28,
        fw = fila.length ? fila[fila.length - 1].x + fila[fila.length - 1].pol * MW : 0;
      // Riel DIN
      R(xs - 10, yf + MH / 2 - 6, fw + 20, 12, { st: GR, fi: "#e6e9ed", sw: 0.7 });
      fila.forEach(m => {
        const x = xs + m.x,
          w = m.pol * MW;
        o.push(
          `<rect x="${px2(x)}" y="${px2(yf)}" width="${px2(w)}" height="${MH}" fill="${m.fi}" stroke="${INK}" stroke-width="1.1"${m.res ? ' stroke-dasharray="3 2"' : ""}/>`
        );
        for (let p = 1; p < m.pol; p++) L(x + p * MW, yf + 14, x + p * MW, yf + MH - 12, 0.5, LN);
        // Palanca de maniobra y textos: capacidad arriba, curva abajo, circuito debajo del módulo
        R(x + w / 2 - 4, yf + MH / 2 - 9, 8, 18, { fi: m.id ? NAVY : INK, st: "" });
        T(x + w / 2, yf + 12, m.t1, { s: 7.6, b: 1, a: "middle" });
        if (m.t3) T(x + w / 2, yf + MH - 6, m.t3, { s: 6.2, a: "middle", f: GR });
        if (m.t4) T(x + w / 2, yf + MH + 11, m.t4, { s: 6.6, a: "middle", f: NAVY });
        if (m.t2) T(x + w / 2, yf + MH + 12, m.t2, { s: 7.8, b: 1, a: "middle", f: m.res ? GR : NAVY });
      });
      // Llave de cada diferencial bajo sus circuitos
      [...new Set(fila.filter(m => m.idn).map(m => m.g))].forEach(g => {
        const gm = fila.filter(m => m.g === g),
          xa = xs + gm[0].x,
          xb = xs + gm[gm.length - 1].x + gm[gm.length - 1].pol * MW,
          yl = yf + MH + 20;
        L(xa, yl - 3, xa, yl, 0.7, NAVY);
        L(xa, yl, xb, yl, 0.7, NAVY);
        L(xb, yl - 3, xb, yl, 0.7, NAVY);
        T((xa + xb) / 2, yl + 9, `Protegidos por ${gm.find(m => m.idn).idn}`, { s: 6, a: "middle", f: GR });
      });
    });
    // Barras de neutro y de tierra
    // Barras de neutro y de tierra, una al lado de la otra bajo los módulos
    const ybar = yc + bh - 30,
      bw = (gw - 80) / 2;
    R(x0 + 28, ybar, bw, 7, { st: "", fi: CU });
    T(x0 + 28, ybar + 18, "Barra de neutro (N)", { s: 7.2, f: GR });
    o.push(
      `<rect x="${px2(x0 + 52 + bw)}" y="${ybar}" width="${px2(bw)}" height="7" fill="${VE}" stroke="${VE}" stroke-width="1"/>`
    );
    T(x0 + 52 + bw, ybar + 18, "Barra de tierra (PE)", { s: 7.2, f: VE });
    // Datos del tablero
    // Datos del tablero, en la misma columna para todos los tableros
    const dw = 250,
      dx = x1 - dw;
    if (dw > 150) {
      const nId = pt.ids.length,
        nC = pt.cs.length,
        filasD = [
          ["Sistema", a.s.txt],
          ["Poder de corte", `${tb.pdc} kA`],
          ["Capacidad mínima", `${pt.m} polos`],
          ["Alimentador", `ITM ${pa}×${a.itm} A`],
          ["Circuitos", String(nC)],
          ["Diferenciales", `${nId} de 30 mA`],
          ["Reservas", c.reserva ? `${c.reserva} × ITM 2×16 A` : "—"],
          ...(pt.eqs.length ? [["Equipos", pt.eqs.map(e => e.d.c).join(", ")]] : []),
          ...(a.cant > 1 ? [["Tableros iguales", String(a.cant)]] : [])
        ];
      R(dx, yc, dw, 18, { st: "", fi: NAVY });
      T(dx + dw / 2, yc + 12.5, `DATOS DEL TABLERO ${tb.tab}`, { s: 7.8, b: 1, a: "middle", f: "#fff" });
      filasD.forEach(([k, v], i) => {
        const yy = yc + 18 + i * 17;
        R(dx, yy, dw, 17, { st: LN, fi: i % 2 ? "#fff" : "#f3f6f9", sw: 0.8 });
        T(dx + 8, yy + 12, k, { s: 7.2, f: GR });
        T(dx + dw - 8, yy + 12, v, { s: 7.4, b: 1, a: "end" });
      });
    }
    o.push(`</g>`);
    yb = yc + bh + 28;
  });

  /* ---------- Señal de seguridad 141-02-02 ---------- */
  o.push(`<g data-capa="E-DETALLE">`);
  R(20, yb, W - 40, 18, { st: "", fi: NAVY });
  T(W / 2, yb + 12.5, "SEÑAL DE SEGURIDAD EN LA PUERTA DE CADA TABLERO · NORMA DGE 141-02-02", {
    s: 8.5,
    b: 1,
    a: "middle",
    f: "#fff"
  });
  const ys = yb + 26,
    d = 150,
    sx = 120,
    sy = ys + 18 + d * 0.577;
  senalRiesgoElectrico(o, sx, sy, d);
  // Cotas: lado d y banda 0.10 d
  const yd = sy + d * 0.289 + 14;
  L(sx - d / 2, yd, sx + d / 2, yd, 0.7, GR);
  L(sx - d / 2 - 3, yd + 3, sx - d / 2 + 3, yd - 3, 0.9, GR);
  L(sx + d / 2 - 3, yd + 3, sx + d / 2 + 3, yd - 3, 0.9, GR);
  T(sx, yd - 3, "d", { s: 8, b: 1, a: "middle" });
  L(sx + d / 2 - 4, sy + d * 0.289 - 8, sx + d / 2 + 30, sy + d * 0.289 - 40, 0.6, GR);
  T(sx + d / 2 + 32, sy + d * 0.289 - 42, "Banda 0.10 d", { s: 7.2, f: GR });
  T(sx, yd + 16, "Señal de símbolo", { s: 7.2, b: 1, a: "middle", f: GR });
  const hT = senalRiesgoTexto(o, 300, ys + 10, 120);
  T(360, ys + 10 + hT + 14, "Señal de símbolo con texto", { s: 7.2, b: 1, a: "middle", f: GR });
  const esp = [
    "Señal de advertencia de peligro «Riesgo eléctrico» (Norma DGE, Parte III, Sección 14, código 141-02-02).",
    "Triángulo equilátero de lado d: fondo amarillo, banda triangular negra de 0.10 d y símbolo negro (Figura 134-03).",
    "Con texto: fondo gris oscuro, señal arriba y texto blanco «¡Peligro! Riesgo eléctrico» en letra sanserif.",
    "Tamaño según la distancia de observación l: A ≥ l² / 2000 (A en m², l en m, para l menor de 50 m).",
    "Iluminación de al menos 50 lux sobre la señal; detalles del símbolo de al menos 3 % de la dimensión mayor.",
    "Se coloca en la puerta de cada tablero para indicar la presencia de riesgo eléctrico."
  ];
  esp.forEach((t, i) => {
    T(470, ys + 26 + i * 22, `${i + 1}.`, { s: 7.8, b: 1, f: NAVY });
    T(484, ys + 26 + i * 22, t, { s: 7.8 });
  });
  o.push(`</g>`);
  yb = Math.max(yd + 24, ys + 10 + hT + 24, ys + 26 + esp.length * 22) + 8;

  /* ---------- Notas y rótulo ---------- */
  const hr = 124,
    rx = W - 480,
    rw = W - 20 - rx;
  o.push(`<g data-capa="E-NOTAS">`);
  R(20, yb, rx - 40, hr, { st: NAVY, sw: 1 });
  T(30, yb + 16, "NOTAS", { s: 9, b: 1, f: NAVY });
  const notas = [
    "Vistas esquemáticas generadas del cálculo: dispositivos y orden según el cuadro de cargas, cada diferencial con sus circuitos. Dimensiones del gabinete según el fabricante.",
    "Capacidad mínima de cada tablero en polos: circuitos, diferenciales, reservas y equipos, la misma del metrado (partidas OE.5.2.6 y OE.5.2.7).",
    `El interruptor del alimentador de cada tablero está aguas arriba (lámina IE-01). Reservas equipadas: ITM 2×16 A, curva C${c.reserva ? "" : " (este proyecto no tiene reservas)"}.`,
    "Los equipos adicionales (DPS, relé de tensión, medidor, contactor) son criterio del proyectista y no cambian el cálculo."
  ];
  let ny = yb + 32;
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
  R(rx, yb, rw, hr, { st: NAVY, sw: 1 });
  rotuloSvg(o, rx, yb, rw, hr, c.proj, "Detalle de tableros y señal de seguridad · Escala S/E", "IE-04");
  const H = yb + hr + 16;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Arial, Helvetica, sans-serif"><rect width="${W}" height="${H}" fill="#fff"/><rect x="6" y="4" width="${W - 12}" height="${H - 10}" fill="none" stroke="${NAVY}" stroke-width="1.5"/>${o.join("")}</svg>`;
  return { svg, W, H };
}
function cardTableros(r, nro) {
  const u = tableros(r);
  return `<section class="card"><h2><span><span class="num">${nro}</span>Detalle de tableros</span></h2>
  <div class="unif">${u.svg}</div><div class="body"><p class="hint">Vista de la puerta con la señal «¡Peligro! Riesgo eléctrico» (Norma DGE 141-02-02) y vista interior de cada tablero con sus dispositivos según el cálculo. Se descarga en DXF, PNG y SVG desde la cinta (Planos).</p></div></section>`;
}
