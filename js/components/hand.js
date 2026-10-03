// js/components/hand.js
(function () {
  "use strict";
  window.TT = window.TT || {};
  TT.components = TT.components || {};

  /**
   * Monta una mano (roja o azul) dentro de `contenedor`.
   * @param {HTMLElement} contenedor
   * @param {"red"|"blue"} player
   */
  function montar(contenedor, player) {
    var raiz = document.createElement("div");
    raiz.className = "hand-handContainer relative";
    contenedor.appendChild(raiz);

    var columna = document.createElement("div");
    columna.className = "flex flex-end items-center flex-col relative";
    raiz.appendChild(columna);

    var indicadorSlot = document.createElement("div");
    columna.appendChild(indicadorSlot);
    var indicadorActual = null;

    var manoDiv = document.createElement("div");
    manoDiv.className = "hand-hand flex flex-col";
    manoDiv.dataset.player = player;
    columna.appendChild(manoDiv);

    var scoreDiv = document.createElement("div");
    scoreDiv.className = "hand-score";
    columna.appendChild(scoreDiv);

    function manejarSeleccionCarta(carta) {
      if (player === "red") return;
      var estadoJuego = TT.state.get();

      if (estadoJuego.isCardSelectionOpen) {
        var indice = estadoJuego.currentPlayerHand.findIndex(function (held) {
          return held.uniqueId ? held.uniqueId === carta.uniqueId : held.cardId === carta.cardId;
        });
        if (indice === -1) return;

        var restante = estadoJuego.currentPlayerHand.filter(function (_, at) { return at !== indice; });
        var devueltas = Object.assign({}, estadoJuego.currentPlayerCards);
        devueltas[carta.cardId] = (devueltas[carta.cardId] || 0) + 1;

        TT.sounds.reproducirSonido("back", estadoJuego.isSoundEnabled);
        TT.state.dispatch({ type: "SET_CURRENT_PLAYER_HAND", payload: restante });
        if (!(estadoJuego.rules && estadoJuego.rules.indexOf("allCards") !== -1)) {
          TT.state.dispatch({ type: "SET_CURRENT_PLAYER_CARDS", payload: devueltas });
        }
        return;
      }

      if (estadoJuego.turn !== "blue" || !estadoJuego.isGameActive) return;

      TT.sounds.reproducirSonido("select", estadoJuego.isSoundEnabled);
      TT.state.dispatch({ type: "SET_SELECTED_CARD_ID", payload: carta.uniqueId });
    }

    function manejarHover(indice) {
      var estadoJuego = TT.state.get();
      if (player === "blue" && estadoJuego.turn === "blue" && estadoJuego.isGameActive && TT.gameNav.actions.focusHand) {
        TT.gameNav.actions.focusHand(indice);
      }
    }

    // Las celdas ya creadas, para no tirarlas y recrearlas en cada render.
    // TT.state emite una vez por cada dispatch — colocar una carta dispara
    // varios seguidos, y durante el turno de la IA gameNav.setFocus() se
    // llama muchas veces solo para animar el cursor recorriendo la mano.
    // Si cada una de esas llamadas volviera a hacer manoDiv.innerHTML = ""
    // y a reconstruir las 5 cartas desde cero, la mano parpadearía todo el
    // rato (justo el bug reportado). Aquí solo se reconstruyen las celdas
    // cuando la lista de cartas cambia de verdad; si lo único que cambió
    // es qué celda está seleccionada o enfocada, se actualizan atributos
    // sobre los mismos nodos.
    var celdasActuales = [];
    var firmaActual = null;

    function firmaDeCarta(carta) {
      return (carta.uniqueId || "") + ":" + carta.cardId + ":" + carta.currentOwner;
    }

    function render() {
      var estadoJuego = TT.state.get();
      var cartas = (player === "red") ? estadoJuego.currentEnemyHand : estadoJuego.currentPlayerHand;
      var focoMano = TT.gameNav.getFocus();

      raiz.className = ("hand-handContainer " + (estadoJuego.isMenuOpen ? "hidden " : "") + "relative").trim();

      // Indicador de turno (solo en las primeras 9 rondas)
      if (estadoJuego.turnNumber < 10) {
        if (!indicadorActual) {
          indicadorActual = TT.components.indicator.crear("TURN_INDICATOR", "");
          indicadorSlot.innerHTML = "";
          indicadorSlot.appendChild(indicadorActual);
        }
        indicadorActual.className = "indicator-indicatorContainer " +
          ((player === estadoJuego.turn) ? "flex" : "hidden");
        indicadorActual.dataset.turnNumber = String(estadoJuego.turnNumber);
      } else if (indicadorActual) {
        indicadorSlot.innerHTML = "";
        indicadorActual = null;
      }

      manoDiv.className = "hand-hand flex flex-col " + (estadoJuego.isGameActive ? "justify-end" : "justify-start");
      manoDiv.dataset.player = player;
      manoDiv.dataset.selectable = String(player === estadoJuego.turn && estadoJuego.turn === "blue");

      var nuevaFirma = cartas.map(firmaDeCarta).join("|");
      if (nuevaFirma !== firmaActual) {
        firmaActual = nuevaFirma;
        manoDiv.innerHTML = "";
        celdasActuales = cartas.map(function (carta, indice) {
          var celda = document.createElement("div");
          celda.className = "cell";
          celda.addEventListener("click", function () { manejarSeleccionCarta(carta); });
          celda.addEventListener("mouseenter", function () { manejarHover(indice); });
          celda.appendChild(TT.components.card.crear({ id: carta.cardId, player: carta.currentOwner }));
          manoDiv.appendChild(celda);
          return celda;
        });
      }

      celdasActuales.forEach(function (celda, indice) {
        var carta = cartas[indice];
        if (!carta) return;
        celda.dataset.selected = String(!!(carta.uniqueId && estadoJuego.selectedCardId === carta.uniqueId));
        celda.dataset.focused = String(!!(focoMano && focoMano.player === player && focoMano.index === indice));
      });

      scoreDiv.className = "hand-score " + (!estadoJuego.isGameActive ? "invisible" : "");
      scoreDiv.dataset.sprite = String((player === "red") ? estadoJuego.score[0] : estadoJuego.score[1]);
    }

    var cancelarEstado = TT.state.subscribe(render);
    var cancelarNav = TT.gameNav.subscribe(render);
    render();

    return {
      desmontar: function () {
        cancelarEstado();
        cancelarNav();
        raiz.remove();
      },
    };
  }

  TT.components.hand = { montar: montar };
})();
