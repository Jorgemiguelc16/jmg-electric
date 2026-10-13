/* ================= Presentación ================= */
const pill=(ok,yes="Cumple",no="No cumple")=>`<span class="pill ${ok?"ok":"bad"}">${ok?yes:no}</span>`;
const pillS=(st,t)=>`<span class="pill ${st}">${t}</span>`;
const condTxt=(n,S,c)=>`${n}-1×${S} mm²${c&&c.desig?" "+c.desig:""}`;
const sugerencia=r=>{ const m=r.bal&&r.bal.mayor; if(!m||r.bal.desbMin<=10) return "";
  return r.mode==="uni"?`Sugerencia: divida el circuito ${m.id} (${m.desc}, ${fmt(m.P,0)} W) en dos circuitos o aliméntelo como carga trifásica.`
    :`Sugerencia: el reparto está limitado por unidades de gran carga (${m.ref||m.desc}, ${fmt(m.P,0)} W); evalúe un suministro trifásico para ellas o redistribuya las cargas comunes.`; };
let MODE="uni", TAB="inicio", LAST=null, FIX={uni:{},multi:{}}, VIEW="resumen", PID=null;
try{ VIEW=localStorage.getItem("jmg-electric-view")||"resumen"; }catch(e){}
const VORDEN=["resumen","demanda","alims","cuadro","balance","unifilar","metrado","verif"];
const VLBL={resumen:"Resumen",demanda:"Máxima demanda",alims:"Alimentadores",cuadro:"Cuadro de cargas",balance:"Balance de fases",unifilar:"Diagrama unifilar",metrado:"Metrado",verif:"Verificaciones"};

