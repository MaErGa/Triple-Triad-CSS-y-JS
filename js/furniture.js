// js/furniture.js
// Una caja anclada a una esquina de la ventana (Quit, el reloj de jugada,
// la barra de opciones, la barra de enlaces...) que vive fuera de #app a
// propósito: #app se escala con `zoom` (ver scaleApp en main.js) y estos
// elementos llevan su propio data-app-scaled, así que si vivieran dentro de
// #app se escalarían dos veces. Aquí no hace falta un portal de verdad: basta
// con crear el nodo directamente en document.body.
(function () {
  "use strict";
  window.TT = window.TT || {};

  /**
   * @param {string} [className]
   * @returns {HTMLDivElement} ya insertado en document.body
   */
  function crearFurniture(className) {
    var div = document.createElement("div");
    div.className = className || "";
    div.dataset.appScaled = "";
    document.body.appendChild(div);
    return div;
  }

  TT.crearFurniture = crearFurniture;
})();
