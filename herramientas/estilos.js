/* Los archivos de estilos de la plataforma (css/), en el orden en que los carga index.html: el orden importa, porque
   si dos reglas dicen cosas distintas gana la de más abajo, aunque estén en archivos distintos.
   Lo usan herramientas/estilos-sin-uso.js y herramientas/estilos-tapados.js. */
const fs = require("fs");
const path = require("path");

const raiz = path.join(__dirname, "..");
const archivosCss = () =>
  [
    ...fs.readFileSync(path.join(raiz, "index.html"), "utf8").matchAll(/<link rel="stylesheet" href="(css\/[^"?]+)/g)
  ].map(m => m[1]);

module.exports = { raiz, archivosCss };
