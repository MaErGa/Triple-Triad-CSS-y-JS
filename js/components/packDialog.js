// js/components/packDialog.js
(function () {
  "use strict";
  window.TT = window.TT || {};
  TT.components = TT.components || {};

  var PACK_SPEED = 0.9;
  function beat(ms) { return Math.round(ms * PACK_SPEED); }
  var FLIP_MIDPOINT_MS = 250;
  var BEFORE_COLLECT_MS = 1000;
  var COLLECT_MS = 800;
  var COLLECT_STAGGER_MS = 80;

  function sonidoActivo() { return TT.state.get().isSoundEnabled; }

  /**
   * @param {HTMLElement} contenedor
   * @param {Object} opciones { onClose }
   */
  function montar(contenedor, opciones) {
    var estadoInicial = TT.state.get();
    var pack = TT.cardPacks.abrirSobre(estadoInicial.playerCards);
    var poseidasAntes = Object.assign({}, estadoInicial.playerCards);

    var revealed = [];
    var isCollecting = false;
    var pendientes = [];

    function after(ms, run) {
      var id = window.setTimeout(function () {
        pendientes = pendientes.filter(function (p) { return p !== id; });
        run();
      }, ms);
      pendientes.push(id);
    }

    // Se acredita el sobre entero al montar, antes de voltear ninguna carta.
    (function () {
      var actualizadas = Object.assign({}, estadoInicial.playerCards);
      pack.forEach(function (cardId) { actualizadas[cardId] = (actualizadas[cardId] || 0) + 1; });
      TT.state.dispatch({ type: "SET_PLAYER_CARDS", payload: actualizadas });
      try { localStorage.setItem("playerCards", JSON.stringify(actualizadas)); } catch (e) { /* nada */ }
      TT.cardPacks.iniciarCooldownSobre();
    })();

    var raiz = document.createElement("div");
    raiz.className = "pack-dialog-packContainer flex items-center justify-center top-0 z-10 w-screen h-screen";
    contenedor.appendChild(raiz);

    var anchor = document.createElement("div");
    anchor.className = "pack-dialog-dialogAnchor";
    raiz.appendChild(anchor);

    var caja = document.createElement("div");
    caja.className = "pack-dialog-packDialog";
    caja.dataset.dialog = "packInfo";
    anchor.appendChild(caja);

    var meta = document.createElement("h4");
    meta.className = "pack-dialog-meta";
    meta.dataset.sprite = "info.";
    TT.i18n.aplicarTexto(meta, "Info.");
    caja.appendChild(meta);

    var headingLine = document.createElement("h3");
    headingLine.className = "pack-dialog-headingLine";
    caja.appendChild(headingLine);

    var filaCartas = document.createElement("div");
    filaCartas.className = "flex justify-center";
    raiz.appendChild(filaCartas);

    var nav = TT.crearCursorNav({
      groups: [{ id: "pack", size: pack.length, isDisabled: function (i) { return revealed.indexOf(i) !== -1; } }],
      initial: null,
      fallback: { group: "pack", index: 0 },
      enabled: true,
      resolveMove: function (current, dir, helpers) {
        if (dir !== "left" && dir !== "right") return null;
        return { group: "pack", index: helpers.wrap(current.index, (dir === "right") ? 1 : -1, pack.length) };
      },
      onFocus: function () {},
      onConfirm: function (current) { revealCard(current.index); },
    });

    function revealCard(index) {
      if (isCollecting || revealed.indexOf(index) !== -1) return;
      revealed = revealed.concat([index]);
      TT.sounds.reproducirSonido("flip", sonidoActivo());
      after(beat(FLIP_MIDPOINT_MS), function () { TT.sounds.reproducirSonido("success", sonidoActivo()); });
      comprobarColeccion();
      render();
    }

    var coleccionProgramada = false;
    function comprobarColeccion() {
      var allRevealed = revealed.length === pack.length;
      if (!allRevealed || isCollecting || coleccionProgramada) return;
      coleccionProgramada = true;

      after(beat(BEFORE_COLLECT_MS), function () {
        isCollecting = true;
        render();

        pack.forEach(function (_id, index) {
          after(beat(index * COLLECT_STAGGER_MS), function () { TT.sounds.reproducirSonido("place", sonidoActivo()); });
        });

        after(beat(COLLECT_MS + COLLECT_STAGGER_MS * (pack.length - 1) + 300), opciones.onClose);
      });
    }

    function render() {
      var estadoJuego = TT.state.get();
      var allRevealed = revealed.length === pack.length;
      var lastRevealed = revealed.length ? pack[revealed[revealed.length - 1]] : null;
      var lastCard = (lastRevealed === null) ? null : TT_DATA.cards.find(function (c) { return c.id === lastRevealed; });
      var isNewCard = !!lastRevealed && !poseidasAntes[lastRevealed];
      var headingText = lastCard ? TT.i18n.fraseCartaPremio(lastCard.name, "acquired") : TT.i18n.t("Turn over your cards");

      headingLine.innerHTML = "";
      headingLine.appendChild(TT.textoASprite(headingText, (lastCard && isNewCard) ? "blue" : ""));

      filaCartas.innerHTML = "";
      pack.forEach(function (cardId, index) {
        var isRevealed = revealed.indexOf(index) !== -1;
        var celda = document.createElement("div");
        celda.className = "pack-dialog-cell";
        celda.dataset.focused = String(nav.isFocused("pack", index) && !isRevealed && !isCollecting);
        celda.addEventListener("click", function () { revealCard(index); });
        celda.addEventListener("mouseenter", function () { if (!isRevealed && !isCollecting) nav.focus({ group: "pack", index: index }); });
        var elCard = TT.components.card.crear({
          id: cardId, player: isRevealed ? "blue" : "red",
          dataset: { revealed: String(isRevealed), collecting: String(isCollecting) },
        });
        celda.appendChild(elCard);
        filaCartas.appendChild(celda);
      });

      nav.actualizarOpciones({
        groups: [{ id: "pack", size: pack.length, isDisabled: function (i) { return revealed.indexOf(i) !== -1; } }],
        enabled: !allRevealed && !isCollecting && !estadoJuego.isCardGalleryOpen,
      });
    }

    render();

    return {
      desmontar: function () {
        nav.destruir();
        pendientes.forEach(function (id) { window.clearTimeout(id); });
        pendientes = [];
        raiz.remove();
      },
    };
  }

  TT.components.packDialog = { montar: montar };
})();
