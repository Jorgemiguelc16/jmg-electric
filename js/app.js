/* ================= JMG - ELECTRIC 2.0 · Aplicación del proyecto ================= */
const NODEFS={proyecto:["fs-proy","fs-tipo"],suministro:{uni:["fs-sum-uni"],multi:["fs-sum-multi"]},vivienda:{uni:["fs-viv","fs-pisos"],multi:["fs-tipos"]},salidas:["fs-sal"],cargas:["fs-cargas"],servicios:["fs-serv"],
  param:["fs-p-car","fs-p-cond","fs-p-prot","fs-p-dv","fs-p-pat","fs-p-met","fs-p-dat"],pat:["fs-p-pat"],metrado:["fs-p-met"]};
const NODETIT={proyecto:"Datos del proyecto",suministro:"Suministro",vivienda:"Vivienda",salidas:"Salidas",cargas:"Cargas especiales",servicios:"Servicios generales",param:"Parámetros de diseño",pat:"Puesta a tierra",metrado:"Metrado"};
let NODE="proyecto", WSF=[], RIB="proyecto";
try{ const x=localStorage.getItem("jmg-electric-node"); if(x) NODE=x; }catch(e){}
const fsDe=n=>{ const v=NODEFS[n]; return Array.isArray(v)?v:v?v[MODE]:null; };
function abrirWS(n){ document.body.classList.add("ws-on"); $("ws").hidden=false; TAB="calculo"; try{ localStorage.setItem("jmg-electric-tab","calculo"); }catch(e){} if(n) selNode(n); else selNode(NODE); }
function cerrarWS(silencioso){ document.body.classList.remove("ws-on"); $("ws").hidden=true; if(!silencioso) setTab("inicio"); }
// compatibilidad con llamadas anteriores
function irSec(sec){ const map={proyecto:"proyecto",suministro:"suministro",vivienda:"vivienda",cargas:MODE==="multi"?"servicios":"salidas",param:"param",resultados:null,exportar:null};
  if(!document.body.classList.contains("ws-on")){ try{ localStorage.setItem("jmg-electric-tab","calculo"); }catch(e){} }
  abrirWS(map[sec]===undefined?null:map[sec]); if(sec==="resultados"||sec==="exportar") verVista(VIEW||"resumen"); }
function selNode(n){
  if(n==="servicios"&&MODE!=="multi") n="cargas"; if((n==="cargas"||n==="salidas")&&MODE==="multi") n="servicios";
  NODE=n; try{ localStorage.setItem("jmg-electric-node",n); }catch(e){}
  const pb=$("propBody"), park=$("park");
  [...pb.querySelectorAll(":scope > fieldset")].forEach(f=>park.appendChild(f)); pb.innerHTML="";
  const fsl=fsDe(n);
  if(fsl){ fsl.forEach(id=>{ const f=$(id); if(f) pb.appendChild(f); }); $("propSub").textContent=n==="vivienda"&&MODE==="multi"?"Departamentos":NODETIT[n]||""; }
  else if(n.startsWith("circ:")) propCircuito(n.slice(5));
  else if(n.startsWith("tab:")) propTablero(n.slice(4));
  if(n==="pat") verVista("resumen"); if(n==="metrado") verVista("metrado");
  pb.scrollTop=0; exTree(); }
function verVista(v){ VIEW=v; try{ localStorage.setItem("jmg-electric-view",v); }catch(e){} if(LAST) update(); }
function focoCampo(id){ const el=$(id); if(!el) return; const f=el.closest("fieldset[id]");
  if(f&&!$("propBody").contains(f)){ const n=Object.keys(NODEFS).find(k=>(fsDe(k)||[]).includes(f.id)); if(n) selNode(n); }
  setTimeout(()=>{ el.scrollIntoView({behavior:"smooth",block:"center"}); el.focus({preventScroll:true}); },60); }
