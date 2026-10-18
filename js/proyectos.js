/* ================= Proyectos y borrador local ================= */
const KEYS=["p_nombre","p_prop","p_ubic","p_proy","p_cip","uso","aE","fp","maxSal","pAl","pTo","reserva","resAl","met","aisl","temp","nag","sminD","sminA","rhoMode","desig","idMode","iccE","dvGen","pDesp","bajada","area","sot","aLib","wLib","Lalim","al_n","al_p","al_L","tg_n","tg_p","tg_L","tc_n","tc_p","tc_L","Lgen","Lms","rho_s","fr","Lv","dv","esqPisos","Ltd1"];
const SKEY="jmg-electric-v1", DEFV={}; KEYS.forEach(k=>DEFV[k]=$(k).value);
["area","Lalim","al_n","al_p","al_L","tg_n","tg_p","tg_L","tc_n","tc_p","tc_L","Lgen","Lms"].forEach(k=>{ if($(k)&&!$(k).placeholder) $(k).placeholder="ej. "+DEFV[k]; });
if($("sot")) $("sot").placeholder="0 si no hay";
[["p_nombre","Nombre del proyecto"]].forEach(([k,t])=>{ if($(k)&&!$(k).placeholder) $(k).placeholder=t; });
const clon=o=>JSON.parse(JSON.stringify(o));
const LKEY="jmg-electric-proyectos";
const nuevoId=()=>"p"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function libLoad(){ try{ const o=JSON.parse(localStorage.getItem(LKEY)||"{}"); return o&&typeof o==="object"&&!Array.isArray(o)?o:{}; }catch(e){ return {}; } }
function libSave(L){ try{ localStorage.setItem(LKEY,JSON.stringify(L)); return true; }catch(e){ return false; } }
function estado(){ const o={app:"JMG-ELECTRIC",version:VERSION,id:PID,savedAt:new Date().toISOString(),MODE,cargas,tipos,serv,pisos,lums,lumsT,toms,tomsT,FIX,ACEP,res:RESUMEN,sist:radio("sist"),sistG:radio("sistG")}; KEYS.forEach(k=>o[k]=$(k).value); return o; }
const esEjemplo=()=>/^EJEMPLO\b/.test($("p_nombre").value.trim());
function saveDraft(){
  if(esEjemplo()){ PID=null; try{ localStorage.setItem(SKEY,JSON.stringify(estado())); }catch(e){} return; }
  if($("p_nombre").value.trim()&&!PID) PID=nuevoId();
  const o=estado();
  try{ localStorage.setItem(SKEY,JSON.stringify(o)); }catch(e){}
  if(PID&&o.p_nombre.trim()){ const L=libLoad(); L[PID]=o; libSave(L); }
}
function loadDraft(){ let o=null; try{ o=JSON.parse(localStorage.getItem(SKEY)||"null"); }catch(e){} return o&&typeof o==="object"?o:null; }
function limpiarLista(a,plantilla,nums=[]){ return Array.isArray(a)?a.filter(x=>x&&typeof x==="object").map(x=>{ const y={...plantilla};
  Object.keys(plantilla).forEach(k=>{ if(x[k]==null||x[k]===""){ if(nums.includes(k)) y[k]=null; return; } y[k]=(nums.includes(k)||typeof plantilla[k]==="number")?(parseFloat(x[k])||0):String(x[k]).replace(/[<>]/g,"").slice(0,120); }); return y; }):null; }
