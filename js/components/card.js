// js/components/card.js
(function () {
  "use strict";
  window.TT = window.TT || {};
  TT.components = TT.components || {};

  /**
   * Crea el elemento DOM de una carta.
   * @param {Object} opciones
   * @param {number} opciones.id id de la carta (data/cards.js)
   * @param {"red"|"blue"} opciones.player dueño actual
   * @param {boolean} [opciones.onBoard]
   * @param {boolean} [opciones.displayValues] por defecto true
   * @param {Object} [opciones.dataset] atributos data-* extra (state, flipDirection, modifier...)
   * @param {Function} [opciones.onClick]
   * @param {Function} [opciones.onMouseEnter]
   */
  function crear(opciones) {
    var id = opciones.id;
    var player = opciones.player;
    var onBoard = !!opciones.onBoard;
    var displayValues = opciones.displayValues !== false;

    var carta = TT_DATA.cards.find(function (c) { return c.id === id; });
    var raiz = document.createElement("div");
    if (!carta) return raiz;

    var estadoJuego = TT.state.get();
    var deberiaOcultarse = (
      player === "red" && !estadoJuego.winState && !onBoard &&
      (!estadoJuego.isGameActive || !(estadoJuego.rules && estadoJuego.rules.indexOf("open") !== -1))
    );

    raiz.className = "card-card " + (deberiaOcultarse ? "card-card--hidden " : "") + "card relative";
    raiz.dataset.player = player;

    if (opciones.dataset) {
      Object.keys(opciones.dataset).forEach(function (clave) {
        var valor = opciones.dataset[clave];
        if (valor === undefined || valor === null) return;
        raiz.dataset[clave] = valor;
      });
    }

    if (opciones.onClick) raiz.addEventListener("click", opciones.onClick);
    if (opciones.onMouseEnter) raiz.addEventListener("mouseenter", opciones.onMouseEnter);
    if (opciones.onMouseLeave) raiz.addEventListener("mouseleave", opciones.onMouseLeave);

    var frente = document.createElement("div");
    frente.className = "card-card__front";
    frente.dataset.cardId = String(carta.id);
    frente.dataset.level = String(carta.level);
    frente.dataset.gallery = estadoJuego.isCardGalleryOpen ? "true" : "false";
    raiz.appendChild(frente);

    if (displayValues) {
      frente.appendChild(TT.components.cardValues.crear(id, false));

      if (carta.element) {
        var elemento = document.createElement("div");
        elemento.className = "card-element relative";
        elemento.dataset.sprite = carta.element;
        elemento.textContent = carta.element;
        frente.appendChild(elemento);
      }
    }

    return raiz;
  }

  TT.components.card = { crear: crear };
})();