const pendDe=n=>{ const fl=fsDe(n)||[]; return WSF.filter(f=>{ const el=$(f.id); const fs=el&&el.closest("fieldset[id]"); return fs&&fl.includes(fs.id); }).length+(n==="proyecto"&&!$("p_nombre").value.trim()?1:0); };
function exTree(){
  const r=LAST, multi=MODE==="multi", N=[];
  const add=(lv,txt,node,st,extra="")=>N.push(`<button type="button" class="tn ${st||""}${NODE===node?" sel":""}" style="padding-left:${10+lv*16}px" data-node="${node}"><i class="dot"></i><span>${txt}</span>${extra}</button>`);
  const pst=n=>pendDe(n)?"pend":"ok", pc=n=>{ const k=pendDe(n); return k?`<em>${k}</em>`:""; };
  const sk=multi?radio("sistG"):radio("sist"), sis=SIST[sk]?.nom||"";
  add(0,esc($("p_nombre").value.trim()||"Proyecto sin nombre"),"proyecto",pst("proyecto"),pc("proyecto"));
  add(1,`Suministro · ${sis}`,"suministro",pst("suministro"),pc("suministro"));
  if(!multi){ const a=(parseFloat($("area").value)||0)+pisos.reduce((s,p)=>s+(p.area||0),0); add(1,`${usoAct()==="viv"?"Vivienda":"Edificación"}${a>0?` · ${fmt(a,0)} m²`:""}${pisos.length?` · ${pisos.length+1} pisos`:""}`,"vivienda",pst("vivienda"),pc("vivienda"));
    add(1,pisos.length?"Salidas del 1er piso":"Salidas de alumbrado y tomacorrientes","salidas",pst("salidas"),pc("salidas")); add(1,`Cargas especiales · ${cargas.length}`,"cargas",pst("cargas"),pc("cargas")); }
  else { add(1,`Departamentos · ${tipos.reduce((s,t)=>s+(t.cant>0?Math.round(t.cant):0),0)} departamentos`,"vivienda",pst("vivienda"),pc("vivienda"));
    add(1,`Servicios generales · ${serv.length}`,"servicios",pst("servicios"),pc("servicios")); }
  if(r){ r.tabs.forEach(tb=>{ add(1,`Tablero ${tb.tab}`,"tab:"+tb.tab,"tabk");
      r.circ.filter(q=>q.tab===tb.tab).forEach(q=>add(2,`${q.id} &nbsp;${esc(q.desc)}`,"circ:"+q.key,q.ok?"ok":"bad"));
      const pre=tb.tab==="TSG"?"S-":"C-", n0=r.circ.filter(q=>q.tab===tb.tab).length; for(let i=1;i<=r.c.reserva;i++) N.push(`<div class="tn res" style="padding-left:42px"><i class="dot"></i><span>${pre}${n0+i} &nbsp;Reserva</span></div>`); });
    add(1,`Puesta a tierra · ${fmt(r.pat.Rn??r.pat.Rt,1)} Ω`,"pat",r.pat.Rn<=25||r.pat.ok?"ok":"bad"); }
  else N.push(`<div class="tn lock" style="padding-left:26px"><i class="dot"></i><span>Tableros y circuitos · complete los datos</span></div>`);
  add(1,"Parámetros de diseño","param",document.querySelector("#fs-p-car .inv,#fs-p-cond .inv,#fs-p-prot .inv,#fs-p-pat .inv")?"bad":"ok");
  if(r) add(1,"Metrado","metrado","ok");
  $("exTree").innerHTML=N.join(""); $("exCount").textContent=r?`${r.circ.length} circuitos`:`${WSF.length} pendientes`; }
