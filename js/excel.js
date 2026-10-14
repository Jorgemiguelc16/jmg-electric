/* ================= Exportación a Excel ================= */
async function exportar(){
  const r=LAST, c=r.c, multi=r.mode==="multi", a0=r.alims[0];
  const wb=new ExcelJS.Workbook(); wb.creator="JMG - ELECTRIC"; wb.company="JMG - ELECTRIC"; wb.created=new Date();
  const K={navy:"FF14304F",soft:"FFEAF0F6",lab:"FFF3F6F9",inp:"FFEEF5FC",blue:"FF1F4FB4",grey:"FF5A6775",line:"FFBFC8D2",copper:"FF9A5A23",tot:"FFFBEFE3",ink:"FF14212E"};
  const thin={style:"thin",color:{argb:K.line}}, BOX={top:thin,left:thin,bottom:thin,right:thin};
  const fecha=new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"long",year:"numeric"});
  const F=(f,v)=>({formula:f,result:v});
  const logoId=typeof LOGO_JPG==="string"?wb.addImage({base64:LOGO_JPG,extension:"jpeg"}):null;
  const proyCip=(c.proj.proy||"—")+(c.proj.cip?` · CIP ${c.proj.cip}`:"");
  const wsM=wb.addWorksheet("Memoria",{properties:{tabColor:{argb:K.navy}}});
  const wsC=wb.addWorksheet("Cálculos",{properties:{tabColor:{argb:K.copper}}});
  const wsU=wb.addWorksheet("Unifilar",{properties:{tabColor:{argb:"FF2F7A4B"}}});
  const wsT=wb.addWorksheet("Metrado",{properties:{tabColor:{argb:"FF22507C"}}});
  const wsX=wb.addWorksheet("Anexos",{properties:{tabColor:{argb:"FF5A6775"}}});
  const setup=(ws,orient,widths)=>{ ws.columns=widths.map(w=>({width:w})); ws.views=[{showGridLines:false}];
    ws.pageSetup={paperSize:9,orientation:orient,fitToPage:true,fitToWidth:1,fitToHeight:0,horizontalCentered:true,margins:{left:0.45,right:0.45,top:0.55,bottom:0.6,header:0.25,footer:0.3}};
    ws.headerFooter={oddFooter:'&L&"Arial,Bold"&8JMG - ELECTRIC&"Arial,Regular" · Memoria de cálculo&C&"Arial,Regular"&8&A&R&"Arial,Regular"&8Página &P de &N'}; };
  const cell=(ws,r_,c_,v,st={})=>{ const x=ws.getCell(r_,c_); if(v!==undefined) x.value=v;
    x.font={name:"Arial",size:st.size||9,bold:!!st.bold,italic:!!st.it,color:{argb:st.color||K.ink}};
    if(st.fill) x.fill={type:"pattern",pattern:"solid",fgColor:{argb:st.fill}};
    x.alignment={vertical:"middle",horizontal:st.h||"left",wrapText:!!st.wrap,indent:st.ind||0,shrinkToFit:!!st.shrink};
    if(st.box) x.border=BOX; if(st.fmt) x.numFmt=st.fmt; return x; };
  const span=(ws,r_,c1,c2,v,st={})=>{ if(c2>c1) ws.mergeCells(r_,c1,r_,c2); const x=cell(ws,r_,c1,v,st);
    for(let k=c1+1;k<=c2;k++){ const y=ws.getCell(r_,k); if(st.box) y.border=BOX; if(st.fill) y.fill={type:"pattern",pattern:"solid",fgColor:{argb:st.fill}}; } return x; };
  const inp={box:1,fill:K.inp,color:K.blue,bold:1,h:"center"};
  const val={box:1,h:"center"};
  const cabecera=(ws,last,sub,hoja)=>{
    ws.getRow(1).height=30;
    span(ws,1,1,2,"JMG - ELECTRIC",{bold:1,size:11,color:"FFFFD200",fill:"FF1F2328",h:logoId===null?"center":"right",shrink:1});
    if(logoId!==null) ws.addImage(logoId,{tl:{col:0.06,row:0.06},ext:{width:36,height:36}});
    span(ws,1,3,last,"MEMORIA DE CÁLCULO DE INSTALACIONES ELÉCTRICAS INTERIORES",{bold:1,size:11,color:"FFFFFFFF",fill:K.navy,h:"center"});
    ws.getRow(2).height=19; span(ws,2,1,last,sub,{bold:1,size:10,color:K.navy,fill:K.soft,h:"center"});
    const half=Math.floor(last/2);
    [["Proyecto",c.proj.nombre||"—"],["Propietario",c.proj.prop||"—"],["Ubicación",c.proj.ubic||"—"],["Proyectista",proyCip],["Normativa","CNE-Utilización · RNE EM.010 · Norma DGE"],["Fecha · Hoja",`${fecha} · ${hoja}`]]
      .forEach(([k,v],i)=>{ const rw=3+Math.floor(i/2), left=i%2===0, c1=left?1:half+1, c2=left?half:last;
        span(ws,rw,c1,c1+1,k.toUpperCase(),{bold:1,size:7.5,color:K.grey,fill:K.lab,box:1}); span(ws,rw,c1+2,c2,v,{box:1,size:9,shrink:1}); ws.getRow(rw).height=17; });
    return 7; };
  const seccion=(ws,rw,last,txt)=>{ ws.getRow(rw).height=22; span(ws,rw,1,last,txt,{bold:1,size:10.5,color:K.navy});
    for(let k=1;k<=last;k++) ws.getCell(rw,k).border={bottom:{style:"medium",color:{argb:K.navy}}}; return rw+2; };
  const sub=(ws,rw,last,txt)=>{ span(ws,rw,1,last,txt,{bold:1,size:9,color:K.copper}); return rw+1; };
  const thead=(ws,rw,specs)=>{ ws.getRow(rw).height=30; specs.forEach(([c1,c2,t])=>span(ws,rw,c1,c2,t,{bold:1,size:8,color:"FFFFFFFF",fill:K.navy,h:"center",wrap:1,box:1})); return rw+1; };
  const nota=(ws,rw,last,txt)=>{ span(ws,rw,1,last,txt,{it:1,size:8,color:K.grey,wrap:1}); ws.getRow(rw).height=Math.max(15,Math.ceil(txt.length/120)*13); return rw+1; };
  const tot=(ws,rw,c1,c2)=>{ for(let k=c1;k<=c2;k++){ const x=ws.getCell(rw,k); x.font={...x.font,bold:true}; x.fill={type:"pattern",pattern:"solid",fgColor:{argb:K.tot}}; x.border={...BOX,top:{style:"medium",color:{argb:K.navy}}}; } };
  const okF={type:"pattern",pattern:"solid",bgColor:{argb:"FFDDF0E2"}}, badF={type:"pattern",pattern:"solid",bgColor:{argb:"FFF8D9D5"}};
  const obsF={type:"pattern",pattern:"solid",bgColor:{argb:"FFFBF0D9"}};
  const cfmt=(ws,ref)=>ws.addConditionalFormatting({ref,rules:[{type:"containsText",operator:"containsText",text:"REVISAR",style:{fill:badF,font:{color:{argb:"FFA3302A"},bold:true}}},{type:"containsText",operator:"containsText",text:"CONFORME",style:{fill:okF,font:{color:{argb:"FF22693F"},bold:true}}},{type:"containsText",operator:"containsText",text:"OBSERVACIÓN",style:{fill:obsF,font:{color:{argb:"FF8A5A00"},bold:true}}}]});

  /* ---------- ANEXOS ---------- */
  setup(wsX,"portrait",[13,13,13,13,13,13,13,13]);
  let x=cabecera(wsX,8,"ANEXOS · TABLAS DEL CNE-UTILIZACIÓN Y NORMATIVA APLICADA","Hoja 5 de 5");
  x=seccion(wsX,x,8,`A.1  TABLA 2 CNE-U · CAPACIDAD DE CORRIENTE (A) · MÉTODO ${c.met}`);
  x=thead(wsX,x,[[1,1,"Sección (mm²)"],[2,2,"PVC 70 °C\n2 conductores"],[3,3,"PVC 70 °C\n3 conductores"],[4,4,"XLPE 90 °C\n2 conductores"],[5,5,"XLPE 90 °C\n3 conductores"],[6,6,"Ø exterior aprox. (mm)"],[7,8,"Observación"]]);
  const a0r=x, TM=T2[c.met];
  SECC.forEach((s,i)=>{ cell(wsX,x,1,s,{...val,bold:1,fmt:"0.0"}); [TM.pvc2,TM.pvc3,TM.xl2,TM.xl3].forEach((t,j)=>cell(wsX,x,2+j,t[i],{...val,fmt:"0.0"})); cell(wsX,x,6,OD[s],{...val,fmt:"0.0"}); span(wsX,x,7,8,i===0?"Ambiente 30 °C":"",{box:1,size:8,color:K.grey}); x++; });
  const n2=SECC.length-1, AMPR=`'Anexos'!$B$${a0r}:$E$${a0r+n2}`, SECR=`'Anexos'!$A$${a0r}:$A$${a0r+n2}`;
  x=nota(wsX,x,8,`${MET[c.met]}. Valores de la Tabla 2 del CNE-Utilización (método de instalación según NTP 370.301 / IEC 60364-5-523).`)+1;
  x=seccion(wsX,x,8,"A.2  FACTORES DE CORRECCIÓN · TABLAS 5A Y 5C");
  x=thead(wsX,x,[[1,2,"Temperatura ambiente"],[3,3,"PVC 70 °C"],[4,4,"XLPE 90 °C"],[6,7,"Circuitos agrupados"],[8,8,"Factor"]]);
  [20,25,30,35,40,45].forEach((t,i)=>{ span(wsX,x,1,2,`${t} °C`,{...val,bold:t===c.temp}); cell(wsX,x,3,FT.pvc[t],{...val,fmt:"0.00"}); cell(wsX,x,4,FT.xl[t],{...val,fmt:"0.00"});
    span(wsX,x,6,7,`${i+1}`,{...val,bold:i+1===c.nag}); cell(wsX,x,8,FA[i+1],{...val,fmt:"0.00"}); x++; });
  x++;
  x=seccion(wsX,x,8,"A.3  CONDUCTORES DE PROTECCIÓN Y DE PUESTA A TIERRA · TABLAS 16 Y 17");
  x=thead(wsX,x,[[1,2,"ITM máximo (A)"],[3,4,"Conductor de protección (mm²)"],[5,6,"Ampacidad del alimentador (A)"],[7,8,"Conductor de puesta a tierra (mm²)"]]);
  const t17=[["≤ 100",10],["101 – 125",16],["126 – 200",25],["201 – 260",35],["261 – 355",50],["356 – 475",70]];
  T16.forEach(([a,s],i)=>{ span(wsX,x,1,2,`≤ ${a}`,val); span(wsX,x,3,4,s,{...val,fmt:"0.0"}); span(wsX,x,5,6,t17[i][0],val); span(wsX,x,7,8,t17[i][1],{...val,fmt:"0"}); x++; });
  x++;
  x=seccion(wsX,x,8,"A.4  CORRIENTES NOMINALES Y PODERES DE CORTE NORMALIZADOS");
  span(wsX,x,1,8,"Interruptores termomagnéticos (A)",{bold:1,size:8.5,color:K.navy}); x++;
  for(let i=0;i<ITM.length;i+=8){ ITM.slice(i,i+8).forEach((v,j)=>cell(wsX,x,1+j,v,{...val,bold:1})); x++; }
  span(wsX,x,1,8,"Poder de corte (kA)",{bold:1,size:8.5,color:K.navy}); x++;
  PDC.slice(0,8).forEach((v,j)=>cell(wsX,x,1+j,v,{...val,bold:1})); x+=2;
  x=seccion(wsX,x,8,"A.5  ILUMINANCIA MANTENIDA EN VIVIENDA · RNE EM.010 (ANEXO)");
  x=thead(wsX,x,[[1,5,"Ambiente"],[6,6,"Em (lux)"],[7,8,"Observación"]]);
  [["Dormitorio",50],["Baño",100],["Baño (zona de espejo)",500],["Cocina",300],["Sala, sala de estar",100],["Comedor",100],["Estudio, almacén, lavandería y planchado",500],["Patios y zonas abiertas",20],["Estacionamiento bajo techo",50],["Vestíbulo de entrada (zona común)",100],["Áreas de circulación y pasillos (zona común)",100],["Escaleras (zona común)",150]]
    .forEach(([a,e])=>{ span(wsX,x,1,5,a,{box:1,ind:1}); cell(wsX,x,6,e,{...val,bold:1}); span(wsX,x,7,8,"",{box:1}); x++; });
  x++;
  x=seccion(wsX,x,8,"A.6  NORMAS APLICADAS");
  NORMAS.forEach(([cod,tit,desc])=>{ span(wsX,x,1,2,cod,{bold:1,size:8,color:K.navy,box:1,wrap:1,fill:K.lab}); span(wsX,x,3,8,`${tit}. ${desc}`,{box:1,wrap:1,size:8.5}); wsX.getRow(x).height=34; x++; });
  x++;
  x=seccion(wsX,x,8,"A.7  CRITERIOS DE CÁLCULO");
  CRITERIOS.forEach((t,i)=>{ cell(wsX,x,1,`${i+1}.`,{h:"right",bold:1,color:K.navy}); span(wsX,x,2,8,t,{wrap:1,size:8.5}); wsX.getRow(x).height=28; x++; });
  x++;
  x=seccion(wsX,x,8,"A.8  CONTENIDO DEL EXPEDIENTE · RNE EM.010, ARTÍCULO 8");
  DOCS.forEach((t,i)=>{ cell(wsX,x,1,"☐",{h:"right",color:K.navy}); span(wsX,x,2,8,t,{wrap:1,size:8.5}); wsX.getRow(x).height=20; x++; });

  /* ---------- MEMORIA ---------- */
  const LM=10; setup(wsM,"portrait",[12,11,11,11,11,11,11,11,12,13]);
  let m=cabecera(wsM,LM,multi?"VIVIENDA MULTIFAMILIAR · EDIFICIO DE DEPARTAMENTOS":"VIVIENDA UNIFAMILIAR","Hoja 1 de 5");
  m=seccion(wsM,m,LM,"1.  PARÁMETROS DE DISEÑO");
  m=thead(wsM,m,[[1,5,"Parámetro"],[6,6,"Valor"],[7,7,"Unidad"],[8,10,"Referencia"]]);
  const R={};
  const par=(k,lab,v,u,ref,isInp,f="0.00")=>{ R[k]=`'Memoria'!$F$${m}`; span(wsM,m,1,5,lab,{box:1,ind:1}); if(f==="@") span(wsM,m,6,7,v,{...val,bold:1}); else { cell(wsM,m,6,v,isInp?{...inp,fmt:f}:{...val,fmt:f}); cell(wsM,m,7,u,{...val,color:K.grey}); } span(wsM,m,8,10,ref,{box:1,size:8,color:K.grey}); m++; };
  par("tipo","Tipo de edificación",multi?"Multifamiliar":"Unifamiliar","","",false,"@");
  par("sist","Sistema de suministro",SIST[r.sk].nom,"","Norma DGE, Tabla 201-01",false,"@");
  par("met","Método de instalación",MET[c.met].split(" · ")[0]+" · Tabla 3","","CNE-U, Tabla 3",false,"@");
  par("ais","Aislamiento del conductor",c.aisl==="pvc"?"PVC 70 °C":"XLPE / EPR 90 °C","","CNE-U, Tabla 2",false,"@");
  par("fp","Factor de potencia",c.fp,"—","Cargas de vivienda",true);
  par("rho","Resistividad del cobre (caída de tensión)",c.rho,"Ω·mm²/m",c.rhoRef,false,"0.0000");
  par("ft","Factor de corrección por temperatura",c.ft,"—",`${c.temp} °C · Tabla 5A`,true);
  par("fa","Factor de corrección por agrupamiento",c.fa,"—",`${c.nag} circuito(s) por tubería · Tabla 5C`,true);
  { const rr=m; R.fc=`'Memoria'!$F$${rr}`; span(wsM,m,1,5,"Factor de corrección total en circuitos derivados",{box:1,ind:1}); cell(wsM,m,6,F(`F${rr-2}*F${rr-1}`,c.fc),{...val,fmt:"0.00"}); cell(wsM,m,7,"—",{...val,color:K.grey}); span(wsM,m,8,10,"Temperatura × agrupamiento",{box:1,size:8,color:K.grey}); m++; }
  par("fd","Factor de corriente de diseño",FD,"—","Corriente de diseño = 1.25 × I",false);
  par("dvA","Caída de tensión máxima en alimentadores",DV_ALIM,"%","Regla 050-102(1)",false,"0.0");
  par("dvD","Caída de tensión máxima en circuitos derivados",DV_DER,"%","Regla 050-102(2)",false,"0.0");
  par("dvT","Caída de tensión máxima total",DV_TOT,"%","Regla 050-102",false,"0.0");
  par("icc","Corriente de cortocircuito en el punto de entrega",c.iccE,"kA","Dato de la concesionaria (Norma DGE, 110.F)",true,"0.0");
  par("idm","Esquema de interruptores diferenciales",c.idMode==="grupo"?"Por grupos de 3 circuitos":"Uno por circuito","",c.idMode==="grupo"?"Regla 150-400(8)":"Regla 150-400(9)",false,"@");
  if(!multi){
    par("aT",r.varios?`Área techada de vivienda (${r.PS.length} pisos)`:"Área techada de vivienda",r.areaT,"m²","Regla 050-110(1)",true,"0.0");
    par("aS","Área de sótano",r.sot,"m²","Se computa al 75 %",true,"0.0");
    { const rr=m; R.area=`'Memoria'!$F$${rr}`; span(wsM,m,1,5,"Área de vivienda computable",{box:1,ind:1}); cell(wsM,m,6,F(`F${rr-2}+0.75*F${rr-1}`,r.area),{...val,fmt:"0.0",bold:1}); cell(wsM,m,7,"m²",{...val,color:K.grey}); span(wsM,m,8,10,"Regla 050-110(1)",{box:1,size:8,color:K.grey}); m++; }
  }
  m=nota(wsM,m,LM,"Las celdas sombreadas en azul son datos de entrada: al modificarlas, el libro recalcula los resultados.")+1;

  m=seccion(wsM,m,LM,"2.  CÁLCULO DE LA MÁXIMA DEMANDA");
  let MDREF, servTotRef=null, servPRef=null, tipoRow={}, pisoRow={};
  if(!multi){
    m=sub(wsM,m,LM,"2.1  Cargas especiales");
    m=thead(wsM,m,[[1,4,"Descripción"],[5,6,"Tipo de carga"],[7,7,"Fases"],[8,8,"Potencia (W)"],[9,9,"Longitud (m)"],[10,10,"Circuito"]]);
    const c0=m, n=Math.max(r.cs.length,1);
    for(let i=0;i<n;i++){ const it=r.cs[i];
      span(wsM,m,1,4,it?it.nombre:"(sin cargas especiales)",{box:1,ind:1}); span(wsM,m,5,6,it?TIPOS[it.tipo].split(" (")[0]:"—",{box:1});
      cell(wsM,m,7,it?(it.fases===3&&SIST[r.sk].tri?"3φ":"1φ"):"—",val); cell(wsM,m,8,it?it.p:0,{...inp,fmt:"0"}); cell(wsM,m,9,it?it.L:0,{...val,fmt:"0.0"});
      const ci=it?r.circ.find(q=>q.desc===it.nombre):null; cell(wsM,m,10,ci?(r.varios?`${ci.tab} · ${ci.id}`:ci.id):"—",val); m++; }
    const T=`$E$${c0}:$E$${m-1}`, P=`$H$${c0}:$H$${m-1}`; m++;
    m=sub(wsM,m,LM,"2.2  Determinación de la máxima demanda · Regla 050-200(1)");
    m=thead(wsM,m,[[1,4,"Concepto"],[5,8,"Criterio"],[9,9,"Instalada (W)"],[10,10,"Demanda (W)"]]);
    const md=r.md, d0=m;
    const mr=(a,b,ci,de,fi="0")=>{ span(wsM,m,1,4,a,{box:1,ind:1}); span(wsM,m,5,8,b,{box:1,size:8,color:K.grey,wrap:1}); cell(wsM,m,9,ci,{...val,fmt:fi}); cell(wsM,m,10,de,{...val,fmt:"0"}); wsM.getRow(m).height=24; return m++; };
    mr("Carga básica","2 500 W por los primeros 90 m² + 1 000 W por cada 90 m² o fracción adicional",F(R.area,r.area),F(`2500+1000*MAX(0,ROUNDUP((${R.area}-90)/90,0))`,md.basica),'0.0" m²"');
    const rC=mr("Cocina eléctrica","6 000 W + 40 % del exceso sobre 12 kW",F(`SUMIFS(${P},${T},"Cocina eléctrica")`,md.coc),F(`IF(I${m}>0,6000+0.4*MAX(0,I${m}-12000),0)`,md.mdCoc));
    mr("Calentadores de agua y duchas","100 %",F(`SUMIFS(${P},${T},"Calentador de agua / ducha")`,md.cal),F(`I${m}`,md.cal));
    mr("Aire acondicionado","100 %",F(`SUMIFS(${P},${T},"Aire acondicionado")`,md.aire),F(`I${m}`,md.aire));
    mr("Otras cargas mayores de 1 500 W","25 % si existe cocina; si no, 100 % hasta 6 kW + 25 % del exceso",F(`SUMIFS(${P},${T},"Otra carga",${P},">1500")+SUMIFS(${P},${T},"Motor",${P},">1500")`,md.otras),F(`IF($I$${rC}>0,0.25*I${m},MIN(I${m},6000)+0.25*MAX(0,I${m}-6000))`,md.mdOtras));
    span(wsM,m,1,9,"MÁXIMA DEMANDA DE LA VIVIENDA (W)",{box:1,ind:1}); cell(wsM,m,10,F(`SUM(J${d0}:J${m-1})`,md.MD),{...val,fmt:"0"}); tot(wsM,m,1,10);
    MDREF=`'Memoria'!$J$${m}`; m+=2;
    const PT=r.PS.filter(p=>p.md);
    if(PT.length){
      m=sub(wsM,m,LM,"2.3  Máxima demanda por piso · alimentadores a tableros de distribución · Regla 050-200");
      m=thead(wsM,m,[[1,1,"Piso"],[2,2,"Tablero"],[3,3,"Área (m²)"],[4,4,"Carga básica (W)"],[5,5,"Cocina (W)"],[6,6,"Calentador (W)"],[7,7,"Aire acond. (W)"],[8,8,"Otras > 1.5 kW (W)"],[9,9,"Cocina y otras, demanda (W)"],[10,10,"MD piso (W)"]]);
      PT.forEach(p=>{ pisoRow[p.n]=m;
        cell(wsM,m,1,`${ORD(p.n)} piso`,{box:1,bold:1,h:"center"}); cell(wsM,m,2,p.tab,val); cell(wsM,m,3,p.areaC,{...inp,fmt:"0.0"});
        cell(wsM,m,4,F(`2500+1000*MAX(0,ROUNDUP((C${m}-90)/90,0))`,p.md.basica),{...val,fmt:"0"});
        [p.md.coc,p.md.cal,p.md.aire,p.md.otras].forEach((v,j)=>cell(wsM,m,5+j,v,{...inp,fmt:"0"}));
        cell(wsM,m,9,F(`IF(E${m}>0,6000+0.4*MAX(0,E${m}-12000),0)+IF(E${m}>0,0.25*H${m},MIN(H${m},6000)+0.25*MAX(0,H${m}-6000))`,p.md.mdCoc+p.md.mdOtras),{...val,fmt:"0"});
        cell(wsM,m,10,F(`D${m}+F${m}+G${m}+I${m}`,p.md.MD),{...val,fmt:"0",bold:1}); m++; });
      m=nota(wsM,m,LM,`Cada tablero de piso se alimenta desde el tablero general TG; su máxima demanda se obtiene con la Regla 050-200 aplicada al área del piso y a las cargas especiales conectadas a ese tablero${r.sot>0&&r.esq==="td"?" (el sótano, al 75 %, se asigna al 1er piso)":""}. El alimentador general conserva la máxima demanda de toda la vivienda.${r.esq==="tg"?" Los circuitos del 1er piso salen directamente del tablero general TG.":""}`)+1;
    }
  } else {
    m=sub(wsM,m,LM,"2.1  Carga por unidad de vivienda · Regla 050-202(1)");
    m=thead(wsM,m,[[1,1,"Tipo"],[2,2,"Unidades"],[3,3,"Área (m²)"],[4,4,"Carga básica (W)"],[5,5,"Cocina (W)"],[6,6,"Calentador (W)"],[7,7,"Aire acond. (W)"],[8,8,"Otras > 1.5 kW (W)"],[9,9,"MD sin aire (W)"],[10,10,"MD unidad (W)"]]);
    const u0=m;
    r.T.forEach(t=>{ tipoRow[t.nombre]=m;
      cell(wsM,m,1,t.nombre,{box:1,bold:1,h:"center"}); cell(wsM,m,2,t.cant,{...inp,fmt:"0"}); cell(wsM,m,3,t.area,{...inp,fmt:"0.0"});
      cell(wsM,m,4,F(`1500+IF(C${m}>45,1000,0)+1000*MAX(0,ROUNDUP((C${m}-90)/90,0))`,t.md.basica),{...val,fmt:"0"});
      [t.coc,t.cal,t.aire,t.otras].forEach((v,j)=>cell(wsM,m,5+j,v,{...inp,fmt:"0"}));
      cell(wsM,m,9,F(`D${m}+IF(E${m}>0,6000+0.4*MAX(0,E${m}-12000),0)+F${m}+IF(E${m}>0,0.25*H${m},MIN(H${m},6000)+0.25*MAX(0,H${m}-6000))`,t.md.sinAire),{...val,fmt:"0"});
      cell(wsM,m,10,F(`I${m}+G${m}`,t.md.MD),{...val,fmt:"0",bold:1}); m++; });
    const u1=m-1;
    span(wsM,m,1,1,"TOTAL",{box:1,h:"center"}); cell(wsM,m,2,F(`SUM(B${u0}:B${u1})`,r.units.length),{...val,fmt:"0"}); for(let k=3;k<=10;k++) cell(wsM,m,k,"",{box:1}); tot(wsM,m,1,10); m++;
    m=nota(wsM,m,LM,"Carga básica: 1 500 W por los primeros 45 m², 1 000 W por los segundos 45 m² y 1 000 W por cada 90 m² o fracción adicional. Cocina: 6 000 W más 40 % del exceso sobre 12 kW. Otras cargas mayores de 1 500 W: 25 % si existe cocina; si no, 100 % hasta 6 kW más 25 % del exceso. Corriente mínima del alimentador de cada departamento: 25 A.")+1;
    m=sub(wsM,m,LM,"2.2  Máxima demanda del edificio · Regla 050-202(3) · factores 100 % · 65 % · 40 % · 30 % · 25 %");
    m=thead(wsM,m,[[1,2,"Tipo"],[3,3,"Unidades"],[4,4,"Orden desde"],[5,5,"Orden hasta"],[6,6,"MD unidad sin aire (W)"],[7,7,"Carga (W)"],[8,8,"Factor medio"],[9,10,"Demanda (W)"]]);
    const e0=m;
    r.T.forEach((t,i)=>{ const tr=tipoRow[t.nombre];
      span(wsM,m,1,2,t.nombre,{box:1,bold:1,h:"center"}); cell(wsM,m,3,F(`B${tr}`,t.cant),{...val,fmt:"0"});
      cell(wsM,m,4,i===0?1:F(`E${m-1}+1`,t.desde),{...val,fmt:"0"}); cell(wsM,m,5,F(`D${m}+C${m}-1`,t.hasta),{...val,fmt:"0"});
      cell(wsM,m,6,F(`I${tr}`,t.md.sinAire),{...val,fmt:"0"}); cell(wsM,m,7,F(`C${m}*F${m}`,t.cant*t.md.sinAire),{...val,fmt:"0"});
      const s=`(D${m}-1)`, e=`E${m}`;
      span(wsM,m,9,10,F(`F${m}*(MAX(0,MIN(${e},1)-MAX(${s},0))+0.65*MAX(0,MIN(${e},3)-MAX(${s},1))+0.4*MAX(0,MIN(${e},5)-MAX(${s},3))+0.3*MAX(0,MIN(${e},20)-MAX(${s},5))+0.25*MAX(0,${e}-MAX(${s},20)))`,t.dem),{...val,fmt:"0"});
      cell(wsM,m,8,F(`IF(G${m}>0,I${m}/G${m},0)`,t.cant*t.md.sinAire>0?t.dem/(t.cant*t.md.sinAire):0),{...val,fmt:"0.0%"}); m++; });
    const e1=m-1;
    const er=(lab,f,v,bold)=>{ span(wsM,m,1,8,lab,{box:1,ind:1}); span(wsM,m,9,10,F(f,v),{...val,fmt:"0"}); if(bold) tot(wsM,m,1,10); return m++; };
    er("Demanda de departamentos · 050-202(3)(a)",`SUM(I${e0}:I${e1})`,r.mdDeptos);
    er("Aire acondicionado de departamentos (100 %) · 050-202(3)(c)",`SUMPRODUCT(B${u0}:B${u1},G${u0}:G${u1})`,r.aireTot);
    const rS=er("Cargas comunes fuera de las unidades (75 %) · 050-202(3)(d)","0",r.mdServ);
    const rMD=er("MÁXIMA DEMANDA DEL EDIFICIO (W)",`SUM(I${e1+1}:I${m-1})`,r.MD,true);
    MDREF=`'Memoria'!$I$${rMD}`;
    m=nota(wsM,m,LM,"Los tipos se ordenan de mayor a menor carga por unidad. Si se modifican las cargas en este libro, verifique que el orden se mantenga.")+1;
    m=sub(wsM,m,LM,"2.3  Servicios generales · Tablero TSG");
    m=thead(wsM,m,[[1,4,"Descripción"],[5,6,"Tipo"],[7,7,"Fases"],[8,8,"Potencia (W)"],[9,9,"Longitud (m)"],[10,10,"Circuito"]]);
    const s0=m, ns=Math.max(r.SV.length,1);
    for(let i=0;i<ns;i++){ const it=r.SV[i];
      span(wsM,m,1,4,it?it.nombre:"(sin cargas comunes)",{box:1,ind:1}); span(wsM,m,5,6,it?TSERV[it.tipo]:"—",{box:1});
      cell(wsM,m,7,it?(it.fases===3&&SIST[r.sk].tri?"3φ":"1φ"):"—",val); cell(wsM,m,8,it?it.p:0,{...inp,fmt:"0"}); cell(wsM,m,9,it?it.L:0,{...val,fmt:"0.0"}); cell(wsM,m,10,it?`S-${i+1}`:"—",val); m++; }
    const s1=m-1;
    const sr=(lab,f,v,bold)=>{ span(wsM,m,1,7,lab,{box:1,ind:1}); cell(wsM,m,8,F(f,v),{...val,fmt:"0"}); span(wsM,m,9,10,"",{box:1}); if(bold) tot(wsM,m,1,10); return m++; };
    const sT=sr("Potencia instalada de servicios generales",`SUM(H${s0}:H${s1})`,r.Pserv);
    const sM=sr("Motor de mayor potencia",`SUMPRODUCT(MAX((E${s0}:E${s1}="Motor")*H${s0}:H${s1}))`,r.maxMot);
    const sD=sr("Potencia de diseño del alimentador TSG (+25 % del mayor motor)",`H${sT}+0.25*H${sM}`,r.Pserv+0.25*r.maxMot,true);
    wsM.getCell(rS,9).value=F(`0.75*H${sT}`,r.mdServ);
    servTotRef=`'Memoria'!$H$${sT}`; servPRef=`'Memoria'!$H$${sD}`; m++;
  }

  /* ---------- CÁLCULOS ---------- */
  const LC=20; setup(wsC,"landscape",[8,7,30,7,9,7,6,8,8,7,8,9,7,7,8,12,7,17,7,9]);
  let k=cabecera(wsC,LC,"CÁLCULO DE ALIMENTADORES, CIRCUITOS DERIVADOS, BALANCE DE FASES Y CORTOCIRCUITO","Hoja 2 de 5");
  const HDR=(first)=>[[1,first?3:1,first?"Alimentador":"Tablero"],...(first?[]:[[2,2,"Nº"],[3,3,"Descripción"]]),[4,4,first?"Cant.":"Salidas"],[5,5,"Potencia (W)"],[6,6,first?"Fases":"Fases · fase"],[7,7,"Tensión (V)"],[8,8,"I nominal (A)"],[9,9,"I diseño (A)"],[10,10,first?"ITM (A)":"ITM (A · curva)"],[11,11,"Sección (mm²)"],[12,12,"Iz corregida (A)"],[13,13,"Longitud (m)"],[14,14,"ΔV (%)"],[15,15,first?"ΔV acum. (%)":"ΔV total (%)"],[16,16,"Verificación"],[17,17,"Tierra (mm²)"],[18,18,first?"Conductores":"Diferencial 30 mA"],[19,19,"PdC (kA)"],[20,20,"Tubo PVC"]];
  const fI=rw=>`E${rw}/(IF(LEFT(F${rw},2)="3φ",SQRT(3),1)*G${rw}*${R.fp})`;
  const AB=c.aisl==="pvc"?0:2;
  const fIz=(rw,col,fac,tri)=>`INDEX(${AMPR},MATCH(K${rw},${SECR},0),${col===AB+(tri?1:0)?`${AB+1}+IF(LEFT(F${rw},2)="3φ",1,0)`:col+1})*${fac}`;
  const fDV=rw=>`IF(LEFT(F${rw},2)="3φ",SQRT(3),2)*${R.rho}*M${rw}*H${rw}/K${rw}/G${rw}*100`;
  k=seccion(wsC,k,LC,"1.  ALIMENTADORES");
  k=thead(wsC,k,HDR(true));
  const genRow=k;
  r.alims.forEach((a,i)=>{
    const pf=a.pKey==="MD"?F(MDREF,a.P):a.pKey==="servP"?F(servPRef,a.P):a.pKey==="piso"?F(`'Memoria'!$J$${pisoRow[a.piso]}`,a.P):F(`'Memoria'!$J$${tipoRow[r.T[a.ti].nombre]}`,a.P);
    span(wsC,k,1,3,a.desc,{box:1,ind:1,size:8.5}); cell(wsC,k,4,a.cant??1,{...val,fmt:"0"}); cell(wsC,k,5,pf,{...val,fmt:"0"});
    cell(wsC,k,6,a.s.tri?"3φ":"1φ",val); cell(wsC,k,7,a.s.V,val);
    cell(wsC,k,8,F(fI(k),a.I),{...val,fmt:"0.00"}); cell(wsC,k,9,F(`MAX(H${k}*${R.fd},${a.Imin||0})`,a.Id),{...val,fmt:"0.00"});
    cell(wsC,k,10,a.itm,{...inp,fmt:"0"}); cell(wsC,k,11,a.S,{...inp,fmt:"0.0"}); cell(wsC,k,12,F(fIz(k,a.col,R.ft,a.s.tri),a.Izc),{...val,fmt:"0.0"});
    cell(wsC,k,13,a.L,{...inp,fmt:"0.0"}); cell(wsC,k,14,F(fDV(k),a.dVp),{...val,fmt:"0.00"}); cell(wsC,k,15,F(i===0?`N${k}`:`N${k}+$O$${genRow}`,a.dvAc),{...val,fmt:"0.00",bold:1});
    cell(wsC,k,16,F(`IF(AND(I${k}<=J${k},J${k}<=L${k},O${k}<=${R.dvA}),"CONFORME","REVISAR")`,a.ok?"CONFORME":"REVISAR"),{...val,bold:1,size:8});
    cell(wsC,k,17,a.St,{...val,fmt:"0.0"}); cell(wsC,k,18,`${a.s.n}-1×${a.S} + 1×${a.St}(T)${c.desig?" "+c.desig:""}`,{...val,size:8,wrap:1}); cell(wsC,k,19,a.pdc,{...val,fmt:"0.0"}); cell(wsC,k,20,a.tubo.mm?`${a.tubo.mm} mm`:a.tubo.pul,{...val,size:8});
    a._row=k; k++; });
  k=nota(wsC,k,LC,`Verificación: corriente de diseño ≤ ITM ≤ ampacidad corregida por temperatura, y caída de tensión acumulada ≤ 2.5 %. Corriente de diseño no menor que la mínima del código (${multi?"25 A por departamento, Regla 050-202(1)(b)":"40 A, Regla 050-200(1)(b)"}). Celdas en azul: valores seleccionados, modificables.`);+1;
  k=seccion(wsC,k,LC,"2.  CUADRO DE CARGAS · CIRCUITOS DERIVADOS");
  k=thead(wsC,k,HDR(false));
  const cStart=k, subRows=[], subMul=[];
  r.tabs.forEach(tb=>{
    const f=r.alims[tb.feeder]; span(wsC,k,1,LC,`TABLERO ${tb.tab}  ·  ${tb.desc}  ·  alimentado por: ${f.desc}  ·  Icc ≈ ${fmt(tb.icc,2)} kA`,{bold:1,size:8.5,color:K.navy,fill:K.soft,box:1,ind:1}); k++;
    const t0=k, cs=r.circ.filter(q=>q.tab===tb.tab);
    cs.forEach(q=>{
      cell(wsC,k,1,tb.tab,{...val,size:8}); cell(wsC,k,2,q.id,{...val,bold:1}); cell(wsC,k,3,q.motor?`${q.desc} (motor)`:q.desc,{box:1,ind:1,size:8.5}); cell(wsC,k,4,q.n,{...val,fmt:"0"});
      cell(wsC,k,5,q.P,{...inp,fmt:"0"}); cell(wsC,k,6,q.f3?"3φ":(r.bal&&q.fase&&q.fase!=="—"?`1φ · ${q.fase}`:"1φ"),{...val,size:8}); cell(wsC,k,7,q.s.V,val);
      cell(wsC,k,8,F(fI(k),q.I),{...val,fmt:"0.00"}); cell(wsC,k,9,F(`H${k}*${R.fd}`,q.Id),{...val,fmt:"0.00"});
      cell(wsC,k,10,q.itm,{...inp,fmt:`0" · ${q.curva}"`}); cell(wsC,k,11,q.S,{...inp,fmt:"0.0"}); cell(wsC,k,12,F(fIz(k,q.col,R.fc,q.f3),q.Izc),{...val,fmt:"0.0"});
      cell(wsC,k,13,q.L,{...inp,fmt:"0.0"}); cell(wsC,k,14,F(fDV(k),q.dVp),{...val,fmt:"0.00"}); cell(wsC,k,15,F(`N${k}+$O$${f._row}`,q.dVt),{...val,fmt:"0.00",bold:1});
      cell(wsC,k,16,F(`IF(AND(I${k}<=J${k},J${k}<=L${k},N${k}<=${R.dvD},O${k}<=${R.dvT}),"CONFORME","REVISAR")`,q.ok?"CONFORME":"REVISAR"),{...val,bold:1,size:8});
      cell(wsC,k,17,q.St,{...val,fmt:"0.0"}); cell(wsC,k,18,`${q.idName} · ${q.f3?4:2}×${q.idRat} A`,{...val,size:8}); cell(wsC,k,19,tb.pdc,{...val,fmt:"0.0"}); cell(wsC,k,20,q.tubo.mm?`${q.tubo.mm} mm`:q.tubo.pul,{...val,size:8});
      k++; });
    const pre=tb.tab==="TSG"?"S-":"C-";
    for(let i=1;i<=c.reserva;i++){ cell(wsC,k,1,tb.tab,{...val,size:8}); cell(wsC,k,2,`${pre}${cs.length+i}`,{...val,bold:1}); cell(wsC,k,3,"Reserva",{box:1,ind:1,it:1,color:K.grey}); for(let j=4;j<=LC;j++) cell(wsC,k,j,"—",{...val,color:K.grey}); k++; }
    span(wsC,k,1,4,`Subtotal ${tb.tab}`,{box:1,ind:1}); cell(wsC,k,5,F(`SUM(E${t0}:E${k-1})`,cs.reduce((s,q)=>s+q.P,0)),{...val,fmt:"0"}); for(let j=6;j<=LC;j++) cell(wsC,k,j,"",{box:1}); tot(wsC,k,1,LC); subRows.push(k); subMul.push(f.cant||1); k++;
  });
  const cEnd=k-1;
  k=nota(wsC,k,LC,`Verificación: corriente de diseño ≤ ITM ≤ ampacidad corregida (Tabla 2, método ${c.met}, Tablas 5A y 5C); ΔV del circuito ≤ 2.5 % y total ≤ 4 % (Regla 050-102). Máximo 12 salidas por circuito (Regla 070-3000). Diferenciales de 30 mA ${c.idMode==="grupo"?"por grupos de tres circuitos (Regla 150-400(8))":"en cada circuito (Regla 150-400(9))"}. Espacios de reserva: ${c.reserva} por tablero (Regla 050-108(2)).`)+1;
  cfmt(wsC,`P${genRow}:P${cEnd}`);
  wsC.pageSetup.printTitlesRow=`${cStart-1}:${cStart-1}`;
  let balRow=null;
  if(r.bal){
    k=seccion(wsC,k,LC,"3.  BALANCE DE CARGAS POR FASE");
    k=thead(wsC,k,[[1,2,"Fase"],[3,3,"Cargas asignadas"],[4,5,"Potencia (W)"],[6,7,"Participación"]]);
    const b0=k, items=r.bal.items;
    r.bal.nm.forEach((nm,i)=>{ const its=items.filter(q=>q.fase===nm).map(q=>(q.ref||q.id)+(q.fijo?" (fijada)":""));
      span(wsC,k,1,2,nm,{...val,bold:1}); const txt=(its.join(", ")||"—")+(items.some(q=>q.fase==="3φ")?" · más 1/3 de cargas trifásicas":""); cell(wsC,k,3,txt,{box:1,wrap:1,size:8}); span(wsC,k,4,5,r.bal.ph[i],{...val,fmt:"0"}); span(wsC,k,6,7,F(`D${k}/SUM($D$${b0}:$D$${b0+2})`,r.bal.ph[i]/(r.bal.ph.reduce((s,v)=>s+v,0)||1)),{...val,fmt:"0.0%"}); wsC.getRow(k).height=Math.max(18,Math.ceil(txt.length/42)*11+8); k++; });
    span(wsC,k,1,3,"Desbalance = (fase más cargada − promedio) / promedio",{box:1,ind:1,wrap:1}); wsC.getRow(k).height=26; span(wsC,k,4,5,F(`(MAX(D${b0}:D${b0+2})-AVERAGE(D${b0}:D${b0+2}))/AVERAGE(D${b0}:D${b0+2})`,r.bal.desb/100),{...val,fmt:"0.0%",bold:1});
    span(wsC,k,6,7,F(`IF(D${k}<=0.1,"CONFORME","OBSERVACIÓN")`,r.bal.desb<=10?"CONFORME":"OBSERVACIÓN"),{...val,bold:1,size:8}); cfmt(wsC,`F${k}:G${k}`); tot(wsC,k,1,7); balRow=k; k++;
    span(wsC,k,1,3,"Desbalance mínimo alcanzable con estas cargas",{box:1,ind:1}); span(wsC,k,4,5,r.bal.desbMin/100,{...val,fmt:"0.0%"}); span(wsC,k,6,7,"",{box:1}); k++;
    k=nota(wsC,k,LC,`Reparto de cargas monofásicas con el menor desbalance posible${r.bal.nFix?`; ${r.bal.nFix} carga(s) con fase fijada por el proyectista`:""}. Criterio de diseño: desbalance no mayor de 10 %. ${r.bal.desb>10?sugerencia(r):""}`)+1;
  }
  k=seccion(wsC,k,LC,`${r.bal?"4":"3"}.  CORRIENTE DE CORTOCIRCUITO Y PODER DE CORTE`);
  k=thead(wsC,k,[[1,3,"Punto de la instalación"],[4,5,"Sistema"],[6,7,"Icc estimada (kA)"],[8,9,"PdC mínimo (kA)"],[10,13,"Dispositivos"]]);
  const icc0=k;
  [["Punto de entrega (acometida)",a0.s.txt,c.iccE,a0.pdc,"Interruptor general"],...r.tabs.map(tb=>[`Tablero ${tb.tab}`,r.alims[tb.feeder].s.txt,tb.icc,tb.pdc,"Interruptores de circuitos derivados"])].forEach(([p,s,i,pd,d])=>{
    span(wsC,k,1,3,p,{box:1,ind:1}); span(wsC,k,4,5,s,val); span(wsC,k,6,7,i,{...val,fmt:"0.00"}); span(wsC,k,8,9,pd,{...val,bold:1,fmt:"0.0"}); span(wsC,k,10,13,d,{box:1,size:8}); k++; });
  k=nota(wsC,k,LC,"Estimación: impedancia de la fuente a partir de la corriente de cortocircuito del punto de entrega, más la resistencia de los conductores (ρ a 20 °C). El poder de corte se elige igual o mayor que la corriente calculada (Norma DGE, 303.B.2; IEC 60898-1).");

  /* ---------- MEMORIA: resumen, suministro, tierra y firmas ---------- */
  wsM.getRow(m-1).addPageBreak();
  m=seccion(wsM,m,LM,"3.  RESUMEN DE RESULTADOS");
  m=thead(wsM,m,[[1,6,"Concepto"],[7,8,"Valor"],[9,10,"Unidad / referencia"]]);
  const rs=(lab,v,u,f)=>{ span(wsM,m,1,6,lab,{box:1,ind:1}); span(wsM,m,7,8,v,{...val,bold:1,fmt:f}); span(wsM,m,9,10,u,{...val,color:K.grey,size:8}); m++; };
  const C2=`'Cálculos'!`;
  if(multi) rs("Número de departamentos",F(`SUM(B${tipoRow[r.T[0].nombre]}:B${tipoRow[r.T[r.T.length-1].nombre]})`,r.units.length),"unid.","0");
  rs("Potencia instalada",F(subRows.map((q,i)=>`${subMul[i]}*${C2}E${q}`).join("+"),r.CI),"W","0");
  rs("Máxima demanda",F(MDREF,multi?r.MD:r.md.MD),"W","0");
  rs("Potencia a contratar sugerida",F(`ROUNDUP(${MDREF}/500,0)/2`,r.contratada),"kW","0.0");
  rs("Sistema de suministro",SIST[r.sk].nom,"Tabla 201-01","@");
  rs("Tipo de conexión",multi?"En derivación":"Conexión simple",multi?"Banco de medidores · DGE 301.C":"Norma DGE, 301.A","@");
  rs(`Corriente nominal del alimentador ${multi?"general":"principal"}`,F(`${C2}H${genRow}`,a0.I),"A","0.00");
  rs("Interruptor termomagnético general",F(`"${a0.s.tri?3:2}×"&${C2}J${genRow}&" A · ${a0.pdc} kA"`,`${a0.s.tri?3:2}×${a0.itm} A · ${a0.pdc} kA`),"","@");
  rs(`Conductor del alimentador ${multi?"general":"principal"}`,F(`"${a0.s.n}-1×"&${C2}K${genRow}&" mm² Cu${c.desig?" "+c.desig:""}"`,`${a0.s.n}-1×${a0.S} mm² Cu${c.desig?" "+c.desig:""}`),"","@");
  rs("Caída de tensión máxima total",F(`MAX(${C2}O${cStart}:O${cEnd})`,Math.max(...r.circ.map(q=>q.dVt))),"% · límite 4 %","0.00");
  rs("Circuitos derivados",F(`COUNTIF(${C2}P${cStart}:P${cEnd},"CONFORME")+COUNTIF(${C2}P${cStart}:P${cEnd},"REVISAR")`,r.circ.length),`+ ${c.reserva} de reserva por tablero`,"0");
  if(r.bal) rs("Desbalance de cargas entre fases",F(`${C2}D${balRow}`,r.bal.desb/100),"criterio ≤ 10 %","0.0%");
  rs("Verificación general",F(`IF(COUNTIF(${C2}P${genRow}:P${cEnd},"REVISAR")=0,"CONFORME","REVISAR")`,r.alims.every(a=>a.ok)&&r.circ.every(q=>q.ok)?"CONFORME":"REVISAR"),"","@");
  cfmt(wsM,`G${m-1}:H${m-1}`);
  m++;
  const p=r.pat;
  m=seccion(wsM,m,LM,"4.  SISTEMA DE PUESTA A TIERRA");
  m=thead(wsM,m,[[1,4,"Parámetro"],[5,6,"Valor"],[7,7,"Unidad"],[8,10,"Criterio"]]);
  const p0=m;
  const pr=(lab,v,u,crit,st)=>{ span(wsM,m,1,4,lab,{box:1,ind:1}); span(wsM,m,5,6,v,st); cell(wsM,m,7,u,{...val,color:K.grey}); span(wsM,m,8,10,crit,{box:1,size:8,color:K.grey}); m++; };
  pr("Resistividad del suelo",p.rho,"Ω·m","Medición por método de Wenner",{...inp,fmt:"0"});
  pr("Longitud de la varilla",p.Lv,"m","Mínimo 2 m · Regla 060-702(3)",{...inp,fmt:"0.00"});
  pr("Diámetro de la varilla",p.dv,"m","Cu ≥ 13 mm; acero-cobre ≥ 16 mm",{...inp,fmt:"0.0000"});
  pr("Resistencia del electrodo sin tratamiento",F(`E${p0}/(2*PI()*E${p0+1})*(LN(4*E${p0+1}/(E${p0+2}/2))-1)`,p.Rv),"Ω","Electrodo vertical (Dwight)",{...val,fmt:"0.00"});
  pr("Factor de reducción por tratamiento",p.fr,"—","Bentonita, gel u otro (estimado)",{...inp,fmt:"0.00"});
  pr("Resistencia con tratamiento",F(`E${p0+3}*E${p0+4}`,p.Rt),"Ω","Valor esperado",{...val,fmt:"0.00",bold:1});
  pr("Electrodos (varillas) en paralelo",p.nVar,"unid.","Separación ≥ longitud de varilla (mín. 2 m)",{...inp,fmt:"0"});
  const nC=`E${p0+6}`, fx=FAGR.slice(1).reduceRight((acc,[n1,f1],i)=>{ const [n0,f0]=FAGR[i]; return `IF(${nC}<=${n1},${f0}+${+(f1-f0).toFixed(4)}*(${nC}-${n0})/${n1-n0},${acc})`; },String(FAGR[FAGR.length-1][1]));
  pr("Factor de agrupamiento",F(`IF(${nC}<=1,1,${fx})`,p.F),"—","Varillas en paralelo (interpolado)",{...val,fmt:"0.00"});
  pr("Resistencia del conjunto",F(`E${p0+5}*E${p0+7}/${nC}`,p.Rn),"Ω","R = Rt · F / n",{...val,fmt:"0.00",bold:1});
  pr("Conductor de puesta a tierra",r.Selec,"mm²","Cobre · Tabla 17",{...val,fmt:"0"});
  pr("Verificación",F(`IF(E${p0+8}<=25,"CONFORME","REVISAR")`,p.Rn<=25?"CONFORME":"REVISAR"),"","R ≤ 25 Ω · Regla 060-712",{...val,bold:1});
  cfmt(wsM,`E${m-1}:F${m-1}`);
  m++;
  m=seccion(wsM,m,LM,"5.  VERIFICACIONES NORMATIVAS");
  alertas(r).forEach(([ok,ref,t])=>{ span(wsM,m,1,2,ref,{bold:1,size:8,color:K.navy,fill:K.lab,box:1,wrap:1}); span(wsM,m,3,9,t,{box:1,wrap:1,size:8.5}); cell(wsM,m,10,ok===true?"CONFORME":ok==="warn"?"OBSERVACIÓN":"REVISAR",{...val,bold:1,size:8}); wsM.getRow(m).height=Math.max(20,Math.ceil(t.length/95)*12); m++; });
  cfmt(wsM,`J${m-alertas(r).length}:J${m-1}`);
  m++;
  m=seccion(wsM,m,LM,"6.  CONFORMIDAD");
  const firma=(c1,c2,tit,nombre,cip="")=>{ span(wsM,m,c1,c2,tit,{bold:1,size:8.5,color:K.navy,fill:K.lab,box:1,h:"center"});
    [["Nombre",nombre],["CIP N°",cip],["Firma y sello",""]].forEach(([l,v],i)=>{ const rw=m+1+i; cell(wsM,rw,c1,l,{size:8,color:K.grey,box:1,fill:K.lab}); span(wsM,rw,c1+1,c2,v,{box:1}); wsM.getRow(rw).height=i===2?42:18; }); };
  firma(1,5,"ELABORADO POR",c.proj.proy||"",c.proj.cip); firma(6,10,"REVISADO Y APROBADO POR",""); m+=5;
  nota(wsM,m,LM,`La presente memoria ha sido elaborada con JMG - ELECTRIC ${VERSION}, aplicando los criterios del Código Nacional de Electricidad – Utilización, el RNE EM.010 y las Normas DGE. Los valores obtenidos constituyen una herramienta de apoyo al diseño; su validación, adecuación a las condiciones reales de obra y firma corresponden al ingeniero proyectista responsable.`);

  /* ---------- UNIFILAR ---------- */
  { const LU=20, u=unifilar(r); setup(wsU,"landscape",[12,12,...Array(LU-2).fill(6.5)]);
    let q=cabecera(wsU,LU,"DIAGRAMA UNIFILAR · ESQUEMA DE DISTRIBUCIÓN Y PROTECCIÓN","Hoja 3 de 5");
    try{
      const png=await svgPng(u.svg,2), wpx=1040, hpx=Math.round(wpx*u.H/u.W);
      wsU.addImage(wb.addImage({base64:png,extension:"png"}),{tl:{col:0,row:q},ext:{width:wpx,height:hpx}});
      const nr=Math.ceil(hpx/20)+1; for(let i=0;i<nr;i++) wsU.getRow(q+1+i).height=15; q+=nr+1;
      wsU.pageSetup.orientation=u.H/u.W>0.9?"portrait":"landscape"; wsU.pageSetup.fitToHeight=1; if(multi) wsU.pageSetup.paperSize=8;
    }catch(e){ span(wsU,q+1,1,LU,"No se pudo insertar el diagrama en este navegador. Descárguelo desde la plataforma (SVG o PNG).",{it:1,color:K.grey}); q+=3; }
    nota(wsU,q,LU,"Diagrama generado a partir de los resultados del cálculo. Incluye potencia instalada, máxima demanda, potencia a contratar, tensión, número de fases y capacidad de ruptura (RNE EM.010, Art. 8).");
    wsU.pageSetup.printArea=`A1:T${q}`; }

  /* ---------- METRADO ---------- */
  { const LT=8; setup(wsT,"portrait",[9,13,13,13,13,7,10,22]);
    let t=cabecera(wsT,LT,"METRADO DE INSTALACIONES ELÉCTRICAS","Hoja 4 de 5");
    t=thead(wsT,t,[[1,1,"Ítem"],[2,5,"Descripción"],[6,6,"Und."],[7,7,"Cantidad"],[8,8,"Observación"]]);
    const t0=t;
    metrado(r).forEach(x=>{
      if(x.sec){ cell(wsT,t,1,x.cod,{bold:1,color:K.navy,fill:K.soft,box:1,h:"center"}); span(wsT,t,2,LT,x.sec,{bold:1,size:9,color:K.navy,fill:K.soft,box:1,ind:1}); wsT.getRow(t).height=18; t++; return; }
      cell(wsT,t,1,x.cod,{...val,size:8.5}); span(wsT,t,2,5,x.desc,{box:1,ind:1,wrap:1,size:8.5}); cell(wsT,t,6,x.und,val); cell(wsT,t,7,x.cant,{...val,bold:1,fmt:"0"}); cell(wsT,t,8,x.obs,{box:1,size:7.5,color:K.grey,wrap:1});
      wsT.getRow(t).height=Math.max(16,Math.ceil(Math.max(x.desc.length/58,x.obs.length/26))*12); t++; });
    wsT.pageSetup.printTitlesRow=`${t0-1}:${t0-1}`;
    t=nota(wsT,t+1,LT,`Metrado referencial generado con JMG - ELECTRIC ${VERSION}. Protecciones, tableros, cajas y aparatos resultan del cálculo; las longitudes de conductores y tubos se estiman con la distancia a la salida más alejada más ${fmt(c.bajada,1)} m de bajada por salida y ${fmt(c.pDesp,0)} % de desperdicio. Verificar con los planos de distribución.`)+1;
    const firmaT=(c1,c2,tit,nombre,cip="")=>{ span(wsT,t,c1,c2,tit,{bold:1,size:8.5,color:K.navy,fill:K.lab,box:1,h:"center"});
      [["Nombre",nombre],["CIP N°",cip],["Firma y sello",""]].forEach(([l,v],i)=>{ const rw=t+1+i; cell(wsT,rw,c1,l,{size:8,color:K.grey,box:1,fill:K.lab}); span(wsT,rw,c1+1,c2,v,{box:1}); wsT.getRow(rw).height=i===2?42:18; }); };
    firmaT(1,4,"ELABORADO POR",c.proj.proy||"",c.proj.cip); firmaT(5,8,"REVISADO POR",""); }

  wb.calcProperties.fullCalcOnLoad=true;
  return await wb.xlsx.writeBuffer();
}

