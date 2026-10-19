# Guía del código de JMG - ELECTRIC

Guía para entender, mantener y hacer crecer la plataforma. Explica cómo está organizada, cómo viaja un dato
desde que se escribe hasta que aparece en el expediente y qué revisar antes de publicar.

## 1. Qué es técnicamente

Es una **página web estática**: HTML, CSS y JavaScript que se ejecutan en el navegador del usuario. No hay
servidor propio ni instalación. Se publica en GitHub Pages; el acceso con cuenta usa Firebase (Google).

| Pieza | Archivo o carpeta |
| --- | --- |
| Estructura de todas las pantallas | `index.html` |
| Apariencia (colores, tamaños, diseño) | `style.css` |
| Lógica y cálculo | `js/` (20 archivos) |
| Imágenes de la plataforma | `img/`, `logo.png`, `foto.png`, `og.png` |
| Manual de usuario y referencia técnica | `manual/manual.html` → `manual/JMG-ELECTRIC-Manual-v2.1.pdf` |
| Pruebas automáticas del cálculo | `pruebas/` |
| Herramientas de desarrollo | `herramientas/`, `package.json` |

## 2. Los archivos de `js/` y en qué orden se cargan

Los scripts **comparten variables**: lo que define un archivo lo usan los que se cargan después. El orden
está al final de `index.html` y es este:

| # | Archivo | Qué hace |
| --- | --- | --- |
| 1 | `logo.js` | Logo en imagen para Excel, unifilar y expediente |
| 2 | `tablas-cne.js` | **Tablas del CNE** y constantes del cálculo (solo datos) |
| 3 | `textos.js` | Textos: normas, glosario, preguntas, novedades |
| 4 | `datos.js` | Valores por defecto, listas editables y ayudas de cada dato |
| 5 | `calculo.js` | **Motor de cálculo** |
| 6 | `resultados.js` | Estado global y tarjetas de resultados |
| 7 | `metrado.js` | Metrado de materiales |
| 8 | `unifilar.js` | Diagrama unifilar (SVG, PNG, DXF) |
| 9 | `expediente.js` | Expediente técnico en PDF |
| 10 | `interfaz.js` | **Ciclo principal** `update()` y navegación |
| 11 | `excel.js` | Memoria de cálculo en Excel |
| 12 | `descargas.js` | Guardar archivos y diálogos de exportación |
| 13 | `sitio.js` | Páginas de la web (glosario, novedades, soporte) |
| 14 | `proyectos.js` | Guardar, abrir y ejemplos de proyectos |
| 15 | `herramientas.js` | Calculadoras rápidas |
| 16 | `archivo.js` | Abrir y guardar `.json` |
| 17 | `app.js` | Espacio de trabajo: árbol, propiedades, cinta |
| 18 | `centro.js` | Centro de ingeniería (Inicio) |
| 19 | `inicio.js` | Arranque y bienvenida |
| 20 | `tema.js` | Tema, zoom y mano de arrastre |
| 21 | `acceso.js` | Ingreso con cuenta y Administración |

Cada archivo empieza con un comentario que explica lo mismo con más detalle.

## 3. Cómo viaja un dato (el camino del cálculo)

1. El usuario escribe un dato, por ejemplo el área techada (`<input id="area">` en `index.html`).
2. Al cambiarlo se llama a **`update()`** (`interfaz.js`).
3. `update()` revisa con `faltantes()` si faltan datos. Si faltan, muestra la lista en ámbar y se detiene.
4. Si están completos, **`ctx()`** (`calculo.js`) reúne los parámetros: método de instalación, temperatura,
   factor de potencia, reserva, etc.
5. **`calcUni(c)`** (vivienda u otros usos) o **`calcMulti(c)`** (edificio) calculan:
   - la máxima demanda con `mdVivienda()` o `mdUso()`;
   - los alimentadores con `alimentador()` y los circuitos con `grupos()` / `circuito()`;
   - el interruptor y la sección con **`dimensionar()`**, por capacidad y por caída de tensión;
   - el balance de fases con `balancear()` y la puesta a tierra con `pozo()`.
6. El resultado `r` se guarda en `LAST` y lo dibuja **`render(r)`** con las tarjetas de `resultados.js`,
   `unifilar.js` y `metrado.js`.
7. Las exportaciones (`excel.js`, `expediente.js`, `unifilar.js`) leen ese mismo `r`. Por eso la pantalla,
   el Excel y el PDF siempre coinciden.

## 4. Por dónde empezar a estudiar

1. **`tablas-cne.js`**: compara cada tabla con el CNE. Es corto y te conecta el código con la norma.
2. **`calculo.js`**: `dimensionar()`, `mdVivienda()` y `calcUni()`. Sigue a mano el ejemplo **C1** del
   manual (vivienda de 120 m²) con el código al lado.
3. **`interfaz.js`**: la función `update()`, para ver cómo se conecta todo.
4. Después, lo que necesites tocar: `resultados.js` (pantalla), `excel.js` (memoria), `acceso.js` (cuentas).

## 5. Herramientas de desarrollo

Están instaladas con Node.js. Si se cambia de computadora, se reinstalan con `npm install`.

| Comando | Qué hace |
| --- | --- |
| `npm run formato` | Ordena el formato del código (Prettier). No cambia lo que hace el código. |
| `npm run revisar` | Busca errores y código sin usar (ESLint), analizando todos los archivos juntos. |
| `npm run estilos-sin-uso` | Lista estilos de `style.css` que ya no usa ninguna pantalla. |

Las **pruebas del cálculo** se abren con `pruebas/ejecutar-pruebas.bat`. Comparan 31 casos con resultados de
referencia y con los ejemplos del manual. Son solo para desarrollo: nunca se enlazan desde la plataforma.

## 6. Antes de publicar (lista de control)

1. `npm run revisar` sin errores.
2. Pruebas del cálculo en verde. Si el cálculo cambió a propósito, revisar cada diferencia y regenerar
   `pruebas/referencia.js` desde la misma página de pruebas.
3. Subir el número de versión de los archivos (`?v=X.Y.Z` en `index.html`) para que los navegadores no usen
   archivos viejos guardados en su memoria.
4. Con el cambio ya aprobado: actualizar el manual, regenerar el PDF y agregar la entrada en `NOVEDADES`
   (`textos.js`).
5. Publicar en `main`.

## 7. Reglas de la casa

- **El cálculo sale de la norma.** Todo valor del CNE, EM.010 o DGE se verifica contra el documento antes y
  después de cambiarlo. Lo que es criterio de ingeniería se dice así, en la plataforma y en el manual.
- **Ningún cambio de diseño toca el cálculo.** Si toca `calculo.js` o `tablas-cne.js`, las pruebas lo dicen.
- **Cada parámetro nuevo se explica** en su ayuda (`HLP` en `datos.js`) y en el manual.
