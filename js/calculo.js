/* MOTOR DE CÁLCULO (el corazón de la plataforma)
   calcular(proyecto) recibe los datos del proyecto (el mismo objeto que se guarda en el .json, estado() en
   js/proyectos.js) y devuelve el resultado, sin leer nada de la pantalla. ctx() arma los parámetros; dimensionar() elige interruptor y sección por capacidad (Tabla 2 con 5A y 5C)
   y por caída de tensión (Regla 050-102); mdVivienda/mdUso calculan la máxima demanda (Reglas 050-200,
   050-202, 050-204 a 050-210 y Tabla 14); calcUni y calcMulti arman alimentadores y circuitos;
   balancear() reparte las fases; pozo() calcula la puesta a tierra; recomendaciones() da los avisos.
   Cualquier cambio aquí debe pasar las pruebas de pruebas/index.html. */
function ctx(p = estado()) {
  const g = id => (p[id] == null ? "" : String(p[id])),
    n = id => parseFloat(g(id)) || 0;
  const aisl = g("aisl"),
    temp = +g("temp"),
    nag = +g("nag"),
    met = g("met"),
    ft = FT[aisl][temp] ?? 1,
    fa = FA[nag] ?? 1;
  return {
    aisl,
    temp,
    nag,
    met,
    ft,
    fa,
    fc: ft * fa,
    fp: n("fp") || 0.9,
    maxSal: Math.max(1, Math.min(12, Math.round(n("maxSal") || 12))),
    pAl: n("pAl"),
    pTo: n("pTo"),
    reserva: +g("reserva"),
    uso: g("uso") || "viv",
    resAl: +g("resAl"),
    aLib: Math.max(0, n("aLib")),
    wLib: Math.max(0, n("wLib")),
    fdA: 1 + +g("resAl") / 100,
    sminD: parseFloat(g("sminD")),
    sminA: parseFloat(g("sminA")),
    idMode: g("idMode"),
    dvGen: parseFloat(g("dvGen")),
    iccE: n("iccE") || 10,
    // Poder de corte mínimo comercial (0 = solo según la Icc), tipo de diferencial y arranque de motores
    pdcMin: n("pdcMin"),
    idTipo: g("idTipo") === "AC" ? "AC" : "A",
    kArr: Math.min(12, Math.max(1, n("kArr") || 6)),
    proj: {
      nombre: g("p_nombre"),
      prop: g("p_prop"),
      ubic: g("p_ubic"),
      proy: g("p_proy"),
      cip: g("p_cip").replace(/[<>]/g, "").trim()
    },
    pat: { rho: n("rho_s") || 100, fr: n("fr") || 1, Lv: n("Lv") || 2.4, dv: parseFloat(g("dv")) },
    rho: g("rhoMode") === "20" ? RHO_CU : aisl === "pvc" ? 0.0209 : 0.0223,
    rhoRef:
      g("rhoMode") === "20"
        ? "Cobre a 20 °C"
        : aisl === "pvc"
          ? "Cobre a 70 °C · ρ20 (1 + 0,00393·50)"
          : "Cobre a 90 °C · ρ20 (1 + 0,00393·70)",
    desig: g("desig").replace(/[<>]/g, "").trim(),
    pDesp: Math.max(0, n("pDesp")),
    bajada: Math.max(0, n("bajada"))
  };
}
/* Proyecto en cálculo: calcular() lo fija mientras calcula; calcUni, calcMulti y sus auxiliares leen de él */
let P = null;
const pv = id => (P[id] == null ? "" : String(P[id])),
  pn = id => parseFloat(pv(id)) || 0;
function calcular(p) {
  const P0 = P;
  P = p;
  try {
    const c = ctx(p);
    return p.MODE === "multi" ? calcMulti(c) : calcUni(c);
  } finally {
    P = P0;
  }
}
const tierraPara = itm => (T16.find(([a]) => itm <= a) || [0, 25])[1];
const tierraElectrodo = amp => T17.find(([a]) => amp <= a)[1];
/* Poder de corte: el menor nivel de la lista que cubre la Icc, y no menor que el mínimo comercial elegido (criterio
   del proyectista: en el mercado peruano los ITM usuales son de 4.5, 6 o 10 kA) */
const pdcPara = (kA, min = 0) => {
  const p = PDC.find(x => x >= kA) ?? null;
  return p === null ? null : Math.max(p, min || 0);
};
// Disparo magnético mínimo de cada curva, en veces la corriente nominal del ITM (IEC 60898-1)
const CURVA_MAG = { B: 3, C: 5, D: 10 };
function tuboPara(S, St, ncond) {
  const a = ((ncond * OD[S] ** 2 + OD[St] ** 2) * Math.PI) / 4;
  for (const [mm, pul, di] of TUBOS) if (a <= (0.4 * Math.PI * di * di) / 4) return { mm, pul };
  return { mm: null, pul: '> 3"' };
}
/* Secciones elegidas en el cuadro de conductores (SECF del modo en cálculo), por tramo: «A·descripción» en
   alimentadores y «tablero·circuito» en derivados. dimensionar() solo acepta una sección mayor que la mínima
   que cumple capacidad y caída de tensión; una igual o menor se ignora y queda la automática. */
