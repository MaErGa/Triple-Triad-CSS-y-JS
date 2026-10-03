// js/i18n.js
// Selector de idioma Ingles/Espanol, en tiempo de ejecucion.
//
// Dos caminos de render de texto en este juego necesitan dos tratamientos
// distintos:
//
// 1. El texto de sprite pixel-art (TT.textoASprite, css/fonts.css) dibuja un
//    glifo por caracter desde un spritesheet que SOLO tiene A-Z, a-z, 0-9 y
//    puntuacion basica: no existen ni las vocales con tilde ni la enie. Por
//    eso el diccionario de abajo escribe el espanol sin acentos ni enies
//    (reformulando la frase cuando hace falta, no solo quitando la tilde:
//    "anadir" no es una palabra real, así que se evita "Se han vuelto a
//    anadir..." y se usa "Las cartas... han vuelto a tu mazo.").
//
// 2. Los titulos "-meta" (h4 de esquina, tipo "Info." / "Cards") usan una
//    tecnica distinta: la imagen del sprite sustituye a un texto real vía
//    text-indent. css/base.css desactiva esa sustitucion solo en modo
//    espanol ([data-idioma="es"] [class*="-meta"]), así que esos titulos sí
//    podrían llevar tildes — pero se mantienen sin acentos aquí también,
//    por consistencia con el resto del diccionario.
//
// "Registrar" un nodo (aplicarTexto, y el registro propio de
// textToSprite.js/simpleDialog.js) es necesario porque casi todo este texto
// se escribe UNA vez al montar un componente: si el idioma cambia mientras
// ese componente ya está montado, nada vuelve a tocar ese nodo salvo que
// algo lo tenga apuntado. retraducirTodaLaApp() recorre esos registros y
// vuelve a escribir cada nodo con el idioma nuevo. El texto que sí se
// reconstruye en cada render() (p.ej. la lista de reglas de menuDialog, o el
// titulo de cardGallery) no necesita registro: ya vuelve a pasar por t()
// solo con que ese render() se repita, y SET_IDIOMA dispara exactamente esa
// repeticion en todo componente suscrito a TT.state.
(function () {
  "use strict";
  window.TT = window.TT || {};

  var CLAVE_ALMACENAMIENTO = "language";

  var DICCIONARIO = {
    es: {
      // --- botones / navegacion general ---
      "Play": "Jugar",
      "Quit": "Salir",
      "Undo": "Deshacer",
      "Yes": "Si",
      "No": "No",
      "Close": "Cerrar",
      "Home": "Inicio",
      "Links": "Enlaces",
      "Sound": "Sonido",

      // --- pantalla de titulo ---
      "Want to play a game of cards?": "Quieres jugar una partida de cartas?",

      // --- menu principal ---
      "Rules:": "Reglas:",
      "Trade Rule: ": "Regla de Intercambio: ",
      "None": "Ninguna",

      // --- nombres de reglas (data/rules.js) ---
      "Open": "Abierta",
      "Elemental": "Elemental",
      "Random": "Aleatoria",
      "All Cards": "Todas las Cartas",
      "Same": "Igual",
      "Plus": "Suma",
      "Sudden Death": "Muerte Subita",
      "Same Wall": "Igual + Muro",
      "Auto Play": "Auto Jugar",

      // --- reglas de intercambio (data/rules.js) ---
      "One": "Una",
      "Diff.": "Dif.",
      "Direct": "Directo",
      "All": "Todas",

      // --- confirmacion ---
      "Are you sure?": "Estas seguro?",
      "Choice": "Eleccion",

      // --- titulos "-meta" (esquina de los cuadros de dialogo) ---
      "Info.": "Info.",

      // --- seleccion de mano / galeria ---
      "Cards": "Cartas",
      "Card": "Cartas",
      "P.": "Pag.",
      "Num.": "Num.",
      "Players": "Jugadores",
      "Location": "Lugar",
      "help": "Ayuda",
      "You don't have enough cards to play.": "No tienes cartas suficientes para jugar.",
      "Starting cards have been re-added to your deck.": "Las cartas iniciales han vuelto a tu mazo.",

      // --- galeria de cartas ---
      "Monster": "Monstruo",
      "Boss": "Jefe",
      "GF": "GF",
      "Player": "Jugador",

      // --- sobres / recompensas ---
      "Turn over your cards": "Da la vuelta a tus cartas",

      // --- aviso de instalacion (iOS) ---
      "iOS Device Detected": "Dispositivo iOS Detectado",
      "For the best mobile experience,": "Para la mejor experiencia movil,",
      "tap 'Share', then 'Add to Home Screen'": "pulsa 'Compartir' y luego 'Agregar a inicio'",

      // --- enlaces (pantalla de titulo) ---
      "Github": "Github",
      "maerga.github.io": "maerga.github.io",
    },
  };

  function idiomaActual() {
    return (document.documentElement && document.documentElement.dataset.idioma === "es") ? "es" : "en";
  }

  /** @param {string} texto @returns {string} */
  function t(texto) {
    if (!texto) return texto;
    var diccionario = DICCIONARIO[idiomaActual()];
    if (!diccionario) return texto;
    return (texto in diccionario) ? diccionario[texto] : texto;
  }

  /**
   * "Level N Monster Cards" (en) / "Nivel N Cartas de Monstruo" (es). El
   * orden de las palabras cambia entre idiomas, así que no basta con
   * traducir cada trozo por separado: hace falta montar la frase distinta
   * en cada idioma.
   * @param {number} nivel
   * @param {string} tipo "Monster" | "Boss" | "GF" | "Player"
   */
  function tituloGaleria(nivel, tipo) {
    var tipoTraducido = t(tipo);
    if (idiomaActual() === "es") return "Nivel " + nivel + " Cartas de " + tipoTraducido;
    return "Level " + nivel + " " + tipoTraducido + " Cards";
  }

  /**
   * "<name> card acquired/lost" (en) / "Carta <name> conseguida/perdida" (es).
   * @param {string} nombreCarta
   * @param {"acquired"|"lost"} tipo
   */
  function fraseCartaPremio(nombreCarta, tipo) {
    if (idiomaActual() === "es") return "Carta " + nombreCarta + " " + ((tipo === "lost") ? "perdida" : "conseguida");
    return nombreCarta + " card " + ((tipo === "lost") ? "lost" : "acquired");
  }

  /** "Select N card(s) you want" (en) / "Selecciona N carta(s) que quieras" (es). */
  function fraseSeleccionarCartas(cantidad) {
    if (idiomaActual() === "es") return "Selecciona " + cantidad + " carta(s) que quieras";
    return "Select " + cantidad + " card(s) you want";
  }

  function leerIdiomaGuardado() {
    try {
      var guardado = localStorage.getItem(CLAVE_ALMACENAMIENTO);
      return (guardado === "es" || guardado === "en") ? guardado : "en";
    } catch (e) {
      return "en";
    }
  }

  function guardarIdioma(idioma) {
    try { localStorage.setItem(CLAVE_ALMACENAMIENTO, idioma); } catch (e) { /* nada que hacer */ }
  }

  // --- registro de nodos de texto plano (no-sprite) para retraduccion ---
  var registrados = [];

  /**
   * Traduce `original` y lo escribe en `el.textContent`, registrando el par
   * para que retraducirTodaLaApp() pueda volver a escribirlo si el idioma
   * cambia despues de montar `el`.
   * @param {HTMLElement} el
   * @param {string} original
   */
  function aplicarTexto(el, original) {
    el.textContent = t(original);
    registrados.push({ el: el, original: original });
  }

  function retraducirTextos() {
    registrados = registrados.filter(function (entrada) { return entrada.el.isConnected; });
    registrados.forEach(function (entrada) { entrada.el.textContent = t(entrada.original); });
  }

  /**
   * Vuelve a traducir todo el texto ya montado: el suyo (aplicarTexto, que
   * cubre también los <h4> "-meta" de simpleDialog.js) y el de
   * textToSprite.js, que lleva su propio registro porque no pasa por
   * aplicarTexto.
   */
  function retraducirTodaLaApp() {
    retraducirTextos();
    if (TT._retraducirTodo) TT._retraducirTodo();
  }

  TT.i18n = {
    t: t,
    tituloGaleria: tituloGaleria,
    fraseCartaPremio: fraseCartaPremio,
    fraseSeleccionarCartas: fraseSeleccionarCartas,
    idiomaActual: idiomaActual,
    leerIdiomaGuardado: leerIdiomaGuardado,
    guardarIdioma: guardarIdioma,
    aplicarTexto: aplicarTexto,
    retraducirTodaLaApp: retraducirTodaLaApp,
  };
})();
