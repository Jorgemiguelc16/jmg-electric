/* ================= Datos editables (listas) ================= */
const DEF={
  cargas:[{nombre:"Ducha eléctrica",tipo:"calentador",fases:1,p:3500,L:12},{nombre:"Electrobomba 1 HP",tipo:"motor",fases:1,p:750,L:18},{nombre:"Horno eléctrico",tipo:"otra",fases:1,p:2000,L:10}],
  tipos:[{nombre:"Tipo A",cant:6,area:85,nAl:12,nTo:14,coc:0,cal:1500,aire:0,otras:0,Ld:25,Lc:15},{nombre:"Tipo B",cant:2,area:120,nAl:16,nTo:20,coc:0,cal:3500,aire:0,otras:2000,Ld:32,Lc:18}],
  serv:[{nombre:"Alumbrado de áreas comunes",tipo:"alum",fases:1,p:800,L:30},{nombre:"Iluminación de emergencia",tipo:"alum",fases:1,p:150,L:30},{nombre:"Electrobomba de agua 2 HP",tipo:"motor",fases:3,p:1492,L:20},{nombre:"Intercomunicador y portero",tipo:"otra",fases:1,p:200,L:10}]};
const cargas=JSON.parse(JSON.stringify(DEF.cargas)), tipos=JSON.parse(JSON.stringify(DEF.tipos)), serv=JSON.parse(JSON.stringify(DEF.serv)), pisos=[];
const FASES=[["1","Monofásica"],["3","Trifásica"]];
// Pisos de la vivienda unifamiliar: el 1er piso usa los datos de Vivienda y Salidas; la lista «pisos» guarda del 2do piso en adelante
const ORD=n=>(["","1er","2do","3er","4to","5to","6to","7mo","8vo","9no","10mo"][n]||n+"°");
const tabPiso=n=>"TD-"+n;
const opcPiso=()=>{ const tg=$("esqPisos").value==="tg";
  return [["0","Tablero general (TG)"],...[1,...pisos.map((_,i)=>i+2)].map(n=>[String(n),`${ORD(n)} piso · ${n===1&&tg?"TG":tabPiso(n)}`])]; };
const LISTS={
  cargas:{arr:cargas,lab:"Carga",f:[{k:"nombre",l:"Descripción",t:"text",full:1},{k:"tipo",l:"Tipo de carga",t:"select",o:Object.entries(TIPOS)},{k:"fases",l:"Fases",t:"select",o:FASES},{k:"p",l:"Potencia (W)",t:"number"},{k:"L",l:"Longitud (m)",t:"number"},
    {k:"piso",l:"Tablero",t:"select",o:opcPiso,full:1,n:1,show:()=>pisos.length>0}],
    nuevo:()=>({nombre:"",tipo:"otra",fases:1,p:null,L:null,piso:0})},
  pisos:{arr:pisos,lab:"Piso",labF:i=>`${ORD(i+2)} piso · tablero ${tabPiso(i+2)}`,f:[{k:"area",l:"Área techada (m²)",t:"number"},{k:"Ld",l:"Long. TG → TD (m)",t:"number"},
    {k:"al_n",l:"Salidas de alumbrado",t:"number"},{k:"al_L",l:"Long. alumbrado (m)",t:"number"},{k:"tg_n",l:"Tomacorrientes",t:"number"},{k:"tg_L",l:"Long. tomacorrientes (m)",t:"number"},
    {k:"tc_n",l:"Tomac. cocina / lavandería",t:"number"},{k:"tc_L",l:"Long. cocina (m)",t:"number"}],
    nuevo:()=>({area:null,Ld:null,al_n:null,al_L:null,tg_n:null,tg_L:null,tc_n:0,tc_L:null}),
    // al quitar un piso, sus cargas especiales pasan al TG y las de pisos superiores bajan un número
    quitar:i=>{ const n=i+2; cargas.forEach(x=>{ if(x.piso===n) x.piso=0; else if(x.piso>n) x.piso--; }); },
    luego:()=>renderList("cargas")},
  tipos:{arr:tipos,lab:"Departamento",f:[{k:"nombre",l:"Denominación",t:"text"},{k:"cant",l:"Nº de dptos. de este tipo",t:"number"},{k:"area",l:"Área de vivienda (m²)",t:"number"},{k:"Ld",l:"Long. alimentador (m)",t:"number"},
    {k:"nAl",l:"Salidas de alumbrado",t:"number"},{k:"nTo",l:"Tomacorrientes",t:"number"},{k:"coc",l:"Cocina eléctrica (W)",t:"number"},{k:"cal",l:"Calentador / ducha (W)",t:"number"},
    {k:"aire",l:"Aire acondicionado (W)",t:"number"},{k:"otras",l:"Otras cargas > 1500 W (W)",t:"number"},{k:"Lc",l:"Long. de circuitos (m)",t:"number"}],
    nuevo:()=>({nombre:"Tipo "+String.fromCharCode(65+tipos.length),cant:null,area:null,nAl:null,nTo:null,coc:0,cal:0,aire:0,otras:0,Ld:null,Lc:null})},
  serv:{arr:serv,lab:"Carga común",f:[{k:"nombre",l:"Descripción",t:"text",full:1},{k:"tipo",l:"Tipo",t:"select",o:Object.entries(TSERV)},{k:"fases",l:"Fases",t:"select",o:FASES},{k:"p",l:"Potencia (W)",t:"number"},{k:"L",l:"Longitud (m)",t:"number"}],
    nuevo:()=>({nombre:"",tipo:"otra",fases:1,p:null,L:null})}};
