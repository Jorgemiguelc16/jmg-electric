/* LÁMINA DE DETALLE DE TABLEROS (IE-04)
   Por cada tablero del proyecto, la vista de la puerta con la señal «¡Peligro! Riesgo eléctrico» (Norma DGE,
   141-02-02) y la vista interior esquemática con sus dispositivos en riel DIN, tomados del cálculo y en el orden del
   cuadro de cargas: equipos adicionales, interruptores de los alimentadores (TG de una vivienda), cada diferencial
   con sus circuitos y las reservas; abajo, las barras de neutro y de tierra. La capacidad en polos es la del metrado
   (polosTablero, js/metrado.js). Al final, el detalle de la señal con las proporciones de la norma. */
// Vista interior «peinada» (con todo el cableado): opción de la cinta Planos, guardada en este navegador
let TAB_PEINADO = false;
try {
  TAB_PEINADO = localStorage.getItem("jmg-electric-peinado") === "1";
} catch (e) {}
function tableros(r) {
  const PEIN = TAB_PEINADO,
    c = r.c,
    o = [],
    { L, T, R, C } = trazos(o);
  const INK = "#14212e",
    NAVY = "#14304f",
    CU = "#9a5a23",
    GR = "#5a6775",
    LN = "#bfc8d2",
    VE = "#2f7a4b",
    W = 1123;
  /* Colores de los conductores en el tablero peinado: fases negro, rojo y azul; neutro gris (blanco o gris: el blanco
     no se vería sobre la lámina); tierra verde con franjas amarillas. El orden de las fases es criterio de diseño. */
  const COLC = { R: "#000000", S: "#c62828", T: "#1565c0", F: "#000000", N: "#8a9199" };
  const cable = (x1, y1, x2, y2, b, w = 1.2) => {
    const ln = (col, ww, dash) =>
      o.push(
        `<line x1="${px2(x1)}" y1="${px2(y1)}" x2="${px2(x2)}" y2="${px2(y2)}" stroke="${col}" stroke-width="${ww}"${dash ? ` stroke-dasharray="${dash}"` : ""} data-capa="E-CABLEADO"/>`
      );
    if (b === "PE") {
      ln(VE, w + 0.4);
      ln("#ffd200", w * 0.6, "3 3");
    } else ln(COLC[b] || INK, w);
  };
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
      pa = a.s.tri ? 3 : 2,
      sys = a.s,
      conN = !sys.tri || sys.n === 4;
    // Bornes de un módulo según el sistema: F y N (monofásico), R S T (y N con neutro); los de 2 polos en
    // trifásico, la fase del balance y N, o las dos fases si no hay neutro
    const bornes = (pol, fase) => {
      if (!sys.tri) return ["F", "N"].slice(0, pol);
      if (pol >= 4) return ["R", "S", "T", "N"];
      if (pol === 3) return ["R", "S", "T"];
      if (fase && fase.includes("-")) return fase.split("-");
      return conN ? [/^[RST]$/.test(fase || "") ? fase : "R", "N"] : ["R", "S"];
    };
    const bAlim = !sys.tri ? ["F", "N"] : sys.n === 4 ? ["R", "S", "T", "N"] : ["R", "S", "T"],
      cond = (n, S, St) => `${n}-1×${S} + 1×${St}(T) mm²`,
      origen =
        r.mode === "uni" && tb.feeder > 0
          ? "tablero TG"
          : tb.tab === "TSG" || r.mode === "multi"
            ? "banco de medidores"
            : "medidor";
    o.push(`<g data-capa="E-TABLEROS">`);
    // Lista de módulos en el orden del cuadro de cargas
    const M = [];
    const EQC = {
      dps: ["DPS", "20 kA", "DPS"],
      rel: ["U> U<", "", "Relé U"],
      med: ["", "", "Medidor"],
      ctr: ["KM", "reloj", "Contactor"]
    };
    pt.eqs.forEach(e => {
      const [t1, t3, t2] = EQC[e.k] || [e.d.c, "", ""];
      M.push({ pol: e.pol, t1, t3, t2, fi: "#f3f6f9", g: "eq", eq: e.k });
    });
    pt.fd.forEach((f, i) => {
      const p = f.s.tri ? 3 : 2,
        dest = r.tabs.find(t => t.feeder === i + 1);
      M.push({
        pol: p,
        t1: `${p}×${f.itm} A`,
        t3: "Alimentador",
        t2: dest ? dest.tab : "",
        fi: "#fff",
        g: "fd",
        dst: dest ? `Tablero ${dest.tab}` : "Alimentador",
        cnd: cond(f.s.n, f.S, f.St)
      });
    });
    pt.ids.forEach((d, gi) => {
      M.push({
        pol: d.pol,
        t1: `${d.pol}×${d.rat} A`,
        t3: `30 mA · ${d.tipo}`,
        t2: d.nom,
        fi: "#eaf2fb",
        g: "id" + gi,
        id: 1,
        fase: (d.circ[0] || {}).fase
      });
      d.circ.forEach(q =>
        M.push({
          pol: q.f3 ? 3 : 2,
          t1: `${q.f3 ? 3 : 2}×${q.itm} A`,
          t3: `curva ${q.curva}`,
          t2: q.id,
          fi: "#fff",
          g: "id" + gi,
          idn: d.nom,
          fase: q.fase,
          dst: q.desc,
          cnd: cond(q.f3 ? 3 : 2, q.S, q.St)
        })
      );
    });
    for (let i = 0; i < c.reserva; i++)
      M.push({ pol: 2, t1: "2×16 A", t3: "curva C", t2: "Reserva", fi: "#fff", g: "res", res: 1 });
    // Distribución en filas de riel DIN (6 px entre grupos)
    const filas = [[]];
    let ux = 0,
      gAnt = null;
    // Ancho de cada grupo (un diferencial con sus circuitos): si no cabe en la fila, pasa entero a la siguiente
    const anchoG = {};
    M.forEach(m => (anchoG[m.g] = (anchoG[m.g] || 0) + m.pol * MW));
    M.forEach(m => {
      const nuevo = gAnt !== m.g,
        gap = gAnt !== null && nuevo ? 6 : 0,
        w = m.pol * MW,
        need = nuevo && anchoG[m.g] <= ancho ? anchoG[m.g] : w;
      if (ux + gap + need > ancho && filas[filas.length - 1].length) {
        filas.push([]);
        ux = 0;
      } else ux += gap;
      m.x = ux;
      ux += w;
      gAnt = m.g;
      filas[filas.length - 1].push(m);
    });
    const filasD = [
        ["Sistema", a.s.txt],
        ["Poder de corte", `${tb.pdc} kA`],
        ["Capacidad mínima", `${pt.m} polos`],
        ["Alimentador", `ITM ${pa}×${a.itm} A`],
        ["Circuitos", String(pt.cs.length)],
        ["Diferenciales", `${pt.ids.length} de 30 mA`],
        ["Reservas", c.reserva ? `${c.reserva} × ITM 2×16 A` : "—"],
        ...(pt.eqs.length ? [["Equipos", pt.eqs.map(e => e.d.c).join(", ")]] : []),
        ...(a.cant > 1 ? [["Tableros iguales", String(a.cant)]] : [])
      ],
      sal = M.filter(m => m.idn || m.g === "fd"),
      dH = 18 + filasD.length * 17,
      cH = PEIN ? 32 + sal.length * 13 : 0;
    const PASO = MH + 84,
      ih = 48 + (filas.length - 1) * PASO + MH + 50 + 44,
      bh = Math.max(ih, 190, PEIN ? dH + 12 + cH : dH),
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
      const yf = yc + 48 + fi * PASO,
        xs = x0 + 28,
        fw = fila.length ? fila[fila.length - 1].x + fila[fila.length - 1].pol * MW : 0;
      // Canaletas ranuradas arriba y abajo de la fila
      const canaleta = yk => {
        // Del ancho del gabinete, para que todas las filas (y las barras) lleguen a ellas
        R(xs - 12, yk, uw + 24, 12, { st: GR, fi: "#e6e9ed", sw: 0.7 });
        for (let xk = xs - 6; xk < xs + uw + 10; xk += 8) L(xk, yk + 3, xk, yk + 9, 0.5, LN);
      };
      canaleta(yf - 30);
      canaleta(yf + MH + 38);
      // Riel DIN detrás de los módulos
      R(xs - 10, yf + MH / 2 - 7, fw + 20, 14, { st: GR, fi: "#c9ced5", sw: 0.7 });
      // Peine de cobre sobre los interruptores de cada diferencial
      [...new Set(fila.filter(m => m.idn).map(m => m.g))].forEach(g => {
        const gm = fila.filter(m => m.g === g && m.idn),
          xa = xs + gm[0].x + MW / 2,
          xb = xs + gm[gm.length - 1].x + gm[gm.length - 1].pol * MW - MW / 2;
        L(xa, yf - 8, xb, yf - 8, 2, CU);
        gm.forEach(m => L(xs + m.x + MW / 2, yf - 8, xs + m.x + MW / 2, yf, 1, CU));
      });
      fila.forEach(m => {
        const x = xs + m.x,
          w = m.pol * MW,
          cx = x + w / 2;
        // Cuerpo del módulo con sus bornes y tornillos arriba y abajo
        o.push(
          `<rect x="${px2(x)}" y="${px2(yf)}" width="${px2(w)}" height="${MH}" fill="${m.fi}" stroke="${INK}" stroke-width="1.1"${m.res ? ' stroke-dasharray="3 2"' : ""}/>`
        );
        [yf + 1, yf + MH - 10].forEach(yt => {
          R(x + 1, yt, w - 2, 9, { st: "", fi: "#d5dae0" });
          for (let p = 0; p < m.pol; p++) C(x + MW * (p + 0.5), yt + 4.5, 2.2, { fi: "#fff", st: GR, sw: 0.7 });
        });
        // Sin peinar: capacidad arriba, curva abajo y el circuito en la etiqueta; peinado: todo en el frente,
        // porque bajo el módulo van los conductores
        const arriba = PEIN ? m.t2 || m.t1 : m.t1,
          abajo = !PEIN
            ? m.t3
            : m.id
              ? `${m.t1.replace(" A", "")} · 30 mA`
              : m.eq
                ? m.t3 || m.t1
                : m.res
                  ? m.t1
                  : `${m.t1} ${(m.t3 || "").replace("curva ", "")}`.trim();
        if (arriba) T(cx, yf + 20, arriba, { s: 7.2, b: 1, a: "middle", f: PEIN && m.t2 ? (m.res ? GR : NAVY) : INK });
        if (m.eq === "med") {
          // Medidor: pantalla con la lectura
          R(x + 4, yf + 23, w - 8, 13, { fi: "#d9eedf", st: GR, sw: 0.7 });
          T(cx, yf + 32.5, "kWh", { s: 6.4, b: 1, a: "middle" });
        } else {
          // Visor y palanca de maniobra (arriba: cerrado)
          R(cx - 5, yf + 23, 10, 17, { fi: "#e6e9ed", st: GR, sw: 0.6 });
          R(cx - 3.5, yf + 24.5, 7, 7, { fi: m.id ? NAVY : INK, st: "" });
        }
        if (m.id) {
          // Botón de prueba del diferencial
          C(x + w - 7, yf + 31, 2.8, { fi: "#ffd200", st: INK, sw: 0.7 });
        }
        if (m.eq === "dps") R(x + 5, yf + 26, 6, 10, { fi: VE, st: "" });
        if (m.eq === "rel") {
          C(x + 6, yf + 28, 1.6, { fi: VE, st: "" });
          C(x + 6, yf + 34, 1.6, { fi: "#b42318", st: "" });
        }
        if (abajo) T(cx, yf + MH - 13, abajo, { s: 5.8, a: "middle", f: GR });
        // Etiqueta con el circuito
        if (m.t2 && !PEIN) {
          R(x + 1, yf + MH + 2, w - 2, 13, { fi: "#fff", st: LN, sw: 0.6 });
          T(cx, yf + MH + 11.5, m.t2, { s: 7, b: 1, a: "middle", f: m.res ? GR : NAVY });
        }
      });
      // Cableado peinado: alimentación desde la canaleta superior a los diferenciales, equipos y alimentadores;
      // salidas de los circuitos a la canaleta inferior; llegada del alimentador por arriba
      if (PEIN) {
        fila.forEach(m => {
          const bs = bornes(m.pol, m.fase);
          for (let p = 0; p < m.pol; p++) {
            const px = xs + m.x + MW * (p + 0.5),
              b = bs[p] || "R",
              col = COLC[b] || INK;
            if (m.id || m.eq || m.g === "fd") {
              cable(px, yf - 18, px, yf, b);
              T(px + 2.5, yf - 11, b, { s: 5.2, b: 1, f: col === "#000000" ? INK : col });
            }
            if (m.idn || m.g === "fd") {
              cable(px, yf + MH, px, yf + MH + 38, b);
              T(px + 2.5, yf + MH + 9, b, { s: 5.2, b: 1, f: col === "#000000" ? INK : col });
            }
          }
        });
        if (fi === 0) {
          // Llegada del alimentador: de dónde viene y con qué conductor
          bAlim.forEach((b, k) => {
            const xk = xs + uw - 4 - (bAlim.length - 1 - k) * 7;
            cable(xk, yc + 6, xk, yf - 30, b, 1.8);
            T(xk + 2, yc + 26, b, { s: 5.4, b: 1, f: COLC[b] === "#000000" ? INK : COLC[b] });
          });
          T(xs + uw - 10 - bAlim.length * 7, yc + 16, `Llega del ${origen} · ${cond(a.s.n, a.S, a.St)}`, {
            s: 6.4,
            b: 1,
            a: "end",
            f: NAVY
          });
        }
      }
      // Llave de cada diferencial bajo sus circuitos (sin peinar: bajo el módulo van los conductores)
      if (!PEIN)
        [...new Set(fila.filter(m => m.idn).map(m => m.g))].forEach(g => {
          const gm = fila.filter(m => m.g === g),
            xa = xs + gm[0].x,
            xb = xs + gm[gm.length - 1].x + gm[gm.length - 1].pol * MW,
            yl = yf + MH + 22;
          L(xa, yl - 3, xa, yl, 0.7, NAVY);
          L(xa, yl, xb, yl, 0.7, NAVY);
          L(xb, yl - 3, xb, yl, 0.7, NAVY);
          T((xa + xb) / 2, yl + 9, `Protegidos por ${gm.find(m => m.idn).idn}`, { s: 6, a: "middle", f: GR });
        });
    });
    // Barras de neutro y de tierra, una al lado de la otra bajo los módulos
    const ybar = yc + bh - 30,
      bw = (gw - 80) / 2;
    if (conN) {
      R(x0 + 28, ybar, bw, 7, { st: "", fi: CU });
      T(x0 + 28, ybar + 18, "Barra de neutro (N)", { s: 7.2, f: GR });
    }
    o.push(
      `<rect x="${px2(x0 + 52 + bw)}" y="${ybar}" width="${px2(bw)}" height="7" fill="${VE}" stroke="${VE}" stroke-width="1"/>`
    );
    T(x0 + 52 + bw, ybar + 18, "Barra de tierra (PE)", { s: 7.2, f: VE });
    // Peinado: un conductor de neutro y uno de protección por salida, de las barras a la última canaleta
    if (PEIN) {
      const nS = sal.length,
        yk = yc + 48 + (filas.length - 1) * PASO + MH + 50;
      for (let i = 0; i < nS; i++) {
        if (conN) cable(x0 + 28 + ((i + 0.5) * bw) / nS, ybar, x0 + 28 + ((i + 0.5) * bw) / nS, yk, "N", 0.9);
        cable(x0 + 52 + bw + ((i + 0.5) * bw) / nS, ybar, x0 + 52 + bw + ((i + 0.5) * bw) / nS, yk, "PE", 0.9);
      }
      // Conductor de protección del alimentador, por el costado del gabinete hasta la barra de tierra
      cable(x0 + gw - 14, yc + 6, x0 + gw - 14, ybar + 3, "PE", 1.6);
      cable(x0 + gw - 14, ybar + 3, x0 + 52 + 2 * bw, ybar + 3, "PE", 1.6);
    }
    // Datos del tablero, en la misma columna para todos los tableros
    const dw = 250,
      dx = x1 - dw;
    o.push(`<g data-capa="E-CUADROS">`);
    {
      R(dx, yc, dw, 18, { st: "", fi: NAVY });
      T(dx + dw / 2, yc + 12.5, `DATOS DEL TABLERO ${tb.tab}`, { s: 7.8, b: 1, a: "middle", f: "#fff" });
      filasD.forEach(([k, v], i) => {
        const yy = yc + 18 + i * 17;
        R(dx, yy, dw, 17, { st: LN, fi: i % 2 ? "#fff" : "#f3f6f9", sw: 0.8 });
        T(dx + 8, yy + 12, k, { s: 7.2, f: GR });
        T(dx + dw - 8, yy + 12, v, { s: 7.4, b: 1, a: "end" });
      });
    }
    // Cuadro de conexiones (peinado): de dónde sale cada conductor y a dónde va
    if (PEIN && sal.length) {
      let yy = yc + dH + 12;
      R(dx, yy, dw, 18, { st: "", fi: NAVY });
      T(dx + dw / 2, yy + 12.5, `CONEXIONES DEL TABLERO ${tb.tab}`, { s: 7.8, b: 1, a: "middle", f: "#fff" });
      yy += 18;
      R(dx, yy, dw, 14, { st: LN, fi: "#e3e9f0", sw: 0.8 });
      [
        ["SALIDA", dx + 5, "start"],
        ["HACIA", dx + 34, "start"],
        ["BORNES", dx + 128, "start"],
        ["CONDUCTOR", dx + 158, "start"]
      ].forEach(([t, x, an]) => T(x, yy + 10, t, { s: 5.8, b: 1, a: an, f: GR }));
      yy += 14;
      sal.forEach((m, i) => {
        const bs = bornes(m.pol, m.fase);
        R(dx, yy, dw, 13, { st: LN, fi: i % 2 ? "#fff" : "#f3f6f9", sw: 0.8 });
        T(dx + 5, yy + 9.5, m.t2 || "", { s: 6.6, b: 1, f: NAVY });
        T(dx + 34, yy + 9.5, String(m.dst || "").slice(0, 21), { s: 6.4 });
        T(dx + 128, yy + 9.5, bs.join("-"), { s: 6.4, b: 1 });
        T(dx + 158, yy + 9.5, String(m.cnd || "").replace(" mm²", ""), { s: 6 });
        // Muestra de color de cada conductor de la salida y de su tierra
        [...bs, "PE"].forEach((b, j) => cable(dx + dw - 30 + j * 6, yy + 3, dx + dw - 30 + j * 6, yy + 10, b, 2.6));
        yy += 13;
      });
    }
    o.push(`</g></g>`);
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
    "Los equipos adicionales (DPS, relé de tensión, medidor, contactor) son criterio del proyectista y no cambian el cálculo.",
    PEIN
      ? "Cableado esquemático (peinado): alimentación por la canaleta superior y salidas por la inferior. Colores: fases negro (R o F), rojo (S) y azul (T), neutro gris o blanco y tierra verde con amarillo; el orden de las fases es criterio de diseño."
      : ""
  ].filter(Boolean);
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

// Casilla de la cinta (Planos › Tableros peinados): cambia la vista interior y las descargas
{
  const ck = typeof document !== "undefined" && document.getElementById("optPeinado");
  if (ck && ck.addEventListener) {
    ck.checked = TAB_PEINADO;
    ck.addEventListener("change", () => {
      TAB_PEINADO = ck.checked;
      try {
        localStorage.setItem("jmg-electric-peinado", TAB_PEINADO ? "1" : "0");
      } catch (e) {}
      if (LAST) render(LAST);
    });
  }
}
