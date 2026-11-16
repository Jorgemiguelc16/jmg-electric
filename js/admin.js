/* ADMINISTRACIÓN (solo el administrador)
   · PIN propio (4 a 8 dígitos) para abrir esta página: se guarda cifrado (SHA-256 con sal) en config/admin, que solo
     el administrador lee; tras 15 minutos sin usar la página se vuelve a pedir. Protege la página de quien use la
     computadora con la sesión abierta; la seguridad de fondo es la cuenta de Gmail y las reglas de Firestore.
   · La lista de cuentas como una hoja: buscar, filtrar, ordenar por columna y editar en la misma celda (nombre, uso,
     notas, vigencia), con exportación a Excel.
   · Vigencia: indefinida, 1, 3 o 6 meses o 1 año (mínimo un mes); al vencer, la cuenta no entra (pantalla «Su acceso
     venció») y las reglas le cierran sus proyectos en la nube. Renovar extiende desde la fecha de vencimiento (o
     desde hoy, si ya venció).
   · Nueva cuenta: el administrador escribe el correo y la contraseña inicial; la cuenta se crea con una segunda
     instancia de Firebase (así no se cierra la sesión del administrador) y queda aprobada al instante. */
const ADM = {
  L: [],
  q: "",
  f: "todos",
  ord: "estado",
  dir: 1,
  modo: "",
  abierto: false,
  ultAct: 0,
  pin: undefined,
  sal: null,
  intentos: 0,
  bloqHasta: 0
};
const ADM_INACT = 15 * 60000,
  ADM_DIA = 86400000;
const VIGENCIAS = [
  ["", "Indefinida"],
  ["1m", "1 mes"],
  ["3m", "3 meses"],
  ["6m", "6 meses"],
  ["1a", "1 año"]
];
const ADM_ESTADOS = {
  pendiente: ["Pendiente", "warn"],
  aprobado: ["Aprobado", "ok"],
  vencido: ["Vencido", "bad"],
  rechazado: ["Rechazado", "bad"],
  desactivado: ["Desactivado", "bad"],
  admin: ["Administrador", "ok"]
};
const admDb = () => firebase.firestore();
const admMs = t => (!t ? null : typeof t.toMillis === "function" ? t.toMillis() : t.seconds ? t.seconds * 1000 : +t);
const admFecha = ms =>
  ms ? new Date(ms).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const admHora = ms => (ms ? new Date(ms).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) : "");
const admYo = x => x.correo === ADMIN_CORREO || (USUARIO && x.id === USUARIO.uid);
// Fecha de vencimiento: desde la fecha dada, más el plazo de la vigencia
function admVence(desde, v) {
  const d = new Date(desde);
  if (v === "1a") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + ({ "1m": 1, "3m": 3, "6m": 6 }[v] || 0));
  return d;
}
// Estado que se muestra: el administrador; aprobado pero vencido, «vencido»
const admEstado = x =>
  admYo(x) ? "admin" : x.estado === "aprobado" && admMs(x.vence) && admMs(x.vence) < Date.now() ? "vencido" : x.estado;
// Días que faltan para el vencimiento (negativos: ya venció)
const admDias = x => (admMs(x.vence) ? Math.ceil((admMs(x.vence) - Date.now()) / ADM_DIA) : null);
const admPorVencer = x => admEstado(x) === "aprobado" && admDias(x) != null && admDias(x) <= 7;

/* ---------- PIN ---------- */
async function admHash(pin, sal) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sal + ":" + pin));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
async function admLeerPin() {
  if (ADM.pin !== undefined) return;
  const d = await admDb().collection("config").doc("admin").get(),
    v = d.exists ? d.data() : {};
  ADM.pin = v.pin || null;
  ADM.sal = v.sal || null;
}
const admAbierto = () => ADM.abierto && Date.now() - ADM.ultAct < ADM_INACT;
// Al entrar a la página Administración (setTab)
async function admAbrir() {
  if (!esAdminCuenta) return;
  if (ADM.pin === undefined) admPantalla("cargando");
  try {
    await admLeerPin();
  } catch (e) {
    return admPantalla("error", e);
  }
  if (!ADM.pin) return admPantalla("crear");
  if (!admAbierto()) {
    ADM.abierto = false;
    return admPantalla("pin");
  }
  admPantalla("tabla");
}
function admBloquear() {
  ADM.abierto = false;
  if (!$("tab-admin").hidden) admPantalla("pin");
}
// Actividad en la página: mantiene abierta la sesión de Administración; sin actividad, se bloquea
["click", "keydown", "input"].forEach(t =>
  $("tab-admin").addEventListener(t, () => {
    if (ADM.abierto) ADM.ultAct = Date.now();
  })
);
setInterval(() => {
  if (ADM.abierto && !admAbierto()) admBloquear();
}, 30000);

