/* CÁLCULO · PUESTA A TIERRA, CORTOCIRCUITO Y BALANCE DE FASES
   pozo(): resistencia de la puesta a tierra y número de varillas (Reglas 060-702 y 060-712) con el factor de
   agrupamiento; iccAbajo(): cortocircuito aguas abajo de un conductor; balancear(): reparto de las cargas
   monofásicas entre fases, con las fases fijadas por el usuario. Parte del motor de js/calculo.js. */
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