function propTablero(tab){ const r=LAST; if(!r){ return selNode("proyecto"); } const tb=r.tabs.find(t=>t.tab===tab); if(!tb) return selNode("proyecto");
  const f=r.alims[tb.feeder], cs=r.circ.filter(q=>q.tab===tab), row=(k,v)=>`<tr><td>${k}</td><td>${v}</td></tr>`;
  $("propSub").textContent=`Tablero ${tab}`;
  $("propBody").innerHTML=`<div class="pc"><div class="st">Tablero ${tab}</div><p class="pc-d">${esc(tb.desc)}</p><table class="rt">${row("Alimentado por",esc(f.desc))}${row("Potencia",`${fmt(f.P,0)} W`)}${row("Conductor",`${f.s.n}-1×${f.S} mm²`)}${row("Interruptor",`${f.s.tri?3:2}×${f.itm??"—"} A`)}${row("ΔV acumulada",`${fmt(f.dvAc,2)} %`)}${row("Icc en barras",`${fmt(tb.icc,2)} kA`)}${row("Poder de corte",`${tb.pdc} kA`)}${row("Circuitos",`${cs.length} + ${r.c.reserva} reserva`)}${row("Verificación",cs.every(q=>q.ok)&&f.ok?'<span class="okb">CONFORME</span>':'<span class="badb">REVISAR</span>')}</table>
    <button type="button" class="btn sec sm pc-go" data-view="cuadro">Ver cuadro de cargas</button></div>`; }
function propCircuito(key){ const r=LAST; const q=r&&r.circ.find(x=>x.key===key); if(!q) return selNode("proyecto");
  $("propSub").textContent=`${q.id} · ${q.desc}`;
  let ed="";
  const inp=(lbl,attr,val,unit,ph="")=>`<label class="pr"><span>${lbl}</span><span class="in-u"><input type="number" min="0" step="any" ${attr} value="${val??""}" placeholder="${ph}">${unit?`<em>${unit}</em>`:""}</span></label>`;
  if(q.src&&(q.src.t==="cargas"||q.src.t==="serv")){ const L=LISTS[q.src.t], it=L.arr[q.src.i]; if(it){
      const tipos_=q.src.t==="cargas"?TIPOS:TSERV;
      ed=`<label class="pr"><span>Descripción</span><input type="text" data-bl="${q.src.t}|${q.src.i}|nombre" value="${esc(it.nombre)}"></label>
      <label class="pr"><span>Tipo de carga</span><select data-bl="${q.src.t}|${q.src.i}|tipo">${Object.entries(tipos_).map(([k,v])=>`<option value="${k}"${k===it.tipo?" selected":""}>${v}</option>`).join("")}</select></label>
      ${inp("Potencia",`data-bl="${q.src.t}|${q.src.i}|p"`,it.p,"W")}
      <label class="pr"><span>Fases</span><select data-bl="${q.src.t}|${q.src.i}|fases"><option value="1"${it.fases==1?" selected":""}>Monofásica</option><option value="3"${it.fases==3?" selected":""}>Trifásica</option></select></label>
      ${inp("Longitud",`data-bl="${q.src.t}|${q.src.i}|L"`,it.L,"m")}
      ${q.src.t==="cargas"&&pisos.length?`<label class="pr"><span>Tablero</span><select data-bl="cargas|${q.src.i}|piso">${opcPiso().map(([v,l])=>`<option value="${v}"${+v===+it.piso?" selected":""}>${l}</option>`).join("")}</select></label>`:""}`; } }
  else if(q.src&&q.src.t==="piso"){ const n=q.src.i+2, nm={al:"alumbrado",tg:"tomacorrientes",tc:"tomacorrientes de cocina / lavandería"}[q.src.k];
    ed=`<p class="pc-d">Circuito de <b>${nm}</b> del <b>${ORD(n)} piso</b> (tablero ${tabPiso(n)}). Sus salidas y longitudes se editan en Vivienda › Pisos y tableros.</p><button type="button" class="btn sec sm" data-node="vivienda">Editar el ${ORD(n)} piso</button>`; }
  else if(q.src&&q.src.t==="grp"){ const k=q.src.k, nm={al:"Alumbrado",tg:"Tomacorrientes",tc:"Tomacorrientes cocina / lavandería"}[k];
    ed=`<p class="pc-d">Este circuito se arma con las salidas de <b>${nm}</b> (máximo ${ctx().maxSal} por circuito). Al cambiar estos datos se recalculan todos los circuitos del grupo.</p>
      ${inp("Nº de salidas",`data-mirror="${k}_n"`,$(k+"_n").value,"")}${inp("Potencia por salida",`data-mirror="${k}_p"`,$(k+"_p").value,"W")}${inp("Longitud",`data-mirror="${k}_L"`,$(k+"_L").value,"m")}`; }
  else if(q.src&&q.src.t==="tipo"){ const t=tipos[q.src.i]; ed=`<p class="pc-d">Circuito del departamento <b>${esc(t?t.nombre:"")}</b>. Sus datos se editan en el tipo de departamento.</p><button type="button" class="btn sec sm" data-node="vivienda">Editar ${esc(t?t.nombre:"departamento")}</button>`; }
  $("propBody").innerHTML=`<div class="pc"><div class="st">Datos del circuito</div>${ed}</div><div class="pc" id="circRes"></div>`;
  circRes(key); }
