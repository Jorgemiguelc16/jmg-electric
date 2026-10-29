/* CÁLCULO · VIVIENDA Y OTROS USOS
   calcUni(): vivienda unifamiliar (con sus pisos y tableros) y otros usos (oficinas, comercios, escuelas, hospitales,
   hoteles): máxima demanda, alimentadores, circuitos, balance, cortocircuito y puesta a tierra. Parte del motor de
   js/calculo.js. */
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
    circ.push(...list);
  });
  const bal = balancear(circ, sk, (P.FIX || {}).uni);
  // Diferenciales de cada tablero, ya con la fase de cada circuito
  tabs.forEach(tb =>
    asignarID(
      circ.filter(q => q.tab === tb.tab),
      c
    )
  );
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