/* ---------- Pantallas de la página ---------- */
const admCampoPin = (id, ph) =>
  `<label>${ph}<input type="password" id="${id}" inputmode="numeric" autocomplete="off" maxlength="8" pattern="[0-9]*"></label>`;
function admPantalla(modo, extra) {
  ADM.modo = modo;
  const C = $("admCuerpo"),
    caja = (tit, txt, cuerpo) =>
      `<div class="adm-pin card"><div class="adm-pin-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></div><h3>${tit}</h3><p class="hint">${txt}</p><p class="acc-msg bad" id="admMsg"></p>${cuerpo}</div>`;
  $("admBarra").hidden = modo !== "tabla";
  if (modo === "cargando") C.innerHTML = `<p class="hint" style="padding:16px">Cargando…</p>`;
  else if (modo === "error")
    C.innerHTML = caja(
      "No se pudo abrir la administración",
      extra && extra.code === "permission-denied"
        ? "Firebase no da permiso para leer la configuración del administrador: falta pegar las reglas nuevas de Firestore (consola de Firebase › Firestore › Reglas)."
        : "Revise su conexión a internet y vuelva a intentarlo." + (extra && extra.code ? ` (${esc(extra.code)})` : ""),
      `<button type="button" class="btn" data-adp="reintentar">Reintentar</button>`
    );
  else if (modo === "crear")
    C.innerHTML = caja(
      ADM.pin ? "Cambiar el PIN de administrador" : "Cree su PIN de administrador",
      "Solo números, de 4 a 8 dígitos. Se pedirá al abrir esta página y otra vez tras 15 minutos sin usarla. Se guarda cifrado: nadie puede leerlo, ni siquiera desde Firebase.",
      `<form class="acc-form" data-adf="crear">${admCampoPin("admPin1", "Nuevo PIN")}${admCampoPin("admPin2", "Repita el PIN")}<button type="submit" class="btn acc-prim">Guardar PIN</button>${ADM.pin ? `<button type="button" class="btn sec" data-adp="cancelar">Cancelar</button>` : ""}</form>`
    );
  else if (modo === "pin")
    C.innerHTML = caja(
      "Administración protegida",
      "Ingrese su PIN de administrador para ver y administrar las cuentas.",
      `<form class="acc-form" data-adf="pin">${admCampoPin("admPin", "PIN")}<button type="submit" class="btn acc-prim">Entrar</button></form><p class="acc-alt"><button type="button" class="linkbtn" data-adp="olvido">¿Olvidó su PIN?</button></p>`
    );
  else if (modo === "olvido") {
    const g = USUARIO && USUARIO.providerData.some(p => p && p.providerId === "google.com");
    C.innerHTML = caja(
      "Restablecer el PIN",
      g
        ? "Confirme que es usted con su cuenta de Google; luego podrá crear un PIN nuevo."
        : "Escriba la contraseña de su cuenta; luego podrá crear un PIN nuevo.",
      g
        ? `<button type="button" class="btn acc-prim" data-adp="reauth-g">Confirmar con Google</button><button type="button" class="btn sec" data-adp="volver">Volver</button>`
        : `<form class="acc-form" data-adf="reauth"><label>Contraseña de su cuenta<input type="password" id="admReClave" autocomplete="current-password"></label><button type="submit" class="btn acc-prim">Confirmar</button><button type="button" class="btn sec" data-adp="volver">Volver</button></form>`
    );
  } else if (modo === "tabla") admRender();
  if (typeof ponerOjos === "function") ponerOjos(C);
  const f = C.querySelector("input");
  if (f) setTimeout(() => f.focus(), 30);
}
const admMsg = t => {
  const m = $("admMsg");
  if (m) m.textContent = t;
};
$("admCuerpo").addEventListener("submit", async e => {
  const f = e.target.closest("[data-adf]");
  if (!f) return;
  e.preventDefault();
  const k = f.dataset.adf;
  if (k === "crear") {
    const a = $("admPin1").value.trim(),
      b = $("admPin2").value.trim();
    if (!/^\d{4,8}$/.test(a)) return admMsg("El PIN debe tener de 4 a 8 dígitos, solo números.");
    if (a !== b) return admMsg("Los dos PIN no coinciden.");
    try {
      const sal = [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, "0")).join(""),
        pin = await admHash(a, sal);
      await admDb()
        .collection("config")
        .doc("admin")
        .set({ pin, sal, cambiado: firebase.firestore.FieldValue.serverTimestamp() });
      Object.assign(ADM, { pin, sal, abierto: true, ultAct: Date.now(), intentos: 0 });
      toast("PIN de administrador guardado.");
      admPantalla("tabla");
    } catch (err) {
      admMsg("No se pudo guardar el PIN" + (err.code ? ` (${err.code})` : "") + ".");
    }
  }
  if (k === "pin") {
    if (Date.now() < ADM.bloqHasta)
      return admMsg(`Demasiados intentos. Espere ${Math.ceil((ADM.bloqHasta - Date.now()) / 60000)} min.`);
    const p = $("admPin").value.trim();
    if ((await admHash(p, ADM.sal)) === ADM.pin) {
      Object.assign(ADM, { abierto: true, ultAct: Date.now(), intentos: 0 });
      admPantalla("tabla");
    } else {
      ADM.intentos++;
      $("admPin").value = "";
      if (ADM.intentos >= 5) {
        ADM.bloqHasta = Date.now() + 5 * 60000;
        ADM.intentos = 0;
        admMsg("PIN incorrecto. Por seguridad, espere 5 minutos para volver a intentar.");
      } else admMsg(`PIN incorrecto (${ADM.intentos} de 5 intentos).`);
    }
  }
  if (k === "reauth") {
    try {
      await USUARIO.reauthenticateWithCredential(
        firebase.auth.EmailAuthProvider.credential(USUARIO.email, $("admReClave").value)
      );
      ADM.abierto = true;
      ADM.ultAct = Date.now();
      admPantalla("crear");
    } catch (err) {
      admMsg("No se pudo confirmar: revise la contraseña.");
    }
  }
});
$("admCuerpo").addEventListener("click", async e => {
  const b = e.target.closest("[data-adp]");
  if (!b) return;
  const a = b.dataset.adp;
  if (a === "reintentar") {
    ADM.pin = undefined;
    admAbrir();
  }
  if (a === "cancelar") admPantalla("tabla");
  if (a === "olvido") admPantalla("olvido");
  if (a === "volver") admPantalla("pin");
  if (a === "reauth-g")
    try {
      await USUARIO.reauthenticateWithPopup(new firebase.auth.GoogleAuthProvider());
      ADM.abierto = true;
      ADM.ultAct = Date.now();
      admPantalla("crear");
    } catch (err) {
      admMsg("No se pudo confirmar con Google" + (err.code ? ` (${err.code})` : "") + ".");
    }
});

