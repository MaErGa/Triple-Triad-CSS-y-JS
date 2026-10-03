// js/components/rewardSelectionDialog.js
(function () {
  "use strict";
  window.TT = window.TT || {};
  TT.components = TT.components || {};

  var REWARD_SPEED = 0.9;
  function beat(ms) { return Math.round(ms * REWARD_SPEED); }
  var CENTRED_AT = 0.4;

  function sonidoActivo() { return TT.state.get().isSoundEnabled; }

  /**
   * @param {HTMLElement} contenedor
   * @param {Object} opciones { victorySound, bgm }
   */
  function montar(contenedor, opciones) {
    var e0 = TT.state.get();

    function nivelDe(cardId) {
      var c = TT_DATA.cards.find(function (x) { return x.id === cardId; });
      return c ? c.level : 0;
    }

    var playerRewardSelection = e0.enemyHand.map(function (card, index) {
      return { id: card.cardId, uniqueId: card.uniqueId, level: nivelDe(card.cardId), player: "red", position: index };
    });
    var enemyRewardSelection = e0.playerHand.map(function (card, index) {
      return { id: card.cardId, uniqueId: card.uniqueId, level: nivelDe(card.cardId), player: "blue", position: index };
    });

    var mpInicial = TT.multiplayer.get();
    var isManualSelect = (e0.winState === "blue" && ["one", "diff"].indexOf(e0.tradeRule) !== -1);
    var tradeNeedsExchange = !!mpInicial.session && ["one", "diff"].indexOf(e0.tradeRule) !== -1;
    var awaitingOpponentPicks = tradeNeedsExchange && e0.winState === "red";

    var pendientes = [];
    function after(ms, run) {
      var entry = { id: 0, run: run, fireAt: performance.now() + ms };
      entry.id = window.setTimeout(function () {
        pendientes = pendientes.filter(function (p) { return p !== entry; });
        run();
      }, ms);
      pendientes.push(entry);
    }

    var isSelectionConfirmed = false;
    var selectedRewards = { won: [], lost: [] };
    var selectedReward = undefined;
    var confirmedCards = [];
    var rewardType = null;
    var hoveredReward = undefined;
    var areRewardsConfirmed = false;

    var scoreSorted = e0.score.slice().sort(function (a, b) { return b - a; });
    var winningScore = scoreSorted[0];
    var scoreDifference = winningScore - 5;

    function cartasVolteadas() {
      var estadoJuego = TT.state.get();
      var enTablero = [];
      estadoJuego.board.forEach(function (fila) { fila.forEach(function (c) { if (c) enTablero.push(c); }); });
      return enTablero.filter(function (c) { return c.initialOwner !== c.currentOwner; });
    }
    var flippedCards = cartasVolteadas();

    var winAmount = 0;
    if (e0.tradeRule === "one") winAmount = 1;
    else if (e0.tradeRule === "all") winAmount = 5;
    else if (e0.tradeRule === "diff") winAmount = scoreDifference;

    // --- DOM ---
    var raiz = document.createElement("div");
    raiz.className = "reward-select-rewardSelectionContainer flex flex-col items-center justify-center top-0 z-10 w-screen h-screen";
    contenedor.appendChild(raiz);
    raiz.addEventListener("click", function () { skipToCentre(); });

    var infoBox = document.createElement("div");
    infoBox.className = "reward-select-rewardSelectionDialog";
    infoBox.dataset.dialog = "rewardSelectionInfo";
    var metaInfo = document.createElement("h4");
    metaInfo.className = "reward-select-meta";
    metaInfo.dataset.sprite = "info.";
    TT.i18n.aplicarTexto(metaInfo, "Info.");
    infoBox.appendChild(metaInfo);
    var headingLine = document.createElement("h3");
    headingLine.className = "reward-select-headingLine";
    infoBox.appendChild(headingLine);
    raiz.appendChild(infoBox);

    var filaGanadas = document.createElement("div");
    filaGanadas.className = "flex justify-center mb-7";
    raiz.appendChild(filaGanadas);

    var filaPerdidas = document.createElement("div");
    filaPerdidas.className = "flex justify-center";
    raiz.appendChild(filaPerdidas);

    var dialogContainer = document.createElement("div");
    dialogContainer.className = "reward-select-dialogContainer";
    var nameInfoBox = document.createElement("div");
    nameInfoBox.className = "reward-select-rewardSelectionDialog";
    nameInfoBox.dataset.dialog = "rewardCardNameInfo";
    var metaInfo2 = document.createElement("h4");
    metaInfo2.className = "reward-select-meta";
    metaInfo2.dataset.sprite = "info.";
    TT.i18n.aplicarTexto(metaInfo2, "Info.");
    nameInfoBox.appendChild(metaInfo2);
    var h3Nombre = document.createElement("h3");
    nameInfoBox.appendChild(h3Nombre);
    dialogContainer.appendChild(nameInfoBox);
    raiz.appendChild(dialogContainer);

    var slotConfirmacion = document.createElement("div");
    raiz.appendChild(slotConfirmacion);
    var confirmacionMontada = null;

    function skipToCentre() {
      if (!isSelectionConfirmed) return;
      if (!raiz.getAnimations) return;
      var running = raiz.getAnimations({ subtree: true }).filter(function (a) { return a.playState === "running"; });
      var preview = running.find(function (a) { return a.animationName && a.animationName.indexOf("card-preview") !== -1; });
      if (!preview) return;

      var timing = preview.effect ? preview.effect.getComputedTiming() : null;
      var duration = Number(timing && timing.duration || 0);
      var delay = Number(timing && timing.delay || 0);
      if (!duration) return;

      var centred = delay + duration * CENTRED_AT;
      var jump = centred - Number(preview.currentTime || 0);
      if (jump <= 0) return;

      running.forEach(function (animation) { animation.currentTime = Number(animation.currentTime || 0) + jump; });

      pendientes.forEach(function (p) {
        window.clearTimeout(p.id);
        p.fireAt -= jump;
        p.id = window.setTimeout(function () {
          pendientes = pendientes.filter(function (q) { return q !== p; });
          p.run();
        }, Math.max(0, p.fireAt - performance.now()));
      });
    }

    function resetGame(updatedPlayerCards) {
      TT.sounds.detenerSonidoCargado(opciones.victorySound);
      TT.sounds.detenerSonidoCargado(opciones.bgm);

      var mp = TT.multiplayer.get();
      if (mp.session) {
        TT.finishMultiplayer(TT.state.get().winState === "blue" ? "You won that game." : "You lost that game.");
      }

      TT.state.dispatch({ type: "RESET_GAME" });
      TT.state.dispatch({ type: "SET_PLAYER_CARDS", payload: updatedPlayerCards });
      TT.state.dispatch({ type: "SET_CURRENT_PLAYER_CARDS", payload: updatedPlayerCards });
      try { localStorage.setItem("playerCards", JSON.stringify(updatedPlayerCards)); } catch (e) { /* nada */ }
    }

    function handleSelectReward(card) {
      if (!card || card.player === e0.winState || !isManualSelect) return;
      TT.sounds.reproducirSonido("flip", sonidoActivo());
      if (winAmount > 0 && e0.winState === "blue" && selectedRewards.won.length < winAmount) {
        selectedRewards = { won: selectedRewards.won.concat([{ id: card.id, uniqueId: card.uniqueId, level: nivelDe(card.id), player: "blue", position: card.position }]), lost: selectedRewards.lost };
        playerRewardSelection = playerRewardSelection.map(function (r) { return (r.id === card.id) ? Object.assign({}, r, { player: "blue" }) : Object.assign({}, r); });
        render();
      }
    }

    function handleConfirmation() {
      if (selectedRewards.won.length < winAmount) return;
      if (selectedRewards.won.length === 0) resetGame(TT.state.get().playerCards);
      TT.sounds.reproducirSonido("select", sonidoActivo());

      var mp = TT.multiplayer.get();
      if (tradeNeedsExchange && mp.session) {
        TT.rooms.enviarPremios(mp.session.code, mp.session.token,
          selectedRewards.won.map(function (r) { return { id: r.id, position: r.position }; })
        ).catch(function () {});
      }

      isSelectionConfirmed = true;
      render();
      intentarProgramarRewards();
    }

    function handleDenial() {
      TT.sounds.reproducirSonido("back", sonidoActivo());
      playerRewardSelection = playerRewardSelection.map(function (c) { return Object.assign({}, c, { player: "red" }); });
      selectedRewards = { won: [], lost: selectedRewards.lost };
      render();
    }

    function setRewardPreview(id, position) {
      var datos = TT_DATA.cards.find(function (c) { return c.id === id; });
      if (!datos) return;
      hoveredReward = { id: id, uniqueId: null, level: datos.level, player: (e0.winState === "red") ? "blue" : "red", position: position };
      render();
    }

    var nav = TT.crearCursorNav({
      groups: [{ id: "rewards", size: playerRewardSelection.length }],
      initial: null,
      fallback: { group: "rewards", index: 0 },
      enabled: isManualSelect && !isSelectionConfirmed && selectedRewards.won.length < winAmount && !TT.state.get().isCardGalleryOpen,
      resolveMove: function (current, dir, helpers) {
        if ((dir === "left" || dir === "right") && playerRewardSelection.length > 0) {
          return { group: "rewards", index: helpers.wrap(current.index, (dir === "right") ? 1 : -1, playerRewardSelection.length) };
        }
        return null;
      },
      onFocus: function (current) {
        var carta = playerRewardSelection[current.index];
        if (carta) setRewardPreview(carta.id, current.index);
      },
      onConfirm: function (current) {
        var carta = playerRewardSelection[current.index];
        if (!carta) return;
        if (carta.player === e0.winState) { TT.sounds.reproducirSonido("error", sonidoActivo()); return; }
        if (selectedRewards.won.length === winAmount - 1) TT.marcarNavegacionTeclado();
        handleSelectReward(carta);
      },
      onCancel: function () { if (selectedRewards.won.length > 0) handleDenial(); },
    });

    function autoSelectRewards(method) {
      var selectedCards = { won: [], lost: [] };
      var selectedCardsKey = (e0.winState === "red") ? "lost" : "won";
      var restante = winAmount;

      if (e0.tradeRule === "direct") {
        selectedCards.won = playerRewardSelection.filter(function (handCard) {
          return flippedCards.some(function (fc) { return handCard.player !== fc.currentOwner && handCard.id === fc.cardId; });
        });
        selectedCards.lost = enemyRewardSelection.filter(function (handCard) {
          return flippedCards.some(function (fc) { return handCard.player !== fc.currentOwner && handCard.id === fc.cardId; });
        });
      } else {
        var available = ((e0.winState === "red") ? enemyRewardSelection : playerRewardSelection).slice();
        while (restante > 0) {
          var elegida;
          if (method === "best") {
            var maxLevel = Math.max.apply(null, available.map(function (c) { return c.level; }));
            var altas = available.filter(function (c) { return c.level === maxLevel; });
            elegida = altas[Math.floor(Math.random() * altas.length)];
          } else {
            elegida = available.shift();
          }
          if (elegida) selectedCards[selectedCardsKey].push(elegida);
          restante--;
        }
      }

      playerRewardSelection = playerRewardSelection.map(function (card) {
        return selectedCards.won.some(function (r) { return r.id === card.id && r.position === card.position; })
          ? Object.assign({}, card, { player: "blue" }) : Object.assign({}, card);
      });
      enemyRewardSelection = enemyRewardSelection.map(function (card) {
        return selectedCards.lost.some(function (r) { return r.id === card.id && r.position === card.position; })
          ? Object.assign({}, card, { player: "red" }) : Object.assign({}, card);
      });

      return selectedCards;
    }

    function alCambiarMultiplayer() {
      var mp = TT.multiplayer.get();
      if (!awaitingOpponentPicks || areRewardsConfirmed || !mp.incomingRewards) return;

      var taken = enemyRewardSelection.filter(function (card) {
        return mp.incomingRewards.some(function (pick) { return pick.id === card.id && pick.position === card.position; });
      });
      if (!taken.length) return;

      areRewardsConfirmed = true;
      enemyRewardSelection = enemyRewardSelection.map(function (card) {
        return taken.some(function (p) { return p.id === card.id && p.position === card.position; })
          ? Object.assign({}, card, { player: "red" }) : card;
      });
      selectedRewards = { won: [], lost: taken };
      isSelectionConfirmed = true;
      TT.sounds.reproducirSonido("flip", sonidoActivo());
      TT.multiplayer.setIncomingRewards(null);
      render();
      intentarProgramarRewards();
    }

    if (!areRewardsConfirmed && !isManualSelect && !awaitingOpponentPicks) {
      var metodo = (["all", "direct"].indexOf(e0.tradeRule) !== -1 || e0.winState === "blue") ? "sequential" : "best";
      selectedRewards = autoSelectRewards(metodo);
      isSelectionConfirmed = true;
      TT.sounds.reproducirSonido("flip", sonidoActivo());
      areRewardsConfirmed = true;
    }

    function processRewards() {
      if (desmontado) return;
      var rewardsList = { won: selectedRewards.won.slice(), lost: selectedRewards.lost.slice() };
      var confirmedList = confirmedCards.slice();
      var updatedPlayerCards = Object.assign({}, TT.state.get().playerCards);
      var currentLostCards = Object.assign({}, TT.state.get().lostCards);
      var reward = null;
      var playerWinState = null;

      if (rewardsList.won.length) {
        playerWinState = "won";
        reward = rewardsList.won.shift();
        if (!reward) return;

        updatedPlayerCards[reward.id] = (reward.id in updatedPlayerCards) ? updatedPlayerCards[reward.id] + 1 : 1;

        if (currentLostCards[e0.enemyId]) {
          var idx = currentLostCards[e0.enemyId].indexOf(reward.id);
          if (idx !== -1) {
            currentLostCards[e0.enemyId] = currentLostCards[e0.enemyId].slice();
            currentLostCards[e0.enemyId].splice(idx, 1);
          }
        }
      } else if (rewardsList.lost.length) {
        playerWinState = "lost";
        reward = rewardsList.lost.shift();
        if (!reward) return;

        if (reward.id in updatedPlayerCards && updatedPlayerCards[reward.id] > 0) updatedPlayerCards[reward.id]--;

        if (!currentLostCards[e0.enemyId]) currentLostCards[e0.enemyId] = [];
        else currentLostCards[e0.enemyId] = currentLostCards[e0.enemyId].slice();
        currentLostCards[e0.enemyId].push(reward.id);
      }
      if (!reward) return;

      rewardType = playerWinState;
      TT.state.dispatch({ type: "SET_PLAYER_CARDS", payload: updatedPlayerCards });
      TT.state.dispatch({ type: "SET_LOST_CARDS", payload: currentLostCards });
      try {
        localStorage.setItem("playerCards", JSON.stringify(updatedPlayerCards));
        localStorage.setItem("lostCards", JSON.stringify(currentLostCards));
      } catch (e) { /* nada */ }

      selectedReward = reward;
      selectedRewards = rewardsList;

      after(beat((playerWinState === "lost") ? 500 : 0), function () { TT.sounds.reproducirSonido("place", sonidoActivo()); });
      after(beat((playerWinState === "lost") ? 3000 : 2500), function () {
        TT.sounds.reproducirSonido((playerWinState === "won") ? "success" : "place", sonidoActivo());
      });

      confirmedList.push(Object.assign({}, reward, { side: playerWinState || undefined }));
      confirmedCards = confirmedList;
      render();

      after(beat(2800), function () { selectedReward = undefined; render(); });

      if (!rewardsList.won.length && !rewardsList.lost.length) {
        after(beat(4500), function () { resetGame(updatedPlayerCards); });
      }

      after(beat(confirmedCards.length ? 3000 : 1500), processRewards);
    }

    var desmontado = false;

    function render() {
      // Igual que en cardSelectionDialog.js: varios de los pasos de este
      // componente (resetGame, finishMultiplayer...) hacen que main.js
      // desmonte este diálogo, pero los setTimeout ya programados pueden
      // seguir disparando y llamar a render() después. Sin esta guarda,
      // ConfirmationDialog volvería a aparecer en #modal (un nodo global)
      // aunque el resto del diálogo ya no exista.
      if (desmontado) return;

      var estadoJuego = TT.state.get();

      var recentCard = selectedReward || hoveredReward;
      var recentCardData = recentCard && TT_DATA.cards.find(function (c) { return c.id === recentCard.id; });
      var recentCardName = recentCardData ? recentCardData.name : null;
      var selectedRewardData = selectedReward && TT_DATA.cards.find(function (c) { return c.id === selectedReward.id; });
      var selectedRewardName = selectedRewardData ? selectedRewardData.name : null;

      var infoMessage = (rewardType === "lost") ? "lost" : "acquired";
      var labelDirection = (rewardType === "lost") ? "red" : (rewardType === "won") ? "blue" : estadoJuego.winState;
      var waitingForPicks = (isSelectionConfirmed || estadoJuego.winState === "red") && !selectedRewardName && awaitingOpponentPicks;
      var headingText = (isSelectionConfirmed || estadoJuego.winState === "red")
        ? (selectedRewardName ? TT.i18n.fraseCartaPremio(selectedRewardName, infoMessage)
          : awaitingOpponentPicks ? "Waiting for your opponent to choose" : "")
        : TT.i18n.fraseSeleccionarCartas(winAmount);

      infoBox.classList.toggle("invisible", isSelectionConfirmed && !selectedRewardName);
      infoBox.dataset.animation = selectedRewardName || "";
      infoBox.dataset.player = labelDirection || "";
      headingLine.innerHTML = "";
      headingLine.appendChild(TT.textoASprite(headingText));
      if (waitingForPicks) headingLine.appendChild(TT.components.ellipsis.crear());

      filaGanadas.innerHTML = "";
      playerRewardSelection.forEach(function (card, index) {
        var celda = document.createElement("div");
        celda.className = "reward-select-cell";
        celda.dataset.focused = String(nav.isFocused("rewards", index) && !isSelectionConfirmed && selectedRewards.won.length < winAmount);
        celda.addEventListener("click", function () { handleSelectReward(card); });
        var elCard = TT.components.card.crear({
          id: card.id, player: card.player,
          onMouseEnter: function () { if (estadoJuego.winState === "blue" && !isSelectionConfirmed) nav.focus({ group: "rewards", index: index }); },
          dataset: {
            selected: String(selectedRewards.won.some(function (r) { return r.id === card.id && r.position === card.position; })),
            confirmed: String(isSelectionConfirmed && confirmedCards.some(function (r) { return r.side !== "lost" && r.id === card.id && r.position === card.position; })),
            index: String(index),
          },
        });
        celda.appendChild(elCard);
        filaGanadas.appendChild(celda);
      });

      filaPerdidas.innerHTML = "";
      enemyRewardSelection.forEach(function (card, index) {
        var celda = document.createElement("div");
        celda.className = "reward-select-cell";
        var elCard = TT.components.card.crear({
          id: card.id, player: card.player,
          dataset: {
            enemySelected: String(selectedRewards.lost.some(function (r) { return r.id === card.id && r.position === card.position; })),
            confirmed: String(isSelectionConfirmed && confirmedCards.some(function (r) { return r.side === "lost" && r.id === card.id && r.position === card.position; })),
            index: String(index),
          },
        });
        celda.appendChild(elCard);
        filaPerdidas.appendChild(celda);
      });

      dialogContainer.classList.toggle("invisible", !recentCardName);
      nameInfoBox.classList.toggle("invisible", isSelectionConfirmed || estadoJuego.winState !== "blue");
      h3Nombre.innerHTML = "";
      var colorNombre = (recentCard && estadoJuego.lostCards[estadoJuego.enemyId] && estadoJuego.lostCards[estadoJuego.enemyId].indexOf(recentCard.id) !== -1) ? "yellow"
        : (recentCard && (!(recentCard.id in estadoJuego.playerCards) || estadoJuego.playerCards[recentCard.id] === 0)) ? "blue" : undefined;
      h3Nombre.appendChild(TT.textoASprite(recentCardName || "", colorNombre));

      slotConfirmacion.innerHTML = "";
      if (confirmacionMontada) { confirmacionMontada.desmontar(); confirmacionMontada = null; }
      if (selectedRewards.won.length === winAmount && !isSelectionConfirmed && estadoJuego.winState === "blue") {
        confirmacionMontada = TT.components.confirmationDialog.montar({ onConfirm: handleConfirmation, onDeny: handleDenial });
      }

      nav.actualizarOpciones({
        groups: [{ id: "rewards", size: playerRewardSelection.length }],
        enabled: isManualSelect && !isSelectionConfirmed && selectedRewards.won.length < winAmount && !estadoJuego.isCardGalleryOpen,
      });
    }

    var cancelarEstado = TT.state.subscribe(render);
    var cancelarMp = TT.multiplayer.subscribe(alCambiarMultiplayer);

    var yaProgramadoInicial = false;
    function intentarProgramarRewards() {
      if (!isSelectionConfirmed || yaProgramadoInicial) return;
      yaProgramadoInicial = true;
      after(beat(confirmedCards.length ? 3000 : 1500), processRewards);
    }

    render();
    intentarProgramarRewards();

    return {
      desmontar: function () {
        desmontado = true;
        cancelarEstado();
        cancelarMp();
        nav.destruir();
        pendientes.forEach(function (p) { window.clearTimeout(p.id); });
        pendientes = [];
        if (confirmacionMontada) confirmacionMontada.desmontar();
        raiz.remove();
      },
    };
  }

  TT.components.rewardSelectionDialog = { montar: montar };
})();