const HLP={p_nombre:"Aparece en la memoria, el unifilar y el rótulo del plano.",p_prop:"Titular de la vivienda o del edificio.",p_ubic:"Distrito, provincia y región de la obra.",p_proy:"Ingeniero responsable que firma el expediente.",p_cip:"Número de colegiatura del ingeniero; aparece en la firma del expediente, en el Excel y en el rótulo del unifilar.",
  area:"Área techada dedicada a vivienda, al 100 % (Regla 050-110).",sot:"Área de sótano; se computa al 75 %. Deje 0 si no hay.",Lalim:"Recorrido del alimentador desde el medidor hasta el tablero general.",
  al_n:"Cantidad de puntos de luz.",al_p:"Potencia por salida de alumbrado; típico 100 W.",al_L:"Recorrido desde el tablero hasta la salida más alejada.",
  tg_n:"Cantidad de tomacorrientes generales.",tg_p:"Potencia por tomacorriente; típico 180 W.",tg_L:"Recorrido desde el tablero hasta el tomacorriente más alejado.",
  tc_n:"Tomacorrientes de cocina y lavandería; deje vacío si no hay.",tc_p:"Potencia por tomacorriente; típico 180 W.",tc_L:"Recorrido hasta el tomacorriente más alejado de la cocina.",
  Lgen:"Desde el banco de medidores (acometida) hasta el tablero general TG.",Lms:"Desde el tablero general TG hasta el tablero de servicios generales TSG.",
  fp:"Factor de potencia de las cargas; típico 0.9 en viviendas.",maxSal:"Máximo de salidas por circuito; 12 según la Regla 070-3000.",pAl:"Potencia por salida de alumbrado en departamentos (modo multifamiliar).",pTo:"Potencia por tomacorriente en departamentos (modo multifamiliar).",
  reserva:"Espacios libres por tablero para ampliaciones (Regla 050-108, EM.010).",met:"Forma de instalación del conductor (CNE-U, Tablas 3 y 4). B1 = tubo empotrado en ladrillo o concreto (mampostería) o sobre pared; A1 = tubo en pared térmicamente aislante.",aisl:"Temperatura máxima del aislamiento; define la columna de la Tabla 2.",
  temp:"Temperatura ambiente del recorrido; corrige la ampacidad (Tabla 5A).",nag:"Circuitos que comparten la misma tubería; corrige la ampacidad (Tabla 5C).",rhoMode:"Resistividad del cobre usada para la caída de tensión.",
  desig:"Designación comercial que aparece en tablas y en el unifilar (por ejemplo, NH-80).",sminD:"Sección mínima en circuitos derivados, aunque el cálculo permita menos.",sminA:"Sección mínima en alimentadores, aunque el cálculo permita menos.",
  resAl:"Reserva de la corriente de diseño en los alimentadores de vivienda y departamentos. 25 %: reserva para ampliaciones, práctica usual de diseño. 0 %: mínimo de la norma, porque su carga calculada no es continua (Reglas 050-200(3) y 050-202(2)).",idMode:"Un diferencial de 30 mA cada tres circuitos o uno por circuito (Regla 150-400).",iccE:"Corriente de cortocircuito en el punto de entrega; la informa la concesionaria.",dvGen:"Parte del 2.5 % de caída asignada al alimentador general del edificio.",
  rho_s:"Resistividad del suelo medida en campo (método de Wenner).",fr:"Reducción por tratamiento: 1 sin tratamiento; 0.3 a 0.6 con bentonita o gel.",Lv:"Longitud de la varilla de puesta a tierra; mínimo 2 m (Regla 060-702).",dv:"Diámetro de la varilla; mínimo 13 mm en cobre.",
  pDesp:"Porcentaje adicional de conductores y tubos por desperdicio.",bajada:"Metros adicionales por salida para la bajada a la caja.",
  esqPisos:"Dónde se conectan los circuitos del 1er piso: en el mismo tablero general o en un tablero propio TD-1; en ese caso el TG solo alimenta los tableros de piso y las cargas asignadas a él.",Ltd1:"Recorrido del alimentador desde el tablero general TG hasta el tablero del 1er piso."};
