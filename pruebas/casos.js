/* ================= Casos de prueba del motor de cálculo =================
   Cada caso es un proyecto completo (mismo formato que un archivo guardado).
   Todos los datos van escritos aquí, para que un cambio en los valores por defecto
   de la pantalla no altere los casos. C1 a C8 son los casos del manual v2.1. */
const BASE={
  p_nombre:"EJEMPLO · prueba",p_prop:"Propietario de ejemplo",p_ubic:"Arequipa, Perú",p_proy:"Ing. responsable",p_cip:"",
  fp:"0.9",maxSal:"12",pAl:"100",pTo:"180",reserva:"2",met:"A1",aisl:"pvc",temp:"30",nag:"1",sminD:"2.5",sminA:"4",rhoMode:"op",desig:"NH-80",
  idMode:"grupo",iccE:"10",dvGen:"1.5",pDesp:"5",bajada:"1",area:"120",sot:"0",Lalim:"15",al_n:"18",al_p:"100",al_L:"20",tg_n:"22",tg_p:"180",tg_L:"22",
  tc_n:"6",tc_p:"180",tc_L:"12",Lgen:"10",Lms:"15",rho_s:"100",fr:"0.5",Lv:"2.4",dv:"0.0159",esqPisos:"tg",Ltd1:"",
  sist:"mono220",sistG:"tri380",FIX:null,pisos:[],
  cargas:[{nombre:"Ducha eléctrica",tipo:"calentador",fases:1,p:3500,L:12,piso:0},{nombre:"Electrobomba 1 HP",tipo:"motor",fases:1,p:750,L:18,piso:0},{nombre:"Horno eléctrico",tipo:"otra",fases:1,p:2000,L:10,piso:0}],
  tipos:[{nombre:"Tipo A",cant:6,area:85,nAl:12,nTo:14,coc:0,cal:1500,aire:0,otras:0,Ld:25,Lc:15},{nombre:"Tipo B",cant:2,area:120,nAl:16,nTo:20,coc:0,cal:3500,aire:0,otras:2000,Ld:32,Lc:18}],
  serv:[{nombre:"Alumbrado de áreas comunes",tipo:"alum",fases:1,p:800,L:30},{nombre:"Iluminación de emergencia",tipo:"alum",fases:1,p:150,L:30},{nombre:"Electrobomba de agua 2 HP",tipo:"motor",fases:3,p:1492,L:20},{nombre:"Intercomunicador y portero",tipo:"otra",fases:1,p:200,L:10}]};

// Proyecto = BASE + cambios. Las listas (cargas, pisos…) se reemplazan completas.
const caso=(MODE,cambios={})=>({...JSON.parse(JSON.stringify(BASE)),MODE,...JSON.parse(JSON.stringify(cambios))});
const conCargas=(...extra)=>[...BASE.cargas,...extra];
const PISOS3=[{area:85,Ld:9,al_n:10,al_L:16,tg_n:14,tg_L:18,tc_n:0,tc_L:null},{area:60,Ld:12,al_n:6,al_L:14,tg_n:8,tg_L:15,tc_n:2,tc_L:10}];