function tablaAlims(r,nro){
  return `<section class="card"><h2><span><span class="num">${nro}</span>Alimentadores</span><span class="ref">050-102 · 050-104 · Tabla 2</span></h2>
  <div class="tbl-wrap"><table><thead><tr><th class="t">Alimentador</th>${r.mode==="multi"?"<th>Cant.</th>":""}<th>P (kW)</th><th>Sistema</th><th>I (A)</th><th>Id (A)</th><th>ITM</th><th>PdC</th><th>Conductor Cu</th><th>Iz corr. (A)</th><th>L (m)</th><th>ΔV %</th><th>ΔV acum. %</th><th>Tierra</th><th>Tubo</th><th class="t">Estado</th></tr></thead><tbody>
  ${r.alims.map(a=>`<tr><td class="t">${a.desc}</td>${r.mode==="multi"?`<td>${a.cant??1}</td>`:""}<td>${fmt(a.P/1000,2)}</td><td>${a.s.txt}</td><td>${fmt(a.I,2)}</td><td>${fmt(a.Id,2)}${a.Imin&&a.Id===a.Imin?"*":""}</td><td>${a.s.tri?3:2}×${a.itm??"—"} A</td><td>${a.pdc??"—"} kA</td><td>${condTxt(a.s.n,a.S,r.c)}</td><td>${fmt(a.Izc,1)}</td><td>${fmt(a.L,1)}</td><td>${fmt(a.dVp,2)}</td><td>${fmt(a.dvAc,2)}</td><td>${a.St} mm²</td><td>${a.tubo.mm?a.tubo.mm+" mm":a.tubo.pul}</td><td class="t">${pill(a.ok,"Cumple","Revisar")}</td></tr>`).join("")}
  </tbody></table></div><div class="body"><p class="hint">* Corriente mínima del código: ${r.mode==="uni"?"40 A (050-200(1)(b))":"25 A por departamento (050-202(1)(b))"}. PdC: poder de corte mínimo del interruptor.</p></div></section>`;
}
function tablaCircuitos(r,nro){
  let rows=""; const tri=!!r.bal&&r.mode==="uni";
  r.tabs.forEach(tb=>{
    const f=r.alims[tb.feeder], cs=r.circ.filter(c=>c.tab===tb.tab);
    rows+=`<tr class="grp"><td colspan="${tri?17:16}">Tablero ${tb.tab} — ${tb.desc} · ΔV aguas arriba ${fmt(f.dvAc,2)} % · Icc ${fmt(tb.icc,2)} kA · PdC mínimo ${tb.pdc} kA</td></tr>`;
    cs.forEach(c=>{ rows+=`<tr><td class="t"><strong>${c.id}</strong></td><td class="t">${esc(c.desc)}</td><td>${c.n}</td><td>${fmt(c.P,0)}</td><td>${c.f3?"3φ":"1φ"}</td>${tri?`<td>${c.fase}</td>`:""}<td>${fmt(c.I,2)}</td><td>${fmt(c.Id,2)}</td><td>${c.f3?3:2}×${c.itm??"—"} A · ${c.curva}</td><td>${condTxt(c.f3?3:2,c.S,r.c)}</td><td>${fmt(c.Izc,1)}</td><td>${fmt(c.L,0)}</td><td>${fmt(c.dVp,2)}</td><td>${fmt(c.dVt,2)}</td><td>${c.St} mm²</td><td class="t">${c.idName} · ${c.f3?4:2}×${c.idRat} A · 30 mA</td><td class="t">${pill(c.ok,"OK","Revisar")}</td></tr>`; });
    const pre=tb.tab==="TSG"?"S-":"C-";
    for(let i=1;i<=r.c.reserva;i++) rows+=`<tr class="res"><td class="t">${pre}${cs.length+i}</td><td class="t">Reserva</td><td colspan="${tri?15:14}"></td></tr>`;
  });
  const allOk=r.circ.every(c=>c.ok);
  return `<section class="card"><h2><span><span class="num">${nro}</span>Cuadro de cargas — circuitos derivados</span><span class="ref">${allOk?pill(true,"Todos cumplen"):pill(false,"","Revisar observaciones")}</span></h2>
  <div class="tbl-wrap"><table><thead><tr><th class="t">Circ.</th><th class="t">Descripción</th><th>Salidas</th><th>P (W)</th><th>Fases</th>${tri?"<th>Fase</th>":""}<th>I (A)</th><th>Id (A)</th><th>ITM</th><th>Conductor Cu</th><th>Iz corr. (A)</th><th>L (m)</th><th>ΔV %</th><th>ΔV total %</th><th>Tierra</th><th class="t">Diferencial</th><th class="t">Estado</th></tr></thead><tbody>${rows}</tbody></table></div>
  <div class="body"><p class="hint">Conductores según Tabla 2, método ${r.c.met}; corrección ${fmt(r.c.ft,2)} (temperatura) × ${fmt(r.c.fa,2)} (agrupamiento) = ${fmt(r.c.fc,2)}. Diferenciales: ${r.c.idMode==="grupo"?"uno por cada grupo de tres circuitos (150-400(8))":"uno por circuito (150-400(9))"}. ITM curva C en circuitos generales${r.circ.some(q=>q.motor)?"; curva D en circuitos de motores, con conductor al 125 % de la corriente a plena carga (Reglas 160-106 y 160-200)":""}.</p></div></section>`;
}
function cardBalance(r,nro){
  if(!r.bal) return "";
  const b=r.bal, tot=(b.ph[0]+b.ph[1]+b.ph[2])||1, mx=Math.max(...b.ph)||1, st=b.desb<=10?"ok":"warn";
  const lab=i=>i.ref||`${i.id} · ${i.desc}`, fx=FIX[r.mode]||{};
  const bars=b.nm.map((n,k)=>`<div class="ph"><b>${n}</b><span class="bar"><i style="width:${(b.ph[k]/mx*100).toFixed(1)}%"></i></span><span>${fmt(b.ph[k],0)} W · ${fmt(b.ph[k]/tot*100,1)} %</span></div>`).join("");
  const msg=b.desb<=10?`Desbalance de ${fmt(b.desb,1)} %: dentro del criterio de diseño (≤ 10 %).`
    :b.desb<=b.desbMin+0.05?`Con estas cargas el menor desbalance posible es ${fmt(b.desbMin,1)} %. ${sugerencia(r)}`
    :`El reparto manual da ${fmt(b.desb,1)} %; el reparto automático lograría ${fmt(b.desbMin,1)} %. ${sugerencia(r)}`;
  const rows=b.items.map(i=>{
    if(i.f3) return `<tr><td class="t">${esc(lab(i))}</td><td>${fmt(i.P,0)}</td><td>3φ</td><td class="t"><span class="hint">Repartida en las tres fases</span></td></tr>`;
    const f=fx[i.key]||"";
    return `<tr${i.fijo?' class="fix"':""}><td class="t">${esc(lab(i))}</td><td>${fmt(i.P,0)}</td><td><strong>${i.fase}</strong></td><td class="t"><select class="fsel" data-fase="${esc(i.key)}" aria-label="Fase de ${esc(lab(i))}"><option value="">Automático</option>${b.nm.map(n=>`<option value="${n}"${f===n?" selected":""}>Fijar en ${n}</option>`).join("")}</select></td></tr>`; }).join("");
  return `<section class="card"><h2><span><span class="num">${nro}</span>Balance de cargas por fase</span><span class="ref">${pillS(st,`Desbalance ${fmt(b.desb,1)} %`)}</span></h2>
  <div class="body"><div class="phases">${bars}</div><p class="balmsg ${st}">${msg}</p>${b.nFix?`<button type="button" class="btn sec sm" data-balreset>Restablecer automático</button>`:""}</div>
  <div class="tbl-wrap"><table><thead><tr><th class="t">Carga</th><th>Potencia (W)</th><th>Fase</th><th class="t">Asignación</th></tr></thead><tbody>${rows}</tbody></table></div>
  <div class="body"><p class="hint">«Automático» busca el reparto con el menor desbalance posible. Fije la fase de una carga y el resto se reacomoda alrededor. Desbalance = (fase más cargada − promedio) / promedio.</p></div></section>`;
}
function cardSuministro(r,nro){
  const a0=r.alims[0], md=r.mode==="uni"?r.md.MD:r.MD;
  return `<section class="card"><h2><span><span class="num">${nro}</span>Suministro y conexión</span><span class="ref">EM.010 · Norma DGE</span></h2><div class="body"><dl class="spec">
    <dt>Potencia instalada</dt><dd>${fmt(r.CI/1000,2)} kW</dd><dt>Máxima demanda</dt><dd>${fmt(md/1000,2)} kW</dd><dt>Factor de demanda</dt><dd>${fmt(md/(r.CI||1),2)}</dd>
    <dt>Potencia a contratar sugerida</dt><dd>${fmt(r.contratada,1)} kW</dd><dt>Sistema de suministro</dt><dd>${a0.s.nom}</dd><dt>Tipo de conexión</dt><dd style="white-space:normal">${r.conexion}</dd>
    <dt>Interruptor general</dt><dd>${a0.s.tri?3:2}×${a0.itm} A · ${a0.pdc} kA</dd><dt>Icc punto de entrega / TG</dt><dd>${fmt(r.c.iccE,1)} / ${fmt(r.iccTG,2)} kA</dd></dl></div></section>`;
}
function cardPozo(r,nro){
  const p=r.pat;
  return `<section class="card"><h2><span><span class="num">${nro}</span>Sistema de puesta a tierra</span><span class="ref">060-702 · 060-712 · Tabla 17</span></h2><div class="body">
  <dl class="spec"><dt>Resistividad del suelo</dt><dd>${fmt(p.rho,0)} Ω·m</dd><dt>Varilla de cobre</dt><dd>${fmt(p.Lv,2)} m · Ø ${fmt(p.dv*1000,1)} mm</dd>
  <dt>Resistencia sin tratamiento</dt><dd>${fmt(p.Rv,2)} Ω</dd><dt>Resistencia con tratamiento</dt><dd>${fmt(p.Rt,2)} Ω ${pill(p.ok,"≤ 25 Ω","> 25 Ω")}</dd>
  ${p.nVar>1?`<dt>Electrodos requeridos</dt><dd>${p.nVar} varillas · ≈ ${fmt(p.Rn,2)} Ω</dd>`:""}
  <dt>Conductor de puesta a tierra</dt><dd>${r.Selec} mm² Cu</dd></dl></div></section>`;
}
function cardAlertas(r,nro){
  return `<section class="card"><h2><span><span class="num">${nro}</span>Verificaciones normativas</span></h2><div class="body"><ul class="alerts">${alertas(r).map(([ok,ref,t])=>`<li class="${ok===true?"ok":ok==="warn"?"warn":"bad"}"><b>${ref}</b><span>${t}</span></li>`).join("")}</ul></div></section>`;
}
