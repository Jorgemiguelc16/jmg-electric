/* ================= Tema de la pantalla: claro o gris (Ajustes) ================= */
const TEMAKEY="jmg-electric-tema";
function aplicarTema(t){ if(t==="oscuro") t="gris"; if(t!=="gris") t="claro";
  const h=document.documentElement; h.setAttribute("data-theme",t==="gris"?"dark":"light"); h.setAttribute("data-tema",t); h.setAttribute("data-paleta","grafito");
  document.querySelectorAll('input[name="tema"]').forEach(r=>{ r.checked=r.value===t; }); }
document.querySelectorAll('input[name="tema"]').forEach(r=>r.addEventListener("change",()=>{ if(!r.checked) return;
  try{ localStorage.setItem(TEMAKEY,r.value); }catch(_){}
  aplicarTema(r.value); if(typeof toast==="function"&&!$("ws").hidden) toast(r.value==="gris"?"Tema gris":"Tema claro"); }));
aplicarTema(document.documentElement.getAttribute("data-tema")||"claro");

/* Cinta de opciones: ocultar o mostrar (también con Ctrl+F1; al elegir una pestaña se vuelve a mostrar) */
const CINTAKEY="jmg-electric-cinta";
function cinta(visible,guardar=true){ const ws=$("ws"), b=$("cintaTg"); ws.classList.toggle("cinta-oculta",!visible);
  b.setAttribute("aria-expanded",visible); b.title=visible?"Ocultar la cinta de opciones (Ctrl+F1)":"Mostrar la cinta de opciones (Ctrl+F1)"; b.querySelector("span").textContent=visible?"Ocultar cinta":"Mostrar cinta";
  if(guardar) try{ localStorage.setItem(CINTAKEY,visible?"1":"0"); }catch(_){} }
$("cintaTg").addEventListener("click",()=>cinta($("ws").classList.contains("cinta-oculta")));
document.querySelectorAll("#ws .ap-tabs .tb").forEach(t=>{
  t.addEventListener("click",()=>{ if($("ws").classList.contains("cinta-oculta")) cinta(true); }); });
addEventListener("keydown",e=>{ if(e.ctrlKey&&e.key==="F1"&&!$("ws").hidden){ e.preventDefault(); cinta($("ws").classList.contains("cinta-oculta")); } });
try{ if(localStorage.getItem(CINTAKEY)==="0") cinta(false,false); }catch(_){}