let SFX = {};
function dimensionar({ I, K, L, V, cargados, c, fc, dvMax, Smin, Imin = 0, fd = FD, Sfix = 0 }) {
  const Id = Math.max(I * fd, Imin),
    itm = ITM.find(x => x >= Id - 1e-9) ?? null;
  const key = c.aisl + (cargados === 3 ? "3" : "2"),
    tabla = T2[c.met][key],
    col = (c.aisl === "pvc" ? 0 : 2) + (cargados === 3 ? 1 : 0);
  for (let k = 0; k < SECC.length; k++) {
    const S = SECC[k];
    if (S < Smin) continue;
    const Iz = tabla[k],
      Izc = Iz * fc,
      dV = (K * c.rho * L * I) / S,
      dVp = (dV / V) * 100;
    if (itm !== null && Izc >= itm && dVp <= dvMax + 1e-9) {
      const j = Sfix > S ? SECC.indexOf(Sfix) : -1;
      if (j > k) {
        const dVf = (K * c.rho * L * I) / Sfix;
        return {
          Id,
          fd,
          itm,
          col,
          S: Sfix,
          Iz: tabla[j],
          Izc: tabla[j] * fc,
          dV: dVf,
          dVp: (dVf / V) * 100,
          Imin,
          Sauto: S
        };
      }
      return { Id, fd, itm, col, S, Iz, Izc, dV, dVp, Imin };
    }
  }
  const k = SECC.length - 1,
    S = SECC[k],
    dV = (K * c.rho * L * I) / S;
  return { Id, fd, itm, col, S, Iz: tabla[k], Izc: tabla[k] * fc, dV, dVp: (dV / V) * 100, Imin, fail: true };
}
function alimentador(desc, P, sk, L, dvUp, dvSel, c, extra = {}) {
  const s = SIST[sk],
    I = P / (s.kI * s.V * c.fp);
  const r = dimensionar({
    I,
    K: s.K,
    L,
    V: s.V,
    cargados: s.tri ? 3 : 2,
    c,
    fc: c.ft,
    dvMax: dvSel,
    Smin: c.sminA,
    Imin: extra.Imin || 0,
    fd: extra.fd ?? FD,
    Sfix: SFX["A·" + desc]
  });
  Object.assign(r, { desc, P, sk, s, I, L, dvUp, dvAc: dvUp + r.dVp }, extra);
  r.St = tierraPara(r.itm || 400);
  r.tubo = tuboPara(r.S, r.St, s.n);
  r.ok = !r.fail && r.itm !== null && r.Izc >= r.itm && r.dvAc <= DV_ALIM + 1e-9;
  return r;
}
function circuito({ tab, id, desc, tipo, n, P, L, fases, skTri }, c, dvUp, feeder) {
  const s = fases === 3 && skTri && SIST[skTri].tri ? SIST[skTri] : SIST.mono220,
    f3 = s.tri;
  const I = P / (s.kI * s.V * c.fp);
  const r = dimensionar({
    I,
    K: s.K,
    L,
    V: s.V,
    cargados: f3 ? 3 : 2,
    c,
    fc: c.fc,
    dvMax: Math.min(DV_DER, DV_TOT - dvUp),
    Smin: c.sminD,
    Sfix: SFX[`${tab}·${id}`]
  });
  const motor = /^motor/i.test(tipo || "");
  Object.assign(r, {
    tab,
    id,
    desc,
    tipo,
    n,
    P,
    L,
    s,
    I,
    dvUp,
    dVt: dvUp + r.dVp,
    feeder,
    f3,
    fase: f3 ? "3φ" : "—",
    motor,
    curva: motor ? "D" : "C",
    key: `${tab}·${id}`
  });
  r.St = tierraPara(r.itm || 400);
  r.tubo = tuboPara(r.S, r.St, f3 ? 3 : 2);
  /* Arranque de motores: la corriente de arranque (kArr veces la nominal, arranque directo) no debe alcanzar el
     disparo magnético mínimo de la curva del ITM (IEC 60898-1). La caída de tensión en el arranque se estima con
     la misma fórmula y kArr veces la corriente (estimación conservadora, sin reactancia); se informa sin límite,
     porque las normas cargadas no lo fijan. */
  if (motor) {
    r.Iarr = c.kArr * I;
    r.magMin = r.itm === null ? null : CURVA_MAG[r.curva] * r.itm;
    r.arrOk = r.magMin !== null && r.Iarr < r.magMin;
    r.dVarr = r.dVp * c.kArr;
  }
  r.ok =
    !r.fail &&
    r.itm !== null &&
    r.Izc >= r.itm &&
    r.dVp <= DV_DER + 1e-9 &&
    r.dVt <= DV_TOT + 1e-9 &&
    (!motor || r.arrOk);
  return r;
}
/* Interruptores diferenciales (Regla 150-400): uno por cada grupo de tres circuitos o uno por circuito. Tipo A en
   todos o, con el parámetro «AC», tipo A solo si el diferencial protege alguna carga marcada «con electrónica»
   (inverter, variador, inducción, cargador): criterio de ingeniería según IEC 60364-5-53 e IEC 62423, porque esas
   cargas producen corrientes de fuga con componente continua que un tipo AC puede no detectar. */