const CASOS_PRUEBA=[
  // ---- Casos del manual v2.1 (sección de casos de verificación) ----
  {id:"C1",tit:"Vivienda unifamiliar · monofásico 220 V (ejemplo de la app)",p:caso("uni")},
  {id:"C2",tit:"Vivienda unifamiliar · trifásico 380/220 V",p:caso("uni",{sist:"tri380"})},
  {id:"C3",tit:"Vivienda grande con sótano · trifásico 380/220 V",p:caso("uni",{sist:"tri380",area:"250",sot:"40",Lalim:"35",al_n:"30",tg_n:"40",tc_n:"10",
    cargas:conCargas({nombre:"Cocina",tipo:"cocina",fases:3,p:8000,L:15,piso:0},{nombre:"Aire",tipo:"aire",fases:1,p:3000,L:20,piso:0})})},
  {id:"C4",tit:"Vivienda con cocina de 13 kW · trifásico 220 V",p:caso("uni",{sist:"tri220",cargas:conCargas({nombre:"Cocina",tipo:"cocina",fases:1,p:13000,L:10,piso:0})})},
  {id:"C5",tit:"Vivienda de 3 pisos · circuitos del 1er piso en el TG",p:caso("uni",{sist:"tri380",area:"90",Ltd1:"6",esqPisos:"tg",pisos:PISOS3,
    cargas:[{...BASE.cargas[0],piso:2},BASE.cargas[1],BASE.cargas[2]]})},
  {id:"C6",tit:"Vivienda de 3 pisos · tablero propio TD-1",p:caso("uni",{sist:"tri380",area:"90",Ltd1:"6",esqPisos:"td",pisos:PISOS3,
    cargas:[{...BASE.cargas[0],piso:2},BASE.cargas[1],{...BASE.cargas[2],piso:1}]})},
  {id:"C7",tit:"Edificio multifamiliar de 8 departamentos · 380/220 V (ejemplo de la app)",p:caso("multi")},
  {id:"C8",tit:"Edificio multifamiliar · trifásico 220 V",p:caso("multi",{sistG:"tri220"})},
  // ---- Casos adicionales para recorrer otras ramas del cálculo ----
  {id:"P1",tit:"XLPE, método C, 40 °C y 3 circuitos agrupados",p:caso("uni",{aisl:"xl",met:"C",temp:"40",nag:"3"})},
  {id:"P2",tit:"Método B1, 25 °C, interruptor diferencial por circuito, ρ a 20 °C",p:caso("uni",{met:"B1",temp:"25",idMode:"circuito",rhoMode:"20",sminD:"1.5",sminA:"6"})},
  {id:"P3",tit:"Método B2, 6 circuitos agrupados, máximo 8 salidas por circuito",p:caso("uni",{met:"B2",nag:"6",maxSal:"8",al_n:"30",tg_n:"34",tc_n:"9"})},
  {id:"P4",tit:"Suelo de alta resistividad: varios electrodos en paralelo",p:caso("uni",{rho_s:"600",fr:"1",Lv:"2",dv:"0.0127",iccE:"4.5"})},
  {id:"P5",tit:"Circuitos muy largos: una terma a 400 m que no cumple la caída de tensión",p:caso("uni",{Lalim:"120",al_L:"90",tg_L:"95",cargas:conCargas({nombre:"Terma lejana",tipo:"calentador",fases:1,p:5500,L:400,piso:0})})},
  {id:"P6",tit:"Vivienda pequeña de 40 m² sin cocina ni cargas especiales",p:caso("uni",{area:"40",al_n:"6",tg_n:"8",tc_n:"2",cargas:[]})},
  {id:"P7",tit:"Vivienda trifásica con motor trifásico y fases fijadas a mano",p:caso("uni",{sist:"tri380",
    cargas:conCargas({nombre:"Compresora",tipo:"motor",fases:3,p:2200,L:14,piso:0}),FIX:{uni:{"TG·C-1":"S","TG·C-2":"S"},multi:{}}})},
  {id:"P8",tit:"Edificio de 24 departamentos (todos los tramos de demanda y reparto por mejora local)",p:caso("multi",{dvGen:"2",Lgen:"25",Lms:"20",
    tipos:[{nombre:"Tipo A",cant:12,area:70,nAl:10,nTo:12,coc:0,cal:1500,aire:0,otras:0,Ld:20,Lc:12},{nombre:"Tipo B",cant:8,area:95,nAl:14,nTo:16,coc:8000,cal:3500,aire:2500,otras:0,Ld:28,Lc:15},
      {nombre:"Tipo C",cant:4,area:140,nAl:18,nTo:22,coc:0,cal:3500,aire:3500,otras:3000,Ld:36,Lc:20}]})},
  {id:"P9",tit:"Edificio sin servicios generales · trifásico 220 V",p:caso("multi",{sistG:"tri220",dvGen:"1",serv:[]})}
];