function aplicar(o){
  PID=typeof o.id==="string"&&/^[\w-]{1,40}$/.test(o.id)?o.id:null;
  KEYS.forEach(k=>{ if(o[k]!=null&&$(k)) $(k).value=String(o[k]).replace(/[<>]/g,""); else if(k==="esqPisos"||k==="Ltd1"||k==="p_cip"||k==="resAl"||k==="uso"||k==="aE") $(k).value=DEFV[k]; });
  [["cargas",cargas],["tipos",tipos],["serv",serv],["pisos",pisos],["lums",lums],["lumsT",lumsT],["toms",toms],["tomsT",tomsT]].forEach(([k,a])=>{ const L=limpiarLista(o[k],LISTS[k].nuevo(),LISTS[k].f.filter(f=>f.t==="number"||f.k==="fases").map(f=>f.k).filter(x=>x!=="fases"))||(["pisos","lums","lumsT","toms","tomsT"].includes(k)?[]:null); if(L){ a.length=0; a.push(...L); } });
  const fx=o.FIX&&typeof o.FIX==="object"?o.FIX:{}, ok=v=>v&&typeof v==="object"?Object.fromEntries(Object.entries(v).filter(([,x])=>typeof x==="string")):{};
  FIX={uni:ok(fx.uni),multi:ok(fx.multi)};
  const ac=o.ACEP&&typeof o.ACEP==="object"?o.ACEP:{}; ACEP={uni:ok(ac.uni),multi:ok(ac.multi)};
  const sv=v=>["mono220","tri220","tri380"].includes(v)?v:null;
  renderSys("sys_uni","sist",sv(o.sist)||"mono220"); renderSys("sys_multi","sistG",sv(o.sistG)||"tri380");
  Object.keys(LISTS).forEach(renderList);
  const f0=FORZAR; FORZAR=true; try{ setMode(o.MODE==="multi"?"multi":"uni"); } finally{ FORZAR=f0; }
}
const PKEYS=["p_nombre","p_prop","p_ubic","p_proy","p_cip","area","sot","aLib","Lalim","Ltd1","al_n","al_p","al_L","tg_n","tg_p","tg_L","tc_n","tc_p","tc_L","Lgen","Lms"];
function proyectoVacio(m){ const o={id:null,...DEFV,MODE:m,cargas:[],tipos:[LISTS.tipos.nuevo()],serv:[],pisos:[],lums:[],lumsT:[],toms:[],tomsT:[],FIX:null,sist:"mono220",sistG:"tri380"}; PKEYS.forEach(k=>o[k]=""); ["al_p","tg_p","tc_p"].forEach(k=>o[k]=DEFV[k]); o.tipos[0].nombre="Tipo A"; return o; }
function nuevoProyecto(m){
  aplicar(proyectoVacio(m));
  irSec("proyecto"); try{ $("p_nombre").focus(); }catch(e){}
}
// Ejemplo de oficina (Tabla 14): 250 m², trifásico, tomacorrientes de 250 VA, aire acondicionado y equipos de cómputo
const EJ_OFICINA={uso:"oficina",sist:"tri380",area:"250",sot:"0",Lalim:"20",al_n:"32",al_p:"100",al_L:"28",tg_n:"30",tg_p:String(VA_TOMA_COM),tg_L:"30",tc_n:"0",tc_p:String(VA_TOMA_COM),tc_L:"12",
  cargas:[{nombre:"Aire acondicionado sala de reuniones",tipo:"aire",fases:3,p:3500,L:18,piso:0},{nombre:"Aire acondicionado oficinas",tipo:"aire",fases:3,p:5000,L:24,piso:0},
    {nombre:"Rack de servidores y red",tipo:"otra",fases:1,p:1500,L:15,piso:0},{nombre:"Fotocopiadora",tipo:"otra",fases:1,p:1800,L:20,piso:0}]};