const tipoID = (grp, c) => (c.idTipo === "A" || grp.some(q => q.elec) ? "A" : "AC");
function asignarID(cs, c) {
  if (c.idMode === "circuito") {
    cs.forEach(q => {
      q.idName = "ID";
      q.idRat = ID_RAT.find(x => x >= (q.itm || 0)) ?? 100;
      q.idTipo = tipoID([q], c);
    });
    return;
  }
  let g = 0;
  for (let i = 0; i < cs.length; i += 3) {
    const grp = cs.slice(i, i + 3);
    g++;
    const need = Math.max(
        ...grp.map(q => q.itm || 0),
        grp.reduce((s, q) => s + q.I, 0)
      ),
      rat = ID_RAT.find(x => x >= need) ?? 100;
    const tp = tipoID(grp, c);
    grp.forEach(q => {
      q.idName = "ID-" + g;
      q.idRat = rat;
      q.idTipo = tp;
    });
  }
}
// Cargas especiales sumadas por tipo para la máxima demanda (Reglas 050-200(1)(a) y 050-202(1)(a)): cocinas,
// calentadores y aire acondicionado; en «otras» solo las cargas y motores mayores de 1500 W
function cargasMD(list) {
  const sum = t => list.filter(x => x.tipo === t).reduce((s, x) => s + x.p, 0);
  return {
    coc: sum("cocina"),
    cal: sum("calentador"),
    aire: sum("aire"),
    otras: list.filter(x => (x.tipo === "otra" || x.tipo === "motor") && x.p > 1500).reduce((s, x) => s + x.p, 0)
  };
}
// 050-200(1)(a) y 050-202(1)(a)
function mdVivienda({ area, coc, cal, aire, otras }, multi) {
  const basica = multi
    ? 1500 + (area > 45 ? 1000 : 0) + 1000 * Math.max(0, Math.ceil((area - 90) / 90))
    : 2500 + 1000 * Math.max(0, Math.ceil((area - 90) / 90));
  const mdCoc = coc > 0 ? 6000 + 0.4 * Math.max(0, coc - 12000) : 0;
  const mdOtras = coc > 0 ? 0.25 * otras : Math.min(otras, 6000) + 0.25 * Math.max(0, otras - 6000);
  const sinAire = basica + mdCoc + cal + mdOtras;
  return { basica, coc, mdCoc, cal, aire, otras, mdOtras, sinAire, MD: sinAire + aire };
}
// Potencia de las salidas ini..ini+n-1 de una lista mixta [[cantidad, W por salida], ...] (luminarias de distintas potencias)
const potMix = (mix, ini, n) => {
  let P = 0,
    pos = 0;
  for (const [m, p] of mix) {
    const a = Math.max(ini, pos),
      b = Math.min(ini + n, pos + m);
    if (b > a) P += (b - a) * p;
    pos += m;
  }
  return P;
};
// Luminarias de otra potencia que se suman a una salida de alumbrado: {n, mix} o null
const lumsExtra = (L, n0, p0) => {
  const v = L.map(x => [Math.max(0, Math.round(+x.n || 0)), +x.p || 0]).filter(([m, p]) => m > 0 && p > 0);
  if (!v.length) return null;
  return { n: v.reduce((s, [m]) => s + m, 0), P: v.reduce((s, [m, p]) => s + m * p, 0), mix: [[n0, p0], ...v] };
};
function grupos(list, c, tab, dvUp, feeder) {
  const out = [];
  let k = 0;
  list.forEach(g => {
    if (g.n <= 0) return;
    const nc = Math.ceil(g.n / c.maxSal);
    let rest = g.n,
      ini = 0;
    for (let i = 0; i < nc; i++) {
      const n = Math.ceil(rest / (nc - i));
      rest -= n;
      const P = g.mix ? potMix(g.mix, ini, n) : n * g.p;
      ini += n;
      const q = circuito(
        { tab, id: "C-" + ++k, desc: g.desc + (nc > 1 ? ` ${i + 1}` : ""), tipo: g.tipo, n, P, L: g.L, fases: 1 },
        c,
        dvUp,
        feeder
      );
      q.src = g.src || null;
      if (g.mix) q.mix = true;
      out.push(q);
    }
  });
  return out;
}
// Factor de agrupamiento de varillas en paralelo (separación ≥ longitud de varilla), con interpolación lineal
const FAGR = [
  [1, 1],
  [2, 1.16],
  [3, 1.29],
  [4, 1.36],
  [8, 1.68],
  [12, 1.8],
  [16, 1.92],
  [20, 2],
  [24, 2.16]
];
function fAgr(n) {
  if (n <= 1) return 1;
  for (let i = 1; i < FAGR.length; i++) {
    if (n <= FAGR[i][0]) {
      const [n0, f0] = FAGR[i - 1],
        [n1, f1] = FAGR[i];
      return f0 + ((f1 - f0) * (n - n0)) / (n1 - n0);
    }
  }
  return FAGR[FAGR.length - 1][1];
}
function pozo(p) {
  const a = p.dv / 2,
    Rv = (p.rho / (2 * Math.PI * p.Lv)) * (Math.log((4 * p.Lv) / a) - 1),
    Rt = Rv * p.fr;
  let nVar = 1;
  while ((Rt * fAgr(nVar)) / nVar > 25 && nVar < 60) nVar++;
  const F = fAgr(nVar),
    Rn = (Rt * F) / nVar;
  return { ...p, Rv, Rt, ok: Rt <= 25, nVar, F, Rn, okL: p.Lv >= 2, okD: p.dv * 1000 >= 13 };
}
// Cortocircuito aguas abajo de un conductor (estimación conservadora: impedancia de la fuente inductiva + resistencia del cable)
function iccAbajo(iccUp, s, L, S) {
  const k = s.tri ? SQ3 : 1,
    Zup = s.V / (k * iccUp * 1000),
    Rc = ((s.tri ? 1 : 2) * RHO_CU * L) / S;
  return s.V / (k * Math.hypot(Zup, Rc)) / 1000;
}
// Reparto óptimo de cargas monofásicas entre tres fases (búsqueda exhaustiva o mejora local)
function optimo(P, base) {
  const n = P.length,
    idx = P.map((_, i) => i).sort((a, b) => P[b] - P[a]),
    ph = base.slice(),
    asg = new Array(n).fill(0);
  const sc = v => {
    const mx = Math.max(...v);
    return mx + (mx - Math.min(...v)) * 1e-6;
  };
  let best = null;
  if (n <= 10) {
    let bestS = Infinity;
    const rec = d => {
      if (Math.max(...ph) >= bestS) return;
      if (d === n) {
        const v = sc(ph);
        if (v < bestS) {
          bestS = v;
          best = asg.slice();
        }
        return;
      }
      const i = idx[d],
        seen = [];
      for (let k = 0; k < 3; k++) {
        if (seen.includes(ph[k])) continue;
        seen.push(ph[k]);
        ph[k] += P[i];
        asg[i] = k;
        rec(d + 1);
        ph[k] -= P[i];
      }
    };
    rec(0);
  } else {
    idx.forEach(i => {
      const k = ph.indexOf(Math.min(...ph));
      ph[k] += P[i];
      asg[i] = k;
    });
    let mejora = true,
      it = 0;
    while (mejora && it++ < 400) {
      mejora = false;
      const s0 = sc(ph);
      for (let i = 0; i < n && !mejora; i++)
        for (let k = 0; k < 3 && !mejora; k++) {
          const a = asg[i];
          if (k === a) continue;
          ph[a] -= P[i];
          ph[k] += P[i];
          if (sc(ph) < s0 - 1e-9) {
            asg[i] = k;
            mejora = true;
          } else {
            ph[k] -= P[i];
            ph[a] += P[i];
          }
        }
      for (let i = 0; i < n && !mejora; i++)
        for (let j = i + 1; j < n && !mejora; j++) {
          const a = asg[i],
            b = asg[j];
          if (a === b) continue;
          const d = P[j] - P[i];
          ph[a] += d;
          ph[b] -= d;
          if (sc(ph) < s0 - 1e-9) {
            asg[i] = b;
            asg[j] = a;
            mejora = true;
          } else {
            ph[a] -= d;
            ph[b] += d;
          }
        }
    }
    best = asg.slice();
  }
  best = best || [];
  const out = base.slice();
  best.forEach((k, i) => (out[k] += P[i]));
  return { asg: best, ph: out };
}
const desbal = ph => {
  const avg = (ph[0] + ph[1] + ph[2]) / 3;
  return avg > 0 ? ((Math.max(...ph) - avg) / avg) * 100 : 0;
};
function balancear(items, sk, fix) {
  const s = SIST[sk];
  if (!s.tri) return null;
  const nm = s.fases,
    tri3 = items.filter(i => i.f3),
    mono = items.filter(i => !i.f3),
    base = [0, 0, 0];
  tri3.forEach(i => {
    for (let k = 0; k < 3; k++) base[k] += i.P / 3;
    i.fase = "3φ";
    i.fijo = false;
  });
  const b = base.slice(),
    libre = [];
  let nFix = 0;
  mono.forEach(i => {
    const k = nm.indexOf(fix ? fix[i.key] : undefined);
    i.fijo = k >= 0;
    if (k >= 0) {
      b[k] += i.P;
      i.fase = nm[k];
      nFix++;
    } else libre.push(i);
  });
  const o = optimo(
    libre.map(i => i.P),
    b
  );
  libre.forEach((i, j) => {
    i.fase = nm[o.asg[j]];
  });
  const ref = nFix
      ? optimo(
          mono.map(i => i.P),
          base
        ).ph
      : o.ph,
    ph = o.ph;
  return {
    nm,
    ph,
    avg: (ph[0] + ph[1] + ph[2]) / 3,
    desb: desbal(ph),
    desbMin: desbal(ref),
    nFix,
    items,
    mayor: mono.slice().sort((a, b) => b.P - a.P)[0] || null
  };
}

