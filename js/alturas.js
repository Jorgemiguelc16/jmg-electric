/* DIAGRAMA DE ALTURAS DE MONTAJE
   Elevación referencial con las salidas que tiene el proyecto (según sus circuitos), cada una a su altura desde el
   nivel de piso terminado (NPT), con su cota, el cuadro de alturas y el rótulo. Símbolos de la Norma DGE «Símbolos
   gráficos en electricidad» (R.M. N.° 091-2002-EM/VME, sección 093), redibujados conservando sus proporciones.
   Las alturas son parámetros del proyecto (Parámetros › Alturas de montaje); interruptores y tomacorrientes se
   comparan con los límites de la Norma A.120 del RNE (accesibilidad). Usa solo líneas, rectángulos, círculos,
   triángulos y textos, para que svgDxf() lo pase a AutoCAD igual que el unifilar. */
// Límites de la A.120: interruptores y timbres hasta 1.35 m (Art. 11 d); alcance frontal de 0.40 a 1.20 m (Art. 10)
// Coordenadas con 2 decimales
const px2 = v => +(+v).toFixed(2);
const A120 = { int: [0, 1.35, "Art. 11 d"], toma: [0.4, 1.2, "Art. 10"] };
// Salidas del proyecto, en el orden en que se dibujan, con su altura (m) y la referencia de esa altura
function salidasAltura(r) {
  const a = r.c.alt,
    tx = r.circ.map(q => `${q.tipo} ${q.desc}`.toLowerCase()),
    hay = re => tx.some(t => re.test(t)),
    S = [];
  const add = (k, nom, corto, cod, h, chk) => S.push({ k, nom, corto, cod, h, chk });
  // Tomacorriente monofásico con tierra (09-93-17) o trifásico (09-93-15), según los circuitos de esa salida
  const fases = re =>
    r.circ.some(q => q.f3 && re.test(`${q.tipo} ${q.desc}`.toLowerCase())) ? "09-93-15" : "09-93-17";
  const alum = hay(/alumbrado|iluminaci[oó]n(?! de emergencia)/);
  add(
    "med",
    r.mode === "multi" ? "Banco de medidores (eje de la caja)" : "Medidor de energía (eje de la caja)",
    "Medidor",
    "08-80-22",
    a.med
  );
  add("tab", "Tablero de distribución (borde superior)", "Tablero", "09-91-17", a.tab);
  if (alum) {
    add("int", "Interruptor de alumbrado", "Interruptor", "09-93-30", a.int, A120.int);
    add("braq", "Salida de alumbrado en pared (braquete)", "Braquete", "09-93-52", a.braq);
    add("luz", "Salida de alumbrado en techo (centro de luz)", "Centro de luz", "09-93-51", a.techo);
  }
  if (hay(/emergencia/)) add("emer", "Luminaria de emergencia", "Emergencia", "09-93-67", a.braq);
  if (tx.some(t => /tomacorriente/.test(t) && !/cocina|lavander/.test(t)))
    add("toma", "Tomacorriente con toma de tierra", "Tomacorriente", "09-93-17", a.toma, A120.toma);
  if (hay(/tomacorriente.*(cocina|lavander)/))
    add("tomaC", "Tomacorriente de cocina y lavandería", "Toma cocina", "09-93-17", a.tomaC, A120.toma);
  if (hay(/calentador|ducha|terma/))
    add("terma", "Salida para terma o ducha eléctrica", "Terma / ducha", "09-93-69", a.terma);
  if (hay(/cocina el[eé]ctrica/)) add("coc", "Salida para cocina eléctrica", "Cocina", "09-93-18", a.fza);
  if (hay(/aire acondicionado/))
    add("aire", "Salida para aire acondicionado", "Aire acond.", fases(/aire acondicionado/), a.aire);
  const esFza = q => /^(motor|otra carga)/i.test(q.tipo) && !/alumbrado|intercomunicador|portero/i.test(q.desc);
  if (r.circ.some(esFza))
    add(
      "fza",
      "Salida de fuerza (motor u otra carga)",
      "Fuerza",
      r.circ.some(q => esFza(q) && q.f3) ? "09-93-15" : "09-93-17",
      a.fza
    );
  if (hay(/intercomunicador|portero/))
    add("itc", "Intercomunicador (interfono)", "Interfono", "09-93-73", a.int, A120.int);
  return S;
}
// ¿Rige la A.120 en esta edificación? (Art. 2: atención al público y áreas comunes de edificios con ascensor)
function a120Aplica(r) {
  return r.viv === false ? "si" : r.mode === "multi" ? "comun" : "no";
}
function alturas(r) {
  const c = r.c,
    a = c.alt,
    o = [],
    S = salidasAltura(r),
    rige = a120Aplica(r);
  const INK = "#14212e",
    NAVY = "#14304f",
    CU = "#9a5a23",
    GR = "#5a6775",
    W = 1123;
  const L = (x1, y1, x2, y2, w = 1.3, col = INK) =>
    o.push(
      `<line x1="${px2(x1)}" y1="${px2(y1)}" x2="${px2(x2)}" y2="${px2(y2)}" stroke="${col}" stroke-width="${w}"/>`
    );
  const T = (x, y, t, { s = 9, b = 0, a = "start", f = INK, rot = 0 } = {}) =>
    o.push(
      `<text x="${px2(x)}" y="${px2(y)}" font-size="${s}"${b ? ' font-weight="700"' : ""} text-anchor="${a}" fill="${f}"${rot ? ` transform="rotate(${rot} ${px2(x)} ${px2(y)})"` : ""}>${esc(t)}</text>`
    );
  const R = (x, y, w, h, { st = INK, fi = "none", sw = 1.2 } = {}) =>
    o.push(
      `<rect x="${px2(x)}" y="${px2(y)}" width="${px2(w)}" height="${px2(h)}" fill="${fi}"${st ? ` stroke="${st}" stroke-width="${sw}"` : ""}/>`
    );
  const C = (x, y, rr, fi = "#fff") =>
    o.push(`<circle cx="${px2(x)}" cy="${px2(y)}" r="${rr}" fill="${fi}" stroke="${INK}" stroke-width="1.2"/>`);
  // Arco con segmentos rectos (el DXF no lee arcos de SVG): centro, radio y ángulos en grados
  const arco = (x, y, rr, a1, a2, n = 10) => {
    for (let i = 0; i < n; i++) {
      const t1 = ((a1 + ((a2 - a1) * i) / n) * Math.PI) / 180,
        t2 = ((a1 + ((a2 - a1) * (i + 1)) / n) * Math.PI) / 180;
      L(x + rr * Math.cos(t1), y + rr * Math.sin(t1), x + rr * Math.cos(t2), y + rr * Math.sin(t2), 1.2);
    }
  };
  // Achurado a 45° dentro de una franja horizontal
  const achurado = (x0, x1, ya, yb, paso = 9) => {
    const h = yb - ya;
    for (let xs = x0 - h; xs < x1; xs += paso) {
      let xa = xs,
        ya1 = yb,
        xb = xs + h,
        yb1 = ya;
      if (xa < x0) {
        ya1 = yb - (x0 - xa);
        xa = x0;
      }
      if (xb > x1) {
        yb1 = ya + (xb - x1);
        xb = x1;
      }
      if (xb > xa) L(xa, ya1, xb, yb1, 0.6, GR);
    }
  };
  // Título
  T(20, 28, "DIAGRAMA DE ALTURAS DE MONTAJE", { s: 13, b: 1, f: NAVY });
  T(20, 43, "Elevación referencial · alturas desde el nivel de piso terminado (NPT) · cotas en metros", {
    s: 8.5,
    f: GR
  });
  // Elevación: muro entre el piso (NPT) y el fondo de la losa
  const x0 = 70,
    x1 = 690,
    yT = 78,
    k = Math.min(130, 360 / Math.max(a.techo, 1)),
    yP = yT + a.techo * k,
    Y = h => yP - h * k;
  if (rige !== "no") {
    R(x0, Y(1.2), x1 - x0, 0.8 * k, { st: "", fi: "#e8f1fa" });
    T(x0 - 7, Y(0.8), "A.120 · 0.40–1.20 m", { s: 6.5, a: "middle", f: GR, rot: -90 });
  }
  L(x0, yT - 12, x1, yT - 12, 1);
  L(x0, yT, x1, yT, 1.4);
  achurado(x0, x1, yT - 12, yT);
  L(x0, yP, x1, yP, 1.8);
  achurado(x0, x1, yP, yP + 10);
  L(x0, yP + 10, x1, yP + 10, 0.8, GR);
  T(x1, yT - 16, `Fondo de losa · ${fmt(a.techo, 2)} m`, { s: 7.5, a: "end", f: GR });
  T(x1, yP + 22, "NPT ± 0.00", { s: 7.5, b: 1, a: "end", f: GR });
  // Escala de alturas a la izquierda, cada 0.50 m
  L(x0 - 22, yT, x0 - 22, yP, 0.8, GR);
  for (let h = 0; h <= a.techo + 1e-6; h += 0.5) {
    L(x0 - 26, Y(h), x0 - 18, Y(h), 0.8, GR);
    T(x0 - 29, Y(h) + 2.5, fmt(h, 2), { s: 6.8, a: "end", f: GR });
  }
  // Cota vertical desde el NPT hasta el eje de la salida
  const cota = (x, h) => {
    L(x, yP, x, Y(h), 0.7, GR);
    L(x - 3, yP + 3, x + 3, yP - 3, 0.9, GR);
    L(x - 3, Y(h) + 3, x + 3, Y(h) - 3, 0.9, GR);
    T(x - 3, (yP + Y(h)) / 2, fmt(h, 2), { s: 7.5, b: 1, a: "middle", rot: -90 });
  };
  // Símbolos (Norma DGE): centro en x, y
  const luzX = (x, y) => {
    C(x, y, 7);
    L(x - 4.9, y - 4.9, x + 4.9, y + 4.9, 1.1);
    L(x + 4.9, y - 4.9, x - 4.9, y + 4.9, 1.1);
  };
  const toma = (x, y, letra) => {
    arco(x, y - 2, 7, 0, 180);
    L(x - 7, y - 2, x + 7, y - 2, 1.2);
    L(x, y + 5, x, y + 10, 1.2);
    L(x - 7, y - 6, x + 7, y - 6, 1.2);
    if (letra) T(x + 10, y + 3, letra, { s: 8, b: 1 });
  };
  const SIM = {
    med: (x, y) => {
      R(x - 12, y - 16, 24, 32);
      C(x, y, 8.5);
      T(x, y + 2.5, "kWh", { s: 5.6, b: 1, a: "middle" });
    },
    tab: (x, y) => {
      // Tablero empotrado (09-91-17): rectángulo con la mitad en negro; y es el borde superior
      R(x - 13, y, 26, 0.4 * k);
      o.push(
        `<path d="M${px2(x - 13)} ${px2(y)}L${px2(x + 13)} ${px2(y)}L${px2(x - 13)} ${px2(y + 0.4 * k)}Z" fill="${INK}"/>`
      );
    },
    int: (x, y) => {
      o.push(`<circle cx="${px2(x)}" cy="${px2(y)}" r="3" fill="${INK}"/>`);
      L(x + 2, y - 2, x + 10, y - 10, 1.3);
      L(x + 10, y - 10, x + 13.5, y - 6.5, 1.3);
      T(x - 6, y + 3, "S", { s: 8, b: 1, a: "end" });
    },
    braq: (x, y) => {
      luzX(x, y);
      L(x - 9, y + 9, x + 9, y + 9, 1.4);
    },
    luz: (x, y) => {
      L(x, yT, x, y - 7, 1.2);
      luzX(x, y);
    },
    emer: (x, y) => {
      R(x - 11, y - 9, 22, 18);
      luzX(x, y);
    },
    toma: (x, y) => toma(x, y, "T"),
    tomaC: (x, y) => toma(x, y, "T"),
    terma: (x, y) => {
      R(x - 9, y - 12, 18, 24);
      [-6, -2, 2, 6].forEach((d, i) => L(x - 5 + (i % 2) * 10, y + d, x + 5 - (i % 2) * 10, y + d + 4, 1));
    },
    coc: (x, y) => toma(x, y, "C"),
    aire: (x, y) => toma(x, y, "A"),
    fza: (x, y) => toma(x, y, "F"),
    itc: (x, y) => {
      R(x - 8, y - 8, 16, 16);
      T(x, y + 3, "IT", { s: 7, b: 1, a: "middle" });
    }
  };
  // Por dónde llega la tubería (referencial): alumbrado y mandos por el techo; tomacorrientes y fuerza por el piso
  const TECHO = ["int", "braq", "emer", "aire", "itc"],
    PISO = ["toma", "tomaC", "terma", "coc", "fza"];
  const cw = (x1 - x0 - 30) / Math.max(S.length, 1);
  S.forEach((s, i) => {
    const x = x0 + 22 + cw * (i + 0.5),
      h = Math.min(Math.max(s.h, 0), a.techo),
      y = s.k === "luz" ? yT + 14 : Y(h);
    if (TECHO.includes(s.k)) L(x, yT, x, y - (s.k === "int" ? 3 : 9), 1, CU);
    if (PISO.includes(s.k)) L(x, yP, x, y + 10, 1, CU);
    SIM[s.k](x, y);
    cota(x - 16, h);
    o.push(`<circle cx="${px2(x)}" cy="${px2(yP + 32)}" r="7" fill="#fff" stroke="${NAVY}" stroke-width="1"/>`);
    T(x, yP + 35, String(i + 1), { s: 7.5, b: 1, a: "middle", f: NAVY });
    T(x, yP + 50, s.corto, { s: 6.8, a: "middle", f: GR });
  });
  // Cuadro de alturas
  const bx = 712,
    bw = W - 20 - bx,
    rh = 17,
    estado = s => {
      if (!s.chk) return ["Criterio", GR];
      const ok = s.h >= s.chk[0] - 1e-9 && s.h <= s.chk[1] + 1e-9;
      return ok ? ["Cumple A.120", "#2f7a4b"] : rige === "no" ? ["Fuera de A.120", GR] : ["No cumple A.120", "#b42318"];
    };
  R(bx, 60, bw, rh, { st: "", fi: NAVY });
  T(bx + bw / 2, 72, "CUADRO DE ALTURAS DE MONTAJE", { s: 8.5, b: 1, a: "middle", f: "#fff" });
  const cols = [
    ["N.°", bx + 12, "middle"],
    ["SALIDA", bx + 26, "start"],
    ["SÍMBOLO DGE", bx + 214, "start"],
    ["ALTURA", bx + 300, "end"],
    ["REFERENCIA", bx + 308, "start"]
  ];
  R(bx, 60 + rh, bw, rh, { st: "#bfc8d2", fi: "#e3e9f0", sw: 0.8 });
  cols.forEach(([t, x, an]) => T(x, 60 + rh + 12, t, { s: 6.8, b: 1, a: an, f: GR }));
  S.forEach((s, i) => {
    const yy = 60 + rh * (i + 2),
      [et, ec] = estado(s);
    R(bx, yy, bw, rh, { st: "#bfc8d2", fi: i % 2 ? "#f3f6f9" : "#fff", sw: 0.8 });
    T(bx + 12, yy + 12, String(i + 1), { s: 8, b: 1, a: "middle", f: NAVY });
    T(bx + 26, yy + 12, s.nom, { s: 7.6 });
    T(bx + 214, yy + 12, s.cod, { s: 7.6, f: GR });
    T(bx + 300, yy + 12, `${fmt(s.h, 2)} m`, { s: 8, b: 1, a: "end" });
    T(bx + 308, yy + 12, et, { s: 7.2, b: et !== "Criterio", f: ec });
  });
  // Notas y rótulo
  const yr = Math.max(yP + 70, 60 + rh * (S.length + 2) + 16),
    hr = 124,
    rx = W - 480,
    rw = W - 20 - rx;
  R(20, yr, rx - 40, hr, { st: NAVY, sw: 1 });
  T(30, yr + 16, "NOTAS", { s: 9, b: 1, f: NAVY });
  const RIGE = {
    si: "rige en esta edificación (atención al público, Art. 2)",
    comun: "rige en las áreas comunes si el edificio exige ascensor (Art. 2)",
    no: "no es obligatoria en vivienda unifamiliar, salvo vivienda accesible (Art. 30); se indica como referencia"
  };
  const notas = [
    `Alturas desde el NPT hasta el eje de la caja; el tablero, hasta su borde superior. Centro de luz en el techo (fondo de losa a ${fmt(a.techo, 2)} m).`,
    "Símbolos de la Norma DGE «Símbolos gráficos en electricidad» (R.M. N.° 091-2002-EM/VME), sección 093, redibujados conservando sus proporciones.",
    `Norma A.120 del RNE: ${RIGE[rige]}. Interruptores y timbres hasta 1.35 m (Art. 11 d); alcance frontal de 0.40 a 1.20 m (Art. 10).`,
    "Las alturas marcadas «Criterio» no las fija una norma: verifíquelas con la arquitectura, el mobiliario y los equipos. El medidor, según la concesionaria.",
    "Recorridos de tubería referenciales: alumbrado y mandos por el techo; tomacorrientes y salidas de fuerza por el piso."
  ];
  let ny = yr + 32;
  notas.forEach((t, i) => {
    const ln = [];
    let s = "";
    t.split(" ").forEach(w => {
      if ((s + " " + w).trim().length > 150 && s) {
        ln.push(s);
        s = w;
      } else s = (s + " " + w).trim();
    });
    ln.push(s);
    ln.forEach((l, j) => {
      if (!j) T(30, ny, `${i + 1}.`, { s: 7.6, b: 1, f: NAVY });
      T(42, ny, l, { s: 7.6 });
      ny += 10;
    });
    ny += 1.5;
  });
  R(rx, yr, rw, hr, { st: NAVY, sw: 1 });
  rotuloSvg(o, rx, yr, rw, hr, c.proj, "Diagrama de alturas de montaje · Escala S/E", "IE-02");
  const H = yr + hr + 16;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Arial, Helvetica, sans-serif"><rect width="${W}" height="${H}" fill="#fff"/><rect x="6" y="4" width="${W - 12}" height="${H - 10}" fill="none" stroke="${NAVY}" stroke-width="1.5"/>${o.join("")}</svg>`;
  return { svg, W, H };
}
function cardAlturas(r, nro) {
  const u = alturas(r);
  return `<section class="card"><h2><span><span class="num">${nro}</span>Diagrama de alturas de montaje</span></h2>
  <div class="unif">${u.svg}</div><div class="body"><p class="hint">Muestra las salidas que tiene el proyecto según sus circuitos, cada una a la altura indicada en Parámetros › Alturas de montaje. Los interruptores y tomacorrientes se comparan con la Norma A.120 del RNE (accesibilidad); las demás alturas son criterio del proyectista. Se descarga en DXF, PNG y SVG desde la cinta (Planos).</p></div></section>`;
}
