/* ================= Acceso con cuenta (Firebase Authentication + Firestore) =================
   Cualquiera puede solicitar una cuenta (correo y contraseña, o Google); la solicitud queda «pendiente» en
   usuarios/{uid} y solo el administrador la aprueba desde la sección Administración. Las reglas de Firestore
   impiden que un usuario se apruebe a sí mismo. Mientras no haya acceso, la pantalla de ingreso cubre la plataforma. */
const FB_CONFIG={
  apiKey:"AIzaSyCMH5sUD_-NXUv3WYfPGVgS2rE07prOenM",
  authDomain:"jmg-electric-c3904.firebaseapp.com",
  projectId:"jmg-electric-c3904",
  storageBucket:"jmg-electric-c3904.firebasestorage.app",
  messagingSenderId:"603207915758",
  appId:"1:603207915758:web:7e3f53efd5a6041a81fbff"
};
const ADMIN_CORREO="jorgemiguel16621@gmail.com";
const USOS_CUENTA=["Estudiante de ingeniería","Ingeniero proyectista","Docente","Técnico electricista","Otro"];
let USUARIO=null, FICHA=null, esAdminCuenta=false, desFicha=null, desAdmin=null, SALUDADO=false, BIENVENIDO=false;

const ACC=$("acceso"), accVista=v=>{ ACC.querySelectorAll("[data-av]").forEach(x=>x.hidden=x.dataset.av!==v); const m=$("accMsg"); m.textContent=""; m.className="acc-msg"; };
const accMsg=(t,ok)=>{ const m=$("accMsg"); m.textContent=t; m.className="acc-msg "+(ok?"ok":"bad"); };
const accOcupado=b=>ACC.querySelectorAll("button").forEach(x=>x.disabled=b);
function accError(e){
  const c=(e&&e.code)||"", T={"auth/invalid-credential":"Correo o contraseña incorrectos.","auth/wrong-password":"Correo o contraseña incorrectos.","auth/user-not-found":"No existe una cuenta con ese correo.",
    "auth/invalid-email":"El correo no es válido.","auth/email-already-in-use":"Ya existe una cuenta con ese correo. Ingrese con él o recupere su contraseña.","auth/weak-password":"La contraseña debe tener al menos 6 caracteres.",
    "auth/too-many-requests":"Demasiados intentos. Espere unos minutos e intente de nuevo.","auth/network-request-failed":"Sin conexión a internet. Revise su conexión e intente de nuevo.",
    "auth/popup-closed-by-user":"Se cerró la ventana de Google antes de terminar.","auth/cancelled-popup-request":"Se cerró la ventana de Google antes de terminar.","auth/popup-blocked":"El navegador bloqueó la ventana de Google. Permita las ventanas emergentes para esta página.",
    "auth/unauthorized-domain":"Este sitio no está autorizado para ingresar. Avise al administrador.","permission-denied":"No tiene permiso para esta acción."};
  accMsg(T[c]||"No se pudo completar la acción"+(c?` (${c})`:"")+".");
}
let ENTRO=false;
function abrirPlataforma(v){ document.body.classList.toggle("sin-acceso",!v); ACC.hidden=!!v;
  if(v&&!ENTRO){ ENTRO=true; setTab("inicio"); } if(!v) ENTRO=false; }
function cuentaUI(){
  const u=USUARIO, nom=(FICHA&&FICHA.nombre)||(u&&u.displayName)||""; $("cuNombre").textContent=nom||"Mi cuenta"; $("cuCorreo").textContent=u?u.email:"";
  // Foto de la cuenta de Google; si no hay (correo y contraseña) o no carga, la inicial del nombre
  const av=$("cuAvatar"), ini=(nom||(u&&u.email)||"?").trim().charAt(0).toUpperCase();
  av.hidden=!u; av.textContent=ini; av.classList.remove("foto");
  if(u&&u.photoURL){ const im=new Image(); im.alt=""; im.referrerPolicy="no-referrer"; im.onload=()=>{ av.textContent=""; av.appendChild(im); av.classList.add("foto"); }; im.src=u.photoURL; }
  $("cuBtn").classList.toggle("con-av",!!u);
  document.querySelectorAll(".solo-admin").forEach(x=>x.hidden=!esAdminCuenta);
}