const HLPL={cargas:{tipo:"Define el factor de demanda que se aplica a la carga.",p:"Potencia nominal del equipo.",L:"Recorrido desde el tablero hasta el equipo.",fases:"Las trifásicas solo se aplican si el suministro es trifásico."},
  tipos:{cant:"Cuántos departamentos iguales hay de este tipo.",area:"Área techada de un departamento de este tipo.",Ld:"Desde el medidor del departamento hasta su tablero.",nAl:"Puntos de luz de un departamento.",nTo:"Tomacorrientes de un departamento.",coc:"Potencia de la cocina eléctrica; 0 si no hay.",cal:"Terma o ducha eléctrica; 0 si no hay.",aire:"Aire acondicionado; 0 si no hay.",otras:"Otras cargas mayores de 1500 W (horno, secadora…); 0 si no hay.",Lc:"Hasta la salida más alejada del departamento."},
  serv:{tipo:"Motor aplica curva D y conductor al 125 %.",p:"Potencia nominal de la carga común.",L:"Recorrido desde el tablero TSG hasta la carga."},
  pisos:{area:"Área techada de este piso; su máxima demanda se calcula con la Regla 050-200.",Ld:"Desde el tablero general TG hasta el tablero de este piso.",al_n:"Puntos de luz de este piso.",al_L:"Hasta la salida de alumbrado más alejada del piso.",tg_n:"Tomacorrientes generales de este piso.",tg_L:"Hasta el tomacorriente más alejado del piso.",tc_n:"Tomacorrientes de cocina y lavandería del piso; 0 si no hay.",tc_L:"Hasta el tomacorriente de cocina más alejado."}};
const ii=t=>`<span class="ii" tabindex="0" data-tip="${esc(t)}" aria-label="${esc(t)}">i</span>`;
function ayudas(){ Object.entries(HLP).forEach(([id,t])=>{ const el=$(id); if(!el) return; el.title=t; const lb=el.closest("label"); if(lb&&!lb.querySelector(".ii")){ const tn=[...lb.childNodes].find(n=>n.nodeType===3&&n.textContent.trim()); const sp=document.createElement("span"); sp.className="lt"; if(tn){ lb.insertBefore(sp,tn); sp.appendChild(tn); } else lb.insertBefore(sp,el); sp.insertAdjacentHTML("beforeend",ii(t)); } }); }
/* Globo de ayuda flotante (no lo recortan los paneles) */
(function(){ const tip=document.createElement("div"); tip.className="tipbox"; tip.hidden=true; document.body.appendChild(tip);
  const show=e=>{ const t=e.target.closest&&e.target.closest(".ii"); if(!t) return; tip.textContent=t.dataset.tip; tip.hidden=false; const r=t.getBoundingClientRect(), w=tip.offsetWidth, h=tip.offsetHeight;
    let x=Math.min(Math.max(8,r.left+r.width/2-w/2),innerWidth-w-8), y=r.top-h-8; if(y<8) y=r.bottom+8; tip.style.left=x+"px"; tip.style.top=y+"px"; };
  const hide=e=>{ if(e.target.closest&&e.target.closest(".ii")) tip.hidden=true; };
  document.addEventListener("mouseover",show); document.addEventListener("focusin",show); document.addEventListener("mouseout",hide); document.addEventListener("focusout",hide); document.addEventListener("scroll",()=>tip.hidden=true,true); })();
