// js/rules.js
// Las reglas de captura del tablero: qué casillas se voltean al colocar una
// carta, según las reglas activas (Same, Plus, Elemental, Same Wall) y los
// combos en cadena que desencadenan. Funciones puras, extraídas de la parte
// no-visual de src/app/components/Board/Board.tsx.
(function () {
  "use strict";

  window.TT = window.TT || {};

  var DIRECCIONES = {
    top: [-1, 0],
    right: [0, 1],
    bottom: [1, 0],
    left: [0, -1],
  };

  var MAPA_DIRECCION_OPUESTA = {
    top: "bottom", right: "left", bottom: "top", left: "right",
  };

  function fueraDeLimites(tablero, posicion) {
    var row = posicion[0], col = posicion[1];
    return row < 0 || row >= tablero.length || col < 0 || col >= tablero[0].length;
  }

  /**
   * Mulberry32: pequeño y determinista, igual en ambas pestañas para una
   * misma semilla (lo único que importa aquí: ponerse de acuerdo en un
   * tablero, no imprevisibilidad criptográfica).
   */
  function aleatorioConSemilla(semilla) {
    var estado = semilla >>> 0;
    return function () {
      estado = (estado + 0x6d2b79f5) >>> 0;
      var t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Sortea las casillas con elemento activo cuando la regla "elemental" está
   * en juego. En multijugador usa la semilla de la sala, para que ambos
   * clientes obtengan el mismo tablero.
   */
  function determinarCasillasElementales(reglas, semillaSala) {
    if (!reglas || reglas.indexOf("elemental") === -1) return null;

    var random = (semillaSala === null || semillaSala === undefined) ? Math.random : aleatorioConSemilla(semillaSala);

    var posiciones = new Set();
    for (var i = 0; i <= 2; i++) {
      if (posiciones.size && random() < 0.6) continue;
      var row = Math.floor(random() * 3);
      var col = Math.floor(random() * 3);
      posiciones.add(row + "," + col);
    }

    var resultado = {};
    posiciones.forEach(function (pos) {
      var elemento = TT_DATA.elements[Math.floor(random() * TT_DATA.elements.length)];
      resultado[pos] = elemento;
    });

    return resultado;
  }

  /**
   * Valores de ataque/defensa entre la carta en `posicion` y su vecina en
   * `direccion`. Con la regla Same Wall, un borde del tablero cuenta como si
   * hubiera un "muro" (carta id 110) en esa posición.
   */
  function obtenerValoresCartaAdyacente(posicion, direccion, tablero, turno, reglas, elementos) {
    var row = posicion[0], col = posicion[1];
    var delta = DIRECCIONES[direccion];
    var opRow = row + delta[0];
    var opCol = col + delta[1];
    var posicionOpuesta = [opRow, opCol];

    var cartaOpuesta = null, cartaActiva = null;
    var activaFueraDeLimites = fueraDeLimites(tablero, posicion);
    var opuestaFueraDeLimites = fueraDeLimites(tablero, posicionOpuesta);
    var cartaMuro = { cardId: 110, currentOwner: turno, position: posicionOpuesta, action: "wall", initialOwner: null };

    if (opuestaFueraDeLimites || activaFueraDeLimites) {
      if (reglas && reglas.indexOf("sameWall") !== -1) {
        cartaOpuesta = opuestaFueraDeLimites ? cartaMuro : tablero[opRow][opCol];
        cartaActiva = activaFueraDeLimites ? cartaMuro : tablero[row][col];
      } else {
        return null;
      }
    } else {
      cartaOpuesta = tablero[opRow][opCol];
      cartaActiva = tablero[row][col];
    }

    var datosCartaActiva = TT_DATA.cards.find(function (c) { return cartaActiva && c.id === cartaActiva.cardId; });
    var datosCartaOpuesta = TT_DATA.cards.find(function (c) { return cartaOpuesta && c.id === cartaOpuesta.cardId; });

    if (!cartaActiva || !datosCartaActiva) return null;
    if (!cartaOpuesta || !datosCartaOpuesta) return null;

    var esOponente = cartaOpuesta.currentOwner !== turno;

    var posStr = String(posicion);
    var posOpuestaStr = String(posicionOpuesta);

    var modificadorActiva = (elementos && posStr in elementos) ? (elementos[posStr] === datosCartaActiva.element ? 1 : -1) : 0;
    var modificadorOpuesta = (elementos && posOpuestaStr in elementos) ? (elementos[posOpuestaStr] === datosCartaOpuesta.element ? 1 : -1) : 0;

    var direccionOpuesta = MAPA_DIRECCION_OPUESTA[direccion];

    return {
      opposingRow: opRow,
      opposingCol: opCol,
      isOpponent: esOponente,
      attackingValue: datosCartaActiva[direccion] + modificadorActiva,
      defendingValue: datosCartaOpuesta[direccionOpuesta] + modificadorOpuesta,
    };
  }

  /** ¿Puede esta posición desencadenar Same/Plus? (al menos 2 vecinas, alguna rival). */
  function esElegibleParaMasIgual(posicion, tablero, turno, reglas) {
    if (!reglas || (reglas.indexOf("same") === -1 && reglas.indexOf("sameWall") === -1 && reglas.indexOf("plus") === -1)) {
      return false;
    }

    var row = posicion[0], col = posicion[1];
    var hayOponente = false;
    var contadorAdyacentes = 0;

    Object.keys(DIRECCIONES).forEach(function (dir) {
      var delta = DIRECCIONES[dir];
      var opRow = row + delta[0], opCol = col + delta[1];
      var opuestaFueraDeLimites = fueraDeLimites(tablero, [opRow, opCol]);
      var cartaAdyacente = null;

      if (opuestaFueraDeLimites) {
        if (reglas.indexOf("sameWall") !== -1) {
          cartaAdyacente = { cardId: 110, currentOwner: (turno === "red") ? "blue" : "red", position: [opRow, opCol], action: "wall" };
        } else {
          return;
        }
      } else {
        cartaAdyacente = tablero[opRow][opCol];
      }

      if (cartaAdyacente === null) return;
      contadorAdyacentes++;
      if (cartaAdyacente.currentOwner !== turno) hayOponente = true;
    });

    return contadorAdyacentes >= 2 && hayOponente;
  }

  /** Volteos por comparación directa de valores (captura normal, o en cadena si combo=true). */
  function determinarVolteosRegulares(posicion, tablero, turno, reglas, elementos, combo) {
    combo = !!combo;
    var volteos = [];

    Object.keys(DIRECCIONES).forEach(function (direccion) {
      var valores = obtenerValoresCartaAdyacente(posicion, direccion, tablero, turno, reglas, elementos);
      if (!valores) return;
      if (valores.attackingValue === undefined || valores.defendingValue === undefined) return;
      if (valores.opposingRow == null || valores.opposingCol == null || !valores.isOpponent) return;
      if (valores.attackingValue <= valores.defendingValue) return;

      volteos.push({
        position: [valores.opposingRow, valores.opposingCol],
        action: combo ? "combo" : "flipped",
        flipDirection: (direccion === "top" || direccion === "bottom") ? "vertical" : "horizontal",
      });
    });

    return volteos;
  }

  /** Volteos por la regla Same (incluye los combos en cadena que dispara). */
  function determinarVolteosSame(posicion, tablero, turno, reglas, elementos) {
    if (!reglas || (reglas.indexOf("same") === -1 && reglas.indexOf("sameWall") === -1)) return null;

    var volteos = [];
    var volteosCombo = [];

    Object.keys(DIRECCIONES).forEach(function (direccion) {
      var valores = obtenerValoresCartaAdyacente(posicion, direccion, tablero, turno, reglas, elementos);
      if (!valores) return;
      var av = valores.attackingValue, dv = valores.defendingValue;
      if (!av || !dv || valores.opposingRow == null || valores.opposingCol == null) return;

      if (av === dv) {
        volteos.push({ position: [valores.opposingRow, valores.opposingCol], action: "same" });
        var combos = determinarVolteosRegulares([valores.opposingRow, valores.opposingCol], tablero, turno, reglas, elementos, true);
        volteosCombo = volteosCombo.concat(combos);
      }
    });

    return volteos.concat(volteosCombo);
  }

  /** Volteos por la regla Plus (suman igual en dos o más direcciones distintas). */
  function determinarVolteosPlus(posicion, tablero, turno, reglas, elementos) {
    if (!reglas || reglas.indexOf("plus") === -1) return null;

    var movimientos = [];
    Object.keys(DIRECCIONES).forEach(function (direccion) {
      var valores = obtenerValoresCartaAdyacente(posicion, direccion, tablero, turno, reglas, elementos);
      if (!valores) return;
      if (valores.opposingRow != null && valores.opposingCol != null && fueraDeLimites(tablero, [valores.opposingRow, valores.opposingCol])) return;
      var av = valores.attackingValue, dv = valores.defendingValue;
      if (!av || !dv || valores.opposingRow == null || valores.opposingCol == null) return;
      movimientos.push({ position: [valores.opposingRow, valores.opposingCol], attackingValue: av, defendingValue: dv });
    });

    var porSuma = {};
    movimientos.forEach(function (m) {
      var total = m.attackingValue + m.defendingValue;
      if (!porSuma[total]) porSuma[total] = [];
      porSuma[total].push(m);
    });

    var volteos = [];
    var volteosCombo = [];
    Object.keys(porSuma).forEach(function (total) {
      var grupo = porSuma[total];
      if (grupo.length >= 2) {
        grupo.forEach(function (m) {
          volteos.push({ position: m.position, action: "plus" });
          var combos = determinarVolteosRegulares(m.position, tablero, turno, reglas, elementos, true);
          volteosCombo = volteosCombo.concat(combos);
        });
      }
    });

    return volteos.concat(volteosCombo);
  }

  TT.rules = {
    DIRECCIONES: DIRECCIONES,
    MAPA_DIRECCION_OPUESTA: MAPA_DIRECCION_OPUESTA,
    fueraDeLimites: fueraDeLimites,
    aleatorioConSemilla: aleatorioConSemilla,
    determinarCasillasElementales: determinarCasillasElementales,
    obtenerValoresCartaAdyacente: obtenerValoresCartaAdyacente,
    esElegibleParaMasIgual: esElegibleParaMasIgual,
    determinarVolteosRegulares: determinarVolteosRegulares,
    determinarVolteosSame: determinarVolteosSame,
    determinarVolteosPlus: determinarVolteosPlus,
  };
})();