function circRes(key){ const box=$("circRes"); if(!box) return; const q=LAST&&LAST.circ.find(x=>x.key===key); if(!q){ box.innerHTML=""; return; }
  const row=(k,v)=>`<tr><td>${k}</td><td>${v}</td></tr>`;
  box.innerHTML=`<div class="st">Resultado del circuito</div><table class="rt">${row("Potencia",`${fmt(q.P,0)} W · ${q.f3?"3φ":"1φ"} ${q.s.V} V`)}${row("Corriente nominal",`${fmt(q.I,2)} A`)}${row("Corriente de diseño",`${fmt(q.Id,2)} A`)}${row("Interruptor",`${q.f3?3:2}×${q.itm??"—"} A · ${q.curva}`)}${row("Conductor",`${q.f3?4:2}-1×${q.S} mm²${LAST.c.desig?" "+esc(LAST.c.desig):""}`)}${row("Iz corregida",`${fmt(q.Izc,1)} A`)}${row("ΔV circuito / total",`${fmt(q.dVp,2)} / ${fmt(q.dVt,2)} %`)}${row("Diferencial",`${q.idName} · ${q.f3?4:2}×${q.idRat} A`)}${row("Tubo",q.tubo.mm?`${q.tubo.mm} mm`:q.tubo.pul)}${row("Verificación",q.ok?'<span class="okb">CONFORME</span>':'<span class="badb">REVISAR</span>')}</table>`; }
$("propBody").addEventListener("input",e=>{ const t=e.target;
  if(t.dataset.bl){ const [nm,i,k]=t.dataset.bl.split("|"), it=LISTS[nm].arr[+i]; if(!it) return; const f=LISTS[nm].f.find(x=>x.k===k);
    it[k]=f&&f.t==="number"?(t.value.trim()===""?null:(parseFloat(t.value)||0)):(k==="fases"||k==="piso"?+t.value:t.value.replace(/[<>]/g,"")); renderList(nm); }
  if(t.dataset.mirror){ $(t.dataset.mirror).value=t.value; } });
$("propBody").addEventListener("change",e=>{ if(e.target.dataset.bl&&e.target.tagName==="SELECT"){ const ev=new Event("input",{bubbles:true}); e.target.dispatchEvent(ev); } });
function toast(t){ const x=$("toast"); x.textContent=t; x.hidden=false; clearTimeout(toast.k); toast.k=setTimeout(()=>x.hidden=true,2200); }
/* Deshacer / rehacer */
const HIST=[], REDO=[]; let histT=null, histBlock=false;
const snap=()=>{ const o=estado(); delete o.savedAt; return JSON.stringify(o); };
function histPush(){ if(histBlock) return; clearTimeout(histT); histT=setTimeout(()=>{ histT=null; const s=snap(); if(HIST[HIST.length-1]!==s){ HIST.push(s); if(HIST.length>60) HIST.shift(); REDO.length=0; } qaHist(); },500); }
function qaHist(){ $("qaUndo").disabled=HIST.length<2; $("qaRedo").disabled=!REDO.length; }
function histGo(dir){ if(histT){ clearTimeout(histT); histT=null; const s=snap(); if(HIST[HIST.length-1]!==s){ HIST.push(s); REDO.length=0; } }
  if(dir<0&&HIST.length<2) return; if(dir>0&&!REDO.length) return;
  if(dir<0) REDO.push(HIST.pop()); else HIST.push(REDO.pop());
  histBlock=true; const n=NODE; aplicar(JSON.parse(HIST[HIST.length-1])); selNode(n); histBlock=false; qaHist(); toast(dir<0?"Cambio deshecho":"Cambio rehecho"); }
