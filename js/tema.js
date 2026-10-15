/* ================= Tema de la pantalla: claro o gris (Ajustes) ================= */
const TEMAKEY="jmg-electric-tema";
function aplicarTema(t){ if(t==="oscuro") t="gris"; if(t!=="gris") t="claro";
  const h=document.documentElement; h.setAttribute("data-theme",t==="gris"?"dark":"light"); h.setAttribute("data-tema",t); h.setAttribute("data-paleta","grafito");
  document.querySelectorAll('input[name="tema"]').forEach(r=>{ r.checked=r.value===t; }); }
document.querySelectorAll('input[name="tema"]').forEach(r=>r.addEventListener("change",()=>{ if(!r.checked) return;
  try{ localStorage.setItem(TEMAKEY,r.value); }catch(_){}
  aplicarTema(r.value); if(typeof toast==="function"&&!$("ws").hidden) toast(r.value==="gris"?"Tema gris":"Tema claro"); }));
aplicarTema(document.documentElement.getAttribute("data-tema")||"claro");

/* Cinta de opciones: siempre visible (desde la v2.4 ya no se puede ocultar); se descarta la preferencia antigua */
$("ws").classList.remove("cinta-oculta"); try{ localStorage.removeItem("jmg-electric-cinta"); }catch(_){}

/* Pestaña Ajustes: paneles laterales y versión */
$("ajVer").textContent=VERSION+" Beta";
$("aj_paneles").addEventListener("click",()=>{ Object.values(PANE).forEach(p=>{ p.on=true; p.w=null; }); panes(true); $("aj_paneles").textContent="Paneles restablecidos ✓"; setTimeout(()=>$("aj_paneles").textContent="Restablecer paneles",1800); });
