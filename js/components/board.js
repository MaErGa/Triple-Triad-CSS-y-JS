// js/components/board.js
(function () {
  "use strict";
  window.TT = window.TT || {};
  TT.components = TT.components || {};

  /** Cuánto tiempo tiene un jugador antes de que se juegue una carta por él. */
  var MOVE_TIMEOUT = 120000;
  /** La pausa entre que el reloj llega a 0:00 y la carta se coloca de verdad. */
  var AUTOPLAY_GRACE_MS = 1000;

  function moveTimeout() {
    if (typeof window !== "undefined" && typeof window.__moveTimeout === "number" && window.__moveTimeout > 0) {
      return window.__moveTimeout;
    }
    return MOVE_TIMEOUT;
  }

  function sonidoActivo() { return TT.state.get().isSoundEnabled; }

  /** @param {HTMLElement} contenedor */
  function montar(contenedor) {
    var sameFlag = false, plusFlag = false, comboFlag = false;
    var lastHandIndex = 0;
    var lastBoardCell = null;
    var aiBoardCell = null;
    var showStartingPlayerIndicator = false;
    var remoteMoveTimer = null;
    var autoplayTimeoutId = null;
    var timersEfimeros = [];

    function setTimeoutTracked(fn, ms) {
      var id = window.setTimeout(function () {
        timersEfimeros = timersEfimeros.filter(function (t) { return t !== id; });
        fn();
      }, ms);
      timersEfimeros.push(id);
      return id;
    }

    // --- DOM ---
    var indicadorSlot = document.createElement("div");
    contenedor.appendChild(indicadorSlot);
    var indicadorActual = null;

    var tablero = document.createElement("div");
    tablero.className = "board-board order-2 grid justify-center items-center gap-1 w-[535px] flex-shrink-0 m-auto";
    contenedor.appendChild(tablero);
    var celdas = [];
    for (var i = 0; i < 9; i++) {
      var celda = document.createElement("div");
      celda.className = "board-cell";
      var r = Math.floor(i / 3), c = i % 3;
      celda.dataset.position = "" + r + "," + c;
      (function (row, col) {
        celda.addEventListener("mouseenter", function () { handleMouseEnter(row, col); });
        celda.addEventListener("click", function () { handlePlayerBoardSelection(row, col); });
      })(r, c);
      tablero.appendChild(celda);
      celdas.push(celda);
    }

    var labelSeleccionSlot = document.createElement("div");
    contenedor.appendChild(labelSeleccionSlot);

    var mensajeSlot = document.createElement("div");
    contenedor.appendChild(mensajeSlot);
    var mensajeActual = null;

    // ------------------------------------------------------------------
    function esOutOfBounds(tableroActual, pos) { return TT.rules.fueraDeLimites(tableroActual, pos); }

    function isCardOwnedByOpposingPlayer(card, turn) { return card && card.currentOwner !== turn; }

    function setWinState(currentScore) {
      var estadoJuego = TT.state.get();
      if (estadoJuego.turnNumber <= 9 || estadoJuego.turnState !== "TURN_END") return;
      var redScore = currentScore[0], blueScore = currentScore[1];

      setTimeoutTracked(function () {
        if (redScore === blueScore) TT.state.dispatch({ type: "SET_WIN_STATE", payload: "draw" });
        else if (redScore > blueScore) TT.state.dispatch({ type: "SET_WIN_STATE", payload: "red" });
        else TT.state.dispatch({ type: "SET_WIN_STATE", payload: "blue" });
      }, 1000);
    }

    function swapTurn() {
      TT.state.dispatch({ type: "END_TURN" });
    }

    function grabCardFromHand(card, player) {
      TT.state.dispatch({ type: "SET_TURN_STATE", payload: "SELECTING_CARD" });
      var esJugador = player === "blue";
      var estadoJuego = TT.state.get();
      var mano = esJugador ? estadoJuego.currentPlayerHand : estadoJuego.currentEnemyHand;
      var nuevaMano = mano.filter(function (h) { return h !== card; });
      TT.state.dispatch({ type: esJugador ? "SET_CURRENT_PLAYER_HAND" : "SET_CURRENT_ENEMY_HAND", payload: nuevaMano });
    }

    // --- captura ---
    function processCardFlips(position, tableroActual) {
      var estadoJuego = TT.state.get();
      var turn = estadoJuego.turn, rules = estadoJuego.rules, elements = estadoJuego.elements;
      var newBoard = tableroActual.map(function (fila) { return fila.slice(); });

      var initialFlips = TT.rules.determinarVolteosRegulares(position, tableroActual, turn, rules, elements, false);
      if (initialFlips && initialFlips.length > 0) {
        TT.sounds.reproducirSonido("flip", sonidoActivo());
        initialFlips.forEach(function (flip) {
          var row = flip.position[0], col = flip.position[1];
          if (row == null || col == null || esOutOfBounds(tableroActual, [row, col])) return;
          var card = tableroActual[row][col];
          if (!isCardOwnedByOpposingPlayer(card, turn)) return;
          newBoard[row][col] = {
            cardId: card.cardId, currentOwner: turn, initialOwner: card.initialOwner,
            uniqueId: card.uniqueId, position: [row, col], action: flip.action, flipDirection: flip.flipDirection,
          };
        });
      }

      if (TT.rules.esElegibleParaMasIgual(position, tableroActual, turn, rules)) {
        var sameFlips = TT.rules.determinarVolteosSame(position, tableroActual, turn, rules, elements);
        if (sameFlips && sameFlips.filter(function (o) { return o.action === "same"; }).length >= 2) {
          TT.sounds.reproducirSonido("flip", sonidoActivo());
          sameFlag = true; renderFlags();

          sameFlips.forEach(function (flip) {
            var row = flip.position[0], col = flip.position[1];
            if (row == null || col == null || esOutOfBounds(tableroActual, [row, col])) return;
            var card = tableroActual[row][col];
            if (!isCardOwnedByOpposingPlayer(card, turn)) return;
            newBoard[row][col] = {
              cardId: card.cardId, currentOwner: turn, initialOwner: card.initialOwner,
              uniqueId: card.uniqueId, position: [row, col], action: flip.action,
            };
          });

          if (sameFlips.filter(function (o) { return o.action === "same"; }).length < sameFlips.length) {
            setTimeoutTracked(function () {
              TT.sounds.reproducirSonido("flip", sonidoActivo());
              comboFlag = true; renderFlags();
            }, 750);
          }
        }

        var plusFlips = TT.rules.determinarVolteosPlus(position, tableroActual, turn, rules, elements);
        if (plusFlips && plusFlips.filter(function (o) { return o.action === "plus"; }).length >= 2) {
          TT.sounds.reproducirSonido("flip", sonidoActivo());
          plusFlag = true; renderFlags();

          plusFlips.forEach(function (flip) {
            var row = flip.position[0], col = flip.position[1];
            var card = tableroActual[row][col];
            if (!isCardOwnedByOpposingPlayer(card, turn)) return;
            newBoard[row][col] = {
              cardId: card.cardId, currentOwner: turn, initialOwner: card.initialOwner,
              uniqueId: card.uniqueId, position: [row, col], action: flip.action,
            };
          });

          if (plusFlips.filter(function (o) { return o.action === "plus"; }).length < plusFlips.length) {
            setTimeoutTracked(function () {
              TT.sounds.reproducirSonido("flip", sonidoActivo());
              comboFlag = true; renderFlags();
            }, 750);
          }
        }
      }

      TT.state.dispatch({ type: "SET_BOARD", payload: newBoard });

      if (sameFlag || plusFlag) {
        setTimeoutTracked(function () { sameFlag = false; plusFlag = false; renderFlags(); }, 750);
        setTimeoutTracked(function () { comboFlag = false; renderFlags(); }, 1500);
      }
    }

    function placeCard(row, col, card) {
      TT.state.dispatch({ type: "SET_TURN_STATE", payload: "PLACING_CARD" });
      var estadoJuego = TT.state.get();
      if (estadoJuego.board[row][col]) return;

      var newBoard = estadoJuego.board.map(function (fila) { return fila.slice(); });
      newBoard[row][col] = Object.assign({}, card, { position: [row, col], action: "placed" });

      TT.state.dispatch({ type: "SET_SELECTED_CARD_ID", payload: null });
      TT.state.dispatch({ type: "SET_BOARD", payload: newBoard });

      processCardFlips([row, col], newBoard);
    }

    function handlePlayerBoardSelection(rowIndex, colIndex) {
      var estadoJuego = TT.state.get();
      var selectedCard = estadoJuego.currentPlayerHand.concat(estadoJuego.currentEnemyHand)
        .find(function (c) { return c.uniqueId === estadoJuego.selectedCardId; });
      if (estadoJuego.board[rowIndex][colIndex] || !selectedCard || selectedCard.currentOwner !== estadoJuego.turn) return;

      grabCardFromHand(selectedCard, estadoJuego.turn);
      TT.sounds.reproducirSonido("place", sonidoActivo());
      placeCard(rowIndex, colIndex, selectedCard);
      swapTurn();

      var mp = TT.multiplayer.get();
      if (mp.session) {
        TT.rooms.enviarMovimiento(mp.session.code, mp.session.token, {
          cardId: selectedCard.cardId, row: rowIndex, col: colIndex,
        }).catch(function () { TT.sounds.reproducirSonido("error", sonidoActivo()); });
      }
    }

    function handleMouseEnter(rowIndex, colIndex) {
      var estadoJuego = TT.state.get();
      if (!estadoJuego.board[rowIndex][colIndex] && !!estadoJuego.selectedCardId && estadoJuego.turn === "blue") {
        nav.focus({ group: "board", index: rowIndex * 3 + colIndex });
      }
    }

    function firstPlacementCell() {
      var estadoJuego = TT.state.get();
      if (lastBoardCell !== null) {
        var row = Math.floor(lastBoardCell / 3), col = lastBoardCell % 3;
        if (!estadoJuego.board[row][col]) return lastBoardCell;
      }
      if (!estadoJuego.board[1][1]) return 4;
      for (var index = 0; index < 9; index++) {
        if (!estadoJuego.board[Math.floor(index / 3)][index % 3]) return index;
      }
      return 4;
    }

    // --- navegación por teclado (mano + tablero) ---
    var nav = TT.crearCursorNav({
      groups: [
        { id: "hand", size: TT.state.get().currentPlayerHand.length },
        { id: "board", size: 9 },
      ],
      initial: null,
      fallback: { group: "hand", index: 0 },
      enabled: false,
      resolveMove: function (current, dir, helpers) {
        var estadoJuego = TT.state.get();
        if (current.group === "hand") {
          if ((dir === "up" || dir === "down") && estadoJuego.currentPlayerHand.length > 0) {
            return { group: "hand", index: helpers.wrap(current.index, (dir === "down") ? 1 : -1, estadoJuego.currentPlayerHand.length) };
          }
          return null;
        }
        var row = Math.floor(current.index / 3), col = current.index % 3;
        var nextRow = (dir === "up") ? (row + 2) % 3 : (dir === "down") ? (row + 1) % 3 : row;
        var nextCol = (dir === "left") ? (col + 2) % 3 : (dir === "right") ? (col + 1) % 3 : col;
        return { group: "board", index: nextRow * 3 + nextCol };
      },
      onFocus: function (current) {
        TT.gameNav.setFocus(current.group === "hand" ? { player: "blue", index: current.index } : null);
        renderFocos();
      },
      onConfirm: function (current) {
        var estadoJuego = TT.state.get();
        if (current.group === "hand") {
          var card = estadoJuego.currentPlayerHand[current.index];
          if (!card) return;
          TT.sounds.reproducirSonido("select", sonidoActivo());
          TT.state.dispatch({ type: "SET_SELECTED_CARD_ID", payload: card.uniqueId });
          lastHandIndex = current.index;
          TT.gameNav.setFocus(null);
          nav.setPosSilently({ group: "board", index: firstPlacementCell() });
          renderFocos();
          return;
        }
        var row = Math.floor(current.index / 3), col = current.index % 3;
        var selectedCard = estadoJuego.currentPlayerHand.concat(estadoJuego.currentEnemyHand)
          .find(function (c) { return c.uniqueId === estadoJuego.selectedCardId; });
        if (!estadoJuego.board[row][col] && selectedCard && selectedCard.currentOwner === estadoJuego.turn) {
          lastBoardCell = current.index;
          handlePlayerBoardSelection(row, col);
        } else {
          TT.sounds.reproducirSonido("error", sonidoActivo());
        }
      },
      onCancel: function () {
        var pos = nav.getPos();
        if (!pos || pos.group !== "board") return;
        TT.state.dispatch({ type: "SET_SELECTED_CARD_ID", payload: null });
        TT.sounds.reproducirSonido("back", sonidoActivo());
        var estadoJuego = TT.state.get();
        var index = Math.min(lastHandIndex, Math.max(0, estadoJuego.currentPlayerHand.length - 1));
        nav.setPosSilently({ group: "hand", index: index });
        TT.gameNav.setFocus({ player: "blue", index: index });
        renderFocos();
      },
    });

    TT.gameNav.actions.focusHand = function (index) { nav.focus({ group: "hand", index: index }); };

    // --- efectos con "dependencias" seguidas a mano ---
    var prevSelectedCardId = TT.state.get().selectedCardId;
    var prevIsGameActive = TT.state.get().isGameActive;
    var prevTurn = TT.state.get().turn;
    var prevBoardRef = TT.state.get().board;
    var prevAutoplayDeps = null;
    var prevRemoteDeps = null;
    var prevTurnState = TT.state.get().turnState;

    function efectoSelectedCardId() {
      var estadoJuego = TT.state.get();
      if (estadoJuego.selectedCardId || (nav.getPos() && nav.getPos().group !== "board")) return;
      if (estadoJuego.currentPlayerHand.length === 0) {
        nav.setPosSilently(null);
        TT.gameNav.setFocus(null);
        return;
      }
      var index = Math.min(lastHandIndex, estadoJuego.currentPlayerHand.length - 1);
      nav.setPosSilently({ group: "hand", index: index });
      TT.gameNav.setFocus((estadoJuego.turn === "blue") ? { player: "blue", index: index } : null);
    }

    function efectoIsGameActive() {
      var estadoJuego = TT.state.get();
      if (estadoJuego.isGameActive) {
        if (TT.consumirIntencionTeclado()) {
          nav.setPosSilently({ group: "hand", index: 0 });
          TT.gameNav.setFocus({ player: "blue", index: 0 });
        }
        determineElementalBoardCells();
        showStartingPlayerIndicator = true;
        renderIndicador();
        setTimeoutTracked(function () { showStartingPlayerIndicator = false; renderIndicador(); }, 1650);
      } else {
        nav.setPosSilently(null);
        TT.gameNav.setFocus(null);
      }
    }

    function determineElementalBoardCells() {
      var estadoJuego = TT.state.get();
      if (!estadoJuego.rules || estadoJuego.rules.indexOf("elemental") === -1) return;
      var seed = TT.multiplayer.get().seed;
      var resultado = TT.rules.determinarCasillasElementales(estadoJuego.rules, seed);
      TT.state.dispatch({ type: "SET_ELEMENTS", payload: resultado });
    }

    function efectoTurnoIA() {
      var estadoJuego = TT.state.get();
      if (TT.multiplayer.get().session) return;
      if (estadoJuego.turn !== "red" || estadoJuego.turnNumber > 9) return;

      TT.gameNav.setFocus(null);
      var enemyMove = TT.ai.obtenerMovimientoEnemigo(estadoJuego.board, estadoJuego.currentEnemyHand, "advanced", estadoJuego.elements);
      if (!enemyMove || !enemyMove.enemyCardId) return;

      var enemyCard = estadoJuego.currentEnemyHand.find(function (c) { return c.uniqueId === enemyMove.uniqueId; });
      if (!enemyCard) return;

      var targetIndex = Math.max(0, estadoJuego.currentEnemyHand.findIndex(function (c) { return c.uniqueId === enemyMove.uniqueId; }));
      var handSize = estadoJuego.currentEnemyHand.length;

      var walk = [0];
      function pushWalk(from, to) {
        var step = (to >= from) ? 1 : -1;
        for (var idx = from + step; (step > 0) ? idx <= to : idx >= to; idx += step) walk.push(idx);
      }

      var decoyIndex = null;
      if (handSize > 1 && Math.random() < 0.6) {
        var candidates = [];
        for (var k = 0; k < handSize; k++) { if (k !== targetIndex && k !== 0) candidates.push(k); }
        if (candidates.length) decoyIndex = candidates[Math.floor(Math.random() * candidates.length)];
      }

      if (decoyIndex !== null) { pushWalk(0, decoyIndex); pushWalk(decoyIndex, targetIndex); }
      else { pushWalk(0, targetIndex); }

      var delay = Math.floor(Math.random() * 800) + 700;
      walk.forEach(function (index) {
        setTimeoutTracked(function () {
          TT.sounds.reproducirSonido("select", sonidoActivo());
          TT.gameNav.setFocus({ player: "red", index: index });
        }, delay);
        delay += (index === decoyIndex) ? (Math.floor(Math.random() * 400) + 550) : (Math.floor(Math.random() * 120) + 220);
      });

      delay += Math.floor(Math.random() * 500) + 400;
      setTimeoutTracked(function () {
        TT.state.dispatch({ type: "SET_SELECTED_CARD_ID", payload: enemyCard.uniqueId });
      }, delay);

      delay += Math.floor(Math.random() * 900) + 700;
      setTimeoutTracked(function () {
        TT.gameNav.setFocus(null);
        aiBoardCell = enemyMove.enemyPosition.row * 3 + enemyMove.enemyPosition.col;
        renderFocos();
      }, delay);

      delay += 500;
      setTimeoutTracked(function () {
        aiBoardCell = null;
        grabCardFromHand(enemyCard, "red");
        TT.sounds.reproducirSonido("place", sonidoActivo());
        placeCard(enemyMove.enemyPosition.row, enemyMove.enemyPosition.col, enemyCard);
        swapTurn();
        var pos = nav.getPos();
        if (pos && pos.group === "hand") TT.gameNav.setFocus({ player: "blue", index: pos.index });
        renderFocos();
      }, delay);
    }

    function efectoAutoplay() {
      var estadoJuego = TT.state.get();
      var mp = TT.multiplayer.get();
      window.clearTimeout(autoplayTimeoutId);

      if (!estadoJuego.rules || estadoJuego.rules.indexOf("autoplay") === -1) { TT.multiplayer.setAutoplayAt(null); return; }
      if (!mp.session || estadoJuego.winState || !estadoJuego.isGameActive) { TT.multiplayer.setAutoplayAt(null); return; }

      var wait = moveTimeout();

      if (estadoJuego.turn !== "blue") { TT.multiplayer.setAutoplayAt(Date.now() + wait); return; }
      if (!estadoJuego.currentPlayerHand.length) { TT.multiplayer.setAutoplayAt(null); return; }

      TT.multiplayer.setAutoplayAt(Date.now() + wait);

      autoplayTimeoutId = window.setTimeout(function () {
        TT.multiplayer.setAutoplayAt(null);
        var estadoAhora = TT.state.get();
        var vacias = [];
        estadoAhora.board.forEach(function (fila, ri) { fila.forEach(function (celda, ci) { if (!celda) vacias.push([ri, ci]); }); });
        if (!vacias.length) return;

        var card = estadoAhora.currentPlayerHand[Math.floor(Math.random() * estadoAhora.currentPlayerHand.length)];
        var pos = vacias[Math.floor(Math.random() * vacias.length)];
        if (!card) return;

        grabCardFromHand(card, "blue");
        TT.sounds.reproducirSonido("place", sonidoActivo());
        placeCard(pos[0], pos[1], card);
        swapTurn();

        var mpAhora = TT.multiplayer.get();
        TT.rooms.enviarMovimiento(mpAhora.session.code, mpAhora.session.token, { cardId: card.cardId, row: pos[0], col: pos[1] }).catch(function () {});
      }, wait + AUTOPLAY_GRACE_MS);
    }

    function efectoMovimientoRemoto() {
      var estadoJuego = TT.state.get();
      var mp = TT.multiplayer.get();
      if (!mp.session || estadoJuego.turn !== "red" || estadoJuego.winState) return;
      if (remoteMoveTimer) return;

      var move = TT.multiplayer.peekMove();
      if (!move) return;

      var card = estadoJuego.currentEnemyHand.find(function (c) { return c.cardId === move.cardId; });
      if (!card) return;

      TT.multiplayer.takeMove();
      TT.gameNav.setFocus(null);

      remoteMoveTimer = window.setTimeout(function () {
        remoteMoveTimer = null;
        grabCardFromHand(card, "red");
        TT.sounds.reproducirSonido("place", sonidoActivo());
        placeCard(move.row, move.col, card);
        swapTurn();
        var pos = nav.getPos();
        if (pos && pos.group === "hand") TT.gameNav.setFocus({ player: "blue", index: pos.index });
      }, 400);
    }

    function efectoPuntuacion() {
      var estadoJuego = TT.state.get();
      var redScore = 0, blueScore = 0;
      estadoJuego.board.forEach(function (fila) {
        fila.forEach(function (c) {
          if (c && c.currentOwner === "red") redScore++;
          if (c && c.currentOwner === "blue") blueScore++;
        });
      });
      redScore += estadoJuego.currentEnemyHand.length;
      blueScore += estadoJuego.currentPlayerHand.length;

      TT.state.dispatch({ type: "SET_SCORE", payload: [redScore, blueScore] });
      setWinState([redScore, blueScore]);
    }

    // --- render ---
    function renderFlags() {
      mensajeSlot.innerHTML = "";
      var estadoJuego = TT.state.get();
      if (!estadoJuego.winState && (sameFlag || plusFlag || comboFlag)) {
        mensajeSlot.appendChild(TT.components.boardMessage.crear(comboFlag ? "combo" : sameFlag ? "same" : "plus"));
      }
    }

    function renderIndicador() {
      indicadorSlot.innerHTML = "";
      if (showStartingPlayerIndicator) {
        indicadorSlot.appendChild(TT.components.indicator.crear("STARTING_PLAYER_INDICATOR"));
      }
    }

    function renderFocos() {
      var estadoJuego = TT.state.get();
      for (var idx = 0; idx < 9; idx++) {
        var row = Math.floor(idx / 3), col = idx % 3;
        celdas[idx].dataset.focused = String(nav.isFocused("board", idx) || aiBoardCell === idx);
        celdas[idx].dataset.selectable = String(!estadoJuego.board[row][col] && estadoJuego.turn === "blue" && !!estadoJuego.selectedCardId);
      }
    }

    function render() {
      var estadoJuego = TT.state.get();

      nav.actualizarOpciones({
        groups: [
          { id: "hand", size: estadoJuego.currentPlayerHand.length },
          { id: "board", size: 9 },
        ],
        enabled: estadoJuego.isGameActive && estadoJuego.turn === "blue" && !estadoJuego.winState &&
          !estadoJuego.isMenuOpen && !estadoJuego.isCardSelectionOpen && !estadoJuego.isCardGalleryOpen && !estadoJuego.isRewardSelectionOpen,
      });

      for (var idx = 0; idx < 9; idx++) {
        var row = Math.floor(idx / 3), col = idx % 3;
        var celdaDatos = estadoJuego.board[row][col];
        var celda = celdas[idx];
        var claveElemento = row + "," + col;
        var elemento = (estadoJuego.elements && claveElemento in estadoJuego.elements) ? estadoJuego.elements[claveElemento] : null;

        celda.dataset.element = elemento || "";
        if (!elemento) delete celda.dataset.element;

        // elemento visual (icono de la casilla)
        var elElemento = celda.querySelector("[data-element-icon]");
        if (elemento) {
          if (!elElemento) {
            elElemento = document.createElement("div");
            elElemento.dataset.elementIcon = "";
            elElemento.setAttribute("data-element", "");
            celda.appendChild(elElemento);
          }
          elElemento.dataset.sprite = elemento;
          elElemento.textContent = elemento;
        } else if (elElemento) {
          elElemento.remove();
        }

        var cartaExistente = celda.querySelector(".board-card, .card-card");
        if (!celdaDatos) {
          if (cartaExistente) cartaExistente.remove();
        } else {
          var datosCarta = TT_DATA.cards.find(function (c) { return c.id === celdaDatos.cardId; });
          var modificador = 0;
          if (elemento) modificador = (elemento === (datosCarta && datosCarta.element)) ? 1 : -1;

          if (!cartaExistente) {
            cartaExistente = TT.components.card.crear({
              id: celdaDatos.cardId, player: celdaDatos.currentOwner, onBoard: true,
              dataset: { state: celdaDatos.action, flipDirection: celdaDatos.flipDirection, modifier: modificador },
            });
            celda.insertBefore(cartaExistente, celda.firstChild);
          } else {
            cartaExistente.dataset.player = celdaDatos.currentOwner;
            cartaExistente.dataset.state = celdaDatos.action || "";
            if (celdaDatos.flipDirection) cartaExistente.dataset.flipDirection = celdaDatos.flipDirection; else delete cartaExistente.dataset.flipDirection;
            cartaExistente.dataset.modifier = String(modificador);
          }
        }
      }
      renderFocos();

      // --- etiqueta de carta seleccionada ---
      labelSeleccionSlot.innerHTML = "";
      if (estadoJuego.turn === "blue" && estadoJuego.selectedCardId) {
        var selectedCard = estadoJuego.currentPlayerHand.concat(estadoJuego.currentEnemyHand)
          .find(function (c) { return c.uniqueId === estadoJuego.selectedCardId; });
        var datosSel = selectedCard && TT_DATA.cards.find(function (c) { return c.id === selectedCard.cardId; });
        var wrap = document.createElement("div");
        wrap.className = "board-selectedCardLabel";
        wrap.appendChild(TT.components.simpleDialog.crear({
          children: TT.textoASprite(datosSel ? datosSel.name : "", undefined, true),
        }));
        labelSeleccionSlot.appendChild(wrap);
      }

      renderFlags();

      // --- efectos dependientes de cambios puntuales ---
      if (estadoJuego.selectedCardId !== prevSelectedCardId) {
        prevSelectedCardId = estadoJuego.selectedCardId;
        efectoSelectedCardId();
      }
      if (estadoJuego.isGameActive !== prevIsGameActive) {
        prevIsGameActive = estadoJuego.isGameActive;
        efectoIsGameActive();
      }
      if (estadoJuego.turn !== prevTurn) {
        prevTurn = estadoJuego.turn;
        efectoTurnoIA();
      }
      // En React, colocar+voltear+cambiar de turno son varios dispatch()
      // seguidos que un único evento de clic agrupa en un solo commit, así
      // que este efecto (deps: [board, isGameActive]) siempre ve el
      // turnState ya en "TURN_END" cuando el tablero cambió por última vez.
      // Aquí cada dispatch se aplica y notifica al momento, así que el
      // mismo resultado exige comprobarlo en los dos disparadores por
      // separado: cuando el tablero cambia, y cuando turnState llega a
      // "TURN_END" (usando en ambos casos el tablero — ya actualizado —
      // más reciente).
      if (estadoJuego.board !== prevBoardRef || estadoJuego.turnState !== prevTurnState) {
        prevBoardRef = estadoJuego.board;
        prevTurnState = estadoJuego.turnState;
        efectoPuntuacion();
      }

      var depsAutoplay = JSON.stringify([estadoJuego.turn, !!TT.multiplayer.get().session, estadoJuego.winState, estadoJuego.isGameActive, estadoJuego.turnNumber, estadoJuego.rules]);
      if (depsAutoplay !== prevAutoplayDeps) {
        prevAutoplayDeps = depsAutoplay;
        efectoAutoplay();
      }

      var depsRemoto = JSON.stringify([TT.multiplayer.get().pendingMoves.length, estadoJuego.turn, !!TT.multiplayer.get().session, estadoJuego.winState]);
      if (depsRemoto !== prevRemoteDeps) {
        prevRemoteDeps = depsRemoto;
        efectoMovimientoRemoto();
      }
    }

    var cancelarEstado = TT.state.subscribe(render);
    var cancelarMp = TT.multiplayer.subscribe(render);
    render();

    return {
      desmontar: function () {
        cancelarEstado();
        cancelarMp();
        nav.destruir();
        TT.gameNav.actions.focusHand = undefined;
        window.clearTimeout(autoplayTimeoutId);
        if (remoteMoveTimer) window.clearTimeout(remoteMoveTimer);
        timersEfimeros.forEach(function (id) { window.clearTimeout(id); });
        indicadorSlot.remove();
        tablero.remove();
        labelSeleccionSlot.remove();
        mensajeSlot.remove();
      },
    };
  }

  TT.components.board = { montar: montar };
})();