addEventListener("keydown",e=>{ if($("ws").hidden||!(e.ctrlKey||e.metaKey)) return; const k=e.key.toLowerCase(); if(k==="z"&&!e.shiftKey){ e.preventDefault(); histGo(-1); } else if(k==="y"||(k==="z"&&e.shiftKey)){ e.preventDefault(); histGo(1); } });
function wsRefresh(F){ WSF=F||[]; histPush();
  const n=$("p_nombre").value.trim(); $("wsName").textContent=n||"Proyecto sin nombre";
  $("wsModo").textContent=$("wsModoTxt").textContent=nomEdif(); $("ws").dataset.mode=MODE;
  const S=$("wsSum"), r=LAST, row=(k,v)=>`<tr><td>${k}</td><td>${v}</td></tr>`;
  if(!r) S.innerHTML=`<div class="st">Datos pendientes</div><div class="sum-bar"><i style="width:${Math.max(6,100-Math.min(100,WSF.length*10))}%"></i></div><ul class="sum-list">${WSF.slice(0,5).map(f=>`<li><button type="button" class="linkbtn" data-foco="${f.id}">${esc(f.l)}</button></li>`).join("")}${WSF.length>5?`<li class="more">y ${WSF.length-5} más…</li>`:""}</ul>`;
  else { const a0=r.alims[0], md=r.mode==="multi"?r.MD:r.md.MD, maxDV=Math.max(...r.alims.map(a=>a.dvAc),...r.circ.map(c=>c.dVt));
    S.innerHTML=`<div class="st">Resumen del proyecto</div><div class="big"><small>Máxima demanda</small><b>${fmt(md/1000,2)} <small>kW</small></b></div><table class="rt">${row("Potencia a contratar",`${fmt(r.contratada,1)} kW`)}${row("Alimentador",`${a0.s.n}-1×${a0.S} mm²`)}${row("Interruptor general",`${a0.s.tri?3:2}×${a0.itm??"—"} A`)}${row("ΔV máxima total",`${fmt(maxDV,2)} %`)}${row("Puesta a tierra",`${fmt(r.pat.Rn??r.pat.Rt,1)} Ω`)}</table>`; }
  const ok=r&&r.alims.every(a=>a.ok)&&r.circ.every(q=>q.ok), hh=new Date().toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"});
  $("wsStatus").innerHTML=`<div>Modo edición</div><div>${AUTO?`<span class="g">●</span> Cálculo automático`:`<span class="w">●</span> Cálculo manual · F9`}</div>`+(r?`<div>MD ${fmt((r.mode==="multi"?r.MD:r.md.MD)/1000,2)} kW</div><div>Alimentador ${r.alims[0].s.n}-1×${r.alims[0].S} mm² · ITM ${r.alims[0].s.tri?3:2}×${r.alims[0].itm} A</div><div>ΔV máx ${fmt(Math.max(...r.alims.map(a=>a.dvAc),...r.circ.map(c=>c.dVt)),2)} %</div><div class="${ok?"g":"b"}">${ok?"CONFORME":"REVISAR"}</div>`:`<div class="w">${WSF.length} dato${WSF.length===1?"":"s"} pendiente${WSF.length===1?"":"s"}</div>`)+`<div class="r">${n&&!/^EJEMPLO\b/.test(n)?`Guardado ${hh}`:/^EJEMPLO\b/.test(n)?"Ejemplo · no se guarda":"Sin nombre · no se guarda"} · ${VERSION}</div>`;
  if(!$("ws").hidden){ exTree(); if(NODE.startsWith("circ:")){ if(r&&r.circ.some(q=>q.key===NODE.slice(5))) circRes(NODE.slice(5)); else selNode(MODE==="multi"?"vivienda":"salidas"); } if(NODE.startsWith("tab:")&&!$("propBody").contains(document.activeElement)) propTablero(NODE.slice(4)); } }
