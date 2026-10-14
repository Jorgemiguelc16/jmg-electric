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
  S.demanda=()=>cardDemanda(r);
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
  if(t==="calculo"){ abrirWS(null); try{ localStorage.setItem("jmg-electric-tab","calculo"); }catch(e){} return; }
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
// Cuadro «Comenzar» de la cabecera: muestra el acceso al proyecto guardado, si existe
function hdrEstado(){
  const n=$("p_nombre").value.trim(), b=$("hdrCont"); if(!b) return;
  b.hidden=!(n&&!/^EJEMPLO\b/.test(n)); b.querySelector("b").textContent=n; b.title=n?`Abrir «${n}» en el espacio de trabajo`:"";
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
    if(pisos.length&&$("esqPisos").value==="td") chk("Ltd1",v("Ltd1")>0,"Ingrese la longitud del alimentador al tablero del 1er piso.");
    pisos.forEach((p,i)=>{ const n=`${ORD(i+2)} piso`; chk(`pisos_area_${i}`,p.area>0,`${n}: ingrese el área techada.`); chk(`pisos_Ld_${i}`,p.Ld>0,`${n}: ingrese la longitud del alimentador.`);
      [["al","alumbrado"],["tg","tomacorrientes"],["tc","tomacorrientes de cocina"]].forEach(([k,t])=>{ chk(`pisos_${k}_n_${i}`,!(p[k+"_n"]<0),`${n}: la cantidad de salidas de ${t} no puede ser negativa.`); if(p[k+"_n"]>0) chk(`pisos_${k}_L_${i}`,p[k+"_L"]>0,`${n}: ingrese la longitud de los circuitos de ${t}.`); }); });
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
    if(pisos.length&&$("esqPisos").value==="td") req("Ltd1","Longitud del alimentador al tablero del 1er piso");
    pisos.forEach((p,i)=>{ const n=`${ORD(i+2)} piso`;
      [["area","área techada"],["Ld","longitud del alimentador"],["al_n","salidas de alumbrado"],["al_L","longitud de alumbrado"],["tg_n","tomacorrientes"],["tg_L","longitud de tomacorrientes"]].forEach(([k,l])=>req(`pisos_${k}_${i}`,`${n}: ${l}`,vacio(p[k])));
      if(p.tc_n>0) req(`pisos_tc_L_${i}`,`${n}: longitud de cocina`,vacio(p.tc_L)); });
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
// Textos de Vivienda y Salidas según la vivienda tenga uno o varios pisos
function uiPisos(){
  const varios=pisos.length>0, td=$("esqPisos").value==="td", lt=id=>{ const s=$(id).closest("label").querySelector(".lt"); return s&&s.firstChild&&s.firstChild.nodeType===3?s.firstChild:null; };
  const ta=lt("area"); if(ta) ta.nodeValue=varios?"Área techada del 1er piso (m²)":"Área techada (m²)";
  $("fs-sal").querySelector("legend").textContent=varios?"Salidas · 1er piso":"Salidas"; $("salPisos").hidden=varios;
  document.querySelector("#fs-pisos .pisos-esq").hidden=!varios; $("lblLtd1").hidden=!(varios&&td);
  $("pisosHint").textContent=varios?`Vivienda de ${pisos.length+1} pisos: el alimentador general se calcula con el área total; cada tablero de piso, con la Regla 050-200 aplicada al área de su piso.`
    :"Vivienda de un piso: todos los circuitos salen del tablero general TG. Agregue los pisos superiores para que cada uno tenga su tablero de distribución.";
}
// Cálculo automático (AUTO) o manual: en manual los cambios se guardan, pero se recalcula solo con calcularAhora()
let AUTO=true, FORZAR=false, DESACT=false;
function calcularAhora(){ const f0=FORZAR; FORZAR=true; try{ update(); } finally{ FORZAR=f0; } }
function marcarDesact(){
  if(!$("desactBox")) $("results").insertAdjacentHTML("afterbegin",`<div class="desact" id="desactBox"><span><b>Cálculo automático desactivado.</b> Los resultados no reflejan los últimos cambios en los datos.</span><button type="button" class="btn sm" data-calcnow>Calcular ahora (F9)</button></div>`);
  const st=$("wsStatus").children[1]; if(st) st.innerHTML=`<span class="w">●</span> Resultados desactualizados · F9`;
}
function update(){
  if(!AUTO&&!FORZAR){ DESACT=true; saveDraft(); hdrEstado(); histPush(); marcarDesact(); return; }
  DESACT=false;
  uiPisos();
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

