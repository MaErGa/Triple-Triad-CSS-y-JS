// js/components/winDialog.js
(function () {
  "use strict";
  window.TT = window.TT || {};
  TT.components = TT.components || {};

  /**
   * @param {HTMLElement} contenedor
   * @param {Object} opciones { victorySound: HTMLAudioElement, bgm: HTMLAudioElement|undefined }
   */
  function montar(contenedor, opciones) {
    var estadoJuegoInicial = TT.state.get();
    var sonidoActivo = estadoJuegoInicial.isSoundEnabled;

    if (estadoJuegoInicial.winState === "blue") {
      TT.sounds.detenerSonidoCargado(opciones.bgm);
      TT.sounds.reproducirSonidoCargado(opciones.victorySound, sonidoActivo);
    }

    var img = document.createElement("img");
    img.src = "./assets/finishmsg.png";
    img.alt = "Finish Message";
    img.width = 500; img.height = 84;
    img.className = "win-dialog-finishMsg";
    img.dataset.winState = String(estadoJuegoInicial.winState);
    contenedor.appendChild(img);

    var playerCardsCopia = Object.assign({}, estadoJuegoInicial.playerCards);

    function idsCartasDelTablero(jugador) {
      var estadoJuego = TT.state.get();
      var ids = [];
      estadoJuego.board.forEach(function (fila) {
        fila.forEach(function (celda) {
          if (celda && celda.currentOwner === jugador) ids.push(celda.cardId);
        });
      });
      return ids;
    }

    var timer = window.setTimeout(function () {
      var estadoJuego = TT.state.get();
      var mp = TT.multiplayer.get();
      if (!estadoJuego.winState) return;

      if (estadoJuego.winState !== "draw") {
        if (mp.session && mp.session.seat === "host") {
          var ganador = (estadoJuego.winState === "blue") ? "host" : "guest";
          TT.rooms.reportarResultado(mp.session.code, mp.session.token, ganador, estadoJuego.score).catch(function () {});
        }

        if (estadoJuego.tradeRule === "none") {
          if (mp.session) {
            TT.finishMultiplayer(estadoJuego.winState === "blue" ? "You won that game." : "You lost that game.");
            return;
          }
          TT.state.dispatch({ type: "RESET_GAME" });
          TT.state.dispatch({ type: "SET_PLAYER_CARDS", payload: playerCardsCopia });
          return;
        }

        TT.state.dispatch({ type: "SET_IS_REWARD_SELECTION_OPEN", payload: true });
        return;
      }

      // --- empate ---
      if (mp.session) {
        if (estadoJuego.rules && estadoJuego.rules.indexOf("suddenDeath") !== -1) {
          if (mp.session.seat === "host") {
            TT.rooms.iniciarMuerteSubita(mp.session.code, mp.session.token).catch(function () {});
          }
          return;
        }
        TT.finishMultiplayer("That game was a draw.");
        return;
      }

      if (estadoJuego.rules && estadoJuego.rules.indexOf("suddenDeath") !== -1) {
        var nuevaManoEnemiga = estadoJuego.currentEnemyHand.concat(TT.general.generarCartasDesdeIds(idsCartasDelTablero("red"), "red"));
        var nuevaManoJugador = estadoJuego.currentPlayerHand.concat(TT.general.generarCartasDesdeIds(idsCartasDelTablero("blue"), "blue"));

        TT.state.dispatch({ type: "SET_BOARD", payload: estadoJuego.board.map(function () { return [null, null, null]; }) });
        TT.state.dispatch({ type: "SET_WIN_STATE", payload: null });
        TT.state.dispatch({ type: "SET_TURN", payload: null });
        TT.state.dispatch({ type: "RESET_TURN" });
        TT.state.dispatch({ type: "SET_SCORE", payload: [5, 5] });
        TT.state.dispatch({ type: "SET_CURRENT_ENEMY_HAND", payload: nuevaManoEnemiga });
        TT.state.dispatch({ type: "SET_CURRENT_PLAYER_HAND", payload: nuevaManoJugador });
      } else {
        TT.state.dispatch({ type: "RESET_GAME" });
        TT.state.dispatch({ type: "SET_PLAYER_CARDS", payload: playerCardsCopia });
      }
    }, 3000);

    return {
      desmontar: function () {
        window.clearTimeout(timer);
        img.remove();
      },
    };
  }

  TT.components.winDialog = { montar: montar };
})();