const PHL={cargas:{nombre:"ej. Ducha eléctrica",p:"ej. 3500",L:"ej. 12"},tipos:{cant:"ej. 6",area:"ej. 85",Ld:"ej. 25",nAl:"ej. 12",nTo:"ej. 14",coc:"0 si no hay",cal:"0 si no hay",aire:"0 si no hay",otras:"0 si no hay",Lc:"ej. 15"},serv:{nombre:"ej. Electrobomba de agua",p:"ej. 800",L:"ej. 30"},pisos:{area:"ej. 90",Ld:"ej. 8",al_n:"ej. 10",al_L:"ej. 18",tg_n:"ej. 12",tg_L:"ej. 20",tc_n:"0 si no hay",tc_L:"ej. 12"}};

const $=id=>document.getElementById(id);
const num=id=>parseFloat($(id).value)||0;
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
const fmt=(x,d=2)=>Number.isFinite(x)?x.toLocaleString("es-PE",{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:false}):"—";
const radio=n=>document.querySelector(`input[name="${n}"]:checked`)?.value;

const selNum=f=>f.k==="fases"||f.n;
function readList(name){ const L=LISTS[name]; L.arr.forEach((it,i)=>L.f.forEach(f=>{const el=$(`${name}_${f.k}_${i}`); if(!el)return; it[f.k]=f.t==="number"?(el.value.trim()===""?null:(parseFloat(el.value)||0)):(selNum(f)?+el.value:el.value.replace(/[<>]/g,""));})); }
function renderList(name){
  const L=LISTS[name], box=$("L_"+name); box.innerHTML="";
  L.arr.forEach((it,i)=>{
    const d=document.createElement("div"); d.className="item";
    d.innerHTML=`<div class="item-h"><span>${L.labF?L.labF(i):`${L.lab} ${i+1}`}</span><button type="button" class="link-del" data-i="${i}">Quitar</button></div><div class="item-g">`+
      L.f.filter(f=>!f.show||f.show()).map(f=>{const id=`${name}_${f.k}_${i}`, v=it[f.k];
        const c=f.t==="select"?`<select id="${id}">${(typeof f.o==="function"?f.o():f.o).map(([ov,ol])=>`<option value="${ov}"${String(ov)===String(v)?" selected":""}>${ol}</option>`).join("")}</select>`
          :`<input id="${id}" type="${f.t}"${f.t==="number"?' min="0" step="any"':""} value="${v==null?"":esc(v)}"${PHL[name]?.[f.k]?` placeholder="${PHL[name][f.k]}"`:""}>`;
        return `<label class="${f.full?"full":""}"><span class="lt">${f.l}${HLPL[name]?.[f.k]?ii(HLPL[name][f.k]):""}</span>${c}</label>`;}).join("")+`</div>`;
    box.appendChild(d);
  });
  box.querySelectorAll("input,select").forEach(el=>el.addEventListener("input",()=>{readList(name);update();}));
  box.querySelectorAll(".link-del").forEach(b=>b.addEventListener("click",()=>{readList(name);L.arr.splice(+b.dataset.i,1);if(L.quitar)L.quitar(+b.dataset.i);renderList(name);if(L.luego)L.luego();update();}));
}
Object.keys(LISTS).forEach(n=>$("add_"+n).addEventListener("click",()=>{readList(n);LISTS[n].arr.push(LISTS[n].nuevo());renderList(n);if(LISTS[n].luego)LISTS[n].luego();update();}));
function renderSys(boxId,name,def){
  $(boxId).innerHTML=SYS_OPC.map(([v,t,w,d])=>`<label><input type="radio" name="${name}" value="${v}"${v===def?" checked":""}><span><span class="t">${t}<span class="w">${w}</span></span><span class="d">${d}</span></span></label>`).join("");
}