/* Cinta de opciones y acciones */
$("ws").addEventListener("click",e=>{
  const tr=e.target.closest("[data-tab-r]"); if(tr){ RIB=tr.dataset.tabR; document.querySelectorAll(".ap-tabs .tb").forEach(b=>b.classList.toggle("on",b===tr)); document.querySelectorAll(".rib").forEach(x=>x.hidden=x.dataset.rib!==RIB); return; }
  const nd=e.target.closest("[data-node]"); if(nd&&!e.target.closest("[data-act]")){ selNode(nd.dataset.node); if(nd.dataset.fs){ const f=$(nd.dataset.fs); if(f) setTimeout(()=>f.scrollIntoView({behavior:"smooth",block:"start"}),40); } return; }
  const vw=e.target.closest("[data-view]"); if(vw&&!e.target.closest("#results")){ if(!LAST){ toast("Complete los datos para ver los resultados"); return; } verVista(vw.dataset.view); return; }
  const ac=e.target.closest("[data-act]"); if(!ac) return; const a=ac.dataset.act;
  if(a==="nuevo") asistente(true,MODE);
  else if(a==="json") $("btnSave").click();
  else if(a==="guardar"){ saveDraft(); hdrEstado(); toast($("p_nombre").value.trim()?"Proyecto guardado en este navegador":"Asigne un nombre al proyecto para guardarlo"); }
  else if(a==="salir") cerrarWS(false);
  else if(a==="modo"){ selNode("proyecto"); $("btnMode").click(); }
  else if(a==="calc"){ calcularAhora(); toast(LAST?"Cálculo actualizado":"Complete los datos para calcular"); }
  else if(a==="xlsx"){ if(DESACT) calcularAhora(); if(!LAST) return toast("Complete los datos para exportar"); $("btnXlsx").click(); toast("Generando memoria de cálculo…"); }
  else if(a==="print"){ if(DESACT) calcularAhora(); if(!LAST) return toast("Complete los datos para imprimir"); $("btnPrint").click(); }
  else if(a==="undo") histGo(-1); else if(a==="redo") histGo(1);
  else if(a.startsWith("add:")){ const nm=a.slice(4); selNode(nm==="cargas"?"cargas":nm==="serv"?"servicios":"vivienda"); $("add_"+nm).click(); toast("Elemento agregado: complete sus datos"); }
  else if(a.startsWith("web:")){ cerrarWS(true); setTab(a.slice(4)); } });
document.addEventListener("click",e=>{ if(!e.target.closest("[data-dl]")) return; if(DESACT) calcularAhora(); if(e.target.closest("#ws [data-dl]")&&!LAST) toast("Complete los datos para descargar el unifilar"); },true);
$("expMsg").textContent=""; new MutationObserver(()=>{ const t=$("expMsg").textContent; if(t&&!$("ws").hidden) toast(t); }).observe($("expMsg"),{childList:true,characterData:true,subtree:true});

/* Asistente de nuevo proyecto */
function asistente(abrir,m){ const w=$("wizard"); w.hidden=!abrir; document.body.classList.toggle("wl-open",abrir); if(!abrir) return;
  ["wz_nombre","wz_prop","wz_ubic","wz_proy","wz_cip"].forEach(k=>$(k).value=""); $("wzErr").hidden=true; $("wz_nombre").classList.remove("falta");
  const r=document.querySelector(`input[name="wz_mode"][value="${m==="multi"?"multi":"uni"}"]`); if(r) r.checked=true; $("wz_sist").value=m==="multi"?"tri380":"mono220";
  setTimeout(()=>{ if(!$("wizard").contains(document.activeElement)||document.activeElement===document.body) $("wz_nombre").focus(); },50); }
