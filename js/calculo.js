/* ================= Motor de cálculo ================= */
function ctx(){
  const aisl=$("aisl").value, temp=+$("temp").value, nag=+$("nag").value, met=$("met").value, ft=FT[aisl][temp]??1, fa=FA[nag]??1;
  return {aisl,temp,nag,met,ft,fa,fc:ft*fa,fp:num("fp")||0.9,maxSal:Math.max(1,Math.min(12,Math.round(num("maxSal")||12))),pAl:num("pAl"),pTo:num("pTo"),
    reserva:+$("reserva").value, resAl:+$("resAl").value, fdA:1+(+$("resAl").value)/100, sminD:parseFloat($("sminD").value), sminA:parseFloat($("sminA").value), idMode:$("idMode").value, dvGen:parseFloat($("dvGen").value), iccE:num("iccE")||10,
    proj:{nombre:$("p_nombre").value,prop:$("p_prop").value,ubic:$("p_ubic").value,proy:$("p_proy").value,cip:$("p_cip").value.replace(/[<>]/g,"").trim()},
    pat:{rho:num("rho_s")||100,fr:num("fr")||1,Lv:num("Lv")||2.4,dv:parseFloat($("dv").value)},
    rho:$("rhoMode").value==="20"?RHO_CU:(aisl==="pvc"?0.0209:0.0223),
    rhoRef:$("rhoMode").value==="20"?"Cobre a 20 °C":(aisl==="pvc"?"Cobre a 70 °C · ρ20 (1 + 0,00393·50)":"Cobre a 90 °C · ρ20 (1 + 0,00393·70)"),
    desig:$("desig").value.replace(/[<>]/g,"").trim(), pDesp:Math.max(0,num("pDesp")), bajada:Math.max(0,num("bajada"))};
}
const tierraPara=itm=>(T16.find(([a])=>itm<=a)||[0,25])[1];
const tierraElectrodo=amp=>T17.find(([a])=>amp<=a)[1];
const pdcPara=kA=>PDC.find(x=>x>=kA)??null;
function tuboPara(S,St,ncond){
  const a=(ncond*OD[S]**2+OD[St]**2)*Math.PI/4;
  for(const [mm,pul,di] of TUBOS) if(a<=0.40*Math.PI*di*di/4) return {mm,pul};
  return {mm:null,pul:"> 3\""};
}
function dimensionar({I,K,L,V,cargados,c,fc,dvMax,Smin,Imin=0,fd=FD}){
  const Id=Math.max(I*fd,Imin), itm=ITM.find(x=>x>=Id-1e-9)??null;
  const key=c.aisl+(cargados===3?"3":"2"), tabla=T2[c.met][key], col=(c.aisl==="pvc"?0:2)+(cargados===3?1:0);
  for(let k=0;k<SECC.length;k++){
    const S=SECC[k]; if(S<Smin) continue;
    const Iz=tabla[k], Izc=Iz*fc, dV=K*c.rho*L*I/S, dVp=dV/V*100;
    if(itm!==null&&Izc>=itm&&dVp<=dvMax+1e-9) return {Id,fd,itm,col,S,Iz,Izc,dV,dVp,Imin};
  }
  const k=SECC.length-1, S=SECC[k], dV=K*c.rho*L*I/S;
  return {Id,fd,itm,col,S,Iz:tabla[k],Izc:tabla[k]*fc,dV,dVp:dV/V*100,Imin,fail:true};
}
function alimentador(desc,P,sk,L,dvUp,dvSel,c,extra={}){
  const s=SIST[sk], I=P/(s.kI*s.V*c.fp);
  const r=dimensionar({I,K:s.K,L,V:s.V,cargados:s.tri?3:2,c,fc:c.ft,dvMax:dvSel,Smin:c.sminA,Imin:extra.Imin||0,fd:extra.fd??FD});
  Object.assign(r,{desc,P,sk,s,I,L,dvUp,dvAc:dvUp+r.dVp},extra);
  r.St=tierraPara(r.itm||400); r.tubo=tuboPara(r.S,r.St,s.n);
  r.ok=!r.fail&&r.itm!==null&&r.Izc>=r.itm&&r.dvAc<=DV_ALIM+1e-9;
  return r;
}
function circuito({tab,id,desc,tipo,n,P,L,fases,skTri},c,dvUp,feeder){
  const s=fases===3&&skTri&&SIST[skTri].tri?SIST[skTri]:SIST.mono220, f3=s.tri;
  const I=P/(s.kI*s.V*c.fp);
  const r=dimensionar({I,K:s.K,L,V:s.V,cargados:f3?3:2,c,fc:c.fc,dvMax:Math.min(DV_DER,DV_TOT-dvUp),Smin:c.sminD});
  const motor=/^motor/i.test(tipo||"");
  Object.assign(r,{tab,id,desc,tipo,n,P,L,s,I,dvUp,dVt:dvUp+r.dVp,feeder,f3,fase:f3?"3φ":"—",motor,curva:motor?"D":"C",key:`${tab}·${id}`});
  r.St=tierraPara(r.itm||400); r.tubo=tuboPara(r.S,r.St,f3?3:2);
  r.ok=!r.fail&&r.itm!==null&&r.Izc>=r.itm&&r.dVp<=DV_DER+1e-9&&r.dVt<=DV_TOT+1e-9;
  return r;
}
function asignarID(cs,c){
  if(c.idMode==="circuito"){ cs.forEach(q=>{ q.idName="ID"; q.idRat=ID_RAT.find(x=>x>=(q.itm||0))??100; }); return; }
  let g=0; for(let i=0;i<cs.length;i+=3){ const grp=cs.slice(i,i+3); g++;
    const need=Math.max(...grp.map(q=>q.itm||0),grp.reduce((s,q)=>s+q.I,0)), rat=ID_RAT.find(x=>x>=need)??100;
    grp.forEach(q=>{ q.idName="ID-"+g; q.idRat=rat; }); }
}
// 050-200(1)(a) y 050-202(1)(a)
function mdVivienda({area,coc,cal,aire,otras},multi){
  const basica=multi?1500+(area>45?1000:0)+1000*Math.max(0,Math.ceil((area-90)/90)):2500+1000*Math.max(0,Math.ceil((area-90)/90));
  const mdCoc=coc>0?6000+0.4*Math.max(0,coc-12000):0;
  const mdOtras=coc>0?0.25*otras:Math.min(otras,6000)+0.25*Math.max(0,otras-6000);
  const sinAire=basica+mdCoc+cal+mdOtras;
  return {basica,coc,mdCoc,cal,aire,otras,mdOtras,sinAire,MD:sinAire+aire};
}
function grupos(list,c,tab,dvUp,feeder){
  const out=[]; let k=0;
  list.forEach(g=>{ if(g.n<=0) return; const nc=Math.ceil(g.n/c.maxSal); let rest=g.n;
    for(let i=0;i<nc;i++){ const n=Math.ceil(rest/(nc-i)); rest-=n;
      const q=circuito({tab,id:"C-"+(++k),desc:g.desc+(nc>1?` ${i+1}`:""),tipo:g.tipo,n,P:n*g.p,L:g.L,fases:1},c,dvUp,feeder); q.src=g.src||null; out.push(q); } });
  return out;
}
// Factor de agrupamiento de varillas en paralelo (separación ≥ longitud de varilla), con interpolación lineal
const FAGR=[[1,1],[2,1.16],[3,1.29],[4,1.36],[8,1.68],[12,1.8],[16,1.92],[20,2],[24,2.16]];
function fAgr(n){ if(n<=1) return 1; for(let i=1;i<FAGR.length;i++){ if(n<=FAGR[i][0]){ const [n0,f0]=FAGR[i-1],[n1,f1]=FAGR[i]; return f0+(f1-f0)*(n-n0)/(n1-n0); } } return FAGR[FAGR.length-1][1]; }
function pozo(p){
  const a=p.dv/2, Rv=p.rho/(2*Math.PI*p.Lv)*(Math.log(4*p.Lv/a)-1), Rt=Rv*p.fr;
  let nVar=1; while(Rt*fAgr(nVar)/nVar>25&&nVar<60) nVar++;
  const F=fAgr(nVar), Rn=Rt*F/nVar;
  return {...p,Rv,Rt,ok:Rt<=25,nVar,F,Rn,okL:p.Lv>=2,okD:p.dv*1000>=13};
}
// Cortocircuito aguas abajo de un conductor (estimación conservadora: impedancia de la fuente inductiva + resistencia del cable)
function iccAbajo(iccUp,s,L,S){ const k=s.tri?SQ3:1, Zup=s.V/(k*iccUp*1000), Rc=(s.tri?1:2)*RHO_CU*L/S; return s.V/(k*Math.hypot(Zup,Rc))/1000; }
// Reparto óptimo de cargas monofásicas entre tres fases (búsqueda exhaustiva o mejora local)
function optimo(P,base){
  const n=P.length, idx=P.map((_,i)=>i).sort((a,b)=>P[b]-P[a]), ph=base.slice(), asg=new Array(n).fill(0);
  const sc=v=>{ const mx=Math.max(...v); return mx+(mx-Math.min(...v))*1e-6; };
  let best=null;
  if(n<=10){
    let bestS=Infinity;
    const rec=d=>{
      if(Math.max(...ph)>=bestS) return;
      if(d===n){ const v=sc(ph); if(v<bestS){ bestS=v; best=asg.slice(); } return; }
      const i=idx[d], seen=[];
      for(let k=0;k<3;k++){ if(seen.includes(ph[k])) continue; seen.push(ph[k]); ph[k]+=P[i]; asg[i]=k; rec(d+1); ph[k]-=P[i]; }
    };
    rec(0);
  } else {
    idx.forEach(i=>{ const k=ph.indexOf(Math.min(...ph)); ph[k]+=P[i]; asg[i]=k; });
    let mejora=true, it=0;
    while(mejora&&it++<400){ mejora=false; const s0=sc(ph);
      for(let i=0;i<n&&!mejora;i++) for(let k=0;k<3&&!mejora;k++){ const a=asg[i]; if(k===a) continue; ph[a]-=P[i]; ph[k]+=P[i]; if(sc(ph)<s0-1e-9){ asg[i]=k; mejora=true; } else { ph[k]-=P[i]; ph[a]+=P[i]; } }
      for(let i=0;i<n&&!mejora;i++) for(let j=i+1;j<n&&!mejora;j++){ const a=asg[i], b=asg[j]; if(a===b) continue; const d=P[j]-P[i]; ph[a]+=d; ph[b]-=d; if(sc(ph)<s0-1e-9){ asg[i]=b; asg[j]=a; mejora=true; } else { ph[a]-=d; ph[b]+=d; } }
    }
    best=asg.slice();
  }
  best=best||[]; const out=base.slice(); best.forEach((k,i)=>out[k]+=P[i]);
  return {asg:best,ph:out};
}
const desbal=ph=>{ const avg=(ph[0]+ph[1]+ph[2])/3; return avg>0?(Math.max(...ph)-avg)/avg*100:0; };
function balancear(items,sk,fix){
  const s=SIST[sk]; if(!s.tri) return null;
  const nm=s.fases, tri3=items.filter(i=>i.f3), mono=items.filter(i=>!i.f3), base=[0,0,0];
  tri3.forEach(i=>{ for(let k=0;k<3;k++) base[k]+=i.P/3; i.fase="3φ"; i.fijo=false; });
  const b=base.slice(), libre=[]; let nFix=0;
  mono.forEach(i=>{ const k=nm.indexOf(fix?fix[i.key]:undefined); i.fijo=k>=0; if(k>=0){ b[k]+=i.P; i.fase=nm[k]; nFix++; } else libre.push(i); });
  const o=optimo(libre.map(i=>i.P),b); libre.forEach((i,j)=>{ i.fase=nm[o.asg[j]]; });
  const ref=nFix?optimo(mono.map(i=>i.P),base).ph:o.ph, ph=o.ph;
  return {nm,ph,avg:(ph[0]+ph[1]+ph[2])/3,desb:desbal(ph),desbMin:desbal(ref),nFix,items,mayor:mono.slice().sort((a,b)=>b.P-a.P)[0]||null};
}

