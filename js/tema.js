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

/* Paleta de colores: grafito y oro, petróleo y cobre o índigo eléctrico */
const PALKEY="jmg-electric-paleta", PALNOM={grafito:"Grafito y oro",petroleo:"Petróleo y cobre",indigo:"Índigo eléctrico"};
function aplicarPaleta(p){ if(!PALNOM[p]) p="grafito"; document.documentElement.setAttribute("data-paleta",p);
  document.querySelectorAll(".paleta [data-paleta]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.paleta===p)); }
document.addEventListener("click",e=>{ const b=e.target.closest(".paleta [data-paleta]"); if(!b) return;
  try{ localStorage.setItem(PALKEY,b.dataset.paleta); }catch(_){}
  aplicarPaleta(b.dataset.paleta); if(typeof toast==="function"&&!$("ws").hidden) toast("Paleta: "+PALNOM[b.dataset.paleta]); });
aplicarPaleta(document.documentElement.getAttribute("data-paleta"));

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