document.querySelectorAll('input[name="wz_mode"]').forEach(r=>r.addEventListener("change",()=>{ $("wz_sist").value=r.value==="multi"?"tri380":"mono220"; }));
$("wizard").addEventListener("click",e=>{ const b=e.target.closest("[data-wz]"); if(e.target.id==="wizard"||(b&&b.dataset.wz==="close")) return asistente(false);
  if(!b||b.dataset.wz!=="ok") return;
  const nom=$("wz_nombre").value.trim(); if(!nom){ $("wzErr").hidden=false; $("wz_nombre").classList.add("falta"); $("wz_nombre").focus(); return; }
  const m=radio("wz_mode")||"uni", o=proyectoVacio(m), sist=$("wz_sist").value;
  o.p_nombre=nom.replace(/[<>]/g,""); o.p_prop=$("wz_prop").value.replace(/[<>]/g,""); o.p_ubic=$("wz_ubic").value.replace(/[<>]/g,""); o.p_proy=$("wz_proy").value.replace(/[<>]/g,""); o.p_cip=$("wz_cip").value.replace(/[<>]/g,"");
  if(m==="multi") o.sistG=sist; else o.sist=sist;
  asistente(false); aplicar(o); VIEW="unifilar"; HIST.length=0; REDO.length=0; abrirWS("vivienda"); calcularAhora(); toast("Proyecto creado: complete los datos marcados en ámbar"); });
$("wizard").addEventListener("keydown",e=>{ if(e.key==="Enter"&&e.target.tagName==="INPUT"){ e.preventDefault(); $("wizard").querySelector('[data-wz="ok"]').click(); } });
addEventListener("keydown",e=>{ if(e.key==="Escape"&&!$("wizard").hidden) asistente(false); });

$("esqPisos").addEventListener("change",()=>renderList("cargas"));
// Al cambiar el uso: 250 VA por tomacorriente en usos comerciales (criterio de diseño) y 180 W en vivienda, salvo que el usuario haya puesto otro valor
$("uso").addEventListener("change",()=>{ const com=usoAct()!=="viv"; ["tg_p","tc_p"].forEach(k=>{ const v=$(k).value; if(com&&v==="180") $(k).value=String(VA_TOMA_COM); else if(!com&&v===String(VA_TOMA_COM)) $(k).value="180"; }); uiUso(); calcularAhora(); });

/* Diálogo de advertencia antes de desactivar una opción */
function confirmar(tit,html,si,fn){ const d=$("cfmDlg"); $("cfmT").textContent=tit; $("cfmTxt").innerHTML=html; $("cfmSi").textContent=si; confirmar.fn=fn;
  d.hidden=false; document.body.classList.add("wl-open"); setTimeout(()=>d.querySelector('.btn.sec').focus(),30); }
function cerrarCfm(ok){ const d=$("cfmDlg"); if(d.hidden) return; d.hidden=true; document.body.classList.remove("wl-open"); const fn=confirmar.fn; confirmar.fn=null; if(fn) fn(ok); }
$("cfmDlg").addEventListener("click",e=>{ if(e.target.id==="cfmDlg") return cerrarCfm(false); const b=e.target.closest("[data-cf]"); if(b) cerrarCfm(b.dataset.cf==="si"); });
addEventListener("keydown",e=>{ if(e.key==="Escape"&&!$("cfmDlg").hidden) cerrarCfm(false); });

/* Opciones de la cinta: cálculo automático y resaltar pendientes */
const OPKEY={auto:"jmg-electric-auto",falta:"jmg-electric-resaltar"};
const opGuardar=(k,v)=>{ try{ localStorage.setItem(OPKEY[k],v?"1":"0"); }catch(e){} };
function setAuto(v){ AUTO=v; $("optAuto").checked=v; opGuardar("auto",v); calcularAhora(); toast(v?"Cálculo automático activado":"Cálculo manual: use Calcular ahora o F9"); }
function setFalta(v){ $("optFalta").checked=v; document.body.classList.toggle("sin-falta",!v); opGuardar("falta",v); }
$("optAuto").addEventListener("click",e=>{ if(e.target.checked) return setAuto(true); e.preventDefault();
  confirmar("¿Desactivar el cálculo automático?",`<p>Mientras esté desactivado, <b>los resultados, el cuadro de cargas, el diagrama unifilar y las verificaciones no se actualizarán</b> al cambiar los datos. Lo que vea en pantalla podría no corresponder a lo ingresado; por ejemplo, un conductor o un interruptor calculado con una longitud anterior.</p><p>Para actualizar use <b>Calcular ahora</b> o la tecla <b>F9</b>. Al exportar la memoria Excel, imprimir el PDF o descargar el unifilar se recalcula automáticamente.</p>`,"Desactivar",ok=>{ if(ok) setAuto(false); }); });
