# Triple Triad — HTML / CSS / JavaScript vanilla

Migración completa de [triple-triad-react](https://github.com/Cyanoxide/triple-triad-react)
(React + Next.js + TypeScript) a HTML5, CSS3 y JavaScript vanilla (ES6+),
sin ningún framework ni paso de compilación. Un solo jugador contra la IA
(sin multijugador), con selector de idioma Inglés/Español.

## Cómo ejecutarlo

Haz doble clic en `index.html` y se abre directamente en el navegador
(`file://`), sin necesitar Node, npm ni ningún servidor local. Los datos del
juego (cartas, jugadores, localizaciones, reglas) están incrustados como
JavaScript (`data/*.js`) en vez de cargarse con `fetch()`, y los efectos de
sonido cortos están incrustados en base64 (`data/sfx.js`) por la misma
razón: `file://` no deja hacer ninguna petición de red, así que nada del
juego depende de que una funcione.

## Idioma

El icono de la bandera `ES`/`EN`, en la barra de opciones (esquina inferior
derecha, junto al de Sonido), cambia el idioma de toda la interfaz al
momento — no hace falta recargar la página — y la elección se guarda en
`localStorage` para la próxima vez. Cubre los textos de la interfaz: botones,
reglas, menús, diálogos. Los nombres de las cartas, jugadores y
localizaciones (datos del juego, p. ej. "Balamb Garden" o "Geezard") se
mantienen en inglés en los dos idiomas, igual que en el juego original.

## Estructura

```
index.html              Un único punto de entrada; enlaza cada CSS/JS por separado.
css/
  base.css               Reset + globals.css (fondo, layout, --app-scale, keyframes compartidos,
                            y el interruptor que muestra texto real en español en vez de sprite)
  fonts.css               Tipografía de sprites (font.css original, sin cambios)
  utilities.css           Las clases de utilidad equivalentes a Tailwind (compiladas, sin Tailwind en runtime)
  menus.css                Diálogos y menús: base de diálogo, menú principal, premios, sobres...
  board.css                 Tablero, cartas, manos, indicadores
  cards.css                  Selección/galería/recompensa de cartas
js/
  state.js                Estado central de la partida (equivalente al reducer de React)
  i18n.js                   Diccionario Inglés/Español y funciones de traducción en caliente
  rules.js                  Reglas de captura del tablero (Same/Plus/Combo/Elemental/Same Wall)
  ai.js / aiCardSelection.js  IA del rival y generación de su mano
  cardPacks.js               Sobres de cartas: probabilidades, cooldown
  sounds.js                   Web Audio API + <audio>, desbloqueo tras el primer gesto
  nav.js                     Navegación por teclado/mando
  general.js / platform.js / textToSprite.js / furniture.js   Utilidades varias
  components/*.js          Un archivo por cada pantalla/pieza de interfaz (Board, Hand, Card,
                             MenuDialog, CardSelectionDialog, CardGallery,
                             WinDialog, RewardSelectionDialog, PackDialog, PackButton...)
  main.js                   Arranque: monta/desmonta cada pantalla según el estado
data/
  cards.js, players.js, locations.js, ruleSets.js, rules.js, elements.js
                            El mismo contenido que los .json originales, incrustado como JS
                            para no depender de fetch()
  sfx.js                   Los 7 efectos de sonido cortos (select, flip, place, error, spin,
                            back, success), incrustados en base64 por la misma razón — ver
                            la nota en js/sounds.js
assets/, icons/          Sprites, sonidos e iconos, tal cual el proyecto original
manifest.json             PWA: rutas ya relativas, instalable también desde file://
```

`js/rooms.js` y `js/multiplayerSession.js` son del proyecto original (cliente
de una sala remota vía `game.php`, que ya no se incluye) y se cargan pero no
se usan: nada en `main.js` los invoca, así que una sesión nunca se crea y el
juego siempre funciona en modo un jugador. Se dejaron en vez de borrarlos
porque bastantes archivos (`board.js`, `cardSelectionDialog.js`,
`rewardSelectionDialog.js`, `winDialog.js`, `notice.js`) comprueban
`TT.multiplayer.get().session` antes de algunas ramas de código: con la
sesión siempre a `null`, esas ramas simplemente no se ejecutan nunca, sin
necesidad de tocar la lógica de cada archivo.

## Qué modificar para...

- **Cambiar las cartas, sus valores o su elemento** → `data/cards.js`
- **Cambiar qué cartas lleva cada rival, su ubicación o su carta rara** → `data/players.js`
- **Cambiar las reglas de una localización/rival** → `data/ruleSets.js` (y `data/rules.js` para los
  textos "Open", "Same"... que se muestran en el menú)
- **Cambiar el comportamiento de la IA** → `js/ai.js` (elección de jugada) y
  `js/aiCardSelection.js` (elección de mano)
- **Cambiar las reglas de captura** (Same, Plus, elementos, muro...) → `js/rules.js`
- **Cambiar el aspecto** → el CSS de cada zona está en su propio archivo dentro de `css/`; los
  colores/tamaños base y las variables (`--app-scale`, `--dialog-boost`...) están en `css/base.css`
- **Cambiar un texto de la interfaz, o añadir una traducción que falte** → `js/i18n.js`
  (diccionario `DICCIONARIO.es`); el texto en inglés es siempre la clave
- **Cambiar los enlaces de la pantalla de título** (Github, sitio web) → el array `LINKS` al
  principio de `js/components/modeDialog.js`

