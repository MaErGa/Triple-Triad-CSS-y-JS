// js/ai.js
// Decide qué carta juega la IA y en qué casilla, según la dificultad.
// Equivale a src/app/utils/ai.ts.
(function () {
  "use strict";

  window.TT = window.TT || {};

  var AJUSTES_DIFICULTAD = {
    beginner: 10,
    intermediate: 5,
    advanced: 2,
  };

  /**
   * @param {Array<Array<Object|null>>} tablero
   * @param {Array<Object>} manoEnemigo
   * @param {"random"|"beginner"|"intermediate"|"advanced"} metodo
   * @param {Object|null} elementos
   * @returns {{enemyCardIndex:*, enemyCard?:Object, enemyCardId?:number, enemyPosition:{row:number,col:number}, uniqueId?:string}|undefined}
   */
  function obtenerMovimientoEnemigo(tablero, manoEnemigo, metodo, elementos) {
    var posicionesDisponibles = [];
    for (var f = 0; f < tablero.length; f++) {
      for (var c = 0; c < tablero[f].length; c++) {
        if (!tablero[f][c]) posicionesDisponibles.push({ row: f, col: c });
      }
    }

    if (posicionesDisponibles.length === 0) return undefined;

    if (metodo === "random") {
      var indiceCartaEnemiga = Math.floor(Math.random() * manoEnemigo.length);
      var cartaEnemiga = manoEnemigo[indiceCartaEnemiga];
      var posicionEnemiga = posicionesDisponibles[Math.floor(Math.random() * posicionesDisponibles.length)];
      return { enemyCardIndex: indiceCartaEnemiga, enemyCard: cartaEnemiga, enemyPosition: posicionEnemiga };
    }

    if (!(metodo in AJUSTES_DIFICULTAD)) return undefined;

    var mapaDireccionOpuesta = { top: "bottom", right: "left", bottom: "top", left: "right" };
    var movimientosPosibles = [];

    posicionesDisponibles.forEach(function (pos) {
      var row = pos.row, col = pos.col;

      var flipsPotenciales = {
        top: { r: row - 1, c: col },
        right: { r: row, c: col + 1 },
        bottom: { r: row + 1, c: col },
        left: { r: row, c: col - 1 },
      };

      manoEnemigo.forEach(function (carta) {
        var cartaActiva = TT_DATA.cards.find(function (c) { return c.id === carta.cardId; });
        if (!cartaActiva) return;

        var flips = [];
        var valorAbiertoTotal = 0;
        var ladosAbiertos = 0;

        Object.keys(flipsPotenciales).forEach(function (direccion) {
          var rc = flipsPotenciales[direccion];
          var r = rc.r, c = rc.c;
          var dentroDeLimites = r >= 0 && r < tablero.length && c >= 0 && c < tablero[0].length;
          if (!dentroDeLimites) return;

          var datosCartaRival = tablero[r] && tablero[r][c];

          if (!datosCartaRival) {
            valorAbiertoTotal += cartaActiva[direccion];
            ladosAbiertos++;
            return;
          }

          if (datosCartaRival.currentOwner === "red") return;

          var cartaRival = TT_DATA.cards.find(function (c2) { return c2.id === datosCartaRival.cardId; });
          if (cartaRival) {
            var modificadorCartaActiva = 0;
            if (elementos && (String([row, col]) in elementos)) {
              modificadorCartaActiva = (elementos[String([row, col])] === cartaActiva.element) ? 1 : -1;
            }

            var modificadorCartaRival = 0;
            if (elementos && (String([r, c]) in elementos)) {
              modificadorCartaRival = (elementos[String([r, c])] === cartaRival.element) ? 1 : -1;
            }

            if (cartaActiva[direccion] + modificadorCartaActiva > cartaRival[mapaDireccionOpuesta[direccion]] + modificadorCartaRival) {
              flips.push({ row: r, col: c, player: "red" });
            }
          }
        });

        movimientosPosibles.push({
          uniqueId: carta.uniqueId,
          enemyCardIndex: carta.position,
          enemyCardId: cartaActiva.id,
          enemyPosition: { row: row, col: col },
          flips: flips.length,
          openStrength: valorAbiertoTotal / ladosAbiertos,
          strength: [valorAbiertoTotal, ladosAbiertos],
        });
      });
    });

    var movimientosOrdenados = movimientosPosibles.slice().sort(function (a, b) {
      if (b.flips !== a.flips) return b.flips - a.flips;
      return b.openStrength - a.openStrength;
    });

    var mejoresOpciones = movimientosOrdenados.slice(0, AJUSTES_DIFICULTAD[metodo]);
    var elegido = mejoresOpciones[Math.floor(Math.random() * mejoresOpciones.length)];
    if (!elegido) return undefined;

    return {
      enemyCardIndex: elegido.enemyCardIndex,
      enemyCardId: elegido.enemyCardId,
      enemyPosition: elegido.enemyPosition,
      uniqueId: elegido.uniqueId,
    };
  }

  TT.ai = {
    obtenerMovimientoEnemigo: obtenerMovimientoEnemigo,
  };
})();
