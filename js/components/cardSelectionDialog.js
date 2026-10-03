// js/components/cardSelectionDialog.js
(function () {
  "use strict";
  window.TT = window.TT || {};
  TT.components = TT.components || {};

  var ITEMS_PER_PAGE = 11;

  /**
   * @param {HTMLElement} contenedor
   * @param {Object} [opciones] { showPreview, showMissingCards, modifier, pagination, onCancel }
   */
  function montar(contenedor, opciones) {
    opciones = opciones || {};
    var showPreview = opciones.showPreview !== false;
    var showMissingCards = !!opciones.showMissingCards;
    var pagination = opciones.pagination || "cards";
    var isGalleryInstance = pagination === "cardGallery";

    function sonidoActivo() { return TT.state.get().isSoundEnabled; }

    // --- estado local propio de esta instancia ---
    var dibujadoAleatoriamente = false;
    var banderaCartasIniciales = false;
    var timerBanderaCartas = null;
    var envioFallido = false;
    var confirmandoSalida = false;

    // --- DOM ---
    var furnitureQuit = null;
    var cajaQuit = null;
    var botonQuit = null;

    var raiz = document.createElement("div");
    raiz.className = "card-selection-cardSelectionDialog cardSelection";
    raiz.dataset.dialog = opciones.modifier || "cardSelection";
    contenedor.appendChild(raiz);

    var filaTitulos = document.createElement("div");
    filaTitulos.className = "flex justify-between";
    raiz.appendChild(filaTitulos);

    var metaCards = document.createElement("h4");
    metaCards.className = "card-selection-meta";
    metaCards.dataset.sprite = "cards";
    var metaCardsTexto = document.createElement("span");
    TT.i18n.aplicarTexto(metaCardsTexto, "Cards");
    metaCards.appendChild(metaCardsTexto);
    filaTitulos.appendChild(metaCards);

    var metaPagina = document.createElement("span");
    metaPagina.className = "card-selection-meta ml-2";
    metaPagina.dataset.sprite = "p.";
    var metaPaginaTexto = document.createElement("span");
    TT.i18n.aplicarTexto(metaPaginaTexto, "P.");
    metaPagina.appendChild(metaPaginaTexto);
    var metaPaginaNum = document.createElement("span");
    metaPaginaNum.className = "card-selection-meta ml-1";
    metaPagina.appendChild(metaPaginaNum);
    metaCards.appendChild(metaPagina);

    var metaNum = document.createElement("h4");
    metaNum.className = "card-selection-meta mr-3";
    metaNum.dataset.sprite = "num.";
    TT.i18n.aplicarTexto(metaNum, "Num.");
    filaTitulos.appendChild(metaNum);

    var slotPaginacion = document.createElement("div");
    raiz.appendChild(slotPaginacion);

    var slotConfirmacion = document.createElement("div");
    raiz.appendChild(slotConfirmacion);
    var confirmacionMontada = null;

    var previewDiv = document.createElement("div");
    previewDiv.className = "card-selection-cardSelectionPreview absolute";
    previewDiv.style.display = "none";
    raiz.appendChild(previewDiv);

    var handStatus = null;
    var startingCardsBox = null;

    // --- cálculo de "cards" (pool visible con cantidades) ---
    function calcularAllCardsRule() {
      var estadoJuego = TT.state.get();
      return !!(estadoJuego.rules && estadoJuego.rules.indexOf("allCards") !== -1) && !estadoJuego.isCardGalleryOpen;
    }

    function calcularCards() {
      var estadoJuego = TT.state.get();
      var allCardsRule = calcularAllCardsRule();
      var cards;

      if (allCardsRule) {
        cards = {};
        TT_DATA.cards.forEach(function (carta) {
          var yaEnMano = estadoJuego.currentPlayerHand.some(function (held) { return held.cardId === carta.id; });
          cards[carta.id] = yaEnMano ? 0 : 1;
        });
      } else {
        cards = Object.assign({}, estadoJuego.currentPlayerCards);
      }

      if (showMissingCards) {
        TT_DATA.cards.forEach(function (carta) {
          if (!(carta.id in cards)) cards[carta.id] = 0;
        });
      }

      return cards;
    }

    function gameStart(hand, cards) {
      var estadoJuego = TT.state.get();
      var mp = TT.multiplayer.get();
      var allCardsRule = calcularAllCardsRule();

      if (mp.session) {
        if (!mp.room || mp.room.phase !== "hands") return false;

        TT.state.dispatch({ type: "SET_PLAYER_HAND", payload: hand });
        TT.sounds.reproducirSonido("spin", sonidoActivo());
        TT.rooms.enviarMano(mp.session.code, mp.session.token, hand.map(function (c) { return c.cardId; }))
          .then(function () { TT.multiplayer.markHandSent(); })
          .catch(function () {
            TT.sounds.reproducirSonido("error", sonidoActivo());
            envioFallido = true;
            render();
          });
        return true;
      }

      var cartasReales = allCardsRule ? estadoJuego.playerCards : cards;
      var manoEnemiga = TT.aiCardSelection.establecerCartasIA(estadoJuego.enemyId, estadoJuego.lostCards, cartasReales);

      TT.state.dispatch({ type: "SET_IS_CARD_SELECTION_OPEN", payload: false });
      TT.state.dispatch({ type: "SET_IS_GAME_ACTIVE", payload: true });
      TT.state.dispatch({ type: "SET_PLAYER_HAND", payload: hand });
      TT.state.dispatch({ type: "SET_ENEMY_HAND", payload: manoEnemiga || [] });
      TT.state.dispatch({ type: "SET_CURRENT_ENEMY_HAND", payload: manoEnemiga || [] });
      TT.sounds.reproducirSonido("spin", sonidoActivo());
      return true;
    }

    function handleCardSelection(cardId, quantity) {
      var estadoJuego = TT.state.get();
      if (estadoJuego.isCardGalleryOpen) return;

      var mano = estadoJuego.currentPlayerHand.slice();
      var cards = calcularCards();
      var allCardsRule = calcularAllCardsRule();

      if (cards[cardId] > 0 && mano.length < 5) {
        var carta = TT.general.generarCartaDesdeId(cardId, "blue");
        if (carta) mano.push(carta);
        cards[cardId] -= 1;
      }

      if (estadoJuego.currentPlayerHand.length < 5) {
        TT.sounds.reproducirSonido(quantity ? "place" : "error", sonidoActivo());
      }

      TT.state.dispatch({ type: "SET_CURRENT_PLAYER_HAND", payload: mano });
      if (!allCardsRule) TT.state.dispatch({ type: "SET_CURRENT_PLAYER_CARDS", payload: cards });
    }

    function setCardPreview(id) {
      var estadoJuego = TT.state.get();
      var allCardsRule = calcularAllCardsRule();
      var owned = allCardsRule || Object.keys(estadoJuego.playerCards).indexOf(String(id)) !== -1;
      TT.state.dispatch({ type: "SET_PREVIEW_CARD_ID", payload: owned ? id : null });
    }

    function handleConfirmation() {
      TT.sounds.reproducirSonido("select", sonidoActivo());
      envioFallido = false;
      var estadoJuego = TT.state.get();
      gameStart(estadoJuego.currentPlayerHand.slice(), calcularCards());
      render();
    }

    function handleDenial() {
      TT.sounds.reproducirSonido("back", sonidoActivo());
      TT.state.dispatch({ type: "SET_CURRENT_PLAYER_HAND", payload: [] });
      TT.state.dispatch({ type: "SET_CURRENT_PLAYER_CARDS", payload: TT.state.get().playerCards });
    }

    function cancel() {
      var estadoJuego = TT.state.get();
      if (isGalleryInstance) {
        if (opciones.onCancel) opciones.onCancel();
        return;
      }
      if (estadoJuego.currentPlayerHand.length > 0) {
        var nuevaMano = estadoJuego.currentPlayerHand.slice();
        var quitada = nuevaMano.pop();
        var nuevasCards = Object.assign({}, estadoJuego.currentPlayerCards);
        if (quitada) nuevasCards[quitada.cardId] = (nuevasCards[quitada.cardId] || 0) + 1;
        TT.sounds.reproducirSonido("back", sonidoActivo());
        TT.state.dispatch({ type: "SET_CURRENT_PLAYER_HAND", payload: nuevaMano });
        if (!calcularAllCardsRule()) TT.state.dispatch({ type: "SET_CURRENT_PLAYER_CARDS", payload: nuevasCards });
        return;
      }

      TT.sounds.reproducirSonido("back", sonidoActivo());

      if (TT.multiplayer.get().session) {
        confirmandoSalida = true;
        render();
        return;
      }

      TT.marcarNavegacionTeclado();
      TT.state.dispatch({ type: "SET_IS_CARD_SELECTION_OPEN", payload: false });
      TT.state.dispatch({ type: "SET_IS_MENU_OPEN", payload: true });
    }

    function esItemSinPoseer(pageItems, index) {
      var estadoJuego = TT.state.get();
      var entrada = pageItems[index];
      return !entrada || Object.keys(estadoJuego.playerCards).indexOf(entrada[0]) === -1;
    }

    // --- cursor / navegación por teclado ---
    var pageItemsActuales = [];

    var nav = TT.crearCursorNav({
      groups: [{ id: "list", size: 0 }],
      initial: null,
      fallback: { group: "list", index: 0 },
      enabled: false,
      resolveMove: function (current, dir, helpers) {
        if (dir === "left" || dir === "right") {
          TT.paginationNav.flip(pagination, (dir === "left") ? "prev" : "next");
          return "handled";
        }
        var size = pageItemsActuales.length;
        if (size === 0) return null;
        var delta = (dir === "down") ? 1 : -1;
        var index = current.index;
        for (var paso = 0; paso < size; paso++) {
          index = helpers.wrap(index, delta, size);
          if (!isGalleryInstance || !esItemSinPoseer(pageItemsActuales, index)) return { group: "list", index: index };
        }
        return null;
      },
      resolvePageJump: function (_actual, dir) {
        TT.paginationNav.flip(pagination, (dir === "pageUp") ? "prev" : "next");
        return "handled";
      },
      onFocus: function (current) {
        var entrada = pageItemsActuales[current.index];
        if (entrada) setCardPreview(Number(entrada[0]));
        renderFocos();
      },
      onConfirm: function (current) {
        if (isGalleryInstance) return;
        var entrada = pageItemsActuales[current.index];
        if (!entrada) return;
        var cardId = Number(entrada[0]), quantity = entrada[1];
        var estadoJuego = TT.state.get();
        var cards = calcularCards();
        if (estadoJuego.currentPlayerHand.length === 4 && cards[cardId] > 0) TT.marcarNavegacionTeclado();
        handleCardSelection(cardId, quantity);
      },
      onCancel: cancel,
    });

    function renderFocos() {
      Array.prototype.forEach.call(slotPaginacion.querySelectorAll("[data-list-index]"), function (el) {
        var estadoJuego = TT.state.get();
        var indice = Number(el.dataset.listIndex);
        var puedeMostrarFoco = isGalleryInstance || estadoJuego.currentPlayerHand.length < 5;
        el.dataset.focused = String(nav.isFocused("list", indice) && puedeMostrarFoco);
      });
    }

    function contenidoCarta(entrada, pageIndex) {
      var cardId = Number(entrada[0]);
      var quantity = entrada[1];
      var estadoJuego = TT.state.get();
      var datosCarta = TT_DATA.cards.find(function (c) { return c.id === cardId; });
      var allCardsRule = calcularAllCardsRule();

      var div = document.createElement("div");
      var poseida = allCardsRule || Object.keys(estadoJuego.playerCards).indexOf(String(cardId)) !== -1;
      div.className = "card-selection-cardListItem flex justify-between " +
        (!poseida ? "opacity-0" : quantity ? "cursor-pointer" : "opacity-50");
      div.dataset.listIndex = String(pageIndex);
      var slide = estadoJuego.slideDirection;
      if (slide && slide[0] === pagination) div.dataset.slideDirection = slide[1];
      if (estadoJuego.isCardGalleryOpen) div.style.zoom = "1.27";

      div.addEventListener("click", function () { handleCardSelection(cardId, quantity); });
      div.addEventListener("mouseenter", function () { nav.focus({ group: "list", index: pageIndex }); });

      var izquierda = document.createElement("div");
      izquierda.className = "flex";
      var icono = document.createElement("img");
      icono.src = "./assets/cardicon.png";
      icono.alt = "Card Icon";
      icono.width = 18; icono.height = 18;
      icono.className = "object-contain mr-3";
      izquierda.appendChild(icono);
      izquierda.appendChild(TT.textoASprite(datosCarta ? datosCarta.name : ""));
      div.appendChild(izquierda);

      var derecha = document.createElement("div");
      derecha.appendChild(TT.textoASprite(String(quantity)));
      div.appendChild(derecha);

      return div;
    }

    var paginacion = null;

    // La clave de paginación (pagination) es fija durante toda la vida de
    // esta instancia, así que solo hace falta crear el componente de
    // paginación una vez; en cada render basta con pasarle los items
    // frescos vía actualizar(), que ya sabe si de verdad hace falta
    // reconstruir la lista o no. Destruirlo y crearlo de cero en cada
    // render (como se hacía antes) tiraba también sus listeners de
    // swipe/paginación cada vez — parte del parpadeo reportado.
    function montarPaginacion(cards) {
      var entradas = Object.entries(cards);
      if (paginacion) {
        paginacion.actualizar(entradas);
      } else {
        paginacion = TT.components.dialogPagination.crear({
          items: entradas,
          itemsPerPage: ITEMS_PER_PAGE,
          renderItem: contenidoCarta,
          pagination: pagination,
        });
        slotPaginacion.appendChild(paginacion.el);
      }

      var pagina = TT.state.get().currentPages[pagination] || 1;
      pageItemsActuales = entradas.slice((pagina - 1) * ITEMS_PER_PAGE, pagina * ITEMS_PER_PAGE);
    }

    var desmontado = false;

    function render() {
      // gameStart() puede, en un solo dispatch síncrono, hacer que
      // main.js desmonte este componente entero (isCardSelectionOpen a
      // false) antes de que handleConfirmation() termine de ejecutarse y
      // llame a render() una última vez. Sin esta guarda, esa llamada
      // volvería a montar el diálogo de confirmación directamente en
      // #modal — un nodo global que sobrevive al desmontaje — y se
      // quedaría ahí para siempre.
      if (desmontado) return;

      var estadoJuego = TT.state.get();
      var mp = TT.multiplayer.get();
      var cards = calcularCards();
      var allCardsRule = calcularAllCardsRule();

      montarPaginacion(cards);

      var randomDraw = !!mp.session && !!(estadoJuego.rules && estadoJuego.rules.indexOf("random") !== -1) && !estadoJuego.isCardGalleryOpen;
      var waitingMessage = (!mp.session || estadoJuego.isCardGalleryOpen) ? null
        : envioFallido ? "Could not send your hand. Try again."
        : mp.handSent ? "Waiting for your opponent"
        : randomDraw ? "Your hand has been dealt at random"
        : null;
      var waitingEllipsis = !!waitingMessage && !envioFallido;

      // --- Furniture Quit/Undo ---
      var mostrarQuit = !isGalleryInstance && estadoJuego.isCardSelectionOpen && !waitingMessage;
      if (mostrarQuit && !furnitureQuit) {
        furnitureQuit = TT.crearFurniture("fixed left-[var(--furniture-gap)] bottom-[var(--furniture-gap)] text-3xl z-10");
        cajaQuit = TT.components.simpleDialog.crear({ metaTitle: null, dialog: "quit" });
        botonQuit = document.createElement("button");
        botonQuit.addEventListener("click", cancel);
        cajaQuit.appendChild(botonQuit);
        furnitureQuit.appendChild(cajaQuit);
      } else if (!mostrarQuit && furnitureQuit) {
        furnitureQuit.remove();
        furnitureQuit = null; cajaQuit = null; botonQuit = null;
      }
      if (botonQuit) {
        botonQuit.innerHTML = "";
        botonQuit.appendChild(TT.textoASprite(estadoJuego.currentPlayerHand.length > 0 ? "Undo" : "Quit"));
      }

      raiz.classList.toggle("hidden", !((estadoJuego.isCardSelectionOpen || estadoJuego.isCardGalleryOpen) && !waitingMessage));
      raiz.dataset.dialog = opciones.modifier || "cardSelection";

      metaPaginaNum.textContent = String(estadoJuego.currentPages[pagination]);
      metaPagina.classList.toggle("hidden", Object.entries(estadoJuego.playerCards).length <= 1);

      // --- confirmación de 5 cartas / abandono ---
      slotConfirmacion.innerHTML = "";
      if (confirmacionMontada) { confirmacionMontada.desmontar(); confirmacionMontada = null; }
      if (confirmandoSalida) {
        confirmacionMontada = TT.components.confirmationDialog.montar({
          onConfirm: function () { confirmandoSalida = false; TT.finishMultiplayer(null); render(); },
          onDeny: function () { TT.sounds.reproducirSonido("back", sonidoActivo()); confirmandoSalida = false; render(); },
        });
      } else if (!waitingMessage && estadoJuego.currentPlayerHand.length === 5 && !estadoJuego.isCardGalleryOpen) {
        confirmacionMontada = TT.components.confirmationDialog.montar({ onConfirm: handleConfirmation, onDeny: handleDenial });
      }

      // --- preview ---
      previewDiv.innerHTML = "";
      if (showPreview && estadoJuego.previewCardId) {
        previewDiv.style.display = "";
        previewDiv.appendChild(TT.components.card.crear({ id: estadoJuego.previewCardId, player: "blue" }));
      } else {
        previewDiv.style.display = "none";
      }

      // --- estado de espera multijugador ---
      if (handStatus) { handStatus.remove(); handStatus = null; }
      if (waitingMessage) {
        var hijos = [TT.textoASprite(waitingMessage)];
        if (waitingEllipsis) hijos.push(TT.components.ellipsis.crear());
        handStatus = TT.components.simpleDialog.crear({ className: "card-selection-handStatus", children: hijos });
        contenedor.appendChild(handStatus);
      }

      // --- aviso de cartas iniciales repuestas ---
      var hasPlayedBefore = !!localStorage.getItem("playerCards");
      if (startingCardsBox) { startingCardsBox.remove(); startingCardsBox = null; }
      if (hasPlayedBefore && banderaCartasIniciales && !estadoJuego.isCardGalleryOpen) {
        var l1 = document.createElement("div");
        l1.className = "mb-2";
        l1.appendChild(TT.textoASprite("You don't have enough cards to play."));
        var l2 = document.createElement("div");
        l2.appendChild(TT.textoASprite("Starting cards have been re-added to your deck."));
        startingCardsBox = TT.components.simpleDialog.crear({ children: [l1, l2] });
        contenedor.appendChild(startingCardsBox);
      }

      nav.actualizarOpciones({
        groups: [{ id: "list", size: pageItemsActuales.length, isDisabled: isGalleryInstance ? function (i) { return esItemSinPoseer(pageItemsActuales, i); } : undefined }],
        enabled: isGalleryInstance ? estadoJuego.isCardGalleryOpen
          : (estadoJuego.isCardSelectionOpen && !estadoJuego.isCardGalleryOpen && estadoJuego.currentPlayerHand.length < 5),
      });
      renderFocos();
    }

    function comprobarEfectos() {
      if (desmontado) return;
      var estadoJuego = TT.state.get();

      // Reparto aleatorio (regla "random", multijugador)
      if (estadoJuego.rules && estadoJuego.rules.indexOf("random") !== -1 && estadoJuego.isCardSelectionOpen && !dibujadoAleatoriamente) {
        var cards = calcularCards();
        var poseidas = Object.assign({}, cards);
        var elegibles = Object.keys(poseidas).filter(function (id) { return poseidas[id] > 0; });
        var manoTmp = estadoJuego.currentPlayerHand.slice();

        while (manoTmp.length < 5 && elegibles.length) {
          var indice = Math.floor(Math.random() * elegibles.length);
          var cardId = Number(elegibles[indice]);
          handleCardSelection(cardId, poseidas[cardId]);
          manoTmp.push({});
          poseidas[cardId]--;
          if (poseidas[cardId] <= 0) elegibles.splice(indice, 1);
        }

        if (TT.state.get().currentPlayerHand.length === 5 && gameStart(TT.state.get().currentPlayerHand, calcularCards())) {
          dibujadoAleatoriamente = true;
        }
      }

      // Reponer cartas iniciales si la colección se ha quedado sin cartas
      var totalCartas = Object.values(estadoJuego.playerCards).reduce(function (a, q) { return a + q; }, 0);
      if (totalCartas < 5 && !estadoJuego.isCardGalleryOpen) {
        var idsIniciales = [1, 2, 3, 4, 5, 6, 7];
        var nuevasCartas = Object.assign({}, estadoJuego.playerCards);
        idsIniciales.forEach(function (id) { nuevasCartas[id] = 1; });

        TT.state.dispatch({ type: "SET_PLAYER_CARDS", payload: nuevasCartas });
        TT.state.dispatch({ type: "SET_CURRENT_PLAYER_CARDS", payload: nuevasCartas });
        try { localStorage.setItem("playerCards", JSON.stringify(nuevasCartas)); } catch (e) { /* nada que hacer */ }

        banderaCartasIniciales = true;
        window.clearTimeout(timerBanderaCartas);
        timerBanderaCartas = window.setTimeout(function () { banderaCartasIniciales = false; render(); }, 3000);
        render();
      }
    }

    var cancelar = TT.state.subscribe(function () { comprobarEfectos(); render(); });
    comprobarEfectos();
    render();

    return {
      desmontar: function () {
        desmontado = true;
        cancelar();
        nav.destruir();
        window.clearTimeout(timerBanderaCartas);
        if (paginacion) paginacion.destruir();
        if (confirmacionMontada) confirmacionMontada.desmontar();
        if (furnitureQuit) furnitureQuit.remove();
        if (handStatus) handStatus.remove();
        if (startingCardsBox) startingCardsBox.remove();
        raiz.remove();
      },
    };
  }

  TT.components.cardSelectionDialog = { montar: montar };
})();