/* Estado de la cuenta: se escucha en vivo para que la aprobación abra la plataforma sin recargar */
function seguirFicha(u){
  if(desFicha){ desFicha(); desFicha=null; }
  desFicha=firebase.firestore().collection("usuarios").doc(u.uid).onSnapshot(s=>{
    FICHA=s.exists?s.data():null; cuentaUI();
    if(esAdminCuenta){ abrirPlataforma(true); return; }
    if(!FICHA){ $("solNombre").value=u.displayName||""; accVista("completar"); abrirPlataforma(false); return; }
    if(FICHA.estado==="aprobado"){ abrirPlataforma(true); if(!BIENVENIDO){ BIENVENIDO=true; setTimeout(()=>bienvenida(true),300); } return; }
    $("pendCorreo").textContent=u.email;
    accVista(FICHA.estado==="pendiente"?"pendiente":"denegado"); abrirPlataforma(false);
  },e=>{ accVista("ingreso"); accError(e); abrirPlataforma(false); });
}
function iniciarAcceso(){
  if(typeof firebase==="undefined"){ accVista("ingreso"); accMsg("No se pudo cargar el servicio de acceso. Revise su conexión a internet y recargue la página."); return; }
  firebase.initializeApp(FB_CONFIG); firebase.auth().languageCode="es";
  firebase.auth().onAuthStateChanged(u=>{
    USUARIO=u; esAdminCuenta=!!(u&&u.email===ADMIN_CORREO&&u.emailVerified); cuentaUI();
    if(!u){ if(desFicha){ desFicha(); desFicha=null; } if(desAdmin){ desAdmin(); desAdmin=null; } FICHA=null; accVista("ingreso"); abrirPlataforma(false); return; }
    seguirFicha(u); if(esAdminCuenta) adminLista();
  });
}

/* Formularios de la pantalla de ingreso */
ACC.addEventListener("click",async e=>{
  const b=e.target.closest("[data-aa]"); if(!b) return; const a=b.dataset.aa;
  if(a==="ver-registro"){ accVista("registro"); return; }
  if(a==="ver-ingreso"){ accVista("ingreso"); return; }
  if(a==="salir"){ firebase.auth().signOut(); return; }
  if(a==="google"){ accOcupado(true); try{ await firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider()); }catch(err){ accError(err); } accOcupado(false); return; }
  if(a==="olvido"){ const c=$("accCorreo").value.trim(); if(!c){ accMsg("Escriba su correo arriba y vuelva a pulsar «¿Olvidó su contraseña?»."); return; }
    try{ await firebase.auth().sendPasswordResetEmail(c); accMsg(`Le enviamos un correo a ${c} para cambiar su contraseña. Revise también la carpeta de spam.`,true); }catch(err){ accError(err); } return; }
});
$("accFormIngreso").addEventListener("submit",async e=>{ e.preventDefault(); accOcupado(true);
  try{ await firebase.auth().signInWithEmailAndPassword($("accCorreo").value.trim(),$("accClave").value); }catch(err){ accError(err); } accOcupado(false); });
const fichaNueva=(u,nombre,uso)=>firebase.firestore().collection("usuarios").doc(u.uid).set({nombre,correo:u.email,uso,estado:"pendiente",creado:firebase.firestore.FieldValue.serverTimestamp()});
$("accFormRegistro").addEventListener("submit",async e=>{ e.preventDefault();
  const nombre=$("regNombre").value.trim(), correo=$("regCorreo").value.trim(), c1=$("regClave").value, c2=$("regClave2").value, uso=$("regUso").value;
  if(nombre.length<3){ accMsg("Escriba su nombre completo."); return; }
  if(c1!==c2){ accMsg("Las contraseñas no coinciden."); return; }
  accOcupado(true);
  try{ const cr=await firebase.auth().createUserWithEmailAndPassword(correo,c1); await cr.user.updateProfile({displayName:nombre}); await fichaNueva(cr.user,nombre,uso); cr.user.sendEmailVerification().catch(()=>{}); }
  catch(err){ accError(err); } accOcupado(false); });