/* ---------- La hoja de cuentas ---------- */
// Lista en vivo (js/acceso.js, adminLista): se vuelve a dibujar si la página está abierta
function admLista(L) {
  ADM.L = L;
  if (ADM.modo === "tabla" && admAbierto()) admRender();
}
const ADM_COLS = [
  ["nombre", "Nombre"],
  ["correo", "Correo"],
  ["uso", "Uso"],
  ["creado", "Solicitud"],
  ["estado", "Estado"],
  ["vig", "Vigencia"],
  ["vence", "Vence"],
  ["ultimo", "Último ingreso"],
  ["notas", "Notas"],
  ["", "Acciones"]
];
const ADM_FILTROS = [
  ["todos", "Todas", () => true],
  ["pendiente", "Pendientes", x => admEstado(x) === "pendiente"],
  ["aprobado", "Activas", x => admEstado(x) === "aprobado" || admEstado(x) === "admin"],
  ["porvencer", "Por vencer (7 días)", admPorVencer],
  ["vencido", "Vencidas", x => admEstado(x) === "vencido"],
  ["baja", "Desactivadas o rechazadas", x => ["desactivado", "rechazado"].includes(admEstado(x))]
];
const ADM_ORDEN_EST = { pendiente: 0, vencido: 1, aprobado: 2, admin: 3, desactivado: 4, rechazado: 5 };
function admValorOrden(x, k) {
  if (k === "estado") return ADM_ORDEN_EST[admEstado(x)] ?? 9;
  if (k === "creado" || k === "vence" || k === "ultimo") return admMs(x[k]) || 0;
  if (k === "vig") return VIGENCIAS.findIndex(v => v[0] === (x.vigencia || ""));
  return String(x[k] || "").toLowerCase();
}
function admFilas() {
  const q = ADM.q.trim().toLowerCase(),
    fil = (ADM_FILTROS.find(f => f[0] === ADM.f) || ADM_FILTROS[0])[2];
  return ADM.L.filter(
    x =>
      fil(x) &&
      (!q ||
        [x.nombre, x.correo, x.uso, x.notas].some(v =>
          String(v || "")
            .toLowerCase()
            .includes(q)
        ))
  ).sort((a, b) => {
    const va = admValorOrden(a, ADM.ord),
      vb = admValorOrden(b, ADM.ord);
    return (va < vb ? -1 : va > vb ? 1 : 0) * ADM.dir || (admMs(b.creado) || 0) - (admMs(a.creado) || 0);
  });
}
function admRender() {
  $("admBarra").hidden = false;
  // Filtros con su cantidad
  $("admFiltros").innerHTML = ADM_FILTROS.map(
    ([k, t, f]) =>
      `<button type="button" class="adm-chip${ADM.f === k ? " on" : ""}" data-adfil="${k}">${t} <b>${ADM.L.filter(f).length}</b></button>`
  ).join("");
  const F = admFilas(),
    usos = v => [...new Set([...USOS_CUENTA, v].filter(Boolean))];
  $("admCuerpo").innerHTML = !ADM.L.length
    ? `<p class="hint" style="padding:16px">Aún no hay cuentas.</p>`
    : `<div class="card"><div class="tbl-wrap adm-hoja"><table><thead><tr>${ADM_COLS.map(([k, t]) =>
        k
          ? `<th class="t"><button type="button" class="adm-ord${ADM.ord === k ? " on" : ""}" data-adord="${k}">${t}${ADM.ord === k ? (ADM.dir > 0 ? " ▲" : " ▼") : ""}</button></th>`
          : `<th class="t">${t}</th>`
      ).join("")}</tr></thead><tbody>${
        F.length
          ? F.map(admFila).join("")
          : `<tr><td class="t" colspan="${ADM_COLS.length}"><span class="hint">Ninguna cuenta coincide con la búsqueda.</span></td></tr>`
      }</tbody></table></div></div><p class="hint adm-pie">${F.length} de ${ADM.L.length} cuenta${ADM.L.length === 1 ? "" : "s"}. Nombre, uso, vigencia y notas se editan en la misma celda y se guardan solos. Por seguridad, Firebase no deja ver las contraseñas: si alguien olvida la suya, envíele el correo para restablecerla (✉).</p>`;
  function admFila(x) {
    const st = admEstado(x),
      [et, ec] = ADM_ESTADOS[st] || [st, "warn"],
      yo = admYo(x),
      d = admDias(x),
      bt = (k, t, s = "", tit = "") =>
        `<button type="button" class="btn sm ${s}" data-ada="${k}" data-id="${x.id}"${tit ? ` title="${tit}"` : ""}>${t}</button>`,
      acc = yo
        ? `<span class="hint">Su cuenta</span>`
        : (st === "pendiente"
            ? bt("aprobar", "Aprobar") + bt("rechazar", "Rechazar", "sec")
            : st === "aprobado"
              ? (admPorVencer(x) ? bt("renovar", "Renovar") : "") + bt("desactivar", "Desactivar", "sec")
              : st === "vencido"
                ? bt("renovar", "Renovar") + bt("desactivar", "Desactivar", "sec")
                : bt("aprobar", "Reactivar")) +
          bt("clave", "✉", "sec", "Enviar un correo para restablecer su contraseña"),
      vence = admMs(x.vence)
        ? `${admFecha(admMs(x.vence))}<small class="${d < 0 ? "bad" : d <= 7 ? "w" : ""}">${d < 0 ? `venció hace ${-d} día${d === -1 ? "" : "s"}` : d === 0 ? "vence hoy" : `quedan ${d} día${d === 1 ? "" : "s"}`}</small>`
        : `<span class="hint">—</span>`;
    return `<tr class="${st === "pendiente" ? "adm-pend" : ""}" data-id="${x.id}">
      <td class="t"><input class="adm-in" data-k="nombre" value="${esc(x.nombre || "")}" placeholder="—"${yo ? " disabled" : ""}></td>
      <td class="t adm-correo">${esc(x.correo || "")}</td>
      <td class="t"><select class="adm-in" data-k="uso"${yo ? " disabled" : ""}>${usos(x.uso)
        .map(u => `<option${u === x.uso ? " selected" : ""}>${esc(u)}</option>`)
        .join("")}</select></td>
      <td class="t">${admFecha(admMs(x.creado))}</td>
      <td class="t"><span class="pill ${ec}">${et}</span></td>
      <td class="t"><select class="adm-in" data-k="vigencia"${yo ? " disabled" : ""}>${VIGENCIAS.map(
        ([k, t]) => `<option value="${k}"${k === (x.vigencia || "") ? " selected" : ""}>${t}</option>`
      ).join("")}</select></td>
      <td class="t adm-vence">${yo ? `<span class="hint">—</span>` : vence}</td>
      <td class="t">${admMs(x.ultimo) ? `${admFecha(admMs(x.ultimo))}<small>${admHora(admMs(x.ultimo))}</small>` : `<span class="hint">—</span>`}</td>
      <td class="t"><input class="adm-in adm-notas" data-k="notas" value="${esc(x.notas || "")}" placeholder="Agregar nota…" maxlength="300"></td>
      <td class="t"><div class="acts-row">${acc}</div></td></tr>`;
  }
}
const admRef = id => admDb().collection("usuarios").doc(id);
async function admGuardar(id, datos, ok) {
  try {
    await admRef(id).update(datos);
    if (ok) toast(ok);
  } catch (err) {
    toast("No se pudo guardar: " + (err.code || err.message));
    admRender();
  }
}
// Barra: buscar, filtros, nueva cuenta, exportar, PIN y bloquear
$("admBuscar").addEventListener("input", e => {
  ADM.q = e.target.value;
  admRender();
  const i = $("admBuscar");
  i.focus();
});
$("admBarra").addEventListener("click", e => {
  const f = e.target.closest("[data-adfil]");
  if (f) {
    ADM.f = f.dataset.adfil;
    return admRender();
  }
  const b = e.target.closest("[data-adb]");
  if (!b) return;
  const a = b.dataset.adb;
  if (a === "nueva") admNueva();
  if (a === "excel") admExcel();
  if (a === "pin") admPantalla("crear");
  if (a === "bloquear") admBloquear();
});
$("admCuerpo").addEventListener("click", e => {
  const o = e.target.closest("[data-adord]");
  if (o) {
    const k = o.dataset.adord;
    ADM.dir = ADM.ord === k ? -ADM.dir : 1;
    ADM.ord = k;
    return admRender();
  }
  const b = e.target.closest("[data-ada]");
  if (!b) return;
  const x = ADM.L.find(u => u.id === b.dataset.id);
  if (!x) return;
  const a = b.dataset.ada,
    ts = d => firebase.firestore.Timestamp.fromDate(d),
    rev = { revisado: firebase.firestore.FieldValue.serverTimestamp() };
  b.disabled = true;
  if (a === "aprobar") {
    // Con vigencia elegida, el plazo corre desde hoy
    const v = x.vigencia || "";
    admGuardar(
      x.id,
      { estado: "aprobado", vence: v ? ts(admVence(Date.now(), v)) : null, ...rev },
      `${x.nombre || x.correo}: aprobada`
    );
  }
  if (a === "rechazar") admGuardar(x.id, { estado: "rechazado", ...rev });
  if (a === "desactivar")
    confirmar(
      "Desactivar la cuenta",
      `<p><b>${esc(x.nombre || x.correo)}</b> no podrá ingresar hasta que la reactive. Sus proyectos se conservan.</p>`,
      "Desactivar",
      ok => (ok ? admGuardar(x.id, { estado: "desactivado", ...rev }) : admRender()),
      "Administración"
    );
  if (a === "renovar") {
    const v = x.vigencia || "1m",
      base = Math.max(Date.now(), admMs(x.vence) || 0),
      d = admVence(base, v);
    admGuardar(
      x.id,
      { estado: "aprobado", vigencia: v, vence: ts(d), ...rev },
      `${x.nombre || x.correo}: renovada hasta el ${admFecha(+d)}`
    );
  }
  if (a === "clave")
    firebase
      .auth()
      .sendPasswordResetEmail(x.correo)
      .then(() => toast(`Se envió a ${x.correo} el correo para restablecer su contraseña.`))
      .catch(err => toast("No se pudo enviar: " + (err.code || err.message)))
      .finally(() => (b.disabled = false));
});
// Edición en la celda: se guarda al cambiar
$("admCuerpo").addEventListener("change", e => {
  const i = e.target.closest(".adm-in");
  if (!i) return;
  const id = i.closest("tr").dataset.id,
    x = ADM.L.find(u => u.id === id),
    k = i.dataset.k,
    v = i.value.trim();
  if (!x) return;
  if (k === "vigencia") {
    // El nuevo plazo corre desde hoy; indefinida, sin vencimiento
    const d = v ? admVence(Date.now(), v) : null;
    return admGuardar(
      id,
      { vigencia: v, vence: d ? firebase.firestore.Timestamp.fromDate(d) : null },
      d ? `${x.nombre || x.correo}: vence el ${admFecha(+d)}` : `${x.nombre || x.correo}: vigencia indefinida`
    );
  }
  if (k === "nombre" && !v) {
    i.value = x.nombre || "";
    return;
  }
  admGuardar(id, { [k]: v.slice(0, 300) });
});
$("admCuerpo").addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.matches("input.adm-in")) e.target.blur();
});

