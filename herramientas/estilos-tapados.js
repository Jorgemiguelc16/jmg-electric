/* Declaraciones de CSS que nunca se aplican («npm run estilos-tapados»; con --quitar las elimina).
   Una declaración está tapada si, más abajo en style.css, el mismo selector (escrito igual, por lo tanto con la
   misma especificidad) vuelve a declarar la misma propiedad dentro del mismo contexto (las mismas @media,
   @supports o @container): por la cascada siempre gana la última. Se respeta !important: una declaración
   !important solo la tapa otra !important. Las reglas que quedan vacías se eliminan. */
const fs = require("fs");
const path = require("path");
const postcss = require("postcss");

const archivo = path.join(__dirname, "..", "style.css"),
  quitar = process.argv.includes("--quitar"),
  css = fs.readFileSync(archivo, "utf8"),
  raiz = postcss.parse(css);
// Contexto de una regla: las at-rules que la contienen
const contexto = r => {
  const c = [];
  for (let p = r.parent; p && p.type !== "root"; p = p.parent)
    if (p.type === "atrule") c.unshift(`@${p.name} ${p.params}`);
  return c.join(" | ");
};
// Selectores de una regla, uno por uno y normalizados (una regla con «a, b» declara para a y para b)
const selectores = r => r.selectors.map(s => s.replace(/\s+/g, " ").trim());
// Recorrido de atrás hacia adelante: lo visto más abajo tapa a lo de más arriba
const visto = new Map(),
  tapadas = [];
const reglas = [];
raiz.walkRules(r => {
  if (r.parent.type === "atrule" && /keyframes$/.test(r.parent.name)) return;
  reglas.push(r);
});
for (let i = reglas.length - 1; i >= 0; i--) {
  const r = reglas[i],
    ctx = contexto(r),
    sels = selectores(r),
    decls = r.nodes.filter(n => n.type === "decl");
  for (let j = decls.length - 1; j >= 0; j--) {
    const d = decls[j],
      prop = d.prop.toLowerCase();
    // Tapada solo si TODOS sus selectores redeclaran la propiedad más abajo (si no, sigue aplicándose a alguno)
    const tap = sels.every(s => {
      const v = visto.get(`${ctx}§${s}§${prop}`);
      return v && (v.important || !d.important);
    });
    if (tap) tapadas.push(d);
    sels.forEach(s => {
      const k = `${ctx}§${s}§${prop}`,
        v = visto.get(k);
      if (!v || (d.important && !v.important)) visto.set(k, { important: d.important });
    });
  }
}
const lineas = tapadas.length;
console.log(
  `${lineas} declaraciones tapadas en style.css (${raiz.nodes.length} bloques, ${css.split("\n").length} líneas)`
);
if (!quitar) {
  tapadas
    .slice(0, 15)
    .forEach(d =>
      console.log(
        `  línea ${d.source.start.line}: ${d.parent.selector.replace(/\s+/g, " ").slice(0, 60)} { ${d.prop}: ${d.value} }`
      )
    );
  if (lineas > 15) console.log(`  … y ${lineas - 15} más. Use --quitar para eliminarlas.`);
} else {
  tapadas.forEach(d => d.remove());
  // Reglas que quedaron sin declaraciones, y at-rules que quedaron vacías
  let vacias = 0;
  raiz.walkRules(r => {
    if (!r.nodes.length) {
      r.remove();
      vacias++;
    }
  });
  raiz.walkAtRules(a => {
    if (a.nodes && !a.nodes.length && a.name !== "font-face") a.remove();
  });
  fs.writeFileSync(archivo, raiz.toString());
  console.log(`Eliminadas: ${lineas} declaraciones y ${vacias} reglas vacías.`);
}
