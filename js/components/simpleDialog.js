// js/components/simpleDialog.js
(function () {
  "use strict";
  window.TT = window.TT || {};
  TT.components = TT.components || {};

  /**
   * @param {Object} [opciones]
   * @param {string} [opciones.className] clases extra
   * @param {string|null} [opciones.metaTitle] por defecto "info."; null la omite
   * @param {string} [opciones.dialog] valor de data-dialog, por defecto "simple"
   * @param {Object} [opciones.dataset] atributos data-* extra
   * @param {Node|Node[]} [opciones.children]
   * @returns {HTMLDivElement}
   */
  function crear(opciones) {
    opciones = opciones || {};
    var metaTitle = (opciones.metaTitle === undefined) ? "info." : opciones.metaTitle;
    var dialogType = opciones.dialog || "simple";

    var raiz = document.createElement("div");
    raiz.className = ("simple-dialog-simpleDialog " + (opciones.className || "") + " absolute").trim();
    raiz.dataset.dialog = dialogType;

    if (opciones.dataset) {
      Object.keys(opciones.dataset).forEach(function (clave) {
        var valor = opciones.dataset[clave];
        if (valor === undefined) return;
        raiz.dataset[clave] = valor;
      });
    }

    if (metaTitle) {
      var meta = document.createElement("h4");
      meta.className = "simple-dialog-meta";
      meta.dataset.sprite = metaTitle;
      TT.i18n.aplicarTexto(meta, metaTitle);
      raiz.appendChild(meta);
    }

    var hijos = opciones.children;
    if (hijos) {
      (Array.isArray(hijos) ? hijos : [hijos]).forEach(function (hijo) {
        if (hijo) raiz.appendChild(hijo);
      });
    }

    return raiz;
  }

  TT.components.simpleDialog = { crear: crear };
})();