/* ---------- Nueva cuenta ---------- */
const admClaveAzar = () => {
  const a = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789",
    r = crypto.getRandomValues(new Uint8Array(10));
  return [...r].map(n => a[n % a.length]).join("");
};
function admNueva(aviso, prev = {}) {
  confirmar(
    "Nueva cuenta",
    (aviso ? `<p class="acc-msg bad">${esc(aviso)}</p>` : "") +
      `<p>La cuenta queda aprobada al instante. Entregue a la persona su correo y la contraseña; luego ella puede cambiarla en el menú de su cuenta.</p><div class="acc-form adm-nueva"><label>Nombre completo<input id="anNom" value="${esc(prev.nom || "")}" autocomplete="off"></label><label>Correo electrónico<input type="email" id="anCor" value="${esc(prev.cor || "")}" autocomplete="off"></label><label>Contraseña inicial<span class="adm-gen"><input type="password" id="anCla" value="${esc(prev.cla || "")}" autocomplete="new-password" minlength="6"><button type="button" class="btn sm sec" data-angen>Generar</button></span></label><div class="acc-2"><label>Uso<select id="anUso">${USOS_CUENTA.map(u => `<option${u === prev.uso ? " selected" : ""}>${esc(u)}</option>`).join("")}</select></label><label>Vigencia<select id="anVig">${VIGENCIAS.map(([k, t]) => `<option value="${k}"${k === (prev.vig ?? "") ? " selected" : ""}>${t}</option>`).join("")}</select></label></div></div>`,
    "Crear cuenta",
    ok => {
      if (!ok) return;
      const d = {
        nom: $("anNom").value.trim(),
        cor: $("anCor").value.trim().toLowerCase(),
        cla: $("anCla").value,
        uso: $("anUso").value,
        vig: $("anVig").value
      };
      if (!d.nom) return admNueva("Escriba el nombre.", d);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.cor)) return admNueva("Escriba un correo válido.", d);
      if (d.cla.length < 6) return admNueva("La contraseña debe tener al menos 6 caracteres.", d);
      admCrear(d);
    },
    "Administración"
  );
  setTimeout(() => {
    ponerOjos($("cfmTxt"));
    $("anNom").focus();
  }, 40);
}
$("cfmTxt").addEventListener("click", e => {
  if (!e.target.closest("[data-angen]")) return;
  const i = $("anCla");
  i.value = admClaveAzar();
  if (i.type === "password") i.nextSibling.click();
});
async function admCrear(d) {
  toast("Creando la cuenta…");
  let app2;
  try {
    // Segunda instancia: crear la cuenta no cambia la sesión del administrador
    app2 = firebase.apps.find(a => a.name === "altas") || firebase.initializeApp(FB_CONFIG, "altas");
    await app2.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
    const cr = await app2.auth().createUserWithEmailAndPassword(d.cor, d.cla),
      uid = cr.user.uid;
    await app2.auth().signOut();
    const v = d.vig;
    await admRef(uid).set({
      nombre: d.nom,
      correo: d.cor,
      uso: d.uso,
      estado: "aprobado",
      vigencia: v,
      vence: v ? firebase.firestore.Timestamp.fromDate(admVence(Date.now(), v)) : null,
      creado: firebase.firestore.FieldValue.serverTimestamp(),
      revisado: firebase.firestore.FieldValue.serverTimestamp(),
      creadoPor: "admin"
    });
    confirmar(
      "Cuenta creada",
      `<p>Entregue estos datos a <b>${esc(d.nom)}</b>. Por seguridad, la contraseña no se vuelve a mostrar.</p><div class="adm-datos"><div><span>Página</span><b>${esc(location.origin + location.pathname)}</b></div><div><span>Correo</span><b>${esc(d.cor)}</b></div><div><span>Contraseña</span><b>${esc(d.cla)}</b></div></div>`,
      "Copiar los datos",
      ok => {
        if (ok && navigator.clipboard)
          navigator.clipboard
            .writeText(
              `JMG-ELECTRIC\nPágina: ${location.origin + location.pathname}\nCorreo: ${d.cor}\nContraseña: ${d.cla}\n(Puede cambiar la contraseña en el menú de su cuenta.)`
            )
            .then(() => toast("Datos copiados."));
      },
      "Administración"
    );
  } catch (err) {
    if (app2)
      try {
        await app2.auth().signOut();
      } catch (_) {}
    const c = (err && err.code) || "";
    admNueva(
      c === "auth/email-already-in-use"
        ? "Ya existe una cuenta con ese correo: búsquela en la lista (si no figura, la persona puede solicitarla desde la pantalla de ingreso)."
        : c === "auth/invalid-email"
          ? "El correo no es válido."
          : c === "auth/weak-password"
            ? "La contraseña debe tener al menos 6 caracteres."
            : c === "permission-denied"
              ? "La cuenta se creó, pero Firebase no dejó guardar su ficha: falta pegar las reglas nuevas de Firestore."
              : "No se pudo crear la cuenta" + (c ? ` (${c})` : "") + ".",
      d
    );
  }
}

