// js/components/cardValues.js
(function () {
  "use strict";
  window.TT = window.TT || {};
  TT.components = TT.components || {};

  function valorMostrado(numero) {
    return (numero === 10) ? "A" : numero;
  }

  /**
   * @param {number} cardId
   * @param {boolean} [esGaleria]
   * @returns {HTMLElement}
   */
  function crear(cardId, esGaleria) {
    var carta = TT_DATA.cards.find(function (c) { return c.id === cardId; });
    var contenedor = document.createElement("div");
    contenedor.className = (esGaleria ? "card-values-galleryValues" : "card-values-values") + " relative";
    if (!carta) return contenedor;

    var etiquetas = [
      ["top", carta.top], ["right", carta.right], ["bottom", carta.bottom], ["left", carta.left],
    ];

    etiquetas.forEach(function (par) {
      var direccion = par[0], valor = par[1];
      var span = document.createElement("span");
      span.className = "card-values-" + direccion + "Value " + direccion + "Value absolute text-center";
      span.dataset.sprite = String(valor);
      span.textContent = String(valorMostrado(valor));
      contenedor.appendChild(span);
    });

    return contenedor;
  }

  TT.components.cardValues = { crear: crear };
})();
