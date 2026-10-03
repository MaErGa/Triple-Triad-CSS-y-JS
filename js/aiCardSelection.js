// js/aiCardSelection.js
// Genera la mano de 5 cartas de un rival (NPC), a partir de su piscina de
// niveles permitidos, con posibilidad de incluir una carta que ya te ganó
// antes o su carta rara. Equivale a src/app/utils/aiCardSelection.ts.
(function () {
  "use strict";

  window.TT = window.TT || {};

  /**
   * @param {number} idJugador
   * @param {Record<number, number[]>} lostCards mapa jugador -> ids de carta perdidos ante ti
   * @param {Record<number, number>} playerCards colección actual del jugador humano
   */
  function establecerCartasIA(idJugador, lostCards, playerCards) {
    var manoActual = [];
    var jugador = TT_DATA.players.find(function (p) { return p.id === idJugador; });
    if (!jugador) return undefined;

    var poolCartas = TT_DATA.cards.filter(function (c) { return jugador.cards.indexOf(c.level) !== -1; });

    var lostCardsJSON = localStorage.getItem("lostCards");
    var lostCardsActuales = lostCardsJSON ? JSON.parse(lostCardsJSON) : lostCards;

    var cartasPerdidasJugador = lostCardsActuales ? lostCardsActuales[idJugador] : undefined;

    if (lostCardsActuales && cartasPerdidasJugador && cartasPerdidasJugador.length && Math.random() < 0.35) {
      var cartaPerdidaAleatoria = cartasPerdidasJugador[Math.floor(Math.random() * cartasPerdidasJugador.length)];
      manoActual.push(cartaPerdidaAleatoria);
    }

    var yaEnColeccion = Object.keys(playerCards || {}).indexOf(String(jugador.rareCard)) !== -1;
    var yaPerdidaEnAlgunLado = Object.keys(lostCards || {}).some(function (idJ) {
      return (lostCards[idJ] || []).indexOf(+jugador.rareCard) !== -1;
    });

    if (jugador.rareCard && !yaEnColeccion && !yaPerdidaEnAlgunLado && Math.random() < 0.35) {
      manoActual.push(+jugador.rareCard);
    }

    while (manoActual.length < 5) {
      var indiceAleatorio = Math.floor(Math.random() * poolCartas.length);
      var cartaSeleccionada = poolCartas[indiceAleatorio];

      if (!cartaSeleccionada || manoActual.indexOf(cartaSeleccionada.id) !== -1) continue;
      if (cartaSeleccionada.id === 48) continue;

      manoActual.push(cartaSeleccionada.id);
    }

    var manoBarajada = manoActual.slice().sort(function () { return Math.random() - 0.5; });
    return TT.general.generarCartasDesdeIds(manoBarajada);
  }

  TT.aiCardSelection = {
    establecerCartasIA: establecerCartasIA,
  };
})();