/* ---------- Exportar a Excel ---------- */
async function admExcel() {
  const F = admFilas(),
    fila = x => [
      x.nombre || "",
      x.correo || "",
      x.uso || "",
      admMs(x.creado) ? new Date(admMs(x.creado)) : "",
      (ADM_ESTADOS[admEstado(x)] || [admEstado(x)])[0],
      (VIGENCIAS.find(v => v[0] === (x.vigencia || "")) || ["", ""])[1],
      admMs(x.vence) ? new Date(admMs(x.vence)) : "",
      admMs(x.ultimo) ? new Date(admMs(x.ultimo)) : "",
      x.notas || ""
    ],
    cab = ["Nombre", "Correo", "Uso", "Solicitud", "Estado", "Vigencia", "Vence", "Último ingreso", "Notas"],
    nombre = `JMG-ELECTRIC - Cuentas - ${new Date().toISOString().slice(0, 10)}.xlsx`;
  if (typeof ExcelJS === "undefined") return toast("No se cargó la librería de Excel. Verifique la conexión.");
  const wb = new ExcelJS.Workbook(),
    ws = wb.addWorksheet("Cuentas", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.addRow(cab);
  F.forEach(x => ws.addRow(fila(x)));
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14304F" } };
  [26, 32, 24, 13, 14, 12, 13, 16, 40].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  [4, 7, 8].forEach(c => (ws.getColumn(c).numFmt = "dd/mm/yyyy"));
  ws.autoFilter = { from: "A1", to: "I1" };
  const blob = new Blob([await wb.xlsx.writeBuffer()], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  try {
    if (typeof downloads !== "undefined" && downloads) await downloads.save({ filename: nombre, data: blob });
    else descargarLocal(blob, nombre);
  } catch (e) {}
}