$("optFalta").addEventListener("click",e=>{ if(e.target.checked) return setFalta(true); e.preventDefault();
  confirmar("¿Dejar de resaltar los datos pendientes?",`<p>Los datos obligatorios que faltan <b>ya no se marcarán en ámbar</b> en los formularios, y será más fácil pasar alguno por alto.</p><p>Los resultados seguirán sin calcularse hasta completar todos los datos. La lista de pendientes continuará visible en el panel central, en el explorador y en la barra de estado.</p>`,"Dejar de resaltar",ok=>{ if(ok) setFalta(false); }); });
document.addEventListener("click",e=>{ if(e.target.closest("[data-calcnow]")){ calcularAhora(); toast("Cálculo actualizado"); } });
addEventListener("keydown",e=>{ if(e.key==="F9"&&!$("ws").hidden){ e.preventDefault(); calcularAhora(); toast(LAST?"Cálculo actualizado":"Complete los datos para calcular"); } });
try{ if(localStorage.getItem(OPKEY.auto)==="0"){ AUTO=false; $("optAuto").checked=false; } if(localStorage.getItem(OPKEY.falta)==="0") setFalta(false); }catch(e){}

/* Paneles laterales: cerrar, volver a abrir y cambiar el ancho arrastrando el borde */
const PANE={left:{cls:".ap-left",v:"--wl",key:"jmg-electric-panel-izq",on:true,w:null},right:{cls:".ap-right",v:"--wr",key:"jmg-electric-panel-der",on:true,w:null}};
const apMain=document.querySelector("#ws .ap-main");
function panes(guardar){
  Object.entries(PANE).forEach(([k,p])=>{ document.querySelector("#ws "+p.cls).hidden=!p.on;
    if(!p.on) apMain.style.setProperty(p.v,"0px"); else if(p.w) apMain.style.setProperty(p.v,p.w+"px"); else apMain.style.removeProperty(p.v);
    document.querySelectorAll(`.pane-tg[data-pane="${k}"]`).forEach(b=>b.setAttribute("aria-pressed",p.on));
    if(guardar) try{ localStorage.setItem(p.key,JSON.stringify({on:p.on,w:p.w})); }catch(e){} }); }
try{ Object.values(PANE).forEach(p=>{ const o=JSON.parse(localStorage.getItem(p.key)||"null"); if(o){ p.on=o.on!==false; p.w=+o.w>0?+o.w:null; } }); }catch(e){}
panes(false);
document.addEventListener("click",e=>{ const b=e.target.closest(".pane-tg,.ph-x"); if(!b) return; const p=PANE[b.dataset.pane];
  p.on=b.classList.contains("ph-x")?false:!p.on; panes(true); toast(p.on?"Panel visible":"Panel oculto: vuelva a abrirlo con los botones de la barra superior"); });
document.querySelectorAll("#ws .sp").forEach(sp=>{ const k=sp.dataset.sp, p=PANE[k];
  sp.addEventListener("pointerdown",e=>{ e.preventDefault(); try{ sp.setPointerCapture(e.pointerId); }catch(_){} sp.classList.add("drag"); document.body.classList.add("arrastrando");
    const mv=ev=>{ const r=apMain.getBoundingClientRect(), otro=PANE[k==="left"?"right":"left"], wo=otro.on?document.querySelector("#ws "+otro.cls).offsetWidth:0;
      const w=k==="left"?ev.clientX-r.left:r.right-ev.clientX; p.w=Math.round(Math.max(170,Math.min(640,r.width-wo-360,w))); panes(false); };
    const up=()=>{ sp.classList.remove("drag"); document.body.classList.remove("arrastrando"); removeEventListener("pointermove",mv); removeEventListener("pointerup",up); removeEventListener("pointercancel",up); panes(true); };
    addEventListener("pointermove",mv); addEventListener("pointerup",up); addEventListener("pointercancel",up); });
  sp.addEventListener("dblclick",()=>{ p.w=null; panes(true); toast("Ancho restablecido"); }); });
