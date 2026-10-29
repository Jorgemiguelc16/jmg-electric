/* CÁLCULO · EDIFICIO MULTIFAMILIAR
   calcMulti(): máxima demanda del edificio (Regla 050-202), alimentador general, de servicios generales y de cada
   departamento, circuitos, balance de los suministros entre fases, cortocircuito y puesta a tierra. Parte del motor
   de js/calculo.js. */
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
  // Diferenciales del tablero de servicios generales, ya con la fase de cada circuito
  asignarID(
    circ.filter(q => q.tab === "TSG"),
    c
  );
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