// Pisos de la vivienda: el 1er piso con los datos de Vivienda y Salidas, los siguientes desde la lista «pisos»
function pisosUni(){
  const sal=(n,L)=>({n,L:L||1});
  return [{n:1,area:num("area"),Ld:num("Ltd1")||1,al:sal(num("al_n"),num("al_L")),tg:sal(num("tg_n"),num("tg_L")),tc:sal(num("tc_n"),num("tc_L"))},
    ...pisos.map((p,i)=>({n:i+2,i,area:p.area||0,Ld:p.Ld||1,al:sal(p.al_n||0,p.al_L),tg:sal(p.tg_n||0,p.tg_L),tc:sal(p.tc_n||0,p.tc_L)}))];
}
function calcUni(c){
  const PS=pisosUni(), varios=PS.length>1, esq=varios?$("esqPisos").value:"tg";
  const areaT=PS.reduce((s,p)=>s+p.area,0), sot=num("sot"), area=areaT+0.75*sot, sk=radio("sist")||"mono220", Lalim=num("Lalim")||1;
  const cs=cargas.map(x=>({...x}));
  const cargasMD=list=>{ const sum=t=>list.filter(x=>x.tipo===t).reduce((s,x)=>s+x.p,0);
    return {coc:sum("cocina"),cal:sum("calentador"),aire:sum("aire"),otras:list.filter(x=>(x.tipo==="otra"||x.tipo==="motor")&&x.p>1500).reduce((s,x)=>s+x.p,0)}; };
  const md=mdVivienda({area,...cargasMD(cs)},false);
  const pw={al:num("al_p"),tg:num("tg_p"),tc:num("tc_p")};
  const CI=PS.reduce((s,p)=>s+(p.al.n*pw.al+p.tg.n*pw.tg+p.tc.n*pw.tc),0)+cs.reduce((s,x)=>s+x.p,0);
  const al=alimentador("Alimentador medidor → tablero general TG",md.MD,sk,Lalim,0,DV_ALIM,c,{pKey:"MD",Imin:IMIN_UNI,fd:c.fdA,viv:true});
  al.iccO=c.iccE; al.pdc=pdcPara(c.iccE);
  const iccTG=iccAbajo(c.iccE,al.s,al.L,al.S);
  // Tablero de cada piso: TG si el piso se conecta al tablero general, TD-n si tiene tablero propio
  const tabDe=n=>!varios||(n===1&&esq==="tg")?"TG":tabPiso(n);
  const pisoCarga=x=>{ const k=Math.round(+x.piso||0); return varios&&k>=1&&k<=PS.length?k:0; };
  const tabCarga=x=>{ const k=pisoCarga(x); return k?tabDe(k):"TG"; };
  const alims=[al], tabs=[{tab:"TG",desc:"Tablero general de la vivienda",feeder:0,icc:iccTG,pdc:pdcPara(iccTG)}];
  // Alimentadores TG → TD de cada piso: máxima demanda por la Regla 050-200 con el área del piso (el sótano, al 75 %, en el 1er piso)
  PS.forEach(p=>{ const tab=tabDe(p.n); if(tab==="TG") return;
    const aP=p.area+(p.n===1?0.75*sot:0), mdP=mdVivienda({area:aP,...cargasMD(cs.filter(x=>tabCarga(x)===tab))},false);
    const f=alimentador(`Alimentador TG → ${tab} (${ORD(p.n)} piso)`,mdP.MD,sk,p.Ld,al.dVp,DV_ALIM-al.dVp,c,{pKey:"piso",piso:p.n,mdP,areaP:aP,fd:c.fdA,viv:true});
    f.iccO=iccTG; f.pdc=pdcPara(iccTG); alims.push(f); p.tab=tab; p.feeder=alims.length-1; p.md=mdP; p.areaC=aP;
    const icc=iccAbajo(iccTG,f.s,f.L,f.S); tabs.push({tab,desc:`Tablero de distribución del ${ORD(p.n)} piso`,feeder:p.feeder,icc,pdc:pdcPara(icc),piso:p.n}); });
  const circ=[];
  tabs.forEach(tb=>{ const f=alims[tb.feeder], up=tb.feeder?f.dvAc:al.dVp;
    const PT=PS.filter(p=>tabDe(p.n)===tb.tab);
    const src=(p,k)=>p.n===1?{t:"grp",k}:{t:"piso",i:p.i,k};
    const list=grupos(PT.flatMap(p=>[{...p.al,p:pw.al,desc:"Alumbrado",tipo:"Alumbrado",src:src(p,"al")},{...p.tg,p:pw.tg,desc:"Tomacorrientes",tipo:"Tomacorriente",src:src(p,"tg")},{...p.tc,p:pw.tc,desc:"Tomacorrientes cocina / lavandería",tipo:"Tomacorriente",src:src(p,"tc")}]),c,tb.tab,up,tb.feeder);
    cs.forEach((x,ix)=>{ if(!(x.p>0)||tabCarga(x)!==tb.tab) return; const q=circuito({tab:tb.tab,id:"C-"+(list.length+1),desc:x.nombre||"Carga especial",tipo:TIPOS[x.tipo].split(" (")[0],n:1,P:x.p,L:x.L||1,fases:x.fases,skTri:sk},c,up,tb.feeder); q.src={t:"cargas",i:ix}; list.push(q); });
    asignarID(list,c); circ.push(...list); });
  const bal=balancear(circ,sk,FIX.uni);
  return {mode:"uni",iccTG,c,sk,area,areaT,sot,cs,md,CI,alims,circ,tabs,bal,pat:pozo(c.pat),PS,varios,esq,
    contratada:Math.ceil(md.MD/500)/2, conexion:"Conexión simple (Norma DGE, 301.A)", Selec:tierraElectrodo(al.Izc)};
}
function calcMulti(c){
  const sk=radio("sistG")||"tri380", Lgen=num("Lgen")||1, Lms=num("Lms")||1;
  const T=tipos.map((t,i)=>({...t,_i:i})).filter(t=>t.cant>0).map(t=>({...t,cant:Math.round(t.cant),md:mdVivienda(t,true)})).sort((a,b)=>b.md.sinAire-a.md.sinAire);
  const units=[]; T.forEach((t,ti)=>{for(let k=0;k<t.cant;k++) units.push({ti,nombre:t.nombre,md:t.md.sinAire,P:t.md.MD,f3:false,ref:`${t.nombre} · Nº ${k+1}`});});
  const fac=i=>i<1?1:i<3?0.65:i<5?0.40:i<20?0.30:0.25;
  units.forEach((u,i)=>{u.ord=i+1; u.f=fac(i); u.dem=u.md*u.f;});
  let pos=1; T.forEach((t,ti)=>{t.desde=pos; t.hasta=pos+t.cant-1; pos+=t.cant; t.dem=units.filter(u=>u.ti===ti).reduce((s,u)=>s+u.dem,0);});
  const tramosDef=[["Unidad de mayor carga",1,1],["Siguientes 2 unidades",2,0.65],["Siguientes 2 unidades",2,0.40],["Siguientes 15 unidades",15,0.30],["Unidades restantes",1e9,0.25]];
  const tramos=[]; let i0=0; for(const [lab,n,f] of tramosDef){ const sl=units.slice(i0,i0+n); if(!sl.length) break; tramos.push({lab,n:sl.length,f,sum:sl.reduce((s,u)=>s+u.md,0),dem:sl.reduce((s,u)=>s+u.dem,0)}); i0+=sl.length; }
  const mdDeptos=units.reduce((s,u)=>s+u.dem,0), aireTot=T.reduce((s,t)=>s+t.aire*t.cant,0);
  const SV=serv.map((s,i)=>({...s,_i:i})).filter(s=>s.p>0);
  const Pserv=SV.reduce((s,x)=>s+x.p,0), maxMot=Math.max(0,...SV.filter(x=>x.tipo==="motor").map(x=>x.p)), mdServ=0.75*Pserv;
  const MD=mdDeptos+aireTot+mdServ;
  const gen=alimentador("Alimentador general: acometida → tablero general TG",MD,sk,Lgen,0,c.dvGen,c,{pKey:"MD",fd:c.fdA,viv:true});
  gen.iccO=c.iccE; gen.pdc=pdcPara(c.iccE);
  const iccTG=iccAbajo(c.iccE,gen.s,gen.L,gen.S);
  const alims=[gen], tabs=[];
  if(SV.length){ const f=alimentador("Alimentador TG → tablero de servicios generales TSG",Pserv+0.25*maxMot,sk,Lms,gen.dVp,DV_ALIM-gen.dVp,c,{pKey:"servP"});
    f.iccO=iccTG; f.pdc=pdcPara(iccTG); alims.push(f); const icc=iccAbajo(iccTG,f.s,f.L,f.S); tabs.push({tab:"TSG",desc:"Tablero de servicios generales",feeder:1,icc,pdc:pdcPara(icc)}); }
  T.forEach((t,ti)=>{ const tab="TD-"+t.nombre.replace(/^Tipo\s*/i,""); t.tab=tab;
    const f=alimentador(`Alimentador medidor → ${tab} (${t.nombre})`,t.md.MD,"mono220",t.Ld||1,gen.dVp,DV_ALIM-gen.dVp,c,{pKey:"tipo",ti,cant:t.cant,Imin:IMIN_DPTO,fd:c.fdA,viv:true});
    f.iccO=iccTG; f.pdc=pdcPara(iccTG); alims.push(f); const icc=iccAbajo(iccTG,f.s,f.L,f.S);
    tabs.push({tab,desc:`Tablero de departamento ${t.nombre} · ${t.cant} unidad(es)`,feeder:alims.length-1,icc,pdc:pdcPara(icc)}); });
  const circ=[];
  if(SV.length){ const f=alims[1]; const l=SV.map((x,i)=>{ const q=circuito({tab:"TSG",id:"S-"+(i+1),desc:x.nombre||"Carga común",tipo:TSERV[x.tipo],n:1,P:x.p,L:x.L||1,fases:x.fases,skTri:sk},c,f.dvAc,1); q.src={t:"serv",i:x._i}; return q; }); asignarID(l,c); circ.push(...l); }
  T.forEach((t,ti)=>{
    const fi=alims.findIndex(a=>a.pKey==="tipo"&&a.ti===ti), up=alims[fi].dvAc;
    const list=grupos([{n:t.nAl,p:c.pAl,L:t.Lc||1,desc:"Alumbrado",tipo:"Alumbrado"},{n:t.nTo,p:c.pTo,L:t.Lc||1,desc:"Tomacorrientes",tipo:"Tomacorriente"}],c,t.tab,up,fi);
    [["Cocina eléctrica",t.coc,"Cocina eléctrica"],["Calentador de agua / ducha",t.cal,"Calentador de agua / ducha"],["Aire acondicionado",t.aire,"Aire acondicionado"],["Otras cargas > 1500 W",t.otras,"Otra carga"]]
      .forEach(([d,p,tp])=>{ if(p>0) list.push(circuito({tab:t.tab,id:"C-"+(list.length+1),desc:d,tipo:tp,n:1,P:p,L:t.Lc||1,fases:1},c,up,fi)); });
    list.forEach(q=>{ q.src={t:"tipo",i:t._i}; }); asignarID(list,c); circ.push(...list);
  });
  circ.filter(q=>q.tab==="TSG").forEach(q=>{ q.ref=`${q.id} · ${q.desc}`; });
  const balItems=[...units.map(u=>({...u,key:u.ref})),...circ.filter(q=>q.tab==="TSG")];
  const bal=balancear(balItems,sk,FIX.multi);
  const emerg=SV.some(s=>/emergencia/i.test(s.nombre));
  const CI=T.reduce((s,t)=>s+t.cant*(t.nAl*c.pAl+t.nTo*c.pTo+t.coc+t.cal+t.aire+t.otras),0)+Pserv;
  return {mode:"multi",iccTG,c,sk,T,units,tramos,mdDeptos,aireTot,SV,Pserv,mdServ,maxMot,MD,CI,alims,circ,tabs,bal,emerg,pat:pozo(c.pat),
    contratada:Math.ceil(MD/500)/2, conexion:"Conexión en derivación con banco de medidores (Norma DGE, 301.C)", Selec:tierraElectrodo(gen.Izc)};
}
function alertas(r){
  const A=[], maxDV=Math.max(...r.alims.map(a=>a.dvAc),...r.circ.map(q=>q.dVt));
  A.push([r.alims.every(a=>a.ok)&&r.circ.every(q=>q.ok),"050-102 · 050-104",r.alims.every(a=>a.ok)&&r.circ.every(q=>q.ok)?`Alimentadores y circuitos conformes. Caída de tensión máxima total ${fmt(maxDV,2)} %.`:"Existen alimentadores o circuitos que no cumplen ampacidad o caída de tensión: revise longitudes o secciones."]);
  A.push([r.pat.ok,"060-712",r.pat.ok?`Resistencia de puesta a tierra estimada ${fmt(r.pat.Rt,1)} Ω ≤ 25 Ω.`:`Resistencia estimada ${fmt(r.pat.Rt,1)} Ω > 25 Ω: se requieren ${r.pat.nVar} electrodos separados al menos 2 m (≈ ${fmt(r.pat.Rn,1)} Ω).`]);
  if(!r.pat.okL||!r.pat.okD) A.push([false,"060-702",`La varilla debe tener al menos 2 m de longitud y 13 mm de diámetro (cobre) o 16 mm (acero-cobre).`]);
  if(r.bal){ const b=r.bal; A.push([b.desb<=10?true:"warn","Balance de fases",b.desb<=10?`Desbalance de cargas ${fmt(b.desb,1)} % (≤ 10 %, criterio de diseño).`:b.desb<=b.desbMin+0.05?`Desbalance de cargas ${fmt(b.desb,1)} %: es el mínimo alcanzable con estas cargas (criterio de diseño ≤ 10 %). ${sugerencia(r)}`:`Desbalance de cargas ${fmt(b.desb,1)} % con el reparto manual; el reparto automático lograría ${fmt(b.desbMin,1)} %.`]); }
  else if(r.mode==="uni"&&r.md.MD>8000) A.push([true,"050-106(9)",`Máxima demanda de ${fmt(r.md.MD/1000,2)} kW en suministro monofásico: evalúe un suministro trifásico 380/220 V con la concesionaria.`]);
  if(r.mode==="multi") A.push([r.emerg,"EM.010 · Art. 11.1",r.emerg?"Incluye iluminación de emergencia en rutas de evacuación.":"Los edificios multifamiliares deben contar con iluminación de emergencia en rutas de evacuación: agréguela en servicios generales."]);
  A.push([true,"050-108(2)",`Se prevén ${r.c.reserva} espacio(s) de reserva por tablero para ampliaciones.`]);
  return A;
}

