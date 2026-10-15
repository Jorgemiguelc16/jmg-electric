function refreshLast(){
  const o=loadDraft(), box=$("lastBox"); if(!box) return;
  if(!o||!o.p_nombre){ box.hidden=true; return; }
  box.hidden=false;
  const f=o.savedAt?new Date(o.savedAt).toLocaleDateString("es-PE",{day:"2-digit",month:"short",year:"numeric"}):"";
  $("lastTxt").textContent=`${o.p_nombre} · ${o.MODE==="multi"?"Multifamiliar":"Unifamiliar"}${f?" · "+f:""}`;
}
$("btnSave").addEventListener("click",async()=>{
  const nm=($("p_nombre").value||"proyecto").replace(/[^\wáéíóúñÁÉÍÓÚÑ .-]/g,"").trim().slice(0,60)||"proyecto";
  const nombre=`JMG-ELECTRIC - ${nm}.json`, blob=new Blob([JSON.stringify(estado(),null,1)],{type:"application/json"});
  try{ if(downloads) await downloads.save({filename:nombre,data:blob}); else descargarLocal(blob,nombre); msg.textContent="Proyecto guardado."; }
  catch(e){ msg.textContent=e&&e.code==="declined"?"Guardado cancelado.":"No se pudo guardar el proyecto."; }
});
document.querySelectorAll("[data-open]").forEach(b=>b.addEventListener("click",()=>{ $("fileOpen").value=""; $("fileOpen").click(); }));
$("fileOpen").addEventListener("change",()=>{
  const f=$("fileOpen").files[0]; if(!f) return;
  const rd=new FileReader();
  rd.onload=()=>{ let o=null; try{ o=JSON.parse(rd.result); }catch(e){}
    if(!o||o.app!=="JMG-ELECTRIC"){ $("openMsg").textContent="El archivo no es un proyecto de JMG - ELECTRIC."; setTab("inicio"); return; }
    aplicar(o); $("openMsg").textContent=""; msg.textContent=`Proyecto «${o.p_nombre||"sin nombre"}» abierto.`; setTab("calculo"); };
  rd.readAsText(f);
});
document.querySelectorAll("[data-new]").forEach(b=>b.addEventListener("click",()=>asistente(true,b.dataset.new)));
document.querySelectorAll("[data-start]").forEach(b=>b.addEventListener("click",()=>{ const d=loadDraft(); if(d&&d.p_nombre&&!/^EJEMPLO\b/.test(d.p_nombre)) setTab("calculo"); else asistente(true,"uni"); }));
document.querySelectorAll("[data-ej]").forEach(b=>b.addEventListener("click",()=>cargarEjemplo(b.dataset.ej)));
$("ver").textContent=VERSION; $("verBadge").textContent=" · "+VERSION+" Beta"; if($("wsVer")) $("wsVer").textContent=VERSION+" Beta";

const draft=loadDraft();
if(draft&&draft.p_nombre==="Vivienda unifamiliar — Urb. Los Álamos"){ draft.p_nombre=""; if(draft.p_prop==="—") draft.p_prop=""; if(draft.p_ubic==="Arequipa, Perú") draft.p_ubic=""; }
renderSys("sys_uni","sist","mono220"); renderSys("sys_multi","sistG","tri380");
Object.keys(LISTS).forEach(renderList);

function resetUI(confirmar){
  const box=$("resetBox");
  if(!confirmar){ box.innerHTML=`<button type="button" class="btn sec" id="rsAsk">Restablecer valores iniciales</button>`; $("rsAsk").addEventListener("click",()=>resetUI(true)); return; }
  box.innerHTML=`<span>Se borrarán los datos ingresados.</span><button type="button" class="btn" id="rsYes">Restablecer</button><button type="button" class="btn sec" id="rsNo">Cancelar</button>`;
  $("rsYes").addEventListener("click",()=>{ try{ localStorage.removeItem(SKEY); localStorage.removeItem("jmg-electric-tab"); }catch(e){} location.reload(); });
  $("rsNo").addEventListener("click",()=>resetUI(false));
}
resetUI(false);

