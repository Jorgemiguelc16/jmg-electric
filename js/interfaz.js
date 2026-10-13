let PRINT=null;
function render(r){
  const k=[]; const maxDV=Math.max(...r.alims.map(a=>a.dvAc),...r.circ.map(c=>c.dVt)), a0=r.alims[0];
  if(r.mode==="uni") k.push(["Potencia instalada",fmt(r.CI/1000,2),"kW","Salidas y equipos"],["Máxima demanda",fmt(r.md.MD/1000,2),"kW","Regla 050-200"],["Alimentador",a0.S,"mm²",`${fmt(a0.I,1)} A · ${a0.s.txt}`],["ITM general",a0.itm??"—","A",`${a0.s.tri?3:2} polos · ${a0.pdc} kA`]);
  else k.push(["Departamentos",r.units.length,"",`${r.T.length} tipo(s)`],["Máxima demanda",fmt(r.MD/1000,2),"kW","Edificio · Regla 050-202"],["Alimentador general",a0.S,"mm²",`${fmt(a0.I,1)} A · ${a0.s.txt}`],["ITM general",a0.itm??"—","A",`${a0.s.tri?3:2} polos · ${a0.pdc} kA`]);
  k.push(["Potencia a contratar",fmt(r.contratada,1),"kW","Sugerida"],["ΔV máx. total",fmt(maxDV,2),"%",pill(maxDV<=DV_TOT,"Dentro del límite","Excede 4 %")],["Puesta a tierra",fmt(r.pat.Rt,1),"Ω",pill(r.pat.ok,"Cumple","Excede 25 Ω")]);
  if(r.bal) k.push(["Desbalance",fmt(r.bal.desb,1),"%",r.bal.desb<=10?pillS("ok","≤ 10 %"):pillS("warn",r.bal.desb<=r.bal.desbMin+0.05?"Mínimo posible":"Revisar reparto")]);
  let html=`<div class="kpis">${k.map(([a,b,u,n])=>`<div class="kpi"><div class="k">${a}</div><div class="v">${b}${u?`<small>${u}</small>`:""}</div><div class="n">${n}</div></div>`).join("")}</div>`;
  const S={}, A=alertas(r);
  S.resumen=()=>`<div class="two">${cardSuministro(r,"")}${cardPozo(r,"")}</div>${cardAlertas(r,"")}`;
  S.demanda=()=>{ let html="";
    if(r.mode==="uni"){ const m=r.md;
      html+=`<section class="card"><h2><span><span class="num"></span>Máxima demanda de la vivienda</span><span class="ref">050-110 · 050-200</span></h2><div class="tbl-wrap"><table>
      <thead><tr><th class="t">Concepto</th><th class="t">Criterio</th><th>Instalada (W)</th><th>Demanda (W)</th></tr></thead><tbody>
      <tr><td class="t">Carga básica · ${fmt(r.area,1)} m² de vivienda</td><td class="t">Primeros 90 m² y cada 90 m² adicionales</td><td>—</td><td>${fmt(m.basica,0)}</td></tr>
      <tr><td class="t">Cocina eléctrica</td><td class="t">Valor fijo y exceso sobre 12 kW</td><td>${fmt(m.coc,0)}</td><td>${fmt(m.mdCoc,0)}</td></tr>
      <tr><td class="t">Calentadores de agua / duchas</td><td class="t">Al 100 %</td><td>${fmt(m.cal,0)}</td><td>${fmt(m.cal,0)}</td></tr>
      <tr><td class="t">Aire acondicionado</td><td class="t">Al 100 %</td><td>${fmt(m.aire,0)}</td><td>${fmt(m.aire,0)}</td></tr>
      <tr><td class="t">Otras cargas mayores de 1 500 W</td><td class="t">${m.coc>0?"Al 25 % (existe cocina)":"Al 100 % hasta 6 kW y 25 % del exceso"}</td><td>${fmt(m.otras,0)}</td><td>${fmt(m.mdOtras,0)}</td></tr>
      <tr class="total"><td class="t" colspan="3">Máxima demanda</td><td>${fmt(m.MD,0)}</td></tr></tbody></table></div></section>`;
    } else {
      html+=`<section class="card"><h2><span><span class="num"></span>Carga por unidad de vivienda</span><span class="ref">050-202(1)</span></h2><div class="tbl-wrap"><table>
      <thead><tr><th class="t">Tipo</th><th>Unid.</th><th>Área (m²)</th><th>Carga básica</th><th>Cocina</th><th>Calentador</th><th>Aire acond.</th><th>Otras &gt;1,5 kW</th><th>MD unidad (W)</th><th>I (A)</th></tr></thead><tbody>
      ${r.T.map(t=>`<tr><td class="t"><strong>${esc(t.nombre)}</strong></td><td>${t.cant}</td><td>${fmt(t.area,0)}</td><td>${fmt(t.md.basica,0)}</td><td>${fmt(t.md.mdCoc,0)}</td><td>${fmt(t.md.cal,0)}</td><td>${fmt(t.md.aire,0)}</td><td>${fmt(t.md.mdOtras,0)}</td><td><strong>${fmt(t.md.MD,0)}</strong></td><td>${fmt(t.md.MD/(220*r.c.fp),2)}</td></tr>`).join("")}
      </tbody></table></div></section>`;
      html+=`<div class="two"><section class="card"><h2><span><span class="num"></span>Máxima demanda del edificio</span><span class="ref">050-202(3)</span></h2><div class="tbl-wrap"><table>
      <thead><tr><th class="t">Tramo</th><th>Unid.</th><th>Carga (W)</th><th>Factor</th><th>Demanda (W)</th></tr></thead><tbody>
      ${r.tramos.map(t=>`<tr><td class="t">${t.lab}</td><td>${t.n}</td><td>${fmt(t.sum,0)}</td><td>${fmt(t.f*100,0)} %</td><td>${fmt(t.dem,0)}</td></tr>`).join("")}
      <tr><td class="t">Aire acondicionado</td><td></td><td>${fmt(r.aireTot,0)}</td><td>100 %</td><td>${fmt(r.aireTot,0)}</td></tr>
      <tr><td class="t">Cargas comunes (servicios generales)</td><td></td><td>${fmt(r.Pserv,0)}</td><td>75 %</td><td>${fmt(r.mdServ,0)}</td></tr>
      <tr class="total"><td class="t" colspan="4">Máxima demanda del edificio</td><td>${fmt(r.MD,0)}</td></tr></tbody></table></div></section>
      <section class="card"><h2><span><span class="num"></span>Servicios generales</span><span class="ref">Tablero TSG</span></h2><div class="tbl-wrap"><table>
      <thead><tr><th class="t">Carga común</th><th>Fases</th><th>P (W)</th></tr></thead><tbody>
      ${r.SV.map(s=>`<tr><td class="t">${esc(s.nombre)}</td><td>${s.fases===3&&SIST[r.sk].tri?"3φ":"1φ"}</td><td>${fmt(s.p,0)}</td></tr>`).join("")||`<tr><td class="t" colspan="3">Sin cargas comunes</td></tr>`}
      <tr class="total"><td class="t" colspan="2">Potencia total</td><td>${fmt(r.Pserv,0)}</td></tr>
      ${r.maxMot>0?`<tr><td class="t" colspan="2">Diseño del alimentador TSG (+25 % del mayor motor)</td><td>${fmt(r.Pserv+0.25*r.maxMot,0)}</td></tr>`:""}</tbody></table></div></section></div>`;
    }
    return html; };
  S.alims=()=>tablaAlims(r,""); S.cuadro=()=>tablaCircuitos(r,"");
  if(r.bal) S.balance=()=>cardBalance(r,"");
  S.unifilar=()=>cardUnifilar(r,""); S.metrado=()=>cardMetrado(r); S.verif=()=>cardAlertas(r,"");
  const st={alims:r.alims.every(a=>a.ok)?"":"bad",cuadro:r.circ.every(q=>q.ok)?"":"bad",balance:r.bal&&r.bal.desb>10?"warn":"",
    verif:A.some(x=>x[0]===false)?"bad":A.some(x=>x[0]==="warn")?"warn":""};
  if(!S[VIEW]) VIEW="resumen";
  const kp=html;
  PRINT=()=>{ const P=r.c.proj, f=new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"long",year:"numeric"});
    return `<header class="pr-head"><div class="pr-brand"><b>JMG - ELECTRIC</b><span>Resultados de cálculo · ${r.mode==="multi"?"Vivienda multifamiliar":"Vivienda unifamiliar"}</span></div>
    <dl class="pr-info"><dt>Proyecto</dt><dd>${esc(P.nombre||"—")}</dd><dt>Propietario</dt><dd>${esc(P.prop||"—")}</dd><dt>Ubicación</dt><dd>${esc(P.ubic||"—")}</dd><dt>Proyectista</dt><dd>${esc(P.proy||"—")}</dd><dt>Normativa</dt><dd>CNE-Utilización · RNE EM.010 · Norma DGE</dd><dt>Fecha</dt><dd>${f} · ${VERSION}</dd></dl></header>
    ${kp}${VORDEN.filter(k=>S[k]&&k!=="verif").map(k=>`<div class="pr-sec"><h2 class="pr-h">${VLBL[k]}</h2>${S[k]()}</div>`).join("")}
    <p class="aviso-norma">Cálculos conforme al CNE-Utilización, RNE EM.010 y Normas DGE vigentes. Como en todo proyecto eléctrico, los resultados deben ser verificados por el profesional responsable antes de su ejecución.</p>`; };
  html+=`<nav class="vtabs" role="tablist" aria-label="Resultados">${VORDEN.filter(k=>S[k]).map(k=>`<button type="button" role="tab" class="vtab${st[k]?" "+st[k]:""}" data-view="${k}" aria-selected="${k===VIEW}">${VLBL[k]}</button>`).join("")}</nav>`;
  html+=`<div class="vpanel">${S[VIEW]()}</div>`;
  html+=`<p class="aviso-norma">Cálculos conforme al CNE-Utilización, RNE EM.010 y Normas DGE vigentes. Como en todo proyecto eléctrico, los resultados deben ser verificados por el profesional responsable antes de su ejecución.</p>`;
  $("results").innerHTML=html;
}
function setMode(m){
  MODE=m;
  $("btnMode").textContent=m==="uni"?"Cambiar a multifamiliar":"Cambiar a unifamiliar";
  $("ws").dataset.mode=m;
  $("modeTxt").textContent=$("wsModoTxt").textContent=m==="uni"?"Vivienda unifamiliar":"Edificio multifamiliar";
  if(!$("ws").hidden&&fsDe(NODE)) selNode(NODE);
  update();
}
function setTab(t){
  if(t==="calculo"||t==="ajustes"){ abrirWS(t==="ajustes"?"param":null); try{ localStorage.setItem("jmg-electric-tab","calculo"); }catch(e){} return; }
  if(document.body.classList.contains("ws-on")) cerrarWS(true);
  TAB=t; document.body.classList.toggle("en-inicio",t==="inicio");
  document.querySelectorAll(".tab").forEach(b=>b.setAttribute("aria-selected",b.dataset.tab===t));
  document.querySelectorAll(".tabpanel").forEach(p=>p.hidden=p.id!=="tab-"+t);
  try{ localStorage.setItem("jmg-electric-tab",t); }catch(e){}
  if(t==="inicio"){ refreshLast(); heroDraw(); requestAnimationFrame(fijarLado); }
  if(t==="proy") renderProy();
  if(t==="herr") herr();
  if(t==="soporte") refrSoporte();
  try{ window.scrollTo({top:0}); }catch(e){}
}
function hdrEstado(){
  const n=$("p_nombre").value.trim();
  $("hdrProj").innerHTML=n?`<span class="k">Proyecto</span><span class="v">${esc(n)}</span><span class="ok">Guardado ✓</span>`:`<span class="k">Proyecto</span><span class="v muted">Sin nombre</span><span class="warn">Asigne un nombre para guardarlo</span>`;
}
function validar(){
  const E=[], v=id=>{ const x=$(id).value.trim(); return x===""?0:parseFloat(x); };
  document.querySelectorAll(".inv").forEach(e=>e.classList.remove("inv"));
  const chk=(id,ok,msg)=>{ if(ok) return; const el=$(id); if(el) el.classList.add("inv"); E.push(msg); };
  chk("fp",v("fp")>=0.5&&v("fp")<=1,"El factor de potencia debe estar entre 0.5 y 1.");
  chk("iccE",v("iccE")>0,"Ingrese la corriente de cortocircuito del punto de entrega (Ajustes).");
  chk("rho_s",v("rho_s")>0,"Ingrese la resistividad del suelo (Ajustes).");
  chk("Lv",v("Lv")>=0.5,"Ingrese la longitud de la varilla de puesta a tierra (Ajustes).");
  chk("maxSal",v("maxSal")>=1&&v("maxSal")<=12,"Las salidas por circuito deben estar entre 1 y 12 (Regla 070-3000).");
  if(MODE==="uni"){
    chk("area",v("area")>0,"Ingrese el área techada de la vivienda.");
    chk("sot",!(v("sot")<0),"El área de sótano no puede ser negativa.");
    chk("Lalim",v("Lalim")>0,"Ingrese la longitud del alimentador.");
    [["al","alumbrado"],["tg","tomacorrientes generales"],["tc","tomacorrientes de cocina"]].forEach(([k,t])=>{
      chk(k+"_n",v(k+"_n")>=0,`Ingrese la cantidad de salidas de ${t} (0 si no hay).`);
      chk(k+"_p",v(k+"_p")>=0,`Ingrese la potencia por salida de ${t}.`);
      if(v(k+"_n")>0) chk(k+"_L",v(k+"_L")>0,`Ingrese la longitud de los circuitos de ${t}.`); });
    cargas.forEach((x,i)=>{ chk(`cargas_p_${i}`,x.p>=0,`Carga especial ${i+1}: la potencia no puede ser negativa.`); if(x.p>0) chk(`cargas_L_${i}`,x.L>0,`Carga especial ${i+1} (${x.nombre}): ingrese la longitud.`); });
  } else {
    chk("Lgen",v("Lgen")>0,"Ingrese la longitud del alimentador general.");
    if(serv.length) chk("Lms",v("Lms")>0,"Ingrese la longitud al tablero de servicios generales.");
    if(!tipos.some(t=>t.cant>0)) E.push("Agregue al menos un tipo de departamento con una o más unidades.");
    tipos.forEach((t,i)=>{ const n=t.nombre||`Tipo ${i+1}`;
      chk(`tipos_cant_${i}`,t.cant>=0&&Number.isInteger(t.cant),`${n}: el número de unidades debe ser un entero.`);
      if(t.cant>0){ chk(`tipos_area_${i}`,t.area>0,`${n}: ingrese el área de vivienda.`); chk(`tipos_Ld_${i}`,t.Ld>0,`${n}: ingrese la longitud del alimentador.`); chk(`tipos_Lc_${i}`,t.Lc>0,`${n}: ingrese la longitud de los circuitos.`); } });
    serv.forEach((x,i)=>{ if(x.p>0) chk(`serv_L_${i}`,x.L>0,`Carga común ${i+1} (${x.nombre}): ingrese la longitud.`); });
  }
  return E;
}
function faltantes(){
  const F=[], vacio=v=>v==null||v===""||!(parseFloat(v)>0), val=id=>$(id)?$(id).value:"";
  document.querySelectorAll(".falta").forEach(e=>e.classList.remove("falta"));
  const req=(id,l,cond)=>{ if(cond===undefined?vacio(val(id)):cond){ F.push({id,l}); const el=$(id); if(el) el.classList.add("falta"); } };
  if(MODE==="uni"){
    req("area","Área techada de la vivienda"); req("Lalim","Longitud del alimentador");
    [["al","alumbrado"],["tg","tomacorrientes"]].forEach(([k,t])=>{ req(k+"_n",`Número de salidas de ${t}`); req(k+"_p",`Potencia por salida de ${t}`); req(k+"_L",`Longitud de los circuitos de ${t}`); });
    if(parseFloat(val("tc_n"))>0){ req("tc_p","Potencia por salida de tomacorrientes de cocina"); req("tc_L","Longitud de los circuitos de cocina"); }
    cargas.forEach((x,i)=>{ const n=x.nombre||`Carga especial ${i+1}`; req(`cargas_p_${i}`,`${n}: potencia`,vacio(x.p)); req(`cargas_L_${i}`,`${n}: longitud`,vacio(x.L)); });
  } else {
    req("Lgen","Longitud del alimentador general");
    if(!tipos.length) F.push({id:"add_tipos",l:"Agregue al menos un tipo de departamento"});
    tipos.forEach((t,i)=>{ const n=t.nombre||`Tipo ${i+1}`;
      [["cant","número de unidades"],["area","área de vivienda"],["Ld","longitud del alimentador"],["nAl","salidas de alumbrado"],["nTo","tomacorrientes"],["Lc","longitud de los circuitos"]].forEach(([k,l])=>req(`tipos_${k}_${i}`,`${n}: ${l}`,vacio(t[k]))); });
    if(serv.length) req("Lms","Longitud al tablero de servicios generales");
    serv.forEach((x,i)=>{ const n=x.nombre||`Carga común ${i+1}`; req(`serv_p_${i}`,`${n}: potencia`,vacio(x.p)); req(`serv_L_${i}`,`${n}: longitud`,vacio(x.L)); });
  }
  return F;
}
function update(){
  const F=faltantes();
  if(F.length){ LAST=null; PRINT=null; $("btnXlsx").disabled=true; $("btnPrint").disabled=true;
    document.querySelectorAll(".inv").forEach(e=>e.classList.remove("inv"));
    const c=ctx(); $("projline").innerHTML=`<span>Proyecto: <b>${esc(c.proj.nombre||"—")}</b></span><span>Propietario: <b>${esc(c.proj.prop||"—")}</b></span><span>Ubicación: <b>${esc(c.proj.ubic||"—")}</b></span><span>Proyectista: <b>${esc(c.proj.proy||"—")}</b></span>`;
    $("results").innerHTML=`<section class="card falta-card"><h2><span>Para calcular, complete</span><span class="ref">${F.length} dato${F.length>1?"s":""} pendiente${F.length>1?"s":""}</span></h2><div class="body">
      <p class="hint">Los resultados aparecen automáticamente al completar los datos marcados en ámbar. Haga clic en un dato para ir a él.</p>
      <ul class="faltan">${F.map(x=>`<li><button type="button" class="linkbtn" data-foco="${x.id}">${esc(x.l)}</button></li>`).join("")}</ul>
      <p class="hint">¿Prefiere explorar primero? <button type="button" class="linkbtn" data-ej2="${MODE}">Cargue un proyecto de ejemplo</button>.</p></div></section>`;
    saveDraft(); hdrEstado(); wsRefresh(F); return; }
  $("btnPrint").disabled=false;
  const errs=validar();
  if(MODE==="multi"&&!tipos.some(t=>t.cant>0)){ LAST=null; $("btnXlsx").disabled=true;
    $("results").innerHTML=`<section class="card"><h2>Revise los datos de entrada</h2><div class="body"><ul class="alerts">${errs.map(t=>`<li class="bad"><span>${esc(t)}</span></li>`).join("")}</ul></div></section>`; saveDraft(); return; }
  $("btnXlsx").disabled=false;
  const c=ctx();
  const r=MODE==="uni"?calcUni(c):calcMulti(c); LAST=r;
  $("projline").innerHTML=`<span>Proyecto: <b>${esc(c.proj.nombre||"—")}</b></span><span>Propietario: <b>${esc(c.proj.prop||"—")}</b></span><span>Ubicación: <b>${esc(c.proj.ubic||"—")}</b></span><span>Proyectista: <b>${esc(c.proj.proy||"—")}</b></span>`;
  render(r); saveDraft(); hdrEstado();
  wsRefresh([]);
  if(errs.length) $("results").insertAdjacentHTML("afterbegin",`<section class="card"><h2>Revise los datos de entrada</h2><div class="body"><ul class="alerts">${errs.map(t=>`<li class="bad"><span>${esc(t)}</span></li>`).join("")}</ul></div></section>`);
}