// Pisos de la vivienda: el 1er piso con los datos de Vivienda y Salidas, los siguientes desde la lista «pisos»
function pisosUni() {
  const sal = (n, L) => ({ n, L: L || 1 });
  return [
    {
      n: 1,
      area: pn("area"),
      aE: pn("aE"),
      Ld: pn("Ltd1") || 1,
      al: sal(pn("al_n"), pn("al_L")),
      tg: sal(pn("tg_n"), pn("tg_L")),
      tc: sal(pn("tc_n"), pn("tc_L"))
    },
    ...P.pisos.map((p, i) => ({
      n: i + 2,
      i,
      area: p.area || 0,
      aE: p.aE || 0,
      Ld: p.Ld || 1,
      al: sal(p.al_n || 0, p.al_L),
      tg: sal(p.tg_n || 0, p.tg_L),
      tc: sal(p.tc_n || 0, p.tc_L)
    }))
  ];
}
// Regla 050-210 y Tabla 14: carga por área (dimensiones exteriores) con el factor de demanda de alimentadores,
// más las cargas especiales a su potencia nominal (050-210(b)). Devuelve los mismos campos que mdVivienda.
function mdUso(uso, area, cs, aE = 0) {
  const U = USOS[uso];
  // Escuelas, hospitales y hoteles (050-204/206/208): el factor de demanda afecta a la carga por área más las cargas especiales
  if (U.regla) {
    const e = U.wE ? Math.min(Math.max(0, aE), area) : 0,
      carga = U.wE ? (U.resta ? U.wE * e + U.w * (area - e) : U.w * area + U.wE * e) : U.w * area;
    const esp = cs.reduce((s, x) => s + (x.p > 0 ? x.p : 0), 0),
      total = carga + esp,
      dens = area > 0 ? total / area : 0,
      tramos = [];
    if (area <= 900) tramos.push({ a: area, fal: U.f1, inst: total, d: (total * U.f1) / 100 });
    else
      tramos.push(
        { a: 900, fal: U.f1, inst: dens * 900, d: (dens * 900 * U.f1) / 100 },
        { a: area - 900, fal: U.f2, inst: dens * (area - 900), d: (dens * (area - 900) * U.f2) / 100 }
      );
    const dem = tramos.reduce((s, t) => s + t.d, 0);
    return {
      uso,
      U,
      area,
      aE: e,
      carga,
      dem,
      tramos,
      esp,
      total,
      basica: dem,
      coc: 0,
      mdCoc: 0,
      cal: 0,
      aire: 0,
      otras: esp,
      mdOtras: 0,
      sinAire: dem,
      MD: dem
    };
  }
  const carga = area * U.w,
    tramos = [];
  let ini = 0,
    dem = 0;
  U.fd.forEach(([lim, fac, fal]) => {
    const a = Math.max(0, Math.min(area, lim) - ini);
    if (a > 0) {
      const d = (a * U.w * fal) / 100;
      dem += d;
      tramos.push({ a, fac, fal, inst: a * U.w, d });
    }
    ini = lim;
  });
  const esp = cs.reduce((s, x) => s + (x.p > 0 ? x.p : 0), 0);
  return {
    uso,
    U,
    area,
    carga,
    dem,
    tramos,
    esp,
    basica: dem,
    coc: 0,
    mdCoc: 0,
    cal: 0,
    aire: 0,
    otras: esp,
    mdOtras: esp,
    sinAire: dem + esp,
    MD: dem + esp
  };
}
function calcUni(c) {
  SFX = (P.SECF || {}).uni || {};
  const PS = pisosUni(),
    varios = PS.length > 1,
    esq = varios ? pv("esqPisos") : "tg";
  // Uso: vivienda (Regla 050-200) u otro uso de la Tabla 14 (Regla 050-210). En otros usos el área es la servida (sótano al 100 %),
  // no hay corriente mínima de 40 A y la carga del alimentador es continua (Regla 050-104(3)): corriente de diseño 1.25 × I.
  const viv = !USOS[c.uso],
    fSot = viv ? 0.75 : 1,
    ImV = viv ? IMIN_UNI : 0,
    fdV = viv ? c.fdA : FD;
  const areaT = PS.reduce((s, p) => s + p.area, 0),
    sot = pn("sot"),
    area = areaT + fSot * sot,
    sk = pv("sist") || "mono220",
    Lalim = pn("Lalim") || 1;
  const cs = P.cargas.map(x => ({ ...x }));
  const mdDe = (a, list, aE = 0) =>
    viv ? mdVivienda({ area: a, ...cargasMD(list) }, false) : mdUso(c.uso, a, list, aE);
  // Áreas libres no techadas (patios, jardines, cocheras abiertas): carga unitaria elegida por el proyectista (p. ej. 5 W/m²), al 100 %;
  // no figura en el CNE, se suma a la máxima demanda general y a la del 1er piso cuando este tiene tablero propio
  const libre = c.aLib * c.wLib,
    conLib = m => (libre > 0 ? { ...m, libre, sinAire: m.sinAire + libre, MD: m.MD + libre } : { ...m, libre: 0 });
  const md = conLib(
    mdDe(
      area,
      cs,
      PS.reduce((s, p) => s + (p.aE || 0), 0)
    )
  );
  const pw = { al: pn("al_p"), tg: pn("tg_p"), tc: pn("tc_p") };
  // Luminarias de otra potencia de cada piso (con un solo piso, todas van al 1er piso)
  const exP = p =>
      lumsExtra(
        P.lums.filter(x => (varios ? Math.round(+x.piso || 1) : 1) === p.n),
        p.al.n,
        pw.al
      ),
    alX = p => {
      const e = exP(p);
      return e ? { n: p.al.n + e.n, mix: e.mix } : {};
    };
  const exPt = p =>
      lumsExtra(
        P.toms.filter(x => (varios ? Math.round(+x.piso || 1) : 1) === p.n),
        p.tg.n,
        pw.tg
      ),
    tgX = p => {
      const e = exPt(p);
      return e ? { n: p.tg.n + e.n, mix: e.mix } : {};
    };
  const CI =
    PS.reduce(
      (s, p) => s + (p.al.n * pw.al + (exP(p)?.P || 0) + p.tg.n * pw.tg + (exPt(p)?.P || 0) + p.tc.n * pw.tc),
      0
    ) +
    cs.reduce((s, x) => s + x.p, 0) +
    libre;
  const al = alimentador("Alimentador medidor → tablero general TG", md.MD, sk, Lalim, 0, DV_ALIM, c, {
    pKey: "MD",
    Imin: ImV,
    fd: fdV,
    viv
  });
  al.iccO = c.iccE;
  al.pdc = pdcPara(c.iccE, c.pdcMin);
  const iccTG = iccAbajo(c.iccE, al.s, al.L, al.S);
  // Tablero de cada piso: TG si el piso se conecta al tablero general, TD-n si tiene tablero propio
  const tabDe = n => (!varios || (n === 1 && esq === "tg") ? "TG" : tabPiso(n));
  const pisoCarga = x => {
    const k = Math.round(+x.piso || 0);
    return varios && k >= 1 && k <= PS.length ? k : 0;
  };
  const tabCarga = x => {
    const k = pisoCarga(x);
    return k ? tabDe(k) : "TG";
  };
  const alims = [al],
    tabs = [
      {
        tab: "TG",
        desc: viv ? "Tablero general de la vivienda" : "Tablero general",
        feeder: 0,
        icc: iccTG,
        pdc: pdcPara(iccTG, c.pdcMin)
      }
    ];
  // Alimentadores TG → TD de cada piso: máxima demanda por la Regla 050-200 con el área del piso (el sótano, al 75 %, en el 1er piso)
  PS.forEach(p => {
    const tab = tabDe(p.n);
    if (tab === "TG") return;
    const aP = p.area + (p.n === 1 ? fSot * sot : 0),
      mdP0 = mdDe(
        aP,
        cs.filter(x => tabCarga(x) === tab),
        p.aE
      ),
      mdP = p.n === 1 ? conLib(mdP0) : mdP0;
    const f = alimentador(`Alimentador TG → ${tab} (${ORD(p.n)} piso)`, mdP.MD, sk, p.Ld, al.dVp, DV_ALIM - al.dVp, c, {
      pKey: "piso",
      piso: p.n,
      mdP,
      areaP: aP,
      fd: fdV,
      viv
    });
    f.iccO = iccTG;
    f.pdc = pdcPara(iccTG, c.pdcMin);
    alims.push(f);
    p.tab = tab;
    p.feeder = alims.length - 1;
    p.md = mdP;
    p.areaC = aP;
    const icc = iccAbajo(iccTG, f.s, f.L, f.S);
    tabs.push({
      tab,
      desc: `Tablero de distribución del ${ORD(p.n)} piso`,
      feeder: p.feeder,
      icc,
      pdc: pdcPara(icc, c.pdcMin),
      piso: p.n
    });
  });
  const circ = [];
  tabs.forEach(tb => {
    const f = alims[tb.feeder],
      up = tb.feeder ? f.dvAc : al.dVp;
    const PT = PS.filter(p => tabDe(p.n) === tb.tab);
    const src = (p, k) => (p.n === 1 ? { t: "grp", k } : { t: "piso", i: p.i, k });
    const list = grupos(
      PT.flatMap(p => [
        { ...p.al, p: pw.al, ...alX(p), desc: "Alumbrado", tipo: "Alumbrado", src: src(p, "al") },
        { ...p.tg, p: pw.tg, ...tgX(p), desc: "Tomacorrientes", tipo: "Tomacorriente", src: src(p, "tg") },
        { ...p.tc, p: pw.tc, desc: "Tomacorrientes cocina / lavandería", tipo: "Tomacorriente", src: src(p, "tc") }
      ]),
      c,
      tb.tab,
      up,
      tb.feeder
    );
    cs.forEach((x, ix) => {
      if (!(x.p > 0) || tabCarga(x) !== tb.tab) return;
      const q = circuito(
        {
          tab: tb.tab,
          id: "C-" + (list.length + 1),
          desc: x.nombre || "Carga especial",
          tipo: TIPOS[x.tipo].split(" (")[0],
          n: 1,
          P: x.p,
          L: x.L || 1,
          fases: x.fases,
          skTri: sk
        },
        c,
        up,
        tb.feeder
      );
      q.src = { t: "cargas", i: ix };
      q.elec = !!+x.elec;
      list.push(q);
    });
    asignarID(list, c);
    circ.push(...list);
  });
  const bal = balancear(circ, sk, (P.FIX || {}).uni);
  return {
    mode: "uni",
    uso: viv ? "viv" : c.uso,
    viv,
    iccTG,
    c,
    sk,
    area,
    areaT,
    sot,
    cs,
    md,
    CI,
    alims,
    circ,
    tabs,
    bal,
    pat: pozo(c.pat),
    PS,
    varios,
    esq,
    contratada: Math.ceil(md.MD / 500) / 2,
    conexion: "Conexión simple (Norma DGE, 301.A)",
    Selec: tierraElectrodo(al.Izc)
  };
}
function calcMulti(c) {
  SFX = (P.SECF || {}).multi || {};
  const sk = pv("sistG") || "tri380",
    Lgen = pn("Lgen") || 1,
    Lms = pn("Lms") || 1;
  // Cargas especiales de cada tipo de departamento (lista cargasT): sumadas por tipo para la máxima demanda,
  // su potencia total (Pesp) para la carga instalada y su número (nEsp) para el metrado
  const espT = i => P.cargasT.filter(x => Math.round(+x.dep || 0) === i && x.p > 0);
  const T = P.tipos
    .map((t, i) => ({ ...t, _i: i }))
    .filter(t => t.cant > 0)
    .map(t => {
      const ce = espT(t._i),
        u = { ...t, ...cargasMD(ce), Pesp: ce.reduce((s, x) => s + x.p, 0), nEsp: ce.length };
      return { ...u, cant: Math.round(t.cant), md: mdVivienda(u, true) };
    })
    .sort((a, b) => b.md.sinAire - a.md.sinAire);
  // Luminarias de otra potencia de cada tipo de departamento
  const exT = t =>
      lumsExtra(
        P.lumsT.filter(x => Math.round(+x.tipo || 0) === t._i),
        t.nAl || 0,
        c.pAl
      ),
    alT = t => {
      const e = exT(t);
      return e ? { n: (t.nAl || 0) + e.n, mix: e.mix } : {};
    };
  const exTt = t =>
      lumsExtra(
        P.tomsT.filter(x => Math.round(+x.tipo || 0) === t._i),
        t.nTo || 0,
        c.pTo
      ),
    toT = t => {
      const e = exTt(t);
      return e ? { n: (t.nTo || 0) + e.n, mix: e.mix } : {};
    };
  const units = [];
  T.forEach((t, ti) => {
    for (let k = 0; k < t.cant; k++)
      units.push({ ti, nombre: t.nombre, md: t.md.sinAire, P: t.md.MD, f3: false, ref: `${t.nombre} · Nº ${k + 1}` });
  });
  const fac = i => (i < 1 ? 1 : i < 3 ? 0.65 : i < 5 ? 0.4 : i < 20 ? 0.3 : 0.25);
  units.forEach((u, i) => {
    u.ord = i + 1;
    u.f = fac(i);
    u.dem = u.md * u.f;
  });
  let pos = 1;
  T.forEach((t, ti) => {
    t.desde = pos;
    t.hasta = pos + t.cant - 1;
    pos += t.cant;
    t.dem = units.filter(u => u.ti === ti).reduce((s, u) => s + u.dem, 0);
  });
  const tramosDef = [
    ["Unidad de mayor carga", 1, 1],
    ["Siguientes 2 unidades", 2, 0.65],
    ["Siguientes 2 unidades", 2, 0.4],
    ["Siguientes 15 unidades", 15, 0.3],
    ["Unidades restantes", 1e9, 0.25]
  ];
  const tramos = [];
  let i0 = 0;
  for (const [lab, n, f] of tramosDef) {
    const sl = units.slice(i0, i0 + n);
    if (!sl.length) break;
    tramos.push({
      lab,
      n: sl.length,
      f,
      sum: sl.reduce((s, u) => s + u.md, 0),
      dem: sl.reduce((s, u) => s + u.dem, 0)
    });
    i0 += sl.length;
  }
  const mdDeptos = units.reduce((s, u) => s + u.dem, 0),
    aireTot = T.reduce((s, t) => s + t.aire * t.cant, 0);
  const SV = P.serv.map((s, i) => ({ ...s, _i: i })).filter(s => s.p > 0);
  const Pserv = SV.reduce((s, x) => s + x.p, 0),
    maxMot = Math.max(0, ...SV.filter(x => x.tipo === "motor").map(x => x.p)),
    mdServ = 0.75 * Pserv;
  const MD = mdDeptos + aireTot + mdServ;
  const gen = alimentador("Alimentador general: acometida → tablero general TG", MD, sk, Lgen, 0, c.dvGen, c, {
    pKey: "MD",
    fd: c.fdA,
    viv: true
  });
  gen.iccO = c.iccE;
  gen.pdc = pdcPara(c.iccE, c.pdcMin);
  const iccTG = iccAbajo(c.iccE, gen.s, gen.L, gen.S);
  const alims = [gen],
    tabs = [];
  if (SV.length) {
    const f = alimentador(
      "Alimentador TG → tablero de servicios generales TSG",
      Pserv + 0.25 * maxMot,
      sk,
      Lms,
      gen.dVp,
      DV_ALIM - gen.dVp,
      c,
      { pKey: "servP" }
    );
    f.iccO = iccTG;
    f.pdc = pdcPara(iccTG, c.pdcMin);
    alims.push(f);
    const icc = iccAbajo(iccTG, f.s, f.L, f.S);
    tabs.push({ tab: "TSG", desc: "Tablero de servicios generales", feeder: 1, icc, pdc: pdcPara(icc, c.pdcMin) });
  }
  T.forEach((t, ti) => {
    const tab = "TD-" + t.nombre.replace(/^Tipo\s*/i, "");
    t.tab = tab;
    const f = alimentador(
      `Alimentador medidor → ${tab} (${t.nombre})`,
      t.md.MD,
      "mono220",
      t.Ld || 1,
      gen.dVp,
      DV_ALIM - gen.dVp,
      c,
      { pKey: "tipo", ti, cant: t.cant, Imin: IMIN_DPTO, fd: c.fdA, viv: true }
    );
    f.iccO = iccTG;
    f.pdc = pdcPara(iccTG, c.pdcMin);
    alims.push(f);
    const icc = iccAbajo(iccTG, f.s, f.L, f.S);
    tabs.push({
      tab,
      desc: `Tablero de departamento ${t.nombre} · ${t.cant} unidad(es)`,
      feeder: alims.length - 1,
      icc,
      pdc: pdcPara(icc, c.pdcMin)
    });
  });
  const circ = [];
  if (SV.length) {
    const f = alims[1];
    const l = SV.map((x, i) => {
      const q = circuito(
        {
          tab: "TSG",
          id: "S-" + (i + 1),
          desc: x.nombre || "Carga común",
          tipo: TSERV[x.tipo],
          n: 1,
          P: x.p,
          L: x.L || 1,
          fases: x.fases,
          skTri: sk
        },
        c,
        f.dvAc,
        1
      );
      q.src = { t: "serv", i: x._i };
      q.elec = !!+x.elec;
      return q;
    });
    asignarID(l, c);
    circ.push(...l);
  }
  T.forEach((t, ti) => {
    const fi = alims.findIndex(a => a.pKey === "tipo" && a.ti === ti),
      up = alims[fi].dvAc;
    const list = grupos(
      [
        { n: t.nAl, p: c.pAl, ...alT(t), L: t.Lc || 1, desc: "Alumbrado", tipo: "Alumbrado" },
        { n: t.nTo, p: c.pTo, ...toT(t), L: t.Lc || 1, desc: "Tomacorrientes", tipo: "Tomacorriente" }
      ],
      c,
      t.tab,
      up,
      fi
    );
    list.forEach(q => {
      q.src = { t: "tipo", i: t._i };
    });
    P.cargasT.forEach((x, ix) => {
      if (Math.round(+x.dep || 0) !== t._i || !(x.p > 0)) return;
      const q = circuito(
        {
          tab: t.tab,
          id: "C-" + (list.length + 1),
          desc: x.nombre || "Carga especial",
          tipo: TIPOS[x.tipo].split(" (")[0],
          n: 1,
          P: x.p,
          L: x.L || 1,
          fases: 1
        },
        c,
        up,
        fi
      );
      q.src = { t: "cargasT", i: ix };
      q.elec = !!+x.elec;
      list.push(q);
    });
    asignarID(list, c);
    circ.push(...list);
  });
  circ
    .filter(q => q.tab === "TSG")
    .forEach(q => {
      q.ref = `${q.id} · ${q.desc}`;
    });
  const balItems = [...units.map(u => ({ ...u, key: u.ref })), ...circ.filter(q => q.tab === "TSG")];
  const bal = balancear(balItems, sk, (P.FIX || {}).multi);
  const emerg = SV.some(s => /emergencia/i.test(s.nombre));
  const CI =
    T.reduce(
      (s, t) => s + t.cant * (t.nAl * c.pAl + (exT(t)?.P || 0) + t.nTo * c.pTo + (exTt(t)?.P || 0) + t.Pesp),
      0
    ) + Pserv;
  return {
    mode: "multi",
    iccTG,
    c,
    sk,
    T,
    units,
    tramos,
    mdDeptos,
    aireTot,
    SV,
    Pserv,
    mdServ,
    maxMot,
    MD,
    CI,
    alims,
    circ,
    tabs,
    bal,
    emerg,
    pat: pozo(c.pat),
    contratada: Math.ceil(MD / 500) / 2,
    conexion: "Conexión en derivación con banco de medidores (Norma DGE, 301.C)",
    Selec: tierraElectrodo(gen.Izc)
  };
}
function alertas(r) {
  const A = [],
    maxDV = Math.max(...r.alims.map(a => a.dvAc), ...r.circ.map(q => q.dVt));
  A.push([
    r.alims.every(a => a.ok) && r.circ.every(q => q.ok),
    "050-102 · 050-104",
    r.alims.every(a => a.ok) && r.circ.every(q => q.ok)
      ? `Alimentadores y circuitos conformes. Caída de tensión máxima total ${fmt(maxDV, 2)} %.`
      : "Existen alimentadores o circuitos que no cumplen ampacidad o caída de tensión: revise longitudes o secciones."
  ]);
  A.push([
    r.pat.ok,
    "060-712",
    r.pat.ok
      ? `Resistencia de puesta a tierra estimada ${fmt(r.pat.Rt, 1)} Ω ≤ 25 Ω.`
      : `Resistencia estimada ${fmt(r.pat.Rt, 1)} Ω > 25 Ω: se requieren ${r.pat.nVar} electrodos separados al menos 2 m (≈ ${fmt(r.pat.Rn, 1)} Ω).`
  ]);
  if (!r.pat.okL || !r.pat.okD)
    A.push([
      false,
      "060-702",
      `La varilla debe tener al menos 2 m de longitud y 13 mm de diámetro (cobre) o 16 mm (acero-cobre).`
    ]);
  if (r.bal) {
    const b = r.bal;
    A.push([
      b.desb <= 10 ? true : "warn",
      "Balance de fases",
      b.desb <= 10
        ? `Desbalance de cargas ${fmt(b.desb, 1)} % (≤ 10 %, criterio de diseño).`
        : b.desb <= b.desbMin + 0.05
          ? `Desbalance de cargas ${fmt(b.desb, 1)} %: es el mínimo alcanzable con estas cargas (criterio de diseño ≤ 10 %). ${sugerencia(r)}`
          : `Desbalance de cargas ${fmt(b.desb, 1)} % con el reparto manual; el reparto automático lograría ${fmt(b.desbMin, 1)} %.`
    ]);
  } else if (r.mode === "uni" && r.md.MD > 8000)
    A.push([
      true,
      "050-106(9)",
      `Máxima demanda de ${fmt(r.md.MD / 1000, 2)} kW en suministro monofásico: evalúe un suministro trifásico 380/220 V con la concesionaria.`
    ]);
  if (r.mode === "multi")
    A.push([
      r.emerg,
      "EM.010 · Art. 11.1",
      r.emerg
        ? "Incluye iluminación de emergencia en rutas de evacuación."
        : "Los edificios multifamiliares deben contar con iluminación de emergencia en rutas de evacuación: agréguela en servicios generales."
    ]);
  A.push([true, "050-108(2)", `Se prevén ${r.c.reserva} espacio(s) de reserva por tablero para ampliaciones.`]);
  return A;
}