function cargarEjemplo(m){
  const com=m==="com", md=com?"uni":m;
  aplicar({id:null,...DEFV,MODE:md,cargas:clon(DEF.cargas),tipos:clon(DEF.tipos),serv:clon(DEF.serv),pisos:[],lums:[],lumsT:[],toms:[],tomsT:[],FIX:null,sist:"mono220",sistG:"tri380",...(com?clon(EJ_OFICINA):{})}); setTab("calculo");
  const v={p_nombre:com?"EJEMPLO · Oficinas de 250 m²":m==="multi"?"EJEMPLO · Edificio multifamiliar de 8 departamentos":"EJEMPLO · Vivienda unifamiliar",p_prop:"Propietario de ejemplo",p_ubic:"Arequipa, Perú",p_proy:"Ing. responsable"};
  Object.entries(v).forEach(([k,x])=>$(k).value=x); VIEW="unifilar"; calcularAhora(); irSec("resultados");
}
let DELQ=null;
function renderProy(){
  const L=libLoad(), arr=Object.values(L).filter(o=>o&&o.id).sort((a,b)=>String(b.savedAt).localeCompare(String(a.savedAt)));
  const f=d=>{ const x=new Date(d); return isNaN(x)?"—":x.toLocaleDateString("es-PE",{day:"2-digit",month:"short",year:"numeric"})+" · "+x.toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"}); };
  if(!arr.length){ $("projList").innerHTML=`<div class="body"><p class="hint" style="font-size:13px">Aún no hay proyectos guardados. Cree uno nuevo o escriba un nombre en «Datos del proyecto»: se guardará automáticamente.</p></div>`; return; }
  $("projList").innerHTML=`<table><thead><tr><th class="t">Proyecto</th><th class="t">Tipo</th><th class="t">Proyectista</th><th class="t">Modificado</th><th class="t">Acciones</th></tr></thead><tbody>${arr.map(o=>`<tr${o.id===PID?' class="fix"':""}>
    <td class="t" style="white-space:normal"><strong>${esc(o.p_nombre)}</strong>${o.id===PID?' <span class="pill ok">En edición</span>':""}<br><span class="hint">${esc(o.p_ubic||"")}</span></td>
    <td class="t">${o.MODE==="multi"?"Multifamiliar":USOS[o.uso]?esc(USOS[o.uso].n):"Unifamiliar"}</td><td class="t">${esc(o.p_proy||"—")}</td><td class="t">${f(o.savedAt)}</td>
    <td class="t"><div class="acts-row">${DELQ===o.id?`<span class="hint">¿Eliminar?</span><button type="button" class="btn sm" data-pa="del-ok" data-id="${o.id}">Sí, eliminar</button><button type="button" class="btn sec sm" data-pa="del-no">Cancelar</button>`
      :`<button type="button" class="btn sm" data-pa="open" data-id="${o.id}">Abrir</button><button type="button" class="btn sec sm" data-pa="dup" data-id="${o.id}">Duplicar</button><button type="button" class="btn sec sm" data-pa="exp" data-id="${o.id}">Exportar</button><button type="button" class="btn sec sm" data-pa="del" data-id="${o.id}">Eliminar</button>`}</div></td></tr>`).join("")}</tbody></table>`;
}
$("projList").addEventListener("click",async e=>{
  const b=e.target.closest("[data-pa]"); if(!b) return;
  const L=libLoad(), o=L[b.dataset.id], a=b.dataset.pa;
  if(a==="open"&&o){ aplicar(o); setTab("calculo"); msg.textContent=`Proyecto «${o.p_nombre}» abierto.`; return; }
  if(a==="dup"&&o){ const id=nuevoId(); L[id]={...JSON.parse(JSON.stringify(o)),id,p_nombre:`${o.p_nombre} (copia)`,savedAt:new Date().toISOString()}; libSave(L); }
  if(a==="exp"&&o){ const nm=o.p_nombre.replace(/[^\wáéíóúñÁÉÍÓÚÑ .-]/g,"").trim().slice(0,60)||"proyecto", blob=new Blob([JSON.stringify(o,null,1)],{type:"application/json"});
    try{ if(downloads) await downloads.save({filename:`JMG-ELECTRIC - ${nm}.json`,data:blob}); else descargarLocal(blob,`JMG-ELECTRIC - ${nm}.json`); }catch(err){} }
  if(a==="del") DELQ=b.dataset.id;
  if(a==="del-no") DELQ=null;
  if(a==="del-ok"){ delete L[b.dataset.id]; libSave(L); if(b.dataset.id===PID) PID=null; DELQ=null; }
  renderProy();
});

