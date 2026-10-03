// js/components/indicator.js
(function () {
  "use strict";
  window.TT = window.TT || {};
  TT.components = TT.components || {};

  /**
   * @param {"TURN_INDICATOR"|"STARTING_PLAYER_INDICATOR"} tipo
   * @param {string} [className]
   * @returns {HTMLDivElement|null}
   */
  function crear(tipo, className) {
    var estadoJuego = TT.state.get();
    var raiz = document.createElement("div");
    raiz.className = ("indicator-indicatorContainer " + (className || "")).trim();

    var img = document.createElement("img");
    img.src = "./assets/indicator.gif";
    img.alt = "turn indicator";
    img.width = 55;
    img.height = 55;

    if (tipo === "TURN_INDICATOR") {
      raiz.dataset.type = "turn-indicator";
      raiz.dataset.turnNumber = String(estadoJuego.turnNumber);
    } else if (tipo === "STARTING_PLAYER_INDICATOR") {
      raiz.dataset.type = "starting-player-indicator";
      raiz.dataset.startingPlayer = estadoJuego.turn || "";
    } else {
      return null;
    }

    raiz.appendChild(img);
    return raiz;
  }

  TT.components.indicator = { crear: crear };
})();