$("accFormCompletar").addEventListener("submit",async e=>{ e.preventDefault();
  const nombre=$("solNombre").value.trim(); if(nombre.length<3){ accMsg("Escriba su nombre completo."); return; }
  accOcupado(true); try{ await fichaNueva(USUARIO,nombre,$("solUso").value); }catch(err){ accError(err); } accOcupado(false); });
["regUso","solUso"].forEach(id=>$(id).innerHTML=USOS_CUENTA.map(t=>`<option>${t}</option>`).join(""));

/* Menú de la cuenta (barra superior) */
$("cuBtn").addEventListener("click",e=>{ e.stopPropagation(); $("cuMenu").hidden=!$("cuMenu").hidden; });
addEventListener("click",e=>{ if(!e.target.closest("#cuMenu")) $("cuMenu").hidden=true; });
$("cuMenu").addEventListener("click",e=>{ const b=e.target.closest("[data-cu]"); if(!b) return; $("cuMenu").hidden=true;
  if(b.dataset.cu==="salir"){ if(document.body.classList.contains("ws-on")) cerrarWS(true); firebase.auth().signOut(); } });

/* Administración: solicitudes de cuenta en vivo, con aprobar, rechazar, desactivar y reactivar */
const ESTADOS={pendiente:["Pendiente","pe"],aprobado:["Aprobado","ok"],rechazado:["Rechazado","bad"],desactivado:["Desactivado","bad"]};
function adminLista(){
  if(desAdmin) desAdmin();
  desAdmin=firebase.firestore().collection("usuarios").onSnapshot(q=>{
    const L=q.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.estado==="pendiente"?0:1)-(b.estado==="pendiente"?0:1)||((b.creado?.seconds||0)-(a.creado?.seconds||0)));
    const np=L.filter(x=>x.estado==="pendiente").length;
    if(!SALUDADO){ SALUDADO=true; saludoJorge(np); }
    document.querySelectorAll(".adm-badge").forEach(x=>{ x.textContent=np; x.hidden=!np; });
    const f=t=>t?new Date(t.seconds*1000).toLocaleDateString("es-PE",{day:"2-digit",month:"short",year:"numeric"}):"—";
    $("admLista").innerHTML=!L.length?`<p class="hint" style="padding:16px">Aún no hay solicitudes de cuenta.</p>`:
      `<table><thead><tr><th class="t">Nombre</th><th class="t">Correo</th><th class="t">Uso</th><th class="t">Solicitud</th><th class="t">Estado</th><th class="t">Acciones</th></tr></thead><tbody>${L.map(x=>{ const [et,ec]=ESTADOS[x.estado]||[x.estado,"pe"];
        const bt=(k,t,s="")=>`<button type="button" class="btn sm ${s}" data-adm="${k}" data-id="${x.id}">${t}</button>`;
        const acc=x.estado==="pendiente"?bt("aprobado","Aprobar")+bt("rechazado","Rechazar","sec"):x.estado==="aprobado"?bt("desactivado","Desactivar","sec"):bt("aprobado","Aprobar");
        return `<tr><td class="t"><strong>${esc(x.nombre||"—")}</strong></td><td class="t">${esc(x.correo||"")}</td><td class="t">${esc(x.uso||"")}</td><td class="t">${f(x.creado)}</td><td class="t"><span class="pill ${ec}">${et}</span></td><td class="t"><div class="acts-row">${acc}</div></td></tr>`; }).join("")}</tbody></table>`;
  },e=>{ $("admLista").innerHTML=`<p class="hint" style="padding:16px">No se pudo leer la lista (${esc(e.code||"")}).</p>`; });
}
$("admLista").addEventListener("click",async e=>{ const b=e.target.closest("[data-adm]"); if(!b) return; b.disabled=true;
  try{ await firebase.firestore().collection("usuarios").doc(b.dataset.id).update({estado:b.dataset.adm,revisado:firebase.firestore.FieldValue.serverTimestamp()}); }
  catch(err){ b.disabled=false; toast("No se pudo actualizar: "+(err.code||err.message)); } });

