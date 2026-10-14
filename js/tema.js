/* ================= Tema de la pantalla: claro, oscuro o automático ================= */
const TEMAKEY="jmg-electric-tema", mqOscuro=window.matchMedia?matchMedia("(prefers-color-scheme: dark)"):null;
function aplicarTema(t){
  const html=document.documentElement, oscuro=t==="oscuro"||(t==="auto"&&!!mqOscuro&&mqOscuro.matches);
  html.setAttribute("data-theme",oscuro?"dark":"light"); html.setAttribute("data-tema",t);
  document.querySelectorAll(".tema [data-tema]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.tema===t));
}
document.addEventListener("click",e=>{ const b=e.target.closest(".tema [data-tema]"); if(!b) return;
  try{ localStorage.setItem(TEMAKEY,b.dataset.tema); }catch(_){}
  aplicarTema(b.dataset.tema);
  if(typeof toast==="function"&&!$("ws").hidden) toast({claro:"Tema claro",oscuro:"Tema oscuro",auto:"Tema automático: igual que el sistema"}[b.dataset.tema]); });
if(mqOscuro) mqOscuro.addEventListener("change",()=>{ if(document.documentElement.getAttribute("data-tema")==="auto") aplicarTema("auto"); });
aplicarTema(document.documentElement.getAttribute("data-tema")||"claro");