// Recomendaciones de diseño: no son incumplimientos (esos van en alertas), sino decisiones que cumplen la norma pero
// conviene revisar porque llevan a conductores mayores de lo necesario (sobre) o dejan poco margen (ajustado).
// Solo leen el resultado; el proyectista puede aceptarlas y el cálculo continúa igual. Umbrales explicados en el manual.
// Índice en SECC de la sección mínima solo por capacidad de corriente (sin caída de tensión); x.alim marca un alimentador
function idxPorCorriente(x, c) {
  const n3 = x.alim ? x.s.tri : x.f3,
    tabla = T2[c.met][c.aisl + (n3 ? "3" : "2")],
    fc = x.alim ? c.ft : c.fc,
    Smin = x.alim ? c.sminA : c.sminD;
  const k = SECC.findIndex((S, i) => S >= Smin && x.itm !== null && tabla[i] * fc >= x.itm);
  return k < 0 ? null : k;
}
/* Fracción de la caída de tensión permitida que usa un tramo con la sección S (1 = en el límite). La caída del
   tramo es inversamente proporcional a la sección. Alimentadores: acumulada ≤ 2.5 %; derivados: ≤ 2.5 % y total ≤ 4 % */
function usoDV(x, S) {
  const d = (x.dVp * x.S) / S;
  return x.alim ? (x.dvUp + d) / DV_ALIM : Math.max(d / DV_DER, (x.dvUp + d) / DV_TOT);
}
// Poco margen: el tramo usa el 90 % o más del límite de caída de tensión o de la capacidad del conductor (umbral de revisión)
const DV_MARGEN = 0.9;
const pocoMargen = x =>
  x.alim
    ? x.dvAc >= DV_MARGEN * DV_ALIM
    : x.dVp >= DV_MARGEN * DV_DER || x.dVt >= DV_MARGEN * DV_TOT || x.I >= DV_MARGEN * x.Izc;