/* Bienvenida personal del administrador: aparece cada vez que entra, con un saludo según la hora,
   las solicitudes y los proyectos pendientes, y de vez en cuando una frase de ánimo */
function saludoJorge(np){
  const h=new Date().getHours(), azar=a=>a[Math.floor(Math.random()*a.length)];
  const [tit,txt]=h<5?["¡Jorge! 😅🦉","Ya es tarde… guarda tu avance y a dormir 😴💤 Mañana seguimos con todo 🌟"]
    :h<12?["¡Buenos días, Jorge! ☀️😄","Un cafecito ☕ y a calcular, que hoy sale algo bueno 🤩✨"]
    :h<19?["¡Buenas tardes, Jorge! 😎💪","Vamos con todo 🔥, que el proyecto no se calcula solo 😉⚡"]
    :["¡Buenas noches, Jorge! 🌙😊","No te desveles mucho, ¿eh? 🥱 Descansar también es parte del trabajo 💛"];
  let pp=0; try{ pp=Object.values(libLoad()).filter(o=>o&&o.res&&o.res.pend>0).length; }catch(_){}
  const avisos=[];
  if(np) avisos.push(`Por cierto, <b>${np} persona${np===1?"":"s"}</b> quiere${np===1?"":"n"} unirse a JMG-ELECTRIC 👀🎉 <button type="button" class="linkbtn" data-sj="admin">Revisar</button>`);
  if(pp) avisos.push(`Tienes <b>${pp} proyecto${pp===1?"":"s"}</b> con datos por completar 📝✍️ <button type="button" class="linkbtn" data-sj="proy">Ver</button>`);
  if(!avisos.length) avisos.push("Todo al día ✅😌 Tu plataforma te espera 🏗️⚡");
  const extra=Math.random()<0.7?azar(["Recuerda: cada cálculo bien hecho es una instalación segura 🔌🛡️😊","Paso a paso, JMG-ELECTRIC sigue creciendo 📈 ¡Estoy orgulloso de lo que estás logrando! 🚀🥳",
    "Hoy es un buen día para aprender una regla nueva del CNE 📘🤓","«El desarrollo progresivo del hombre depende vitalmente de la invención.» — Nikola Tesla ⚡🧠","Tú puedes con esto y con mucho más 💪😄🌟","¡A darle, ingeniero en camino! 👷‍♂️⚡🎓"]):"";
  const c=document.createElement("div"); c.className="saludo"; c.setAttribute("role","status");
  c.innerHTML=`<button type="button" class="saludo-x" data-sj="x" aria-label="Cerrar">×</button><b class="saludo-t">${tit}</b><p>Qué bueno verte de vuelta 🤗 ¿Qué construimos hoy? 🛠️ ${txt}</p>${avisos.map(a=>`<p class="saludo-a">${a}</p>`).join("")}${extra?`<p class="saludo-e">${extra}</p>`:""}<button type="button" class="btn saludo-ok" data-sj="x">¡Vamos! 💪😄</button>`;
  document.body.appendChild(c); requestAnimationFrame(()=>c.classList.add("on"));
  const cerrar=()=>{ c.classList.remove("on"); setTimeout(()=>c.remove(),300); };
  let t=setTimeout(cerrar,20000); c.addEventListener("mouseenter",()=>clearTimeout(t)); c.addEventListener("mouseleave",()=>{ t=setTimeout(cerrar,8000); });
  c.addEventListener("click",e=>{ const b=e.target.closest("[data-sj]"); if(!b) return; if(b.dataset.sj!=="x") setTab(b.dataset.sj); cerrar(); });
}

iniciarAcceso();

