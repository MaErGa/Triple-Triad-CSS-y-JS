// js/textToSprite.js
// Crea un <span> con un glifo de sprite por carácter, usando css/fonts.css
// (que define el spritesheet de la tipografía pixel-art del juego).
// Equivale a src/app/utils/textToSprite.tsx del proyecto original.
(function () {
  "use strict";

  window.TT = window.TT || {};

  // Cada span creado se registra con el texto ORIGINAL (sin traducir) que se
  // le pidió, para poder reconstruirlo en el otro idioma si TT.i18n cambia
  // después de que este nodo ya esté montado (ver js/i18n.js).
  var registrados = [];

  /**
   * @param {string} texto
   * @param {string} [color] "white" | "orange" | "red" | "blue" | ... (clase CSS en css/fonts.css)
   * @param {boolean} [centrado]
   * @returns {HTMLSpanElement|undefined}
   */
  function textoASprite(texto, color, centrado) {
    color = color || "white";
    centrado = !!centrado;

    var contenedor = document.createElement("span");
    contenedor.className = "font " + color + " flex " + (centrado ? "justify-center" : "");
    registrados.push({ el: contenedor, original: texto, color: color, centrado: centrado });
    // Con texto vacío el original no renderizaba nada (JSX admite `undefined`
    // como hijo). Aquí no: un <span> vacío ocupa el mismo lugar (ninguno) y
    // evita que cada appendChild(...) de la app tenga que comprobar null.
    if (!texto) return contenedor;

    rellenarGlifos(contenedor, TT.i18n ? TT.i18n.t(texto) : texto);
    return contenedor;
  }

  function rellenarGlifos(contenedor, textoTraducido) {
    contenedor.innerHTML = "";
    var caracteres = String(textoTraducido).split("");
    for (var i = 0; i < caracteres.length; i++) {
      var glifo = caracteres[i];
      var span = document.createElement("span");
      span.className = "font-glyph";
      span.dataset.sprite = glifo;
      span.textContent = glifo;
      contenedor.appendChild(span);
    }
  }

  /** Llamado por TT.i18n.retraducirTodaLaApp() tras un cambio de idioma. */
  function retraducirTodo() {
    registrados = registrados.filter(function (entrada) { return entrada.el.isConnected; });
    registrados.forEach(function (entrada) {
      if (!entrada.original) return;
      rellenarGlifos(entrada.el, TT.i18n.t(entrada.original));
    });
  }

  TT.textoASprite = textoASprite;
  TT._retraducirTodo = retraducirTodo;
})();