function recomendaciones(r) {
  const c = r.c,
    R = [],
    nom = x => (x.tab ? `${r.tabs.length > 1 ? x.tab + " · " : ""}${x.id} ${x.desc}` : x.desc);
  const items = [...r.alims.map(a => ({ ...a, alim: true })), ...r.circ];
  // Destino del botón «Ir a»: el campo que define el dato o el circuito en el explorador
  const irItem = x =>
    x.alim
      ? x.pKey === "MD"
        ? { foco: r.mode === "multi" ? "Lgen" : "Lalim", lab: "Ir a la longitud del alimentador" }
        : x.pKey === "servP"
          ? { foco: "Lms", lab: "Ir a la longitud del alimentador" }
          : x.pKey === "piso" && x.piso === 1
            ? { foco: "Ltd1", lab: "Ir a la longitud del alimentador" }
            : { node: "vivienda", lab: "Ir a los datos del tablero" }
      : { node: "circ:" + x.key, lab: `Ir al circuito ${x.id}` };
  // Sección que bastaría solo por capacidad de corriente (sin caída de tensión)
  const porCorriente = x => idxPorCorriente(x, c);
  // Sección automática (la mínima que cumple): la elegida en el cuadro de conductores no cuenta aquí
  const dv = items.filter(x => {
    const k = porCorriente(x);
    return k !== null && SECC.indexOf(x.Sauto ?? x.S) - k >= 2;
  });
  if (dv.length)
    R.push({
      id: "dv|" + dv.map(nom).join(","),
      tipo: "sobre",
      tit: "Secciones definidas por la caída de tensión",
      txt: `${dv
        .slice(0, 4)
        .map(
          x =>
            `${nom(x)}: ${x.Sauto ?? x.S} mm² (por corriente bastaría ${SECC[porCorriente(x)]} mm², L = ${fmt(x.L, 1)} m)`
        )
        .join("; ")}${dv.length > 4 ? ` y ${dv.length - 4} más` : ""}.`,
      sug: "Si la longitud es correcta, la sección es la que exige la Regla 050-102. Para reducirla, acerque el tablero a las cargas, divida el circuito o use un tablero de distribución intermedio.",
      ir: irItem(dv[0])
    });
  // Secciones elegidas en el cuadro de conductores, mayores que la mínima que cumple
  const ma = items.filter(x => x.Sauto);
  if (ma.length)
    R.push({
      id: "secf|" + ma.map(x => `${nom(x)}:${x.S}`).join(","),
      tipo: "sobre",
      tit: "Secciones mayores que la mínima que cumple",
      txt: `${ma
        .slice(0, 4)
        .map(x => `${nom(x)}: ${x.S} mm² elegido; cumple desde ${x.Sauto} mm²`)
        .join("; ")}${ma.length > 4 ? ` y ${ma.length - 4} más` : ""}.`,
      sug: "El conductor mayor también cumple la norma, pero cuesta más. Si no hay un motivo para usarlo, vuelva a la sección automática (la primera de la lista) en el cuadro de conductores.",
      ir: { act: "cond", lab: "Abrir el cuadro de conductores" }
    });
  const im = r.alims.filter(a => a.Imin && a.Id === a.Imin && a.Imin >= 2 * a.I);
  if (im.length)
    R.push({
      id: "imin|" + im.map(a => a.desc).join(","),
      tipo: "sobre",
      tit: "Interruptor fijado por la corriente mínima del código",
      txt:
        im
          .map(a => `${a.desc}: carga de ${fmt(a.I, 1)} A, pero el código exige al menos ${a.Imin} A (ITM ${a.itm} A)`)
          .join("; ") + ".",
      sug: "Es una exigencia de las Reglas 050-200(1)(b) y 050-202(1)(b), no un error de cálculo. Basta con conocerla al revisar el expediente.",
      ir: { view: "alims", lab: "Ver alimentadores" }
    });
  if (c.met === "A1")
    R.push({
      id: "a1",
      tipo: "sobre",
      tit: "Método A1: pared térmicamente aislante",
      txt: "El método A1 corresponde a tubos en paredes con revestimiento aislante y reduce la capacidad de los conductores (por ejemplo, 10 mm²: 46 A en A1 y 57 A en B1).",
      sug: "Si los tubos van empotrados en ladrillo o concreto, corresponde el método B1 (CNE-U, Tabla 4, ítem 59).",
      ir: { foco: "met", lab: "Ir a Método de instalación" }
    });
  if (c.resAl === 0)
    R.push({
      id: "res0",
      tipo: "sub",
      tit: "Alimentadores sin reserva para ampliaciones",
      txt: "Los alimentadores de vivienda se dimensionan con la corriente de la máxima demanda, sin el 25 % de reserva usual.",
      sug: "Es el mínimo que admite la norma (Reglas 050-200(3) y 050-202(2)). Úselo si no se prevén ampliaciones; en caso contrario, elija 25 %.",
      ir: { foco: "resAl", lab: "Ir a Reserva en alimentadores" }
    });
  const mg = items.filter(x => x.ok && pocoMargen(x));
  if (mg.length)
    R.push({
      id: "margen|" + mg.map(nom).join(","),
      tipo: "sub",
      tit: "Poco margen de caída de tensión o de capacidad",
      txt: `${mg.slice(0, 4).map(nom).join("; ")}${mg.length > 4 ? ` y ${mg.length - 4} más` : ""}: ${mg.length > 1 ? "usan" : "usa"} el 90 % o más del límite de caída de tensión o de la capacidad del conductor.`,
      sug: "Cumplen, pero cualquier carga o longitud adicional los dejaría fuera de norma. Si se prevén ampliaciones o el recorrido en obra puede ser más largo, elija la sección siguiente en el cuadro de conductores.",
      ir: { act: "cond", lab: "Abrir el cuadro de conductores" }
    });
  // Umbral de tomacorrientes: 180 W en vivienda (CNE tomo V: 180 VA) y 250 VA en usos comerciales (criterio de diseño).
  // El alumbrado no se evalúa: con luminarias LED es normal usar menos de 100 W por salida (se usa la potencia real del equipo)
  const tTo = r.viv === false ? VA_TOMA_COM : 180;
  const pw = r.circ.filter(q => q.n > 0 && q.tipo === "Tomacorriente" && !q.mix && q.P / q.n < tTo);
  if (pw.length)
    R.push({
      id: "pot",
      tipo: "sub",
      tit: "Potencia por tomacorriente menor que la usual",
      txt: `Se usan menos de ${tTo} W por tomacorriente.`,
      sug:
        r.viv === false
          ? `En oficinas y usos comerciales se adopta ${VA_TOMA_COM} VA por tomacorriente como criterio de diseño, por la conexión de varios equipos por punto (impresoras, fotocopiadoras, computadoras). Use valores menores solo si están justificados.`
          : "El valor usual de diseño es 180 W por tomacorriente (el CNE tomo V indica 180 VA por salida). Use valores menores solo si están justificados.",
      ir: { foco: r.mode === "multi" ? "pTo" : "tg_p", lab: "Ir a Potencia por tomacorriente" }
    });
  if (c.temp < 30)
    R.push({
      id: "temp",
      tipo: "sub",
      tit: "Temperatura ambiente menor de 30 °C",
      txt: `Con ${c.temp} °C la Tabla 5A aumenta la capacidad de los conductores (factor ${fmt(c.ft, 2)}).`,
      sug: "Use la temperatura del lugar más caluroso por donde pasan los conductores (techos, muros expuestos al sol).",
      ir: { foco: "temp", lab: "Ir a Temperatura ambiente" }
    });
  if (c.met === "C")
    R.push({
      id: "metc",
      tipo: "sub",
      tit: "Método C: cable a la vista sobre pared",
      txt: "El método C supone cables sin tubo, fijados sobre la pared, y da la mayor capacidad de la Tabla 2.",
      sug: "Si los conductores van dentro de tubos empotrados, corresponde el método B1.",
      ir: { foco: "met", lab: "Ir a Método de instalación" }
    });
  const l1 = items.filter(x => x.L <= 1);
  if (l1.length)
    R.push({
      id: "l1|" + l1.map(nom).join(","),
      tipo: "sub",
      tit: "Longitudes de 1 m o menos",
      txt: `${l1.slice(0, 4).map(nom).join("; ")}${l1.length > 4 ? ` y ${l1.length - 4} más` : ""}: ${l1.length > 1 ? "las longitudes son" : "la longitud es"} de 1 m o menos, valor que se adopta cuando falta el dato.`,
      sug: "Ingrese la longitud real hasta la salida más alejada; con 1 m la caída de tensión resulta casi nula.",
      ir: irItem(l1[0])
    });
  return R;
}
