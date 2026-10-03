// js/multiplayerSession.js
// La partida multijugador actual, compartida entre pantallas. Vive fuera del
// almacén principal del juego porque tiene que sobrevivir al lobby: una vez
// aceptadas las reglas el lobby se cierra y entra la selección de cartas,
// luego el tablero — pero el sondeo (polling) tiene que seguir todo el
// tiempo. Equivale a src/app/hooks/multiplayerSession.ts.
(function () {
  "use strict";

  window.TT = window.TT || {};

  var vacio = {
    session: null, room: null, handSent: false, notice: null,
    pendingMoves: [], incomingRewards: null, autoplayAt: null, seed: null,
  };

  var estado = vacio;
  var oyentes = new Set();

  // Mismo aplanado de reentrada que TT.state.dispatch: ver el comentario
  // en js/state.js.
  var emitiendo = false;
  var reemitirPendiente = false;

  function emitir() {
    if (emitiendo) { reemitirPendiente = true; return; }
    emitiendo = true;
    do {
      reemitirPendiente = false;
      oyentes.forEach(function (oyente) { oyente(); });
    } while (reemitirPendiente);
    emitiendo = false;
  }

  var multiplayer = {
    subscribe: function (oyente) {
      oyentes.add(oyente);
      return function () { oyentes.delete(oyente); };
    },

    get: function () { return estado; },

    setSession: function (session) {
      estado = Object.assign({}, estado, {
        session: session, handSent: false, notice: null,
        pendingMoves: [], incomingRewards: null, autoplayAt: null, seed: null,
      });
      emitir();
    },

    /** La sala ha desaparecido (expiró, o los dos jugadores se fueron). */
    ended: function (notice) {
      estado = {
        session: null, room: null, handSent: false, notice: notice,
        pendingMoves: [], incomingRewards: null, autoplayAt: null, seed: null,
      };
      emitir();
    },

    clearNotice: function () {
      if (estado.notice === null) return;
      estado = Object.assign({}, estado, { notice: null });
      emitir();
    },

    setRoom: function (room) {
      // Un sondeo ya en curso cuando terminó la partida aún puede resolverse
      // y traer de vuelta la sala terminada. Sin sesión no hay sala.
      if (room && !estado.session) return;
      if (estado.room === room) return;
      estado = Object.assign({}, estado, { room: room });
      emitir();
    },

    queueMove: function (move) {
      estado = Object.assign({}, estado, { pendingMoves: estado.pendingMoves.concat([move]) });
      emitir();
    },

    peekMove: function () {
      return estado.pendingMoves.length ? estado.pendingMoves[0] : null;
    },

    takeMove: function () {
      if (!estado.pendingMoves.length) return null;
      var next = estado.pendingMoves[0];
      var resto = estado.pendingMoves.slice(1);
      estado = Object.assign({}, estado, { pendingMoves: resto });
      emitir();
      return next;
    },

    setIncomingRewards: function (picks) {
      estado = Object.assign({}, estado, { incomingRewards: picks });
      emitir();
    },

    startNewRound: function () {
      estado = Object.assign({}, estado, { pendingMoves: [], incomingRewards: null, autoplayAt: null, seed: null });
      emitir();
    },

    setSeed: function (seed) {
      if (estado.seed === seed) return;
      estado = Object.assign({}, estado, { seed: seed });
      emitir();
    },

    setAutoplayAt: function (at) {
      if (estado.autoplayAt === at) return;
      estado = Object.assign({}, estado, { autoplayAt: at });
      emitir();
    },

    markHandSent: function () {
      if (estado.handSent) return;
      estado = Object.assign({}, estado, { handSent: true });
      emitir();
    },

    reset: function () {
      estado = vacio;
      emitir();
    },

    /** De qué color juega este cliente. Cada lado se ve a sí mismo como azul. */
    get mySide() { return "blue"; },
    get opponentSide() { return "red"; },
  };

  /**
   * Termina la partida y devuelve la sala. Se usa cuando la partida acaba,
   * cuando un jugador abandona, y cuando el otro lado desaparece.
   */
  function finishMultiplayer(notice) {
    var session = multiplayer.get().session;
    var limpiar = session
      ? TT.rooms.abandonarSala(session.code, session.token).catch(function () {}).then(function () {
          TT.rooms.limpiarSesion();
        })
      : Promise.resolve();

    return limpiar.then(function () { multiplayer.ended(notice); });
  }

  // ------------------------------------------------------------------
  // Sondeo de la sala (equivalente a hooks/useRoom.ts)
  // ------------------------------------------------------------------
  var POLL_MS = 1500;
  var HIDDEN_POLL_MS = 10000;

  /**
   * Crea un controlador de sondeo para una sesión.
   * @param {Object} opciones
   * @param {() => Object|null} opciones.obtenerSesion
   * @param {(events: Array) => void} opciones.onEvents
   * @param {(room: Object|null) => void} opciones.onRoomChange
   * @param {(error: string|null) => void} [opciones.onError]
   */
  function crearControladorSala(opciones) {
    var obtenerSesion = opciones.obtenerSesion;
    var onEvents = opciones.onEvents;
    var onRoomChange = opciones.onRoomChange;
    var onError = opciones.onError || function () {};

    var cursor = 0;
    var codigoActual = null;
    var timer = null;
    var detenido = true;

    function poll() {
      var session = obtenerSesion();
      if (!session) return Promise.resolve();

      return TT.rooms.consultarEstado(session.code, session.token, cursor).then(function (resp) {
        onRoomChange(resp.room);
        onError(null);

        if (resp.events && resp.events.length) {
          cursor = resp.events[resp.events.length - 1].n;
          onEvents(resp.events);
        }
      }).catch(function (problema) {
        if (TT.rooms.salaDesaparecida(problema)) {
          TT.rooms.limpiarSesion();
          multiplayer.ended("Your opponent's game has ended.");
          return;
        }
        onError(problema && problema.message ? problema.message : "Lost contact with the game.");
      });
    }

    function tick() {
      if (detenido) return;
      poll().then(function () {
        if (detenido) return;
        var espera = (document.visibilityState === "visible") ? POLL_MS : HIDDEN_POLL_MS;
        timer = window.setTimeout(tick, espera);
      });
    }

    function onVisible() {
      if (document.visibilityState !== "visible" || detenido) return;
      window.clearTimeout(timer);
      tick();
    }

    return {
      iniciar: function () {
        var session = obtenerSesion();
        var codigo = session ? session.code : null;
        if (codigo !== codigoActual) {
          cursor = 0;
          codigoActual = codigo;
          onRoomChange(null);
          onError(null);
        }
        if (!session) return;
        detenido = false;
        document.addEventListener("visibilitychange", onVisible);
        tick();
      },
      detener: function () {
        detenido = true;
        window.clearTimeout(timer);
        document.removeEventListener("visibilitychange", onVisible);
      },
      refrescar: function () { poll(); },
    };
  }

  TT.multiplayer = multiplayer;
  TT.finishMultiplayer = finishMultiplayer;
  TT.crearControladorSala = crearControladorSala;
})();
