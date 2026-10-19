/* ================= Navegación y eventos ================= */
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.tab)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.go)));
document.querySelectorAll("[data-calc]").forEach(el=>{ el.addEventListener("input",update); el.addEventListener("change",update); });
let tab0="inicio"; try{ tab0=localStorage.getItem("jmg-electric-tab")||"inicio"; }catch(e){}
ayudas();
if(draft) aplicar(draft); else aplicar(proyectoVacio("uni"));

/* Bienvenida: solo la primera visita */
const WKEY="jmg-electric-bienvenida";
function bienvenida(abrir){ const w=$("welcome"); w.hidden=!abrir; document.body.classList.toggle("wl-open",abrir); if(abrir) w.querySelector(".wl-acts .btn").focus(); else try{ localStorage.setItem(WKEY,"1"); }catch(e){} }
$("welcome").addEventListener("click",e=>{ const b=e.target.closest("[data-wl]"); if(e.target.id==="welcome"||b){ bienvenida(false); if(b&&b.dataset.wl==="ejemplo") cargarEjemplo("uni"); } });
addEventListener("keydown",e=>{ if(e.key==="Escape"&&!$("welcome").hidden) bienvenida(false); });
document.querySelectorAll("[data-welcome]").forEach(b=>b.addEventListener("click",()=>bienvenida(true)));
/* Inicio: la columna derecha acompaña el desplazamiento */
function fijarLado(){ const el=document.querySelector(".home>:nth-child(2)"); if(!el) return; el.style.top=Math.min(12,innerHeight-el.offsetHeight-12)+"px"; }
addEventListener("resize",fijarLado); addEventListener("load",fijarLado);
// La bienvenida se muestra al entrar con una cuenta aprobada (js/acceso.js); el administrador recibe su saludo personal
setTab(["inicio","calculo","proy","herr","normas","guia","novedades","soporte","acerca","ajustes"].includes(tab0)?tab0:"inicio");
