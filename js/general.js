// js/general.js
// Funciones auxiliares para crear objetos de carta a partir de un id.
// Equivale a src/app/utils/general.ts del proyecto original.
(function () {
  "use strict";

  window.TT = window.TT || {};

  /**
   * Genera un identificador único para distinguir dos copias de la misma
   * carta en el tablero o en una mano (React usaba esto como "key").
   */
  function generarIdUnico() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    // Polyfill sencillo por si randomUUID no está disponible.
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (window.crypto && window.crypto.getRandomValues)
        ? window.crypto.getRandomValues(new Uint8Array(1))[0] & 15
        : Math.floor(Math.random() * 16);
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Crea una carta de juego (la que se coloca en mano/tablero) a partir de
   * un id de carta de datos (data/cards.js).
   * @param {number} id
   * @param {"red"|"blue"} [jugador]
   * @param {number|null} [posicion]
   * @param {string|null} [estado]
   */
  function generarCartaDesdeId(id, jugador, posicion, estado) {
    if (!id) return null;
    jugador = jugador || "red";
    posicion = (posicion === undefined) ? null : posicion;
    estado = estado || null;

    return {
      cardId: Number(id),
      uniqueId: generarIdUnico(),
      currentOwner: jugador,
      initialOwner: jugador,
      position: posicion,
      action: estado,
    };
  }

  /**
   * Convierte una lista de ids de carta en una mano completa de objetos
   * de carta, todos pertenecientes al mismo jugador.
   * @param {number[]} idsCartas
   * @param {"red"|"blue"} [jugador]
   */
  function generarCartasDesdeIds(idsCartas, jugador) {
    idsCartas = idsCartas || [];
    jugador = jugador || "red";
    var cartas = [];
    for (var i = 0; i < idsCartas.length; i++) {
      var carta = generarCartaDesdeId(idsCartas[i], jugador, i, null);
      if (carta) cartas.push(carta);
    }
    return cartas;
  }

  TT.general = {
    generarIdUnico: generarIdUnico,
    generarCartaDesdeId: generarCartaDesdeId,
    generarCartasDesdeIds: generarCartasDesdeIds,
  };
})();
