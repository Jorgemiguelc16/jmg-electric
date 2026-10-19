/* Revisión del código con ESLint («npm run revisar»).
   Los archivos de js/ son scripts que comparten variables globales: se cargan en orden desde index.html.
   Por eso se unen en un solo texto, en ese mismo orden, y ESLint los analiza juntos: así detecta lo que
   se usa sin estar definido y lo que se define y nunca se usa, aunque esté en otro archivo.
   Cada aviso indica el archivo y la línea originales. */
const fs = require("fs");
const path = require("path");
const { Linter } = require("eslint");
const globals = require("globals");

const raiz = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(raiz, "index.html"), "utf8");
const archivos = [...html.matchAll(/<script src="(js\/[^"?]+)/g)].map(m => m[1]).filter(f => f !== "js/logo.js");

// Unión de los archivos, guardando dónde empieza cada uno para traducir los números de línea
let texto = "const LOGO_JPG = '';\n";
const tramos = [];
for (const f of archivos) {
  const t = fs.readFileSync(path.join(raiz, f), "utf8").replace(/\r\n/g, "\n");
  tramos.push({ f, desde: texto.split("\n").length, lineas: t.split("\n").length });
  texto += t + "\n";
}
const ubicar = n => {
  const t = tramos.find(x => n >= x.desde && n < x.desde + x.lineas);
  return t ? `${t.f}:${n - t.desde + 1}` : `?:${n}`;
};

const linter = new Linter({ configType: "flat" });
const avisos = linter.verify(texto, [
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "script",
      globals: { ...globals.browser, firebase: "readonly", ExcelJS: "readonly" }
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { vars: "all", args: "none", caughtErrors: "none" }],
      "no-redeclare": "error",
      "no-dupe-keys": "error",
      "no-unreachable": "warn",
      "no-self-assign": "warn"
    }
  }
]);

if (!avisos.length) {
  console.log(`Sin observaciones en ${archivos.length} archivos.`);
  process.exit(0);
}
for (const a of avisos) console.log(`${ubicar(a.line)}  ${a.severity === 2 ? "ERROR" : "aviso"}  ${a.message}`);
const errores = avisos.filter(a => a.severity === 2).length;
console.log(`\n${errores} error(es) y ${avisos.length - errores} aviso(s) en ${archivos.length} archivos.`);
process.exit(errores ? 1 : 0);
